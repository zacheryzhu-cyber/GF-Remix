import React, { useState, useCallback, useEffect } from 'react';
import {
  Workflow,
  Sparkles,
  Columns,
  MessageSquare,
  RotateCcw,
  SlidersHorizontal,
  Bot,
  Brain,
  Layers,
  Zap,
  Info,
} from 'lucide-react';
import { ForgeCanvas, ForgeNode, ForgeEdge } from '../components/agent_forge/ForgeCanvas';
import { ForgeChat, ForgeChatMessage, extractAudioBriefAndCleanText } from '../components/agent_forge/ForgeChat';
import { speakJarvis, stopJarvis, JarvisVoiceId } from '../utils/jarvisVoice';

// Module-level cache: persists across in-app page navigation (just like AgentHive),
// but resets cleanly when the user hits the delete/reset button or reloads the browser.
let cachedForgeMessages: ForgeChatMessage[] | null = null;
let cachedForgeThreadId: string = `forge-v2-${Math.random().toString(36).substring(2, 9)}`;
let cachedForgeNodes: ForgeNode[] | null = null;
let cachedForgeEdges: ForgeEdge[] | null = null;

// Pipeline layout: START -> Deep Agent -> END, with attached Neo4j Aura Tool nodes
const INITIAL_FORGE_NODES: ForgeNode[] = [
  {
    id: 'start',
    type: 'start',
    label: 'Pipeline Entrypoint',
    sublabel: '__start__',
    x: 60,
    y: 200,
    status: 'idle',
    description: 'Graph entrypoint receiving operator queries, system telemetry events, or incident triggers.',
    model: 'N/A',
    temperature: 0,
    maxIterations: 1,
    systemPrompt: 'Graph initializer. Prepares context and forwards execution state directly to Deep Agent.',
    inputs: ['user_query', 'telemetry_state'],
    outputs: ['initialized_state'],
  },
  {
    id: 'deep_agent',
    type: 'deep_agent',
    label: 'Deep Agent',
    sublabel: 'AUTONOMOUS REASONER',
    x: 360,
    y: 180,
    status: 'idle',
    description: 'Autonomous multi-step reasoning agent with chain-of-thought hypothesis testing, facility digital twin graph querying, and RCA.',
    model: 'gemini-3.5-flash-lite',
    temperature: 0.2,
    maxIterations: 10,
    systemPrompt: `You specialize in cleanroom engineering principles, facility utilities (UPW, CDA, Chilled Water, Exhaust, High-Voltage Power), semiconductor fabrication operations, and general technical inquiries.
- Native planning & scratchpad: "write_todos", in-memory filesystem (read_file, write_file, edit_file, ls, glob, grep).
- Facility tools (Neo4j Aura live graph):
  1. "neo4j_schema_introspect": Discovers live database schema (labels, relationships, topology).
  2. "neo4j_cypher_query": Executes Cypher queries against live equipment graph.
- Rule: Call "neo4j_schema_introspect" before your first query to discover exact node labels.`,
    inputs: ['initialized_state', 'messages'],
    outputs: ['reasoning_trace', 'final_answer', 'action_plan'],
    tools: [
      'neo4j_schema_introspect',
      'neo4j_cypher_query',
      'write_todos',
      'read_file',
      'write_file',
      'edit_file',
      'ls',
      'glob',
      'grep',
    ],
  },
  {
    id: 'tool_schema',
    type: 'tool',
    iconType: 'schema',
    label: 'Schema Introspect',
    sublabel: 'schema_introspect',
    x: 380,
    y: 40,
    status: 'idle',
    description: 'Live facility twin schema introspection tool. Extracts labels, relationship predicates, and active database structure.',
    model: 'Tool Binding',
    temperature: 0,
    maxIterations: 1,
    systemPrompt: 'Discovers live database schema (labels, property keys, relationships). Called before issuing queries.',
    inputs: ['void'],
    outputs: ['schema_json', 'node_labels', 'relationships'],
    tools: ['neo4j_schema_introspect'],
  },
  {
    id: 'tool_cypher',
    type: 'tool',
    iconType: 'cypher',
    label: 'Graph Query',
    sublabel: 'graph_query',
    x: 380,
    y: 380,
    status: 'idle',
    description: 'Live facility twin graph query execution tool. Traverses equipment nodes, upstream/downstream paths, and rationalized alarms.',
    model: 'Tool Binding',
    temperature: 0,
    maxIterations: 1,
    systemPrompt: 'Executes parameterized queries against the live digital twin cloud instance.',
    inputs: ['cypher_query'],
    outputs: ['graph_records', 'dependency_chains'],
    tools: ['neo4j_cypher_query'],
  },
  {
    id: 'end',
    type: 'end',
    label: 'Resolution Output',
    sublabel: '__end__',
    x: 690,
    y: 200,
    status: 'idle',
    description: 'Terminal node returning synthesized diagnostic report, verified OCAP, or recommendations to the operator.',
    model: 'N/A',
    temperature: 0,
    maxIterations: 1,
    systemPrompt: 'Graph finalizer. Formats and persists final execution outputs.',
    inputs: ['final_answer'],
    outputs: ['completed_turn'],
  },
];

