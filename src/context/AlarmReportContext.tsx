import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import {
  BadActorItem,
  ChatteringAlarmItem,
  StandingAlarmItem,
  ShelvedAlarmItem,
  SuppressedAlarmItem,
  FloodIncidentItem,
  CalendarDayItem,
  AvailableWeekItem,
  RAW_BAD_ACTORS,
  PAST_7_DAYS,
  AVAILABLE_WEEKS_4W,
  FLOOD_INCIDENTS,
  SUPPRESSED_ALARMS_DATA,
  SHELVED_ALARMS_REGISTER,
  CHATTERING_ALARMS,
  STANDING_ALARMS,
  PERIOD_CHATTERING_MAP,
  PERIOD_STANDING_MAP,
  PERIOD_SHELVED_MAP,
  PERIOD_SUPPRESSED_MAP,
  PERIOD_ACTIONS_MAP,
  PERIOD_PM_DELIVERABLES_MAP,
  PmDeliverableItem,
  ALL_RATIONALIZATION_CHANGES,
  RationalizationChangeItem,
  getHourlyDataForDate,
  getDailyDataForWeek,
} from '../components/alarms/alarmData';
import { useFacility } from './FacilityContext';
import { PriorityLevel, SystemCategory } from '../types';

export interface TunedChatteringRecord {
  tag: string;
  isTuned: boolean;
  newDeadband: string;
  mocTicketId: string;
  originalBursts: number;
  reductionPct: number;
  tunedAt: string;
  author: string;
}

export interface LinkedWorkOrderRecord {
  tag: string;
  workOrderId: string;
  status: string;
  title: string;
  category: string;
  location: string;
  createdAt: string;
}

export interface BadActorWithStats extends BadActorItem {
  rank: number;
  eventCount: number;
  loadPct: number;
  cumPct: number;
  totalEvents: number;
  totalFacilityAlarms: number;
  shortTag: string;
  isShelved: boolean;
  isTuned: boolean;
  mocTicketId?: string;
  linkedWorkOrder?: string;
}

interface AlarmReportContextType {
  // Period & Time Horizon Selection
  periodMode: '24hr' | '7days';
  setPeriodMode: (mode: '24hr' | '7days') => void;
  selectedDate: string; // '2026-08-30'
  setSelectedDate: (date: string) => void;
  selectedWeek: string; // 'W35-2026'
  setSelectedWeek: (week: string) => void;
  activePeriodLabel: string;
  activePeriodRange: string;

  // Available Lists
  past7Days: CalendarDayItem[];
  availableWeeks: AvailableWeekItem[];

  // Active Day and Week Configurations
  activeDayConfig: CalendarDayItem;
  activeWeekConfig: AvailableWeekItem;

  // Global Cross-Page Reactive State
  shelvedAlarms: ShelvedAlarmItem[];
  shelveAlarm: (item: {
    tag: string;
    system: string;
    description: string;
    durationHours: number;
    reason: string;
    authorizedBy: string;
    workOrder?: string;
    priority?: string;
  }) => void;
  shelveAlarmTag: (
    tag: string,
    durationHours?: number,
    reason?: string,
    authorizedBy?: string,
    workOrder?: string
  ) => void;
  unshelfAlarm: (tag: string) => void;
  unshelveAlarmTag: (tag: string) => void;
  isAlarmShelved: (tag: string) => boolean;

  // Chattering Tuning & MOCs
  tunedChatteringMap: Record<string, TunedChatteringRecord>;
  tuneChatteringAlarm: (tag: string, newDeadband: string, actionDesc: string) => string;
  tuneAlarmTag: (tag: string) => boolean;
  resetChatteringTuning: (tag: string) => void;
  isAlarmTuned: (tag: string) => boolean;

  // Work Orders Integration
  linkedWorkOrders: Record<string, LinkedWorkOrderRecord>;
  linkWorkOrderToAlarm: (tag: string, woId: string, title: string, category?: string, location?: string, description?: string) => void;
  raiseWorkOrderForAlarm: (tag: string, woId: string, title: string, category?: string, location?: string, description?: string) => void;
  getLinkedWorkOrder: (tag: string) => LinkedWorkOrderRecord | undefined;

