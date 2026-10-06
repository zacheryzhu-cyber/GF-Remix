import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
  MiniMap,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GraphEngine } from "../lib/graphEngine";
import {
  GitCommit,
  Network,
  Share2,
  Terminal,
  Zap,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRightLeft,
  Waypoints,
  Map,
  Play,
  Database,
  HardDrive,
  Cpu,
  ChevronRight,
} from "lucide-react";
import { ForceGraphView } from "../components/ForceGraphView";
import { Neo4jAuraWorkbench } from "../components/Neo4jAuraWorkbench";

// List of sample queries ordered by difficulty (incorporating advanced graph algorithms)
const SAMPLE_QUERIES = [
  // Level 1: Direct Adjacency & Lookups (Toy Problems)
  "[*] What does the Raw Water Feed Tank supply?",
  "[*] Which chillers are connected to Cooling Tower 1?",
  "[*] What powers UPW-P-01?",
  "[*] List all the Chilled Water Pumps.",

  // Intermediate Traces
  "[**] Trace the path from the RO skids to the Polishing loop.",
  "[**] Which pumps lose power if MCC-01 experiences a total failure?",
  "[***] What components lose their control signal if PLC-CHW-01 fails?",
  "[***] Trace the electrical supply chain starting from Transformer TX-02 down to the exact mechanical equipment it powers.",

  // Complex Cascading
  "[****] If the Raw Water Feed Tank goes offline, which specific Process Tools will eventually be starved of water?",
  "[****] TOOL-LITHO-01 is overheating. Which specific chillers and cooling towers are in its direct cooling supply chain?",
  "[****] Which Process Tools consume BOTH Ultrapure Water and Chilled Water?",
  
  // Advanced Graph Algorithms (The "Cool, Fun, Impactful" ones)
  "[^^] [SPOF Centrality] Find equipment that has NO incoming backup relationships but supplies more than 3 downstream process tools. (Identifies hidden Single Points of Failure).",
  "[^^] [Betweenness Centrality] Which single node acts as the biggest bottleneck between the Electrical Transformers and the Cleanroom Process Tools?",
  "[^^] [Lowest Common Ancestor] Quality control reports defects on TOOL-CMP-01 and TOOL-LITHO-01. Traverse backwards through the graph to find the exact utility node where their supply chains intersect.",
  "[^^] [Blast Radius Simulator] If a pipe bursts at UPW-P-03 and we trigger the emergency shutoff, simulate the blast radius. Which exact tools will lose water, and which will survive due to redundant loops?",
  "[^^] [Hidden Community Detection] Ignore the labels and analyze pure topology. Are the Wet Clean tools and CMP tools truly isolated on separate utility loops, or does a cross-connect exist?"
];

