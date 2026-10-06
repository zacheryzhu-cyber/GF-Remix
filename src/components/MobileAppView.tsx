import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  CameraOff,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Smartphone,
  Info,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
  FileCode,
  Tag,
  Search,
  CheckCircle2,
  LogOut,
  User,
  Lock,
  Shield,
  Bell,
  CheckCheck,
  AlertTriangle,
  MessageSquare,
  Send,
  Trash2,
  Bot,
  Paperclip,
  X,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';

export interface MobileOperator {
  id: string;
  username: string;
  displayName: string;
  role: string;
  domain: string;
  email: string;
  avatar: string;
}

export const PRESET_OPERATORS: MobileOperator[] = [
  {
    id: 'licheng',
    username: 'Licheng',
    displayName: 'Licheng Yan',
    role: 'Facility Operations Lead',
    domain: 'Cleanroom Fab-1 Management',
    email: 'licheng.yan@siemens.com',
    avatar: 'LC',
  },
  {
    id: 'mario',
    username: 'Mario',
    displayName: 'Mario Rossi',
    role: 'Mechanical Systems Specialist',
    domain: 'Chilled Water & Primary Pumps',
    email: 'mario.facility@fabcore.io',
    avatar: 'MR',
  },
  {
    id: 'zhuqi',
    username: 'Zhuqi',
    displayName: 'Zhuqi Chen',
    role: 'Electrical & Automation Engineer',
    domain: 'Substations & Motor Control Centers',
    email: 'zhuqi.ee@fabcore.io',
    avatar: 'ZQ',
  },
  {
    id: 'weiliang',
    username: 'Weiliang',
    displayName: 'Weiliang Tan',
    role: 'EHS & Cleanroom Safety Officer',
    domain: 'Hazardous Gas & Permits',
    email: 'weiliang.ehs@fabcore.io',
    avatar: 'WL',
  },
];

interface ScannedRecord {
  id: string;
  rawValue: string;
  timestamp: string;
  format?: string;
  assetType?: string;
}

