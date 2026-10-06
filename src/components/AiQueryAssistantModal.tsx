import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ShieldCheck,
  Activity,
  Layers,
  HelpCircle,
  Cpu,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  FileDown,
  Terminal,
  Zap,
  Wrench,
  ArrowRight,
  Lock,
  HardHat,
  CheckCircle2,
  Calendar,
  Filter,
  Loader2
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useFacility } from '../context/FacilityContext';

interface CmmsMatchedItem {
  id: string;
  type: 'permit' | 'ticket';
  title: string;
  status: string;
  location: string;
  permitType?: string;
  priority?: string;
  workOrderId?: string;
  shiftLabel?: string;
  shiftWindow?: string;
  lotoTagNumber?: string;
  safetyPrecautions?: string[];
  ppeRequired?: string[];
  assignedOwner?: string;
  description?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keyTakeaways?: string[];
  relevantStandards?: string[];
  suggestedFollowUps?: string[];
  matchedCmmsItems?: CmmsMatchedItem[];
  timestamp: string;
  isAiGenerated?: boolean;
  workflowExecutionRequest?: {
    workflowId: string;
    workflowName: string;
    steps: string[];
  };
}

interface PresetQueryItem {
  category: string;
  query: string;
}

const PRESET_CATEGORIES = [
  'All Categories',
  'CMMS & Work Permits',
  'Ultra-Pure Water (UPW)',
  'SPC & CPK Mathematics',
  'Safety & LOTO Protocols',
  'Cleanroom ISO & Particulates',
  'HVAC & Chiller Redundancy',
  'Gas & Chemical Safety',
  'Workflow Engine Tools',
];

const PRESET_QUERIES: PresetQueryItem[] = [
  {
    category: 'CMMS & Work Permits',
    query: 'Show me work permits related to ultra pure water',
  },
  {
    category: 'SPC & CPK Mathematics',
    query: 'Explain the mathematical formula and difference between Cp, Cpk, and Ppk for semiconductor cleanroom parameter monitoring.',
  },
  {
    category: 'General',
    query: 'Show me all MOC related to alarm changes for pH?',
  },
  {
    category: 'General',
    query: 'Summarize all HVAC related alarms that triggered in the previous shift?',
  },
  {
    category: 'General',
    query: 'Summarize all the instances when Cpk < 1.33 in the past 2 shifts?',
  },
  {
    category: 'General',
    query: 'Show all Work orders that have been opened > 3 days?',
  },
  {
    category: 'General',
    query: 'What is the target clean room relative humidity?',
  },
];


