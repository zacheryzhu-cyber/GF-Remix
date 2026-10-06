/**
 * Shared native LangGraph tools for the FabCore agent backends.
 * Extracted from langgraphEngine.ts so any agent engine (Agent Hive,
 * and later Agent Forge) can import the same tool definitions instead
 * of each maintaining its own copy.
 */
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { executeCypherQuery } from "./neo4jService";
import { rdfKnowledgeEngine } from "./rdfEngineService";
import { digitalTwin } from "./DigitalTwinCore";

// --------------------------------------------------------
// 1. NATIVE TOOL DEFINITION (tool from @langchain/core/tools)
// --------------------------------------------------------
export const neo4jCypherTool = tool(
  async ({ cypher }: { cypher: string }) => {
    try {
      console.log(`[NATIVE LANGGRAPH TOOL] Executing Cypher on Neo4j Aura:\n${cypher}`);
      const res = await executeCypherQuery(cypher);
      const records = res?.records || [];
      return JSON.stringify({
        success: true,
        connected: true,
        recordsCount: records.length,
        records: records.slice(0, 25),
        summary: records.length === 0
          ? "Cypher executed successfully. 0 records found in database (Nominal / Clean state)."
          : `Cypher execution succeeded. Retrieved ${records.length} records.`,
      });
    } catch (err: any) {
      console.warn(`[NATIVE LANGGRAPH TOOL] Cypher execution error:`, err?.message);
      const isSyntaxOrQueryError = err?.message && (
        err.message.includes("Type mismatch") ||
        err.message.includes("SyntaxError") ||
        err.message.includes("Invalid input") ||
        err.message.includes("Unknown function") ||
        err.message.includes("VariableLength") ||
        err.message.includes("already declared")
      );
      return JSON.stringify({
        success: false,
        connected: !isSyntaxOrQueryError,
        error: isSyntaxOrQueryError
          ? `Cypher execution error: ${err.message}. (Note: in Neo4j Cypher, use 'relationships(path)' instead of 'rels(path)', and in variable-length paths '*1..2' use '[rel IN relationships(path) | type(rel)]' instead of 'type(r)'.)`
          : "Unable to connect to Neo4j Aura database. Please check connection credentials or network status.",
        details: err?.message,
      });
    }
  },
  {
    name: "neo4j_cypher_query",
    description: "Executes a Cypher query on the Neo4j Aura Semiconductor Cleanroom Digital Twin graph database. Use this tool to look up equipment, inspect upstream/downstream utility dependencies ([:POWERS|SUPPLIES|FEEDS|COOLS]), list active alarms ([:TRIGGERED_ON]), or verify N+1 standby backup equipment ([:BACKUP_FOR]). If a topology query returns 0 records, check relationship arrow direction (<- vs ->) and immediately retry with the arrow reversed or undirected (-(r)-).",
    schema: z.object({
      cypher: z.string().describe("Standard Cypher query string to execute on the Neo4j Aura instance."),
    }),
  }
);

export const neo4jSchemaTool = tool(
  async () => {
    try {
      console.log(`[NATIVE LANGGRAPH TOOL] Introspecting Neo4j Schema...`);
      const labelsRes = await executeCypherQuery("CALL db.labels() YIELD label RETURN collect(label) AS labels");
      const relsRes = await executeCypherQuery("CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types");
      const mapRes = await executeCypherQuery(
        "MATCH (a)-[r]->(b) RETURN DISTINCT head(labels(a)) AS sourceType, type(r) AS relType, head(labels(b)) AS targetType LIMIT 50"
      );
      const nodesRes = await executeCypherQuery(
        "MATCH (n) RETURN DISTINCT n.id AS id, n.name AS name, head(labels(n)) AS label, n.type AS type LIMIT 100"
      );

      const labels = labelsRes?.records?.[0]?.labels || [];
      const relationshipTypes = relsRes?.records?.[0]?.types || [];
      const connectionSchema = mapRes?.records || [];
      const nodesList = (nodesRes?.records || []).map((rec: any) => ({
        id: rec.id,
        name: rec.name,
        label: rec.label,
        type: rec.type,
      }));

      return JSON.stringify({
        success: true,
        connected: true,
        nodeLabels: labels,
        relationshipTypes,
        nodesList,
        connectionSchema,
        summary: `Live Neo4j schema introspected successfully: ${labels.length} node labels, ${relationshipTypes.length} relationship types, and ${nodesList.length} active nodes cataloged.`
      });
    } catch (err: any) {
      console.warn(`[NATIVE LANGGRAPH TOOL] Schema introspection error:`, err?.message);
      return JSON.stringify({
        success: false,
        error: "Failed to perform live schema introspection.",
        details: err?.message
      });
    }
  },
  {
    name: "neo4j_schema_introspect",
    description: "Introspects the live Neo4j database schema. Returns active node labels, relationship types, active node names/IDs list, and connection topology schema. Call this tool before writing Cypher queries whenever you need to verify exact edge names, labels, or node names in the live database.",
    schema: z.object({}),
  }
);