  // Flood Incidents
  floodIncidents: FloodIncidentItem[];
  triggerSimulatedFlood: (override?: Partial<FloodIncidentItem>) => FloodIncidentItem;
  addSimulatedFlood: (flood: FloodIncidentItem) => void;
  clearSimulatedFlood: (id: string) => void;

  // Dynamic Period-Specific Data Getters
  getTopBadActors: (customMode?: '24hr' | '7days', customId?: string) => BadActorWithStats[];
  getChatteringAlarms: (customMode?: '24hr' | '7days', customId?: string) => (ChatteringAlarmItem & { isTuned: boolean; mocTicketId?: string })[];
  getChatteringAlarmsForPeriod: (customMode?: '24hr' | '7days', customId?: string) => (ChatteringAlarmItem & { isTuned: boolean; mocTicketId?: string })[];
  getStandingAlarms: (customMode?: '24hr' | '7days', customId?: string) => (StandingAlarmItem & { isShelved: boolean; activeWorkOrder: string })[];
  getStandingAlarmsForPeriod: (customMode?: '24hr' | '7days', customId?: string) => (StandingAlarmItem & { isShelved: boolean; activeWorkOrder: string })[];
  getShelvedAlarmsForPeriod: (customPeriodKeyOrMode?: string, customId?: string) => ShelvedAlarmItem[];
  getSuppressedAlarmsForPeriod: (customWeek?: string) => SuppressedAlarmItem[];
  getEngineeringActionsForPeriod: (customWeek?: string) => any[];
  getPmDeliverablesForPeriod: (customWeek?: string) => PmDeliverableItem[];
  getAllRationalizationItems: () => RationalizationChangeItem[];

  // Dynamic Aggregations for Active Selection
  currentTop10: BadActorWithStats[];
  currentChattering: (ChatteringAlarmItem & { isTuned: boolean; mocTicketId?: string })[];
  currentStanding: (StandingAlarmItem & { isShelved: boolean; activeWorkOrder: string })[];
  currentShelved: ShelvedAlarmItem[];
  currentSuppressed: SuppressedAlarmItem[];
  currentFloods: FloodIncidentItem[];
  currentHourlyData: ReturnType<typeof getHourlyDataForDate>;
  currentDailyData: ReturnType<typeof getDailyDataForWeek>;
}

const AlarmReportContext = createContext<AlarmReportContextType | undefined>(undefined);