export function LpgVisualizer() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [useAura, setUseAura] = useState(true);
  const [useNeurosymbolic, setUseNeurosymbolic] = useState(false);
  const [lastAuraResult, setLastAuraResult] = useState<{
    executionTimeMs?: number;
    recordCount?: number;
    nodeCount?: number;
    records?: any[];
    error?: string;
  } | null>(null);
  const [generatedCypher, setGeneratedCypher] = useState<{
    cypher: string;
    explanation: string;
  } | null>(null);
  const [aiSynthesis, setAiSynthesis] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<
    "visualizer" | "forcegraph" | "neo4j_live" | "adjacency"
  >("visualizer");
  const [neo4jTargetCypher, setNeo4jTargetCypher] = useState<string | undefined>(undefined);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [modelTier, setModelTier] = useState<"fast" | "deep">("fast");
  const [alarmNodes, setAlarmNodes] = useState<any[]>([]);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const graphEngine = useRef(new GraphEngine());

  useEffect(() => {
    fetch("/api/twin/lpg")
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.flowData.nodes);
        setEdges(data.flowData.edges);
        setInitialNodes(data.flowData.nodes);
        setInitialEdges(data.flowData.edges);
        graphEngine.current.importData(data.graphData);
        setIsDataLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load digital twin data", err);
      });

    // Check if alarms are already in Neo4j on load
    fetch("/api/neo4j/alarms/check")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.exists && data.alarms) {
          setAlarmNodes(data.alarms);
        }
      })
      .catch(() => {
        // ignore offline check
      });
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [
      ...prev,
      `[${new Date().toISOString().split("T")[1].split(".")[0]}] ${msg}`,
    ]);
  };

  const handleAiQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrompt = aiPrompt.replace(/^\[\*+\]\s*/, "").trim();
    if (!cleanPrompt) return;

    setIsAiLoading(true);
    setGeneratedCypher(null);
    setAiSynthesis(null);
    setLastAuraResult(null);
    setLogs([]);
    addLog(`> Received prompt: "${cleanPrompt}"`);
    addLog(
      `> Execution Mode: ${modelTier === "deep" ? "🧠 Deep Reasoning" : "⚡ Fast"}`,
    );
    if (useAura) {
      addLog("> Target Engine: 🟢 Enterprise Property Graph (Live Cloud Engine)");
    } else {
      addLog("> Target Engine: ⚪ In-Memory GraphEngine (Local Client Engine)");
    }
    addLog("> Initiating secure connection to LLM API...");

    try {
      const response = await fetch(
        useNeurosymbolic ? "/api/neurosymbolic/query" : "/api/query",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: cleanPrompt, mode: modelTier, useAura }),
        },
      );

      addLog("> LLM Inference complete. Awaiting JSON parse...");
      const data = await response.json();

      if (data.error) {
        addLog(`> ERROR: ${data.error}`);
        alert("AI Engine Error: " + data.error);
      } else {
        const actionName = (data.action || "query").toUpperCase();
        addLog(
          `> Intent successfully mapped to algorithm: [${actionName}]`,
        );
        setGeneratedCypher({
          cypher:
            data.cypher ||
            "Neurosymbolic Mode: Physical query governed by semantic rules.",
          explanation: data.reasoning || data.explanation || "Query processed successfully.",
        });

        // Record Aura Cloud results if returned
        if (data.auraResult) {
          setLastAuraResult({
            executionTimeMs: data.auraResult.executionTimeMs,
            recordCount: data.auraResult.records?.length || 0,
            nodeCount: data.highlightNodes?.length || 0,
            records: data.auraResult.records,
          });
          addLog(
            `> [Cloud Graph Engine] Connected: cloud-graph://instance-30544b94 (${data.auraResult.executionTimeMs}ms)`,
          );
          addLog(
            `> [Cloud Graph Engine] Query executed successfully. Returned ${data.auraResult.records?.length || 0} record(s).`,
          );
        } else if (data.auraError) {
          setLastAuraResult({ error: data.auraError });
          addLog(`> [Cloud Graph Engine Warning] ${data.auraError}`);
        }

        let resultNodes: string[] = [];

        if (data.excludeNodes && data.excludeNodes.length > 0) {
          addLog(
            `> Neurosymbolic constraint applied: Excluding nodes [${data.excludeNodes.join(", ")}]`,
          );
        }

        // When "Use Aura" is checked and Aura returned matching nodes, use Aura results!
        if (useAura && data.highlightNodes && data.highlightNodes.length > 0) {
          addLog(
            `> [Graph Engine Active] Applying ${data.highlightNodes.length} nodes resolved from Cloud Graph...`,
          );
          resultNodes = data.highlightNodes;
          const highlightedNodes = new Set<string>(resultNodes);
          const highlightedEdges = new Set<string>(data.highlightEdges || []);

          if (highlightedEdges.size === 0) {
            graphEngine.current.getAllEdges().forEach((edge) => {
              if (
                highlightedNodes.has(edge.source) ||
                highlightedNodes.has(edge.target)
              ) {
                highlightedEdges.add(edge.id);
              }
            });
          }

          applyGraphResult(
            highlightedNodes,
            highlightedEdges,
            "#059669", // Emerald for Cloud Graph Engine
            "neo4j_aura",
            highlightedNodes,
            highlightedEdges,
          );
          addLog(`> Process view updated with ${resultNodes.length} nodes from Enterprise Property Graph.`);
        } else if (data.action === "pseudo_engine") {
          addLog(`> Pseudo Graph Engine returning computed node highlights...`);
          resultNodes = data.highlightNodes || [];
          const highlightedNodes = new Set<string>(resultNodes);
          const highlightedEdges = new Set<string>(data.highlightEdges || []); // Use LLM's returned edges if available

          // Fallback if LLM didn't return highlightEdges for some reason
          if (highlightedEdges.size === 0) {
            graphEngine.current.getAllEdges().forEach((edge) => {
              if (
                highlightedNodes.has(edge.source) ||
                highlightedNodes.has(edge.target)
              ) {
                highlightedEdges.add(edge.id);
              }
            });
          }
          applyGraphResult(
            highlightedNodes,
            highlightedEdges,
            "#8b5cf6",
            "pseudo_engine",
            highlightedNodes,
            highlightedEdges,
          ); // Violet
        } else if (data.action === "bfs") {
          addLog(
            `> GraphEngine running Downstream Trace (BFS) from ${data.sourceId || "tank-b"}...`,
          );
          resultNodes = runBFSImpact(
            data.sourceId || "tank-b",
            data.targetLabel,
            data.excludeNodes,
          );
        } else if (data.action === "bfs_upstream") {
          addLog(
            `> GraphEngine running Upstream Trace (BFS) from ${data.sourceId || "b3"}...`,
          );
          resultNodes = runBFSUpstream(
            data.sourceId || "b3",
            data.targetLabel,
            data.excludeNodes,
          );
        } else if (data.action === "dijkstra") {
          addLog(
            `> GraphEngine running Dijkstra Shortest Path calculations...`,
          );
          resultNodes = runDijkstra(
            data.sourceId || "tank-a",
            data.targetId || "tank-final-1",
            data.excludeNodes,
          );
        } else if (data.action === "dfs") {
          addLog(
            "> GraphEngine running Depth-First Search (DFS) back-edge detection...",
          );
          resultNodes = runCycleDetection();
        } else if (data.action === "centrality") {
          addLog("> GraphEngine evaluating total bipartite connectivity...");
          resultNodes = runCentrality();
        } else {
          addLog(`> ERROR: Unrecognized action ${data.action}`);
        }
        addLog("> Canvas state updated successfully.");

        if (resultNodes.length > 0) {
          addLog("> Requesting Natural Language Synthesis of graph results...");
          const synthRes = await fetch("/api/lpg/synthesize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: cleanPrompt,
              action: data.action || "query",
              resultNodes,
              mode: modelTier,
            }),
          });
          const synthData = await synthRes.json();
          if (synthData.synthesis) {
            setAiSynthesis(synthData.synthesis);
            addLog("> AI Synthesis complete.");
          }
        }
      }
    } catch (err) {
      addLog("> FATAL: Failed to connect to the backend engine.");
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const applyGraphResult = (
    highlightedNodes: Set<string>,
    highlightedEdges: Set<string>,
    highlightColor: string,
    queryName: string,
    contextNodes: Set<string> = new Set(),
    contextEdges: Set<string> = new Set(),
  ) => {
    setActiveQuery(queryName);
    setActiveFilter(null); // Clear active filter if a query is run
    setNodes((nds) =>
      nds.map((node) => {
        if (highlightedNodes.has(node.id)) {
          return {
            ...node,
            hidden: false,
            style: {
              ...node.style,
              opacity: 1,
              boxShadow: `0 0 15px ${highlightColor}`,
              border: `2px solid ${highlightColor}`,
            },
          };
        }
        if (contextNodes.has(node.id)) {
          return {
            ...node,
            hidden: false,
            style: {
              ...node.style,
              opacity: 0.5,
              border: `2px solid ${highlightColor}66`,
            },
          };
        }
        return {
          ...node,
          hidden: false,
          style: { ...node.style, opacity: 0.3 },
        };
      }),
    );

    setEdges((eds) =>
      eds.map((edge) => {
        if (highlightedEdges.has(edge.id)) {
          return {
            ...edge,
            hidden: false,
            style: { stroke: highlightColor, strokeWidth: 3 },
            animated: true,
          };
        }
        if (contextEdges.has(edge.id)) {
          return {
            ...edge,
            hidden: false,
            style: { stroke: highlightColor, strokeWidth: 1, opacity: 0.5 },
            animated: false,
          };
        }
        return {
          ...edge,
          hidden: false,
          style: { ...edge.style, opacity: 0.4 },
          animated: false,
        };
      }),
    );
  };

  const getNodeAttributes = (n: Node) => {
    const rawProps = (n.data?.properties as Record<string, any>) || {};
    const id = n.id || "";
    const name = String(n.data?.label || rawProps.name || id);
    const type = String(n.data?.type || rawProps.type || "Equipment");

    return [
      { key: "id", label: "ID", value: id },
      { key: "name", label: "Name", value: name },
      { key: "type", label: "Type", value: type },
    ];
  };

  const edgeTypeSummary = useMemo(() => {
    const counts: Record<string, number> = {};
    edges.forEach((e) => {
      const rawLabel =
        (e.label as string) ||
        (e.data as any)?.label ||
        (e.data as any)?.relation ||
        (e.data as any)?.type ||
        "CONNECTED_TO";
      const label = String(rawLabel).trim().toUpperCase();
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [edges]);

  const runBFSImpact = (
    startNode: string = "tank-b",
    targetLabel?: string,
    excludeNodes?: string[],
  ) => {
    const result = graphEngine.current.traceDownstream(
      startNode,
      new Set<string>(excludeNodes || []),
    );
    let finalNodes = result.visitedNodes;
    if (targetLabel) {
      finalNodes = new Set(
        (Array.from(result.visitedNodes) as string[]).filter((id) => {
          if (id === startNode) return true;
          const node = graphEngine.current.getNode(id);
          return node?.labels.includes(targetLabel);
        }),
      );
    }
    applyGraphResult(
      finalNodes,
      result.traversedEdges,
      "#d97706",
      "bfs",
      result.visitedNodes,
      result.traversedEdges,
    ); // Darker Amber
    return Array.from(finalNodes) as string[];
  };

  const runBFSUpstream = (
    startNode: string = "b3",
    targetLabel?: string,
    excludeNodes?: string[],
  ) => {
    const result = graphEngine.current.traceUpstream(
      startNode,
      new Set<string>(excludeNodes || []),
    );
    let finalNodes = result.visitedNodes;
    if (targetLabel) {
      finalNodes = new Set<string>(
        (Array.from(result.visitedNodes) as string[]).filter((id) => {
          if (id === startNode) return true;
          const node = graphEngine.current.getNode(id);
          return node?.labels.includes(targetLabel);
        }),
      );
    }
    applyGraphResult(
      finalNodes,
      result.traversedEdges,
      "#059669",
      "bfs_upstream",
      result.visitedNodes,
      result.traversedEdges,
    ); // Darker Emerald
    return Array.from(finalNodes) as string[];
  };

  const runDijkstra = (
    startNode: string = "tank-a",
    targetNode: string = "tank-final-1",
    excludeNodes?: string[],
  ) => {
    // Find shortest path
    const result = graphEngine.current.findShortestPath(
      startNode,
      targetNode,
      new Set<string>(excludeNodes || []),
    );
    applyGraphResult(
      result.pathNodes,
      result.pathEdges,
      "#0284c7",
      "dijkstra",
      result.pathNodes,
      result.pathEdges,
    ); // Darker Blue
    return Array.from(result.pathNodes) as string[];
  };

  const runCycleDetection = () => {
    const result = graphEngine.current.detectCycles();
    applyGraphResult(
      result.cyclicNodes,
      result.cyclicEdges,
      "#dc2626",
      "dfs",
      result.cyclicNodes,
      result.cyclicEdges,
    ); // Darker Red
    return Array.from(result.cyclicNodes) as string[];
  };

  const runCentrality = () => {
    const rankings = graphEngine.current.getDegreeCentralityRankings();
    // Highlight top 3 hubs
    const topHubIds = new Set<string>(
      rankings.slice(0, 3).map((r) => r.nodeId),
    );
    // Collect all edges connected to these top hubs to highlight them
    const relatedEdges = new Set<string>();
    graphEngine.current.getAllEdges().forEach((edge) => {
      if (topHubIds.has(edge.source) || topHubIds.has(edge.target))
        relatedEdges.add(edge.id);
    });

    applyGraphResult(
      topHubIds,
      relatedEdges,
      "#7e22ce",
      "centrality",
      topHubIds,
      relatedEdges,
    ); // Darker Purple
    return Array.from(topHubIds) as string[];
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    initialNodes.forEach((n) => {
      if (n.data.type) cats.add(n.data.type as string);
    });
    return Array.from(cats).sort();
  }, [initialNodes]);

  const applyFilter = (category: string) => {
    setActiveFilter(category);
    setActiveQuery(null); // Clear active query if a filter is applied

    setNodes((nds) =>
      nds.map((node) => {
        const isMatch = node.data.type === category;
        const targetStyle =
          initialNodes.find((init) => init.id === node.id)?.style || node.style;
        const baseBorder = targetStyle.border?.toString() || "";
        const borderMatch = baseBorder.match(/#([0-9a-fA-F]{3,8})/);
        const highlightColor = borderMatch ? borderMatch[0] : "#0ea5e9";

        return {
          ...node,
          hidden: false,
          style: {
            ...targetStyle,
            opacity: isMatch ? 1 : 0.3,
            boxShadow: isMatch ? `0 0 15px ${highlightColor}` : "none",
          },
        };
      }),
    );

    setEdges((eds) =>
      eds.map((edge) => {
        const targetStyle =
          initialEdges.find((init) => init.id === edge.id)?.style || edge.style;
        return {
          ...edge,
          style: {
            ...targetStyle,
            opacity: 0.2, // dim all edges during filtering to focus on node category
          },
          animated: false,
        };
      }),
    );
  };

  const resetGraph = () => {
    setActiveQuery(null);
    setActiveFilter(null);
    // Carefully reset styles without destroying the user's dragged node positions
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: initialNodes.find((init) => init.id === n.id)?.style || n.style,
      })),
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: initialEdges.find((init) => init.id === e.id)?.style || e.style,
        animated:
          initialEdges.find((init) => init.id === e.id)?.animated || false,
      })),
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-120px)] w-full gap-4">
      {/* LEFT PANE: Graph Canvas / Adjacency List */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
        {/* Header */}
        <header className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              LPG Semantic Engine
            </h1>
            <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Labeled Property Graph Explorer
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-200/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("visualizer")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === "visualizer" ? "bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                <Layers className="w-3.5 h-3.5" />
                Process View
              </button>
              <button
                onClick={() => setActiveTab("forcegraph")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === "forcegraph" ? "bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                <Waypoints className="w-3.5 h-3.5" />
                <span>Graph View</span>
                {alarmNodes.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-500 text-white animate-pulse">
                    {alarmNodes.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("neo4j_live")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === "neo4j_live" ? "bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Graph Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>
              <button
                onClick={() => setActiveTab("adjacency")}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-2 ${activeTab === "adjacency" ? "bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"}`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Adjacency List
              </button>
            </div>

            {activeTab === "visualizer" && (
              <button
                onClick={() => setShowMiniMap(!showMiniMap)}
                className={`p-1.5 rounded-lg border transition-colors ${showMiniMap ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"}`}
                title={showMiniMap ? "Hide MiniMap" : "Show MiniMap"}
              >
                <Map className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-grow bg-slate-50 relative">
          {!isDataLoaded ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm gap-3">
              <Database className="w-5 h-5 animate-pulse text-emerald-600" />
              Loading Topology...
            </div>
          ) : activeTab === "visualizer" ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              className="bg-slate-50/50"
              colorMode="light"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={16}
                size={1}
                color="#cbd5e1"
              />
              <Controls className="bg-white border-slate-200 fill-slate-700 shadow-sm" />
              {showMiniMap && (
                <MiniMap
                  className="bg-white border-slate-200 shadow-sm"
                  maskColor="rgba(241, 245, 249, 0.7)"
                  nodeColor={(n) => {
                    const borderStr = (n.style?.border as string) || "";
                    const match = borderStr.match(/#([0-9a-fA-F]{3,8})/);
                    return match
                      ? match[0]
                      : n.style?.background !== "#ffffff"
                        ? (n.style?.background as string)
                        : "#94a3b8";
                  }}
                />
              )}
            </ReactFlow>
          ) : activeTab === "forcegraph" ? (
            <ForceGraphView
              nodes={nodes}
              edges={edges}
              activeQuery={activeQuery || activeFilter}
              alarmNodes={alarmNodes}
            />
          ) : activeTab === "neo4j_live" ? (
            <div className="absolute inset-0 overflow-hidden">
              <Neo4jAuraWorkbench
                initialCypher={neo4jTargetCypher}
                onAlarmStateChange={(newAlarms) => {
                  setAlarmNodes(newAlarms);
                }}
                onSwitchTab={(tab) => {
                  setActiveTab(tab);
                }}
                onHighlightNodes={(highlightIds) => {
                  const nodeSet = new Set(highlightIds);
                  applyGraphResult(
                    nodeSet,
                    new Set(),
                    "#059669",
                    "neo4j_query",
                    nodeSet,
                    new Set()
                  );
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 overflow-y-auto p-6 bg-white text-slate-700 text-sm">
              <div className="max-w-5xl mx-auto flex flex-col gap-6">
                {/* Edge Types Summary Bar */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Edge Types Summary ({edges.length} total directed edges)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {edgeTypeSummary.length} Relationship Types
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {edgeTypeSummary.map(([type, count]) => (
                      <div
                        key={type}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                      >
                        <span className="font-bold text-slate-700 font-mono text-[11px] tracking-tight">
                          {type}
                        </span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-emerald-800 font-bold mb-3 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">
                      Nodes
                    </h4>
                    <table className="w-full text-left border-collapse">
                      <tbody>
                        {nodes.map((n) => {
                          const isExpanded = expandedNodeId === n.id;
                          const attributes = getNodeAttributes(n);
                          return (
                            <React.Fragment key={n.id}>
                              <tr
                                onClick={() => setExpandedNodeId(isExpanded ? null : n.id)}
                                className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                                  isExpanded ? "bg-emerald-50/50" : ""
                                }`}
                              >
                                <td className="py-2 pr-3 text-slate-500 font-mono text-xs whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <ChevronRight
                                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                                        isExpanded ? "rotate-90 text-emerald-600" : ""
                                      }`}
                                    />
                                    <span>{n.id}</span>
                                  </div>
                                </td>
                                <td className="py-2 text-slate-900 font-medium text-xs">
                                  {n.data.label as string}
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={2} className="py-2.5 px-3">
                                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs shadow-2xs">
                                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-100 flex items-center justify-between">
                                      <span>Node Attributes ({attributes.length})</span>
                                      <span className="font-mono text-[9px] text-slate-400">{n.id}</span>
                                    </div>
                                    {attributes.length === 0 ? (
                                      <div className="text-slate-400 italic text-[11px]">No attributes defined</div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                                        {attributes.map((attr) => (
                                          <div
                                            key={attr.key}
                                            className="flex items-baseline justify-between gap-2 py-0.5 border-b border-slate-50 text-[11px]"
                                          >
                                            <span className="text-slate-500 font-medium whitespace-nowrap">
                                              {attr.label}:
                                            </span>
                                            <span className="text-slate-800 font-semibold text-right break-words">
                                              {attr.value}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-emerald-700 font-bold mb-3 uppercase tracking-wider text-xs border-b border-slate-200 pb-2">
                    Directed Edges
                  </h4>
                  <table className="w-full text-left border-collapse">
                    <tbody>
                      {edges.map((e) => (
                        <tr
                          key={e.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="py-2 pr-2 text-emerald-700 font-mono text-xs">
                            {e.source}
                          </td>
                          <td className="py-2 px-2 text-slate-400">→</td>
                          <td className="py-2 px-2 text-center">
                            {e.data && (e.data as any).max_capacity && (
                              <div className="text-[8.5px] text-emerald-500 font-mono leading-none mb-0.5 whitespace-nowrap">
                                {String((e.data as any).max_capacity)} {String((e.data as any).unit || '')}
                              </div>
                            )}
                            {e.data && (e.data as any).latency_ms && (
                              <div className="text-[8.5px] text-emerald-500 font-mono leading-none mb-0.5 whitespace-nowrap">
                                {String((e.data as any).latency_ms)}ms
                              </div>
                            )}
                            <div className="text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                              {e.label as string}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-slate-400">→</td>
                          <td className="py-2 pl-2 text-emerald-600 font-mono text-xs">
                            {e.target}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: AI Control & Sidebar */}
      <div className="w-full lg:w-[420px] flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 h-full">
        {/* Top: Query Form */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 shrink-0">
          <form onSubmit={handleAiQuery} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Semantic Query Engine
              </label>
              {/* Mode Switcher Pill */}
              <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg border border-slate-300">
                <button
                  type="button"
                  onClick={() => setModelTier("fast")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    modelTier === "fast"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Fast: Low-latency topological graph traces & equipment lookups"
                >
                  <span>⚡</span> Fast
                </button>
                <button
                  type="button"
                  onClick={() => setModelTier("deep")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    modelTier === "deep"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Deep Reasoning: Multi-domain failure mode analysis, Common Cause Failures & coupled blast radius"
                >
                  <span>🧠</span> Deep Reasoning
                </button>
              </div>
            </div>

            {/* Mode Subtitle */}
            <div className="text-[10px] text-slate-500 flex items-center justify-between px-0.5 -mt-1">
              <span>
                {modelTier === "fast"
                  ? "⚡ Fast: Sub-second topological traces & equipment lookups"
                  : "🧠 Deep Reasoning: Multi-domain failure mode & blast-radius analysis"}
              </span>
            </div>

            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. 'Find shortest path to product 1'"
              className="bg-white border border-slate-300 text-slate-900 text-sm rounded-lg px-4 py-2.5 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
            />
            {/* Check button above the Neuro symbolic node to use Aura */}
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer select-none bg-emerald-50/70 border border-emerald-200/90 px-3 py-2 rounded-lg hover:bg-emerald-100/60 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={useAura}
                onChange={(e) => setUseAura(e.target.checked)}
                className="rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="flex-1 font-bold text-[11px] text-slate-800">
                Use Enterprise Property Graph (Cloud Engine)
              </span>
              <span
                className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded transition-colors ${
                  useAura
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {useAura ? "ACTIVE" : "OFF"}
              </span>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useNeurosymbolic}
                  onChange={(e) => setUseNeurosymbolic(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                />
                Neurosymbolic Mode (Stage 5)
              </label>
              <button
                type="submit"
                disabled={isAiLoading || !aiPrompt.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-1.5"
              >
                {isAiLoading ? (
                  "Thinking..."
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Execute
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Middle: Scrollable Output Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-white space-y-5">
          {/* Default message if empty */}
          {!generatedCypher &&
            !aiSynthesis &&
            logs.length === 0 &&
            !activeQuery && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-3 px-4">
                <Terminal className="w-8 h-8 text-slate-200" />
                <p className="text-sm">
                  Enter a natural language query above or use a quick action
                  below to interact with the digital twin.
                </p>
              </div>
            )}

          {generatedCypher && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-slate-500 font-semibold text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Database className="w-3 h-3" /> Cypher Query Formulated
                </h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  LPG Ready
                </span>
              </div>
              <code className="block bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-xs mb-2 shadow-inner overflow-x-auto whitespace-nowrap">
                {generatedCypher.cypher}
              </code>
              <div className="flex items-center justify-between py-2 border-y border-slate-200 mb-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Target: Enterprise Cloud Graph
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (generatedCypher?.cypher) {
                      setNeo4jTargetCypher(generatedCypher.cypher);
                      setActiveTab("neo4j_live");
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run on Property Graph
                </button>
              </div>

              {lastAuraResult && (
                <div className="mb-2.5 p-2.5 bg-emerald-50 border border-emerald-200/90 rounded-lg text-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-900 mb-1">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      Executed on Enterprise Graph Engine
                    </span>
                    {lastAuraResult.executionTimeMs && (
                      <span className="font-mono text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                        {lastAuraResult.executionTimeMs}ms
                      </span>
                    )}
                  </div>
                  {lastAuraResult.error ? (
                    <p className="text-[11px] text-amber-700 font-medium">
                      Notice: {lastAuraResult.error}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-800 leading-tight">
                      Returned <strong>{lastAuraResult.recordCount}</strong> record(s) and highlighted <strong>{lastAuraResult.nodeCount}</strong> equipment node(s) on the schematic.
                    </p>
                  )}
                </div>
              )}

              <p className="text-slate-600 text-xs leading-relaxed pt-1">
                {generatedCypher.explanation}
              </p>
            </div>
          )}

          {aiSynthesis && (
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    {modelTier === "deep"
                      ? "Deep Topological & Engineering Analysis"
                      : "Topological Analysis"}
                  </h4>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 border border-emerald-200/60">
                  {modelTier === "deep" ? "Comprehensive" : "Standard"}
                </span>
              </div>
              <div className="text-slate-800 text-xs leading-relaxed space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {aiSynthesis.split("\n\n").map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;

                  // If it starts with markdown header (### or ##)
                  if (trimmed.startsWith("#")) {
                    const headerText = trimmed.replace(/^#+\s*/, "");
                    return (
                      <div key={idx} className="pt-1.5 first:pt-0">
                        <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5 text-emerald-950">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          {headerText}
                        </h5>
                      </div>
                    );
                  }

                  // If it's a bullet point list
                  if (
                    trimmed.includes("\n- ") ||
                    trimmed.includes("\n* ") ||
                    trimmed.startsWith("- ") ||
                    trimmed.startsWith("* ")
                  ) {
                    const lines = trimmed.split("\n");
                    return (
                      <ul key={idx} className="space-y-1 my-1 pl-1">
                        {lines.map((line, lIdx) => {
                          const cleanLine = line.replace(/^[-*]\s*/, "").trim();
                          if (!cleanLine) return null;
                          // Handle bold prefixes in bullets like **Label**: text
                          const parts = cleanLine.split(/\*\*(.*?)\*\*/g);
                          return (
                            <li
                              key={lIdx}
                              className="flex items-start gap-1.5 text-slate-700"
                            >
                              <span className="text-emerald-500 font-bold shrink-0">
                                •
                              </span>
                              <span>
                                {parts.map((p, pIdx) =>
                                  pIdx % 2 === 1 ? (
                                    <strong
                                      key={pIdx}
                                      className="font-semibold text-slate-900"
                                    >
                                      {p}
                                    </strong>
                                  ) : (
                                    p
                                  ),
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  }

                  // Standard paragraph with possible **bold** inline
                  const parts = trimmed.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={idx} className="text-slate-700">
                      {parts.map((p, pIdx) =>
                        pIdx % 2 === 1 ? (
                          <strong
                            key={pIdx}
                            className="font-semibold text-slate-900"
                          >
                            {p}
                          </strong>
                        ) : (
                          p
                        ),
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          )}

          {/* Terminal Trace Output */}
          {logs.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-inner">
              <h4 className="text-slate-400 mb-2 font-semibold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Execution Trace
              </h4>
              <div className="font-mono text-[11px] max-h-48 overflow-y-auto space-y-1.5 pr-2">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className="text-emerald-400 leading-tight opacity-90"
                  >
                    {log}
                  </div>
                ))}
                {isAiLoading && (
                  <div className="text-emerald-500 animate-pulse mt-2">
                    _ computing...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Quick Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Load Sample Query
              </h4>
              <select
                className="w-full bg-white border border-slate-300 text-slate-700 text-xs rounded px-3 py-2 focus:outline-none focus:border-emerald-500 shadow-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    setAiPrompt(e.target.value.replace(/^\[\*+\]\s*/, ""));
                    e.target.value = ""; // reset after selection
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  -- Select a sample query --
                </option>
                {SAMPLE_QUERIES.map((q, idx) => (
                  <option key={idx} value={q}>
                    {idx + 1}. {q.length > 65 ? q.substring(0, 62) + "..." : q}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                Filter by Category
              </h4>
              <select
                className="w-full bg-white border border-slate-300 text-slate-700 text-xs rounded px-3 py-2 focus:outline-none focus:border-emerald-500 shadow-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    applyFilter(e.target.value);
                  }
                }}
                value={activeFilter || ""}
              >
                <option value="" disabled>
                  -- Select a category --
                </option>
                {categories.map((c, idx) => (
                  <option key={idx} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(activeQuery || activeFilter) && (
            <button
              onClick={resetGraph}
              className="mt-4 w-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase px-4 py-2.5 rounded-lg border border-slate-300 transition-colors shadow-sm"
            >
              Reset Graph Styles
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
