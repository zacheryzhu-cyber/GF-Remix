const fs = require('fs');
const md = fs.readFileSync('adjacency_list_v1.md.txt', 'utf8');
const nodes = [];
const edges = [];

// Parse Nodes
const nodeLines = md.match(/^[A-Z0-9-]+\s*\|\s*[A-Za-z0-9]+\s*\|.*$/gm);
if (nodeLines) {
  nodeLines.forEach(line => {
    const parts = line.split('|').map(s => s.trim());
    if (parts.length === 3) {
      nodes.push({ id: parts[0], type: parts[1], name: parts[2] });
    }
  });
}

// Parse Edges strictly within Sections 3 through 8 (avoiding conventions examples & text scenarios)
const lines = md.split('\n');
const startIdx = lines.findIndex(l => l.trim().startsWith('# 3.'));
const endIdx = lines.findIndex(l => l.trim().startsWith('# 9.'));
const edgeLines = (startIdx !== -1 && endIdx !== -1) ? lines.slice(startIdx, endIdx) : lines;

const seenEdgeKeys = new Set();

edgeLines.forEach(line => {
  const lineClean = line.trim();
  const match = lineClean.match(/^([A-Z0-9-]+)\s*->\s*([A-Z_]+)\s*->\s*([A-Z0-9-]+)(?:\s*\[(.*)\])?$/);
  if (match) {
    const source = match[1];
    const relation = match[2];
    const target = match[3];
    const weightStr = match[4];
    
    const edgeKey = `${source}->${relation}->${target}`;
    if (seenEdgeKeys.has(edgeKey)) return;
    seenEdgeKeys.add(edgeKey);
    
    let properties = {};
    if (weightStr) {
      const parts = weightStr.split(',');
      parts.forEach(p => {
        const [k, v] = p.split(':').map(s => s.trim());
        if (k && v) {
          properties[k] = isNaN(v) ? v : Number(v);
        }
      });
    }
    
    edges.push({ source, relation, target, properties });
  }
});

fs.writeFileSync('parsed_graph.json', JSON.stringify({ nodes, edges }, null, 2));
console.log('Parsed successfully with weights');
