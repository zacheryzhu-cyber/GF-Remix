import React, { useState } from 'react';
import {
  Workflow,
  Bot,
  User,
  Power,
  Cpu,
  Database,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Zap,
  Info,
  X,
  Terminal,
  ArrowRight,
  Code2,
  Sparkles,
  Network,
  Boxes,
  BookOpen,
  Waypoints,
} from 'lucide-react';
import { LangGraphTraceStep } from './types';

interface SessionNodeTraceProps {
  traceSteps: LangGraphTraceStep[];
  isRunning: boolean;
  activeNodeId: string | null;
}

const getNodeIcon = (nodeId: string) => {
  switch (nodeId) {
    case 'start':
      return <Power className="w-3 h-3" />;
    case 'operator':
      return <User className="w-3 h-3" />;
    case 'orchestrator':
      return <Bot className="w-3 h-3" />;
    case 'system_analyst':
      return <Cpu className="w-3 h-3" />;
    case 'neo4j_rca_tool':
      return <Waypoints className="w-3 h-3" />;
    case 'neo4j_schema_tool':
      return <Network className="w-3 h-3" />;
    case 'rdf_triplestore_tool':
      return <Boxes className="w-3 h-3" />;
    case 'knowledge_base_tool':
      return <BookOpen className="w-3 h-3" />;
    case 'end':
      return <ShieldCheck className="w-3 h-3" />;
    default:
      return <Workflow className="w-3 h-3" />;
  }
};

const getNodeColorClasses = (nodeId: string, status: 'active' | 'completed' | 'waiting') => {
  if (status === 'active') {
    return {
      bg: 'bg-amber-500/20',
      border: 'border-amber-400 ring-1 ring-amber-400/50',
      text: 'text-amber-300 font-semibold',
      iconBg: 'bg-amber-400 text-slate-950',
    };
  }

  // Completed / standard status
  switch (nodeId) {
    case 'start':
      return {
        bg: 'bg-emerald-950/50',
        border: 'border-emerald-600/40',
        text: 'text-emerald-300',
        iconBg: 'bg-emerald-600/30 text-emerald-300',
      };
    case 'operator':
      return {
        bg: 'bg-indigo-950/50',
        border: 'border-indigo-600/40',
        text: 'text-indigo-300',
        iconBg: 'bg-indigo-600/30 text-indigo-300',
      };
    case 'orchestrator':
      return {
        bg: 'bg-amber-950/50',
        border: 'border-amber-600/40',
        text: 'text-amber-300',
        iconBg: 'bg-amber-600/30 text-amber-300',
      };
    case 'system_analyst':
      return {
        bg: 'bg-cyan-950/50',
        border: 'border-cyan-600/40',
        text: 'text-cyan-300',
        iconBg: 'bg-cyan-600/30 text-cyan-300',
      };
    case 'neo4j_rca_tool':
      return {
        bg: 'bg-cyan-950/50',
        border: 'border-cyan-600/40',
        text: 'text-cyan-300',
        iconBg: 'bg-cyan-600/30 text-cyan-300',
      };
    case 'neo4j_schema_tool':
      return {
        bg: 'bg-sky-950/50',
        border: 'border-sky-600/40',
        text: 'text-sky-300',
        iconBg: 'bg-sky-600/30 text-sky-300',
      };
    case 'rdf_triplestore_tool':
      return {
        bg: 'bg-purple-950/50',
        border: 'border-purple-600/40',
        text: 'text-purple-300',
        iconBg: 'bg-purple-600/30 text-purple-300',
      };
    case 'knowledge_base_tool':
      return {
        bg: 'bg-emerald-950/50',
        border: 'border-emerald-600/40',
        text: 'text-emerald-300',
        iconBg: 'bg-emerald-600/30 text-emerald-300',
      };
    case 'end':
      return {
        bg: 'bg-rose-950/50',
        border: 'border-rose-600/40',
        text: 'text-rose-300',
        iconBg: 'bg-rose-600/30 text-rose-300',
      };
    default:
      return {
        bg: 'bg-slate-900',
        border: 'border-slate-700',
        text: 'text-slate-300',
        iconBg: 'bg-slate-800 text-slate-400',
      };
  }
};

