const http = require('http');

const queries = [
  "What does the Raw Water Feed Tank supply?",
  "Which chillers are connected to Cooling Tower 1?",
  "What powers UPW-P-01?",
  "List all the Chilled Water Pumps.",
  "Trace the path from the RO skids to the Polishing loop.",
  "Which pumps lose power if MCC-01 experiences a total failure?",
  "What components lose their control signal if PLC-CHW-01 fails?",
  "Trace the electrical supply chain starting from Transformer TX-02 down to the exact mechanical equipment it powers.",
  "If the Raw Water Feed Tank goes offline, which specific Process Tools will eventually be starved of water?",
  "TOOL-LITHO-01 is overheating. Which specific chillers and cooling towers are in its direct cooling supply chain?",
  "Which Process Tools consume BOTH Ultrapure Water and Chilled Water?"
];

function queryEngine(q, index) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ prompt: q, mode: 'fast', useAura: true });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 25000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ index: index + 1, query: q, parsed });
        } catch (e) {
          resolve({ index: index + 1, query: q, error: e.message, body });
        }
      });
    });
    req.on('error', (e) => resolve({ index: index + 1, query: q, error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function runAll() {
  console.log("=== EXECUTING STRESS TESTS 1 TO 11 ON NEO4J AURA ===");
  for (let i = 0; i < queries.length; i++) {
    const res = await queryEngine(queries[i], i);
    console.log(`\n------------------------------------------------------------`);
    console.log(`[TEST ${res.index}] "${res.query}"`);
    if (res.error) {
      console.log(`Error: ${res.error}`);
    } else {
      console.log(`Action: ${res.parsed.action}`);
      console.log(`Cypher: ${res.parsed.cypher}`);
      console.log(`Explanation: ${res.parsed.explanation}`);
      if (res.parsed.auraResult) {
        console.log(`Aura Execution Time: ${res.parsed.auraResult.executionTimeMs}ms`);
        const recs = res.parsed.auraResult.records || [];
        console.log(`Records Returned: ${recs.length}`);
        
        // Extract node IDs from the record
        const extractedIds = [];
        recs.forEach(row => {
          Object.values(row).forEach(val => {
            if (val && val.properties && val.properties.id) {
              extractedIds.push(`${val.properties.id} (${val.properties.name || val.labels?.join(':')})`);
            } else if (val && val.id) {
              extractedIds.push(val.id);
            }
          });
        });
        console.log(`Matched Entities (${extractedIds.length}):`, extractedIds.join(', '));
      }
    }
  }
}

runAll();
