import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  RefreshCw,
  CheckCheck,
  Brain,
  Terminal,
  Cpu,
  Layers,
  HelpCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Radio,
  Square,
  Mic,
  MicOff,
  Loader2,
  ChevronDown,
  Play,
  Check,
  Headphones,
  Copy,
  CheckCircle2,
  ShieldAlert,
  GitCommit,
  FileText,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  speakJarvis,
  stopJarvis,
  isJarvisSpeaking,
  onJarvisStateChange,
  playJarvisMicStart,
  playJarvisMicStop,
  transcribeAudioBlob,
  JARVIS_VOICE_OPTIONS,
  JarvisVoiceId,
  VoiceOption,
} from '../../utils/jarvisVoice';
import { MiniTopologyCard } from '../agent_hive/MiniTopologyCard';

// Utility to extract clean audio brief for J.A.R.V.I.S. and strip hidden tags from UI
export function extractAudioBriefAndCleanText(rawText: string): { cleanText: string; audioBrief: string } {
  if (!rawText) return { cleanText: '', audioBrief: '' };

  // 1. Check for explicit HTML comment tag: <!-- AUDIO_BRIEF: ... -->
  const match = rawText.match(/<!--\s*AUDIO_BRIEF:\s*([\s\S]*?)\s*-->/i);
  let audioBrief = '';
  let cleanText = rawText;

  if (match) {
    audioBrief = match[1].replace(/[*`_#]/g, '').trim();
    cleanText = rawText.replace(/<!--\s*AUDIO_BRIEF:[\s\S]*?-->/gi, '').trim();
    return { cleanText, audioBrief };
  }

  // 2. Check for explicit Audio Brief markdown line
  const markdownBriefMatch = rawText.match(/(?:\*\*Audio Brief:\*\*|Audio Brief:|Executive Briefing:)\s*([^\n]+(?:\n[^\n]+)?)/i);
  if (markdownBriefMatch) {
    audioBrief = markdownBriefMatch[1].replace(/[*`_#]/g, '').trim();
    cleanText = rawText.replace(/(?:\*\*Audio Brief:\*\*|Audio Brief:|Executive Briefing:)\s*[^\n]+(?:\n[^\n]+)?/gi, '').trim();
    return { cleanText, audioBrief };
  }

  // 3. Smart RCA extractor for industrial incident reports:
  const rootAssetMatch = rawText.match(/(?:Root Cause Asset|Root Cause|Initiating Asset)[\s:*`]+([^\n*]+)/i);
  const rootAlarmMatch = rawText.match(/(?:Root Alarm|Initiating Event|Primary Initiating)[\s:*`]+([^\n*]+)/i);
  const ocapMatch = rawText.match(/(?:Immediate Failover|Priority 1|Corrective & Containment|Containment Action)[\s:*`]+([^\n*]+)/i);

  if (rootAssetMatch) {
    const asset = rootAssetMatch[1].replace(/[*`_()]/g, '').trim();
    const alarm = rootAlarmMatch ? rootAlarmMatch[1].replace(/[*`_()]/g, '').trim() : 'active telemetry fault';
    const ocap = ocapMatch ? ocapMatch[1].replace(/[*`_()]/g, '').trim() : 'executing standby failover and pausing tool recipes';
    audioBrief = `Root cause identified at ${asset} triggering ${alarm}. Direct consequence caused downstream cooling starvation across cleanroom tools. Recommended action is ${ocap}.`;
    return { cleanText, audioBrief };
  }

  // 4. Fallback for general conversation / technical explanations:
  // Strip out tables, ASCII trees, and markdown formatting, then take the first 2 concise sentences
  const stripped = cleanText
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\|[^\n]+\|/g, '')
    .replace(/^#+\s+[^\n]+/gm, '')
    .replace(/[#*`_~[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const sentences = stripped
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  if (sentences.length > 0) {
    audioBrief = sentences.slice(0, 2).join(' ');
  } else {
    audioBrief = stripped.slice(0, 160) || 'Facility operations telemetry analyzed.';
  }

  return { cleanText, audioBrief };
}

// Inline Markdown formatter for text, chips, badges, and bold elements
const RenderInline: React.FC<{ text: string }> = ({ text }) => {
  // Regex to match code `code`, bold **bold**, and alarm tags like A-01, MCC-01
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part.startsWith('`') && part.endsWith('`')) {
          const content = part.slice(1, -1);
          // Highlight alarm tags or asset IDs
          const isAlarm = /^A-\d+/i.test(content) || content.includes('FAULT') || content.includes('ALARM') || content.includes('STOP');
          const isAsset = /^(TX|MCC|CHW|TOOL|PUMP|ZONE|AHU|HX)-/i.test(content);
          const isRel = /^(POWERS|SUPPLIES|COOLS|DISTRIBUTES_TO|BACKUP_FOR)/i.test(content);

          return (
            <code
              key={i}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono tracking-tight mx-0.5 font-semibold ${
                isAlarm
                  ? 'bg-red-100/90 text-red-800 border border-red-200'
                  : isAsset
                  ? 'bg-blue-100/90 text-blue-900 border border-blue-200'
                  : isRel
                  ? 'bg-purple-100/90 text-purple-900 border border-purple-200 text-[10px]'
                  : 'bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              {content}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          const isRed = boldText.includes('ROOT CAUSE') || boldText.includes('CRITICAL');
          return (
            <strong key={i} className={`font-semibold ${isRed ? 'text-red-700' : 'text-slate-900'}`}>
              <RenderInline text={boldText} />
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i} className="italic text-slate-700">{part.slice(1, -1)}</em>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// Rich Markdown and Structured RCA block renderer
const FormattedMessageRenderer: React.FC<{ rawContent: string; isUser: boolean }> = ({ rawContent, isUser }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (isUser) {
    return <div className="whitespace-pre-wrap">{rawContent}</div>;
  }

  const { cleanText } = extractAudioBriefAndCleanText(rawContent);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code blocks or section delimiters
  const rawBlocks = cleanText.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3.5 text-xs text-slate-800">
      {rawBlocks.map((block, blockIdx) => {
        if (!block.trim()) return null;

        // 1. Code Block / Diagram Block
        if (block.startsWith('```') && block.endsWith('```')) {
          const lines = block.slice(3, -3).trim().split('\n');
          let lang = lines[0].trim();
          let code = lines.slice(1).join('\n');
          if (!lang || lang.includes(' ') || lang.includes('[')) {
            // No explicit language header, entire block is code
            code = block.slice(3, -3).trim();
            lang = 'topology / syntax';
          }

          return (
            <div
              key={blockIdx}
              className="rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950 shadow-md my-2"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span className="uppercase tracking-wider text-slate-300 font-semibold">{lang}</span>
                </div>
                <button
                  onClick={() => handleCopy(code, blockIdx)}
                  className="flex items-center gap-1 hover:text-cyan-300 text-slate-400 transition-colors cursor-pointer px-1.5 py-0.5 rounded bg-slate-800/60 hover:bg-slate-800"
                >
                  {copiedIndex === blockIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-[9px] text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-[9px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-emerald-300/90 whitespace-pre">
                {code}
              </div>
            </div>
          );
        }

        // 2. Normal text & Markdown elements (Headings, Tables, Lists, Callouts)
        const subLines = block.split('\n');
        const renderedElements: React.ReactNode[] = [];
        let i = 0;

        while (i < subLines.length) {
          const line = subLines[i];
          const trimmed = line.trim();

          if (!trimmed) {
            i++;
            continue;
          }

          // Markdown Table detection
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            const tableRows: string[] = [];
            while (i < subLines.length && subLines[i].trim().startsWith('|') && subLines[i].trim().endsWith('|')) {
              tableRows.push(subLines[i].trim());
              i++;
            }

            if (tableRows.length >= 2) {
              const parseRow = (rowStr: string) =>
                rowStr
                  .slice(1, -1)
                  .split('|')
                  .map(c => c.trim());

              const headerCols = parseRow(tableRows[0]);
              const isSeparator = (rowStr: string) => /^\|(\s*:?-+:?\s*\|)+$/.test(rowStr);
              const dataRows = tableRows.slice(1).filter(r => !isSeparator(r));

              renderedElements.push(
                <div key={`table-${i}`} className="overflow-x-auto rounded-xl border border-slate-200 bg-white my-2.5 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700">
                        {headerCols.map((col, cIdx) => (
                          <th key={cIdx} className="px-3 py-2 text-[11px] font-bold tracking-tight">
                            <RenderInline text={col} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dataRows.map((row, rIdx) => {
                        const cols = parseRow(row);
                        const isRootRow = cols.some(c => c.includes('A-01') || c.includes('ROOT CAUSE'));

                        return (
                          <tr
                            key={rIdx}
                            className={`transition-colors ${
                              isRootRow
                                ? 'bg-red-50/70 font-medium'
                                : rIdx % 2 === 0
                                ? 'bg-white'
                                : 'bg-slate-50/50'
                            }`}
                          >
                            {cols.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 text-[11.5px] text-slate-700">
                                <RenderInline text={cell} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
              continue;
            }
          }

          // Markdown Section Headings
          if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            const level = trimmed.startsWith('### ') ? 3 : trimmed.startsWith('## ') ? 2 : 1;
            const headingText = trimmed.replace(/^#+\s*/, '');
            const isRca = headingText.toLowerCase().includes('root cause') || headingText.toLowerCase().includes('executive summary');
            const isTopology = headingText.toLowerCase().includes('topology') || headingText.toLowerCase().includes('propagation');
            const isChronology = headingText.toLowerCase().includes('chronology') || headingText.toLowerCase().includes('correlation');
            const isAction = headingText.toLowerCase().includes('action') || headingText.toLowerCase().includes('containment') || headingText.toLowerCase().includes('ocap');

            renderedElements.push(
              <div
                key={`h-${i}`}
                className={`flex items-center gap-2 pt-2.5 pb-1 font-bold text-slate-900 border-b border-slate-200/80 ${
                  level === 1 ? 'text-base text-slate-950' : level === 2 ? 'text-sm' : 'text-xs uppercase tracking-wide'
                }`}
              >
                {isRca && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />}
                {isTopology && <Zap className="w-4 h-4 text-amber-500 shrink-0" />}
                {isChronology && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                {isAction && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                <span>{headingText}</span>
              </div>
            );
            i++;
            continue;
          }

          // Horizontal Divider
          if (trimmed === '---' || trimmed === '***') {
            renderedElements.push(<hr key={`hr-${i}`} className="border-slate-200 my-2" />);
            i++;
            continue;
          }

          // Numbered Action List / Containment Step (e.g. 1. **Immediate Failover...**)
          const stepMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (stepMatch) {
            const stepNum = stepMatch[1];
            const stepBody = stepMatch[2];
            const isP1 = stepNum === '1' || stepBody.toLowerCase().includes('priority 1') || stepBody.toLowerCase().includes('immediate');

            renderedElements.push(
              <div
                key={`step-${i}`}
                className={`p-2.5 rounded-xl border my-1.5 flex items-start gap-2.5 ${
                  isP1
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                    isP1 ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                  }`}
                >
                  {stepNum}
                </span>
                <div className="flex-1 space-y-1 text-xs">
                  <RenderInline text={stepBody} />
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Bullet point items
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const bulletContent = trimmed.slice(2);
            const isRootCallout = bulletContent.toLowerCase().includes('root cause asset') || bulletContent.toLowerCase().includes('root alarm');

            renderedElements.push(
              <div
                key={`bullet-${i}`}
                className={`flex items-start gap-2 text-xs py-0.5 ${
                  isRootCallout
                    ? 'p-2 bg-red-50/80 border border-red-200 rounded-lg text-red-950 my-1 font-medium'
                    : 'text-slate-700'
                }`}
              >
                <span className={`text-[13px] select-none ${isRootCallout ? 'text-red-500 font-bold' : 'text-slate-400'}`}>•</span>
                <div className="flex-1">
                  <RenderInline text={bulletContent} />
                </div>
              </div>
            );
            i++;
            continue;
          }

          // Regular paragraph
          renderedElements.push(
            <p key={`p-${i}`} className="text-xs leading-relaxed text-slate-700">
              <RenderInline text={trimmed} />
            </p>
          );
          i++;
        }

        return <div key={blockIdx} className="space-y-1.5">{renderedElements}</div>;
      })}
    </div>
  );
};

export interface ForgeChatMessage {
  id: string;
  sender: 'operator' | 'deep_agent' | 'system';
  senderName: string;
  avatar?: string;
  text: string;
  timestamp: string;
  thoughtProcess?: string[];
  status?: 'sent' | 'delivered' | 'read';
  graphData?: {
    nodes: Array<{ id: string; name: string; type: string; status?: string }>;
    edges: Array<{ sourceId: string; targetId: string; relationship: string; property?: string }>;
  };
  cypherQuery?: string;
}

interface ForgeChatProps {
  messages: ForgeChatMessage[];
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  isRunning: boolean;
  isJarvisEnabled?: boolean;
  onToggleJarvis?: () => void;
  selectedVoice?: JarvisVoiceId;
  onSelectVoice?: (voice: JarvisVoiceId) => void;
}

export const ForgeChat: React.FC<ForgeChatProps> = ({
  messages,
  onSendMessage,
  onClearChat,
  isRunning,
  isJarvisEnabled = false,
  onToggleJarvis,
  selectedVoice: propSelectedVoice,
  onSelectVoice: propOnSelectVoice,
}) => {
  const [internalVoice, setInternalVoice] = useState<JarvisVoiceId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('forge_voice_preference');
      if (saved && ['Aoede', 'Kore', 'Zephyr', 'Fenrir', 'Charon', 'Puck'].includes(saved)) {
        return saved as JarvisVoiceId;
      }
    }
    return 'Aoede';
  });

  const activeVoiceId = propSelectedVoice || internalVoice;

  const handleVoiceChange = (voiceId: JarvisVoiceId) => {
    setInternalVoice(voiceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forge_voice_preference', voiceId);
    }
    propOnSelectVoice?.(voiceId);
  };

  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptCapturedRef = useRef<string>('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    };
    if (isVoiceDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isVoiceDropdownOpen]);

  useEffect(() => {
    const unsubscribe = onJarvisStateChange((speaking) => {
      setIsSpeaking(speaking);
      if (!speaking) {
        setCurrentlySpeakingId(null);
        setPreviewingVoiceId(null);
      }
    });
    return () => {
      unsubscribe();
      stopJarvis();
      cleanupAudioStreams();
    };
  }, []);

  const handlePreviewSample = (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    if (isSpeaking && previewingVoiceId === voice.id) {
      stopJarvis();
      setPreviewingVoiceId(null);
    } else {
      setPreviewingVoiceId(voice.id);
      speakJarvis(voice.sampleText, {
        voiceName: voice.id,
        onEnd: () => setPreviewingVoiceId(null),
      });
    }
  };

  const cleanupAudioStreams = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isRunning]);

  const stopListeningAndProcess = async () => {
    setIsListening(false);
    playJarvisMicStop();

    // Stop browser speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    // Stop media recorder and process audio if web speech didn't catch text
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      await stopListeningAndProcess();
      return;
    }

    // Reset errors
    setMicErrorMessage(null);
    transcriptCapturedRef.current = '';
    audioChunksRef.current = [];

    // Stop speaking if AI voice is currently playing
    stopJarvis();

    try {
      // 1. Request microphone access explicitly to trigger browser permission dialog
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Setup MediaRecorder for fail-safe Gemini Neural STT
      let recorder: MediaRecorder | null = null;
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (recErr) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Clean up tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        // If Web Speech API already captured the text, we don't need Gemini STT
        if (transcriptCapturedRef.current && transcriptCapturedRef.current.trim().length > 0) {
          return;
        }

        // Otherwise fallback to Gemini Multimodal STT
        if (audioChunksRef.current.length > 0) {
          const recordedBlob = new Blob(audioChunksRef.current, {
            type: recorder?.mimeType || 'audio/webm',
          });

          if (recordedBlob.size > 2000) {
            setIsTranscribing(true);
            try {
              const geminiTranscript = await transcribeAudioBlob(recordedBlob);
              if (geminiTranscript && geminiTranscript.trim()) {
                setInputText(geminiTranscript.trim());
              }
            } catch (err: any) {
              console.warn('[GEMINI STT] Audio transcription error:', err);
            } finally {
              setIsTranscribing(false);
            }
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      // 3. Attempt live Web Speech Recognition for instant feedback
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = 'en-US';
          recognition.interimResults = true;
          recognition.continuous = false;

          recognition.onresult = (event: any) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
              transcriptCapturedRef.current = transcript.trim();
              setInputText(transcript.trim());
            }
          };

          recognition.onerror = (event: any) => {
            console.warn('[Live SpeechRecognition Warning]:', event.error);
            // Non-fatal because MediaRecorder + Gemini STT backend will catch it
          };

          recognition.onend = () => {
            // Finished listening
            if (isListening) {
              stopListeningAndProcess();
            }
          };

          recognitionRef.current = recognition;
          recognition.start();
        } catch (speechErr) {
          console.warn('[Live SpeechRecognition Start]: Using neural audio fallback', speechErr);
        }
      }

      setIsListening(true);
      playJarvisMicStart();
    } catch (err: any) {
      console.error('[MICROPHONE ACCESS FAILED]:', err);
      setIsListening(false);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes('Permission denied') ||
        err?.message?.includes('not-allowed');

      if (isDenied) {
        setMicErrorMessage(
          'Microphone permission was denied. Please click the camera/lock icon in your browser URL address bar and allow microphone permissions.'
        );
      } else {
        setMicErrorMessage(
          err?.message || 'Could not access microphone hardware. Please verify audio input devices.'
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isRunning) return;
    if (isListening) {
      stopListeningAndProcess();
    }
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const handleReadAloud = (msg: ForgeChatMessage) => {
    if (isSpeaking && currentlySpeakingId === msg.id) {
      stopJarvis();
      setCurrentlySpeakingId(null);
    } else {
      setCurrentlySpeakingId(msg.id);
      const { audioBrief } = extractAudioBriefAndCleanText(msg.text);
      speakJarvis(audioBrief, {
        voiceName: activeVoiceId,
        onEnd: () => setCurrentlySpeakingId(null),
      });
    }
  };

  const samplePrompts = [
    {
      id: 'scada_telemetry_warning',
      label: 'SCADA Telemetry Warning',
      text: '🚨 SCADA TELEMETRY WARNING: Active alarms detected across 3 cleanroom process tools: TOOL-LITHO-01 (Laser Cavity Temp Alarm), TOOL-CMP-01 (Platen Cooling Flow Low), and TOOL-CMP-02 (Carrier Head Cooling Failure). Perform Root Cause Analysis (RCA) across active plant alarms and trace their upstream causal topology to identify the root cause asset.',
      badge: 'SCADA ALARM',
      isWarning: true,
    },
    {
      id: 'schema_introspect',
      label: 'Schema Introspect',
      text: 'Introspect the facility graph schema and list equipment node labels',
      badge: 'SCHEMA',
      isWarning: false,
    },
    {
      id: 'upw_polish_loop',
      label: 'UPW Polish Dependencies',
      text: 'Query the live graph for upstream dependencies of UPW Polish Loop',
      badge: 'GRAPH QUERY',
      isWarning: false,
    },
    {
      id: 'cda_pressure_drop',
      label: 'CDA Pressure RCA',
      text: 'Formulate autonomous root-cause hypothesis for CDA pressure drop',
      badge: 'HYPOTHESIS',
      isWarning: false,
    },
    {
      id: 'litho_thermal_risk',
      label: 'Lithography Thermal Risk',
      text: 'Analyze thermal runaway risk on Lithography Track 01',
      badge: 'RISK RCA',
      isWarning: false,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Brain className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">
                Deep Agent Console
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                LIVE DIGITAL TWIN
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Deep Reasoning Agent • Graph Introspection & Query Tools • Memory Scratchpad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Persona Selector Popover */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 hover:border-cyan-500/50 rounded-lg text-[10px] font-mono tracking-wide transition-all cursor-pointer shadow-xs"
              title="Select Neural Voice Persona"
            >
              <Headphones className="w-3 h-3 text-cyan-400" />
              <span className="font-bold text-white">
                {JARVIS_VOICE_OPTIONS.find((v) => v.id === activeVoiceId)?.name || 'Kore'}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-sans font-semibold">
                {JARVIS_VOICE_OPTIONS.find((v) => v.id === activeVoiceId)?.badge || 'Sultry'}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isVoiceDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isVoiceDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1 text-left">
                <div className="px-2 py-1 border-b border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>NEURAL VOICE SYNTHESIZER</span>
                  <span className="text-cyan-400 font-bold">24kHz PCM</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                  {JARVIS_VOICE_OPTIONS.map((v) => {
                    const isSelected = v.id === activeVoiceId;
                    const isPreviewing = isSpeaking && previewingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          handleVoiceChange(v.id);
                          setIsVoiceDropdownOpen(false);
                        }}
                        className={`p-2 rounded-lg cursor-pointer transition-all flex items-start justify-between gap-2 text-left ${
                          isSelected
                            ? 'bg-cyan-950/80 border border-cyan-500/50 text-white shadow-xs'
                            : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-100'}`}>
                              {v.name}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                v.gender === 'female'
                                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              {v.badge}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 ml-auto shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                            {v.description}
                          </p>
                        </div>

                        {/* Quick Sample Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => handlePreviewSample(e, v)}
                          className={`p-1.5 rounded-md shrink-0 transition-all cursor-pointer ${
                            isPreviewing
                              ? 'bg-cyan-500 text-white animate-pulse'
                              : 'bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700'
                          }`}
                          title={isPreviewing ? 'Stop Sample' : `Preview ${v.name} Voice Sample`}
                        >
                          {isPreviewing ? (
                            <Square className="w-3 h-3 fill-current text-white" />
                          ) : (
                            <Play className="w-3 h-3 fill-current text-cyan-400" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Neural Voice Controls */}
          {isSpeaking ? (
            <button
              onClick={() => {
                stopJarvis();
                setCurrentlySpeakingId(null);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 rounded-lg text-[10px] font-bold tracking-wide transition-all shadow-xs cursor-pointer animate-pulse"
              title="Stop voice output"
            >
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-0.5 h-2 bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-3 bg-cyan-300 animate-pulse delay-75" />
                <span className="w-0.5 h-1.5 bg-cyan-400 animate-pulse delay-150" />
              </div>
              <span>VOICE SPEAKING</span>
              <Square className="w-2.5 h-2.5 fill-cyan-300 ml-0.5" />
            </button>
          ) : (
            <button
              onClick={onToggleJarvis}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer border ${
                isJarvisEnabled
                  ? 'bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title={isJarvisEnabled ? 'Neural Voice Active (Click to mute)' : 'Neural Voice Muted (Click to enable)'}
            >
              {isJarvisEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>VOICE ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>VOICE MUTED</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onClearChat}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
            title="Delete Chat History & Reset Agent State"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70"
      >
        {messages.map(msg => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-3 py-1 rounded-full border border-slate-300">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isUser = msg.sender === 'operator';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end max-w-[85%] ml-auto' : 'items-start w-full mr-auto'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                {isUser ? (
                  <>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      {msg.senderName}
                    </span>
                    <User className="w-3 h-3 text-slate-500" />
                  </>
                ) : (
                  <>
                    <Brain className="w-3 h-3 text-violet-600" />
                    <span className="text-[10px] text-violet-700 font-bold">
                      {msg.senderName}
                    </span>
                  </>
                )}
                <span className="text-[9px] text-slate-400">{msg.timestamp}</span>
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                }`}
              >
                {/* Simulated Thought Process for Deep Agent */}
                {!isUser && msg.thoughtProcess && msg.thoughtProcess.length > 0 && (
                  <div className="mb-2.5 p-2 bg-violet-50/80 rounded-xl border border-violet-100 text-[11px] text-violet-900 space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-violet-800 text-[10px] uppercase">
                      <Sparkles className="w-3 h-3 text-violet-600" />
                      <span>Deep Chain of Thought:</span>
                    </div>
                    {msg.thoughtProcess.map((tp, idx) => (
                      <div key={idx} className="flex items-start gap-1 text-violet-700">
                        <span className="text-violet-400 select-none">•</span>
                        <span>{tp}</span>
                      </div>
                    ))}
                  </div>
                )}

                <FormattedMessageRenderer rawContent={msg.text} isUser={isUser} />

                {/* Intelligent Dynamic Topology Subgraph Rendering */}
                {!isUser && msg.graphData && (msg.graphData.nodes?.length > 0 || msg.graphData.edges?.length > 0) && (
                  <div className="mt-3">
                    <MiniTopologyCard
                      nodes={msg.graphData.nodes}
                      edges={msg.graphData.edges}
                      cypherQuery={msg.cypherQuery}
                      isLive={true}
                    />
                  </div>
                )}

                {/* Per-message J.A.R.V.I.S. Read Aloud Action */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <button
                      onClick={() => handleReadAloud(msg)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        currentlySpeakingId === msg.id && isSpeaking
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-xs'
                          : 'hover:bg-slate-100 text-slate-600 hover:text-cyan-700 border border-slate-200/60'
                      }`}
                      title={currentlySpeakingId === msg.id && isSpeaking ? "Stop Voice Briefing" : "Hear concise executive audio briefing"}
                    >
                      {currentlySpeakingId === msg.id && isSpeaking ? (
                        <>
                          <Square className="w-3 h-3 fill-cyan-700 text-cyan-700 animate-pulse" />
                          <span>Stop Briefing</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-cyan-600" />
                          <span>Hear Executive Briefing</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>STARK VOX AUDIO</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isRunning && (
          <div className="flex items-start gap-2 max-w-[80%]">
            <div className="w-7 h-7 rounded-lg bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-600 shrink-0">
              <Brain className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs text-violet-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span>Deep Agent is synthesizing reasoning chain...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 py-2 bg-slate-100/80 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-violet-500" />
          <span>Prompts:</span>
        </span>
        {samplePrompts.map(p => (
          <button
            key={p.id}
            onClick={() => onSendMessage(p.text)}
            disabled={isRunning}
            title={p.text}
            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
              p.isWarning
                ? 'bg-amber-50 hover:bg-amber-100/90 text-amber-900 border-amber-300 font-semibold shadow-2xs hover:border-amber-400'
                : 'bg-white hover:bg-violet-50 text-slate-700 hover:text-violet-700 border-slate-200 hover:border-violet-300'
            }`}
          >
            {p.isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />}
            <span>{p.label}</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                p.isWarning
                  ? 'bg-amber-200/70 text-amber-800'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {p.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Mic Permission Error Alert */}
      {micErrorMessage && (
        <div className="px-3.5 py-2 bg-amber-500/10 border-t border-amber-500/30 text-amber-900 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] leading-snug">{micErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setMicErrorMessage(null)}
            className="text-[10px] uppercase font-bold text-amber-700 hover:text-amber-900 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Voice Listening Active Banner */}
      {isListening && (
        <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-cyan-950/90 border-t border-cyan-500/40 text-white flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-cyan-300 font-mono tracking-wider flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>VOICE DIRECT LINK ACTIVE (STARK VOX)</span>
                {/* Visual sound waves */}
                <div className="flex items-center gap-0.5 ml-1">
                  <span className="w-0.5 h-2 bg-cyan-400 animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="w-0.5 h-3.5 bg-cyan-300 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-0.5 h-2.5 bg-cyan-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="w-0.5 h-4 bg-cyan-200 animate-pulse" style={{ animationDelay: '75ms' }} />
                </div>
              </span>
              <span className="text-[10px] text-cyan-100/70">
                Listening to operator speech... click Done when finished.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[10px] font-mono cursor-pointer transition-all"
          >
            DONE / SUBMIT
          </button>
        </div>
      )}

      {/* Neural Transcribing Banner */}
      {isTranscribing && (
        <div className="px-3.5 py-1.5 bg-violet-950/90 border-t border-violet-500/40 text-violet-200 flex items-center gap-2 text-xs animate-fadeIn">
          <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
          <span className="text-[11px] font-mono">Gemini Multimodal Neural STT is transcribing speech...</span>
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={
              isTranscribing
                ? "Transcribing voice with Gemini Neural STT..."
                : isListening
                ? "Listening... speak your command..."
                : "Ask Deep Agent to analyze, synthesize, or inspect..."
            }
            disabled={isRunning || isTranscribing}
            className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all disabled:opacity-60 ${
              isListening
                ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-cyan-50/20'
                : 'border-slate-300 focus:border-violet-500 focus:bg-white'
            }`}
          />
        </div>

        {/* Talk to AI Mic Button */}
        <button
          type="button"
          onClick={toggleListening}
          disabled={isRunning || isTranscribing}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/40 animate-pulse ring-2 ring-cyan-400/50'
              : 'bg-slate-100 hover:bg-cyan-50 text-slate-600 hover:text-cyan-600 border-slate-200 hover:border-cyan-300'
          }`}
          title={isListening ? 'Stop listening' : 'Talk to AI (Microphone Voice Input)'}
        >
          {isTranscribing ? (
            <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
          ) : isListening ? (
            <Mic className="w-4 h-4 text-white animate-bounce" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim() || isRunning || isTranscribing}
          className={`p-2.5 rounded-xl text-white font-medium transition-all cursor-pointer shrink-0 ${
            !inputText.trim() || isRunning || isTranscribing
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-600/30'
          }`}
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
