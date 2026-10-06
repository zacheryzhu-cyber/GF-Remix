require('dotenv').config();
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));

async function runAdvancedAlgorithms() {
  const session = driver.session();
  try {
    console.log("===============================================================================");
    console.log("EVALUATING ADVANCED GRAPH ALGORITHM STRESS TESTS (12 TO 16) ON NEO4J AURA");
    console.log("===============================================================================\n");

    // 12. SPOF Centrality
    // "[SPOF Centrality] Find equipment that has NO incoming backup relationships but supplies more than 3 downstream process tools. (Identifies hidden Single Points of Failure)."
    console.log("### TEST 12: [SPOF Centrality] Single Points of Failure for downstream Process Tools");
    let res = await session.run(`
      MATCH (eq:Equipment)
      WHERE NOT (eq)<-[:BACKUP_FOR]-() AND NOT (eq)-[:BACKUP_FOR]->()
      MATCH path = (eq)-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*1..12]->(pou:Equipment)<-[:CONSUMES]-(tool:Equipment)
      WHERE tool.id STARTS WITH 'TOOL-'
      WITH eq, count(DISTINCT tool) AS downstreamToolCount, collect(DISTINCT tool.id) AS tools
      WHERE downstreamToolCount >= 3
      RETURN eq.id AS id, eq.name AS name, eq.type AS type, downstreamToolCount, tools
      ORDER BY downstreamToolCount DESC
    `);
    console.log(`Identified ${res.records.length} Single Points of Failure:`);
    res.records.forEach(r => {
      console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')}): Supplies ${r.get('downstreamToolCount')} tools [${r.get('tools').join(', ')}]`);
    });

    // 13. Betweenness Centrality
    // "[Betweenness Centrality] Which single node acts as the biggest bottleneck between the Electrical Transformers and the Cleanroom Process Tools?"
    console.log("\n### TEST 13: [Betweenness Centrality] Biggest Bottleneck between Electrical Transformers and Process Tools");
    res = await session.run(`
      MATCH (tx:Equipment) WHERE tx.id STARTS WITH 'TX-'
      MATCH (tool:Equipment) WHERE tool.id STARTS WITH 'TOOL-'
      MATCH p = shortestPath((tx)-[*..15]-(tool))
      UNWIND [n IN nodes(p)[1..-1] | n.id] AS intermediateNode
      RETURN intermediateNode, count(*) AS pathFrequency
      ORDER BY pathFrequency DESC
      LIMIT 10
    `);
    console.log("Top intermediate nodes on shortest paths between Transformers and Tools:");
    res.records.forEach(r => {
      console.log(`  - Node: ${r.get('intermediateNode')} | Shortest Path Traversals: ${r.get('pathFrequency')}`);
    });

    // Let's also check betweenness from pure power supply:
    console.log("\n  -> Checking power-specific bottleneck (TX -> MCC -> Pumps):");
    let powerRes = await session.run(`
      MATCH (tx:Equipment) WHERE tx.id STARTS WITH 'TX-'
      MATCH (p:Equipment) WHERE p.id CONTAINS '-P-'
      MATCH path = (tx)-[:SUPPLIES*1..3]->(p)
      UNWIND [n in nodes(path)[1..-1] | n.id] AS node
      RETURN node, count(*) as count
      ORDER BY count DESC
    `);
    powerRes.records.forEach(r => console.log(`    - Bus/Panel: ${r.get('node')} (feeds ${r.get('count')} pumps)`));

    // 14. Lowest Common Ancestor
    // "[Lowest Common Ancestor] Quality control reports defects on TOOL-CMP-01 and TOOL-LITHO-01. Traverse backwards through the graph to find the exact utility node where their supply chains intersect."
    console.log("\n### TEST 14: [Lowest Common Ancestor] Supply Chain Intersection of TOOL-CMP-01 and TOOL-LITHO-01");
    res = await session.run(`
      MATCH (tool1:Equipment {id: 'TOOL-CMP-01'})-[:CONSUMES]->(res1:Equipment)
      MATCH (tool2:Equipment {id: 'TOOL-LITHO-01'})-[:CONSUMES]->(res2:Equipment)
      RETURN res1.id AS cmpFeed, res2.id AS lithoFeed
    `);
    console.log("Direct consumption feeds:");
    res.records.forEach(r => console.log(`  - CMP: ${r.get('cmpFeed')} | LITHO: ${r.get('lithoFeed')}`));

    // Trace common upstream utility nodes:
    res = await session.run(`
      MATCH (t1:Equipment {id: 'TOOL-CMP-01'})-[:CONSUMES]->(r1:Equipment)<-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*0..10]-(common:Equipment)
      MATCH (t2:Equipment {id: 'TOOL-LITHO-01'})-[:CONSUMES]->(r2:Equipment)<-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*0..10]-(common)
      RETURN DISTINCT common.id AS id, common.name AS name, common.type AS type
      ORDER BY common.id
    `);
    console.log(`Common ancestor utility nodes in their supply chains (${res.records.length} nodes):`);
    res.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // Notice that CHW-HX-01 is shared directly!
    // And for UPW, where do UPW-POU-01 (Loop A) and UPW-POU-05 (Loop C) meet?
    let upwAncestor = await session.run(`
      MATCH (p1:Equipment {id: 'UPW-POU-01'})<-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*1..6]-(common:Equipment)
      MATCH (p2:Equipment {id: 'UPW-POU-05'})<-[:SUPPLIES|FEEDS|DISTRIBUTES_TO*1..6]-(common)
      RETURN DISTINCT common.id AS id, common.name AS name, common.type AS type
    `);
    console.log("\nUPW-specific Lowest Common Ancestor (where Loop A and Loop C intersect):");
    upwAncestor.records.forEach(r => console.log(`  - [${r.get('id')}] ${r.get('name')} (${r.get('type')})`));

    // 15. Blast Radius Simulator
    // "[Blast Radius Simulator] If a pipe bursts at UPW-P-03 and we trigger the emergency shutoff, simulate the blast radius. Which exact tools will lose water, and which will survive due to redundant loops?"
    console.log("\n### TEST 15: [Blast Radius Simulator] Pipe burst at UPW-P-03 with emergency shutoff");
    // Check backup relationship of UPW-P-03:
    let backupRes = await session.run(`
      MATCH (p:Equipment {id: 'UPW-P-03'})-[r:BACKUP_FOR]-(other)
      RETURN p.id AS p, type(r) AS rel, other.id AS backupNode, other.name AS backupName
    `);
    console.log("Redundancy / Backup for UPW-P-03:");
    backupRes.records.forEach(r => console.log(`  - ${r.get('p')} <-> ${r.get('rel')} <-> [${r.get('backupNode')}] ${r.get('backupName')}`));

    // If UPW-P-03 is shut off, does UPW-P-04 take over?
    // Let's check downstream of UPW-P-03 vs UPW-P-04:
    let p3Feed = await session.run(`
      MATCH (p:Equipment {id: 'UPW-P-03'})-[:SUPPLIES]->(target)
      RETURN target.id AS targetId, target.name AS targetName
    `);
    let p4Feed = await session.run(`
      MATCH (p:Equipment {id: 'UPW-P-04'})-[:SUPPLIES]->(target)
      RETURN target.id AS targetId, target.name AS targetName
    `);
    console.log("UPW-P-03 feeds:", p3Feed.records.map(r => r.get('targetId')).join(', '));
    console.log("UPW-P-04 feeds:", p4Feed.records.map(r => r.get('targetId')).join(', '));

    // 16. Hidden Community Detection
    // "[Hidden Community Detection] Ignore the labels and analyze pure topology. Are the Wet Clean tools and CMP tools truly isolated on separate utility loops, or does a cross-connect exist?"
    console.log("\n### TEST 16: [Hidden Community Detection] Topology isolation between Wet Clean and CMP tools");
    res = await session.run(`
      MATCH (cmp:Equipment), (wc:Equipment)
      WHERE cmp.id IN ['TOOL-CMP-01', 'TOOL-CMP-02'] AND wc.id IN ['TOOL-WC-01', 'TOOL-WC-02']
      MATCH path = shortestPath((cmp)-[:CONSUMES|SUPPLIES|DISTRIBUTES_TO|RETURNS_TO*1..6]-(wc))
      RETURN cmp.id AS cmp, wc.id AS wc, [n in nodes(path) | n.id] AS connectionPath, length(path) AS hops
    `);
    console.log(`Cross-connections found: ${res.records.length}`);
    res.records.forEach(r => {
      console.log(`  - ${r.get('cmp')} <-> ${r.get('wc')} via [${r.get('connectionPath').join(' <-> ')}] (${r.get('hops')} hops)`);
    });

  } finally {
    await session.close();
    await driver.close();
  }
}

runAdvancedAlgorithms();
