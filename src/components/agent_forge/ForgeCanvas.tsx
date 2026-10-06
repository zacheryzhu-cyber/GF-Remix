import React, { useState, useRef, useEffect } from 'react';
import {
  Power,
  Cpu,
  ShieldCheck,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  Code2,
  X,
  Bot,
  Brain,
  Workflow,
  Sliders,
  CheckCircle2,
  Terminal,
  Zap,
  Database,
  Search,
  Wrench,
} from 'lucide-react';

export interface ForgeNode {
  id: string;
  type: 'start' | 'deep_agent' | 'end' | 'tool';
  label: string;
  sublabel: string;
  x: number;
  y: number;
  status: 'idle' | 'active' | 'success';
  description: string;
  model: string;
  temperature: number;
  maxIterations: number;
  systemPrompt: string;
  inputs: string[];
  outputs: string[];
  tools?: string[];
  iconType?: 'schema' | 'cypher' | 'generic';
}

export interface ForgeEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  isActive: boolean;
}

interface ForgeCanvasProps {
  nodes: ForgeNode[];
  edges: ForgeEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onUpdateNodePosition: (id: string, x: number, y: number) => void;
  onResetPositions: () => void;
  isRunning: boolean;
  activeNodeId: string | null;
  activeEdgeId: string | null;
}

