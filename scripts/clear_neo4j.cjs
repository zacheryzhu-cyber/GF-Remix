require('dotenv').config();
const neo4j = require('neo4j-driver');

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri) {
  console.error("No NEO4J_URI found in environment.");
  process.exit(1);
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
const session = driver.session();

async function clearDatabase() {
  try {
    console.log("Wiping Neo4j database using: MATCH (n) DETACH DELETE n ...");
    const deleteResult = await session.run("MATCH (n) DETACH DELETE n");
    
    // Verify count
    const verifyResult = await session.run("MATCH (n) RETURN count(n) AS nodeCount");
    const nodeCount = verifyResult.records[0].get("nodeCount").toNumber ? verifyResult.records[0].get("nodeCount").toNumber() : verifyResult.records[0].get("nodeCount");
    
    const relResult = await session.run("MATCH ()-[r]->() RETURN count(r) AS relCount");
    const relCount = relResult.records[0].get("relCount").toNumber ? relResult.records[0].get("relCount").toNumber() : relResult.records[0].get("relCount");

    console.log(`Database cleared successfully! Remaining nodes: ${nodeCount}, Remaining relationships: ${relCount}`);
  } catch (err) {
    console.error("Error clearing Neo4j database:", err);
  } finally {
    await session.close();
    await driver.close();
  }
}

clearDatabase();