const INITIAL_FORGE_EDGES: ForgeEdge[] = [
  {
    id: 'edge-start-deep',
    from: 'start',
    to: 'deep_agent',
    label: 'initiate_turn()',
    isActive: false,
  },
  {
    id: 'edge-deep-schema',
    from: 'deep_agent',
    to: 'tool_schema',
    label: 'introspect()',
    isActive: false,
  },
  {
    id: 'edge-deep-cypher',
    from: 'deep_agent',
    to: 'tool_cypher',
    label: 'query()',
    isActive: false,
  },
  {
    id: 'edge-deep-end',
    from: 'deep_agent',
    to: 'end',
    label: 'yield_response()',
    isActive: false,
  },
];

const INITIAL_FORGE_MESSAGES: ForgeChatMessage[] = [
  {
    id: 'msg-f-0',
    sender: 'system',
    senderName: 'System',
    text: '⚡ Agent Forge environment initialized with isolated 3-node graph (START → Deep Agent → END). Connected to facility digital twin with schema introspection & query execution.',
    timestamp: 'Just now',
  },
  {
    id: 'msg-f-1',
    sender: 'deep_agent',
    senderName: 'Deep Agent',
    text: `Hello Operator! I am the Deep Agent in Agent Forge.\n\nI am configured with Gemini 3.8 Flash, an in-memory scratchpad, and direct query access to the live facility digital twin graph via two dedicated tools:\n1. 🔍 \`schema_introspect\`: To inspect asset labels and relationship topology\n2. ⚡ \`graph_query\`: To query equipment, alarms, and upstream/downstream dependencies\n\nAsk me about cleanroom systems, equipment dependencies, or query the live graph!`,
    timestamp: 'Just now',
    thoughtProcess: [
      'Loaded isolated pipeline: START → Deep Agent → END',
      'Cognitive architecture: Deep Reasoning Agent with scratchpad & memory checkpointer',
      'Equipped tools: schema_introspect, graph_query',
    ],
  },
];