export const SessionNodeTrace: React.FC<SessionNodeTraceProps> = ({
  traceSteps,
  isRunning,
  activeNodeId,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedStep, setSelectedStep] = useState<LangGraphTraceStep | null>(null);

  // Auto-scroll horizontally as new nodes are sequentially appended
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        left: containerRef.current.scrollWidth,
        behavior: 'smooth',
      });
    }
  }, [traceSteps.length, activeNodeId]);

  if (!traceSteps || traceSteps.length === 0) {
    return (
      <div className="w-full px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <Workflow className="w-3 h-3 text-slate-500" />
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
            Session Trace:
          </span>
          <span className="text-slate-500 italic text-[10px]">
            Awaiting query initiation... Execution sequence will appear horizontally.
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-slate-800/80 text-[9px] text-slate-400 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          IDLE
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-900/95 border-b border-slate-800 px-3 py-1.5 shadow-inner select-none transition-all">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="flex items-center gap-1.5">
          <Workflow className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Live Execution Trace
          </span>
          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {traceSteps.length} {traceSteps.length === 1 ? 'step' : 'steps'}
          </span>
          <span className="text-[9px] text-slate-500 hidden sm:inline">
            (Click any node to inspect telemetry, reasoning & Cypher)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Zap className="w-2.5 h-2.5 text-amber-400" />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Horizontal Sequential Compact Pill Trail */}
      <div
        ref={containerRef}
        className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {traceSteps.map((step, idx) => {
          const colors = getNodeColorClasses(step.nodeId, step.status);
          const isCurrentActive = step.status === 'active';
          const isSelected = selectedStep?.id === step.id;

          return (
            <React.Fragment key={step.id}>
              {/* Compact Trace Pill */}
              <button
                type="button"
                id={`trace-step-${idx}`}
                onClick={() => setSelectedStep(prev => (prev?.id === step.id ? null : step))}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-all duration-200 cursor-pointer text-left ${
                  colors.bg
                } ${colors.border} ${
                  isSelected
                    ? 'ring-2 ring-amber-400 shadow-md shadow-amber-500/30 font-bold scale-[1.02]'
                    : isCurrentActive
                    ? 'shadow-sm shadow-amber-500/20 font-bold'
                    : 'opacity-90 hover:opacity-100 hover:scale-[1.01] font-medium'
                }`}
                title="Click to inspect node details"
              >
                {/* Step index badge */}
                <span className="text-[8.5px] font-mono opacity-60">
                  {idx + 1}.
                </span>

                {/* Micro Icon */}
                <div
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${colors.iconBg}`}
                >
                  {getNodeIcon(step.nodeId)}
                </div>

                {/* Node Name */}
                <span className={`whitespace-nowrap ${colors.text}`}>
                  {step.label}
                </span>

                {/* Enriched Mode Tag Badge */}
                {step.mode && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] font-mono uppercase tracking-wider bg-slate-900/80 text-amber-300 border border-amber-500/30">
                    {step.mode}
                  </span>
                )}

                {/* Enriched Action Tag */}
                {step.actionSummary && !step.mode && (
                  <span className="px-1 py-0.2 rounded text-[7.5px] font-mono bg-slate-900/70 text-cyan-300 border border-cyan-500/30 max-w-[90px] truncate">
                    {step.actionSummary}
                  </span>
                )}

                {/* Status Dot / Check */}
                {isCurrentActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0 opacity-80" />
                )}
              </button>

              {/* Sequential Connector Arrow */}
              {idx < traceSteps.length - 1 && (
                <div className="flex-shrink-0 flex items-center text-slate-600">
                  <ChevronRight className="w-3 h-3 text-slate-500/80" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Enriched Step Inspector Panel (Opens when any trace pill is clicked) */}
      {selectedStep && (
        <div className="mt-1.5 p-2 rounded-lg bg-slate-950 border border-slate-700/80 text-xs shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                {getNodeIcon(selectedStep.nodeId)}
              </div>
              <div>
                <span className="font-bold text-slate-100 text-xs">{selectedStep.label}</span>
                <span className="ml-2 font-mono text-[9px] text-slate-400">Node ID: {selectedStep.nodeId}</span>
              </div>
              {selectedStep.mode && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  MODE: {selectedStep.mode}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">{selectedStep.timestamp}</span>
              <button
                type="button"
                onClick={() => setSelectedStep(null)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
                title="Close inspector"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            {/* Left Column: Decision & Reasoning */}
            <div className="space-y-1.5">
              {selectedStep.decision && (
                <div>
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Decision / Routing:</span>
                  <p className="text-slate-200 bg-slate-900/80 p-1.5 rounded border border-slate-800 font-medium text-[11px]">
                    {selectedStep.decision}
                  </p>
                </div>
              )}
              {selectedStep.reasoning && (
                <div>
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Reasoning / Justification:</span>
                  <div className="text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80 italic text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
                    "{selectedStep.reasoning}"
                  </div>
                </div>
              )}
              {selectedStep.nextTarget && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-0.5">
                  <span className="font-semibold uppercase tracking-wider text-[9.5px]">Target Node:</span>
                  <ArrowRight className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
                    {selectedStep.nextTarget === 'neo4j_rca_tool'
                      ? 'Neo4j Cypher (ToolNode)'
                      : selectedStep.nextTarget === 'system_analyst'
                      ? 'System Analyst'
                      : selectedStep.nextTarget === 'orchestrator'
                      ? 'Orchestrator'
                      : selectedStep.nextTarget === 'operator'
                      ? 'Operator (HITL)'
                      : selectedStep.nextTarget.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Right Column: Details & Cypher */}
            <div className="space-y-1.5">
              {selectedStep.actionSummary && (
                <div>
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Action Summary:</span>
                  <p className="text-emerald-300 bg-emerald-950/30 p-1.5 rounded border border-emerald-800/40 font-mono text-[10.5px]">
                    {selectedStep.actionSummary}
                  </p>
                </div>
              )}
              {selectedStep.detail && !selectedStep.actionSummary && (
                <div>
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider block">Details:</span>
                  <p className="text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800/80 text-[11px] leading-relaxed whitespace-pre-wrap">
                    {selectedStep.detail}
                  </p>
                </div>
              )}
              {selectedStep.cypher && (
                <div>
                  <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-cyan-400" />
                    Executed Cypher Query:
                  </span>
                  <pre className="text-cyan-300 bg-slate-900/90 p-2 rounded border border-cyan-800/40 font-mono text-[10px] overflow-x-auto max-h-32 scrollbar-thin whitespace-pre-wrap">
                    {selectedStep.cypher}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