export const MobileAppView: React.FC = () => {
  const { setActiveTab } = useFacility();

  // Mobile Operator Authentication State (Licheng, Mario, Zhuqi, Weiliang | password: root)
  const [currentOperator, setCurrentOperator] = useState<MobileOperator | null>(() => {
    try {
      const saved = localStorage.getItem('fabcore_mobile_operator');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const [selectedUsername, setSelectedUsername] = useState<string>('Licheng');
  const [loginPassword, setLoginPassword] = useState<string>('root');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Operator notifications dispatched from backend Node.js
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isAcknowledging, setIsAcknowledging] = useState<boolean>(false);

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ScannedRecord | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedRecord[]>([]);
  const [activeTabMobile, setActiveTabMobile] = useState<'scanner' | 'comms' | 'history' | 'quick_demo'>('scanner');
  const [copied, setCopied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  // Ephemeral Dark Comms Chat State
  interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    role: string;
    text: string;
    timestamp: string;
  }
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const aiChatContainerRef = useRef<HTMLDivElement | null>(null);

  // Poll live ephemeral comms messages with change detection
  const fetchChatMessages = async () => {
    try {
      const res = await fetch('/api/mobile/chat/messages');
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages((prev) => {
            // Only update state if new messages arrived to prevent unnecessary re-renders & auto-scroll loops
            if (
              prev.length === data.messages.length &&
              (prev.length === 0 || prev[prev.length - 1]?.id === data.messages[data.messages.length - 1]?.id)
            ) {
              return prev;
            }
            return data.messages;
          });
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend || !textToSend.trim() || isSendingChat) return;
    setIsSendingChat(true);
    const text = textToSend.trim();
    setChatInput('');

    try {
      const res = await fetch('/api/mobile/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentOperator?.id || 'operator',
          senderName: currentOperator?.displayName || currentOperator?.username || 'Operator',
          role: currentOperator?.role || 'Cleanroom Specialist',
          text,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setChatMessages((prev) => [...prev, data.message]);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleClearChat = async () => {
    try {
      await fetch('/api/mobile/chat/clear', { method: 'POST' });
      setChatMessages([]);
    } catch {
      // ignore
    }
  };

  // Licheng Dedicated AI Copilot State
  interface AiChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    imageUrl?: string;
    timestamp: string;
  }
  const [commsSubTab, setCommsSubTab] = useState<'team' | 'ai_copilot'>('team');
  const [aiChatMessages, setAiChatMessages] = useState<AiChatMessage[]>([]);
  const [aiChatInput, setAiChatInput] = useState<string>('');
  const [aiSelectedImage, setAiSelectedImage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const aiImageUploadRef = useRef<HTMLInputElement | null>(null);

  // Safe inner-container scroll that NEVER touches the page/window viewport
  useEffect(() => {
    if (activeTabMobile === 'comms' && commsSubTab === 'team' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeTabMobile, commsSubTab]);

  useEffect(() => {
    if (activeTabMobile === 'comms' && commsSubTab === 'ai_copilot' && aiChatContainerRef.current) {
      aiChatContainerRef.current.scrollTop = aiChatContainerRef.current.scrollHeight;
    }
  }, [aiChatMessages, isAiLoading, activeTabMobile, commsSubTab]);

  const handleSendAiMessage = async (promptText: string) => {
    if ((!promptText.trim() && !aiSelectedImage) || isAiLoading) return;
    const text = promptText.trim();
    const imageToSend = aiSelectedImage;

    const userMsg: AiChatMessage = {
      id: `ai-user-${Date.now()}`,
      role: 'user',
      text: text || 'Inspect this equipment photo',
      imageUrl: imageToSend || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiChatMessages((prev) => [...prev, userMsg]);
    setAiChatInput('');
    setAiSelectedImage(null);
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/mobile/licheng-ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text || 'Inspect this equipment photo and describe status and recommendations.',
          imageBase64: imageToSend,
          operatorId: currentOperator?.id || 'licheng',
          operatorName: currentOperator?.displayName || 'Licheng',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: AiChatMessage = {
          id: `ai-asst-${Date.now()}`,
          role: 'assistant',
          text: data.response || 'Field inspection completed.',
          timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setAiChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        setAiChatMessages((prev) => [
          ...prev,
          {
            id: `ai-err-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ ${errData.error || 'Inspection service unavailable. Please retry.'}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: any) {
      setAiChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Network error: ${err?.message || 'Failed to reach AI field copilot.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'mobile-qr-reader';

  // Digital clock for mobile status bar
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch operator notifications from shared Node.js backend
  const fetchOperatorNotifications = async (operatorId: string) => {
    try {
      const res = await fetch(`/api/mobile/notifications?userId=${encodeURIComponent(operatorId)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // ignore network errors in standalone preview
    }
  };

  useEffect(() => {
    if (currentOperator) {
      fetchOperatorNotifications(currentOperator.id);
      const interval = setInterval(() => {
        fetchOperatorNotifications(currentOperator.id);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [currentOperator]);

  // Handle operator login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/mobile/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Authentication failed. Default password is "root"');
        setIsLoggingIn(false);
        return;
      }

      const op = PRESET_OPERATORS.find(
        p => p.username.toLowerCase() === selectedUsername.toLowerCase()
      ) || data.user;

      setCurrentOperator(op);
      try {
        localStorage.setItem('fabcore_mobile_operator', JSON.stringify(op));
      } catch {}
    } catch {
      // Fallback local auth if server fetch is interrupted
      if (loginPassword === 'root') {
        const op = PRESET_OPERATORS.find(
          p => p.username.toLowerCase() === selectedUsername.toLowerCase()
        ) || PRESET_OPERATORS[0];
        setCurrentOperator(op);
        try {
          localStorage.setItem('fabcore_mobile_operator', JSON.stringify(op));
        } catch {}
      } else {
        setLoginError('Invalid password. Default password is "root"');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle operator logout / switch
  const handleLogout = () => {
    setCurrentOperator(null);
    try {
      localStorage.removeItem('fabcore_mobile_operator');
    } catch {}
  };

  // Acknowledge notification
  const handleAcknowledgeNotification = async (notificationId: string) => {
    if (!currentOperator) return;
    setIsAcknowledging(true);
    try {
      const res = await fetch('/api/mobile/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          userId: currentOperator.id,
          userName: currentOperator.displayName,
        }),
      });
      if (res.ok) {
        fetchOperatorNotifications(currentOperator.id);
      }
    } catch {
      // Optimistic update
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, acknowledged: true, acknowledgedBy: currentOperator.displayName }
            : n
        )
      );
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Beep sound on scan
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1); // Pitch up
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Stop active camera scan
  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Helper to handle a successful scan
  const handleDecodedText = async (decodedText: string, formatName: string = 'QR_CODE') => {
    playScanBeep();

    // Automatically stop camera scanner on detection so it doesn't keep scanning repeatedly
    await stopScanner();

    let assetType = 'General Payload';
    if (decodedText.startsWith('EQUIP:') || decodedText.includes('CHW-') || decodedText.includes('AHU-') || decodedText.includes('MCC-')) {
      assetType = 'Fab Equipment Tag';
    } else if (decodedText.startsWith('ALARM:')) {
      assetType = 'Alarm Event ID';
    } else if (decodedText.startsWith('PERMIT:')) {
      assetType = 'Safety Work Permit';
    } else if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
      assetType = 'Web URL Link';
    }

    const newRecord: ScannedRecord = {
      id: `scan-${Date.now()}`,
      rawValue: decodedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      format: formatName,
      assetType,
    };

    setScannedResult(newRecord);
    setScanHistory(prev => [newRecord, ...prev.slice(0, 19)]);
  };

  // Start live camera scan
  const startScanner = async (overrideFacingMode?: 'environment' | 'user') => {
    setCameraError(null);
    await stopScanner();

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
      }

      // Check available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          if (!selectedCameraId) {
            setSelectedCameraId(devices[0].id);
          }
        }
      } catch {
        // Fallback to constraints
      }

      const mode = overrideFacingMode || facingMode;

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      await html5QrCodeRef.current.start(
        selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: mode },
        config,
        (decodedText, decodedResult) => {
          handleDecodedText(decodedText, decodedResult?.result?.format?.formatName || 'QR_CODE');
        },
        () => {
          // ignore transient frame decode failures
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setIsScanning(false);
      setCameraError(
        err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings or use file upload.'
          : err?.message || 'Unable to access camera on this device.'
      );
    }
  };

  // Switch camera facing mode
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isScanning) {
      startScanner(nextMode);
    }
  };

  // Handle Image File Upload for QR Code scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    await stopScanner();

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId);
      }

      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      handleDecodedText(decodedText, 'QR_CODE (Image File)');
    } catch (err: any) {
      setCameraError('No valid QR code detected in the selected image. Try another image or scan via camera.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Copy raw value to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Clean up scanner on component unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Preset demo equipment QR payloads for quick testing
  const demoQRPresets = [
    {
      name: 'CHW-P-05 (Primary Pump)',
      type: 'Pump Equipment',
      code: 'EQUIP:CHW-P-05|LOOP:PRIMARY_CHW|LOC:CUB-LEVEL-1|STATUS:NOMINAL',
      description: 'Primary Chilled Water Pump 05 tag',
    },
    {
      name: 'AHU-CR-02 (Make-up Air)',
      type: 'HVAC Air Handler',
      code: 'EQUIP:AHU-CR-02|ZONE:FAB1_CLEANROOM_BAY4|CLASS:ISO_CLASS_5',
      description: 'ISO Class 5 Cleanroom Air Handling Unit',
    },
    {
      name: 'MCC-01 Ground Fault Alarm',
      type: 'Industrial Alarm',
      code: 'ALARM:A-06|ASSET:MCC-01|SEVERITY:P1_CRITICAL|OCAP:OCAP-ELEC-440',
      description: 'Motor Control Center 480V Feeder Trip',
    },
    {
      name: 'Hot Work Permit #7704',
      type: 'EHS Safety Permit',
      code: 'PERMIT:HWP-7704|ZONE:SUB-A-66KV|SUPERVISOR:TAN_WL|VALID_UNTIL:1800',
      description: 'Cleanroom Utility Annexe Hot Work Authorization',
    },
    {
      name: 'TOOL-LITHO-01 Telemetry URL',
      type: 'Web Asset Link',
      code: 'https://cleanroom.fabcore.io/asset/TOOL-LITHO-01?action=inspect',
      description: 'Lithography Stepper live monitoring deep link',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-[100dvh] md:h-full bg-slate-950 text-slate-100 overflow-hidden overscroll-none">
      {/* Studio Banner / Outer Container - Hidden on small mobile screens to maximize screen real estate */}
      <div className="hidden md:flex bg-slate-900/80 border-b border-slate-800/80 px-6 py-3 flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 tracking-tight">Cleanroom Mobile Companion</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Mobile Viewport Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive smartphone interface for cleanroom floor operators & technicians with live QR scanning
            </p>
          </div>
        </div>

        {/* Quick helper badge */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Format: <strong className="text-slate-200">Mobile-Only Display</strong></span>
          </div>
        </div>
      </div>

      {/* Main Workspace Frame: Full-screen on mobile, centered chassis on desktop */}
      <div className="flex-1 flex items-center justify-center p-0 md:p-6 lg:p-8 bg-slate-950 md:bg-radial md:from-slate-900/60 md:via-slate-950 md:to-slate-950 min-h-0 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* REALISTIC SMARTPHONE HARDWARE CHASSIS (Responsive) */}
        {/* ========================================================================= */}
        <div className="relative w-full h-[100dvh] md:h-[780px] md:max-w-[390px] md:max-h-[92vh] bg-slate-950 md:bg-slate-900 rounded-none md:rounded-[48px] p-0 md:p-3.5 shadow-none md:shadow-2xl md:shadow-black/80 border-0 md:border-4 md:border-slate-800 flex flex-col md:ring-1 md:ring-slate-700/50 overflow-hidden">
          
          {/* Side Buttons Simulated (Desktop Only) */}
          <div className="hidden md:block absolute -left-[6px] top-24 w-[3px] h-9 bg-slate-700 rounded-l-sm" />
          <div className="hidden md:block absolute -left-[6px] top-36 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
          <div className="hidden md:block absolute -left-[6px] top-52 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
          <div className="hidden md:block absolute -right-[6px] top-32 w-[3px] h-16 bg-slate-700 rounded-r-sm" />

          {/* Inner Phone Screen */}
          <div className="relative flex-1 bg-slate-950 rounded-none md:rounded-[38px] overflow-hidden flex flex-col border-0 md:border md:border-slate-800/60 shadow-inner">
            
            {/* 1. Mobile Status Bar (Top) */}
            <div className="h-11 bg-slate-950/95 backdrop-blur-md px-6 flex items-center justify-between text-xs text-slate-300 select-none z-30 shrink-0 border-b border-slate-900/50">
              <span className="font-semibold text-xs text-slate-100 tracking-tight">{currentTime || '09:41'}</span>
              
              {/* Dynamic Island / Camera Notch */}
              <div className="w-24 h-5 bg-black rounded-full border border-slate-800/80 flex items-center justify-center gap-1.5 px-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className="text-[10px] font-bold text-slate-400">5G</span>
                <span className="w-4 h-2.5 border border-slate-400 rounded-sm p-[1px] flex items-center">
                  <span className="w-full h-full bg-emerald-400 rounded-[1px]" />
                </span>
              </div>
            </div>

            {/* 2. Mobile App Header */}
            {currentOperator ? (
              <div className="bg-slate-900/95 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0 shadow-inner">
                    {currentOperator.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Logged in as</span>
                      <h2 className="text-xs font-bold text-emerald-400 truncate">
                        {currentOperator.username}
                      </h2>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" title="Online / On Duty" />
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{currentOperator.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Mute/Sound Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      soundEnabled
                        ? 'bg-slate-800 border-slate-700 text-amber-400'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                    title={soundEnabled ? 'Beep Audio On' : 'Beep Audio Off'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  {/* Switch User / Log Out */}
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-300 hover:text-rose-400 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Switch User / Log Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/95 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">FabCore Mobile</h2>
                    <p className="text-[10px] text-slate-400">Cleanroom Operations Portal</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full font-semibold">
                  Login Required
                </span>
              </div>
            )}

            {!currentOperator ? (
              /* ========================================================================= */
              /* OPERATOR LOGIN PAGE (Licheng, Mario, Zhuqi, Weiliang | password: root)    */
              /* ========================================================================= */
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col justify-between space-y-3">
                <div className="space-y-3.5">
                  {/* Terminal Header */}
                  <div className="text-center space-y-1 pt-1">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                      <User className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                      Field Operator Login
                    </h3>
                    <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                      Select your operator profile & authenticate to access live cleanroom tools & alarms
                    </p>
                  </div>

                  {/* 4 Registered Operator Selection Cards */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>Select Operator Identity</span>
                      <span className="text-[10px] font-mono text-amber-400">4 Personnel</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_OPERATORS.map((op) => {
                        const isSelected = selectedUsername.toLowerCase() === op.username.toLowerCase();
                        return (
                          <button
                            key={op.id}
                            type="button"
                            onClick={() => {
                              setSelectedUsername(op.username);
                              setLoginError(null);
                            }}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40 shadow-xs'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 font-extrabold'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {op.avatar}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-100 truncate">{op.username}</p>
                                <p className="text-[9px] text-slate-400 truncate">{op.domain}</p>
                              </div>
                            </div>
                            <p className="text-[9px] text-amber-400 font-medium mt-1 truncate">
                              {op.role}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Password Form */}
                  <form onSubmit={handleLogin} className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                        <span>Password</span>
                        <span className="text-[10px] text-slate-400 font-mono">default: root</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            setLoginError(null);
                          }}
                          placeholder="Enter password (root)"
                          className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    {loginError && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5" />
                          <span>Sign In as {selectedUsername}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Quick Credentials Info Note */}
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 text-center space-y-0.5">
                  <p className="font-semibold text-slate-300">Cleanroom Shift Roster</p>
                  <p className="text-[9px] text-slate-400">
                    Licheng &bull; Mario &bull; Zhuqi &bull; Weiliang (password: <code className="text-amber-400">root</code>)
                  </p>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* AUTHENTICATED MOBILE VIEW: QR SCANNER + DISPATCHED ALERTS                 */
              /* ========================================================================= */
              <>
                {/* Operator Incident / Dispatched Alert Banner */}
                {notifications.filter((n) => !n.acknowledged).length > 0 && (
                  <div className="mx-3 mt-2 p-2.5 rounded-xl bg-gradient-to-r from-red-950/90 to-amber-950/80 border border-red-500/40 text-xs shadow-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white uppercase">
                              {notifications.filter((n) => !n.acknowledged)[0].severity}
                            </span>
                            <span className="text-xs font-bold text-slate-100 truncate">
                              {notifications.filter((n) => !n.acknowledged)[0].title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                            {notifications.filter((n) => !n.acknowledged)[0].message}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleAcknowledgeNotification(notifications.filter((n) => !n.acknowledged)[0].id)
                      }
                      disabled={isAcknowledging}
                      className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] rounded-lg shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{isAcknowledging ? 'Acknowledging...' : 'Acknowledge Incident (ACK)'}</span>
                    </button>
                  </div>
                )}

                {/* 3. Mobile Navigation Segment Control */}
                <div className="px-3 pt-2.5 pb-1.5 bg-slate-950 shrink-0">
                  <div className="grid grid-cols-4 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTabMobile('scanner')}
                      className={`py-1.5 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTabMobile === 'scanner'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan</span>
                    </button>
                    <button
                      onClick={() => setActiveTabMobile('comms')}
                      className={`py-1.5 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer relative ${
                        activeTabMobile === 'comms'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Comms</span>
                      {chatMessages.length > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${activeTabMobile === 'comms' ? 'bg-slate-950' : 'bg-emerald-400 animate-pulse'}`} />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTabMobile('quick_demo')}
                      className={`py-1.5 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTabMobile === 'quick_demo'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Test</span>
                    </button>
                    <button
                      onClick={() => setActiveTabMobile('history')}
                      className={`py-1.5 text-[10px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTabMobile === 'history'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      <span>Log ({scanHistory.length})</span>
                    </button>
                  </div>
                </div>

                {/* 4. Mobile Screen Body Content */}
                <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                  
                  {/* TAB 1: LIVE QR SCANNER */}
                  {activeTabMobile === 'scanner' && (
                    <div className="space-y-3">
                      
                      {/* Camera Viewfinder Box */}
                      <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-slate-800 min-h-[260px] flex flex-col items-center justify-center shadow-lg">
                        
                        {/* The html5-qrcode reader mounting element */}
                        <div id={readerElementId} className="w-full h-full min-h-[260px]" />

                        {/* Idle / Inactive Overlay */}
                        {!isScanning && (
                          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                              <QrCode className="w-8 h-8" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-100">Camera Scanner Ready</h3>
                              <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto mt-1">
                                Point device camera at any equipment tag, valve barcode, or permit QR code
                              </p>
                            </div>
                            <button
                              onClick={() => startScanner()}
                              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              Start Camera Scanner
                            </button>
                          </div>
                        )}

                        {/* Active Scanning Overlay Reticle */}
                        {isScanning && (
                          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-4 z-20">
                            <div className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center gap-1.5 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              SCANNING ACTIVE
                            </div>

                            {/* Corner Target Marks */}
                            <div className="w-48 h-48 relative flex items-center justify-center">
                              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-400" />
                              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-400" />
                              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-400" />
                              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-400" />
                              
                              {/* Animated Red/Amber Scan Laser */}
                              <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-bounce" />
                            </div>

                            <p className="text-[10px] text-slate-400 bg-black/60 px-2 py-0.5 rounded backdrop-blur">
                              Align QR code inside target box
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Active Camera Action Controls */}
                      {isScanning && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={toggleCameraFacing}
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                            <span>Flip ({facingMode === 'environment' ? 'Back' : 'Front'})</span>
                          </button>
                          <button
                            onClick={stopScanner}
                            className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <CameraOff className="w-3.5 h-3.5" />
                            <span>Stop Camera</span>
                          </button>
                        </div>
                      )}

                      {/* File Upload Option */}
                      <div className="pt-1">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-2 px-3 bg-slate-900/90 hover:bg-slate-800/90 border border-dashed border-slate-700 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-400" />
                          <span>Upload QR Code Image</span>
                        </button>
                      </div>

                      {/* Error Notification */}
                      {cameraError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-tight">{cameraError}</p>
                        </div>
                      )}

                      {/* LATEST SCANNED RESULT CARD */}
                      {scannedResult && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/30 shadow-xl space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span className="text-xs font-bold text-slate-100">Decoded QR Value</span>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-mono bg-amber-500/10 text-amber-300 rounded border border-amber-500/20">
                              {scannedResult.assetType}
                            </span>
                          </div>

                          {/* Decoded Value Box */}
                          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-200 break-all select-all leading-relaxed max-h-32 overflow-y-auto">
                            {scannedResult.rawValue}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <span>Scanned at: <strong className="text-slate-200">{scannedResult.timestamp}</strong></span>
                            <button
                              onClick={() => handleCopy(scannedResult.rawValue)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Quick Actions Row */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => {
                                setScannedResult(null);
                                startScanner();
                              }}
                              className="py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Scan Next Code</span>
                            </button>
                            <button
                              onClick={() => setScannedResult(null)}
                              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <span>Dismiss</span>
                            </button>
                          </div>

                          {/* Quick Navigation to LPG or Search */}
                          {scannedResult.rawValue.includes('CHW-') || scannedResult.rawValue.includes('MCC-') || scannedResult.rawValue.includes('TOOL-') ? (
                            <button
                              onClick={() => setActiveTab('lpg_visualizer')}
                              className="w-full py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[11px] font-semibold text-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Search className="w-3 h-3" />
                              <span>View Equipment in LPG Graph Engine</span>
                            </button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: INSTANT TEST DEMO PRESETS */}
                  {activeTabMobile === 'quick_demo' && (
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                        <p className="font-semibold text-slate-200 mb-0.5 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Instant Cleanroom Test Tags
                        </p>
                        Tap any sample below to simulate instant hardware QR scanning without a physical camera tag.
                      </div>

                      <div className="space-y-2">
                        {demoQRPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              handleDecodedText(preset.code, 'QR_CODE (Demo Test)');
                              setActiveTabMobile('scanner');
                            }}
                            className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all group flex items-start justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-amber-400" />
                                <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                                  {preset.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400">{preset.description}</p>
                              <p className="text-[9px] font-mono text-slate-500 truncate max-w-[230px]">
                                {preset.code}
                              </p>
                            </div>
                            <span className="p-1 rounded-lg bg-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-colors mt-1">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SCAN HISTORY */}
                  {activeTabMobile === 'history' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span>Recent Scans ({scanHistory.length})</span>
                        {scanHistory.length > 0 && (
                          <button
                            onClick={() => setScanHistory([])}
                            className="text-[10px] text-rose-400 hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {scanHistory.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-2">
                          <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="text-xs text-slate-400">No scanned items recorded yet.</p>
                          <button
                            onClick={() => setActiveTabMobile('scanner')}
                            className="text-[11px] text-amber-400 hover:underline font-semibold"
                          >
                            Scan your first tag
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {scanHistory.map((item) => (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-semibold text-amber-300">{item.assetType}</span>
                                <span className="text-slate-500 font-mono">{item.timestamp}</span>
                              </div>
                              <p className="font-mono text-xs text-slate-200 break-all select-all bg-slate-950 p-1.5 rounded border border-slate-800/80">
                                {item.rawValue}
                              </p>
                              <div className="flex justify-end pt-0.5">
                                <button
                                  onClick={() => handleCopy(item.rawValue)}
                                  className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                  Copy Value
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: OPS DARK COMMS CHAT */}
                  {activeTabMobile === 'comms' && (
                    <div className="flex flex-col h-full min-h-0 space-y-2.5">
                      {/* Licheng Exclusive Sub-tab Toggle */}
                      {(currentOperator?.id === 'licheng' || currentOperator?.username?.toLowerCase() === 'licheng') && (
                        <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[10px] shrink-0">
                          <button
                            type="button"
                            onClick={() => setCommsSubTab('team')}
                            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              commsSubTab === 'team'
                                ? 'bg-slate-800 text-amber-300 font-bold border border-amber-500/30'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Team Chat (4 Leads)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCommsSubTab('ai_copilot')}
                            className={`py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              commsSubTab === 'ai_copilot'
                                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 font-bold border border-cyan-500/50 shadow-sm'
                                : 'text-slate-400 hover:text-cyan-200'
                            }`}
                          >
                            <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            <span>AI Field Copilot</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          </button>
                        </div>
                      )}

                      {/* SUB-VIEW 1: HUMAN TEAM CHAT */}
                      {commsSubTab === 'team' ? (
                        <>
                          {/* Dark Comms Header / Sub-bar */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              <span className="font-bold text-slate-200">Ops Dark Comms</span>
                              <span className="text-[10px] text-slate-500 font-mono">Shift Relay</span>
                            </div>
                            <button
                              onClick={handleClearChat}
                              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
                              title="Clear ephemeral conversation"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear</span>
                            </button>
                          </div>

                          {/* Active Operator Banner */}
                          <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[10px] text-slate-400 shrink-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>Broadcasting as:</span>
                              <span className="font-bold text-amber-300">
                                {currentOperator?.displayName || currentOperator?.username || 'Operator'}
                              </span>
                            </div>
                            <span className="font-mono text-slate-500 text-[9px]">
                              {currentOperator?.role?.split(' ')[0] || 'Cleanroom'}
                            </span>
                          </div>

                          {/* Message Thread */}
                          <div
                            ref={chatContainerRef}
                            className="flex-1 min-h-0 overflow-y-auto space-y-2.5 p-1 scrollbar-thin scrollbar-thumb-slate-800"
                          >
                            {chatMessages.length === 0 ? (
                              <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 space-y-1.5 text-xs text-slate-400">
                                <MessageSquare className="w-6 h-6 text-slate-600 mx-auto" />
                                <p className="font-semibold text-slate-300">No active messages.</p>
                                <p className="text-[10px] text-slate-500">
                                  Send a message or tap a quick dispatch below.
                                </p>
                              </div>
                            ) : (
                              chatMessages.map((msg) => {
                                const isMe =
                                  currentOperator?.id === msg.senderId ||
                                  currentOperator?.username.toLowerCase() === msg.senderId.toLowerCase();
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} text-xs`}
                                  >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {msg.senderName}
                                      </span>
                                      <span className="text-[9px] text-slate-600 font-mono">
                                        {msg.timestamp}
                                      </span>
                                    </div>
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                        isMe
                                          ? 'bg-amber-950/80 border border-amber-500/50 text-amber-100 rounded-tr-xs shadow-md'
                                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
                                      }`}
                                    >
                                      {msg.text}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Quick Dispatch Chips */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                            {[
                              'RO-01 Skid inspected',
                              'Standby pump ready',
                              'MCC-01 feeder checked',
                              'Cleanroom Fab-1 nominal',
                            ].map((chip, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSendChatMessage(chip)}
                                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>

                          {/* Dark Input Form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendChatMessage(chatInput);
                            }}
                            className="flex items-center gap-1.5 pt-1"
                          >
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder={`Message as ${currentOperator?.username || 'Operator'}...`}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500/60 transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={!chatInput.trim() || isSendingChat}
                              className="p-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-transform active:scale-95 cursor-pointer shadow-md"
                              title="Send Message"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </>
                      ) : (
                        /* SUB-VIEW 2: LICHENG AI FIELD COPILOT (Multimodal & LangGraph) */
                        <div className="flex flex-col h-full min-h-0 space-y-2">
                          {/* AI Header */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-[11px] shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                <Bot className="w-3 h-3" />
                              </span>
                              <div>
                                <div className="font-bold text-cyan-200 flex items-center gap-1">
                                  <span>Licheng AI Field Copilot</span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">Live Vision</span>
                                </div>
                                <p className="text-[9px] text-slate-400">Multimodal cleanroom vision & gauge inspector</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAiChatMessages([])}
                              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
                              title="Reset AI thread"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          </div>

                          {/* AI Message Thread */}
                          <div
                            ref={aiChatContainerRef}
                            className="flex-1 min-h-0 overflow-y-auto space-y-2.5 p-1 scrollbar-thin scrollbar-thumb-slate-800"
                          >
                            {aiChatMessages.length === 0 ? (
                              <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 space-y-1.5 text-xs text-slate-400">
                                <Bot className="w-6 h-6 text-cyan-500/70 mx-auto" />
                                <p className="font-semibold text-slate-200">AI Field Copilot Ready</p>
                                <p className="text-[10px] text-slate-400">
                                  Take or upload a photo of any pump, gauge dial, valve, or pipe, then ask for inspection or troubleshooting.
                                </p>
                              </div>
                            ) : (
                              aiChatMessages.map((msg) => {
                                const isUser = msg.role === 'user';
                                return (
                                  <div
                                    key={msg.id}
                                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} text-xs`}
                                  >
                                    <div className="flex items-center gap-1.5 mb-1 px-1">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {isUser ? 'Licheng' : 'Field Copilot'}
                                      </span>
                                      <span className="text-[9px] text-slate-600 font-mono">
                                        {msg.timestamp}
                                      </span>
                                    </div>
                                    <div
                                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed space-y-1.5 ${
                                        isUser
                                          ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-100 rounded-tr-xs shadow-md'
                                          : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
                                      }`}
                                    >
                                      {msg.imageUrl && (
                                        <div className="rounded-lg overflow-hidden border border-cyan-500/30 mb-1 max-w-[200px]">
                                          <img
                                            src={msg.imageUrl}
                                            alt="Field inspection attachment"
                                            className="w-full h-auto object-cover max-h-36"
                                          />
                                        </div>
                                      )}
                                      <div className="whitespace-pre-wrap">{msg.text}</div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {isAiLoading && (
                              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-cyan-500/20 text-xs text-cyan-300">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                <span className="text-[11px]">AI Field Copilot is inspecting photo & specs...</span>
                              </div>
                            )}
                          </div>

                          {/* Quick AI Field Prompts */}
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
                            {[
                              'Inspect gauge dial pressure',
                              'Check valve open/closed state',
                              'Verify pump vibration/seal status',
                              'Explain ISO 4 cleanroom SOP',
                            ].map((chip, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSendAiMessage(chip)}
                                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors shrink-0 cursor-pointer"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>

                          {/* Selected Image Thumbnail preview before sending */}
                          {aiSelectedImage && (
                            <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-cyan-500/40">
                              <div className="flex items-center gap-2">
                                <img
                                  src={aiSelectedImage}
                                  alt="Preview"
                                  className="w-8 h-8 rounded object-cover border border-slate-700"
                                />
                                <span className="text-[10px] text-cyan-300 font-mono">Photo attached for inspection</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAiSelectedImage(null)}
                                className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Hidden File Input for Camera/Gallery */}
                          <input
                            type="file"
                            ref={aiImageUploadRef}
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setAiSelectedImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                              e.target.value = '';
                            }}
                          />

                          {/* AI Message Form with Camera/Attach Button */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSendAiMessage(aiChatInput);
                            }}
                            className="flex items-center gap-1.5 pt-0.5"
                          >
                            <button
                              type="button"
                              onClick={() => aiImageUploadRef.current?.click()}
                              className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                                aiSelectedImage
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/30'
                                  : 'bg-slate-900 text-slate-300 hover:text-cyan-300 border-slate-800 hover:border-cyan-500/40'
                              }`}
                              title="Click to take photo or upload picture"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                            <input
                              type="text"
                              value={aiChatInput}
                              onChange={(e) => setAiChatInput(e.target.value)}
                              placeholder={aiSelectedImage ? 'Add question about this photo...' : 'Ask Copilot or attach photo...'}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500/60 transition-colors"
                            />
                            <button
                              type="submit"
                              disabled={(!aiChatInput.trim() && !aiSelectedImage) || isAiLoading}
                              className="p-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 rounded-xl font-bold transition-transform active:scale-95 cursor-pointer shadow-md shrink-0"
                              title="Send to Field Copilot"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 5. Mobile Bottom Home Indicator Bar */}
            <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
