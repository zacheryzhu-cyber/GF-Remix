require('dotenv').config();
const neo4j = require('neo4j-driver');

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri) {
  console.log("No NEO4J_URI found. Cannot connect.");
  process.exit(0);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

async function runCheck() {
  try {
    console.log("Checking Neo4j Aura for edge weights...");
    const result = await session.run("MATCH ()-[r]->() RETURN type(r) as type, properties(r) as props LIMIT 10");
    
    let foundWeights = false;
    result.records.forEach(record => {
      const type = record.get('type');
      const props = record.get('props');
      
      console.log(`Edge: [${type}] -> Properties:`, props);
      if (props.max_capacity || props.latency_ms) {
        foundWeights = true;
      }
    });

    if (foundWeights) {
      console.log("\n✅ SUCCESS: Weights (max_capacity, latency_ms, etc.) ARE present in the Neo4j database!");
    } else {
      console.log("\n❌ NO WEIGHTS FOUND: The relationships don't have capacity properties yet. (You may need to click the 'Synchronize' button in the UI).");
    }
  } catch (err) {
    console.error("Error querying Neo4j:", err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

runCheck();