export const rdfSparqlTool = tool(
  async ({ sparql }: { sparql: string }) => {
    try {
      console.log(`[NATIVE LANGGRAPH TOOL] Executing SPARQL on Oxigraph store:\n${sparql}`);
      const result = rdfKnowledgeEngine.executeSparql(sparql);
      if (result.type === "error" || !result.success) {
        return JSON.stringify({
          success: false,
          error: result.error || "SPARQL execution error.",
          details: result.error,
        });
      }
      return JSON.stringify({
        success: true,
        type: result.type,
        count: result.count ?? (result.type === "boolean" ? 1 : 0),
        bindings: result.bindings?.slice(0, 30),
        booleanValue: result.booleanValue,
        executionTimeMs: result.executionTimeMs,
        summary: result.type === "boolean"
          ? `SPARQL ASK query evaluated to: ${result.booleanValue}`
          : `SPARQL SELECT query returned ${result.count} matching triple bindings.`
      });
    } catch (err: any) {
      console.warn(`[NATIVE LANGGRAPH TOOL] SPARQL execution error:`, err?.message);
      return JSON.stringify({
        success: false,
        error: `SPARQL error: ${err?.message}`,
        details: err?.message,
      });
    }
  },
  {
    name: "rdf_sparql_query",
    description: "Executes a SPARQL query against the in-memory W3C RDF Semantic Knowledge Graph (Oxigraph store). Use this tool for ontology classifications (rdf:type), physical input/output requirements (:requiresInput, :providesOutput), governing physical equations (:governedByLaw), telemetry alarm bindings (:monitoredAsset, :sensedCondition), operating mediums/delays, or reachability property path queries with ASK/SELECT.",
    schema: z.object({
      sparql: z.string().describe("Standard W3C SPARQL query string (SELECT or ASK)."),
    }),
  }
);

