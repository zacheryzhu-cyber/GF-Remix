import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, Send, Wand2 } from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { FacilityWorkflow } from '../types';
import Markdown from 'react-markdown';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AiWorkflowComposer: React.FC<Props> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am the **Ops Workflow Composer**. Describe the automated routine you want to build (e.g., 'If a chiller fails, send a WhatsApp to the manager and create a P1 work order'). I will generate the nodes, chain them together, and write the LLM instruction prompts for you!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { workflows, setWorkflows, setActiveWorkflowId, showToast } = useFacility() as any;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userPrompt = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/compose-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt })
      });

      if (!response.ok) throw new Error("Failed to generate workflow");

      const data = await response.json();
      
      // Inject standard required fields
      const newId = `wf-ai-${Date.now().toString(36)}`;
      const newWorkflow: FacilityWorkflow = {
        ...data,
        id: newId,
        category: 'Maintenance',
        status: 'Ready',
        isActiveTool: true,
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        executionLogs: ['AI Composer initialized workflow.'],
      };

      setWorkflows((prev: any) => [newWorkflow, ...prev]);
      setActiveWorkflowId(newId);

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `**Success!** I have generated and loaded **${newWorkflow.name}**. It includes ${newWorkflow.nodes.length} nodes and ${newWorkflow.edges.length} edges.\n\nTake a look at the canvas and feel free to tweak the generated system prompts in the properties inspector.`
      }]);
      showToast("AI composed workflow successfully");

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "**Error:** Sorry, I encountered an issue while generating the workflow." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-4 right-4 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden flex flex-col">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-indigo-100" />
          <h3 className="font-bold text-sm">AI Workflow Composer</h3>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
              <div className={msg.role === 'user' ? 'text-white' : 'markdown-body text-sm'}>
                <Markdown>{msg.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-tl-none flex items-center gap-2 shadow-sm">
              <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Architecting workflow...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200 shrink-0 flex flex-col gap-3">
        {messages.length === 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Try asking</span>
            <button
              onClick={() => {
                setInput("Create a vendor notification workflow for Hitachi (contact: Tomas). Draft an email, send it (To Tomas), and notify him (Tomas) via email and WhatsApp.");
              }}
              className="text-left text-xs bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg transition-colors leading-relaxed"
            >
              "Create a vendor notification workflow for Hitachi (contact: Tomas). Draft an email, send it (To Tomas), and notify him (Tomas) via email and WhatsApp."
            </button>
            <button
              onClick={() => {
                setInput("Create a workflow to read the speeds of Motors A11, A13, and A15. Draft an email with the readings, send it, and notify Kim John via email and WhatsApp.");
              }}
              className="text-left text-xs bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg transition-colors leading-relaxed mt-1"
            >
              "Create a workflow to read the speeds of Motors A11, A13, and A15. Draft an email with the readings, send it, and notify Kim John via email and WhatsApp."
            </button>
            <button
              onClick={() => {
                setInput("make workflow to shut pump 3,4,5 in sequence so the chiller can shut properly");
              }}
              className="text-left text-xs bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 border border-indigo-100 text-indigo-700 px-3 py-2 rounded-lg transition-colors leading-relaxed mt-1"
            >
              "make workflow to shut pump 3,4,5 in sequence so the chiller can shut properly"
            </button>
          </div>
        )}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="E.g., Make a workflow to handle a power outage..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            rows={2}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