export const AgentForge: React.FC = () => {
  const [nodes, setNodesState] = useState<ForgeNode[]>(() => cachedForgeNodes || INITIAL_FORGE_NODES);
  const [edges, setEdgesState] = useState<ForgeEdge[]>(() => cachedForgeEdges || INITIAL_FORGE_EDGES);
  const [messages, setMessagesState] = useState<ForgeChatMessage[]>(() => cachedForgeMessages || INITIAL_FORGE_MESSAGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('deep_agent');
  const [layoutMode, setLayoutMode] = useState<'split' | 'canvas' | 'chat'>('split');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [isJarvisEnabled, setIsJarvisEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('forge_voice_enabled');
      return saved !== null ? saved === 'true' : false; // Default OFF to save API calls
    } catch {
      return false;
    }
  });

  const [selectedVoice, setSelectedVoice] = useState<JarvisVoiceId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge_voice_preference');
      if (saved && ['Aoede', 'Kore', 'Zephyr', 'Fenrir', 'Charon', 'Puck'].includes(saved)) {
        return saved as JarvisVoiceId;
      }
    }
    return 'Aoede';
  });

  useEffect(() => {
    return () => {
      stopJarvis();
    };
  }, []);

  const handleToggleJarvis = () => {
    setIsJarvisEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('forge_voice_enabled', String(next));
      } catch {}
      if (!next) {
        stopJarvis();
      }
      return next;
    });
  };

  // Dedicated session thread ID with clear namespacing (persists across navigation)
  const [threadId, setThreadIdState] = useState<string>(() => cachedForgeThreadId);

  const setMessages = useCallback((updater: React.SetStateAction<ForgeChatMessage[]>) => {
    setMessagesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedForgeMessages = next;
      return next;
    });
  }, []);

  const setNodes = useCallback((updater: React.SetStateAction<ForgeNode[]>) => {
    setNodesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedForgeNodes = next;
      return next;
    });
  }, []);

  const setEdges = useCallback((updater: React.SetStateAction<ForgeEdge[]>) => {
    setEdgesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedForgeEdges = next;
      return next;
    });
  }, []);

  const setThreadId = useCallback((newId: string) => {
    cachedForgeThreadId = newId;
    setThreadIdState(newId);
  }, []);

  const handleUpdateNodePosition = (id: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, x, y } : n)));
  };

  const handleResetPositions = () => {
    setNodes(INITIAL_FORGE_NODES);
  };

  // Full reset: resets backend thread memory, resets all node and edge visual states to idle, and clears chat history
  const handleClearChat = async () => {
    const prevThread = threadId;
    const newThread = `forge-v2-${Math.random().toString(36).substring(2, 9)}`;
    setThreadId(newThread);

    try {
      await fetch('/api/agent-forge/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: prevThread }),
      });
    } catch (err) {
      console.warn('[AGENT FORGE] Failed to reset backend thread checkpoint:', err);
    }

    // Reset visual state of canvas (active nodes, edges, selection)
    setActiveNodeId(null);
    setActiveEdgeId(null);
    setSelectedNodeId('deep_agent');
    setNodes(INITIAL_FORGE_NODES.map(n => ({ ...n, status: 'idle' })));
    setEdges(INITIAL_FORGE_EDGES.map(e => ({ ...e, isActive: false })));

    setMessages([
      {
        id: `msg-clear-${Date.now()}`,
        sender: 'system',
        senderName: 'System',
        text: '⚡ Agent Forge session cleared, graph state reset to idle, and memory checkpoint flushed.',
        timestamp: 'Just now',
      },
    ]);
  };

  // Real execution of 3-node LangGraph: START -> deep_agent -> END via SSE stream
  const handleExecuteTurn = async (userQuery: string = 'Hello Deep Agent') => {
    if (isRunning || !userQuery.trim()) return;

    setIsRunning(true);

    // 1. Add operator message to chat
    const userMsg: ForgeChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'operator',
      senderName: 'Operator',
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);

    // Animate START Node immediately
    setActiveNodeId('start');
    setActiveEdgeId('edge-start-deep');
    setNodes(prev =>
      prev.map(n =>
        n.id === 'start' ? { ...n, status: 'active' } : { ...n, status: 'idle' }
      )
    );

    // If this is a SCADA telemetry warning, ensure active alarm states are seeded into Neo4j
    if (userQuery.includes('SCADA TELEMETRY WARNING') || userQuery.includes('TOOL-LITHO-01 (Laser Cavity Temp Alarm)')) {
      try {
        await fetch('/api/neo4j/alarms/create', { method: 'POST' });
      } catch (err) {
        console.warn('Failed to sync Neo4j alarms:', err);
      }
    }

    try {
      const response = await fetch('/api/agent-forge/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          threadId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: Failed to connect to stream`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let thoughtsAccumulator: string[] = [];
      const streamingMsgId = `msg-agent-${Date.now()}`;
      let accumulatedReply = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payloadStr = trimmed.replace(/^data:\s*/, '');
          if (payloadStr === '[DONE]') continue;

          try {
            const data = JSON.parse(payloadStr);

            if (data.type === 'node_transition') {
              if (data.to === 'deep_agent') {
                setActiveNodeId('deep_agent');
                setActiveEdgeId(data.from === 'start' ? 'edge-start-deep' : null);
                setNodes(prev =>
                  prev.map(n =>
                    n.id === 'deep_agent'
                      ? { ...n, status: 'active' }
                      : { ...n, status: 'idle' }
                  )
                );
              } else if (data.to === 'tool_schema') {
                setActiveNodeId('tool_schema');
                setActiveEdgeId('edge-deep-schema');
                setNodes(prev =>
                  prev.map(n =>
                    n.id === 'tool_schema'
                      ? { ...n, status: 'active' }
                      : n.id === 'deep_agent'
                      ? { ...n, status: 'active' }
                      : { ...n, status: 'idle' }
                  )
                );
              } else if (data.to === 'tool_cypher') {
                setActiveNodeId('tool_cypher');
                setActiveEdgeId('edge-deep-cypher');
                setNodes(prev =>
                  prev.map(n =>
                    n.id === 'tool_cypher'
                      ? { ...n, status: 'active' }
                      : n.id === 'deep_agent'
                      ? { ...n, status: 'active' }
                      : { ...n, status: 'idle' }
                  )
                );
              } else if (data.to === 'end') {
                setActiveNodeId('end');
                setActiveEdgeId('edge-deep-end');
                setNodes(prev =>
                  prev.map(n =>
                    n.id === 'end' ? { ...n, status: 'active' } : { ...n, status: 'idle' }
                  )
                );
              }
            } else if (data.type === 'token') {
              const tokenContent = data.content || '';
              if (tokenContent) {
                accumulatedReply += tokenContent;
              }
            } else if (data.type === 'thoughts') {
              thoughtsAccumulator = data.thoughts || [];
            } else if (data.type === 'complete') {
              setActiveNodeId('end');
              setActiveEdgeId(null);
              setNodes(prev =>
                prev.map(n =>
                  n.id === 'end' ? { ...n, status: 'active' } : { ...n, status: 'idle' }
                )
              );

              const finalReplyText = data.reply || accumulatedReply || 'No response generated.';
              const agentReply: ForgeChatMessage = {
                id: streamingMsgId,
                sender: 'deep_agent',
                senderName: 'Deep Agent',
                text: finalReplyText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                thoughtProcess: data.thoughtProcess || thoughtsAccumulator,
                graphData: data.graphData,
                cypherQuery: data.cypherQuery,
              };
              setMessages(prev => [...prev, agentReply]);

              // Speak concise executive briefing if voice enabled
              if (isJarvisEnabled && finalReplyText) {
                const { audioBrief } = extractAudioBriefAndCleanText(finalReplyText);
                speakJarvis(audioBrief || finalReplyText, { voiceName: selectedVoice });
              }
            } else if (data.type === 'error') {
              throw new Error(data.error || 'Server error occurred');
            }
          } catch (e: any) {
            console.warn('[AGENT FORGE] Error parsing stream chunk:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('[AGENT FORGE] Stream invocation error:', err);
      const errMsg: ForgeChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'system',
        senderName: 'System',
        text: `Execution failed: ${err.message || 'Network error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        setActiveNodeId(null);
        setActiveEdgeId(null);
        setNodes(prev => prev.map(n => ({ ...n, status: 'idle' })));
      }, 800);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Banner / Controls Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-600 flex items-center justify-center shadow-xs">
            <Brain className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Agent Forge
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-800 rounded-full border border-violet-200">
                Isolated Studio
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                Pure UI Only
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Start → Deep Agent → End
              </span>
            </div>
          </div>
        </div>

        {/* View Layout Switcher */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setLayoutMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>
            <button
              onClick={() => setLayoutMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'canvas'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => setLayoutMode('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                layoutMode === 'chat'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Agent Console</span>
            </button>
          </div>

          <button
            onClick={handleResetPositions}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
            title="Reset Canvas Layout Positions"
          >
            <RotateCcw className="w-4 h-4" />
          </button>


        </div>
      </div>

      {/* Main Interactive Workspace */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[600px] h-[calc(100vh-250px)]">
        {/* Canvas Area */}
        {(layoutMode === 'split' || layoutMode === 'canvas') && (
          <div
            className={`${
              layoutMode === 'split' ? 'lg:col-span-7 h-[500px] lg:h-full' : 'lg:col-span-12 h-full'
            } transition-all duration-200`}
          >
            <ForgeCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onUpdateNodePosition={handleUpdateNodePosition}
              onResetPositions={handleResetPositions}
              isRunning={isRunning}
              activeNodeId={activeNodeId}
              activeEdgeId={activeEdgeId}
            />
          </div>
        )}

        {/* Chat / Console Area */}
        {(layoutMode === 'split' || layoutMode === 'chat') && (
          <div
            className={`${
              layoutMode === 'split' ? 'lg:col-span-5 h-[550px] lg:h-full' : 'lg:col-span-12 h-full'
            } flex flex-col min-h-0 overflow-hidden transition-all duration-200`}
          >
            <ForgeChat
              messages={messages}
              onSendMessage={handleExecuteTurn}
              onClearChat={handleClearChat}
              isRunning={isRunning}
              isJarvisEnabled={isJarvisEnabled}
              onToggleJarvis={handleToggleJarvis}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
            />
          </div>
        )}
      </div>
    </div>
  );
};