export const ForgeCanvas: React.FC<ForgeCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onResetPositions,
  isRunning,
  activeNodeId,
  activeEdgeId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Code / Schema inspection drawer
  const [inspectNode, setInspectNode] = useState<ForgeNode | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.4));

  const handleCenter = () => {
    if (!nodes.length || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + 120));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + 130));

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    setZoom(0.85);
    setPan({
      x: rect.width / 2 - graphCenterX * 0.85,
      y: rect.height / 2 - graphCenterY * 0.85,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCenter();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Panning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node-card') || (e.target as HTMLElement).closest('.canvas-controls')) {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      onUpdateNodePosition(
        draggingNodeId,
        Math.round(mouseCanvasX - dragOffset.x),
        Math.round(mouseCanvasY - dragOffset.y)
      );
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: ForgeNode) => {
    e.stopPropagation();
    onSelectNode(node.id);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseCanvasY = (e.clientY - rect.top - pan.y) / zoom;
      setDragOffset({
        x: mouseCanvasX - node.x,
        y: mouseCanvasY - node.y,
      });
      setDraggingNodeId(node.id);
    }
  };

  const getNodeConfig = (type: ForgeNode['type'], iconType?: ForgeNode['iconType']) => {
    switch (type) {
      case 'start':
        return {
          icon: Power,
          radius: 46,
          diameter: 92,
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
      case 'deep_agent':
        return {
          icon: Brain,
          radius: 58,
          diameter: 116,
          accentColor: '#8b5cf6',
          bgGradient: 'from-violet-950 via-slate-900 to-slate-950',
          borderColor: 'border-violet-400',
          glowShadow: 'shadow-[0_0_35px_rgba(139,92,246,0.45)]',
          activeRing: 'ring-4 ring-violet-400 ring-offset-3 ring-offset-slate-950 scale-105',
          iconColor: 'text-violet-400',
          tagLabel: 'DEEP AGENT',
          subLabel: 'AUTONOMOUS REASONER',
          badgeStyle: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
        };
      case 'tool':
        const toolIcon = iconType === 'cypher' ? Zap : iconType === 'schema' ? Search : Database;
        return {
          icon: toolIcon,
          radius: 42,
          diameter: 84,
          accentColor: '#06b6d4',
          bgGradient: 'from-cyan-950 via-slate-900 to-slate-950',
          borderColor: 'border-cyan-500/80',
          glowShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.35)]',
          activeRing: 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105',
          iconColor: 'text-cyan-400',
          tagLabel: 'TOOL',
          subLabel: 'AURA TWIN',
          badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
      case 'end':
        return {
          icon: ShieldCheck,
          radius: 46,
          diameter: 92,
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
    }
  };

  const calculateEdgePath = (edge: ForgeEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.from);
    const targetNode = nodes.find(n => n.id === edge.to);
    if (!sourceNode || !targetNode) return '';

    const sourceConfig = getNodeConfig(sourceNode.type, sourceNode.iconType);
    const targetConfig = getNodeConfig(targetNode.type, targetNode.iconType);

    const c1x = sourceNode.x + sourceConfig.radius;
    const c1y = sourceNode.y + sourceConfig.radius;
    const c2x = targetNode.x + targetConfig.radius;
    const c2y = targetNode.y + targetConfig.radius;

    const angle = Math.atan2(c2y - c1y, c2x - c1x);

    const startX = c1x + (sourceConfig.radius + 2) * Math.cos(angle);
    const startY = c1y + (sourceConfig.radius + 2) * Math.sin(angle);
    const endX = c2x - (targetConfig.radius + 8) * Math.cos(angle);
    const endY = c2y - (targetConfig.radius + 8) * Math.sin(angle);

    const dx = endX - startX;
    const dy = endY - startY;
    const curvature = 0.05;
    const midX = (startX + endX) / 2 - dy * curvature;
    const midY = (startY + endY) / 2 + dx * curvature;

    return `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full min-h-[560px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      {/* Background Blueprint Grid */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Top Floating Overlay Controls */}
      <div className="canvas-controls absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Agent Forge Graph
          </span>
        </div>
      </div>

      {/* Top Right Zoom and Layout Controls */}
      <div className="canvas-controls absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg text-slate-300">
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleCenter}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Center View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onResetPositions}
          className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Reset Default Node Positions"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Canvas for Edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          overflow: 'visible',
        }}
      >
        <defs>
          <marker
            id="forge-arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
          </marker>
          <marker
            id="forge-arrowhead-active"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#a78bfa" />
          </marker>
        </defs>

        {edges.map(edge => {
          const pathD = calculateEdgePath(edge);
          const isEdgeActive = edge.isActive || activeEdgeId === edge.id;
          return (
            <g key={edge.id} className="transition-all duration-300">
              {/* Edge glow when active */}
              {isEdgeActive && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="6"
                  strokeOpacity="0.4"
                  className="animate-pulse"
                />
              )}
              {/* Base Path */}
              <path
                d={pathD}
                fill="none"
                stroke={isEdgeActive ? '#a78bfa' : '#475569'}
                strokeWidth={isEdgeActive ? '3' : '2'}
                strokeDasharray={isEdgeActive ? '6 4' : 'none'}
                markerEnd={isEdgeActive ? 'url(#forge-arrowhead-active)' : 'url(#forge-arrowhead)'}
                className={isEdgeActive ? 'animate-dash' : ''}
              />
            </g>
          );
        })}
      </svg>

      {/* Transformed Nodes Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
          const config = getNodeConfig(node.type, node.iconType);
          const Icon = config.icon;
          const isSelected = selectedNodeId === node.id;
          const isNodeActive = node.status === 'active' || activeNodeId === node.id;

          return (
            <div
              key={node.id}
              onMouseDown={e => handleNodeMouseDown(e, node)}
              className="canvas-node-card absolute pointer-events-auto cursor-grab active:cursor-grabbing transition-transform duration-100"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {/* Node Circular Body */}
              <div
                className={`relative rounded-full flex flex-col items-center justify-center border-2 bg-gradient-to-b ${
                  config.bgGradient
                } ${config.borderColor} ${config.glowShadow} ${
                  isNodeActive ? config.activeRing : ''
                } ${isSelected ? 'ring-4 ring-white/60 ring-offset-2 ring-offset-slate-950' : ''}`}
                style={{
                  width: `${config.diameter}px`,
                  height: `${config.diameter}px`,
                }}
              >
                {/* Node Status Badge */}
                <div
                  className={`absolute -top-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${config.badgeStyle}`}
                >
                  {config.tagLabel}
                </div>

                {/* Main Icon */}
                <Icon
                  className={`${config.diameter > 100 ? 'w-8 h-8' : 'w-6 h-6'} ${
                    config.iconColor
                  } ${isNodeActive ? 'animate-bounce-short' : ''}`}
                />

                {/* Center Sublabel */}
                <span className="text-[10px] font-bold text-slate-300 mt-1 text-center px-1 leading-tight select-none">
                  {node.type === 'start'
                    ? 'Start'
                    : node.type === 'end'
                    ? 'End Output'
                    : node.type === 'deep_agent'
                    ? 'Deep Agent'
                    : node.iconType === 'schema'
                    ? 'Schema'
                    : node.iconType === 'cypher'
                    ? 'Cypher'
                    : node.label}
                </span>

                {/* Active Pulsing Indicator */}
                {isNodeActive && (
                  <span className="absolute bottom-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>

              {/* Node Card Details underneath */}
              <div className="mt-2.5 text-center flex flex-col items-center max-w-[140px]">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-200">
                    {node.label}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setInspectNode(node);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Inspect State & Prompt"
                  >
                    <Code2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {node.sublabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Legend / Status Bar */}
      <div className="canvas-controls absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-lg text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>START</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span>Deep Agent</span>
        </div>
        <span className="text-slate-600">⇄</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span>Aura Tools</span>
        </div>
        <span className="text-slate-600">→</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>END</span>
        </div>
      </div>

      {/* Code / Configuration Drawer */}
      {inspectNode && (
        <div className="canvas-controls absolute top-0 right-0 w-80 h-full bg-slate-900/95 backdrop-blur-md border-l border-slate-800 z-30 flex flex-col p-4 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Node Specification
              </h3>
            </div>
            <button
              onClick={() => setInspectNode(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Node Identifier
              </span>
              <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded-lg border border-slate-800">
                {inspectNode.id} ({inspectNode.type})
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Description
              </span>
              <p className="text-slate-300 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                {inspectNode.description}
              </p>
            </div>

            {inspectNode.type === 'tool' && (
              <>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Integration Target</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    Semiconductor Digital Twin Cloud
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Tool Binding Directive
                  </span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {inspectNode.systemPrompt}
                  </div>
                </div>
              </>
            )}

            {inspectNode.type === 'deep_agent' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Model</span>
                    <span className="font-mono text-violet-400 font-bold">
                      {inspectNode.model}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Temperature</span>
                    <span className="font-mono text-slate-200 font-bold">
                      {inspectNode.temperature}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    System Directive
                  </span>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {inspectNode.systemPrompt}
                  </div>
                </div>

                {inspectNode.tools && inspectNode.tools.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5 flex items-center justify-between">
                      <span>Equipped Tools</span>
                      <span className="text-violet-400 font-mono font-normal">({inspectNode.tools.length} active)</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {inspectNode.tools.map((t, idx) => {
                        const isTwin = t.startsWith('neo4j');
                        const displayName = t === 'neo4j_schema_introspect' 
                          ? 'schema_introspect' 
                          : t === 'neo4j_cypher_query' 
                          ? 'graph_query' 
                          : t;
                        return (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isTwin
                                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50 font-semibold'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            {isTwin ? `⚡ ${displayName}` : displayName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                State Channels
              </span>
              <div className="space-y-1">
                <div className="text-[10px] text-emerald-400 font-mono">
                  Input: {inspectNode.inputs.join(', ')}
                </div>
                <div className="text-[10px] text-violet-400 font-mono">
                  Output: {inspectNode.outputs.join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
