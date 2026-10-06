require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));

async function verifyAll11() {
  const session = driver.session();
  try {
    console.log("===============================================================================");
    console.log("RIGOROUS VERIFICATION OF STRESS TESTS 1 TO 11 ON NEO4J AURA");
    console.log("===============================================================================\n");

    // 1
    console.log("### TEST 1: What does the Raw Water Feed Tank supply?");
    let res = await session.run(`
      MATCH (t:Equipment {id: 'UPW-TK-01'})-[:SUPPLIES]->(p:Equipment)
      RETURN p.id AS id, p.name AS name, p.type AS type
    `);
    console.log("Direct supplies (1 hop):");
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // 2
    console.log("\n### TEST 2: Which chillers are connected to Cooling Tower 1?");
    res = await session.run(`
      MATCH path = (ct:Equipment {id: 'CHW-CT-01'})-[:SUPPLIES|FEEDS*..4]->(c:Equipment)
      WHERE c.id STARTS WITH 'CHW-CH-' OR c:Chiller
      RETURN DISTINCT c.id AS id, c.name AS name, [n in nodes(path) | n.id] AS path
    `);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} | Path: ${r.get('path').join(' -> ')}`));

    // 3
    console.log("\n### TEST 3: What powers UPW-P-01?");
    res = await session.run(`
      MATCH (p:Equipment {id: 'UPW-P-01'})<-[:SUPPLIES|POWERED_BY]-(powerSource)
      WHERE powerSource:MCC OR powerSource:Transformer OR powerSource.id STARTS WITH 'MCC-' OR powerSource.id STARTS WITH 'TX-'
      RETURN powerSource.id AS id, powerSource.name AS name, labels(powerSource) AS labels
    `);
    res.records.forEach(r => console.log(`  - Direct Power: [${r.get('id')}] ${r.get('name')} (${r.get('labels').join(':')})`));

    // 4
    console.log("\n### TEST 4: List all the Chilled Water Pumps.");
    res = await session.run(`
      MATCH (p:Equipment)
      WHERE p.id STARTS WITH 'CHW-P-'
      RETURN p.id AS id, p.name AS name, p.type AS type
      ORDER BY p.id
    `);
    console.log(`Total Chilled Water Pumps: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // 5
    console.log("\n### TEST 5: Trace the path from the RO skids to the Polishing loop.");
    res = await session.run(`
      MATCH path = (ro:Equipment)-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..8]->(loop:Equipment)
      WHERE ro.id IN ['UPW-RO-01', 'UPW-RO-02'] AND loop.id IN ['UPW-LOOP-A', 'UPW-LOOP-B', 'UPW-LOOP-C']
      RETURN ro.id AS ro, loop.id AS loop, [n in nodes(path) | n.id] AS steps
      LIMIT 4
    `);
    res.records.forEach(r => console.log(`  - ${r.get('ro')} -> ${r.get('loop')}: ${r.get('steps').join(' -> ')}`));

    // 6
    console.log("\n### TEST 6: Which pumps lose power if MCC-01 experiences a total failure?");
    res = await session.run(`
      MATCH (m:Equipment {id: 'MCC-01'})-[:SUPPLIES]->(p:Equipment)
      WHERE p.id CONTAINS '-P-'
      RETURN p.id AS id, p.name AS name, p.type AS type
      ORDER BY p.id
    `);
    console.log(`Pumps losing power: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // 7
    console.log("\n### TEST 7: What components lose their control signal if PLC-CHW-01 fails?");
    res = await session.run(`
      MATCH (plc:Equipment {id: 'PLC-CHW-01'})-[:CONTROLLED_BY]->(eq:Equipment)
      RETURN eq.id AS id, eq.name AS name, eq.type AS type
      ORDER BY eq.id
    `);
    console.log(`Components losing control: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // 8
    console.log("\n### TEST 8: Trace the electrical supply chain starting from Transformer TX-02 down to the exact mechanical equipment it powers.");
    res = await session.run(`
      MATCH path = (tx:Equipment {id: 'TX-02'})-[:SUPPLIES*1..2]->(m:Equipment)
      RETURN m.id AS id, m.name AS name, m.type AS type, [n in nodes(path) | n.id] AS path
      ORDER BY m.id
    `);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')}) | Chain: ${r.get('path').join(' -> ')}`));

    // 9
    console.log("\n### TEST 9: If the Raw Water Feed Tank goes offline, which specific Process Tools will eventually be starved of water?");
    res = await session.run(`
      MATCH (t:Equipment {id: 'UPW-TK-01'})-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..12]->(pou:Equipment)<-[:CONSUMES]-(tool:Equipment)
      WHERE tool.id STARTS WITH 'TOOL-'
      RETURN DISTINCT tool.id AS id, tool.name AS name, tool.type AS type, collect(DISTINCT pou.id) AS viaPOU
      ORDER BY tool.id
    `);
    console.log(`Process Tools starved of water: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')}) via POU: ${r.get('viaPOU').join(', ')}`));

    // 10
    console.log("\n### TEST 10: TOOL-LITHO-01 is overheating. Which specific chillers and cooling towers are in its direct cooling supply chain?");
    res = await session.run(`
      MATCH (t:Equipment {id: 'TOOL-LITHO-01'})-[:CONSUMES]->(hx:Equipment)
      MATCH path = (source:Equipment)-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*..8]->(hx)
      WHERE source:Chiller OR source:CoolingTower OR source.id STARTS WITH 'CHW-CH-' OR source.id STARTS WITH 'CHW-CT-'
      RETURN DISTINCT source.id AS id, source.name AS name, labels(source) AS labels
      ORDER BY source.id
    `);
    console.log(`Chillers & Cooling Towers in direct cooling supply chain: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('labels').join(':')})`));

    // 11
    console.log("\n### TEST 11: Which Process Tools consume BOTH Ultrapure Water and Chilled Water?");
    res = await session.run(`
      MATCH (t:Equipment)-[:CONSUMES]->(upw:Equipment)
      MATCH (t)-[:CONSUMES]->(chw:Equipment)
      WHERE upw.id STARTS WITH 'UPW-' AND chw.id STARTS WITH 'CHW-'
      RETURN DISTINCT t.id AS id, t.name AS name, collect(DISTINCT upw.id) AS upwList, collect(DISTINCT chw.id) AS chwList
      ORDER BY t.id
    `);
    console.log(`Process Tools consuming BOTH: ${res.records.length}`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} | UPW: ${r.get('upwList').join(', ')} | CHW: ${r.get('chwList').join(', ')}`));

  } finally {
    await session.close();
    await driver.close();
  }
}

verifyAll11();
