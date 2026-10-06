import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AlarmItem,
  CleanroomBoxplotData,
  CleanroomMetricPoint,
  CpkParameterData,
  DistributionRecipient,
  EmergencyIncident,
  GuidedActionPlan,
  MaintenanceTicket,
  PriorityLevel,
  RedundantEquipment,
  ScadaAnnotation,
  ShiftReport,
  SystemCategory,
  TicketStatus,
  WorkPermit,
  WorkPermitStatus,
  FacilityWorkflow,
  WorkflowNode,
  WorkflowEdge,
  FacilityTab
} from '../types';
import {
  CLEANROOM_6HOURLY_TRENDS,
  CLEANROOM_BOXPLOT_DATA,
  INITIAL_ALARMS,
  INITIAL_CPK_PARAMETERS,
  INITIAL_DISTRIBUTION_LIST,
  INITIAL_EMERGENCY_INCIDENT,
  REDUNDANT_EQUIPMENT_DATA,
  INITIAL_SCADA_ANNOTATIONS,
  INITIAL_SHIFT_REPORT,
  INITIAL_TICKETS,
  INITIAL_WORK_PERMITS
} from '../data/mockData';
import { INITIAL_PRESET_WORKFLOWS } from '../data/mockWorkflows';

interface FacilityContextType {
  // Navigation & Mode
  viewMode: 'global_landing' | 'facility_workspace';
  setViewMode: (mode: 'global_landing' | 'facility_workspace') => void;
  selectedGlobalSiteId: string;
  setSelectedGlobalSiteId: (siteId: string) => void;
  enterFacilityWorkspace: (siteId?: string, defaultTab?: FacilityTab) => void;
  returnToGlobalLanding: () => void;

  activeTab: FacilityTab;
  setActiveTab: (tab: FacilityTab) => void;
  reportActiveSubTab: 'shift' | 'weekly_alarm' | 'cleanroom' | 'n_plus_one' | 'scada_annotations' | 'custom_builder';
  setReportActiveSubTab: (tab: 'shift' | 'weekly_alarm' | 'cleanroom' | 'n_plus_one' | 'scada_annotations' | 'custom_builder') => void;

  // Live Telemetry Streaming
  isLiveStreaming: boolean;
  setIsLiveStreaming: (active: boolean) => void;
  streamSpeedMs: number;
  setStreamSpeedMs: (speed: number) => void;
  audioAlertsEnabled: boolean;
  setAudioAlertsEnabled: (enabled: boolean) => void;
  telemetryTick: number;

  // Live Parameter State
  liveUpwResistivity: number;
  liveCleanroomTemp: number;
  liveCleanroomRh: number;
  liveCdaPressure: number;
  liveChilledWaterTemp: number;
  liveScrubberExhaustSp: number;
  liveParticleCount01: number;
  liveFfuSpeedRpm: number;

  // Alarms
  alarms: AlarmItem[];
  acknowledgeAlarm: (alarmId: string, author: string) => void;
  shelfAlarm: (alarmId: string, durationHours: number, reason: string) => void;
  unshelfAlarm: (alarmId: string) => void;
  clearAlarm: (alarmId: string) => void;
  triggerSimulatedAlarm: (priority: PriorityLevel, system: SystemCategory, customTag?: string) => void;

  // Guided Action (OCAP)
  selectedAlarmForOcap: AlarmItem | null;
  currentOcapPlan: GuidedActionPlan | null;
  isOcapLoading: boolean;
  openOcapModal: (alarm: AlarmItem) => void;
  closeOcapModal: () => void;
  toggleOcapStep: (stepNumber: number) => void;

  // Tickets & Work Orders
  tickets: MaintenanceTicket[];
  createTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'auditHistory'> & { id?: string }) => MaintenanceTicket;
  updateTicketStatus: (ticketId: string, newStatus: TicketStatus, notes?: string) => void;
  convertAlarmToTicket: (alarm: AlarmItem) => void;

  // Work Permits
  workPermits: WorkPermit[];
  createWorkPermit: (permit: Omit<WorkPermit, 'id' | 'createdAt'>) => void;
  updateWorkPermitStatus: (
    permitId: string,
    newStatus: WorkPermitStatus,
    rejectionReason?: string,
    approvedBy?: string,
    closeoutNotes?: string,
    closedBy?: string
  ) => void;

  // Reports
  shiftReport: ShiftReport;
  updateShiftReport: (updated: Partial<ShiftReport>) => void;
  approveShiftReport: (role: 'Lead' | 'OpsManager') => void;
  generateAiShiftSummary: () => Promise<void>;
  isGeneratingAiSummary: boolean;

  // CPK & Cleanroom
  cpkParameters: CpkParameterData[];
  cleanroomBoxplots: CleanroomBoxplotData[];
  cleanroomTrends: CleanroomMetricPoint[];
  redundantEquipment: RedundantEquipment[];
  scadaAnnotations: ScadaAnnotation[];
  addScadaAnnotation: (annotation: Omit<ScadaAnnotation, 'id' | 'timestamp'>) => void;

  // Emergency Incident
  emergencyIncident: EmergencyIncident | null;
  triggerSimFireAlarm: () => void;
  triggerEmergencyIncident: (type: EmergencyIncident['type'], hazardName: string, location: string, customP1Alarm?: Partial<AlarmItem>) => void;
  acknowledgeEmergencyIncident: (acknowledgedBy: string) => void;
  triggerVerification: (initiatedBy: string) => void;
  setVerificationOutcome: (outcome: 'true' | 'false', verifiedBy: string, details?: string) => void;
  completeWorkflowSubStep: (code: string, completedBy: string, notes?: string) => void;
  completeErtStep: (stepId: string, completedBy: string) => void;
  resolveEmergencyIncident: (notes: string) => void;
  resetEmergencyIncident: () => void;

  // Distribution List
  distributionList: DistributionRecipient[];
  addDistributionRecipient: (recipient: Omit<DistributionRecipient, 'id'>) => void;
  updateRecipientSubscription: (id: string, reportKey: keyof DistributionRecipient['subscribedReports'], value: boolean) => void;
  removeDistributionRecipient: (id: string) => void;

  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Ops Copilot Query & Knowledge Assistant
  isAiAssistantOpen: boolean;
  setIsAiAssistantOpen: (open: boolean) => void;
  aiAssistantInitialQuery: string | null;
  openAiAssistant: (initialQuery?: string) => void;
  closeAiAssistant: () => void;

  // CMMS Cross-Link Navigation
  selectedCmmsItem: { type: 'ticket' | 'permit'; id: string } | null;
  openCmmsItem: (type: 'ticket' | 'permit', id: string) => void;
  clearSelectedCmmsItem: () => void;

  // Workflow Engine (Visual Canvas & AI Tools)
  workflows: FacilityWorkflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<FacilityWorkflow[]>>;
  activeWorkflowId: string;
  setActiveWorkflowId: (id: string) => void;
  updateWorkflow: (workflowId: string, updated: Partial<FacilityWorkflow>) => void;
  addWorkflowNode: (workflowId: string, node: WorkflowNode) => void;
  updateWorkflowNode: (workflowId: string, nodeId: string, updated: Partial<WorkflowNode>) => void;
  removeWorkflowNode: (workflowId: string, nodeId: string) => void;
  addWorkflowEdge: (workflowId: string, edge: WorkflowEdge) => void;
  removeWorkflowEdge: (workflowId: string, edgeId: string) => void;
  createNewWorkflow: (name: string, category: FacilityWorkflow['category']) => string;
  deleteWorkflow: (workflowId: string) => void;
  toggleWorkflowToolStatus: (workflowId: string) => void;
  executeWorkflow: (workflowId: string) => Promise<void>;
}

const isMobileUserDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isMobileScreen = window.innerWidth < 768;
  return isMobileUA || isMobileScreen;
};

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export const FacilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Automatically detect mobile viewport / smartphone device on initial boot
  const initialIsMobile = isMobileUserDevice();
  const [viewMode, setViewMode] = useState<'global_landing' | 'facility_workspace'>(
    initialIsMobile ? 'facility_workspace' : 'global_landing'
  );
  const [selectedGlobalSiteId, setSelectedGlobalSiteId] = useState<string>('singapore-fab1');
  const [activeTab, setActiveTab] = useState<FacilityTab>(
    initialIsMobile ? 'mobile_app' : 'campus_3d'
  );
  const [reportActiveSubTab, setReportActiveSubTab] = useState<'shift' | 'weekly_alarm' | 'cleanroom' | 'n_plus_one' | 'scada_annotations' | 'custom_builder'>('shift');
  const [selectedCmmsItem, setSelectedCmmsItem] = useState<{ type: 'ticket' | 'permit'; id: string } | null>(null);

  const openCmmsItem = (type: 'ticket' | 'permit', id: string) => {
    setSelectedCmmsItem({ type, id });
    setViewMode('facility_workspace');
    setActiveTab('tickets');
    setIsAiAssistantOpen(false);
    showToast(`Navigated to ${type === 'permit' ? 'Work Permit' : 'Work Order'} ${id} in CMMS`);
  };

  const clearSelectedCmmsItem = () => {
    setSelectedCmmsItem(null);
  };

  const enterFacilityWorkspace = (siteId: string = 'singapore-fab1', defaultTab?: FacilityTab) => {
    setSelectedGlobalSiteId(siteId);
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
    setViewMode('facility_workspace');
  };

  const returnToGlobalLanding = () => {
    setViewMode('global_landing');
  };

  // Live Streaming States
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [streamSpeedMs, setStreamSpeedMs] = useState<number>(3000);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState<boolean>(false);
  const [telemetryTick, setTelemetryTick] = useState<number>(0);

  // Live Telemetry Values
  const [liveUpwResistivity, setLiveUpwResistivity] = useState<number>(18.19);
  const [liveCleanroomTemp, setLiveCleanroomTemp] = useState<number>(21.04);
  const [liveCleanroomRh, setLiveCleanroomRh] = useState<number>(42.15);
  const [liveCdaPressure, setLiveCdaPressure] = useState<number>(7.14);
  const [liveChilledWaterTemp, setLiveChilledWaterTemp] = useState<number>(6.52);
  const [liveScrubberExhaustSp, setLiveScrubberExhaustSp] = useState<number>(-248);
  const [liveParticleCount01, setLiveParticleCount01] = useState<number>(4.8);
  const [liveFfuSpeedRpm, setLiveFfuSpeedRpm] = useState<number>(1150);

  // Data Collections
  const [alarms, setAlarms] = useState<AlarmItem[]>(INITIAL_ALARMS);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>(INITIAL_TICKETS);
  const [workPermits, setWorkPermits] = useState<WorkPermit[]>(INITIAL_WORK_PERMITS);
  const [cpkParameters, setCpkParameters] = useState<CpkParameterData[]>(INITIAL_CPK_PARAMETERS);
  const [cleanroomBoxplots] = useState<CleanroomBoxplotData[]>(CLEANROOM_BOXPLOT_DATA);
  const [cleanroomTrends, setCleanroomTrends] = useState<CleanroomMetricPoint[]>(CLEANROOM_6HOURLY_TRENDS);
  const [redundantEquipment] = useState<RedundantEquipment[]>(REDUNDANT_EQUIPMENT_DATA);
  const [scadaAnnotations, setScadaAnnotations] = useState<ScadaAnnotation[]>(INITIAL_SCADA_ANNOTATIONS);
  const [shiftReport, setShiftReport] = useState<ShiftReport>(INITIAL_SHIFT_REPORT);
  const [emergencyIncident, setEmergencyIncident] = useState<EmergencyIncident | null>(INITIAL_EMERGENCY_INCIDENT);
  const [distributionList, setDistributionList] = useState<DistributionRecipient[]>(INITIAL_DISTRIBUTION_LIST);

  // Guided Action (OCAP) modal state
  const [selectedAlarmForOcap, setSelectedAlarmForOcap] = useState<AlarmItem | null>(null);
  const [currentOcapPlan, setCurrentOcapPlan] = useState<GuidedActionPlan | null>(null);
  const [isOcapLoading, setIsOcapLoading] = useState<boolean>(false);

  // AI Generation Loading
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState<boolean>(false);

  // Ops Copilot AI Assistant State
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState<boolean>(false);
  const [aiAssistantInitialQuery, setAiAssistantInitialQuery] = useState<string | null>(null);

  const openAiAssistant = useCallback((initialQuery?: string) => {
    if (initialQuery) {
      setAiAssistantInitialQuery(initialQuery);
    }
    setIsAiAssistantOpen(true);
  }, []);

  const closeAiAssistant = useCallback(() => {
    setIsAiAssistantOpen(false);
    setAiAssistantInitialQuery(null);
  }, []);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Facility Workflows (Drag & Drop Workflow Engine & AI Executable Tools)
  const [workflows, setWorkflows] = useState<FacilityWorkflow[]>(INITIAL_PRESET_WORKFLOWS);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('wf-upw-01');

  const updateWorkflow = useCallback((workflowId: string, updated: Partial<FacilityWorkflow>) => {
    setWorkflows(prev => prev.map(wf => wf.id === workflowId ? { ...wf, ...updated, lastModified: new Date().toISOString() } : wf));
  }, []);

  const addWorkflowNode = useCallback((workflowId: string, node: WorkflowNode) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      return {
        ...wf,
        nodes: [...wf.nodes, node],
        lastModified: new Date().toISOString(),
      };
    }));
  }, []);

  const updateWorkflowNode = useCallback((workflowId: string, nodeId: string, updated: Partial<WorkflowNode>) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      return {
        ...wf,
        nodes: wf.nodes.map(n => n.id === nodeId ? { ...n, ...updated } : n),
        lastModified: new Date().toISOString(),
      };
    }));
  }, []);

  const removeWorkflowNode = useCallback((workflowId: string, nodeId: string) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      return {
        ...wf,
        nodes: wf.nodes.filter(n => n.id !== nodeId),
        edges: wf.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
        lastModified: new Date().toISOString(),
      };
    }));
  }, []);

  const addWorkflowEdge = useCallback((workflowId: string, edge: WorkflowEdge) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      if (wf.edges.some(e => e.id === edge.id || (e.source === edge.source && e.target === edge.target))) return wf;
      return {
        ...wf,
        edges: [...wf.edges, edge],
        lastModified: new Date().toISOString(),
      };
    }));
  }, []);

  const removeWorkflowEdge = useCallback((workflowId: string, edgeId: string) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      return {
        ...wf,
        edges: wf.edges.filter(e => e.id !== edgeId),
        lastModified: new Date().toISOString(),
      };
    }));
  }, []);

  const createNewWorkflow = useCallback((name: string, category: FacilityWorkflow['category']) => {
    const newId = `wf-custom-${Date.now().toString(36)}`;
    const n1 = `node-${Date.now()}-1`;
    const newWf: FacilityWorkflow = {
      id: newId,
      name,
      description: `Custom automated ${category} workflow created via Visual Canvas.`,
      category,
      status: 'Ready',
      isActiveTool: true,
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      nodes: [
        {
          id: n1,
          type: 'trigger',
          title: `${category} Parameter Trigger`,
          description: 'Monitors operational sensor threshold',
          config: { system: 'Ultra Pure Water (UPW)' },
          x: 60,
          y: 80,
        }
      ],
      edges: [],
      executionLogs: ['Workflow initialized in draft state.'],
    };
    setWorkflows(prev => [newWf, ...prev]);
    setActiveWorkflowId(newId);
    return newId;
  }, []);

  const deleteWorkflow = useCallback((workflowId: string) => {
    setWorkflows(prev => {
      if (prev.length <= 1) {
        setToastMessage("Cannot delete the last workflow. Create a new one first.");
        return prev;
      }
      const filtered = prev.filter(w => w.id !== workflowId);
      setActiveWorkflowId(filtered[0].id);
      setToastMessage("Workflow deleted.");
      return filtered;
    });
  }, []);

  const toggleWorkflowToolStatus = useCallback((workflowId: string) => {
    setWorkflows(prev => prev.map(wf => {
      if (wf.id !== workflowId) return wf;
      const nextActive = !wf.isActiveTool;
      return { ...wf, isActiveTool: nextActive };
    }));
  }, []);

  const executeWorkflow = useCallback(async (workflowId: string) => {
    const targetWf = workflows.find(w => w.id === workflowId);
    if (!targetWf) return;

    // Set to executing
    setWorkflows(prev => prev.map(w => w.id === workflowId ? {
      ...w,
      status: 'Executing',
      executionLogs: [`[${new Date().toLocaleTimeString()}] Execution dispatched...`]
    } : w));

    // Simulate step by step verbosity
    for (let i = 0; i < targetWf.nodes.length; i++) {
      const node = targetWf.nodes[i];
      await new Promise(r => setTimeout(r, 600));
      const logEntry = `[${new Date().toLocaleTimeString()}] Step ${i + 1}/${targetWf.nodes.length}: [${(node.type || 'step').toUpperCase()}] "${node.title}" verified and completed.`;
      setWorkflows(prev => prev.map(w => w.id === workflowId ? {
        ...w,
        executionLogs: [...(w.executionLogs || []), logEntry]
      } : w));
    }

    setWorkflows(prev => prev.map(w => w.id === workflowId ? {
      ...w,
      status: 'Completed',
      executionLogs: [...(w.executionLogs || []), `[${new Date().toLocaleTimeString()}] All ${targetWf.nodes.length} nodes successfully executed.`]
    } : w));
  }, [workflows]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Web Audio Tone for P1 Alarms
  const playAlarmTone = useCallback(() => {
    if (!audioAlertsEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio context might be blocked by browser policy
    }
  }, [audioAlertsEnabled]);

  // Live Data Streaming Simulation Tick
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setTelemetryTick(prev => prev + 1);

      // Micro-fluctuations within semiconductor tolerances
      setLiveUpwResistivity(prev => {
        const delta = (Math.random() - 0.5) * 0.02;
        return Number(Math.max(17.8, Math.min(18.25, prev + delta)).toFixed(2));
      });

      setLiveCleanroomTemp(prev => {
        const delta = (Math.random() - 0.5) * 0.03;
        return Number(Math.max(20.85, Math.min(21.15, prev + delta)).toFixed(2));
      });

      setLiveCleanroomRh(prev => {
        const delta = (Math.random() - 0.5) * 0.15;
        return Number(Math.max(41.4, Math.min(42.6, prev + delta)).toFixed(2));
      });

      setLiveCdaPressure(prev => {
        const delta = (Math.random() - 0.5) * 0.04;
        return Number(Math.max(6.9, Math.min(7.35, prev + delta)).toFixed(2));
      });

      setLiveChilledWaterTemp(prev => {
        const delta = (Math.random() - 0.5) * 0.03;
        return Number(Math.max(6.3, Math.min(6.7, prev + delta)).toFixed(2));
      });

      setLiveScrubberExhaustSp(prev => {
        const delta = (Math.random() - 0.5) * 2;
        return Number(Math.max(-270, Math.min(-230, prev + delta)).toFixed(0));
      });

      setLiveParticleCount01(prev => {
        const delta = (Math.random() - 0.5) * 0.6;
        return Number(Math.max(1.5, Math.min(8.5, prev + delta)).toFixed(1));
      });

      setLiveFfuSpeedRpm(prev => {
        const delta = (Math.random() - 0.5) * 4;
        return Number(Math.max(1140, Math.min(1160, prev + delta)).toFixed(0));
      });

      // Update active alarm durations
      setAlarms(prevAlarms =>
        prevAlarms.map(alarm => {
          if (alarm.status === 'Active' || alarm.status === 'Acknowledged') {
            return { ...alarm, durationSeconds: alarm.durationSeconds + Math.round(streamSpeedMs / 1000) };
          }
          return alarm;
        })
      );
    }, streamSpeedMs);

    return () => clearInterval(interval);
  }, [isLiveStreaming, streamSpeedMs]);

  // Alarms Handlers
  const acknowledgeAlarm = useCallback((alarmId: string, author: string) => {
    setAlarms(prev =>
      prev.map(a =>
        a.id === alarmId
          ? {
              ...a,
              status: 'Acknowledged',
              acknowledgedBy: author,
              acknowledgedAt: new Date().toLocaleTimeString(),
            }
          : a
      )
    );
    showToast(`Alarm ${alarmId} acknowledged by ${author}`);
  }, [showToast]);

  const shelfAlarm = useCallback((alarmId: string, durationHours: number, reason: string) => {
    const expireTime = new Date(Date.now() + durationHours * 3600 * 1000).toLocaleString();
    setAlarms(prev =>
      prev.map(a =>
        a.id === alarmId
          ? {
              ...a,
              status: 'Shelved',
              shelvedUntil: expireTime,
              shelvedReason: reason,
            }
          : a
      )
    );
    showToast(`Alarm ${alarmId} shelved for ${durationHours}h (${reason})`);
  }, [showToast]);

  const unshelfAlarm = useCallback((alarmId: string) => {
    setAlarms(prev =>
      prev.map(a =>
        a.id === alarmId
          ? {
              ...a,
              status: 'Active',
              shelvedUntil: undefined,
              shelvedReason: undefined,
            }
          : a
      )
    );
    showToast(`Alarm ${alarmId} unshelved to Active state`);
  }, [showToast]);

  const clearAlarm = useCallback((alarmId: string) => {
    setAlarms(prev =>
      prev.map(a =>
        a.id === alarmId
          ? {
              ...a,
              status: 'Cleared',
            }
          : a
      )
    );
    showToast(`Alarm ${alarmId} cleared`);
  }, [showToast]);

  const triggerSimulatedAlarm = useCallback((priority: PriorityLevel, system: SystemCategory, customTag?: string) => {
    const newId = `ALM-${Math.floor(800 + Math.random() * 200)}`;
    const tag = customTag || `${(system || 'SYS').slice(0, 3).toUpperCase()}-SENS-ALERT`;
    const newAlarm: AlarmItem = {
      id: newId,
      tag,
      description: `Live Excursion Detected: ${system} Process Variable Drift`,
      system,
      location: 'Fab 1 Sub-Module Area',
      priority,
      timestamp: new Date().toLocaleTimeString(),
      value: (Math.random() * 10).toFixed(2),
      setpoint: '5.00',
      unit: 'Units',
      status: 'Active',
      durationSeconds: 1,
      hasOcap: true,
      chatteringCount: priority === 'P3' ? 3 : 0,
    };

    setAlarms(prev => [newAlarm, ...prev]);
    if (priority === 'P1') {
      playAlarmTone();
    }
    showToast(`🚨 New ${priority} Alarm Generated: ${tag}`);
  }, [playAlarmTone, showToast]);

  // Guided Action (OCAP) execution
  const openOcapModal = useCallback(async (alarm: AlarmItem) => {
    setSelectedAlarmForOcap(alarm);
    setIsOcapLoading(true);

    try {
      const res = await fetch('/api/ai/guided-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alarm,
          systemContext: {
            telemetryStatus: 'Active Live Feed',
            cleanroomClass: 'ISO Class 1-4',
            fabStatus: 'Normal Production Run',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentOcapPlan(data);
      } else {
        throw new Error('Fallback to local OCAP');
      }
    } catch {
      // Fallback robust standard OCAP
      setCurrentOcapPlan({
        ocapTitle: `OCAP-${(alarm.system || 'SYS').slice(0, 3).toUpperCase()}: Standard Response Checklist`,
        severity: alarm.priority,
        rootCauseHypothesis: [
          'Sensor transmitter diaphragm fouling or electronic calibration drift.',
          'Pneumatic actuation pressure loss in subfab utility corridor.',
          'Upstream process tool sudden high-demand spike during purge cycle.'
        ],
        stepByStepChecklist: [
          { step: 1, action: 'Perform physical visual inspection of tag transmitter readout in subfab.', role: 'Shift Technician', critical: true, completed: false },
          { step: 2, action: 'Cross-reference redundant secondary sensor channel in SCADA Historian.', role: 'Control Room Lead', critical: true, completed: false },
          { step: 3, action: 'Engage N+1 standby backup unit if excursion continues > 180s.', role: 'System Owner', critical: true, completed: false },
          { step: 4, action: 'Notify wafer module supervisor if wafer lot exposure risk is flagged.', role: 'Operations Manager', critical: false, completed: false }
        ],
        emergencyContainment: 'Do not inhibit automated safety interlocks without formal MOC (Management of Change) signed authorization.',
        historicalResolution: 'Previous excursion on 2026-07-12 resolved by flushing sensor line and cycling bypass isolation valve.',
        generatedByAI: false,
      });
    } finally {
      setIsOcapLoading(false);
    }
  }, []);

  const closeOcapModal = useCallback(() => {
    setSelectedAlarmForOcap(null);
    setCurrentOcapPlan(null);
  }, []);

  const toggleOcapStep = useCallback((stepNumber: number) => {
    setCurrentOcapPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stepByStepChecklist: prev.stepByStepChecklist.map(s =>
          s.step === stepNumber ? { ...s, completed: !s.completed } : s
        ),
      };
    });
  }, []);

  // Tickets Handlers
  const createTicket = useCallback((ticketData: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'auditHistory'> & { id?: string }): MaintenanceTicket => {
    const newId = ticketData.id || `WO-${Math.floor(7920 + Math.random() * 80)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newTicket: MaintenanceTicket = {
      ...ticketData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      auditHistory: [
        {
          timestamp: now,
          user: 'System Operator',
          action: 'Work order created',
        },
      ],
    };

    setTickets(prev => [newTicket, ...prev]);
    showToast(`Maintenance Work Order ${newId} created successfully`);
    return newTicket;
  }, [showToast]);

  const updateTicketStatus = useCallback((ticketId: string, newStatus: TicketStatus, notes?: string) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setTickets(prev =>
      prev.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            status: newStatus,
            updatedAt: now,
            closedAt: newStatus === 'Closed' || newStatus === 'Resolved' ? now : t.closedAt,
            resolutionNotes: notes || t.resolutionNotes,
            auditHistory: [
              ...t.auditHistory,
              {
                timestamp: now,
                user: 'Operator / Lead',
                action: `Status updated to ${newStatus}`,
                note: notes,
              },
            ],
          };
        }
        return t;
      })
    );
    showToast(`Ticket ${ticketId} status changed to ${newStatus}`);
  }, [showToast]);

  const convertAlarmToTicket = useCallback((alarm: AlarmItem) => {
    const newTicketId = `WO-${Math.floor(4110 + Math.random() * 900)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newTicket: MaintenanceTicket = {
      id: newTicketId,
      title: `Alarm Investigation: ${alarm.tag} - ${alarm.description}`,
      category: alarm.system,
      priority: alarm.priority,
      status: 'Open',
      location: alarm.location,
      assignedOwner: 'Shift Technician / On-Duty Engineer',
      createdAt: now,
      updatedAt: now,
      source: 'Automated Alarm Rule',
      workOrderType: 'CM (Corrective)',
      estimatedHours: alarm.priority === 'P1' ? 2 : 4,
      description: `Alarm ${alarm.id} triggered excursion (Value: ${alarm.value} ${alarm.unit}, Setpoint: ${alarm.setpoint} ${alarm.unit}). Requires physical field verification and OCAP compliance check.`,
      containmentPlan: 'Refer to standard OCAP action guidelines attached to alarm record.',
      linkedAlarmId: alarm.id,
      requiredPPE: ['Safety Glasses', 'Cleanroom Suit / Subfab PPE'],
      auditHistory: [
        {
          timestamp: now,
          user: 'SCADA Alarm Dispatcher',
          action: `Auto-generated ticket from Alarm ${alarm.id}`,
        },
      ],
    };

    setTickets(prev => [newTicket, ...prev]);
    // Link ticket to alarm
    setAlarms(prev =>
      prev.map(a => (a.id === alarm.id ? { ...a, linkedTicketId: newTicketId } : a))
    );
    showToast(`Created Maintenance Ticket ${newTicketId} from Alarm ${alarm.id}`);
  }, [showToast]);

  // Work Permit Handlers
  const createWorkPermit = useCallback((permitData: Omit<WorkPermit, 'id' | 'createdAt'>) => {
    const newId = `WP-${Math.floor(8830 + Math.random() * 900)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newPermit: WorkPermit = {
      ...permitData,
      id: newId,
      createdAt: now,
    };
    setWorkPermits(prev => [newPermit, ...prev]);
    showToast(`Work Permit ${newId} (${permitData.permitType}) generated`);
  }, [showToast]);

  const updateWorkPermitStatus = useCallback((
    permitId: string,
    newStatus: WorkPermitStatus,
    rejectionReason?: string,
    approvedBy?: string,
    closeoutNotes?: string,
    closedBy?: string
  ) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setWorkPermits(prev =>
      prev.map(p => {
        if (p.id === permitId) {
          return {
            ...p,
            status: newStatus,
            approvedBy: newStatus === 'open' ? (approvedBy || 'Safety Officer Lead') : p.approvedBy,
            approvedAt: newStatus === 'open' ? now : p.approvedAt,
            closedAt: newStatus === 'closed' ? now : p.closedAt,
            closedBy: newStatus === 'closed' ? (closedBy || 'Facilities Operations Lead') : p.closedBy,
            closeoutNotes: newStatus === 'closed' ? closeoutNotes : p.closeoutNotes,
            rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined,
          };
        }
        return p;
      })
    );
    showToast(`Work Permit ${permitId} marked as ${(newStatus || 'UPDATED').toUpperCase()}`);
  }, [showToast]);

  // Shift Report Handlers
  const updateShiftReport = useCallback((updated: Partial<ShiftReport>) => {
    setShiftReport(prev => ({ ...prev, ...updated }));
  }, []);

  const approveShiftReport = useCallback((role: 'Lead' | 'OpsManager') => {
    const now = new Date().toLocaleString();
    if (role === 'Lead') {
      setShiftReport(prev => ({
        ...prev,
        approvalStatus: 'Approved by Lead',
        approvedAt: now,
      }));
      showToast('Shift Report approved by Facilities Shift Lead');
    } else {
      setShiftReport(prev => ({
        ...prev,
        approvalStatus: 'Signed-Off by Ops Manager',
        approvedAt: now,
      }));
      showToast('Shift Report signed off by Operations Manager');
    }
  }, [showToast]);

  const generateAiShiftSummary = useCallback(async () => {
    setIsGeneratingAiSummary(true);
    try {
      const res = await fetch('/api/ai/shift-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftInfo: {
            shiftDate: shiftReport.shiftDate,
            shiftName: shiftReport.shiftType,
            leadEngineer: shiftReport.leadEngineer,
          },
          telemetryData: {
            liveUpwResistivity,
            liveCleanroomTemp,
            liveCleanroomRh,
            liveCdaPressure,
            liveChilledWaterTemp,
            liveParticleCount01,
          },
          alarms: alarms.map(a => ({ tag: a.tag, priority: a.priority, status: a.status })),
          tickets: tickets.map(t => ({ title: t.title, priority: t.priority, status: t.status })),
          scadaAnnotations: scadaAnnotations.map(s => ({ tag: s.tag, reason: s.reason, author: s.author })),
          vocEvents: shiftReport.vocEvents,
          pmcmEvents: shiftReport.pmcmEvents,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShiftReport(prev => ({
          ...prev,
          executiveSummary: data.executiveSummary || prev.executiveSummary,
          detailedNarrative: data.summary || prev.detailedNarrative,
          keyEvents: data.keyEvents && data.keyEvents.length ? data.keyEvents : prev.keyEvents,
          actionItemsForNextShift: data.actionItemsForNextShift && data.actionItemsForNextShift.length ? data.actionItemsForNextShift : prev.actionItemsForNextShift,
          iec62682ComplianceNote: data.complianceStatus || prev.iec62682ComplianceNote,
        }));
        showToast('AI Shift Report generated and consolidated successfully');
      }
    } catch {
      showToast('Generated summary with built-in analytics engine');
    } finally {
      setIsGeneratingAiSummary(false);
    }
  }, [alarms, liveCdaPressure, liveChilledWaterTemp, liveCleanroomRh, liveCleanroomTemp, liveParticleCount01, liveUpwResistivity, scadaAnnotations, shiftReport, showToast, tickets]);

  // SCADA Annotations
  const addScadaAnnotation = useCallback((annotationData: Omit<ScadaAnnotation, 'id' | 'timestamp'>) => {
    const newId = `ANO-${Math.floor(110 + Math.random() * 900)}`;
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newAnnotation: ScadaAnnotation = {
      ...annotationData,
      id: newId,
      timestamp: now,
    };
    setScadaAnnotations(prev => [newAnnotation, ...prev]);
    showToast(`SCADA Annotation ${newId} logged for tag ${annotationData.tag}`);
  }, [showToast]);

  // Emergency Incident Handlers
  const triggerEmergencyIncident = useCallback((
    type: EmergencyIncident['type'] = 'Fire (VESDA)',
    hazardName = 'VESDA Laser Smoke Detection - Area C Fire Alarm (FL-C-104)',
    location = 'Photolithography Cleanroom Bay 1 - Area C Ceiling Plenum',
    customP1Alarm?: Partial<AlarmItem>
  ) => {
    const now = new Date().toLocaleTimeString();
    const nowTimestamp = Date.now();
    const incidentId = `ERM-FIRE-${Date.now().toString().slice(-4)}`;
    const alarmId = customP1Alarm?.id || `ALM-FIRE-C104-${Date.now().toString().slice(-3)}`;

    const newEmergency: EmergencyIncident = {
      id: incidentId,
      type: 'Fire (VESDA)',
      hazardName,
      location,
      severityLevel: 'LEVEL 3 (Critical Evacuation)',
      status: 'Active Alert',
      detectedAt: now,
      detectedTimestamp: nowTimestamp,
      linkedAlarmId: alarmId,
      ppmReading: '0.086 % obs/m (Threshold: 0.040 % obs/m)',
      impactedZones: [location, 'Adjacent Plenum Zone Sector 4', 'Cleanroom Evacuation Corridor C'],
      automatedInterlocksEngaged: [
        'Area C AHU Dampers switched to 100% Exhaust / 0% Recirculation',
        'Automated ESV Fast-Shutoff Valves isolated for flammable/toxic lines',
        'Exhaust Scrubber & Smoke Extract Fans ramped to 100% High Speed',
        'Area C Life-Safety Strobes, Horns & Audio Evacuation active',
      ],
      currentWorkflowStep: 1,
      fireTeamInformed: true,
      fireTeamInformedAt: now,
      verificationTriggered: false,
      verificationOutcome: 'unverified',
      announcementActive: false,
      headcountTotal: 18,
      headcountAccounted: 0,
      trueBranchSteps: [
        {
          id: 'step-fire-1',
          code: 'PA-EVAC',
          title: 'PA Evacuation Announcement',
          description: 'Broadcast plant-wide emergency evacuation message over PA system to Area C and Cleanroom bays.',
          targetTime: 'T+01:00',
          completed: false,
        },
        {
          id: 'step-fire-2',
          code: 'CERT-ACT',
          title: 'Activate CERT Team',
          description: 'Mobilize In-House Company Emergency Response Team (CERT Squad Alpha & Bravo with SCBA and fire fighting equipment).',
          targetTime: 'T+02:30',
          completed: false,
        },
        {
          id: 'step-fire-3',
          code: 'HEADCOUNT',
          title: 'Headcount Verification',
          description: 'Conduct roll-call and verify 100% headcount at Assembly Area 3 (18/18 personnel accounted for; zero missing).',
          targetTime: 'T+05:00',
          completed: false,
        },
        {
          id: 'step-fire-4',
          code: 'SUPPRESSION',
          title: 'Containment & Fire Suppression',
          description: 'Engage AHU 100% exhaust, verify ESV line isolation, stage clean-agent FM-200 / pre-action sprinklers, and coordinate SCDF site arrival.',
          targetTime: 'T+08:00',
          completed: false,
        },
      ],
      falseBranchSteps: [
        {
          id: 'step-false-1',
          code: 'SCDF-NOTIFY',
          title: 'Inform SCDF (Stand-Down)',
          description: 'Contact Singapore Civil Defence Force (SCDF) Operations Centre to report false alarm verification and cancel external engine response.',
          targetTime: 'T+01:30',
          completed: false,
        },
        {
          id: 'step-false-2',
          code: 'ALL-CLEAR',
          title: 'Stand-Down Announcement',
          description: 'Broadcast PA Announcement to personnel: Area C alarm verified as false alarm; environment nominal; all personnel may resume standard work.',
          targetTime: 'T+03:00',
          completed: false,
        },
        {
          id: 'step-false-3',
          code: 'RCA-FOLLOWUP',
          title: 'Follow-up with RCA',
          description: 'Generate CMMS Root Cause Analysis (RCA) investigation ticket, schedule VESDA laser detector recalibration and optical chamber cleaning.',
          targetTime: 'T+10:00',
          completed: false,
        },
      ],
      ertChecklist: [
        { id: 'ERT-1', action: 'In-House Fire Team alerted & dispatched to Area C command muster.', targetTime: '2 mins', completed: true, completedAt: now, completedBy: 'SCADA Dispatcher' },
        { id: 'ERT-2', action: 'Operations acknowledge alarm & silence audible horns.', targetTime: '30 secs', completed: false },
        { id: 'ERT-3', action: 'Trigger physical & optical verification of plenum detectors.', targetTime: '5 mins', completed: false },
        { id: 'ERT-4', action: 'Execute verified protocol (Confirmed Fire Emergency or False Alarm).', targetTime: '10 mins', completed: false },
      ],
      responseLog: [
        {
          timeOffsetSec: 0,
          timestamp: now,
          event: `🚨 Fire Alarm Activated & In-House Fire Team automatically informed via SCADA pager/radio dispatch. Location: ${location}`,
          actor: 'SCADA Life-Safety Engine',
          stage: 'Activate Alarm & Inform Fire Team',
        },
      ],
      commanderNotes: `Fire alarm activated at ${location}. In-House Fire Team informed. Awaiting Operations acknowledgment.`,
    };

    // Add matching P1 Alarm to alarms list if not present
    const newP1Alarm: AlarmItem = {
      id: alarmId,
      tag: 'VESDA-SMOKE-AREA-C',
      description: 'Critical Fire Alarm & Smoke Particle Excursion - Area C Photolithography Ceiling Plenum',
      system: 'Fire & Life Safety (VESDA)',
      location,
      priority: 'P1',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      value: '0.086',
      setpoint: '0.040',
      unit: '% obs/m',
      status: 'Active',
      durationSeconds: 0,
      hasOcap: true,
      chatteringCount: 0,
    };

    setAlarms(prev => {
      const existing = prev.find(a => a.tag === newP1Alarm.tag);
      if (existing) {
        return prev.map(a => (a.id === existing.id ? { ...newP1Alarm, id: existing.id } : a));
      }
      return [newP1Alarm, ...prev];
    });

    setEmergencyIncident(newEmergency);
    playAlarmTone();
    showToast('🚨 Fire Alarm Activated: Fire Team Informed');
  }, [playAlarmTone, showToast]);

  const triggerSimFireAlarm = useCallback(() => {
    triggerEmergencyIncident();
  }, [triggerEmergencyIncident]);

  const acknowledgeEmergencyIncident = useCallback((acknowledgedBy: string) => {
    if (!emergencyIncident) return;
    const now = new Date().toLocaleTimeString();
    const elapsedSec = emergencyIncident.detectedTimestamp
      ? Math.max(1, Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000))
      : 14;

    setEmergencyIncident(prev => {
      if (!prev) return null;
      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: `⚡ Operations Acknowledged Alarm by ${acknowledgedBy}. Audible siren silenced; life-safety SCADA active. (Time-to-Ack: ${elapsedSec}s)`,
          actor: acknowledgedBy,
          stage: 'Operations Acknowledge Alarm',
        },
      ];
      return {
        ...prev,
        currentWorkflowStep: Math.max(prev.currentWorkflowStep, 2) as any,
        status: prev.status === 'Active Alert' ? 'Acknowledged' : prev.status,
        acknowledgedAt: now,
        acknowledgedBy,
        timeToAcknowledgeSec: elapsedSec,
        responseLog: updatedLog,
        commanderNotes: `${prev.commanderNotes || ''} | Acknowledged at T+${elapsedSec}s by ${acknowledgedBy}. Ready for Verification.`,
      };
    });

    if (emergencyIncident.linkedAlarmId) {
      setAlarms(prev =>
        prev.map(a =>
          a.id === emergencyIncident.linkedAlarmId || a.tag.includes('AREA-C')
            ? { ...a, status: 'Acknowledged', acknowledgedBy, acknowledgedAt: now }
            : a
        )
      );
    }

    showToast(`Operations Acknowledged Alarm at T+${elapsedSec}s`);
  }, [emergencyIncident, showToast]);

  const triggerVerification = useCallback((initiatedBy: string) => {
    if (!emergencyIncident) return;
    const now = new Date().toLocaleTimeString();
    const elapsedSec = emergencyIncident.detectedTimestamp
      ? Math.max(1, Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000))
      : 30;

    setEmergencyIncident(prev => {
      if (!prev) return null;
      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: `🔍 Trigger Verification Initiated by ${initiatedBy}. Dispatched on-duty Fire Lead and FLIR thermal imaging team to Area C ceiling plenum.`,
          actor: initiatedBy,
          stage: 'Trigger Verification',
        },
      ];
      return {
        ...prev,
        currentWorkflowStep: 3,
        verificationTriggered: true,
        verificationTriggeredAt: now,
        status: 'Verification in Progress',
        responseLog: updatedLog,
        commanderNotes: `${prev.commanderNotes || ''} | Physical verification triggered at T+${elapsedSec}s. Awaiting thermal scan findings.`,
      };
    });

    showToast(`Physical & Optical Verification Triggered by ${initiatedBy}`);
  }, [emergencyIncident, showToast]);

  const setVerificationOutcome = useCallback((outcome: 'true' | 'false', verifiedBy: string, details?: string) => {
    if (!emergencyIncident) return;
    const now = new Date().toLocaleTimeString();
    const elapsedSec = emergencyIncident.detectedTimestamp
      ? Math.max(1, Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000))
      : 45;

    setEmergencyIncident(prev => {
      if (!prev) return null;
      const isTrue = outcome === 'true';
      const eventText = isTrue
        ? `🔥 Verification Result: Confirmed Fire Emergency by ${verifiedBy}. Thermal hot spot (84.2°C) and visible smoke detected in Area C Plenum Sector 4. Proceeding to Verified Fire Emergency Protocol (Announcement, CERT, Headcount, Containment).`
        : `🛡️ Verification Result: False Alarm Confirmed by ${verifiedBy}. FLIR scan reads nominal 21.1°C with zero thermal hot spots. Optical particulate artifact from HVAC filter work. Proceeding to False Alarm Stand-Down Protocol (Inform SCDF, Announcement, Follow-up with RCA).`;

      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: eventText,
          actor: verifiedBy,
          stage: isTrue ? 'Verified Fire Protocol' : 'False Alarm Stand-Down Protocol',
        },
      ];

      return {
        ...prev,
        currentWorkflowStep: 4,
        verificationOutcome: outcome,
        verificationDetails: details || (isTrue ? 'True thermal anomaly confirmed via FLIR' : 'False trip: Zero thermal source, optical sensor artifact'),
        status: isTrue ? 'True Incident (Active)' : 'False Alarm (Stand-Down)',
        responseLog: updatedLog,
        commanderNotes: `${prev.commanderNotes || ''} | Verification Outcome: ${outcome === 'true' ? 'Confirmed Fire Emergency' : 'False Alarm Stand-Down'} at T+${elapsedSec}s by ${verifiedBy}.`,
      };
    });

    showToast(`Verification Outcome: ${outcome === 'true' ? 'Confirmed Fire Emergency' : 'False Alarm Stand-Down'}`);
  }, [emergencyIncident, showToast]);

  const completeWorkflowSubStep = useCallback((code: string, completedBy: string, notes?: string) => {
    if (!emergencyIncident) return;
    const now = new Date().toLocaleTimeString();
    const elapsedSec = emergencyIncident.detectedTimestamp
      ? Math.max(1, Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000))
      : 60;

    let autoCreatedTicketId: string | undefined;

    // If completing RCA follow-up, automatically create RCA Ticket
    if (code === 'RCA-FOLLOWUP' || code === '3b-iii') {
      const rcaId = `WO-RCA-${Math.floor(6200 + Math.random() * 700)}`;
      autoCreatedTicketId = rcaId;
      const rcaTicket: MaintenanceTicket = {
        id: rcaId,
        title: 'RCA Investigation: Area C VESDA Smoke Detector False Alarm Trip',
        category: 'Fire & Life Safety (VESDA)',
        priority: 'P2',
        status: 'Open',
        location: 'Area C Photolithography Cleanroom Bay 1 - Ceiling Plenum',
        assignedOwner: 'EHS & Life Safety Specialist (Robert Zhao)',
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
        source: 'Automated Alarm Rule',
        workOrderType: 'Safety Audit',
        estimatedHours: 4,
        description: 'Root Cause Analysis and optical calibration following false alarm stand-down. Inspect VESDA laser chamber, verify aspirating tube cleanliness, and replace pre-filters.',
        containmentPlan: 'Detector tested and verified nominal. Conduct 48-hour chattering audit and update baseline zero threshold.',
        linkedAlarmId: emergencyIncident.linkedAlarmId || 'ALM-FIRE-C104',
        requiredPPE: ['Safety Glasses', 'Cleanroom Suit', 'ESD Shoes'],
        auditHistory: [
          {
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            user: completedBy,
            action: 'Auto-generated RCA ticket from Emergency Response Stand-Down Protocol',
          },
        ],
      };
      setTickets(prev => [rcaTicket, ...prev]);
    }

    setEmergencyIncident(prev => {
      if (!prev) return null;

      const isTrueBranch = code.startsWith('4a') || code === 'PA-EVAC' || code === 'CERT-ACT' || code === 'HEADCOUNT' || code === 'SUPPRESSION';
      const branchKey = isTrueBranch ? 'trueBranchSteps' : 'falseBranchSteps';
      const stepItem = prev[branchKey].find(s => s.code === code);

      const updatedBranch = prev[branchKey].map(s =>
        s.code === code
          ? {
              ...s,
              completed: true,
              completedAt: now,
              completedBy,
              details: notes || s.details,
            }
          : s
      );

      const allCompleted = updatedBranch.every(s => s.completed);

      // Determine announcement updates
      let announcementActive = prev.announcementActive;
      let announcementText = prev.announcementText;
      let headcountAccounted = prev.headcountAccounted;

      if (code === 'PA-EVAC' || code === '4a-i') {
        announcementActive = true;
        announcementText = '🚨 EVACUATION ALERT: Attention Area C personnel, initiate immediate evacuation via Exit C-2 to Assembly Station 3.';
      } else if (code === 'HEADCOUNT' || code === '4a-iii') {
        headcountAccounted = 18;
      } else if (code === 'ALL-CLEAR' || code === '3b-ii') {
        announcementActive = true;
        announcementText = '📢 ALL-CLEAR ANNOUNCEMENT: Attention all personnel, Area C alarm was verified as a false alarm. Environment is nominal; please resume standard operations.';
      }

      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: `✓ Completed: ${stepItem?.title || code} by ${completedBy}.${notes ? ` Notes: ${notes}` : ''}`,
          actor: completedBy,
          stage: isTrueBranch ? 'Verified Fire Protocol' : 'False Alarm Stand-Down Protocol',
        },
      ];

      return {
        ...prev,
        [branchKey]: updatedBranch,
        status: allCompleted ? (isTrueBranch ? 'Controlled' : 'All Clear') : prev.status,
        announcementActive,
        announcementText,
        headcountAccounted,
        rcaTicketId: autoCreatedTicketId || prev.rcaTicketId,
        responseLog: updatedLog,
      };
    });

    showToast(`Action Completed by ${completedBy}`);
  }, [emergencyIncident, showToast]);

  const completeErtStep = useCallback((stepId: string, completedBy: string) => {
    if (!emergencyIncident) return;
    const now = new Date().toLocaleTimeString();
    const elapsedSec = emergencyIncident.detectedTimestamp
      ? Math.max(1, Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000))
      : 60;

    setEmergencyIncident(prev => {
      if (!prev) return null;
      const stepItem = prev.ertChecklist.find(s => s.id === stepId);
      const updatedList = prev.ertChecklist.map(step =>
        step.id === stepId ? { ...step, completed: true, completedAt: now, completedBy } : step
      );
      const allDone = updatedList.every(s => s.completed);

      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: `✓ ERT Action ${stepId} Completed: ${stepItem?.action || stepId}`,
          actor: completedBy,
          stage: '4. ERT Field Mobilization',
        },
      ];

      return {
        ...prev,
        ertChecklist: updatedList,
        responseLog: updatedLog,
        status: allDone ? 'Controlled' : prev.status,
      };
    });
    showToast(`ERT Action ${stepId} signed off by ${completedBy}`);
  }, [emergencyIncident, showToast]);

  const resolveEmergencyIncident = useCallback((notes: string) => {
    setEmergencyIncident(prev => {
      if (!prev) return null;
      const now = new Date().toLocaleTimeString();
      const elapsedSec = prev.detectedTimestamp
        ? Math.max(1, Math.floor((Date.now() - prev.detectedTimestamp) / 1000))
        : 180;

      const updatedLog = [
        ...(prev.responseLog || []),
        {
          timeOffsetSec: elapsedSec,
          timestamp: now,
          event: `🏁 Incident Declared ALL CLEAR & Resolved. System Restored to Nominal. Notes: ${notes}`,
          actor: 'Marcus Vance (Shift Lead)',
          stage: '6. Post-Incident Clearance',
        },
      ];

      return {
        ...prev,
        status: 'All Clear',
        responseLog: updatedLog,
        commanderNotes: `${prev.commanderNotes || ''} | Incident closed: ${notes}`,
      };
    });

    // Clear matching emergency alarm in alarms state
    setAlarms(prev =>
      prev.map(a =>
        a.tag.includes('AREA-C') || a.id.includes('EMER') || a.id.includes('FIRE')
          ? { ...a, status: 'Cleared' }
          : a
      )
    );

    showToast('Emergency Incident declared ALL CLEAR and safely resolved');
  }, [showToast]);

  const resetEmergencyIncident = useCallback(() => {
    setEmergencyIncident(null);
    setAlarms(prev =>
      prev.map(a =>
        a.tag.includes('AREA-C') || a.id.includes('FIRE-C104')
          ? { ...a, status: 'Cleared' }
          : a
      )
    );
    showToast('Emergency Response system reset to Nominal Standby');
  }, [showToast]);

  // Distribution List
  const addDistributionRecipient = useCallback((recipient: Omit<DistributionRecipient, 'id'>) => {
    const newId = `REC-${Math.floor(10 + Math.random() * 90)}`;
    setDistributionList(prev => [...prev, { ...recipient, id: newId }]);
    showToast(`Added ${recipient.name} to distribution list`);
  }, [showToast]);

  const updateRecipientSubscription = useCallback((id: string, reportKey: keyof DistributionRecipient['subscribedReports'], value: boolean) => {
    setDistributionList(prev =>
      prev.map(r =>
        r.id === id
          ? {
              ...r,
              subscribedReports: {
                ...r.subscribedReports,
                [reportKey]: value,
              },
            }
          : r
      )
    );
  }, []);

  const removeDistributionRecipient = useCallback((id: string) => {
    setDistributionList(prev => prev.filter(r => r.id !== id));
    showToast('Recipient removed from distribution list');
  }, [showToast]);

  return (
    <FacilityContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedGlobalSiteId,
        setSelectedGlobalSiteId,
        enterFacilityWorkspace,
        returnToGlobalLanding,
        activeTab,
        setActiveTab,
        reportActiveSubTab,
        setReportActiveSubTab,
        isLiveStreaming,
        setIsLiveStreaming,
        streamSpeedMs,
        setStreamSpeedMs,
        audioAlertsEnabled,
        setAudioAlertsEnabled,
        telemetryTick,
        liveUpwResistivity,
        liveCleanroomTemp,
        liveCleanroomRh,
        liveCdaPressure,
        liveChilledWaterTemp,
        liveScrubberExhaustSp,
        liveParticleCount01,
        liveFfuSpeedRpm,
        alarms,
        acknowledgeAlarm,
        shelfAlarm,
        unshelfAlarm,
        clearAlarm,
        triggerSimulatedAlarm,
        selectedAlarmForOcap,
        currentOcapPlan,
        isOcapLoading,
        openOcapModal,
        closeOcapModal,
        toggleOcapStep,
        tickets,
        createTicket,
        updateTicketStatus,
        convertAlarmToTicket,
        workPermits,
        createWorkPermit,
        updateWorkPermitStatus,
        shiftReport,
        updateShiftReport,
        approveShiftReport,
        generateAiShiftSummary,
        isGeneratingAiSummary,
        cpkParameters,
        cleanroomBoxplots,
        cleanroomTrends,
        redundantEquipment,
        scadaAnnotations,
        addScadaAnnotation,
        emergencyIncident,
        triggerSimFireAlarm,
        triggerEmergencyIncident,
        acknowledgeEmergencyIncident,
        triggerVerification,
        setVerificationOutcome,
        completeWorkflowSubStep,
        completeErtStep,
        resolveEmergencyIncident,
        resetEmergencyIncident,
        distributionList,
        addDistributionRecipient,
        updateRecipientSubscription,
        removeDistributionRecipient,
        toastMessage,
        showToast,
        isAiAssistantOpen,
        setIsAiAssistantOpen,
        aiAssistantInitialQuery,
        openAiAssistant,
        closeAiAssistant,
        selectedCmmsItem,
        openCmmsItem,
        clearSelectedCmmsItem,
        workflows,
        setWorkflows,
        activeWorkflowId,
        setActiveWorkflowId,
        updateWorkflow,
        addWorkflowNode,
        updateWorkflowNode,
        removeWorkflowNode,
        addWorkflowEdge,
        removeWorkflowEdge,
        createNewWorkflow,
        deleteWorkflow,
        toggleWorkflowToolStatus,
        executeWorkflow,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
};