const WorkflowExecutionWidget = ({
  request,
  onExecute,
}: {
  request: { workflowId: string; workflowName: string; steps: string[] };
  onExecute: (workflowId: string) => void;
}) => {
  const [status, setStatus] = useState<'pending' | 'running' | 'completed' | 'cancelled'>('pending');
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  useEffect(() => {
    if (status === 'running') {
      let step = 0;
      setCurrentStepIndex(0);
      const timer = setInterval(() => {
        step++;
        if (step >= request.steps.length) {
          clearInterval(timer);
          setStatus('completed');
          onExecute(request.workflowId);
        } else {
          setCurrentStepIndex(step);
        }
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [status, request.steps.length, request.workflowId, onExecute]);

  if (status === 'cancelled') {
    return (
      <div className="mt-4 p-4 border rounded-xl bg-slate-50 text-slate-500 text-sm">
        Workflow execution cancelled by user.
      </div>
    );
  }

  return (
    <div className="mt-4 mb-4 border rounded-xl overflow-hidden bg-slate-50">
      <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-indigo-900 text-sm">
            Action Required: Execute {request.workflowName}?
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-3">
        {status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => setStatus('running')}
              className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition flex items-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" /> Yes, Execute
            </button>
            <button
              onClick={() => setStatus('cancelled')}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition flex items-center gap-2 text-sm"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        )}

        {(status === 'running' || status === 'completed') && (
          <div className="space-y-2">
            {request.steps.map((step, idx) => {
              const isCompleted = status === 'completed' || idx < currentStepIndex;
              const isCurrent = status === 'running' && idx === currentStepIndex;
              
              return (
                <div key={idx} className={`flex items-start gap-2 text-sm transition-colors duration-300 ${
                  isCompleted ? 'text-emerald-700' : isCurrent ? 'text-indigo-700 font-medium' : 'text-slate-500'
                }`}>
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                    )}
                  </div>
                  <span>{step}</span>
                </div>
              );
            })}
            
            {status === 'completed' && (
              <div className="mt-4 pt-3 border-t border-slate-200 text-emerald-700 font-medium flex items-center gap-2">
                <Check className="w-4 h-4" /> Workflow executed successfully
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const AiQueryAssistantModal: React.FC = () => {
  const {
    isAiAssistantOpen,
    closeAiAssistant,
    aiAssistantInitialQuery,
    alarms,
    tickets,
    workPermits,
    openCmmsItem,
    shiftReport,
    liveUpwResistivity,
    liveCleanroomTemp,
    liveCleanroomRh,
    liveParticleCount01,
    createTicket,
    showToast,
    workflows,
    executeWorkflow,
  } = useFacility();

  const [inputQuery, setInputQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [includePlantContext, setIncludePlantContext] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredQueries = selectedCategory === 'All Categories'
    ? PRESET_QUERIES
    : PRESET_QUERIES.filter(q => q.category === selectedCategory);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isAiAssistantOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isAiAssistantOpen]);

  // Handle initial query if passed via context
  useEffect(() => {
    if (isAiAssistantOpen) {
      if (aiAssistantInitialQuery && messages.length === 0) {
        handleExecuteQuery(aiAssistantInitialQuery);
      } else if (messages.length === 0) {
        // Welcome message
        setMessages([
          {
            id: 'welcome-1',
            role: 'assistant',
            content: `### Welcome to Ops Copilot 👋

I am your **Ops Copilot**, pre-trained and contextualized for **Semiconductor Cleanrooms, Facilities Engineering, and Industrial Operations**.

You can ask me:
- **CMMS & Work Permits**: e.g., *"Show me work permits related to ultra pure water"*, *"Find active Hot Work permits in Subfab"*.
- **Statistical Process Control & Quality**: $C_p$, $C_{pk}$, $P_{pk}$ formulas, Six Sigma tolerances, and out-of-control rules.
- **Facility Systems**: UPW (18.2 MΩ·cm), Cleanroom HVAC & FFU, CDA, Scrubber systems, Central Chiller Plants ($N+1$), and Specialty Gases (TGM/TCM).
- **Safety, Standards & Protocols**: SEMI S2, ISO 14644-1, NFPA 318, IEC 62682 alarm rationalization, and LOTO hazardous energy isolation.

*Tip: All work permit and work order query responses contain **clickable direct links** that navigate straight to the record in the CMMS page.*`,
            keyTakeaways: [
              "Integrated Industrial AI Engine with CMMS cross-system navigation.",
              "Live plant context includes multi-shift work permits (WP-88xx to WP-90xx), CMMS tickets, and real-time telemetry.",
              "Click any starter prompt below or enter a custom query."
            ],
            relevantStandards: ['SEMI S2-0818', 'ISO 14644-1:2015', 'ASTM D5127 (UPW)', 'OSHA 1910.147 (LOTO)'],
            suggestedFollowUps: [
              'Show me work permits related to ultra pure water',
              'Explain Cpk vs Ppk formula in cleanroom monitoring',
              'What are UPW 18.2 MΩ·cm critical recovery steps?'
            ],
            matchedCmmsItems: [
              {
                id: 'WP-8802',
                type: 'permit',
                workOrderId: 'WO-4102',
                title: 'UPW Polishing Loop Secondary Pump Mechanical Seal Overhaul',
                permitType: 'Cold Work',
                status: 'closed',
                location: 'Building 1 - SubFab Loop B (UPW Polish Room)',
                shiftWindow: 'Day Shift (07:00 - 19:00)',
                shiftLabel: 'Shift -1 (Previous Shift)',
                lotoTagNumber: 'LOTO-UPW-2026-0311',
              },
              {
                id: 'WP-9021',
                type: 'permit',
                workOrderId: 'WO-4102',
                title: 'Ultra Pure Water RO Membrane Array Module #4 Sanitization & Overhaul',
                permitType: 'Cold Work',
                status: 'pending approval',
                location: 'Building 1 - SubFab Loop B (RO Skid 4)',
                shiftWindow: 'Day Shift (07:00 - 19:00)',
                shiftLabel: 'Shift +1 (Upcoming Shift)',
                lotoTagNumber: 'LOTO-UPW-RO04-01',
              }
            ],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isAiGenerated: true,
          },
        ]);
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isAiAssistantOpen, aiAssistantInitialQuery]);

  if (!isAiAssistantOpen) return null;

  const handleExecuteQuery = async (queryToRun: string) => {
    const trimmed = queryToRun.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      // Build full context payload
      const contextData = {
        site: 'Singapore Fab-1',
        shift: shiftReport.shiftType,
        activeP1Alarms: alarms.filter(a => a.priority === 'P1' && a.status === 'Active').map(a => ({
          tag: a.tag,
          system: a.system,
          description: a.description,
          location: a.location,
        })),
        openTicketsCount: tickets.filter(t => t.status !== 'Closed').length,
        currentTelemetry: {
          upwResistivity: `${liveUpwResistivity} MOhm-cm`,
          cleanroomTemp: `${liveCleanroomTemp} °C`,
          cleanroomRh: `${liveCleanroomRh} %`,
          particleCount01um: `${liveParticleCount01} pcs/m3`,
        },
        workPermits: workPermits.map(p => ({
          id: p.id,
          title: p.title,
          permitType: p.permitType,
          status: p.status,
          location: p.location,
          shiftWindow: p.shiftWindow,
          shiftLabel: p.shiftLabel,
          workOrderId: p.workOrderId,
          safetyPrecautions: p.safetyPrecautions,
          lotoTagNumber: p.lotoTagNumber,
          gasChecksPpm: p.gasChecksPpm,
          ppeRequired: p.ppeRequired,
          rejectionReason: p.rejectionReason,
          closeoutNotes: p.closeoutNotes,
        })),
        tickets: tickets.map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          priority: t.priority,
          status: t.status,
          location: t.location,
          assignedOwner: t.assignedOwner,
          workOrderType: t.workOrderType,
          description: t.description,
        })),
        workflows: workflows.map(w => ({
          id: w.id,
          name: w.name,
          category: w.category,
          status: w.status,
          version: w.version,
          nodesCount: w.nodes.length,
          edgesCount: w.edges.length,
          nodes: w.nodes.map(n => ({
            id: n.id,
            type: n.type,
            title: n.title,
            description: n.description,
            config: n.config,
          })),
          edges: w.edges,
        })),
      };

      const historyPayload = messages
        .filter(m => m.id !== 'welcome-1')
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          text: m.content,
        }));

      const res = await fetch('/api/ai/general-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          history: historyPayload,
          context: contextData,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();



      const assistantMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Query completed with no direct output text.',
        keyTakeaways: data.keyTakeaways || [],
        relevantStandards: data.relevantStandards || [],
        suggestedFollowUps: data.suggestedFollowUps || [],
        matchedCmmsItems: data.matchedCmmsItems || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isAiGenerated: data.generatedByAI ?? true,
        workflowExecutionRequest: data.workflowExecutionRequest || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('LLM Query failed:', err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `**Query Processing Error:** Unable to retrieve information from the external LLM at this moment (${err.message || 'Network error'}). Please try again or rephrase your query.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteQuery(inputQuery);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Response copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateTicketFromResponse = (msg: Message) => {
    const title = msg.keyTakeaways?.[0] || 'AI Recommended Facility Action Plan';
    createTicket({
      title: `AI Action: ${title.slice(0, 70)}`,
      category: 'Cleanroom HVAC & FFU',
      priority: 'P2',
      status: 'Open',
      assignedOwner: 'Marcus Vance (HVAC System Owner)',
      source: 'AI Event Classifier',
      location: 'Fab 1 - Cleanroom Bay 3',
      description: `Generated from Ops Copilot Query:\n\n${msg.content}\n\nKey Takeaways:\n${(msg.keyTakeaways || []).map(t => `- ${t}`).join('\n')}`,
      workOrderType: 'CM (Corrective)',
      estimatedHours: 4,
      requiredPPE: ['Bunny Suit', 'Safety Glasses', 'ESD Shoes'],
    });
    showToast('Created CMMS maintenance ticket from LLM response');
  };

  const handleClearConversation = () => {
    setMessages([]);
    setInputQuery('');
    showToast('Conversation cleared');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[92vh] max-h-[880px] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Ops Copilot Knowledge &amp; CMMS Query Hub
                </h2>
              </div>
              <p className="text-[11px] text-slate-400">
                Semiconductor Cleanrooms, Ultra Pure Water, Work Permits &amp; Facilities Knowledge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearConversation}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs flex items-center gap-1 transition"
              title="Clear Conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            <button
              onClick={closeAiAssistant}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Context Toggle Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Live Fab Context: <strong>Singapore Fab-1</strong> &bull; Shift: <strong>{shiftReport.shiftType}</strong> &bull; UPW: <strong>{liveUpwResistivity} MΩ·cm</strong>
            </span>
          </div>
        </div>

        {/* Conversation Thread Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start w-full'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Bot className="w-4 h-4 text-amber-200" />
                </div>
              )}

              <div
                className={`rounded-2xl p-4 sm:p-5 text-sm space-y-3 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs max-w-xl'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs w-full'
                }`}
              >
                {/* Header inside Bubble */}
                <div className="flex items-center justify-between gap-2 border-b pb-2 text-[11px] opacity-80 border-current/15">
                  <span className="font-bold">
                    {msg.role === 'user' ? 'Operator Query' : 'FabCore LLM Engine'}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-600 transition"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.workflowExecutionRequest && (
                  <WorkflowExecutionWidget request={msg.workflowExecutionRequest} onExecute={executeWorkflow} />
                )}
                {/* Main Content Body with Clickable Protocol Links */}
                <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  <Markdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-900 mt-4 mb-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-900 mt-4 mb-2" {...props} />,
                      h4: ({node, ...props}) => <h4 className="text-sm font-bold text-slate-900 mt-3 mb-1" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 space-y-1 mb-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 space-y-1 mb-2" {...props} />,
                      li: ({node, ...props}) => <li className="" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                      em: ({node, ...props}) => <em className="italic" {...props} />,
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match && !String(children).includes('\n');
                        return isInline ? (
                          <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-slate-800 text-slate-50 p-3 rounded-lg overflow-x-auto font-mono text-xs my-2">
                            <code className={className} {...props}>{children}</code>
                          </pre>
                        )
                      },
                      a: ({ node, ...props }) => {
                        const href = props.href || '';
                        const isPermit = href.startsWith('permit:');
                        const isTicket = href.startsWith('ticket:');
                        
                        if (isPermit || isTicket) {
                          const id = href.replace(isPermit ? 'permit:' : 'ticket:', '');
                          return (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                openCmmsItem(isPermit ? 'permit' : 'ticket', id);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 mx-1 my-0.5 rounded-md font-mono font-bold text-xs border transition cursor-pointer shadow-2xs ${
                                isPermit
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                              title={`Click to open ${isPermit ? 'Work Permit' : 'Work Order'} ${id} in CMMS`}
                            >
                              {isPermit ? (
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              )}
                              <span>{props.children}</span>
                              <ArrowRight className="w-3 h-3 opacity-70" />
                            </button>
                          );
                        }
                        return <a {...props} className="text-emerald-600 font-semibold hover:underline" target="_blank" rel="noreferrer" />;
                      },
                    }}
                  >
                    {msg.content}
                  </Markdown>
                </div>

                {/* Matched CMMS Cards (Permits and Work Orders) */}
                {msg.matchedCmmsItems && msg.matchedCmmsItems.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Matched CMMS Records &amp; Work Permits ({msg.matchedCmmsItems.length})</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold">Click to open in CMMS page ↗</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {msg.matchedCmmsItems.map(item => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 hover:border-emerald-400 rounded-xl p-3 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-2 group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-mono font-bold text-xs text-emerald-600 group-hover:underline">
                                {item.id}
                              </span>
                              <div className="flex items-center gap-1">
                                {item.permitType && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                    {item.permitType}
                                  </span>
                                )}
                                {item.priority && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                    {item.priority}
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.status?.toLowerCase() === 'closed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.status?.toLowerCase() === 'open'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                              {item.title}
                            </h5>

                            <div className="text-[11px] text-slate-500 space-y-0.5">
                              <p className="truncate">📍 {item.location}</p>
                              {item.shiftWindow && (
                                <p className="font-mono text-[10px] text-slate-600">
                                  ⏰ {item.shiftWindow} {item.shiftLabel ? `(${item.shiftLabel})` : ''}
                                </p>
                              )}
                              {item.lotoTagNumber && (
                                <p className="font-mono text-[10px] text-emerald-700">
                                  🔒 LOTO: {item.lotoTagNumber}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            {item.workOrderId ? (
                              <span className="text-[10px] font-mono text-slate-500">
                                WO: {item.workOrderId}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">CMMS Record</span>
                            )}

                            <button
                              onClick={() => openCmmsItem(item.type, item.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-md text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <span>Open in CMMS</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Takeaways Box (if assistant) */}
                {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-1.5 mt-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Key Takeaways &amp; Highlights</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700 list-disc list-inside">
                      {msg.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="leading-snug">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Relevant Standards */}
                {msg.relevantStandards && msg.relevantStandards.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">Standards:</span>
                    {msg.relevantStandards.map((std, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      >
                        {std}
                      </span>
                    ))}
                  </div>
                )}

                {/* Follow-up Question Chips */}
                {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Suggested Follow-Ups:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((fu, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleExecuteQuery(fu)}
                          className="text-left text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg transition flex items-center gap-1 group"
                        >
                          <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                          <span>{fu}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Bar for Assistant Responses */}
                {msg.role === 'assistant' && msg.id !== 'welcome-1' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleCreateTicketFromResponse(msg)}
                      className="text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Create Work Order from this Answer</span>
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator with Thinking Animation */}
          {isLoading && (
            <div className="flex gap-3 max-w-2xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4 text-amber-200 animate-spin" />
              </div>
              <div className="bg-white border border-emerald-200 rounded-2xl rounded-bl-xs p-4 text-sm text-slate-700 shadow-xs space-y-2 w-full">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>External LLM is querying live CMMS &amp; facility records...</span>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-100 rounded w-4/6"></div>
                  <div className="h-3 bg-slate-100 rounded w-3/6"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions / Prompt Starters Dropdowns (similar to LPG Query Engine) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Load Quick Prompt Starter</span>
                </h4>
                {selectedPrompt && (
                  <span className="text-[10px] text-emerald-600 font-semibold">Loaded into prompt</span>
                )}
              </div>
              <select
                className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded px-3 py-2 focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
                onChange={(e) => {
                  if (e.target.value) {
                    setInputQuery(e.target.value);
                    setSelectedPrompt(e.target.value);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }
                }}
                value={selectedPrompt}
              >
                <option value="" disabled>-- Select a quick prompt starter --</option>
                {filteredQueries.map((q, idx) => (
                  <option key={idx} value={q.query}>
                    {idx + 1}. {q.query.length > 68 ? q.query.substring(0, 65) + "..." : q.query}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>Filter by Category</span>
              </h4>
              <select
                className="w-full bg-white border border-slate-300 text-slate-700 text-xs rounded px-3 py-2 focus:outline-none focus:border-emerald-500 shadow-sm font-medium"
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedPrompt("");
                }}
                value={selectedCategory}
              >
                {PRESET_CATEGORIES.map((c, idx) => (
                  <option key={idx} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Query Input Area */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleExecuteQuery(inputQuery);
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about work permits, ultra pure water, cleanrooms, CPK, or engineering... (Press Enter to send)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none transition"
              />
              <div className="absolute right-2.5 bottom-2.5 text-[10px] text-slate-400 font-mono">
                ↵ Enter
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className={`p-3 rounded-xl font-bold transition flex items-center justify-center shrink-0 shadow-sm ${
                !inputQuery.trim() || isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
              }`}
              title="Submit Query"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
