import React, { useState, useRef, useEffect } from 'react';
import {
  Power,
  Cpu,
  HardHat,
  ShieldCheck,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code2,
  X,
  Activity,
  Workflow,
  Sparkles,
  Play,
  Layers,
  Wind,
  Droplets,
  Zap,
  LineChart,
  Database,
  Network,
  Boxes,
  BookOpen,
  Waypoints
} from 'lucide-react';
import { LangGraphNode, LangGraphEdge, LangGraphExecutionState } from './types';
import { SessionNodeTrace } from './SessionNodeTrace';

interface LangGraphCanvasProps {
  nodes: LangGraphNode[];
  edges: LangGraphEdge[];
  executionState: LangGraphExecutionState;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onResetPositions: () => void;
  onTriggerTestRun: () => void;
}

export const LangGraphCanvas: React.FC<LangGraphCanvasProps> = ({
  nodes,
  edges,
  executionState,
  onSelectNode,
  selectedNodeId,
  onUpdateNodePosition,
  onResetPositions,
  onTriggerTestRun,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(0.60);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Code inspection drawer
  const [inspectNode, setInspectNode] = useState<LangGraphNode | null>(null);

  // Zoom helpers
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.4));
  const handleResetView = () => {
    handleCenterOrchestrator(0.60);
  };

  const handleCenterOrchestrator = (targetZoom?: number | React.MouseEvent) => {
    if (!nodes.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const effectiveZoom = typeof targetZoom === 'number' ? targetZoom : 0.60;

    // Calculate bounding box of the graph
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + 104));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + 130)); // include labels & badges

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    // Shift slightly upward by 25px to ensure bottom auxiliary nodes sit comfortably above the legend
    const upwardOffset = 25;

    setZoom(effectiveZoom);
    setPan({
      x: rect.width / 2 - graphCenterX * effectiveZoom,
      y: rect.height / 2 - graphCenterY * effectiveZoom - upwardOffset,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenterOrchestrator(0.60);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Node drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, node: LangGraphNode) => {
    e.stopPropagation();
    setDraggingNodeId(node.id);
    onSelectNode(node.id);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  // Canvas pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round((e.clientX - dragOffset.x) / 10) * 10;
      const newY = Math.round((e.clientY - dragOffset.y) / 10) * 10;
      onUpdateNodePosition(draggingNodeId, Math.max(20, Math.min(newX, 1100)), Math.max(20, Math.min(newY, 850)));
    } else if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Industrial node styling and icons
  const getNodeConfig = (type: LangGraphNode['type'], nodeId?: string) => {
    switch (type) {
      case 'start':
        return {
          icon: Power,
          radius: 42,
          diameter: 84,
          accentColor: '#10b981',
          bgGradient: 'from-emerald-950 via-slate-900 to-slate-950',
          borderColor: 'border-emerald-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
          activeRing: 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-emerald-400',
          tagLabel: 'START',
          subLabel: '__start__',
          badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'orchestrator':
        return {
          icon: Cpu,
          radius: 52,
          diameter: 104,
          accentColor: '#f59e0b',
          bgGradient: 'from-amber-950 via-slate-900 to-slate-950',
          borderColor: 'border-amber-400',
          glowShadow: 'shadow-[0_0_35px_rgba(245,158,11,0.45)]',
          activeRing: 'ring-4 ring-amber-400 ring-offset-3 ring-offset-slate-950 scale-110',
          iconColor: 'text-amber-400',
          tagLabel: 'ORCHESTRATOR',
          subLabel: 'CENTRAL CORE',
          badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'operator':
        return {
          icon: HardHat,
          radius: 42,
          diameter: 84,
          accentColor: '#0ea5e9',
          bgGradient: 'from-sky-950 via-slate-900 to-slate-950',
          borderColor: 'border-sky-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(14,165,233,0.35)]',
          activeRing: 'ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-sky-400',
          tagLabel: 'OPERATOR',
          subLabel: 'HUMAN-IN-LOOP',
          badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'end':
        return {
          icon: ShieldCheck,
          radius: 42,
          diameter: 84,
          accentColor: '#f43f5e',
          bgGradient: 'from-rose-950 via-slate-900 to-slate-950',
          borderColor: 'border-rose-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(244,63,94,0.35)]',
          activeRing: 'ring-4 ring-rose-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-rose-400',
          tagLabel: 'END',
          subLabel: '__end__',
          badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'process_agent':
        return {
          icon: Layers,
          radius: 44,
          diameter: 88,
          accentColor: '#a855f7',
          bgGradient: 'from-purple-950 via-slate-900 to-slate-950',
          borderColor: 'border-purple-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
          activeRing: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-purple-400',
          tagLabel: 'PROCESS',
          subLabel: 'WAFER & TOOLS',
          badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'hvac_agent':
        return {
          icon: Wind,
          radius: 44,
          diameter: 88,
          accentColor: '#06b6d4',
          bgGradient: 'from-cyan-950 via-slate-900 to-slate-950',
          borderColor: 'border-cyan-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
          activeRing: 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-cyan-400',
          tagLabel: 'HVAC',
          subLabel: 'CLEANROOM FFU',
          badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'chiller_agent':
        return {
          icon: Droplets,
          radius: 44,
          diameter: 88,
          accentColor: '#3b82f6',
          bgGradient: 'from-blue-950 via-slate-900 to-slate-950',
          borderColor: 'border-blue-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(59,130,246,0.35)]',
          activeRing: 'ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-blue-400',
          tagLabel: 'CHILLER',
          subLabel: 'PLANT & LOOPS',
          badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        };
      case 'electrical_agent':
        return {
          icon: Zap,
          radius: 44,
          diameter: 88,
          accentColor: '#eab308',
          bgGradient: 'from-yellow-950 via-slate-900 to-slate-950',
          borderColor: 'border-yellow-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(234,179,8,0.35)]',
          activeRing: 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-yellow-400',
          tagLabel: 'ELECTRICAL',
          subLabel: 'UPS & MCC POWER',
          badgeStyle: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        };
      case 'drift_agent':
        return {
          icon: Droplets,
          radius: 44,
          diameter: 88,
          accentColor: '#14b8a6',
          bgGradient: 'from-teal-950 via-slate-900 to-slate-950',
          borderColor: 'border-teal-400',
          glowShadow: 'shadow-[0_0_25px_rgba(20,184,166,0.4)]',
          activeRing: 'ring-4 ring-teal-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-teal-400',
          tagLabel: 'DRIFT AGENT',
          subLabel: 'UPW TELEMETRY & RDF',
          badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        };
      case 'deep_agent':
        return {
          icon: Sparkles,
          radius: 50,
          diameter: 100,
          accentColor: '#8b5cf6',
          bgGradient: 'from-violet-950 via-purple-900 to-slate-950',
          borderColor: 'border-violet-400',
          glowShadow: 'shadow-[0_0_35px_rgba(139,92,246,0.5)]',
          activeRing: 'ring-4 ring-violet-400 ring-offset-2 ring-offset-slate-950 animate-pulse',
          iconColor: 'text-violet-300',
          tagLabel: 'DEEP AGENT',
          subLabel: 'HIERARCHICAL REASONING',
          badgeStyle: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
        };
      case 'system_analyst':
        return {
          icon: LineChart,
          radius: 44,
          diameter: 88,
          accentColor: '#10b981',
          bgGradient: 'from-emerald-950 via-slate-900 to-slate-950',
          borderColor: 'border-emerald-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
          activeRing: 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-emerald-400',
          tagLabel: 'ANALYST',
          subLabel: 'CROSS-DOMAIN & SPC',
          badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'tool_node':
        if (nodeId === 'ot_connector_tool') {
          return {
            icon: Activity,
            radius: 38,
            diameter: 76,
            accentColor: '#f59e0b',
            bgGradient: 'from-amber-950 via-slate-900 to-slate-950',
            borderColor: 'border-amber-400 border-dashed border-[2.5px]',
            glowShadow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
            activeRing: 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950',
            iconColor: 'text-amber-400',
            tagLabel: 'OT CONNECTOR',
            subLabel: 'SCADA & PLC BRIDGE',
            badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          };
        }
        if (nodeId === 'neo4j_schema_tool') {
          return {
            icon: Network,
            radius: 38,
            diameter: 76,
            accentColor: '#38bdf8',
            bgGradient: 'from-sky-950 via-slate-900 to-slate-950',
            borderColor: 'border-sky-400 border-dashed border-[2.5px]',
            glowShadow: 'shadow-[0_0_25px_rgba(56,189,248,0.4)]',
            activeRing: 'ring-4 ring-sky-400 ring-offset-2 ring-offset-slate-950',
            iconColor: 'text-sky-400',
            tagLabel: 'SCHEMA TOOL',
            subLabel: 'SCHEMA INTROSPECT',
            badgeStyle: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          };
        }
        if (nodeId === 'knowledge_base_tool') {
          return {
            icon: BookOpen,
            radius: 38,
            diameter: 76,
            accentColor: '#10b981',
            bgGradient: 'from-emerald-950 via-slate-900 to-slate-950',
            borderColor: 'border-emerald-400 border-dashed border-[2.5px]',
            glowShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.4)]',
            activeRing: 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-950',
            iconColor: 'text-emerald-400',
            tagLabel: 'KNOWLEDGE BASE',
            subLabel: 'RDF READ / WRITE',
            badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          };
        }
        if (nodeId === 'rdf_triplestore_tool') {
          return {
            icon: Boxes,
            radius: 38,
            diameter: 76,
            accentColor: '#c084fc',
            bgGradient: 'from-purple-950 via-slate-900 to-slate-950',
            borderColor: 'border-purple-400 border-dashed border-[2.5px]',
            glowShadow: 'shadow-[0_0_25px_rgba(192,132,252,0.4)]',
            activeRing: 'ring-4 ring-purple-400 ring-offset-2 ring-offset-slate-950',
            iconColor: 'text-purple-400',
            tagLabel: 'RDF TRIPLESTORE',
            subLabel: 'W3C SPARQL ENGINE',
            badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          };
        }
        return {
          icon: Waypoints,
          radius: 38,
          diameter: 76,
          accentColor: '#06b6d4',
          bgGradient: 'from-cyan-950 via-slate-900 to-slate-950',
          borderColor: 'border-cyan-400 border-dashed border-[2.5px]',
          glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.4)]',
          activeRing: 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950',
          iconColor: 'text-cyan-400',
          tagLabel: 'CYPHER TOOL',
          subLabel: 'NEO4J RCA ENGINE',
          badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
    }
  };

  // Compute curved SVG path between two circular nodes from perimeter to perimeter
  const calculatePath = (edge: LangGraphEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    if (!sourceNode || !targetNode) return '';

    const sourceConfig = getNodeConfig(sourceNode.type, sourceNode.id);
    const targetConfig = getNodeConfig(targetNode.type, targetNode.id);

    // Self-loop (e.g. System Analyst Cypher Tool & Cyclic Reasoning)
    if (sourceNode.id === targetNode.id) {
      const r = sourceConfig.radius;
      const cx = sourceNode.x + r;
      const cy = sourceNode.y + r;
      const startX = cx + r * 0.72;
      const startY = cy - r * 0.35;
      const endX = cx + r * 0.72;
      const endY = cy + r * 0.45;
      const cp1x = cx + r + 60;
      const cp1y = cy - r * 0.6;
      const cp2x = cx + r + 60;
      const cp2y = cy + r * 0.7;
      return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    }

    // Center coordinates
    const c1x = sourceNode.x + sourceConfig.radius;
    const c1y = sourceNode.y + sourceConfig.radius;
    const c2x = targetNode.x + targetConfig.radius;
    const c2y = targetNode.y + targetConfig.radius;

    const angle = Math.atan2(c2y - c1y, c2x - c1x);

    // Points on the outer rim of each circle
    const startX = c1x + (sourceConfig.radius + 2) * Math.cos(angle);
    const startY = c1y + (sourceConfig.radius + 2) * Math.sin(angle);
    const endX = c2x - (targetConfig.radius + 8) * Math.cos(angle);
    const endY = c2y - (targetConfig.radius + 8) * Math.sin(angle);

    // Slight curvature offset perpendicular to the line for visual elegance
    const dx = endX - startX;
    const dy = endY - startY;

    // Curve direction for graceful industrial conduits matching diagram
    let curvature = 0.08;
    if (edge.id === 'edge-start-orch') curvature = -0.04;
    if (edge.id === 'edge-orch-end') curvature = 0.04;
    if (edge.id === 'edge-orch-op' || edge.id === 'edge-op-orch') curvature = 0.07;
    if (edge.id === 'edge-orch-analyst' || edge.id === 'edge-analyst-orch') curvature = 0.05;
    if (edge.id === 'edge-analyst-end') curvature = -0.06;
    if (edge.id === 'edge-analyst-kb') curvature = 0.06;
    if (edge.id === 'edge-kb-analyst') curvature = -0.06;
    if (edge.id === 'edge-analyst-rdf') curvature = 0.06;
    if (edge.id === 'edge-rdf-analyst') curvature = -0.06;
    if (edge.id === 'edge-analyst-tool') curvature = 0.06;
    if (edge.id === 'edge-tool-analyst') curvature = -0.06;
    if (edge.id === 'edge-analyst-schema') curvature = 0.06;
    if (edge.id === 'edge-schema-analyst') curvature = -0.06;

    const midX = (startX + endX) / 2 - dy * curvature;
    const midY = (startY + endY) / 2 + dx * curvature;

    return `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`;
  };

  // Node code snippet generator for LangGraph
  const getLangGraphCode = (node: LangGraphNode) => {
    switch (node.type) {
      case 'start':
        return `# LangGraph START Entrypoint
from langgraph.graph import StateGraph, START, END

class HiveAgentState(TypedDict):
    messages: list[BaseMessage]
    sender: str
    active_turn: int

workflow = StateGraph(HiveAgentState)
workflow.add_edge(START, "orchestrator")`;
      case 'orchestrator':
        return `# Central Orchestrator Core Node (Supervisor Hub)
# Directive: Operator node is ONLY called when cannot solve issues & needs user input or help
def orchestrator_node(state: HiveAgentState):
    latest_msg = state["messages"][-1]
    
    # 1. Condition: Cannot solve issue autonomously or needs human help/input
    if state.get("cannot_solve_issue") or state.get("needs_user_input") or state.get("needs_help"):
        return {
            "messages": [AIMessage(content="Cannot resolve issue autonomously. Escalating to Operator for input & help...")],
            "sender": "orchestrator",
            "next_node": "operator"  # Called ONLY when stuck, missing parameters, or needing help
        }
    
    # 2. Condition: Plant inquiry -> delegate to System Analyst
    if state.get("is_plant_query"):
        return {
            "messages": [AIMessage(content="Consulting System Analyst on Neo4j LPG topology and alarms...")],
            "sender": "orchestrator",
            "next_node": "system_analyst"
        }
    
    # 3. Solved autonomously -> finish directly to END without calling Operator
    return {
        "messages": [AIMessage(content="Issue resolved autonomously.")],
        "sender": "orchestrator",
        "next_node": END  # Operator node is NOT called
    }

workflow.add_node("orchestrator", orchestrator_node)
workflow.add_conditional_edges(
    "orchestrator",
    lambda state: "operator" if (state.get("cannot_solve_issue") or state.get("needs_help")) else ("system_analyst" if state.get("is_plant_query") else END),
    {"operator": "operator", "system_analyst": "system_analyst", END: END}
)
workflow.add_edge("system_analyst", "orchestrator")`;
      case 'operator':
        return `# Human-in-the-Loop Operator Node
# Activated ONLY when Orchestrator cannot solve an issue and explicitly requires user input/help
def operator_node(state: HiveAgentState):
    return {
        "sender": "operator",
        "status": "awaiting_user_input_or_help"
    }

workflow.add_node("operator", operator_node)
workflow.add_edge("operator", "orchestrator")`;
      case 'end':
        return `# LangGraph END Terminal Node
# Turn finalized; checkpoints state and awaits next operator message
workflow.add_edge("orchestrator", END)`;
      case 'process_agent':
        return `# Process Specialist Spoke Agent (Wafer Fab & Tools)
def process_agent_node(state: HiveAgentState):
    # System prompt will be added here
    return {
        "messages": [AIMessage(content="Process Agent: Validating tool interlocks...")],
        "sender": "process_agent"
    }

workflow.add_node("process_agent", process_agent_node)
workflow.add_edge("orchestrator", "process_agent")
workflow.add_edge("process_agent", "orchestrator")`;
      case 'hvac_agent':
        return `# HVAC Specialist Spoke Agent (Cleanroom Air & FFU)
def hvac_agent_node(state: HiveAgentState):
    # System prompt will be added here
    return {
        "messages": [AIMessage(content="HVAC Agent: Monitoring RH and pressure cascade...")],
        "sender": "hvac_agent"
    }

workflow.add_node("hvac_agent", hvac_agent_node)
workflow.add_edge("orchestrator", "hvac_agent")
workflow.add_edge("hvac_agent", "orchestrator")`;
      case 'chiller_agent':
        return `# Chiller Specialist Spoke Agent (Cooling Plant & Loops)
def chiller_agent_node(state: HiveAgentState):
    # System prompt will be added here
    return {
        "messages": [AIMessage(content="Chiller Agent: Verifying N+1 redundancy and kW/RT...")],
        "sender": "chiller_agent"
    }

workflow.add_node("chiller_agent", chiller_agent_node)
workflow.add_edge("orchestrator", "chiller_agent")
workflow.add_edge("chiller_agent", "orchestrator")`;
      case 'electrical_agent':
        return `# Electrical Specialist Spoke Agent (Substations & Power)
def electrical_agent_node(state: HiveAgentState):
    # System prompt will be added here
    return {
        "messages": [AIMessage(content="Electrical Agent: Monitoring MCC feeder loads...")],
        "sender": "electrical_agent"
    }

workflow.add_node("electrical_agent", electrical_agent_node)
workflow.add_edge("orchestrator", "electrical_agent")
workflow.add_edge("electrical_agent", "orchestrator")`;
      case 'system_analyst':
        return `# System Analyst Specialist Spoke Node with Cypher Tool Loop
# Manages Neo4j Labeled Property Graph (LPG) for equipment topology & alarms.
# CRITICAL: Neo4j contains structural relationships & alarms, NOT high-speed sensor streams!

@tool
def execute_cypher_query(cypher: str) -> dict:
    """Executes a Cypher query against Neo4j Aura (LPG Topology & ISA-18.2 Alarms)."""
    # Invokes POST /api/neo4j/query
    response = requests.post("http://localhost:3000/api/neo4j/query", json={"cypher": cypher})
    return response.json()

def system_analyst_node(state: HiveAgentState):
    latest_msg = state["messages"][-1].content
    retries = state.get("cypher_retries", 0)

    # 1. Decide if Neo4j graph query is needed
    if "check" in latest_msg.lower() or "alarm" in latest_msg.lower() or "downstream" in latest_msg.lower():
        # Formulate Cypher against Equipment and Alarm nodes
        cypher = "MATCH (e:Equipment {id: 'CH-01'})-[:FEEDS*1..2]->(target) RETURN e, target"
        result = execute_cypher_query(cypher)
        
        # Self-correction check (e.g. syntax error or empty equipment result)
        if not result.get("success") and retries < 2:
            return {
                "requires_more_cypher": True,
                "cypher_retries": retries + 1,
                "error_feedback": result.get("error")
            }

    # 2. Synthesize topology findings and alarm status
    return {
        "messages": [AIMessage(content="System Analyst: Topology & alarms verified via Neo4j Aura.")],
        "sender": "system_analyst",
        "requires_more_cypher": False
    }

def route_analyst_step(state: HiveAgentState):
    # Native toolsCondition:
    # If tool_calls exist in the last message -> execute tools
    if state.get("messages") and hasattr(state["messages"][-1], "tool_calls") and state["messages"][-1].tool_calls:
        return "tools"
    # Otherwise finished -> direct transition to END node
    return END

workflow.add_node("system_analyst", system_analyst_node)
workflow.add_conditional_edges("system_analyst", tools_condition)
workflow.add_edge("tools", "system_analyst")`;
      case 'tool_node':
        return `# LangGraph ToolNode: Neo4j Aura 2-Phase RCA Engine
# Bound to System Analyst for active alarm correlation and topological upstream traversal

from langgraph.prebuilt import ToolNode

@tool
def neo4j_2phase_rca_tool(asset_tag: str) -> dict:
    """Executes 2-phase Cypher graph traversal on Neo4j Aura:
    Phase 1: MATCH (a:Alarm) OPTIONAL MATCH (a)-[r:TRIGGERED_ON|HAS_ALARM]-(e:Equipment)
    Phase 2: MATCH path = (root:Equipment)-[:POWERS|FEEDS|COOLS|SUPPLIES|DISTRIBUTES_TO*1..6]->(victim:Equipment)
    """
    return query_neo4j_aura(asset_tag)

# Create ToolNode and wire into LangGraph State Machine
tool_node = ToolNode([neo4j_2phase_rca_tool])
workflow.add_node("tool_node", tool_node)
workflow.add_edge("system_analyst", "tool_node")
workflow.add_edge("tool_node", "system_analyst")`;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden select-none shadow-2xl">
      {/* Top Canvas Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Multi-Agent State Topology
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Industrial Circular Nodes
              </span>
              {executionState.isRunning && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40 animate-pulse">
                  <Activity className="w-3 h-3 animate-spin" />
                  Executing...
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Round Industrial Pods with Central Hub Topology • Double-click node to inspect
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onTriggerTestRun}
            disabled={executionState.isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Simulate Turn"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Simulate Turn</span>
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={handleZoomIn}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleCenterOrchestrator}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Center Central Orchestrator"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Reset Pan & Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sequential Session Node Trace Bar (Top of Canvas) */}
      <SessionNodeTrace
        traceSteps={executionState.nodeTrace || []}
        isRunning={executionState.isRunning}
        activeNodeId={executionState.activeNodeId}
      />

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] bg-slate-950"
      >
        {/* Canvas World Transform */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning || draggingNodeId ? 'none' : 'transform 0.15s ease-out',
          }}
          className="absolute inset-0 w-[1200px] h-[950px] pointer-events-none"
        >
          {/* SVG Connection Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <marker
                id="arrow-industrial"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
              </marker>

              <marker
                id="arrow-industrial-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
              </marker>

              {/* Grid pattern / Glow filters */}
              <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Graph Edges */}
            {edges.map(edge => {
              const pathData = calculatePath(edge);
              const isActive = edge.isActive || executionState.activeEdgeId === edge.id;

              return (
                <g key={edge.id}>
                  {/* Subtle Background glow for active edge */}
                  {isActive && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      filter="url(#glow-amber)"
                    />
                  )}

                  {/* Main Edge Path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isActive ? '#f59e0b' : '#475569'}
                    strokeWidth={isActive ? '3' : '2'}
                    strokeDasharray={isActive ? '6 4' : 'none'}
                    markerEnd={isActive ? 'url(#arrow-industrial-active)' : 'url(#arrow-industrial)'}
                    className={isActive ? 'animate-pulse' : ''}
                    style={{
                      transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
                    }}
                  />

                  {/* Cypher Tool Loop Label Badge for System Analyst self-loop */}
                  {edge.id === 'edge-analyst-self' && (
                    <g transform={`translate(${((nodes.find(n => n.id === 'system_analyst')?.x || 450) + 145)}, ${((nodes.find(n => n.id === 'system_analyst')?.y || 620) + 52)})`}>
                      <rect
                        x="-46"
                        y="-9"
                        width="92"
                        height="18"
                        rx="9"
                        fill={isActive ? '#78350f' : '#0f172a'}
                        stroke={isActive ? '#f59e0b' : '#334155'}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="600"
                        fill={isActive ? '#fef3c7' : '#94a3b8'}
                        fontFamily="monospace"
                      >
                        cypher_loop()
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Round Industrial Nodes */}
          {nodes.map(node => {
            const config = getNodeConfig(node.type, node.id);
            const Icon = config.icon;
            const isSelected = selectedNodeId === node.id;
            const isActive = executionState.activeNodeId === node.id || node.status === 'active';
            const isCentral = node.isCentral || node.type === 'orchestrator';

            return (
              <div
                key={node.id}
                onMouseDown={e => handleNodeMouseDown(e, node)}
                onClick={e => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  onSelectNode(node.id);
                  setInspectNode(node);
                }}
                title="Double-click to inspect node details & code"
                style={{
                  transform: `translate(${node.x}px, ${node.y}px)`,
                }}
                className="absolute pointer-events-auto flex flex-col items-center cursor-grab active:cursor-grabbing group z-10"
              >
                {/* Round Industrial Pod */}
                <div
                  style={{
                    width: `${config.diameter}px`,
                    height: `${config.diameter}px`,
                  }}
                  className={`relative rounded-full border-2 bg-gradient-to-br ${config.bgGradient} ${config.borderColor} flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? `${config.activeRing} ${config.glowShadow}`
                      : isSelected
                      ? 'ring-3 ring-amber-400/60 shadow-lg'
                      : isCentral
                      ? 'shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-105 hover:border-amber-300'
                      : 'hover:scale-105 shadow-md'
                  }`}
                >
                  {/* Central Core Outer Reactor Ring */}
                  {isCentral && (
                    <div className="absolute -inset-2 rounded-full border border-amber-500/30 border-dashed animate-[spin_20s_linear_infinite] pointer-events-none" />
                  )}

                  {/* Tool Node Dotted Outer Ring */}
                  {node.type === 'tool_node' && (
                    <div className="absolute -inset-2 rounded-full border-2 border-cyan-400/80 border-dotted animate-[spin_30s_linear_infinite] pointer-events-none" />
                  )}

                  {/* Inner metallic rim */}
                  <div className="absolute inset-1.5 rounded-full border border-slate-700/80 bg-slate-900/60 flex items-center justify-center overflow-hidden">
                    {/* Radial industrial grid lines */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)] pointer-events-none" />

                    {/* Industrial Center Icon */}
                    <Icon
                      className={`${isCentral ? 'w-10 h-10' : 'w-7 h-7'} ${config.iconColor} drop-shadow-md transition-transform group-hover:scale-110`}
                    />

                    {/* LED Status Beacon */}
                    <div
                      style={{ backgroundColor: config.accentColor }}
                      className={`absolute top-2 right-2.5 w-2 h-2 rounded-full border border-black/80 shadow-xs ${
                        isActive ? 'animate-ping' : ''
                      }`}
                    />
                  </div>

                  {/* Active Pulse Flare */}
                  {isActive && (
                    <div
                      style={{ borderColor: config.accentColor }}
                      className="absolute -inset-2 rounded-full border-2 border-dashed animate-spin pointer-events-none opacity-80"
                    />
                  )}
                </div>

                {/* Clean Industrial Labels Underneath (No heavy words inside!) */}
                <div className="mt-2.5 flex flex-col items-center text-center select-none pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase drop-shadow-sm">
                      {config.tagLabel}
                    </span>
                    {isCentral && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`mt-0.5 px-2 py-0.5 text-[9px] font-mono font-bold rounded-full border tracking-wider uppercase ${config.badgeStyle}`}
                  >
                    {config.subLabel}
                  </span>
                </div>

                {/* Inspect button on hover */}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setInspectNode(node);
                  }}
                  className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-amber-400 text-[10px] font-mono flex items-center gap-1 bg-slate-900/80 px-2 rounded-full border border-slate-700 pointer-events-auto cursor-pointer"
                  title="View State Inspector"
                >
                  <Code2 className="w-3 h-3" />
                  <span>Inspect</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Floating Industrial Legend in bottom left */}
        <div className="absolute bottom-4 left-4 p-3 bg-slate-950/90 border border-slate-800 backdrop-blur-md rounded-xl text-xs space-y-2 shadow-lg max-w-sm pointer-events-auto">
          <div className="flex items-center justify-between font-bold text-slate-200 text-[11px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Active Multi-Agent Swarm
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
              Live Topology
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 font-mono">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-amber-400 shrink-0" /> Hub
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <LineChart className="w-3 h-3 text-emerald-400 shrink-0" /> Analyst
            </span>
            <span className="flex items-center gap-1 text-cyan-300">
              <Database className="w-3 h-3 text-cyan-400 shrink-0" /> Cypher Tool
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <Network className="w-3 h-3 text-sky-400 shrink-0" /> Schema Tool
            </span>
            <span className="flex items-center gap-1 text-purple-300">
              <Boxes className="w-3 h-3 text-purple-400 shrink-0" /> RDF Tool
            </span>
            <span className="flex items-center gap-1 text-sky-300">
              <HardHat className="w-3 h-3 text-sky-400 shrink-0" /> Operator
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <Power className="w-3 h-3 text-emerald-400 shrink-0" /> Start
            </span>
            <span className="flex items-center gap-1 text-rose-300">
              <ShieldCheck className="w-3 h-3 text-rose-400 shrink-0" /> End
            </span>
          </div>
        </div>
      </div>

      {/* LangGraph Node State Inspector Modal / Drawer */}
      {inspectNode && (
        <div className="absolute inset-y-0 right-0 w-full sm:w-96 bg-slate-900 border-l border-slate-800 z-30 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Agent Node Inspector
              </h3>
            </div>
            <button
              onClick={() => setInspectNode(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Node Identity
              </span>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{inspectNode.label}</div>
                  <div className="text-slate-500 font-mono text-[11px]">ID: {inspectNode.id}</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                  {inspectNode.type}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Role & Industrial Function
              </span>
              <p className="text-slate-300 leading-relaxed p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                {inspectNode.description}
              </p>
            </div>

            {inspectNode.systemPrompt && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    System Prompt Status
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Ready For Prompts
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {inspectNode.systemPrompt}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                State Channels & Schema
              </span>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="text-emerald-400 font-semibold">Inputs:</div>
                <div className="text-slate-300 pl-2">
                  {inspectNode.stateSchema.inputs.join(', ') || 'None'}
                </div>
                <div className="text-amber-400 font-semibold pt-1">Outputs / Channel Updates:</div>
                <div className="text-slate-300 pl-2">
                  {inspectNode.stateSchema.outputs.join(', ') || 'None'}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                StateGraph Specification
              </span>
              <div className="p-3 rounded-lg bg-black/80 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                <pre>{getLangGraphCode(inspectNode)}</pre>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-end">
            <button
              onClick={() => setInspectNode(null)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
