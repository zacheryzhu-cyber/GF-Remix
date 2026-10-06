import neo4j, { Driver } from "neo4j-driver";
import fs from "fs";
import path from "path";

let driverInstance: Driver | null = null;

export interface Neo4jConfig {
  uri: string;
  user: string;
  password?: string;
  instanceId: string;
}

export function getNeo4jConfig(): Neo4jConfig {
  const uri = process.env.NEO4J_URI || "neo4j+s://30544b94.databases.neo4j.io";
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || "30544b94";
  const password = process.env.NEO4J_PASSWORD || "aTbnYwEDvipsyr9vOHTAlMVB6HunjeZGffNBoYey8GM";
  const instanceId = uri.match(/neo4j\+s:\/\/([a-zA-Z0-9]+)\./)?.[1] || "30544b94";

  return { uri, user, password, instanceId };
}

export function getNeo4jDriver(): Driver {
  if (!driverInstance) {
    const config = getNeo4jConfig();
    if (!config.password) {
      throw new Error("NEO4J_PASSWORD is not configured.");
    }
    driverInstance = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 20000,
    });
  }
  return driverInstance;
}

// Convert neo4j Integers and complex types into plain JSON-serializable types
export function serializeNeo4jValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (neo4j.isInt(val)) {
    return val.inSafeRange() ? val.toNumber() : val.toString();
  }
  if (Array.isArray(val)) {
    return val.map(serializeNeo4jValue);
  }
  if (neo4j.isNode(val)) {
    return {
      identity: serializeNeo4jValue(val.identity),
      labels: val.labels,
      properties: serializeNeo4jValue(val.properties),
      elementId: val.elementId,
    };
  }
  if (neo4j.isRelationship(val)) {
    return {
      identity: serializeNeo4jValue(val.identity),
      type: val.type,
      properties: serializeNeo4jValue(val.properties),
      start: serializeNeo4jValue(val.start),
      end: serializeNeo4jValue(val.end),
      elementId: val.elementId,
      startNodeElementId: val.startNodeElementId,
      endNodeElementId: val.endNodeElementId,
    };
  }
  if (neo4j.isPath(val)) {
    return {
      start: serializeNeo4jValue(val.start),
      end: serializeNeo4jValue(val.end),
      segments: serializeNeo4jValue(val.segments),
      length: val.length,
    };
  }
  if (typeof val === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = serializeNeo4jValue(v);
    }
    return out;
  }
  return val;
}

export async function getNeo4jStatus() {
  const config = getNeo4jConfig();
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const serverInfo = await driver.getServerInfo();
    const nodeCountRes = await session.run("MATCH (n) RETURN count(n) AS nodeCount");
    const relCountRes = await session.run("MATCH ()-[r]->() RETURN count(r) AS relCount");
    const labelsRes = await session.run("CALL db.labels() YIELD label RETURN collect(label) AS labels");
    const relTypesRes = await session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types");

    const nodeCount = nodeCountRes.records[0]?.get("nodeCount")?.toNumber?.() ?? 0;
    const relCount = relCountRes.records[0]?.get("relCount")?.toNumber?.() ?? 0;
    const labels = labelsRes.records[0]?.get("labels") ?? [];
    const relTypes = relTypesRes.records[0]?.get("types") ?? [];

    return {
      connected: true,
      uri: config.uri,
      user: config.user,
      instanceId: config.instanceId,
      agent: serverInfo.agent,
      address: serverInfo.address,
      nodeCount,
      relCount,
      labels,
      relTypes,
    };
  } finally {
    await session.close();
  }
}

export function splitCypherStatements(cypher: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < cypher.length; i++) {
    const char = cypher[i];
    const prev = i > 0 ? cypher[i - 1] : "";

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== "\\") {
      inSingleQuote = !inSingleQuote;
      current += char;
    } else if (char === '"' && !inSingleQuote && !inBacktick && prev !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      current += char;
    } else if (char === "`" && !inSingleQuote && !inDoubleQuote && prev !== "\\") {
      inBacktick = !inBacktick;
      current += char;
    } else if (char === ";" && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const stripped = current.replace(/\/\/[^\n]*\n?/g, "").trim();
      if (stripped.length > 0) {
        statements.push(current.trim());
      }
      current = "";
    } else {
      current += char;
    }
  }
  const stripped = current.replace(/\/\/[^\n]*\n?/g, "").trim();
  if (stripped.length > 0) {
    statements.push(current.trim());
  }
  return statements;
}