export const knowledgeBaseTool = tool(
  async ({
    sparql,
    operation,
    triples,
  }: {
    sparql?: string;
    operation?: "query" | "read" | "insert" | "delete" | "write";
    triples?: Array<{ subject: string; predicate: string; object: string }>;
  }) => {
    try {
      console.log(`[NATIVE LANGGRAPH TOOL] Knowledge Base invoked. Operation: ${operation || "auto"}`);
      let targetSparql = sparql?.trim() || "";

      // If triples are provided without SPARQL, construct standard SPARQL update
      if (!targetSparql && triples && triples.length > 0) {
        const tripleLines = triples
          .map((t) => {
            const s = t.subject.startsWith(":") || t.subject.startsWith("<") ? t.subject : `:${t.subject}`;
            const p = t.predicate.startsWith(":") || t.predicate.startsWith("<") || t.predicate.startsWith("rdf:") || t.predicate.startsWith("rdfs:") ? t.predicate : `:${t.predicate}`;
            const o = t.object.startsWith(":") || t.object.startsWith("<") || t.object.startsWith('"') ? t.object : `:${t.object}`;
            return `  ${s} ${p} ${o} .`;
          })
          .join("\n");

        if (operation === "delete") {
          targetSparql = `DELETE DATA {\n${tripleLines}\n}`;
        } else {
          targetSparql = `INSERT DATA {\n${tripleLines}\n}`;
        }
      }

      if (!targetSparql) {
        return JSON.stringify({
          success: false,
          error: "Missing SPARQL statement or triples payload.",
        });
      }

      console.log(`[NATIVE LANGGRAPH TOOL] Knowledge Base executing SPARQL on Oxigraph store:\n${targetSparql}`);
      const result = rdfKnowledgeEngine.executeSparql(targetSparql);

      if (result.type === "error" || !result.success) {
        return JSON.stringify({
          success: false,
          error: result.error || "Knowledge Base execution error.",
          details: result.error,
        });
      }

      if (result.type === "update") {
        return JSON.stringify({
          success: true,
          action: "write",
          type: "update",
          message: result.message,
          totalTriples: result.totalTriples,
          executionTimeMs: result.executionTimeMs,
          summary: `Knowledge Base write successful. Store now contains ${result.totalTriples} semantic triples.`,
        });
      }

      if (result.type === "boolean") {
        return JSON.stringify({
          success: true,
          action: "read",
          type: "boolean",
          booleanValue: result.booleanValue,
          executionTimeMs: result.executionTimeMs,
          summary: `Knowledge Base evaluated ASK query to: ${result.booleanValue}`,
        });
      }

      return JSON.stringify({
        success: true,
        action: "read",
        type: "select",
        count: result.count,
        variables: result.variables,
        bindings: result.bindings?.slice(0, 30),
        executionTimeMs: result.executionTimeMs,
        summary: `Knowledge Base read query returned ${result.count} matching triple bindings.`,
      });
    } catch (err: any) {
      console.warn(`[NATIVE LANGGRAPH TOOL] Knowledge Base error:`, err?.message);
      return JSON.stringify({
        success: false,
        error: `Knowledge Base error: ${err?.message}`,
        details: err?.message,
      });
    }
  },
  {
    name: "knowledge_base",
    description: "Knowledge Base semantic graph engine. Reads and writes W3C RDF triples in the in-memory Oxigraph store. Supports SPARQL queries (SELECT, ASK) and SPARQL updates (INSERT DATA, DELETE DATA, DELETE...INSERT...WHERE), or direct triple insertions and deletions. Use this tool whenever you need to read facility ontology, relationships, equipment status, or dynamically write/update new semantic facts, alarms, or incident cases into the digital twin knowledge base.",
    schema: z.object({
      sparql: z.string().optional().describe("Standard W3C SPARQL 1.1 query or update statement for reading (SELECT, ASK) or writing (INSERT DATA { ... }, DELETE DATA { ... }). Default prefix ':' is <http://semicon.cleanroom.twin/ontology#>."),
      operation: z.enum(["query", "read", "insert", "delete", "write"]).optional().describe("Optional explicit operation: 'read'/'query' to inspect triples, or 'write'/'insert'/'delete' to mutate the semantic store."),
      triples: z.array(z.object({
        subject: z.string().describe("Subject URI or entity tag (e.g. ':TOOL-CMP-01')"),
        predicate: z.string().describe("Predicate URI or relationship (e.g. ':hasStatus', ':monitoredAsset')"),
        object: z.string().describe("Object URI, entity tag, or literal value (e.g. ':Nominal', '\"Overheated\"')"),
      })).optional().describe("Optional structured list of triples to insert or delete directly."),
    }),
  }
);

