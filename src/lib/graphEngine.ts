export type NodeId = string;

export interface GraphNode {
  id: NodeId;
  labels: string[]; // e.g., ['Tank', 'Storage']
  properties: Record<string, any>; // e.g., { status: 'ACTIVE', capacity: 1000 }
}

export interface GraphEdge {
  id: string;
  source: NodeId;
  target: NodeId;
  type: string; // e.g., 'SUPPLIES', 'CONNECTS_TO', 'AGITATES'
  properties: Record<string, any>; // e.g., { capacity: 50, resistance: 2 }
}

export class GraphEngine {
  public graphData: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };
  private nodes: Map<NodeId, GraphNode> = new Map();
  // Directed adjacency list: NodeId -> Edges pointing OUT from that node
  private outEdges: Map<NodeId, GraphEdge[]> = new Map();
  // Directed adjacency list: NodeId -> Edges pointing IN to that node
  private inEdges: Map<NodeId, GraphEdge[]> = new Map();

  export() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.outEdges.values()).flat()
    };
  }

  importData(data: { nodes: GraphNode[], edges: GraphEdge[] }) {
    this.nodes.clear();
    this.outEdges.clear();
    this.inEdges.clear();
    data.nodes.forEach(n => this.addNode(n));
    data.edges.forEach(e => this.addEdge(e));
  }

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.outEdges.has(node.id)) this.outEdges.set(node.id, []);
    if (!this.inEdges.has(node.id)) this.inEdges.set(node.id, []);
  }

  addEdge(edge: GraphEdge) {
    this.outEdges.get(edge.source)?.push(edge);
    this.inEdges.get(edge.target)?.push(edge);
  }

  getNode(id: NodeId): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): GraphEdge[] {
    return Array.from(this.outEdges.values()).flat();
  }

  getRawData() {
    return {
      nodes: Array.from(this.nodes.entries()),
      outEdges: Array.from(this.outEdges.entries()),
      inEdges: Array.from(this.inEdges.entries())
    };
  }

  /**
   * ALGORITHM 1: Reachability / Impact Analysis (BFS)
   * Finds all nodes downstream (affected by) a given starting node.
   */
  traceDownstream(startNodeId: NodeId, excludeNodes: Set<NodeId> = new Set()): { visitedNodes: Set<NodeId>; traversedEdges: Set<string> } {
    const visitedNodes = new Set<NodeId>();
    const traversedEdges = new Set<string>();
    const queue: NodeId[] = [startNodeId];
    visitedNodes.add(startNodeId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const outgoing = this.outEdges.get(currentId) || [];

      for (const edge of outgoing) {
        traversedEdges.add(edge.id);
        if (!excludeNodes.has(edge.target) && !visitedNodes.has(edge.target)) {
          visitedNodes.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    return { visitedNodes, traversedEdges };
  }

  /**
   * ALGORITHM 1.5: Upstream Trace (BFS)
   * Finds all nodes upstream (feeding into) a given starting node.
   * Useful for Root Cause Analysis.
   */
  traceUpstream(startNodeId: NodeId, excludeNodes: Set<NodeId> = new Set()): { visitedNodes: Set<NodeId>; traversedEdges: Set<string> } {
    const visitedNodes = new Set<NodeId>();
    const traversedEdges = new Set<string>();
    const queue: NodeId[] = [startNodeId];
    visitedNodes.add(startNodeId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const incoming = this.inEdges.get(current) || [];

      for (const edge of incoming) {
        traversedEdges.add(edge.id);
        if (!excludeNodes.has(edge.source) && !visitedNodes.has(edge.source)) {
          visitedNodes.add(edge.source);
          queue.push(edge.source);
        }
      }
    }
    return { visitedNodes, traversedEdges };
  }

  /**
   * ALGORITHM 2: Shortest Path (Dijkstra)
   * Finds optimal routing path based on edge 'resistance'. 
   * Ignores control edges (like AGITATES) by checking for resistance property.
   */
  findShortestPath(startId: NodeId, endId: NodeId, excludeNodes: Set<NodeId> = new Set()): { pathEdges: Set<string>, pathNodes: Set<NodeId> } {
    const distances = new Map<NodeId, number>();
    const previousNode = new Map<NodeId, NodeId>();
    const previousEdge = new Map<NodeId, string>();
    const unvisited = new Set<NodeId>(Array.from(this.nodes.keys()).filter(id => !excludeNodes.has(id) || id === startId || id === endId));

    for (const id of this.nodes.keys()) {
      if (excludeNodes.has(id) && id !== startId && id !== endId) continue;
      distances.set(id, Infinity);
    }
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let currentId: NodeId | null = null;
      let minDistance = Infinity;
      for (const id of unvisited) {
        const d = distances.get(id)!;
        if (d < minDistance) {
          minDistance = d;
          currentId = id;
        }
      }

      if (currentId === null || currentId === endId) break;
      unvisited.delete(currentId);

      const outgoing = this.outEdges.get(currentId) || [];
      for (const edge of outgoing) {
        // Only traverse fluid edges (must have resistance)
        if (edge.properties.resistance === undefined) continue;
        if (excludeNodes.has(edge.target) && edge.target !== endId) continue;
        
        const alt = distances.get(currentId)! + edge.properties.resistance;
        if (alt < distances.get(edge.target)!) {
          distances.set(edge.target, alt);
          previousNode.set(edge.target, currentId);
          previousEdge.set(edge.target, edge.id);
        }
      }
    }

    // Backtrack to build the path
    const pathEdges = new Set<string>();
    const pathNodes = new Set<NodeId>();
    let curr = endId;
    
    if (distances.get(endId) !== Infinity) {
      pathNodes.add(curr);
      while (previousNode.has(curr)) {
        const edgeId = previousEdge.get(curr)!;
        pathEdges.add(edgeId);
        curr = previousNode.get(curr)!;
        pathNodes.add(curr);
      }
    }
    return { pathEdges, pathNodes };
  }

  /**
   * ALGORITHM 3: Cycle Detection (DFS for Back-Edges)
   * Scans the graph for hazardous feedback loops (e.g., recirculation).
   */
  detectCycles(): { cyclicEdges: Set<string>, cyclicNodes: Set<NodeId> } {
    const cyclicEdges = new Set<string>();
    const cyclicNodes = new Set<NodeId>();
    const visited = new Set<NodeId>();
    const recursionStack = new Set<NodeId>();
    const edgeStack = new Map<NodeId, string>(); // To trace which edge led to which node

    const dfs = (nodeId: NodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = this.outEdges.get(nodeId) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          edgeStack.set(edge.target, edge.id);
          dfs(edge.target);
        } else if (recursionStack.has(edge.target)) {
          // Cycle detected! Record the back-edge causing it
          cyclicEdges.add(edge.id);
          cyclicNodes.add(nodeId);
          cyclicNodes.add(edge.target);
        }
      }
      recursionStack.delete(nodeId);
    };

    // Run DFS from all nodes to ensure disconnected components are checked
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return { cyclicEdges, cyclicNodes };
  }

  /**
   * ALGORITHM 4: Degree Centrality
   * Ranks equipment by total connections (in + out). Identifies Manifolds and Hubs.
   */
  getDegreeCentralityRankings(): { nodeId: NodeId, score: number, rank: number }[] {
    const scores = Array.from(this.nodes.keys()).map(id => {
      const inCount = (this.inEdges.get(id) || []).length;
      const outCount = (this.outEdges.get(id) || []).length;
      return { nodeId: id, score: inCount + outCount };
    });

    scores.sort((a, b) => b.score - a.score);
    
    return scores.map((s, index) => ({ ...s, rank: index + 1 }));
  }

  matchNodes(label?: string, propertyFilters?: Record<string, any>): GraphNode[] {
    let results = this.getAllNodes();

    if (label) {
      results = results.filter(n => n.labels.includes(label));
    }

    if (propertyFilters) {
      results = results.filter(n => {
        for (const [key, val] of Object.entries(propertyFilters)) {
          if (n.properties[key] !== val) return false;
        }
        return true;
      });
    }

    return results;
  }
}