export function sanitizeCypherQuery(cypher: string): string {
  if (!cypher) return "";
  // Fix common LLM hallucinated function: rels(path) -> relationships(path)
  return cypher.replace(/\brels\s*\(/gi, "relationships(");
}

export async function executeCypherQuery(cypher: string, params: Record<string, any> = {}) {
  const driver = getNeo4jDriver();
  const session = driver.session();
  const startTime = Date.now();

  try {
    const sanitizedCypher = sanitizeCypherQuery(cypher);
    const statements = splitCypherStatements(sanitizedCypher);
    if (statements.length === 0) {
      return {
        success: true,
        cypher,
        columns: [],
        records: [],
        graph: { nodes: [], edges: [] },
        executionTimeMs: 0,
        resultSummary: {
          queryType: "r",
          plan: false,
        },
      };
    }

    let lastResult: any = null;
    let allColumns: string[] = [];
    const allRecords: Record<string, any>[] = [];
    const nodesMap = new Map<string, any>();
    const edgesMap = new Map<string, any>();

    for (const stmt of statements) {
      const result = await session.run(stmt, params);
      lastResult = result;

      const cols: string[] = result.records.length > 0 ? (result.records[0].keys as string[]) : [];
      if (cols.length > 0 && allColumns.length === 0) {
        allColumns = cols;
      }
      result.records.forEach((rec) => {
        const row: Record<string, any> = {};
        cols.forEach((col: string) => {
          row[col] = serializeNeo4jValue(rec.get(col));
        });
        allRecords.push(row);
      });

      result.records.forEach((rec) => {
        rec.forEach((val) => {
          if (neo4j.isNode(val)) {
            const sNode = serializeNeo4jValue(val);
            const nodeId = sNode.properties?.id || sNode.elementId || String(sNode.identity);
            if (!nodesMap.has(nodeId)) {
              nodesMap.set(nodeId, {
                id: nodeId,
                labels: sNode.labels,
                properties: sNode.properties,
                name: sNode.properties?.name || nodeId,
                type: sNode.labels?.[1] || sNode.labels?.[0] || "Node",
              });
            }
          } else if (neo4j.isRelationship(val)) {
            const sRel = serializeNeo4jValue(val);
            const edgeId = sRel.elementId || String(sRel.identity);
            edgesMap.set(edgeId, {
              id: edgeId,
              type: sRel.type,
              properties: sRel.properties,
              source: sRel.startNodeElementId || String(sRel.start),
              target: sRel.endNodeElementId || String(sRel.end),
            });
          } else if (neo4j.isPath(val)) {
            const sPath = serializeNeo4jValue(val);
            if (sPath.segments) {
              sPath.segments.forEach((seg: any) => {
                const startId = seg.start?.properties?.id || seg.start?.elementId || String(seg.start?.identity);
                const endId = seg.end?.properties?.id || seg.end?.elementId || String(seg.end?.identity);
                if (seg.start && !nodesMap.has(startId)) {
                  nodesMap.set(startId, {
                    id: startId,
                    labels: seg.start.labels,
                    properties: seg.start.properties,
                    name: seg.start.properties?.name || startId,
                    type: seg.start.labels?.[1] || seg.start.labels?.[0] || "Node",
                  });
                }
                if (seg.end && !nodesMap.has(endId)) {
                  nodesMap.set(endId, {
                    id: endId,
                    labels: seg.end.labels,
                    properties: seg.end.properties,
                    name: seg.end.properties?.name || endId,
                    type: seg.end.labels?.[1] || seg.end.labels?.[0] || "Node",
                  });
                }
                const edgeId = seg.relationship?.elementId || String(seg.relationship?.identity);
                edgesMap.set(edgeId, {
                  id: edgeId,
                  type: seg.relationship?.type,
                  properties: seg.relationship?.properties,
                  source: startId,
                  target: endId,
                });
              });
            }
          }
        });
      });
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      cypher,
      columns: allColumns,
      records: allRecords,
      graph: {
        nodes: Array.from(nodesMap.values()),
        edges: Array.from(edgesMap.values()),
      },
      executionTimeMs,
      resultSummary: {
        queryType: lastResult?.summary?.queryType || "r",
        plan: lastResult?.summary?.plan ? true : false,
      },
    };
  } finally {
    await session.close();
  }
}

export async function seedNeo4jFromParsedGraph() {
  const dataPath = path.join(process.cwd(), "parsed_graph.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`parsed_graph.json not found at ${dataPath}`);
  }

  const raw = fs.readFileSync(dataPath, "utf8");
  const data = JSON.parse(raw);

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    await session.run("MATCH (n) DETACH DELETE n");

    try {
      await session.run("CREATE CONSTRAINT equipment_id_unique IF NOT EXISTS FOR (e:Equipment) REQUIRE e.id IS UNIQUE");
    } catch {
      // already exists or ignored
    }

    for (const node of data.nodes) {
      const cypher = `
        MERGE (n:Equipment:\`${node.type}\` {id: $id})
        SET n.name = $name, n.type = $type
      `;
      await session.run(cypher, { id: node.id, name: node.name, type: node.type });
    }

    let edgeCount = 0;
    for (const edge of data.edges) {
      const relType = edge.relation.replace(/[^A-Za-z0-9_]/g, "_");
      const properties = edge.properties || {};
      const setClauses = Object.keys(properties).map(k => `r.${k} = $prop_${k}`).join(', ');
      const setQuery = setClauses ? `SET ${setClauses}` : '';
      
      const cypher = `
        MATCH (a:Equipment {id: $source})
        MATCH (b:Equipment {id: $target})
        MERGE (a)-[r:\`${relType}\`]->(b)
        ${setQuery}
      `;
      const propParams: Record<string, any> = {};
      for (const [k, v] of Object.entries(properties)) {
        propParams[`prop_${k}`] = v;
      }
      await session.run(cypher, { source: edge.source, target: edge.target, ...propParams });
      edgeCount++;
    }

    const nodeCountRes = await session.run("MATCH (n) RETURN count(n) AS nodeCount");
    const relCountRes = await session.run("MATCH ()-[r]->() RETURN count(r) AS relCount");

    return {
      success: true,
      nodesSeeded: nodeCountRes.records[0]?.get("nodeCount")?.toNumber?.() ?? data.nodes.length,
      relationshipsSeeded: relCountRes.records[0]?.get("relCount")?.toNumber?.() ?? edgeCount,
    };
  } finally {
    await session.close();
  }
}

