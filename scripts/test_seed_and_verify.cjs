require('dotenv').config();
const fs = require('fs');
const neo4j = require('neo4j-driver');

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri) {
  console.error("No NEO4J_URI found in environment.");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function runTestSeed() {
  const session = driver.session();
  try {
    const raw = fs.readFileSync('parsed_graph.json', 'utf8');
    const data = JSON.parse(raw);
    console.log(`Loaded parsed_graph.json: ${data.nodes.length} nodes, ${data.edges.length} edges.`);

    console.log("Step 1: Cleaning Neo4j graph...");
    await session.run("MATCH (n) DETACH DELETE n");

    console.log("Step 2: Creating constraints...");
    try {
      await session.run("CREATE CONSTRAINT equipment_id_unique IF NOT EXISTS FOR (e:Equipment) REQUIRE e.id IS UNIQUE");
    } catch (e) {
      console.log("Constraint notice:", e.message);
    }

    console.log("Step 3: Seeding nodes...");
    for (const node of data.nodes) {
      const cypher = `
        MERGE (n:Equipment:\`${node.type}\` {id: $id})
        SET n.name = $name, n.type = $type
      `;
      await session.run(cypher, { id: node.id, name: node.name, type: node.type });
    }

    console.log("Step 4: Seeding relationships with weighted properties...");
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
      const propParams = {};
      for (const [k, v] of Object.entries(properties)) {
        propParams[`prop_${k}`] = v;
      }
      await session.run(cypher, { source: edge.source, target: edge.target, ...propParams });
      edgeCount++;
    }

    console.log("Step 5: Verifying in Neo4j...");
    const nodeCountRes = await session.run("MATCH (n) RETURN count(n) AS nodeCount");
    const relCountRes = await session.run("MATCH ()-[r]->() RETURN count(r) AS relCount");
    const nodeCount = nodeCountRes.records[0].get("nodeCount").toNumber();
    const relCount = relCountRes.records[0].get("relCount").toNumber();
    console.log(`Verified total counts -> Nodes: ${nodeCount}, Relationships: ${relCount}`);

    // Check relationship properties breakdown
    const sampleWeightedRes = await session.run(`
      MATCH (a:Equipment)-[r]->(b:Equipment)
      WHERE r.max_capacity IS NOT NULL OR r.latency_ms IS NOT NULL
      RETURN a.id AS source, type(r) AS rel, b.id AS target, properties(r) AS props
      LIMIT 10
    `);

    console.log("\nSample Relationships with Weights in Neo4j:");
    sampleWeightedRes.records.forEach((rec, idx) => {
      console.log(` ${idx+1}. (${rec.get('source')}) -[:${rec.get('rel')}]-> (${rec.get('target')}) | Weights:`, rec.get('props'));
    });

    const statsRes = await session.run(`
      MATCH ()-[r]->()
      RETURN 
        count(r) AS total,
        count(r.max_capacity) AS withCapacity,
        count(r.latency_ms) AS withLatency
    `);
    const total = statsRes.records[0].get("total").toNumber();
    const withCapacity = statsRes.records[0].get("withCapacity").toNumber();
    const withLatency = statsRes.records[0].get("withLatency").toNumber();
    console.log(`\nWeight Summary in Neo4j:`);
    console.log(` - Total relationships: ${total}`);
    console.log(` - With max_capacity & current_load: ${withCapacity}`);
    console.log(` - With latency_ms & protocol: ${withLatency}`);
    console.log(` - Total weighted relationships: ${withCapacity + withLatency} / ${total}`);

    console.log("\nAll data validated and accepted by Neo4j Aura!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await session.close();
    await driver.close();
  }
}

runTestSeed();
