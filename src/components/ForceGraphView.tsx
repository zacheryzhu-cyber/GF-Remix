import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Node, Edge } from '@xyflow/react';
import { ErrorBoundary } from './common/ErrorBoundary';

export interface AlarmNodeItem {
  id: string;
  code: string;
  severity: string;
  timestamp?: string;
  assetId?: string;
  assetName?: string;
}

interface ForceGraphViewProps {
  nodes: Node[];
  edges: Edge[];
  activeQuery: string | null;
  alarmNodes?: AlarmNodeItem[];
}

export function ForceGraphView({ nodes, edges, activeQuery, alarmNodes = [] }: ForceGraphViewProps) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        setDimensions({ width: clientWidth, height: clientHeight });
      }

      let frameId: number | null = null;
      const resizeObserver = new ResizeObserver(entries => {
        if (frameId) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(() => {
          for (let entry of entries) {
            const w = entry.contentRect.width;
            const h = entry.contentRect.height;
            if (w > 0 && h > 0) {
              setDimensions({ width: w, height: h });
            }
          }
        });
      });
      resizeObserver.observe(containerRef.current);
      return () => {
        if (frameId) cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
      };
    }
  }, []);

  const graphData = useMemo(() => {
    // 1. Convert standard equipment nodes
    const forceNodes = nodes.map(n => {
      const opacity = n.style?.opacity !== undefined ? Number(n.style.opacity) : 1;
      const borderStr = (n.style?.border as string) || '';
      
      // Extract base color from border or background (natural subsystem color)
      let color = '#3b82f6'; // Default blue
      const borderMatch = borderStr.match(/#([0-9a-fA-F]{3,8})/);
      if (borderMatch) {
        color = borderMatch[0];
      } else if (n.style?.background && n.style.background !== '#ffffff') {
        color = n.style.background as string;
      }

      // Check if this node is an Alarm node or a newly added custom node
      const isAlarmNode = n.data?.type === 'Alarm' || n.id?.startsWith('A-');
      const isP1 = n.data?.severity === 'P1' || n.id === 'A-01';
      
      const NEW_EQUIPMENT_IDS = new Set([
        'F-141', 'MMF', 'SAC-0911', 'SAC-0912', 'SAC-0913', 'SAC-0914',
        'S-091', 'S-121', 'S-111', 'S-131', 'S-0511',
        'T-1011', 'T-1012', 'T-200', 'T-2511', 'WASTE',
        'CEDI-3311', 'MB-3411'
      ]);
      const isNewGreenNode = NEW_EQUIPMENT_IDS.has(n.id) || borderStr.includes('#10b981');

      if (isNewGreenNode) {
        color = '#10b981'; // Vivid green for all new equipment nodes
      } else if (isAlarmNode) {
        color = isP1 ? '#dc2626' : '#ea580c'; // Red-600 for P1, Orange-600 for P2
      }

      // Keep natural colors for all equipment nodes - do NOT dim them out to grey when alarms are shown
      return {
        id: n.id,
        name: n.data?.label as string || n.id,
        group: n.data?.type as string,
        isAlarm: isAlarmNode,
        isNewGreenNode,
        severity: n.data?.severity,
        val: isAlarmNode ? 11 : ((activeQuery && opacity === 1) ? 7 : 5), // Same uniform size for all equipment nodes
        color
      };
    });

    const existingNodeIds = new Set(forceNodes.map(n => n.id));

    // 2. Add any active alarm nodes (from Neo4j live state)
    if (alarmNodes && alarmNodes.length > 0) {
      alarmNodes.forEach(alarm => {
        if (!existingNodeIds.has(alarm.id)) {
          const isP1 = alarm.severity === 'P1' || alarm.id === 'A-01';
          forceNodes.push({
            id: alarm.id,
            name: `${alarm.id}: ${alarm.code}`,
            group: 'Alarm',
            isAlarm: true,
            isNewGreenNode: false,
            severity: alarm.severity,
            val: 12, // prominently sized
            color: isP1 ? '#dc2626' : '#ea580c',
          });
          existingNodeIds.add(alarm.id);
        }
      });
    }

    // 3. Convert standard edges
    const forceLinks = edges.map(e => {
      const opacity = e.style?.opacity !== undefined ? Number(e.style.opacity) : 1;
      const stroke = e.style?.stroke as string | undefined;
      
      let color = '#94a3b8';
      if (activeQuery && opacity === 1 && stroke) {
          color = stroke;
      } else if (activeQuery && opacity < 1) {
          color = '#cbd5e1'; // Make dimmed edges slightly more visible than before (slate-300 instead of slate-50)
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        name: e.label as string,
        color,
        width: (activeQuery && opacity === 1) ? 4 : 1.5 // slightly thicker lines for visibility
      };
    });

    // 4. Add dynamic links connecting Alarms to their target assets
    if (alarmNodes && alarmNodes.length > 0) {
      alarmNodes.forEach(alarm => {
        if (alarm.assetId && existingNodeIds.has(alarm.assetId)) {
          forceLinks.push({
            id: `edge-${alarm.id}-${alarm.assetId}`,
            source: alarm.id,
            target: alarm.assetId,
            name: 'RAISED_ON',
            color: alarm.severity === 'P1' ? '#ef4444' : '#f97316',
            width: 2.5,
          });
        }
      });
    }

    return { nodes: forceNodes, links: forceLinks };
  }, [nodes, edges, activeQuery, alarmNodes]);

  // Center graph and apply forces when data changes or initially loaded
  useEffect(() => {
    if (fgRef.current) {
       // Reduce repelling charge so they group closer, and shorten link distance
       fgRef.current.d3Force('charge').strength(-200);
       fgRef.current.d3Force('link').distance(50);
       setTimeout(() => {
           fgRef.current?.zoomToFit(400, 50);
       }, 500);
    }
  }, [graphData]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative overflow-hidden">
      <ErrorBoundary>
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeId="id"
          nodeLabel="name"
          nodeColor={node => (node as any).color}
          nodeRelSize={8}
          nodeVal={node => (node as any).val}
          linkColor={link => (link as any).color}
          linkWidth={link => ((link as any).width > 1.5 ? 3.5 : 2)}
          linkDirectionalArrowLength={link => ((link as any).width > 1.5 ? 14 : 10.5)}
          linkDirectionalArrowRelPos={0.92}
          linkDirectionalArrowColor={link => (link as any).color}
          linkDirectionalParticles={link => ((link as any).width > 1.5 ? 4 : 0)}
          linkDirectionalParticleSpeed={0.005}
          d3VelocityDecay={0.4} // Increase friction slightly so it settles faster and doesn't jiggle as much
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isZoomedIn = globalScale >= 1.0;
            const isHighlighted = node.val > 4;
            const isAlarm = node.isAlarm;
            
            // Draw Node Circle (scaled up base size)
            const r = Math.sqrt(node.val) * 6;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.color;
            ctx.fill();

            // If it's an alarm node, draw a flashing/accent outer ring
            if (isAlarm) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + (3 / Math.max(0.5, globalScale)), 0, 2 * Math.PI, false);
              ctx.strokeStyle = node.severity === 'P1' ? 'rgba(220, 38, 38, 0.8)' : 'rgba(234, 88, 12, 0.8)';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Render node label (always show full node label for every node)
            const displayText = isAlarm 
              ? `🚨 ${node.name}` 
              : (node.name || node.id);
            
            const fontSize = (isAlarm ? 12 : 10) / globalScale;
            ctx.font = `${isAlarm ? '700' : '600'} ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const textY = node.y + r + (3 / globalScale);

            // Draw white outline/halo for crisp legibility over lines and canvas background
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 3.5 / globalScale;
            ctx.lineJoin = 'round';
            ctx.strokeText(displayText, node.x, textY);

            // Text fill color
            ctx.fillStyle = isAlarm ? '#991b1b' : (isHighlighted ? '#065f46' : '#1e293b');
            ctx.fillText(displayText, node.x, textY);
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const r = Math.sqrt(node.val) * 6 + 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
          }}
        />
      </ErrorBoundary>
    </div>
  );
}
