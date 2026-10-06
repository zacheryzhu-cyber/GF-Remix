const fs = require('fs');

const data = JSON.parse(fs.readFileSync('parsed_graph.json', 'utf8'));

// Helper to calculate X, Y based on type
function getCoordinates(type, id, index) {
  let x = 0;
  let y = index * 100 + 100;

  switch(type) {
    // UPW Generation (Left Side)
    case 'Tank': x = id.includes('UPW') ? 50 : 1300; break;
    case 'Pump': x = id.includes('UPW') ? 250 : 250; break; // UPW raw/circ vs CHW condenser
    case 'Filter': x = 450; break;
    case 'RO': x = 650; break;
    case 'EDI': x = 850; break;
    case 'Header': x = 1050; break;
    case 'DistributionLoop': x = 1250; break;
    case 'POU': x = 1450; break;

    // CHW Generation (Middle Right)
    case 'CoolingTower': x = 50; y = index * 150 + 1500; break;
    case 'CondenserWaterPump': x = 250; y = index * 150 + 1500; break;
    case 'Chiller': x = 450; y = index * 150 + 1500; break;
    case 'CHWPump': x = 650; y = index * 150 + 1500; break;
    case 'DistributionZone': x = 1250; y = index * 150 + 1500; break;
    case 'CoolingLoad': x = 1450; y = index * 150 + 1500; break;
    case 'HeatExchanger': x = 1450; y = index * 150 + 2000; break;

    // Process Tools (Far Right)
    case 'ProcessTool': x = 1800; y = index * 120 + 500; break;

    // Electrical / Control (Top)
    case 'Transformer': x = 500; y = index * 100 + 50; break;
    case 'MCC': x = 700; y = index * 100 + 50; break;
    case 'PLC': x = 900; y = index * 100 + 50; break;

    default: x = 1000;
  }
  
  // Stagger overlapping nodes
  if(type === 'Pump' && id.includes('CHW')) {
      x = 650;
      y = index * 150 + 1500;
  }

  return { x, y };
}

let typeCounts = {};
let generatedNodes = "";
data.nodes.forEach(node => {
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    const {x, y} = getCoordinates(node.type, node.id, typeCounts[node.type]);
    
    // Style logic
    let bg = '#ffffff';
    let color = '#0f172a';
    let border = '1px solid #cbd5e1';
    
    if(node.id.includes('UPW')) { border = '2px solid #0284c7'; }
    if(node.id.includes('CHW')) { border = '2px solid #0891b2'; }
    if(node.type === 'ProcessTool') { bg = '#fef3c7'; border = '2px solid #f59e0b'; }
    if(node.type === 'MCC' || node.type === 'Transformer') { bg = '#fef08a'; border = '2px solid #eab308'; }
    
    generatedNodes += `    addNode('${node.id}', '${node.name.replace(/'/g, "\\'")}', '${node.type}', { x: ${x}, y: ${y} }, { background: '${bg}', color: '${color}', border: '${border}', borderRadius: '8px', padding: 10, width: 140, textAlign: 'center', fontSize: '10px' });\n`;
});

let generatedEdges = "";
data.edges.forEach((edge, i) => {
    let color = '#94a3b8';
    let animated = false;
    let dashed = false;
    
    if(edge.relation === 'SUPPLIES' || edge.relation === 'FEEDS') { color = '#0284c7'; animated = true; }
    if(edge.relation === 'RETURNS_TO') { color = '#64748b'; animated = true; dashed = true; }
    if(edge.relation === 'POWERED_BY') { color = '#eab308'; animated = true; dashed = true; }
    if(edge.relation === 'CONTROLLED_BY') { color = '#10b981'; animated = true; dashed = true; }
    if(edge.relation === 'BACKUP_FOR') { color = '#f43f5e'; dashed = true; }
    if(edge.relation === 'COOLS') { color = '#06b6d4'; animated = true; }
    
    const edgeId = `e-${edge.source}-${edge.target}-${i}`;
    let style = `{ stroke: '${color}'${dashed ? ", strokeDasharray: '5 5'" : ""} }`;
    generatedEdges += `    addEdge('${edgeId}', '${edge.source}', '${edge.target}', '${edge.relation}', ${style}, ${animated});\n`;
});

const template = `import { DirectedGraph } from './graphEngine';

export class DigitalTwinCore {
  private graph: DirectedGraph;
  private ontology: any[];

  constructor() {
    this.graph = new DirectedGraph();
    this.ontology = [];
    this.initializeTopology();
    this.initializeOntology();
  }

  private initializeTopology() {
    const addNode = (id: string, label: string, type: string, position: {x: number, y: number}, style: any, data: any = {}) => {
      this.graph.addNode(id, { name: label }, [type]);
      this.graph.graphData.nodes.push({ id, position, data: { label, type, ...data }, style });
    };

    const addEdge = (id: string, source: string, target: string, relationship: string, style: any, animated: boolean = false, data: any = {}) => {
      this.graph.addEdge(source, target, { id, relationship, ...data });
      this.graph.graphData.edges.push({ id, source, target, label: relationship, type: 'smoothstep', style, animated });
    };

${generatedNodes}
${generatedEdges}
  }

  private initializeOntology() {
    this.ontology = [
      { subject: 'UPW', predicate: 'isA', object: 'Utility' },
      { subject: 'CHW', predicate: 'isA', object: 'Utility' },
      { subject: 'ProcessTool', predicate: 'requires', object: 'Utility' }
    ];
  }

  public getTopology() {
    return this.graph;
  }

  public getOntology() {
    return this.ontology;
  }
}

export const digitalTwin = new DigitalTwinCore();
`;

fs.writeFileSync('src/backend/DigitalTwinCore.ts', template);
console.log('DigitalTwinCore generated successfully!');
