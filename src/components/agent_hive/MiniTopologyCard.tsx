import React, { useState, useRef, useEffect, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import {
  Database,
  ChevronDown,
  ChevronUp,
  Code2,
  Check,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Move,
  Play,
  Pause,
} from 'lucide-react';
import { SubgraphNode, SubgraphEdge } from './types';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface MiniTopologyCardProps {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
  cypherQuery?: string;
  cypherResultsSummary?: string;
  isLive?: boolean;
}

export const MiniTopologyCard: React.FC<MiniTopologyCardProps> = ({
  nodes,
  edges,
  cypherQuery,
  cypherResultsSummary,
  isLive = true,
}) => {
  const [showCypher, setShowCypher] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [userWantsAnimation, setUserWantsAnimation] = useState<boolean>(false);

  const isAnimated = isLive || userWantsAnimation;

  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 620, height: 280 });

  // Measure container size dynamically for responsive canvas
  useEffect(() => {
    if (!containerRef.current) return;
    let frameId: number | null = null;
    const observer = new ResizeObserver((entries) => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setDimensions({ width, height });
          }
        }
      });
    });
    observer.observe(containerRef.current);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [isFullscreen]);

  if (!nodes.length && !edges.length && !cypherQuery) {
    return null;
  }

  const handleCopy = () => {
    if (cypherQuery) {
      navigator.clipboard.writeText(cypherQuery);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to determine node visuals and domain badge
  const getNodeVisuals = (node: SubgraphNode) => {
    const id = (node.id || '').toUpperCase();
    const type = (node.type || '').toUpperCase();
    if (
      id.includes('ALM') ||
      id.includes('ALARM') ||
      type.includes('ALARM') ||
      type.includes('ALERT')
    ) {
      return {
        bg: '#e11d48',
        border: '#fb7185',
        glow: 'rgba(251, 113, 133, 0.45)',
        badge: 'ALARM',
        symbol: '⚠️',
      };
    }
    if (
      id.includes('UPW') ||
      type.includes('UPW') ||
      type.includes('WATER') ||
      id.includes('TK-') ||
      id.includes('RO-')
    ) {
      return {
        bg: '#0284c7',
        border: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.4)',
        badge: 'UPW',
        symbol: '💧',
      };
    }
    if (
      id.includes('CHW') ||
      id.includes('CH-') ||
      type.includes('CHILLER') ||
      type.includes('HEATEXCHANGER') ||
      id.includes('HX-')
    ) {
      return {
        bg: '#0891b2',
        border: '#22d3ee',
        glow: 'rgba(34, 211, 238, 0.4)',
        badge: 'CHW',
        symbol: '❄️',
      };
    }
    if (
      id.includes('TX-') ||
      id.includes('MCC-') ||
      type.includes('TRANSFORMER') ||
      type.includes('ELECTRICAL') ||
      id.includes('UPS-')
    ) {
      return {
        bg: '#d97706',
        border: '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.4)',
        badge: 'POWER',
        symbol: '⚡',
      };
    }
    if (
      id.includes('TOOL') ||
      id.includes('CMP') ||
      type.includes('PROCESS') ||
      type.includes('TOOL')
    ) {
      return {
        bg: '#7c3aed',
        border: '#a78bfa',
        glow: 'rgba(167, 139, 250, 0.4)',
        badge: 'TOOL',
        symbol: '⚙️',
      };
    }
    return {
      bg: '#475569',
      border: '#94a3b8',
      glow: 'rgba(148, 163, 184, 0.3)',
      badge: 'ASSET',
      symbol: '🔷',
    };
  };

  // Convert nodes and edges to forceGraph format
  const graphData = useMemo(() => {
    const forceNodes = nodes.map(n => {
      const visuals = getNodeVisuals(n);
      return {
        id: n.id,
        name: n.name || n.id,
        type: n.type,
        status: n.status,
        visuals,
        val: visuals.badge === 'ALARM' ? 10 : 8,
      };
    });

    const forceLinks = edges.map((e, idx) => {
      const relUpper = (e.relationship || 'FEEDS').toUpperCase();
      const color = relUpper.includes('ALARM') || relUpper.includes('ALERT')
        ? '#f43f5e'
        : relUpper.includes('COOL')
        ? '#06b6d4'
        : relUpper.includes('SUPPL')
        ? '#38bdf8'
        : '#10b981';

      return {
        id: `link-${idx}`,
        source: e.sourceId,
        target: e.targetId,
        relationship: e.relationship,
        property: e.property,
        color,
      };
    });

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges]);

  // Adjust forces & initial fit when graphData changes
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-260);
      fgRef.current.d3Force('link')?.distance(85);
      const timer = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 45);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [graphData, dimensions]);

  // Floating controls
  const handleZoomIn = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 1.3, 300);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const currentZoom = fgRef.current.zoom();
      fgRef.current.zoom(currentZoom * 0.75, 300);
    }
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 45);
    }
  };

  const cardContent = (
    <div
      className={`rounded-xl border border-slate-700/80 bg-slate-950 text-slate-100 overflow-hidden shadow-xl flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-3 md:inset-6 z-50 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-2 border-emerald-500/80 rounded-2xl'
          : 'mt-2.5'
      }`}
    >
      {/* Header bar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="flex items-center gap-1.5 font-bold text-slate-100 text-[12px] sm:text-[13px] truncate">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Dynamic Knowledge Graph</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 font-semibold">
            {nodes.length}N
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-semibold">
            {edges.length}R
          </span>
          {cypherQuery && (
            <button
              type="button"
              onClick={() => setShowCypher(!showCypher)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Code2 className="w-3 h-3 text-amber-400" />
              <span>Cypher</span>
              {showCypher ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Subgraph Canvas'}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 animate-pulse'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand Graph</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Cypher query view */}
      {showCypher && cypherQuery && (
        <div className="p-3 bg-slate-900/95 border-b border-slate-800 text-xs font-mono text-emerald-300 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-[11px] uppercase font-bold text-slate-400">
            <span className="flex items-center gap-1 text-amber-400">
              <Code2 className="w-3.5 h-3.5" />
              Executed Neo4j Cypher Query
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Query'}</span>
            </button>
          </div>
          <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
            {cypherQuery}
          </pre>
        </div>
      )}

      {/* Interactive Force Graph Canvas */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden bg-[#0a0f1d] select-none ${
          isFullscreen ? 'flex-1 min-h-[400px]' : 'h-[290px]'
        }`}
      >
        {/* Floating Pan/Zoom Control Toolbox with prominent Expand Button */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-emerald-500/50 shadow-xl">
          {isLive ? (
            <div
              title="Active turn: Live animated flow simulation"
              className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 rounded-lg flex items-center gap-1.5 text-[10px] font-semibold select-none mr-0.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Flow</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setUserWantsAnimation(prev => !prev)}
              title={isAnimated ? "Pause flow particles to save CPU" : "Activate flow particle simulation"}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-colors cursor-pointer border mr-0.5 ${
                isAnimated
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white'
              }`}
            >
              {isAnimated ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
              <span>{isAnimated ? 'Flowing' : 'Static (Play)'}</span>
            </button>
          )}
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Subgraph Canvas'}
            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs mr-0.5"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit' : 'Expand'}</span>
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
          <button
            type="button"
            onClick={handleResetView}
            title="Reset View / Center"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Pan & Drag Hint Overlay */}
        <div className="absolute bottom-2 left-3 z-20 pointer-events-none flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/80 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-800/80">
          <Move className="w-3 h-3 text-slate-500" />
          <span>Drag nodes to simulate · Scroll to zoom · Click node for details</span>
        </div>

        {/* React Force Graph 2D Component */}
        <ErrorBoundary>
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            backgroundColor="#0a0f1d"
            nodeId="id"
            nodeLabel="name"
            linkSource="source"
            linkTarget="target"
            linkColor={link => (link as any).color || '#10b981'}
            linkWidth={link => (selectedNodeId && ((link as any).source?.id === selectedNodeId || (link as any).target?.id === selectedNodeId) ? 3.5 : 2)}
            linkDirectionalArrowLength={8}
            linkDirectionalArrowRelPos={0.92}
            linkDirectionalArrowColor={link => (link as any).color || '#10b981'}
            linkDirectionalParticles={isAnimated ? 2 : 0}
            linkDirectionalParticleSpeed={isAnimated ? 0.006 : 0}
            linkDirectionalParticleWidth={2}
            d3VelocityDecay={0.35}
            onNodeClick={(node: any) => {
              setSelectedNodeId(prev => (prev === node.id ? null : node.id));
            }}
            onBackgroundClick={() => {
              setSelectedNodeId(null);
            }}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const isSelected = node.id === selectedNodeId;
              const visuals = node.visuals || {
                bg: '#475569',
                border: '#94a3b8',
                glow: 'rgba(148, 163, 184, 0.3)',
                badge: 'ASSET',
                symbol: '🔷',
              };

              const radius = 17;

              // 1. Ambient glow circle
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = isSelected ? 'rgba(251, 191, 36, 0.3)' : visuals.glow;
              ctx.fill();

              // 2. Selection ring if highlighted
              if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 7, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2.5 / Math.max(0.5, globalScale);
                ctx.stroke();
              }

              // 3. Main dark node body
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
              ctx.fillStyle = '#0f172a';
              ctx.fill();
              ctx.strokeStyle = isSelected ? '#fbbf24' : visuals.border;
              ctx.lineWidth = (isSelected ? 3 : 2) / Math.max(0.5, globalScale);
              ctx.stroke();

              // 4. Subtle inner color ring
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius - 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = visuals.bg;
              ctx.globalAlpha = 0.25;
              ctx.fill();
              ctx.globalAlpha = 1.0;

              // 5. Center icon / symbol
              ctx.font = `${11 / Math.max(0.5, globalScale)}px ui-sans-serif, system-ui`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(visuals.symbol, node.x, node.y);

              // 6. Domain Pill Badge above node
              const badgeW = 28 / Math.max(0.5, globalScale);
              const badgeH = 11 / Math.max(0.5, globalScale);
              const badgeY = node.y - radius - (8 / Math.max(0.5, globalScale));

              ctx.fillStyle = '#0f172a';
              ctx.fillRect(node.x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);
              ctx.strokeStyle = visuals.border;
              ctx.lineWidth = 1 / Math.max(0.5, globalScale);
              ctx.strokeRect(node.x - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH);

              ctx.font = `bold ${7.5 / Math.max(0.5, globalScale)}px ui-monospace, monospace`;
              ctx.fillStyle = visuals.border;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(visuals.badge, node.x, badgeY);

              // 7. Node ID Text below node circle
              const idTextY = node.y + radius + (11 / Math.max(0.5, globalScale));
              ctx.font = `bold ${10.5 / Math.max(0.5, globalScale)}px ui-sans-serif, system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';

              // Text outline for high contrast
              ctx.strokeStyle = '#020617';
              ctx.lineWidth = 3 / Math.max(0.5, globalScale);
              ctx.strokeText(node.id, node.x, idTextY);

              ctx.fillStyle = isSelected ? '#fef08a' : '#ffffff';
              ctx.fillText(node.id, node.x, idTextY);

              // 8. Equipment Name Sublabel
              if (node.name && node.name !== node.id) {
                const subTextY = idTextY + (12 / Math.max(0.5, globalScale));
                ctx.font = `500 ${8.5 / Math.max(0.5, globalScale)}px ui-sans-serif, system-ui, sans-serif`;
                const displaySub = node.name.length > 20 ? node.name.slice(0, 19) + '…' : node.name;

                ctx.strokeStyle = '#020617';
                ctx.lineWidth = 2.5 / Math.max(0.5, globalScale);
                ctx.strokeText(displaySub, node.x, subTextY);

                ctx.fillStyle = isSelected ? '#cbd5e1' : '#94a3b8';
                ctx.fillText(displaySub, node.x, subTextY);
              }
            }}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 22, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const src = link.source;
              const tgt = link.target;
              if (!src || !tgt || typeof src.x !== 'number' || typeof tgt.x !== 'number') return;

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2;

              const label = `:${link.relationship || 'FEEDS'}`;
              const fontSize = 8.5 / Math.max(0.5, globalScale);
              ctx.font = `bold ${fontSize}px ui-monospace, monospace`;

              const textWidth = ctx.measureText(label).width;
              const padX = 4 / Math.max(0.5, globalScale);
              const padY = 2 / Math.max(0.5, globalScale);
              const boxW = textWidth + padX * 2;
              const boxH = fontSize + padY * 2;

              // Draw dark capsule behind relationship text
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);
              ctx.strokeStyle = link.color || '#10b981';
              ctx.lineWidth = 0.8 / Math.max(0.5, globalScale);
              ctx.strokeRect(midX - boxW / 2, midY - boxH / 2, boxW, boxH);

              // Draw relationship label
              ctx.fillStyle = '#f8fafc';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(label, midX, midY);
            }}
          />
        </ErrorBoundary>
      </div>

      {/* Selected Node Details Bar if a node is clicked */}
      {selectedNodeId && (() => {
        const selNode = nodes.find(n => n.id === selectedNodeId);
        if (!selNode) return null;
        const incoming = edges.filter(e => e.targetId === selNode.id);
        const outgoing = edges.filter(e => e.sourceId === selNode.id);

        return (
          <div className="px-4 py-2.5 bg-slate-900 border-t border-amber-500/40 text-xs flex items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                {selNode.id.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 text-sm">{selNode.id}</span>
                  <span className="text-[11px] text-amber-300 font-mono">({selNode.name})</span>
                  {selNode.type && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700">
                      {selNode.type}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5 font-mono">
                  <span>Upstream In: <strong className="text-sky-300">{incoming.length}</strong></span>
                  <span>Downstream Out: <strong className="text-emerald-300">{outgoing.length}</strong></span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNodeId(null)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 cursor-pointer"
            >
              Deselect
            </button>
          </div>
        );
      })()}

      {/* Direct Topological Flows Bottom Strip */}
      <div className="px-3.5 py-2 bg-slate-900 border-t border-slate-800 text-xs flex flex-wrap items-center gap-2 shrink-0">
        <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
          Direct Flows:
        </span>
        {edges.map((e, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 text-[11px] font-medium shadow-2xs"
          >
            <span className="font-bold text-sky-400">{e.sourceId}</span>
            <span className="text-emerald-400 font-mono text-[10px]">
              ──[:{e.relationship}]──►
            </span>
            <span className="font-bold text-violet-400">{e.targetId}</span>
            {e.property && (
              <span className="text-amber-300 font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                {e.property}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setIsFullscreen(false)}
        />
      )}
      {cardContent}
    </>
  );
};

