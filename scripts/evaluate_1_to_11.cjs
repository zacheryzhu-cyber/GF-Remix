require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));

async function runEvaluations() {
  const session = driver.session();
  try {
    console.log("=== EVALUATING QUERIES 1 TO 11 AGAINST GRAPH TOPOLOGY ===");

    // Q1: What does Raw Water Feed Tank supply?
    console.log("\n--- Q1: What does the Raw Water Feed Tank supply? ---");
    let res = await session.run("MATCH (t:Equipment {id: 'UPW-TK-01'})-[r:SUPPLIES]->(target) RETURN target.id AS id, target.name AS name, type(r) AS rel, properties(r) AS props");
    res.records.forEach(r => console.log(` -> ${r.get('id')} (${r.get('name')}) [${JSON.stringify(r.get('props'))}]`));

    // Q2: Which chillers are connected to Cooling Tower 1?
    console.log("\n--- Q2: Which chillers are connected to Cooling Tower 1 (CHW-CT-01)? ---");
    res = await session.run(`
      MATCH path = (ct:Equipment {id: 'CHW-CT-01'})-[:SUPPLIES|FEEDS*..4]->(c:Equipment)
      WHERE c.id STARTS WITH 'CHW-CH-' OR c:Chiller
      RETURN DISTINCT c.id AS id, c.name AS name, [n in nodes(path) | n.id] AS pathNodes
    `);
    res.records.forEach(r => console.log(` -> ${r.get('id')} (${r.get('name')}) via path: ${r.get('pathNodes').join(' -> ')}`));

    // Q3: What powers UPW-P-01?
    console.log("\n--- Q3: What powers UPW-P-01? ---");
    res = await session.run(`
      MATCH (p:Equipment {id: 'UPW-P-01'})<-[:SUPPLIES|POWERED_BY]-(powerSource)
      RETURN powerSource.id AS id, powerSource.name AS name, labels(powerSource) AS labels
    `);
    res.records.forEach(r => console.log(` -> Powered by: ${r.get('id')} (${r.get('name')})`));

    // Q4: List all the Chilled Water Pumps.
    console.log("\n--- Q4: List all the Chilled Water Pumps ---");
    res = await session.run(`
      MATCH (p:Equipment)
      WHERE p.id STARTS WITH 'CHW-P-'
      RETURN p.id AS id, p.name AS name, p.type AS type
      ORDER BY p.id
    `);
    res.records.forEach(r => console.log(` -> ${r.get('id')}: ${r.get('name')} (${r.get('type')})`));

    // Q5: Trace the path from the RO skids to the Polishing loop.
    console.log("\n--- Q5: Trace path from RO skids to Polishing loop ---");
    res = await session.run(`
      MATCH path = (ro:Equipment)-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..6]->(loop:Equipment)
      WHERE ro.id STARTS WITH 'UPW-RO-' AND loop.id STARTS WITH 'UPW-LOOP-'
      RETURN ro.id AS ro, loop.id AS loop, [n in nodes(path) | n.id] AS pathNodes
      LIMIT 6
    `);
    res.records.forEach(r => console.log(` -> ${r.get('ro')} to ${r.get('loop')}: ${r.get('pathNodes').join(' -> ')}`));

    // Q6: Which pumps lose power if MCC-01 experiences a total failure?
    console.log("\n--- Q6: Which pumps lose power if MCC-01 fails? ---");
    res = await session.run(`
      MATCH (m:Equipment {id: 'MCC-01'})-[:SUPPLIES]->(p:Equipment)
      WHERE p.id CONTAINS '-P-'
      RETURN p.id AS id, p.name AS name
    `);
    res.records.forEach(r => console.log(` -> ${r.get('id')} (${r.get('name')})`));

    // Q7: What components lose their control signal if PLC-CHW-01 fails?
    console.log("\n--- Q7: What components lose control signal if PLC-CHW-01 fails? ---");
    res = await session.run(`
      MATCH (plc:Equipment {id: 'PLC-CHW-01'})-[:CONTROLLED_BY]->(eq:Equipment)
      RETURN eq.id AS id, eq.name AS name, eq.type AS type
      ORDER BY eq.id
    `);
    res.records.forEach(r => console.log(` -> ${r.get('id')} (${r.get('name')})`));

    // Q8: Trace electrical supply chain starting from Transformer TX-02 down to mechanical equipment
    console.log("\n--- Q8: Electrical supply chain from TX-02 down to equipment ---");
    res = await session.run(`
      MATCH path = (tx:Equipment {id: 'TX-02'})-[:SUPPLIES*1..2]->(m:Equipment)
      RETURN m.id AS id, m.name AS name, [n in nodes(path) | n.id] AS pathNodes
    `);
    res.records.forEach(r => console.log(` -> ${r.get('id')} (${r.get('name')}) | Path: ${r.get('pathNodes').join(' -> ')}`));

    // Q9: Why did Q9 return empty in the AI test? Let's check the path from UPW-TK-01 to Process Tools!
    console.log("\n--- Q9: Path from UPW-TK-01 to Process Tools ---");
    // Notice in the adjacency list:
    // UPW-TK-01 -> UPW-P-01 -> UPW-F-01 -> UPW-RO-01 -> UPW-TK-02 -> UPW-EDI-01 -> UPW-TK-03 -> UPW-P-03 -> UPW-HDR-01 -> UPW-LOOP-A -> UPW-POU-01
    // And then: TOOL-WET-01 -> CONSUMES -> UPW-POU-01
    // NOTICE DIRECTION: The relationship is (tool)-[:CONSUMES]->(pou), NOT (pou)-[:CONSUMES]->(tool)!
    console.log("Checking tool consumption relationships:");
    const toolRes = await session.run(`
      MATCH (tool:Equipment)-[r:CONSUMES]->(target)
      RETURN tool.id AS tool, type(r) AS rel, target.id AS target
      LIMIT 5
    `);
    toolRes.records.forEach(r => console.log(`  (${r.get('tool')}) -[:${r.get('rel')}]-> (${r.get('target')})`));

    // So for Q9, the query from UPW-TK-01 to Process Tools:
    const q9Correct = await session.run(`
      MATCH path = (start:Equipment {id: 'UPW-TK-01'})-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..12]->(pou:Equipment)<-[:CONSUMES]-(tool:Equipment)
      WHERE tool.id STARTS WITH 'TOOL-'
      RETURN DISTINCT tool.id AS tool, tool.name AS name, pou.id AS pou
    `);
    console.log("Correct Q9 Result (downstream tools starved of water):");
    q9Correct.records.forEach(r => console.log(` -> ${r.get('tool')} (${r.get('name')}) via POU ${r.get('pou')}`));

    // Q10: TOOL-LITHO-01 cooling chain:
    console.log("\n--- Q10: TOOL-LITHO-01 cooling supply chain ---");
    // TOOL-LITHO-01 -[:CONSUMES]-> CHW-HX-01
    // What feeds CHW-HX-01?
    const hxRes = await session.run(`
      MATCH (hx:Equipment {id: 'CHW-HX-01'})<-[r]-(source)
      RETURN source.id AS source, type(r) AS rel, hx.id AS hx
    `);
    hxRes.records.forEach(r => console.log(`  (${r.get('source')}) -[:${r.get('rel')}]-> (${r.get('hx')})`));

    const q10Trace = await session.run(`
      MATCH (t:Equipment {id: 'TOOL-LITHO-01'})-[:CONSUMES]->(hx:Equipment)
      MATCH (ct:Equipment)-[:SUPPLIES|FEEDS*..5]->(ch:Equipment)-[:SUPPLIES|FEEDS*..5]->(hx)
      WHERE (ct.id STARTS WITH 'CHW-CT-') AND (ch.id STARTS WITH 'CHW-CH-')
      RETURN DISTINCT ct.id AS coolingTower, ch.id AS chiller, hx.id AS hx
    `);
    console.log("Correct Q10 Result (Chillers and Cooling Towers for TOOL-LITHO-01):");
    q10Trace.records.forEach(r => console.log(` -> Cooling Tower: ${r.get('coolingTower')}, Chiller: ${r.get('chiller')}, HX: ${r.get('hx')}`));

    // Q11: Tools consuming BOTH UPW and CHW:
    console.log("\n--- Q11: Tools consuming BOTH UPW and CHW ---");
    const q11Res = await session.run(`
      MATCH (t:Equipment)-[:CONSUMES]->(upw:Equipment)
      MATCH (t)-[:CONSUMES]->(chw:Equipment)
      WHERE upw.id STARTS WITH 'UPW-' AND chw.id STARTS WITH 'CHW-'
      RETURN DISTINCT t.id AS tool, t.name AS name, collect(DISTINCT upw.id) AS upwFeeds, collect(DISTINCT chw.id) AS chwFeeds
    `);
    q11Res.records.forEach(r => console.log(` -> ${r.get('tool')} (${r.get('name')}) | UPW: ${r.get('upwFeeds').join(', ')} | CHW: ${r.get('chwFeeds').join(', ')}`));

  } finally {
    await session.close();
    await driver.close();
  }
}

runEvaluations();