export interface TargetAlarmDef {
  assetId: string;
  assetName: string;
  id: string;
  code: string;
  severity: "P1" | "P2";
  secondsAgo: number;
}

export const TARGET_ALARMS: TargetAlarmDef[] = [
  {
    assetId: "MCC-01",
    assetName: "Motor Control Center 01",
    id: "A-01",
    code: "MCC_BUS_GROUND_FAULT",
    severity: "P1",
    secondsAgo: 58,
  },
  {
    assetId: "CHW-P-05",
    assetName: "Chilled Water Pump 05",
    id: "A-02",
    code: "PUMP_UNDERVOLTAGE_STOP",
    severity: "P2",
    secondsAgo: 56,
  },
  {
    assetId: "CHW-HDR-01",
    assetName: "Main CHW Distribution Header",
    id: "A-03",
    code: "CHW_HEADER_PRESSURE_LOW",
    severity: "P2",
    secondsAgo: 48,
  },
  {
    assetId: "CHW-HX-01",
    assetName: "Process Cooling HX 01",
    id: "A-04",
    code: "PCW_SUPPLY_TEMP_HIGH",
    severity: "P2",
    secondsAgo: 33,
  },
  {
    assetId: "CHW-AHU-01",
    assetName: "Cleanroom/AHU Cooling Load A",
    id: "A-05",
    code: "AHU_SUPPLY_AIR_TEMP_HIGH",
    severity: "P2",
    secondsAgo: 23,
  },
  {
    assetId: "TOOL-LITHO-01",
    assetName: "Lithography Tool 01",
    id: "A-06",
    code: "LASER_CHILLING_TEMP_ALARM",
    severity: "P1",
    secondsAgo: 8,
  },
  {
    assetId: "TOOL-CMP-01",
    assetName: "CMP Tool 01",
    id: "A-07",
    code: "PLATEN_COOLING_FLOW_LOW",
    severity: "P1",
    secondsAgo: 3,
  },
  {
    assetId: "TOOL-CMP-02",
    assetName: "CMP Tool 02",
    id: "A-08",
    code: "CARRIER_HEAD_COOLING_FAIL",
    severity: "P1",
    secondsAgo: 0,
  },
];

