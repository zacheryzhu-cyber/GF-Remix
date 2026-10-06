import React, { useState, useRef, useEffect } from "react";
import { useFacility } from "../context/FacilityContext";
import { WorkflowNode, WorkflowNodeType, FacilityWorkflow } from "../types";
import { AiWorkflowComposer } from "./AiWorkflowComposer";
import { Wand2, ChevronDown,
  Play,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  Sparkles,
  Layers,
  Activity,
  ShieldCheck,
  Wrench,
  Bell,
  AlertCircle,
  FileJson,
  Move,
  Link2,
  X,
  Sliders,
  CheckCircle2,
  Info,
  LayoutGrid,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Mail,
  MessageCircle,
  Users,
  PenTool,
  Timer,
  UserCheck,
  Database,
  BrainCircuit,
} from "lucide-react";

const NODE_SIZE = 80; // 80px x 80px square node

export const VisualWorkflowCanvas: React.FC = () => {
  const {
    workflows,
    activeWorkflowId,
    setActiveWorkflowId,
    updateWorkflow,
    addWorkflowNode,
    updateWorkflowNode,
    removeWorkflowNode,
    addWorkflowEdge,
    removeWorkflowEdge,
    createNewWorkflow,
    deleteWorkflow,
    toggleWorkflowToolStatus,
    executeWorkflow,
    openAiAssistant,
    showToast,
  } = useFacility();

  const currentWorkflow =
    workflows.find((w) => w.id === activeWorkflowId) || workflows[0];

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isAiComposerOpen, setIsAiComposerOpen] = useState(false);
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(
    null,
  );
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // Keydown listener for cancelling connection on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (connectSourceNodeId) {
          setConnectSourceNodeId(null);
          showToast("Connection mode cancelled.");
        } else if (selectedNodeId) {
          setSelectedNodeId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectSourceNodeId, selectedNodeId, showToast]);

  // Dragging mechanics
  const handleMouseDownNode = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDraggingNodeId(node.id);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      setDragOffset({
        x: e.clientX - rect.left + scrollLeft - node.x,
        y: e.clientY - rect.top + scrollTop - node.y,
      });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      setMouseCanvasPos({
        x: Math.round(e.clientX - rect.left + scrollLeft),
        y: Math.round(e.clientY - rect.top + scrollTop),
      });
    }

    if (!draggingNodeId || !canvasRef.current || !currentWorkflow) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;
    
    const newX = Math.max(
      10,
      Math.min(
        2400 - NODE_SIZE - 10,
        e.clientX - rect.left + scrollLeft - dragOffset.x,
      ),
    );
    const newY = Math.max(
      10,
      Math.min(
        1600 - NODE_SIZE - 10,
        e.clientY - rect.top + scrollTop - dragOffset.y,
      ),
    );

    updateWorkflowNode(currentWorkflow.id, draggingNodeId, {
      x: Math.round(newX),
      y: Math.round(newY),
    });
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
  };

  // Connect edges between nodes
  const handleNodeClickForConnect = (nodeId: string) => {
    if (!connectSourceNodeId) {
      setConnectSourceNodeId(nodeId);
      showToast("Exit point selected. Click a target node's Left Entry point to connect.");
    } else if (connectSourceNodeId === nodeId) {
      setConnectSourceNodeId(null);
      showToast("Connection mode cancelled.");
    } else {
      if (!currentWorkflow) return;
      const existing = currentWorkflow.edges.find(
        (e) => e.source === connectSourceNodeId && e.target === nodeId,
      );
      if (existing) {
        showToast("An edge already connects these two nodes.");
        setConnectSourceNodeId(null);
        return;
      }
      addWorkflowEdge(currentWorkflow.id, {
        id: `edge-${connectSourceNodeId}-${nodeId}-${Date.now().toString(36)}`,
        source: connectSourceNodeId,
        target: nodeId,
        label: "Transition",
      });
      showToast("Angular edge connection created.");
      setConnectSourceNodeId(null);
    }
  };

  // Auto-arrange all nodes neatly on canvas with clear angular spacing
  const handleAutoArrange = () => {
    if (!currentWorkflow || currentWorkflow.nodes.length === 0) return;
    const canvasWidth = canvasRef.current ? canvasRef.current.clientWidth : 650;
    const cols = Math.max(2, Math.min(4, Math.floor((canvasWidth - 60) / 160)));
    const startX = 30;
    const startY = 80;
    const gapX = 160;
    const gapY = 120;

    currentWorkflow.nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      updateWorkflowNode(currentWorkflow.id, node.id, {
        x: startX + col * gapX,
        y: startY + row * gapY,
      });
    });
    showToast("Workflow nodes auto-arranged.");
  };

  // Add a new node to canvas
  const handleAddNode = (type: WorkflowNodeType) => {
    if (!currentWorkflow) return;
    const count = currentWorkflow.nodes.length + 1;
    const col = (count - 1) % 4;
    const row = Math.floor((count - 1) / 4);
    const newNode: WorkflowNode = {
      id: `node-${Date.now().toString(36)}`,
      type,
      title: `${(type || 'action').toUpperCase()} Step ${count}`,
      description: `Configured ${type} action in ${currentWorkflow.name}`,
      config: {
        system: "Ultra Pure Water (UPW)",
        threshold: "Normal Operating Limit",
      },
      x: 30 + col * 130,
      y: 70 + row * 120,
    };
    addWorkflowNode(currentWorkflow.id, newNode);
    setSelectedNodeId(newNode.id);
  };

  const getNodeIcon = (type: WorkflowNodeType, sizeClass = "w-4 h-4") => {
    switch (type) {
      case "trigger":
        return <Activity className={`${sizeClass} text-amber-500`} />;
      case "condition":
        return <AlertCircle className={`${sizeClass} text-sky-500`} />;
      case "action":
        return <Wrench className={`${sizeClass} text-emerald-600`} />;
      case "cmms":
        return <ShieldCheck className={`${sizeClass} text-indigo-600`} />;
      case "notification":
        return <Bell className={`${sizeClass} text-purple-500`} />;
      case "compose_email":
        return <PenTool className={`${sizeClass} text-fuchsia-500`} />;
      case "delay":
        return <Timer className={`${sizeClass} text-cyan-500`} />;
      case "human_approval":
        return <UserCheck className={`${sizeClass} text-pink-500`} />;
      case "data_fetch":
        return <Database className={`${sizeClass} text-blue-500`} />;
      default:
        return <Layers className={`${sizeClass} text-slate-500`} />;
    }
  };

  const getNodeColorClass = (
    type: WorkflowNodeType,
    isSelected: boolean,
    isSource: boolean,
  ) => {
    if (isSource)
      return "ring-3 ring-emerald-400 border-emerald-500 bg-emerald-50 shadow-lg scale-105";
    if (isSelected)
      return "ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-900 border-emerald-400 bg-white shadow-xl scale-105";

    switch (type) {
      case "trigger":
        return "border-amber-400/80 bg-gradient-to-b from-amber-50/90 to-amber-100/70 text-amber-950 hover:border-amber-500";
      case "condition":
        return "border-sky-400/80 bg-gradient-to-b from-sky-50/90 to-sky-100/70 text-sky-950 hover:border-sky-500";
      case "action":
        return "border-emerald-400/80 bg-gradient-to-b from-emerald-50/90 to-emerald-100/70 text-emerald-950 hover:border-emerald-500";
      case "cmms":
        return "border-indigo-400/80 bg-gradient-to-b from-indigo-50/90 to-indigo-100/70 text-indigo-950 hover:border-indigo-500";
      case "notification":
        return "border-purple-400/80 bg-gradient-to-b from-purple-50/90 to-purple-100/70 text-purple-950 hover:border-purple-500";
      case "compose_email":
        return "border-fuchsia-400/80 bg-gradient-to-b from-fuchsia-50/90 to-fuchsia-100/70 text-fuchsia-950 hover:border-fuchsia-500";
      case "delay":
        return "border-cyan-400/80 bg-gradient-to-b from-cyan-50/90 to-cyan-100/70 text-cyan-950 hover:border-cyan-500";
      case "human_approval":
        return "border-pink-400/80 bg-gradient-to-b from-pink-50/90 to-pink-100/70 text-pink-950 hover:border-pink-500";
      case "data_fetch":
        return "border-blue-400/80 bg-gradient-to-b from-blue-50/90 to-blue-100/70 text-blue-950 hover:border-blue-500";
      default:
        return "border-slate-300 bg-white text-slate-900 hover:border-slate-400";
    }
  };

  // Angular Orthogonal Edge Router (Right Exit Point -> Left Entry Point)
  const getAngularPath = (
    srcX: number,
    srcY: number,
    tgtX: number,
    tgtY: number,
  ): { path: string; labelX: number; labelY: number } => {
    // Case 1: Standard forward left-to-right flow with sufficient clearance (>= 24px)
    if (tgtX >= srcX + 24) {
      const midX = Math.round((srcX + tgtX) / 2);
      // Same row: purely horizontal line
      if (Math.abs(srcY - tgtY) < 3) {
        return {
          path: `M ${srcX} ${srcY} L ${tgtX} ${tgtY}`,
          labelX: midX,
          labelY: srcY - 8,
        };
      }
      // Stepped orthogonal line: Horizontal -> Vertical -> Horizontal
      return {
        path: `M ${srcX} ${srcY} L ${midX} ${srcY} L ${midX} ${tgtY} L ${tgtX} ${tgtY}`,
        labelX: midX,
        labelY: Math.round((srcY + tgtY) / 2) - 8,
      };
    }

    // Case 2: Target is behind, vertically aligned, or tightly placed (< 24px)
    // Step 24px right from exit, step vertically, traverse left, step to target Y, enter into left entry point
    const outX = srcX + 24;
    const inX = tgtX - 24;
    let midY: number;

    if (Math.abs(srcY - tgtY) < 16) {
      // Same horizontal level - route above the nodes to bypass them neatly
      midY = srcY - (NODE_SIZE / 2 + 24);
    } else {
      // Different vertical levels - route halfway between them
      midY = Math.round((srcY + tgtY) / 2);
    }

    return {
      path: `M ${srcX} ${srcY} L ${outX} ${srcY} L ${outX} ${midY} L ${inX} ${midY} L ${inX} ${tgtY} L ${tgtX} ${tgtY}`,
      labelX: Math.round((outX + inX) / 2),
      labelY: midY - 8,
    };
  };

  const selectedNode = currentWorkflow?.nodes.find(
    (n) => n.id === selectedNodeId,
  );

  // Export JSON
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(currentWorkflow, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(currentWorkflow, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentWorkflow.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!currentWorkflow) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] w-full gap-3 text-slate-800">
      {/* Top Header & Preset Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Visual Workflow Engine
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Ops Copilot Tool Builder
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Compact square nodes on canvas. Hover for quick telemetry
              tooltips; click any node to view and configure full parameters in
              the right panel.
            </p>
          </div>
        </div>

        {/* Workflow Switcher & Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-500 px-2">
              Workflows:
            </span>
            <select
              value={currentWorkflow.id}
              onChange={(e) => {
                setActiveWorkflowId(e.target.value);
                setSelectedNodeId(null);
                setConnectSourceNodeId(null);
                setHoveredNodeId(null);
              }}
              className="bg-white text-xs font-semibold text-slate-800 rounded px-2.5 py-1 border border-slate-200 focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              {workflows.map((wf) => (
                <option key={wf.id} value={wf.id}>
                  {wf.name} ({wf.nodes.length} nodes)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAiComposerOpen(true)}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Compose with AI"
          >
            <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI Composer</span>
          </button>
          
          <button
            onClick={() => {
              createNewWorkflow("New Custom Workflow", "Cleanroom");
            }}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Create blank workflow"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>New</span>
          </button>
          
          <button
            onClick={() => {
              deleteWorkflow(currentWorkflow.id);
            }}
            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="Delete current workflow"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Delete</span>
          </button>

          {/* Copilot Tool Integration Toggle */}
          <button
            onClick={() => toggleWorkflowToolStatus(currentWorkflow.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
              currentWorkflow.isActiveTool
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
            title="Toggle tool availability to Ops Copilot"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${currentWorkflow.isActiveTool ? "text-emerald-600" : "text-slate-400"}`}
            />
            <span>
              {currentWorkflow.isActiveTool
                ? "Active Copilot Tool"
                : "Tool Disabled"}
            </span>
          </button>

          {/* Run / Simulate Execution */}
          <button
            onClick={() => executeWorkflow(currentWorkflow.id)}
            disabled={currentWorkflow.status === "Executing"}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <Play
              className={`w-3.5 h-3.5 ${currentWorkflow.status === "Executing" ? "animate-spin" : ""}`}
            />
            <span>
              {currentWorkflow.status === "Executing"
                ? "Executing..."
                : "Run Simulation"}
            </span>
          </button>

          {/* View / Export JSON */}
          <button
            onClick={() => setShowJsonModal(true)}
            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            title="View Workflow JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON</span>
          </button>

          {/* Ask Copilot to execute */}
          <button
            onClick={() =>
              openAiAssistant(
                `Execute workflow "${currentWorkflow.name}" step-by-step with full verbosity.`,
              )
            }
            className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
            title="Dispatch this workflow to Ops Copilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dispatch to Copilot</span>
          </button>
        </div>
      </div>

      {/* Main Workbench Body: Node Palette, Interactive Canvas, and Right Inspector */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        {/* Left: Node Palette & Workflow Profile */}
        <div className="w-full lg:w-60 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3 shrink-0 overflow-y-auto">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Workflow Profile
            </span>
            <input
              type="text"
              value={currentWorkflow.name}
              onChange={(e) =>
                updateWorkflow(currentWorkflow.id, { name: e.target.value })
              }
              className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded px-2 py-1 mb-1 focus:border-emerald-500 focus:outline-none"
            />
            <textarea
              value={currentWorkflow.description}
              onChange={(e) =>
                updateWorkflow(currentWorkflow.id, {
                  description: e.target.value,
                })
              }
              rows={2}
              className="w-full text-[11px] text-slate-600 border border-slate-200 rounded px-2 py-1 focus:border-emerald-500 focus:outline-none resize-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Add Node to Canvas
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => handleAddNode("trigger")}
                className="w-full text-left px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-center gap-2 transition"
              >
                <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Trigger Node
                  </span>
                  <span className="text-[10px] text-amber-700/80 font-normal">
                    Sensor or SCADA event
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("condition")}
                className="w-full text-left px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-semibold text-sky-900 flex items-center gap-2 transition"
              >
                <AlertCircle className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Condition Node
                  </span>
                  <span className="text-[10px] text-sky-700/80 font-normal">
                    Operational criteria
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("action")}
                className="w-full text-left px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900 flex items-center gap-2 transition"
              >
                <Wrench className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Action Node
                  </span>
                  <span className="text-[10px] text-emerald-700/80 font-normal">
                    Valves, pumps, interlocks
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("cmms")}
                className="w-full text-left px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-900 flex items-center gap-2 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    CMMS &amp; LOTO Node
                  </span>
                  <span className="text-[10px] text-indigo-700/80 font-normal">
                    Work orders &amp; lockouts
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("notification")}
                className="w-full text-left px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 flex items-center gap-2 transition"
              >
                <Bell className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Notification Node
                  </span>
                  <span className="text-[10px] text-purple-700/80 font-normal">
                    Alert shift lead or ERT
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleAddNode("compose_email")}
                className="w-full text-left px-2.5 py-1.5 bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 rounded-lg text-xs font-semibold text-fuchsia-900 flex items-center gap-2 transition"
              >
                <PenTool className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Compose Email
                  </span>
                  <span className="text-[10px] text-fuchsia-700/80 font-normal">
                    AI generated response
                  </span>
                </div>
              </button>
              
              <button
                onClick={() => handleAddNode("delay")}
                className="w-full text-left px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg text-xs font-semibold text-cyan-900 flex items-center gap-2 transition"
              >
                <Timer className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Delay / Timer
                  </span>
                  <span className="text-[10px] text-cyan-700/80 font-normal">
                    Wait for stabilization
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("human_approval")}
                className="w-full text-left px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg text-xs font-semibold text-pink-900 flex items-center gap-2 transition"
              >
                <UserCheck className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Human Approval
                  </span>
                  <span className="text-[10px] text-pink-700/80 font-normal">
                    Request digital signoff
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleAddNode("data_fetch")}
                className="w-full text-left px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 flex items-center gap-2 transition"
              >
                <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div>
                  <span className="block text-xs leading-none font-bold">
                    Data Fetch
                  </span>
                  <span className="text-[10px] text-blue-700/80 font-normal">
                    Query live telemetry
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Node types palette */}
        </div>

        {/* Center: Interactive Canvas with SVG Connection Arrows & Small Square Nodes */}
        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden select-none min-h-[420px] shadow-inner">
          {/* Canvas Status Bar */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 font-mono shadow-md pointer-events-auto">
              <Move className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Interactive Canvas ({currentWorkflow.nodes.length} Nodes,{" "}
                {currentWorkflow.edges.length} Edges)
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-700 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Angular Routing
              </span>
              {connectSourceNodeId && (
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] animate-pulse">
                  Click target node's Left Entry port
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAutoArrange();
              }}
              className="pointer-events-auto px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-md transition"
              title="Auto arrange nodes to fit perfectly on canvas"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Arrange</span>
            </button>
          </div>

          <div
            ref={canvasRef}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onClick={() => {
              setSelectedNodeId(null);
              setConnectSourceNodeId(null);
            }}
            className="w-full h-full overflow-auto relative custom-scrollbar"
          >
            {/* Scrollable Virtual Canvas Area */}
            <div
              className="relative min-w-[2400px] min-h-[1600px]"
              style={{
                backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            >
              {/* SVG Overlay for Connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="9"
                markerHeight="7"
                refX="8"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0.5, 8 3.5, 0 6.5" fill="#10b981" />
              </marker>
            </defs>

            {/* Static Angular Edges */}
            {currentWorkflow.edges.map((edge) => {
              const src = currentWorkflow.nodes.find(
                (n) => n.id === edge.source,
              );
              const tgt = currentWorkflow.nodes.find(
                (n) => n.id === edge.target,
              );
              if (!src || !tgt) return null;

              // Exit point on RIGHT of source, Entry point on LEFT of target
              const srcX = src.x + NODE_SIZE;
              const srcY = src.y + NODE_SIZE / 2;
              const tgtX = tgt.x;
              const tgtY = tgt.y + NODE_SIZE / 2;

              const { path, labelX, labelY } = getAngularPath(
                srcX,
                srcY,
                tgtX,
                tgtY,
              );

              return (
                <g key={edge.id} className="group/edge">
                  {/* High-contrast backdrop line */}
                  <path
                    d={path}
                    fill="none"
                    stroke="#020617"
                    strokeWidth="5"
                    strokeLinejoin="round"
                    opacity="0.8"
                  />
                  {/* Clean angular edge path */}
                  <path
                    d={path}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeDasharray={edge.label ? "none" : "5 3"}
                    markerEnd="url(#arrowhead)"
                    opacity="0.95"
                  />
                  {/* Anchor dot at source exit point */}
                  <circle cx={srcX} cy={srcY} r="3" fill="#10b981" />

                  {/* Angular Path Midpoint Label Badge */}
                  {edge.label && (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x={-((edge.label.length * 5.5 + 14) / 2)}
                        y="-10"
                        width={edge.label.length * 5.5 + 14}
                        height="16"
                        rx="4"
                        fill="#0f172a"
                        stroke="#334155"
                        strokeWidth="1"
                        className="shadow-md"
                      />
                      <text
                        x="0"
                        y="1"
                        fill="#cbd5e1"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="select-none font-semibold tracking-wide"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Live Interactive Connecting Angular Preview Line */}
            {connectSourceNodeId &&
              (() => {
                const src = currentWorkflow.nodes.find(
                  (n) => n.id === connectSourceNodeId,
                );
                if (!src || !mouseCanvasPos) return null;
                const srcX = src.x + NODE_SIZE;
                const srcY = src.y + NODE_SIZE / 2;

                const hoveredTarget =
                  hoveredNodeId && hoveredNodeId !== connectSourceNodeId
                    ? currentWorkflow.nodes.find((n) => n.id === hoveredNodeId)
                    : null;

                const tgtX = hoveredTarget ? hoveredTarget.x : mouseCanvasPos.x;
                const tgtY = hoveredTarget
                  ? hoveredTarget.y + NODE_SIZE / 2
                  : mouseCanvasPos.y;

                const { path } = getAngularPath(srcX, srcY, tgtX, tgtY);

                return (
                  <g>
                    <path
                      d={path}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeDasharray="6 3"
                      markerEnd="url(#arrowhead)"
                      className="animate-pulse"
                      opacity="0.9"
                    />
                    <circle cx={srcX} cy={srcY} r="3.5" fill="#10b981" />
                  </g>
                );
              })()}
          </svg>

          {/* Workflow Small Square Nodes */}
          {currentWorkflow.nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const isSource = connectSourceNodeId === node.id;
            const isTargetCandidate =
              connectSourceNodeId && connectSourceNodeId !== node.id;
            const isHovered = hoveredNodeId === node.id && !draggingNodeId;

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(e, node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (connectSourceNodeId && connectSourceNodeId !== node.id) {
                    handleNodeClickForConnect(node.id);
                  } else {
                    setSelectedNodeId(node.id);
                  }
                }}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${NODE_SIZE}px`,
                  height: `${NODE_SIZE}px`,
                }}
                className={`absolute z-10 rounded-xl border flex flex-col items-center justify-between p-1.5 transition-all duration-150 cursor-pointer shadow-md select-none group ${getNodeColorClass(
                  node.type,
                  isSelected,
                  isSource,
                )} ${!isSelected && !isSource ? "hover:scale-105 hover:shadow-lg" : ""}`}
              >
                {/* ENTRY POINT ON LEFT OF NODE */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (connectSourceNodeId && connectSourceNodeId !== node.id) {
                      handleNodeClickForConnect(node.id);
                    } else {
                      setSelectedNodeId(node.id);
                      showToast(
                        `Entry point (IN) for "${node.title}". Connect an Exit point here.`,
                      );
                    }
                  }}
                  className={`absolute -left-2.5 top-1/2 -translate-y-1/2 z-30 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md ${
                    isTargetCandidate
                      ? "bg-emerald-500 text-white border-2 border-white ring-4 ring-emerald-400/80 animate-pulse scale-125"
                      : "bg-slate-900 border-2 border-slate-600 text-slate-300 hover:border-emerald-400 hover:text-emerald-300 hover:scale-115"
                  }`}
                  title={
                    isTargetCandidate
                      ? `Click to connect flow into ${node.title} Entry point`
                      : `Entry Point (IN): Receives incoming transitions`
                  }
                >
                  <ChevronRight className="w-3 h-3 text-current stroke-[2.5] -mr-0.5" />
                </div>

                {/* EXIT POINT ON RIGHT OF NODE */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClickForConnect(node.id);
                  }}
                  className={`absolute -right-2.5 top-1/2 -translate-y-1/2 z-30 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer shadow-md ${
                    isSource
                      ? "bg-amber-500 text-white border-2 border-white ring-4 ring-amber-400/80 scale-125 animate-pulse"
                      : "bg-emerald-600 text-white border-2 border-white hover:bg-emerald-500 hover:scale-125"
                  }`}
                  title={
                    isSource
                      ? "Exit Point (OUT): Active. Click target node's Entry Point to link, or click here to cancel."
                      : `Exit Point (OUT): Click to link from ${node.title}`
                  }
                >
                  <ChevronRight className="w-3 h-3 text-current stroke-[2.5] -mr-0.5" />
                </div>

                {/* Node Header: Step Number & Icon */}
                <div className="w-full flex items-center justify-between px-0.5">
                  <span className="text-[9px] font-mono font-bold text-slate-500/90 leading-none">
                    #{index + 1}
                  </span>
                  <div className="shrink-0 p-0.5 rounded bg-white/70 shadow-2xs">
                    {getNodeIcon(node.type, "w-3.5 h-3.5")}
                  </div>
                </div>

                {/* Minimal Wording Center (Truncated 2-line title) */}
                <div className="w-full text-center px-1 my-auto">
                  <p className="text-[10px] font-bold text-slate-800 leading-[1.15] line-clamp-2 break-words">
                    {node.title}
                  </p>
                </div>

                {/* Bottom Type Badge */}
                <div className="w-full flex flex-col items-center justify-center gap-0.5 pb-1">
                  <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-slate-900/10 text-slate-700 truncate max-w-full">
                    {node.type}
                  </span>
                  {node.type === 'notification' && node.config.target && (
                    <div className="flex items-center justify-center gap-0.5 text-[8.5px] text-purple-700 font-semibold bg-purple-100/60 px-1 rounded truncate max-w-[90%] shadow-2xs">
                      {node.config.notificationChannel === 'email' && <Mail className="w-2 h-2" />}
                      {node.config.notificationChannel === 'whatsapp' && <MessageCircle className="w-2 h-2" />}
                      {node.config.notificationChannel === 'teams' && <Users className="w-2 h-2" />}
                      <span className="truncate">{node.config.target}</span>
                    </div>
                  )}
                  {node.type === 'compose_email' && node.config.emailRecipient && (
                    <div className="flex items-center justify-center gap-0.5 text-[8.5px] text-fuchsia-700 font-semibold bg-fuchsia-100/60 px-1 rounded truncate max-w-[90%] shadow-2xs">
                      <Sparkles className="w-2 h-2 text-fuchsia-500" />
                      <span className="truncate">{node.config.emailRecipient}</span>
                    </div>
                  )}
                </div>

                {/* Hover Tooltip with Additional Details */}
                {isHovered && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-40 w-60 p-2.5 rounded-xl bg-slate-950/95 text-slate-100 text-[11px] shadow-2xl border border-slate-700 pointer-events-none backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        {getNodeIcon(node.type, "w-3.5 h-3.5")}
                        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-300">
                          {node.type} Step #{index + 1}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400">
                        ID: {node.id.slice(-4)}
                      </span>
                    </div>

                    <div className="font-bold text-white text-xs mb-1 leading-snug">
                      {node.title}
                    </div>

                    <div className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed mb-1.5">
                      {node.description}
                    </div>

                    {node.config.threshold && (
                      <div className="text-[9px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-amber-300 border border-slate-800 mb-1 truncate">
                        <span className="text-slate-400">Threshold:</span>{" "}
                        {node.config.threshold}
                      </div>
                    )}

                    {node.config.target && (
                      <div className="text-[9px] font-mono bg-slate-900/80 px-1.5 py-0.5 rounded text-sky-300 border border-slate-800 mb-1 truncate">
                        <span className="text-slate-400">Target:</span>{" "}
                        {node.config.target}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-400 flex items-center justify-between">
                      <span>Click to open in right panel</span>
                      <span className="text-emerald-400 font-bold">
                        Inspect ➔
                      </span>
                    </div>

                    {/* Tooltip arrow caret */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950/95" />
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        </div>

        {/* Right: Node Config Inspector & Live Execution Console */}
        <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col gap-3 shrink-0 overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-3">
              {/* Header with Icon, Title, and Close */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-slate-100 shrink-0">
                    {getNodeIcon(selectedNode.type, "w-4 h-4")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      Node Details
                    </h3>
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                      {selectedNode.type} &bull; ID: {selectedNode.id.slice(-6)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Toolbar for Selected Node */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleNodeClickForConnect(selectedNode.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                    connectSourceNodeId === selectedNode.id
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>
                    {connectSourceNodeId === selectedNode.id
                      ? "Pick Target..."
                      : "Connect Edge"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    removeWorkflowNode(currentWorkflow.id, selectedNode.id);
                    setSelectedNodeId(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Node</span>
                </button>
              </div>

              {/* Node Title */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Node Title
                </label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) =>
                    updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                      title: e.target.value,
                    })
                  }
                  className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                  placeholder="Enter concise node title..."
                />
              </div>

              {/* Node Description */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Operational Description
                </label>
                <textarea
                  value={selectedNode.description}
                  onChange={(e) =>
                    updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full text-xs text-slate-700 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                  placeholder="Detailed functional and interlock description..."
                />
              </div>

              {/* Node Type Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Node Role / Type
                </label>
                <select
                  value={selectedNode.type}
                  onChange={(e) =>
                    updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                      type: e.target.value as WorkflowNodeType,
                    })
                  }
                  className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="trigger">
                    Trigger (Sensor / SCADA breach)
                  </option>
                  <option value="condition">
                    Condition (Operational check / status)
                  </option>
                  <option value="action">
                    Action (Control valve, VFD, interlock)
                  </option>
                  <option value="cmms">
                    CMMS &amp; LOTO (Permit / Work order)
                  </option>
                  <option value="notification">
                    Notification (Alert shift team / ERT)
                  </option>
                  <option value="compose_email">
                    Compose Email (AI generated)
                  </option>
                </select>
              </div>

              {/* Threshold / Criteria */}
              {selectedNode.type !== 'notification' && selectedNode.type !== 'compose_email' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Operational Threshold / Setpoint
                  </label>
                  <input
                    type="text"
                    value={selectedNode.config.threshold || ""}
                    onChange={(e) =>
                      updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                        config: {
                          ...selectedNode.config,
                          threshold: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. < 18.18 MΩ·cm or Motor Current = 0A"
                    className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Target / Equipment */}
              {selectedNode.type !== 'notification' && selectedNode.type !== 'compose_email' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Target Equipment / System Tag
                  </label>
                  <input
                    type="text"
                    value={
                      selectedNode.config.target ||
                      selectedNode.config.system ||
                      ""
                    }
                    onChange={(e) =>
                      updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                        config: {
                          ...selectedNode.config,
                          target: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Valve MOV-UPW-104 or Bed B1"
                    className="w-full text-xs font-mono text-slate-800 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Notification specific options */}
              {selectedNode.type === 'notification' && (
                <div className="space-y-3 bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                  <div>
                    <label className="text-[10px] font-bold text-purple-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Users className="w-3 h-3" /> Person Name / Recipient
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.target || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, target: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-800 border border-purple-200 rounded px-2.5 py-1.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white shadow-2xs"
                      placeholder="e.g., David Kim (UPW Lead)"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-purple-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <MessageCircle className="w-3 h-3" /> Messaging Channel
                    </label>
                    <select
                      value={selectedNode.config.notificationChannel || "email"}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, notificationChannel: e.target.value as 'whatsapp' | 'email' | 'teams' },
                        })
                      }
                      className="w-full text-xs font-semibold text-slate-800 border border-purple-200 rounded px-2.5 py-1.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none bg-white shadow-2xs"
                    >
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="teams">Microsoft Teams</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Compose Email specific options */}
              {selectedNode.type === 'compose_email' && (
                <div className="space-y-3 bg-fuchsia-50/50 p-2.5 rounded-lg border border-fuchsia-100">
                  <div>
                    <label className="text-[10px] font-bold text-fuchsia-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3" /> Email Recipient
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.emailRecipient || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, emailRecipient: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-800 border border-fuchsia-200 rounded px-2.5 py-1.5 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none bg-white shadow-2xs"
                      placeholder="e.g., John Doe (Quality Dept)"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-fuchsia-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Context / Prompt
                    </label>
                    <textarea
                      value={selectedNode.config.emailContext || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, emailContext: e.target.value },
                        })
                      }
                      rows={3}
                      className="w-full text-xs text-slate-800 border border-fuchsia-200 rounded px-2.5 py-1.5 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none bg-white shadow-2xs resize-none"
                      placeholder="Provide context for the AI to draft this email..."
                    />
                  </div>
                </div>
              )}

                            {/* Delay specific options */}
              {selectedNode.type === 'delay' && (
                <div className="space-y-3 bg-cyan-50/50 p-2.5 rounded-lg border border-cyan-100">
                  <div>
                    <label className="text-[10px] font-bold text-cyan-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Timer className="w-3 h-3" /> Delay Duration
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.duration || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, duration: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-800 border border-cyan-200 rounded px-2.5 py-1.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none bg-white shadow-2xs"
                      placeholder="e.g. 5 minutes"
                    />
                  </div>
                </div>
              )}

              {/* Human Approval specific options */}
              {selectedNode.type === 'human_approval' && (
                <div className="space-y-3 bg-pink-50/50 p-2.5 rounded-lg border border-pink-100">
                  <div>
                    <label className="text-[10px] font-bold text-pink-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3" /> Approver Role / Name
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.approverRole || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, approverRole: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-800 border border-pink-200 rounded px-2.5 py-1.5 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none bg-white shadow-2xs"
                      placeholder="e.g. Shift Manager"
                    />
                  </div>
                </div>
              )}

              {/* Data Fetch specific options */}
              {selectedNode.type === 'data_fetch' && (
                <div className="space-y-3 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  <div>
                    <label className="text-[10px] font-bold text-blue-800/70 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Database className="w-3 h-3" /> Sensor Tag / KPI
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.sensorTag || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, sensorTag: e.target.value },
                        })
                      }
                      className="w-full text-xs text-slate-800 border border-blue-200 rounded px-2.5 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white shadow-2xs"
                      placeholder="e.g. FT-201 or Resistivity"
                    />
                  </div>
                </div>
              )}

              {/* CMMS specific options */}
              {selectedNode.type === "cmms" && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    CMMS Work Order Priority
                  </label>
                  <select
                    value={selectedNode.config.workOrderPriority || "P1"}
                    onChange={(e) =>
                      updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                        config: {
                          ...selectedNode.config,
                          workOrderPriority: e.target.value as any,
                        },
                      })
                    }
                    className="w-full text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2.5 py-1.5 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="P1">P1 - Urgent Emergency (SEMI S2)</option>
                    <option value="P2">P2 - High Priority Interlock</option>
                    <option value="P3">P3 - Routine Corrective Action</option>
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <details className="group">
                  <summary className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mb-1 flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5" /> LLM Execution Prompt (Optional)
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2">
                    <textarea
                      value={selectedNode.config.systemPrompt || ""}
                      onChange={(e) =>
                        updateWorkflowNode(currentWorkflow.id, selectedNode.id, {
                          config: { ...selectedNode.config, systemPrompt: e.target.value },
                        })
                      }
                      rows={4}
                      className="w-full text-[11px] text-slate-800 border border-indigo-200 rounded px-2.5 py-1.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-indigo-50/30 shadow-2xs font-mono resize-y"
                      placeholder="Tell the LLM how to narrate this node during execution..."
                    />
                  </div>
                </details>
              </div>

              {/* Connected Transitions / Edges */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Connected Edges (
                    {
                      currentWorkflow.edges.filter(
                        (e) =>
                          e.source === selectedNode.id ||
                          e.target === selectedNode.id,
                      ).length
                    }
                    )
                  </span>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {currentWorkflow.edges
                    .filter(
                      (e) =>
                        e.source === selectedNode.id ||
                        e.target === selectedNode.id,
                    )
                    .map((edge) => {
                      const isOut = edge.source === selectedNode.id;
                      const otherNodeId = isOut ? edge.target : edge.source;
                      const otherNode = currentWorkflow.nodes.find(
                        (n) => n.id === otherNodeId,
                      );

                      return (
                        <div
                          key={edge.id}
                          className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${isOut ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}
                            >
                              {isOut ? "OUT ➔" : "IN ➔"}
                            </span>
                            <span className="text-slate-700 truncate font-medium text-[10px]">
                              {otherNode?.title || otherNodeId.slice(-4)}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              removeWorkflowEdge(currentWorkflow.id, edge.id)
                            }
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                            title="Remove edge"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  {currentWorkflow.edges.filter(
                    (e) =>
                      e.source === selectedNode.id ||
                      e.target === selectedNode.id,
                  ).length === 0 && (
                    <div className="text-[11px] text-slate-400 italic">
                      No connections yet. Click "Connect Edge" above to link to
                      another node.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 space-y-2.5 my-auto">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Sliders className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">
                No Node Selected
              </h4>
              <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto leading-relaxed">
                Click any square node on the canvas to inspect its full
                operational details, setpoints, and transitions.
              </p>
            </div>
          )}

          {/* Live Execution Verbosity Logs */}
          <div className="border-t border-slate-100 pt-3 flex-1 flex flex-col min-h-[140px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-emerald-600" />
                <span>Execution Verbosity</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {currentWorkflow.status}
              </span>
            </div>

            <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-2.5 rounded-lg flex-1 overflow-y-auto space-y-1">
              {currentWorkflow.executionLogs &&
              currentWorkflow.executionLogs.length > 0 ? (
                currentWorkflow.executionLogs.map((log, idx) => (
                  <div key={idx} className="leading-tight break-words">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">
                  No execution logs yet. Click "Run Simulation" or execute via
                  Ops Copilot.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Viewer Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  Workflow Tool Schema: {currentWorkflow.id}.json
                </h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs overflow-y-auto flex-1">
              <pre>{JSON.stringify(currentWorkflow, null, 2)}</pre>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                This JSON schema is exposed directly to Ops Copilot as an
                executable facility tool.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  {copiedJson ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{copiedJson ? "Copied!" : "Copy JSON"}</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <AiWorkflowComposer isOpen={isAiComposerOpen} onClose={() => setIsAiComposerOpen(false)} />
    </div>
  );
};
