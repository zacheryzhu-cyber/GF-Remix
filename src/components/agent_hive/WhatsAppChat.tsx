import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  MoreVertical,
  CheckCheck,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Trash2,
  Check,
  Activity,
  Zap,
  Info,
  Layers,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from 'lucide-react';
import { HiveChatMessage, LangGraphExecutionState } from './types';
import { MiniTopologyCard } from './MiniTopologyCard';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WhatsAppChatProps {
  messages: HiveChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  executionState: LangGraphExecutionState;
}

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  executionState,
}) => {
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickDropdownRef.current &&
        !quickDropdownRef.current.contains(event.target as Node)
      ) {
        setShowQuickMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manual scroll to bottom (only when operator explicitly clicks the scroll button)
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Monitor scroll position to show/hide manual scroll-to-bottom button
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Show button if user is scrolled up by more than 100px from the bottom
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const handleSend = () => {
    if (!inputText.trim() || executionState.isRunning) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Strictly focused quick prompts (Solar, Building Energy, RCA for Litho/CMP01/CMP02, Mitigation, Alarms, Topology)
  const quickPrompts = [
    {
      id: 'solar',
      text: 'What is our total building solar power generation?',
      category: 'Facility Energy',
      icon: '☀️',
    },
    {
      id: 'building_energy',
      text: 'What is our total building energy consumption?',
      category: 'Facility Energy',
      icon: '⚡',
    },
    {
      id: 'litho_rca',
      text: 'TOOL-LITHO-01 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-LITHO-01, and identify the root cause asset.',
      category: 'Root Cause Analysis (RCA)',
      icon: '🔍',
    },
    {
      id: 'cmp_01_rca',
      text: 'TOOL-CMP-01 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-CMP-01, and identify the root cause asset.',
      category: 'Root Cause Analysis (RCA)',
      icon: '🔍',
    },
    {
      id: 'cmp_02_rca',
      text: 'TOOL-CMP-02 has an alarm. Find all active alarms in the plant, trace their causal topology upstream from TOOL-CMP-02, and identify the root cause asset.',
      category: 'Root Cause Analysis (RCA)',
      icon: '🔍',
    },
    {
      id: 'active_alarms',
      text: 'What are all the assets with an active alarm?',
      category: 'Alarms & Diagnostics',
      icon: '🚨',
    },
    {
      id: 'cmp_tool_01',
      text: 'Which asset directly connects and supports the CMP Tool 01?',
      category: 'Asset Topology',
      icon: '⚙️',
    },
    {
      id: 'cmp_upstream_01',
      text: 'What are all the assets upstream of the CMP Tool 01?',
      category: 'Asset Topology',
      icon: '🔄',
    },
    {
      id: 'cmp_tool_02',
      text: 'Which asset directly connects and supports the CMP Tool 02?',
      category: 'Asset Topology',
      icon: '⚙️',
    },
    {
      id: 'cmp_upstream_02',
      text: 'What are all the assets upstream of the CMP Tool 02?',
      category: 'Asset Topology',
      icon: '🔄',
    },
    {
      id: 'update_kb_incident_tools',
      text: 'Can u update this case to the knwoledge base for all the tools invovled in this incident ?',
      category: 'Knowledge Base',
      icon: '📚',
    },
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#efeae2] border border-slate-300 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* WhatsApp Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#075e54] text-white shadow-md z-10 select-none">
        <div className="flex items-center gap-3">
          {/* Group Avatar */}
          <div className="relative w-10 h-10 rounded-full bg-emerald-700 border-2 border-emerald-400 flex items-center justify-center text-white shadow-sm overflow-hidden">
            <Bot className="w-5 h-5 text-amber-300" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075e54] rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Global Agent Hive</h3>
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-400 text-slate-900 rounded-full uppercase">
                Multi-Agent
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 truncate max-w-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>Operator, Central Orchestrator, System Analyst</span>
            </p>
          </div>
        </div>

        {/* Action Header Icons */}
        <div className="flex items-center gap-1 text-emerald-100">
          <button
            onClick={onClearChat}
            className="p-2 hover:text-white hover:bg-emerald-800/60 rounded-full transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:text-white hover:bg-emerald-800/60 rounded-full transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 text-xs font-medium">
                <button
                  onClick={() => {
                    onClearChat();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center gap-2 text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Conversation
                </button>
                <div className="border-t border-slate-100 my-1" />
                <div className="px-4 py-1.5 text-[10px] text-slate-400">
                  Mode: Zero-Context Chatbot
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* WhatsApp Chat Body with Authentic Doodle Background Pattern */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{ overflowY: 'scroll', scrollbarGutter: 'stable' }}
        className="flex-1 min-h-0 max-h-full overflow-y-scroll p-4 space-y-3 chat-scrollbar bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
      >
        {/* Date / Graph Session Divider Chip */}
        <div className="flex justify-center my-2">
          <div className="px-3 py-1 bg-white/90 backdrop-blur-xs text-[11px] font-semibold text-slate-600 rounded-lg shadow-xs border border-slate-200/80">
            TODAY • ACTIVE AGENT SESSION
          </div>
        </div>

        {/* Initial Info System Pill */}
        <div className="flex justify-center">
          <div className="max-w-md text-center px-4 py-2 bg-emerald-50/95 border border-emerald-200/80 text-emerald-900 rounded-xl text-xs shadow-xs space-y-0.5">
            <div className="font-bold flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-800">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Multi-Turn Thread Context Active
            </div>
            <p className="text-[11px] text-emerald-700">
              Full conversational context is preserved across turns in this active session. Messages flow from <strong>Operator</strong> ➔ <strong>Orchestrator (Central)</strong> ➔ <strong>End</strong>.
            </p>
          </div>
        </div>

        {/* Message Bubbles */}
        {(() => {
          const latestGraphIndex = messages
            .map(m => !!(m.graphData && (m.graphData.nodes?.length > 0 || m.graphData.edges?.length > 0)))
            .lastIndexOf(true);

          return messages.map((msg, idx) => {
            if (msg.sender === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200/80 text-slate-700 text-[10px] font-mono rounded-full border border-slate-300 shadow-2xs">
                    <Zap className="w-3 h-3 text-amber-600" />
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isOperator = msg.sender === 'operator';

            return (
              <div
                key={msg.id}
                className={`flex w-full ${isOperator ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 shadow-sm text-xs ${
                    isOperator
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs border border-emerald-200/70'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-1.5">
                      {isOperator ? (
                        <>
                          <User className="w-3 h-3 text-emerald-700" />
                          <span className="font-bold text-[11px] text-emerald-800">
                            {msg.senderName}
                          </span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-amber-600" />
                          <span className="font-bold text-[11px] text-amber-800">
                            {msg.senderName}
                          </span>
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-amber-100 text-amber-800 rounded border border-amber-200">
                            Central
                          </span>
                          {msg.delegatedToAnalyst === false ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-300">
                              Direct Answer
                            </span>
                          ) : msg.delegatedToAnalyst === true ? (
                            <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-sky-100 text-sky-800 rounded border border-sky-300">
                              Analyst Verified
                            </span>
                          ) : null}
                        </>
                      )}
                    </div>

                    {msg.nodeId && (
                      <span className="text-[9px] font-mono text-slate-400">
                        [{msg.nodeId}]
                      </span>
                    )}
                  </div>

                  {/* Message Body with WhatsApp Styled Markdown */}
                  <div className="text-slate-800 leading-relaxed break-words text-[12.5px] font-sans">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-[14px] font-bold text-slate-900 mt-2.5 mb-1.5 pb-1 border-b border-slate-200/90 flex items-center gap-1.5" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-[13.5px] font-bold text-slate-900 mt-2 mb-1 flex items-center gap-1.5" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-[13px] font-bold text-emerald-900 mt-2 mb-1 flex items-center gap-1.5" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-[12px] font-bold text-slate-800 mt-1.5 mb-0.5 tracking-wide" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="space-y-1.5 my-2 pl-0.5" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal space-y-1.5 my-2 ml-4 text-slate-800" {...props} />,
                        li: ({node, children, ...props}) => (
                          <li className="flex items-start gap-2 leading-relaxed text-slate-800" {...props}>
                            <span className="text-emerald-600 font-bold select-none text-[11px] mt-0.5 shrink-0">•</span>
                            <div className="flex-1 min-w-0">{children}</div>
                          </li>
                        ),
                        strong: ({node, ...props}) => <strong className="font-bold text-slate-950" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-slate-700" {...props} />,
                        hr: () => <hr className="my-2.5 border-slate-200/90" />,
                        blockquote: ({node, ...props}) => (
                          <blockquote className="border-l-2 border-emerald-500 pl-2.5 py-0.5 my-1.5 text-slate-700 bg-emerald-50/60 rounded-r text-[12px]" {...props} />
                        ),
                        code: ({node, className, children, ...props}) => {
                          const isBlock = String(children).includes('\n');
                          return isBlock ? (
                            <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-lg text-[11px] font-mono my-2 overflow-x-auto border border-slate-700">
                              <code>{children}</code>
                            </pre>
                          ) : (
                            <code className="bg-slate-100/90 text-slate-800 border border-slate-200/80 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.text}
                    </Markdown>
                  </div>

                  {/* Dynamic Neo4j SVG Topology Diagram (Option 3) & Cypher Card */}
                  {msg.graphData && (msg.graphData.nodes.length > 0 || msg.graphData.edges.length > 0) ? (
                    <MiniTopologyCard
                      nodes={msg.graphData.nodes}
                      edges={msg.graphData.edges}
                      cypherQuery={msg.cypherQuery}
                      cypherResultsSummary={msg.cypherResultsSummary}
                      isLive={idx === latestGraphIndex}
                    />
                  ) : msg.cypherQuery ? (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] font-mono shadow-inner">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>System Analyst: Neo4j Aura Cypher Query</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                        LPG Verified
                      </span>
                    </div>
                    <code className="text-emerald-400 font-mono block whitespace-pre-wrap text-[10.5px]">
                      {msg.cypherQuery}
                    </code>
                    <div className="mt-1.5 pt-1 text-[9.5px] text-slate-400 font-sans flex items-center justify-between">
                      <span>Scope: Equipment topology & ISA-18.2 alarms</span>
                      <span className="italic text-slate-500">Live telemetry in SCADA buffers</span>
                    </div>
                  </div>
                ) : null}

                {/* Interactive Action Buttons for Operator Approval / Decision */}
                {msg.actionButtons && msg.actionButtons.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap gap-2">
                    {msg.actionButtons.map(btn => {
                      const isEmerald = btn.variant === 'emerald';
                      const isAmber = btn.variant === 'amber';
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          disabled={executionState.isRunning}
                          onClick={() => onSendMessage(btn.prompt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                            isEmerald
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                              : isAmber
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Message Footer: Time + WhatsApp Double Blue Ticks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                  <span>{msg.timestamp}</span>
                  {isOperator && (
                    <CheckCheck className="w-3.5 h-3.5 text-sky-600" />
                  )}
                </div>
              </div>
            </div>
          );
        });
      })()}

        {/* Real-time Typing / Processing Indicator */}
        {executionState.isRunning && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-sm border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
              <Bot className="w-4 h-4 text-amber-500 animate-bounce" />
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-amber-800">Orchestrator is processing...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Floating Scroll-to-Bottom Button (appears only if operator has scrolled up, no auto-scrolling on new messages) */}
      {showScrollBottomBtn && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="absolute bottom-28 right-5 z-20 w-9 h-9 rounded-full bg-white text-slate-700 hover:text-emerald-700 shadow-lg border border-slate-300 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-emerald-700" />
        </button>
      )}

      {/* Quick Prompts Dropdown Bar */}
      <div className="shrink-0 px-3 py-1.5 bg-slate-100/95 border-t border-slate-200/90 flex items-center justify-between gap-2 relative z-30">
        <div className="relative flex-1" ref={quickDropdownRef}>
          <button
            type="button"
            onClick={() => setShowQuickMenu(prev => !prev)}
            disabled={executionState.isRunning}
            aria-expanded={showQuickMenu}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium bg-white hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-800 rounded-lg border border-slate-300 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-slate-800 text-[11px]">Quick Prompts Menu:</span>
              <span className="text-slate-500 truncate text-[11px]">Select a prompt to ask Orchestrator...</span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
                showQuickMenu ? 'rotate-180 text-emerald-600' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Menu (opens upward above input bar) */}
          {showQuickMenu && (
            <div className="absolute bottom-full left-0 mb-1.5 w-full max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 z-50 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-0.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Pre-configured Quick Prompts
                </span>
                <span className="text-slate-500 font-medium normal-case">Click to load into input</span>
              </div>
              <div className="divide-y divide-slate-100/80">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => {
                      setShowQuickMenu(false);
                      setInputText(p.text);
                      setTimeout(() => {
                        inputRef.current?.focus();
                      }, 50);
                    }}
                    disabled={executionState.isRunning}
                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 flex items-start gap-2.5 transition-colors cursor-pointer group disabled:opacity-50"
                  >
                    <span className="text-sm shrink-0 mt-0.5">{p.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 group-hover:text-emerald-800 leading-snug">
                        {p.text}
                      </p>
                      <span className="text-[10px] text-slate-400 group-hover:text-emerald-600">
                        {p.category} · Click to load
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Input Bar */}
      <div className="shrink-0 p-2.5 bg-[#f0f2f5] border-t border-slate-300 flex items-center gap-2">
        <div className="flex items-center gap-1 text-slate-500">
          <button
            type="button"
            className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
            title="Attach File"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executionState.isRunning}
            placeholder={
              executionState.isRunning
                ? 'Agent node is executing...'
                : 'Type a message as Operator...'
            }
            className="w-full py-2.5 px-4 bg-white rounded-full text-xs text-slate-800 placeholder:text-slate-400 border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* WhatsApp Circular Send Button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || executionState.isRunning}
          className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#029070] disabled:bg-slate-300 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:cursor-not-allowed cursor-pointer shrink-0"
          title="Send message"
        >
          {executionState.isRunning ? (
            <Activity className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};