export async function createAlarmNodesInNeo4j() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const nowMs = Date.now();
    const createdNodes: any[] = [];

    for (const def of TARGET_ALARMS) {
      const timestampIso = new Date(nowMs - def.secondsAgo * 1000).toISOString();
      const cypher = `
        MATCH (asset:Equipment {id: $assetId})
        MERGE (a:Alarm {id: $alarmId})
        SET a.code = $code,
            a.severity = $severity,
            a.timestamp = datetime() - duration({seconds: $secondsAgo}),
            a.timestampIso = $timestampIso,
            a.assetId = $assetId,
            a.name = $alarmId + ': ' + $code
        MERGE (a)-[r:TRIGGERED_ON]->(asset)
        RETURN a.id AS id, a.code AS code, a.severity AS severity, a.timestampIso AS timestamp, asset.id AS assetId
      `;

      const res = await session.run(cypher, {
        assetId: def.assetId,
        alarmId: def.id,
        code: def.code,
        severity: def.severity,
        secondsAgo: def.secondsAgo,
        timestampIso,
      });

      if (res.records.length > 0) {
        createdNodes.push({
          id: res.records[0].get("id"),
          code: res.records[0].get("code"),
          severity: res.records[0].get("severity"),
          timestamp: res.records[0].get("timestamp"),
          assetId: res.records[0].get("assetId"),
        });
      }
    }

    return {
      success: true,
      count: createdNodes.length,
      alarms: createdNodes,
      message: `Successfully created/updated ${createdNodes.length} Alarm nodes connected to target assets in Neo4j Aura.`,
    };
  } finally {
    await session.close();
  }
}

// --- AGENT HIVE EVENT SIMULATOR SCENARIOS (CASES 1, 2, 3) ---
export const CASE1_ALARMS: TargetAlarmDef[] = [
  {
    assetId: "UPW-RO-01",
    assetName: "Reverse Osmosis Train 01",
    id: "A-C1-01",
    code: "RO01_PERMEATE_COND_HIGH",
    severity: "P1",
    secondsAgo: 15,
  },
];

export const CASE2_ALARMS: TargetAlarmDef[] = [
  {
    assetId: "T-1012",
    assetName: "Pre-RO Buffer Tank 1012 (Active)",
    id: "A-C2-01",
    code: "T1012_ACID_HARDNESS_BREAKTHROUGH",
    severity: "P1",
    secondsAgo: 60,
  },
  {
    assetId: "S-111",
    assetName: "Pre-Treated Water Transfer Pump Skid",
    id: "A-C2-02",
    code: "TRANSFER_PUMP_HIGH_CONDUCTIVITY_TRANSIT",
    severity: "P2",
    secondsAgo: 45,
  },
  {
    assetId: "UPW-RO-01",
    assetName: "Reverse Osmosis Train 01",
    id: "A-C2-03",
    code: "RO01_SYMMETRIC_FEED_FOULING",
    severity: "P1",
    secondsAgo: 20,
  },
  {
    assetId: "UPW-RO-02",
    assetName: "Reverse Osmosis Train 02",
    id: "A-C2-04",
    code: "RO02_SYMMETRIC_FEED_FOULING",
    severity: "P1",
    secondsAgo: 18,
  },
];

export const CASE3_ALARMS: TargetAlarmDef[] = [
  {
    assetId: "MMF",
    assetName: "Multi-Media Filter Bank",
    id: "A-C3-01",
    code: "MMF_UNDERDRAIN_RUPTURE_SILT_COLLAPSE",
    severity: "P1",
    secondsAgo: 90,
  },
  {
    assetId: "T-1011",
    assetName: "Pre-RO Buffer Tank 1011",
    id: "A-C3-02",
    code: "T1011_SILT_TURBIDITY_PENETRATION",
    severity: "P2",
    secondsAgo: 60,
  },
  {
    assetId: "T-1012",
    assetName: "Pre-RO Buffer Tank 1012",
    id: "A-C3-03",
    code: "T1012_SILT_TURBIDITY_PENETRATION",
    severity: "P2",
    secondsAgo: 58,
  },
  {
    assetId: "UPW-RO-01",
    assetName: "Reverse Osmosis Train 01",
    id: "A-C3-04",
    code: "RO01_COLLOIDAL_FOULING_CRITICAL",
    severity: "P1",
    secondsAgo: 20,
  },
  {
    assetId: "UPW-RO-02",
    assetName: "Reverse Osmosis Train 02",
    id: "A-C3-05",
    code: "RO02_COLLOIDAL_FOULING_CRITICAL",
    severity: "P1",
    secondsAgo: 18,
  },
];