export const otConnectionTool = tool(
  async ({ assetId, parameters }: { assetId: string; parameters?: string[] }) => {
    try {
      const cleanId = assetId.replace(/^[:<]|>$/g, "").trim().toUpperCase();
      console.log(`[NATIVE LANGGRAPH TOOL] OT Connection reading telemetry for asset: ${cleanId}`);

      const liveTelemetry = digitalTwin.getLiveTelemetry();

      const getLiveVal = (key: string, fallback: number): number => {
        const item = liveTelemetry[key];
        if (item && typeof item.currentVal === "number") return item.currentVal;
        return fallback;
      };

      // Synthetic dynamic live OT SCADA historian data based on asset category & physics
      let metrics: Record<string, any> = {};
      let excursions: string[] = [];
      let status = "NORMAL";

      if (cleanId.includes("SAC") || cleanId.includes("CAT")) {
        // SAC-0911 .. SAC-0914 Cation Exchangers
        const t1012Cond = getLiveVal("T-1012-COND", 1.2);
        const isUpstreamBreakthrough = t1012Cond > 2.0;

        if (isUpstreamBreakthrough && (cleanId.includes("0913") || cleanId.includes("0914"))) {
          metrics = {
            inletPressure_bar: 4.82,
            outletPressure_bar: 4.30,
            differentialPressure_bar: 0.52,
            flowRate_m3h: 34.2,
            bedConductivity_uS_cm: 28.5,
            exhaustionIndex_pct: 98.8,
            regenerationStatus: "Exhausted - Acid Regeneration Required via Skid S-121",
          };
          excursions.push("Strong acid cation bed resin exhausted (exhaustion index 98.8% > 90% regeneration limit; bed conductivity 28.5 uS/cm)");
          status = "RESIN_EXHAUSTED";
        } else {
          metrics = {
            inletPressure_bar: 4.82,
            outletPressure_bar: 4.45,
            differentialPressure_bar: 0.35,
            flowRate_m3h: 34.2,
            bedConductivity_uS_cm: 12.4,
            exhaustionIndex_pct: 64.2,
            regenerationStatus: "Nominal Operating Life",
          };
        }
      } else if (cleanId.includes("MMF") || cleanId.includes("FILTER")) {
        const t1011Cond = getLiveVal("T-1011-COND", 1.2);
        const t1012Cond = getLiveVal("T-1012-COND", 1.2);
        const isMmfBreakdown = t1011Cond > 2.0 && t1012Cond > 2.0;

        if (isMmfBreakdown) {
          metrics = {
            inletPressure_bar: 5.60,
            outletPressure_bar: 3.80,
            differentialPressure_bar: 1.80,
            turbidity_ntu: 5.8,
            flowRate_m3h: 68.5,
            underdrainCondition: "Lateral Nozzle Mesh Ruptured - Media Slip",
          };
          excursions.push("Multi-Media Filter underdrain collapse (turbidity 5.8 NTU > 0.2 limit, dP 1.80 bar > 0.6 bar limit; severe particulate slip into downstream tanks)");
          status = "UNDERDRAIN_RUPTURE";
        } else {
          metrics = {
            inletPressure_bar: 5.20,
            outletPressure_bar: 4.75,
            differentialPressure_bar: 0.42,
            turbidity_ntu: 0.04,
            flowRate_m3h: 68.5,
            underdrainCondition: "Nominal Filtration Bed",
          };
        }
      } else if (cleanId.includes("RO") || cleanId.includes("MEMBRANE")) {
        const isRo01 = cleanId.includes("01") || cleanId.endsWith("-1");
        const isRo02 = cleanId.includes("02") || cleanId.endsWith("-2");

        const permeateCond = isRo01
          ? getLiveVal("UPW-RO-01-COND", 0.030)
          : isRo02
          ? getLiveVal("UPW-RO-02-COND", 0.028)
          : 0.028;

        const diffPressure = isRo01
          ? getLiveVal("UPW-RO-01-DP", 1.40)
          : isRo02
          ? getLiveVal("UPW-RO-02-DP", 1.40)
          : 1.40;

        metrics = {
          feedPressure_bar: 14.8,
          permeatePressure_bar: 1.2,
          concentratePressure_bar: 13.4,
          differentialPressure_bar: diffPressure,
          permeateConductivity_uS_cm: permeateCond,
          recoveryRate_pct: 78.2,
          normalizedFlux_gfd: 16.4,
        };

        if (permeateCond > 0.030) {
          excursions.push(`Permeate conductivity drift (${permeateCond} uS/cm > 0.030 uS/cm baseline)`);
          status = "DRIFT_EXCURSION";
        }
        if (diffPressure > 1.40) {
          excursions.push(`Differential pressure elevated (${diffPressure} bar > 1.40 bar baseline)`);
          status = "DRIFT_EXCURSION";
        }
      } else if (cleanId.includes("1012") || cleanId.includes("T-1012") || cleanId.includes("TK-1012")) {
        const cond = getLiveVal("T-1012-COND", 1.2);
        const ph = getLiveVal("T-1012-PH", 6.8);
        metrics = {
          tankLevel_pct: 78.4,
          waterTemperature_degC: 21.8,
          conductivity_uS_cm: cond,
          effluent_ph: ph,
          toc_ppb: 1.2,
          dissolvedOxygen_ppb: 8.2,
        };
        if (cond > 2.0) {
          excursions.push(`Decationized buffer tank conductivity excursion (${cond} uS/cm > 2.0 uS/cm nominal limit)`);
          status = "FEED_CONTAMINATION";
        }
        if (ph < 6.0) {
          excursions.push(`Effluent pH depression (${ph} pH < 6.5 nominal neutral buffer)`);
          status = "FEED_CONTAMINATION";
        }
      } else if (cleanId.includes("1011") || cleanId.includes("T-1011") || cleanId.includes("TK-1011")) {
        const cond = getLiveVal("T-1011-COND", 1.2);
        const ph = getLiveVal("T-1011-PH", 6.8);
        const isFouled = cond > 2.0;
        metrics = {
          tankLevel_pct: 88.0,
          waterTemperature_degC: 21.6,
          conductivity_uS_cm: cond,
          effluent_ph: ph,
          toc_ppb: 1.1,
          dissolvedOxygen_ppb: 8.0,
          isAvailableAsFailover: !isFouled,
          operationalStatus: isFouled
            ? "Contaminated with Silt & Media Slip (Standby Failover Unsafe)"
            : "Standby Primed & Available for Failover",
        };
        if (isFouled) {
          excursions.push(`Standby buffer tank T-1011 contaminated (${cond} uS/cm > 2.0 uS/cm limit) - failover unsafe`);
          status = "FEED_CONTAMINATION";
        } else {
          status = "STANDBY_READY";
        }
      } else if (cleanId.includes("TK") || cleanId.includes("T-") || cleanId.includes("TANK")) {
        metrics = {
          tankLevel_pct: 78.4,
          waterTemperature_degC: 21.8,
          conductivity_uS_cm: 0.030,
          toc_ppb: 1.2,
          dissolvedOxygen_ppb: 8.2,
        };
      } else if (cleanId.includes("P-") || cleanId.includes("PUMP") || cleanId.startsWith("S-1")) {
        metrics = {
          dischargePressure_bar: 6.2,
          suctionPressure_bar: 2.1,
          flowRate_m3h: 52.0,
          motorCurrent_A: 38.5,
          vibration_mm_s: 1.8,
          vfdFrequency_hz: 48.5,
        };
      } else {
        metrics = {
          supplyPressure_bar: 5.0,
          flowRate_m3h: 22.5,
          temperature_degC: 22.0,
          conductivity_uS_cm: 0.055,
          toc_ppb: 1.2,
        };
      }

      // Filter by requested parameters if provided
      let finalMetrics = metrics;
      if (parameters && parameters.length > 0) {
        finalMetrics = {};
        const lowerParams = parameters.map((p) => p.toLowerCase());
        for (const [k, v] of Object.entries(metrics)) {
          if (lowerParams.some((p) => k.toLowerCase().includes(p))) {
            finalMetrics[k] = v;
          }
        }
        if (Object.keys(finalMetrics).length === 0) finalMetrics = metrics;
      }

      return JSON.stringify({
        success: true,
        assetId: cleanId,
        timestamp: new Date().toISOString(),
        operationalStatus: status,
        metrics: finalMetrics,
        excursions: excursions.length > 0 ? excursions : ["None. All operational parameters within nominal baseline ranges."],
        summary: excursions.length > 0
          ? `Status: ${status}. Active deviations: ${excursions.join("; ")}`
          : `Status: NORMAL. Operational telemetry within baseline tolerance.`
      });
    } catch (err: any) {
      console.warn(`[NATIVE LANGGRAPH TOOL] OT Connection error:`, err?.message);
      return JSON.stringify({
        success: false,
        error: `OT Connection failed for asset ${assetId}: ${err?.message}`,
      });
    }
  },
  {
    name: "ot_connection",
    description: "Industrial OT Historian & SCADA Connector. Reads live operational telemetry and sensor readings (flow rate, inlet/outlet pressures, delta-P, conductivity, TOC, temperature, tank level, pump motor current/VFD) for any queried equipment asset tag.",
    schema: z.object({
      assetId: z.string().describe("Equipment ID or asset tag (e.g. 'T-1011', 'T-1012', 'SAC-0911', 'SAC-0912', 'MMF', 'UPW-RO-01', 'UPW-P-01', 'TOOL-LITHO-01')"),
      parameters: z.array(z.string()).optional().describe("Optional list of specific sensor parameters to read, e.g. ['pressure', 'delta_p', 'conductivity', 'toc', 'flow_rate']"),
    }),
  }
);

// Prebuilt native ToolNode from @langchain/langgraph/prebuilt
export const nativeToolNode = new ToolNode([neo4jCypherTool, neo4jSchemaTool, rdfSparqlTool, knowledgeBaseTool, otConnectionTool]);