export const AlarmReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { createTicket, showToast } = useFacility();

  // Selected Horizon & Periods
  const [periodMode, setPeriodMode] = useState<'24hr' | '7days'>('7days');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-30');
  const [selectedWeek, setSelectedWeek] = useState<string>('W35-2026');

  // Shared Shelved Alarms Registry (starts with baseline shelved list)
  const [shelvedAlarms, setShelvedAlarms] = useState<ShelvedAlarmItem[]>(SHELVED_ALARMS_REGISTER);

  // Tuned Chattering Alarms Map
  const [tunedChatteringMap, setTunedChatteringMap] = useState<Record<string, TunedChatteringRecord>>({});

  // Linked Work Orders Map
  const [linkedWorkOrders, setLinkedWorkOrders] = useState<Record<string, LinkedWorkOrderRecord>>({
    'SCRUB-DP-01': {
      tag: 'SCRUB-DP-01',
      workOrderId: 'WO-7892',
      status: 'Scheduled',
      title: 'Scrubber Tower 1 Demister Chemical Cleanout',
      category: 'Scrubber & Exhaust',
      location: 'Roof Exhaust Deck',
      createdAt: '2026-08-29 09:30',
    },
    'ELEC-UPS-N1-01': {
      tag: 'ELEC-UPS-N1-01',
      workOrderId: 'WO-7901',
      status: 'In Progress',
      title: 'Substation PDU #4 Phase Rebalance & Breaker Torque',
      category: 'Electrical & N+1 UPS',
      location: 'Substation Sub-level B',
      createdAt: '2026-08-29 14:15',
    },
  });

  // Dynamic Flood Incidents
  const [floodIncidents, setFloodIncidents] = useState<FloodIncidentItem[]>(FLOOD_INCIDENTS);

  // Active configurations
  const activeDayConfig = useMemo(() => {
    return PAST_7_DAYS.find(d => d.id === selectedDate) || PAST_7_DAYS[0];
  }, [selectedDate]);

  const activeWeekConfig = useMemo(() => {
    return AVAILABLE_WEEKS_4W.find(w => w.id === selectedWeek) || AVAILABLE_WEEKS_4W[0];
  }, [selectedWeek]);

  const activePeriodLabel = useMemo(() => {
    return periodMode === '24hr' ? activeDayConfig.label : activeWeekConfig.label;
  }, [periodMode, activeDayConfig, activeWeekConfig]);

  const activePeriodRange = useMemo(() => {
    return periodMode === '24hr' ? activeDayConfig.date : activeWeekConfig.dateRange;
  }, [periodMode, activeDayConfig, activeWeekConfig]);

  // --- ACTIONS ---

  const shelveAlarm = useCallback((item: {
    tag: string;
    system: string;
    description: string;
    durationHours: number;
    reason: string;
    authorizedBy: string;
    workOrder?: string;
    priority?: string;
  }) => {
    const now = new Date();
    const expiry = new Date(now.getTime() + item.durationHours * 3600 * 1000);
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);
    const expStr = expiry.toISOString().replace('T', ' ').substring(0, 16);

    const newShelved: ShelvedAlarmItem = {
      tag: item.tag,
      system: item.system,
      description: item.description,
      shelvedAt: dateStr,
      shelveDurationHours: item.durationHours,
      expiresAt: expStr,
      authorizedBy: item.authorizedBy,
      reason: item.reason,
    };

    setShelvedAlarms(prev => {
      const filtered = prev.filter(s => s.tag !== item.tag);
      return [newShelved, ...filtered];
    });

    showToast(`🔕 Alarm ${item.tag} successfully shelved for ${item.durationHours} hours.`);
  }, [showToast]);

  const unshelfAlarm = useCallback((tag: string) => {
    setShelvedAlarms(prev => prev.filter(s => s.tag !== tag));
    showToast(`🔔 Alarm ${tag} unshelved and restored to active SCADA monitoring.`);
  }, [showToast]);

  const isAlarmShelved = useCallback((tag: string) => {
    return shelvedAlarms.some(s => s.tag === tag);
  }, [shelvedAlarms]);

  // Chattering Tuning & MOC
  const tuneChatteringAlarm = useCallback((tag: string, newDeadband: string, actionDesc: string) => {
    const mocNumber = `MOC-2026-${Math.floor(8800 + Math.random() * 150)}`;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // Create Maintenance MOC Ticket
    createTicket({
      id: mocNumber,
      title: `[MOC Rationalization] ${tag} - ${actionDesc}`,
      category: 'Scrubber & Exhaust',
      priority: 'P2',
      status: 'In Progress',
      location: 'SCADA PLC Controller Rack',
      assignedOwner: 'Marcus Vance (Shift Lead)',
      source: 'Automated Alarm Rule',
      workOrderType: 'PM (Preventive)',
      estimatedHours: 2,
      description: `MOC applied to tag ${tag}: Deadband widened to ${newDeadband}. Sensor debounce filter applied to suppress chattering rate by ~85%.`,
      linkedAlarmId: tag,
    });

    setTunedChatteringMap(prev => ({
      ...prev,
      [tag]: {
        tag,
        isTuned: true,
        newDeadband,
        mocTicketId: mocNumber,
        originalBursts: 6,
        reductionPct: 85,
        tunedAt: now,
        author: 'Marcus Vance (Shift Lead)',
      },
    }));

    showToast(`✨ MOC ${mocNumber} approved! Deadband updated for ${tag} (-85% alarm noise).`);
    return mocNumber;
  }, [createTicket, showToast]);

  const resetChatteringTuning = useCallback((tag: string) => {
    setTunedChatteringMap(prev => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    showToast(`Reset filter settings for ${tag}.`);
  }, [showToast]);

  const isAlarmTuned = useCallback((tag: string) => {
    return !!tunedChatteringMap[tag]?.isTuned;
  }, [tunedChatteringMap]);

  // Link Work Order
  const linkWorkOrderToAlarm = useCallback((tag: string, woId: string, title: string, category = 'General', location = 'Fab 1', description?: string) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    setLinkedWorkOrders(prev => ({
      ...prev,
      [tag]: {
        tag,
        workOrderId: woId,
        status: 'Open',
        title,
        category,
        location,
        createdAt: now,
      },
    }));
  }, []);

  const getLinkedWorkOrder = useCallback((tag: string) => {
    return linkedWorkOrders[tag];
  }, [linkedWorkOrders]);

  // Trigger Simulated Flood
  const triggerSimulatedFlood = useCallback((override?: Partial<FloodIncidentItem>) => {
    const newId = `FL-LIVE-${Date.now().toString().slice(-4)}`;
    const now = new Date();
    const timeStr = `Today, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} – Active`;

    const newFlood: FloodIncidentItem = {
      id: newId,
      weekId: selectedWeek,
      timeWindow: timeStr,
      durationMinutes: 6,
      peakRate10m: 12,
      totalEventsInWindow: 15,
      triggerTag: override?.triggerTag || 'CDA-PRESS-01',
      triggerSystem: override?.triggerSystem || 'Clean Dry Air (CDA) & N2',
      rootCause: override?.rootCause || 'Simulated Header Pressure Spike during rapid Bay 4 tool purge ramp',
      suppressionState: 'Active',
      actionTaken: override?.actionTaken || 'Dynamic first-out rule engaged; downstream secondary transmitter alerts auto-suppressed',
      affectedTagsCount: 8,
      severity: 'Severe',
      ...override,
    };

    setFloodIncidents(prev => [newFlood, ...prev]);
    showToast(`🚨 Active Alarm Flood simulated on ${newFlood.triggerTag} (${newFlood.peakRate10m} alarms/10m)!`);
    return newFlood;
  }, [selectedWeek, showToast]);

  const clearSimulatedFlood = useCallback((id: string) => {
    setFloodIncidents(prev => prev.filter(f => f.id !== id));
    showToast(`Simulated flood cleared.`);
  }, [showToast]);

  // --- PERIOD-SPECIFIC DATA GETTERS ---

  // Top 10 Bad Actors computation
  const getTopBadActors = useCallback((customMode?: '24hr' | '7days', customId?: string): BadActorWithStats[] => {
    const mode = customMode || periodMode;
    const periodId = customId || (mode === '24hr' ? selectedDate : selectedWeek);

    let multiplier = 1.0;
    let totalFacilityAlarms = 182;

    if (mode === '24hr') {
      const day = PAST_7_DAYS.find(d => d.id === periodId) || PAST_7_DAYS[0];
      totalFacilityAlarms = day.dailyTotal;
      multiplier = day.dailyTotal / 26;
    } else {
      const week = AVAILABLE_WEEKS_4W.find(w => w.id === periodId) || AVAILABLE_WEEKS_4W[0];
      totalFacilityAlarms = week.totalAlarms;
      multiplier = week.totalAlarms / 182;
    }

    const rawList = RAW_BAD_ACTORS.map(item => {
      let count = 0;
      if (mode === '24hr') {
        count = Math.max(1, Math.round(item.baseDailyCount * multiplier));
        if (periodId === '2026-08-28' && item.tag === 'CDA-PRESS-01') count = 8;
        if (periodId === '2026-08-25' && item.tag === 'UPW-RESIST-01') count = 8;
        if (periodId === '2026-08-26' && item.tag === 'SCRUB-DP-01') count = 7;
        if (periodId === '2026-08-29' && item.tag === 'CHILLER-CHW-01') count = 4;
      } else {
        count = Math.max(2, Math.round(item.baseWeeklyCount * multiplier));
        if (periodId === 'W34-2026' && item.tag === 'CHILLER-CHW-01') count = 32;
        if (periodId === 'W33-2026' && item.tag === 'HVAC-CR-DP-BAY3') count = 29;
        if (periodId === 'W32-2026' && item.tag === 'ELEC-UPS-N1-01') count = 34;
      }

      // If tuned in reactive state, decrease count by 85%
      const isTuned = !!tunedChatteringMap[item.tag]?.isTuned;
      if (isTuned) {
        count = Math.max(1, Math.round(count * 0.15));
      }

      // Check if shelved
      const isShelved = shelvedAlarms.some(s => s.tag === item.tag);

      // Check linked work order
      const linkedWo = linkedWorkOrders[item.tag]?.workOrderId;

      return {
        ...item,
        eventCount: count,
        isShelved,
        isTuned,
        mocTicketId: tunedChatteringMap[item.tag]?.mocTicketId,
        linkedWorkOrder: linkedWo,
      };
    });

    const sorted = [...rawList].sort((a, b) => b.eventCount - a.eventCount).slice(0, 10);
    const totalEvents = sorted.reduce((sum, item) => sum + item.eventCount, 0);

    let runningSum = 0;
    return sorted.map((item, idx) => {
      runningSum += item.eventCount;
      const loadPct = totalFacilityAlarms > 0 ? Number(Math.min(100, Math.max(0, (item.eventCount / totalFacilityAlarms) * 100)).toFixed(1)) : 0;
      const cumPct = totalEvents > 0 ? Number(Math.min(100, Math.max(0, (runningSum / totalEvents) * 100)).toFixed(1)) : 0;

      return {
        ...item,
        rank: idx + 1,
        loadPct,
        cumPct,
        percentOfTotal: loadPct,
        totalEvents,
        totalFacilityAlarms,
        shortTag: item.tag.replace('-01', '').replace('HVAC-CR-', 'CR-'),
      };
    });
  }, [periodMode, selectedDate, selectedWeek, tunedChatteringMap, shelvedAlarms, linkedWorkOrders]);

  // Chattering Alarms getter
  const getChatteringAlarms = useCallback((customMode?: '24hr' | '7days', customId?: string) => {
    const mode = customMode || periodMode;
    const periodId = customId || (mode === '24hr' ? selectedDate : selectedWeek);

    const baseList: ChatteringAlarmItem[] = PERIOD_CHATTERING_MAP[periodId] || CHATTERING_ALARMS;

    return baseList.map(item => {
      const tuned = tunedChatteringMap[item.tag];
      if (tuned && tuned.isTuned) {
        return {
          ...item,
          togglesPerMin: Number((item.togglesPerMin * 0.15).toFixed(1)),
          totalTogglesWeek: Math.max(1, Math.round(item.totalTogglesWeek * 0.15)),
          currentDeadband: tuned.newDeadband,
          action: `Tuned & Debounced (${tuned.mocTicketId})`,
          isTuned: true,
          mocTicketId: tuned.mocTicketId,
        };
      }
      return {
        ...item,
        isTuned: false,
      };
    });
  }, [periodMode, selectedDate, selectedWeek, tunedChatteringMap]);

  // Standing Alarms getter
  const getStandingAlarms = useCallback((customMode?: '24hr' | '7days', customId?: string) => {
    const mode = customMode || periodMode;
    const periodId = customId || (mode === '24hr' ? selectedDate : selectedWeek);

    const baseList: StandingAlarmItem[] = PERIOD_STANDING_MAP[periodId] || STANDING_ALARMS;

    return baseList.map(item => {
      const isShelved = shelvedAlarms.some(s => s.tag === item.tag);
      const linkedWo = linkedWorkOrders[item.tag];
      const activeWorkOrder = linkedWo ? `${linkedWo.workOrderId} (${linkedWo.status})` : item.workOrder;

      return {
        ...item,
        isShelved,
        activeWorkOrder,
      };
    });
  }, [periodMode, selectedDate, selectedWeek, shelvedAlarms, linkedWorkOrders]);

  // Shelved Alarms getter
  const getShelvedAlarmsForPeriod = useCallback((customMode?: '24hr' | '7days', customId?: string) => {
    const mode = customMode || periodMode;
    const periodId = customId || (mode === '24hr' ? selectedDate : selectedWeek);

    const periodDefaults = PERIOD_SHELVED_MAP[periodId] || SHELVED_ALARMS_REGISTER;
    const allTags = new Set<string>();
    const merged: ShelvedAlarmItem[] = [];

    // Prioritize reactive state
    shelvedAlarms.forEach(s => {
      if (!allTags.has(s.tag)) {
        allTags.add(s.tag);
        merged.push(s);
      }
    });

    // Add period defaults if not unshelved
    periodDefaults.forEach(s => {
      if (!allTags.has(s.tag)) {
        allTags.add(s.tag);
        merged.push(s);
      }
    });

    return merged;
  }, [periodMode, selectedDate, selectedWeek, shelvedAlarms]);

  // Suppressed Alarms getter
  const getSuppressedAlarmsForPeriod = useCallback((customWeek?: string) => {
    const week = customWeek || selectedWeek;
    return PERIOD_SUPPRESSED_MAP[week] || SUPPRESSED_ALARMS_DATA;
  }, [selectedWeek]);

  // Engineering Actions getter
  const getEngineeringActionsForPeriod = useCallback((customWeek?: string) => {
    const week = customWeek || selectedWeek;
    const baseActions = PERIOD_ACTIONS_MAP[week] || [];

    // Dynamically update action status if tuned or WO linked
    return baseActions.map((action: any) => {
      const isTuned = tunedChatteringMap[action.tag]?.isTuned;
      const linkedWo = linkedWorkOrders[action.tag];

      if (isTuned) {
        return {
          ...action,
          status: 'MOC Completed',
          impact: `MOC ${tunedChatteringMap[action.tag].mocTicketId} verified. Deadband widened, 85% noise eliminated.`,
        };
      }
      if (linkedWo) {
        return {
          ...action,
          status: 'WO Assigned',
          impact: `Work order ${linkedWo.workOrderId} in progress. Clears standing duration.`,
        };
      }
      return action;
    });
  }, [selectedWeek, tunedChatteringMap, linkedWorkOrders]);

  // PM Deliverables getter
  const getPmDeliverablesForPeriod = useCallback((customWeek?: string) => {
    const week = customWeek || selectedWeek;
    const basePmList = PERIOD_PM_DELIVERABLES_MAP[week] || [];

    return basePmList.map(pm => {
      const isTuned = tunedChatteringMap[pm.tag]?.isTuned;
      const linkedWo = linkedWorkOrders[pm.tag];

      if (isTuned || linkedWo) {
        return {
          ...pm,
          status: 'Completed' as const,
          alarmImpact: `MOC/WO verified. 85% nuisance eliminated & standing duration cleared.`,
        };
      }
      return pm;
    });
  }, [selectedWeek, tunedChatteringMap, linkedWorkOrders]);

  // All Active Alarm Rationalization Changes (Plant-wide / Timeframe-independent)
  const getAllRationalizationItems = useCallback((): RationalizationChangeItem[] => {
    return ALL_RATIONALIZATION_CHANGES.map(item => {
      const isTuned = tunedChatteringMap[item.tag]?.isTuned;
      const linkedWo = linkedWorkOrders[item.tag];

      if (isTuned) {
        return {
          ...item,
          status: 'MOC Completed' as const,
          targetBenefit: `MOC ${tunedChatteringMap[item.tag].mocTicketId} executed. Hysteresis widened, 85% nuisance eliminated.`,
        };
      }
      if (linkedWo) {
        return {
          ...item,
          status: 'In Progress' as const,
          targetBenefit: `Work order ${linkedWo.workOrderId} dispatched. Threshold calibration in progress.`,
        };
      }
      return item;
    });
  }, [tunedChatteringMap, linkedWorkOrders]);

  // Active Pre-calculated values
  const currentTop10 = useMemo(() => getTopBadActors(), [getTopBadActors]);
  const currentChattering = useMemo(() => getChatteringAlarms(), [getChatteringAlarms]);
  const currentStanding = useMemo(() => getStandingAlarms(), [getStandingAlarms]);
  const currentShelved = useMemo(() => getShelvedAlarmsForPeriod(), [getShelvedAlarmsForPeriod]);
  const currentSuppressed = useMemo(() => getSuppressedAlarmsForPeriod(), [getSuppressedAlarmsForPeriod]);
  const currentFloods = useMemo(() => {
    if (periodMode === '7days') {
      return floodIncidents.filter(f => !f.weekId || f.weekId === selectedWeek);
    } else {
      return floodIncidents.filter(f => f.timeWindow.includes(activeDayConfig.shortLabel) || f.id.includes('LIVE') || (selectedDate === '2026-08-28' && f.id === 'FL-2026-08-28-01') || (selectedDate === '2026-08-25' && f.id === 'FL-2026-08-25-01'));
    }
  }, [periodMode, selectedWeek, selectedDate, activeDayConfig, floodIncidents]);

  const currentHourlyData = useMemo(() => getHourlyDataForDate(selectedDate), [selectedDate]);
  const currentDailyData = useMemo(() => getDailyDataForWeek(selectedWeek), [selectedWeek]);

  // Shelve Alarm Tag alias helper
  const shelveAlarmTag = useCallback(
    (tag: string, durationHours = 4, reason = 'Operator Shelved', authorizedBy = 'Shift Lead', workOrder = '') => {
      const foundItem = RAW_BAD_ACTORS.find(b => b.tag === tag);
      shelveAlarm({
        tag,
        system: foundItem?.system || 'General Facilities',
        description: foundItem?.name || `Alarm tag ${tag}`,
        durationHours,
        reason,
        authorizedBy,
        workOrder,
      });
    },
    [shelveAlarm]
  );

  const unshelveAlarmTag = useCallback((tag: string) => {
    unshelfAlarm(tag);
  }, [unshelfAlarm]);

  const tuneAlarmTag = useCallback((tag: string) => {
    if (isAlarmTuned(tag)) {
      resetChatteringTuning(tag);
      return false;
    } else {
      const found = RAW_BAD_ACTORS.find(b => b.tag === tag);
      const rec = found?.recommendation || 'Apply deadband and debounce filter';
      tuneChatteringAlarm(tag, 'Widened Deadband (+15%)', rec);
      return true;
    }
  }, [isAlarmTuned, resetChatteringTuning, tuneChatteringAlarm]);

  const raiseWorkOrderForAlarm = useCallback(
    (tag: string, woId: string, title: string, category = 'General', location = 'Fab 1', description?: string) => {
      linkWorkOrderToAlarm(tag, woId, title, category, location, description);
    },
    [linkWorkOrderToAlarm]
  );

  const addSimulatedFlood = useCallback((flood: FloodIncidentItem) => {
    setFloodIncidents(prev => [flood, ...prev]);
  }, []);

  // Getter aliases for period-specific calls
  const getChatteringAlarmsForPeriod = useCallback(
    (customMode?: '24hr' | '7days', customId?: string) => {
      return getChatteringAlarms(customMode, customId);
    },
    [getChatteringAlarms]
  );

  const getStandingAlarmsForPeriod = useCallback(
    (customMode?: '24hr' | '7days', customId?: string) => {
      return getStandingAlarms(customMode, customId);
    },
    [getStandingAlarms]
  );

  return (
    <AlarmReportContext.Provider
      value={{
        periodMode,
        setPeriodMode,
        selectedDate,
        setSelectedDate,
        selectedWeek,
        setSelectedWeek,
        activePeriodLabel,
        activePeriodRange,
        past7Days: PAST_7_DAYS,
        availableWeeks: AVAILABLE_WEEKS_4W,
        activeDayConfig,
        activeWeekConfig,
        shelvedAlarms,
        shelveAlarm,
        shelveAlarmTag,
        unshelfAlarm,
        unshelveAlarmTag,
        isAlarmShelved,
        tunedChatteringMap,
        tuneChatteringAlarm,
        tuneAlarmTag,
        resetChatteringTuning,
        isAlarmTuned,
        linkedWorkOrders,
        linkWorkOrderToAlarm,
        raiseWorkOrderForAlarm,
        getLinkedWorkOrder,
        floodIncidents,
        triggerSimulatedFlood,
        addSimulatedFlood,
        clearSimulatedFlood,
        getTopBadActors,
        getChatteringAlarms,
        getChatteringAlarmsForPeriod,
        getStandingAlarms,
        getStandingAlarmsForPeriod,
        getShelvedAlarmsForPeriod,
        getSuppressedAlarmsForPeriod,
        getEngineeringActionsForPeriod,
        getPmDeliverablesForPeriod,
        getAllRationalizationItems,
        currentTop10,
        currentChattering,
        currentStanding,
        currentShelved,
        currentSuppressed,
        currentFloods,
        currentHourlyData,
        currentDailyData,
      }}
    >
      {children}
    </AlarmReportContext.Provider>
  );
};

export const useAlarmReport = () => {
  const context = useContext(AlarmReportContext);
  if (!context) {
    throw new Error('useAlarmReport must be used within an AlarmReportProvider');
  }
  return context;
};