export async function createCaseAlarmNodesInNeo4j(caseId: 1 | 2 | 3) {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const alarmDefs = caseId === 1 ? CASE1_ALARMS : caseId === 2 ? CASE2_ALARMS : CASE3_ALARMS;
    const nowMs = Date.now();
    const createdNodes: any[] = [];

    for (const def of alarmDefs) {
      const timestampIso = new Date(nowMs - def.secondsAgo * 1000).toISOString();
      const cypher = `
        MATCH (asset:Equipment {id: $assetId})
        MERGE (a:Alarm {id: $alarmId})
        SET a.code = $code,
            a.severity = $severity,
            a.timestamp = datetime() - duration({seconds: $secondsAgo}),
            a.timestampIso = $timestampIso,
            a.assetId = $assetId,
            a.name = $alarmId + ': ' + $code,
            a.caseId = $caseId
        MERGE (a)-[r:TRIGGERED_ON]->(asset)
        RETURN a.id AS id, a.code AS code, a.severity AS severity, a.timestampIso AS timestamp, asset.id AS assetId
      `;

      const res = await session.run(cypher, {
        assetId: def.assetId,
        alarmId: def.id,
        code: def.code,
        severity: def.severity,
        secondsAgo: def.secondsAgo,
        timestampIso,
        caseId,
      });

      if (res.records.length > 0) {
        createdNodes.push({
          id: res.records[0].get("id"),
          code: res.records[0].get("code"),
          severity: res.records[0].get("severity"),
          timestamp: res.records[0].get("timestamp"),
          assetId: res.records[0].get("assetId"),
        });
      }
    }

    const caseNames: Record<number, string> = {
      1: "Case 1: RO-01 Probe Drift / O-Ring Leak",
      2: "Case 2: Active Tank T-1012 Breakthrough",
      3: "Case 3: Intake MMF Rupture / Total Silt Collapse",
    };

    return {
      success: true,
      caseId,
      caseName: caseNames[caseId],
      count: createdNodes.length,
      alarms: createdNodes,
      message: `Successfully planted ${createdNodes.length} Alarm nodes for ${caseNames[caseId]} into Neo4j Aura.`,
    };
  } finally {
    await session.close();
  }
}

export async function checkAlarmNodesInNeo4j() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    const cypher = `
      MATCH (a:Alarm)
      OPTIONAL MATCH (a)-[r:TRIGGERED_ON]->(asset:Equipment)
      RETURN a.id AS id,
             a.code AS code,
             a.severity AS severity,
             toString(a.timestamp) AS timestamp,
             a.timestampIso AS timestampIso,
             asset.id AS assetId,
             asset.name AS assetName
      ORDER BY a.id ASC
    `;

    const res = await session.run(cypher);
    if (!res.records || res.records.length === 0) {
      return {
        success: true,
        exists: false,
        count: 0,
        alarms: [],
        message: "alarm nodes no have",
      };
    }

    const alarms = res.records.map((r) => ({
      id: r.get("id"),
      code: r.get("code"),
      severity: r.get("severity"),
      timestamp: r.get("timestampIso") || r.get("timestamp"),
      assetId: r.get("assetId"),
      assetName: r.get("assetName"),
    }));

    return {
      success: true,
      exists: true,
      count: alarms.length,
      alarms,
      message: `Found ${alarms.length} Alarm nodes active in Neo4j Aura.`,
    };
  } finally {
    await session.close();
  }
}

export async function clearAlarmNodesInNeo4j() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Count before deleting
    const countCheck = await session.run("MATCH (a:Alarm) RETURN count(a) AS cnt");
    const countBefore = countCheck.records[0]?.get("cnt")?.toNumber?.() ?? 0;

    if (countBefore === 0) {
      return {
        success: true,
        deletedCount: 0,
        message: "No alarm nodes found in Neo4j to delete (alarm nodes no have).",
      };
    }

    const deleteRes = await session.run("MATCH (a:Alarm) DETACH DELETE a");
    return {
      success: true,
      deletedCount: countBefore,
      message: `Successfully deleted ${countBefore} Alarm nodes and detached relationships from Neo4j Aura.`,
    };
  } finally {
    await session.close();
  }
}

