import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Layers,
  PauseCircle,
  PlayCircle,
  Plus,
  PlusCircle,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CHATTERING_ALARMS,
  STANDING_ALARMS,
  SHELVED_ALARMS_REGISTER,
  ChatteringAlarmItem,
  StandingAlarmItem,
  ShelvedAlarmItem,
  PAST_7_DAYS,
  AVAILABLE_WEEKS_4W,
} from './alarmData';
import { exportToCsv, exportToJson, triggerPrintReport } from '../../utils/exportUtils';
import { useFacility } from '../../context/FacilityContext';
import { useAlarmReport } from '../../context/AlarmReportContext';
import { MaintenanceTicket, PriorityLevel, SystemCategory } from '../../types';
import { AiBadge } from '../common/AiBadge';

interface NuisanceAlarmsViewProps {
  onOpenAiModal: () => void;
  onShelveAlarm: (alarm: any) => void;
  showToast: (msg: string) => void;
  onOpenOcap?: (tag: string) => void;
}

export const NuisanceAlarmsView: React.FC<NuisanceAlarmsViewProps> = ({
  onOpenAiModal,
  showToast,
}) => {
  const {
    tickets,
    createTicket,
    shelfAlarm: facilityShelfAlarm,
    setActiveTab: setGlobalActiveTab,
  } = useFacility();

  const {
    periodMode: timeHorizon,
    setPeriodMode: setTimeHorizon,
    selectedDate,
    setSelectedDate,
    selectedWeek,
    setSelectedWeek,
    past7Days,
    availableWeeks,
    getChatteringAlarmsForPeriod,
    getStandingAlarmsForPeriod,
    getShelvedAlarmsForPeriod,
    tuneAlarmTag,
    shelveAlarmTag,
    unshelveAlarmTag,
    raiseWorkOrderForAlarm,
    isAlarmTuned,
    isAlarmShelved,
    getLinkedWorkOrder,
  } = useAlarmReport();

  const [activeTab, setActiveTab] = useState<'chattering' | 'standing' | 'shelved'>('chattering');

  // Period key: either date or week id
  const periodKey = timeHorizon === '24hr' ? selectedDate : selectedWeek;

  // Dynamically load period-specific lists from context
  const chatteringList = useMemo(() => {
    return getChatteringAlarmsForPeriod(timeHorizon, periodKey);
  }, [getChatteringAlarmsForPeriod, timeHorizon, periodKey]);

  const standingList = useMemo(() => {
    return getStandingAlarmsForPeriod(timeHorizon, periodKey);
  }, [getStandingAlarmsForPeriod, timeHorizon, periodKey]);

  const shelvedList = useMemo(() => {
    return getShelvedAlarmsForPeriod(periodKey);
  }, [getShelvedAlarmsForPeriod, periodKey]);

  // --- RAISE WORK ORDER MODAL STATE ---
  const [selectedAlarmForWo, setSelectedAlarmForWo] = useState<StandingAlarmItem | null>(null);
  const [woFormId, setWoFormId] = useState<string>('');
  const [woFormTitle, setWoFormTitle] = useState<string>('');
  const [woFormCategory, setWoFormCategory] = useState<SystemCategory>('Scrubber & Exhaust');
  const [woFormLocation, setWoFormLocation] = useState<string>('');
  const [woFormDescription, setWoFormDescription] = useState<string>('');

  // --- SHELVE MODAL STATE ---
  const [selectedAlarmForShelve, setSelectedAlarmForShelve] = useState<StandingAlarmItem | null>(null);
  const [shelveHours, setShelveHours] = useState<number>(8);
  const [shelveReason, setShelveReason] = useState<string>('');
  const [shelveAuthorizedBy, setShelveAuthorizedBy] = useState<string>('Marcus Vance (Shift Lead)');

  // Helper map to find linked tickets for each alarm tag
  const linkedTicketsMap = useMemo(() => {
    const map = new Map<string, MaintenanceTicket>();
    tickets.forEach(ticket => {
      if (ticket.linkedAlarmId) {
        map.set(ticket.linkedAlarmId, ticket);
      }
    });
    return map;
  }, [tickets]);

  // Handle opening the Raise WO modal
  const handleOpenRaiseWoModal = (item: StandingAlarmItem) => {
    const newWoNumber = `WO-${Math.floor(7920 + Math.random() * 70)}`;
    setWoFormId(newWoNumber);
    setWoFormTitle(`[${item.tag}] ${item.description}`);
    setWoFormCategory((item.system as SystemCategory) || 'Scrubber & Exhaust');
    setWoFormLocation(item.location || 'Fab 1 Sub-Module Area');
    setWoFormDescription(
      `Standing alarm excursion on tag ${item.tag}: ${item.description}. ` +
      `Trip reading ${item.tripValue} vs nominal setpoint ${item.setpoint} (Active continuously for ${item.durationHours} hours). ` +
      `Engineering Root Cause: ${item.reason}.`
    );
    setSelectedAlarmForWo(item);
  };

  // Handle submitting the Raise WO modal
  const handleSubmitRaiseWo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlarmForWo) return;

    // Determine default owner based on system
    let defaultOwner = 'David Kim (Facilities Lead)';
    if (selectedAlarmForWo.system.includes('Gas') || selectedAlarmForWo.system.includes('Scrubber')) {
      defaultOwner = 'Elena Rostova (Gas & Chemical)';
    } else if (selectedAlarmForWo.system.includes('UPS') || selectedAlarmForWo.system.includes('Electric')) {
      defaultOwner = 'Dave Kowalski (Electrical Tech)';
    } else if (selectedAlarmForWo.system.includes('HVAC') || selectedAlarmForWo.system.includes('Cleanroom')) {
      defaultOwner = 'Marcus Vance (HVAC System Owner)';
    }

    // 1. Create Maintenance Work Order in FacilityContext (instantly appears in CMMS Work Orders)
    const newTicket = createTicket({
      id: woFormId,
      title: woFormTitle,
      category: woFormCategory,
      priority: (selectedAlarmForWo.priority as PriorityLevel) || 'P2',
      status: 'Open',
      location: woFormLocation,
      assignedOwner: defaultOwner,
      source: 'Automated Alarm Rule',
      workOrderType: 'CM (Corrective)',
      estimatedHours: selectedAlarmForWo.priority === 'P1' ? 2 : 4,
      description: woFormDescription,
      linkedAlarmId: selectedAlarmForWo.tag,
    });

    // 2. Synchronize with AlarmReportContext so all alarm pages reflect the new WO
    raiseWorkOrderForAlarm(
      selectedAlarmForWo.tag,
      newTicket.id,
      woFormTitle,
      woFormCategory,
      woFormLocation,
      woFormDescription
    );

    showToast(`✅ Work Order ${newTicket.id} successfully created and linked to ${selectedAlarmForWo.tag}`);
    setSelectedAlarmForWo(null);
  };

  // Handle opening the Shelve modal for a standing alarm
  const handleOpenShelveModal = (item: StandingAlarmItem) => {
    // Check if a work order exists in context or tickets
    const linkedWO = getLinkedWorkOrder(item.tag);
    const linkedTicket = linkedTicketsMap.get(item.tag) || tickets.find(t => t.id === item.workOrder.split(' ')[0] || item.workOrder.includes(t.id));
    const woReference = linkedWO ? `${linkedWO.workOrderId} (${linkedWO.title})` : linkedTicket ? `${linkedTicket.id} (${linkedTicket.title})` : item.workOrder;

    let defaultReason = '';
    if (linkedWO) {
      defaultReason = `Authorized temporary suppression under CMMS Work Order ${linkedWO.workOrderId}: ${linkedWO.title}. Root cause: ${item.reason}`;
    } else if (linkedTicket) {
      defaultReason = `Authorized temporary suppression under CMMS Work Order ${linkedTicket.id}: ${linkedTicket.title}. Root cause: ${item.reason}`;
    } else if (item.workOrder && !item.workOrder.toLowerCase().includes('no')) {
      defaultReason = `Authorized temporary suppression under Work Order ${item.workOrder}. Root cause: ${item.reason}`;
    } else {
      defaultReason = `Operational suppression for standing alarm inspection (${item.tag}). Root cause: ${item.reason}`;
    }

    setShelveHours(8);
    setShelveAuthorizedBy('Marcus Vance (Shift Lead)');
    setShelveReason(defaultReason);
    setSelectedAlarmForShelve(item);
  };

  // Handle confirming the Shelve action
  const handleConfirmShelve = () => {
    if (!selectedAlarmForShelve) return;

    const linkedWO = getLinkedWorkOrder(selectedAlarmForShelve.tag);
    const linkedTicket = linkedTicketsMap.get(selectedAlarmForShelve.tag) || tickets.find(t => t.id === selectedAlarmForShelve.workOrder.split(' ')[0] || selectedAlarmForShelve.workOrder.includes(t.id));
    const woId = linkedWO?.workOrderId || linkedTicket?.id;

    // 1. Call context shelfAlarm
    facilityShelfAlarm(selectedAlarmForShelve.tag, shelveHours, shelveReason);

    // 2. Synchronize with AlarmReportContext so all alarm pages reflect the shelved alarm
    shelveAlarmTag(
      selectedAlarmForShelve.tag,
      shelveHours,
      shelveReason,
      shelveAuthorizedBy || 'Shift Lead',
      woId
    );

    showToast(
      `Alarm ${selectedAlarmForShelve.tag} shelved for ${shelveHours}h${
        woId ? ` under Work Order ${woId}` : ''
      }.`
    );
    setSelectedAlarmForShelve(null);
  };

  const handleToggleMoc = (tag: string) => {
    const isNowTuned = tuneAlarmTag(tag);
    if (isNowTuned) {
      showToast(`Management of Change (MOC) raised for tag ${tag}`);
    } else {
      showToast(`MOC status cleared for tag ${tag}`);
    }
  };

  const handleUnshelve = (tag: string) => {
    unshelveAlarmTag(tag);
    showToast(`Alarm tag ${tag} has been unshelved and restored to active annunciator queue.`);
  };

  const handleExportCsv = () => {
    exportToCsv(
      `Nuisance_Alarms_Report_${timeHorizon}_${periodKey}`,
      [
        ...chatteringList.map(c => ({
          Category: 'Chattering',
          Tag: c.tag,
          Description: c.description,
          Toggles: c.totalTogglesWeek,
          CurrentDeadband: c.currentDeadband,
          Recommended: c.recommendedDeadband,
          MocStatus: isAlarmTuned(c.tag) ? 'MOC Raised' : 'Pending',
        })),
        ...standingList.map(s => ({
          Category: 'Standing',
          Tag: s.tag,
          Description: s.description,
          Frequency: `${s.durationHours} hrs`,
          Toggles: 'Standing',
          CurrentDeadband: s.tripValue,
          Recommended: s.setpoint,
          WorkOrder: getLinkedWorkOrder(s.tag)?.workOrderId || s.workOrder,
        })),
      ]
    );
  };

  const handleExportJson = () => {
    exportToJson(
      `Nuisance_Alarms_Report_${timeHorizon}_${periodKey}`,
      {
        timeHorizon,
        period: periodKey,
        chatteringAlarms: chatteringList,
        standingAlarms: standingList,
        shelvedAlarms: shelvedList,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Nuisance, Chattering &amp; Standing Alarms
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nuisance Alarm Rationalization, CMMS Work Order Dispatch, and Shelving Management
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AiBadge
              label="AI Tuning Audit"
              variant="button"
              size="sm"
              onClick={onOpenAiModal}
              title="Run AI Nuisance Alarm Rationalization Audit"
              colorScheme="emerald"
            />
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => triggerPrintReport()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Time Horizon Mode Selector & Period Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setTimeHorizon('24hr')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  timeHorizon === '24hr'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>24-Hour Horizon</span>
              </button>
              <button
                onClick={() => setTimeHorizon('7days')}
                className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                  timeHorizon === '7days'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>7-Day Multi-Week</span>
              </button>
            </div>

            {/* Sub-selector based on mode */}
            {timeHorizon === '24hr' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Calendar Date:</span>
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 font-mono font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {(past7Days || PAST_7_DAYS).map(day => (
                    <option key={day.id} value={day.id}>
                      {day.label} ({day.date})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium">Audit Week:</span>
                <select
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1 font-mono font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {(availableWeeks || AVAILABLE_WEEKS_4W).map(week => (
                    <option key={week.id} value={week.id}>
                      {week.label} ({week.dateRange})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>CMMS Integration:</span>
            <strong className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live Synchronized
            </strong>
          </div>
        </div>

        {/* Nuisance Category Tabs */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('chattering')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'chattering'
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-purple-600" />
              <span>Chattering ({chatteringList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('standing')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'standing'
                  ? 'bg-white text-amber-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Standing &gt;24h ({standingList.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('shelved')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'shelved'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 text-indigo-600" />
              <span>Shelved ({shelvedList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Chattering Loops
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-purple-600">{chatteringList.length}</span>
            <span className="text-xs text-slate-500 font-medium">Loops Identified</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            MOC Protocol: <strong className="text-purple-700">Engineering Review</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Standing (&gt;24h)
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{standingList.length}</span>
            <span className="text-xs text-slate-500 font-medium">Uncleared Tags</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Max Stale: <strong className="text-amber-700 font-mono">31.2 hrs (UPS Phase)</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
            Shelved Alarms
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-indigo-600">{shelvedList.length}</span>
            <span className="text-xs text-slate-500 font-medium">Authorized Inactive</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            Protocol: <strong className="text-indigo-700">Linked to Work Orders</strong>
          </div>
        </div>
      </div>

      {/* 3. Tab 1: Chattering & Fleeting Alarms Log */}
      {activeTab === 'chattering' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Identified Chattering &amp; Fleeting Tags ({chatteringList.length} Active Loops)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-frequency state toggling. Recommended deadband tuning and PLC debounce timers.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold font-mono">
                {chatteringList.length} Loops Pending Tuning
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tag &amp; Description</th>
                    <th className="py-3 px-4 text-center">Weekly Toggles</th>
                    <th className="py-3 px-4">Current Deadband</th>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span>Recommended Tuning</span>
                        <AiBadge colorScheme="emerald" variant="icon-only" size="xs" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {chatteringList.map(item => (
                    <tr key={item.tag} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{item.tag}</span>
                        <span className="text-[10px] text-slate-500">{item.description}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-center">{item.totalTogglesWeek}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{item.currentDeadband}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700 bg-emerald-50/50">
                        <div className="flex items-center gap-1.5">
                          <AiBadge colorScheme="emerald" label="AI Deadband" variant="subtle" size="xs" />
                          <span>{item.recommendedDeadband}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleMoc(item.tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs inline-flex items-center gap-1.5 ${
                            isAlarmTuned(item.tag)
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-800 hover:bg-slate-900 text-white'
                          }`}
                        >
                          {isAlarmTuned(item.tag) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          <span>{isAlarmTuned(item.tag) ? 'MOC Active' : 'Raise MOC'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {chatteringList.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                        <div className="font-bold text-slate-800">All Chattering Loops Rationalized</div>
                        <div className="text-xs text-slate-500">Deadband filters successfully active across all plant SCADA loops.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab 2: Standing Alarms Log (>24 Hours) */}
      {activeTab === 'standing' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Active Standing Alarms (&gt;24 Hours Stale Annunciation)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Long-duration alarms requiring immediate maintenance intervention (Raise WO) or formal temporary suppression (Shelve).
              </p>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-bold text-xs font-mono">
              {standingList.length} Standing Tags Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tag &amp; System</th>
                  <th className="py-3 px-4">Description &amp; Location</th>
                  <th className="py-3 px-4">Active Duration</th>
                  <th className="py-3 px-4">Trip vs Setpoint</th>
                  <th className="py-3 px-4">Engineering Root Cause</th>
                  <th className="py-3 px-4">Linked CMMS Work Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {standingList.map(item => {
                  const linkedTicket = linkedTicketsMap.get(item.tag) || tickets.find(t => t.id === item.workOrder.split(' ')[0] || (item.workOrder && item.workOrder.includes(t.id)));
                  return (
                    <tr key={item.tag} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">{item.tag}</span>
                        <span className="text-[10px] text-slate-500">{item.system}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.description}</div>
                        <div className="text-[10px] text-slate-500">{item.location}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {item.durationHours} hrs
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-rose-600 font-bold">{item.tripValue}</span> / {item.setpoint}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">{item.reason}</td>
                      <td className="py-3 px-4">
                        {linkedTicket ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {linkedTicket.id}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">
                                {linkedTicket.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[170px]" title={linkedTicket.title}>
                              {linkedTicket.title}
                            </div>
                          </div>
                        ) : item.workOrder && !item.workOrder.toLowerCase().includes('no') ? (
                          <span className="font-mono font-bold text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block truncate max-w-[180px]">
                            {item.workOrder}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            No WO Raised Yet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenRaiseWoModal(item)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Raise a CMMS Work Order for this standing alarm"
                          >
                            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Raise WO</span>
                          </button>
                          <button
                            onClick={() => handleOpenShelveModal(item)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Shelve standing alarm with linked Work Order details"
                          >
                            <VolumeX className="w-3.5 h-3.5 text-slate-600" />
                            <span>Shelve</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {standingList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <div className="font-bold text-slate-800">No Active Standing Alarms</div>
                      <div className="text-xs text-slate-500">All stale alarms have been rectified through CMMS work orders or authorized shelving.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Tab 3: Shelved Alarms Register */}
      {activeTab === 'shelved' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <VolumeX className="w-4 h-4 text-indigo-600" />
                Authorized Alarm Shelving Register
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Active temporary alarm suppressions authorized during scheduled maintenance with linked Work Orders and formal auto-expiration limits.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold font-mono">
              {shelvedList.length} Active Shelved Tags
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tag &amp; System</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Shelved Timestamp</th>
                  <th className="py-3 px-4">Duration &amp; Expiry</th>
                  <th className="py-3 px-4">Authorized Lead</th>
                  <th className="py-3 px-4">Engineering Justification &amp; Linked WO</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {shelvedList.map(item => (
                  <tr key={item.tag} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block">{item.tag}</span>
                      <span className="text-[10px] text-slate-500">{item.system}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.description}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.shelvedAt}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-indigo-700">{item.shelveDurationHours} hrs</div>
                      <div className="text-[10px] text-slate-500">Expires: {item.expiresAt}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.authorizedBy}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-sm">
                      <div className="line-clamp-2">{item.reason}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleUnshelve(item.tag)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-bold transition shadow-xs"
                      >
                        Unshelve Now
                      </button>
                    </td>
                  </tr>
                ))}
                {shelvedList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <div className="font-bold text-slate-800">No Active Shelved Alarms</div>
                      <div className="text-xs text-slate-500">All annunciators are actively armed with zero operational bypasses.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP MODAL 1: RAISE CMMS WORK ORDER FOR STANDING ALARM                 */}
      {/* ========================================================================= */}
      {selectedAlarmForWo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    Raise CMMS Work Order
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-mono font-normal">
                      {selectedAlarmForWo.tag}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Dispatch corrective maintenance ticket directly into CMMS Work Orders &amp; Permits database.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAlarmForWo(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitRaiseWo}>
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
                {/* Alarm Source Context Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-700" />
                      Standing Alarm Excursion ({selectedAlarmForWo.durationHours} Hours Active)
                    </span>
                    <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Reading: {selectedAlarmForWo.tripValue} (SP: {selectedAlarmForWo.setpoint})
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    {selectedAlarmForWo.description} — Location: {selectedAlarmForWo.location}
                  </p>
                </div>

                {/* Form Row 1: WO ID & System / Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Work Order ID</label>
                    <input
                      type="text"
                      value={woFormId}
                      onChange={e => setWoFormId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">System / Category</label>
                    <select
                      value={woFormCategory}
                      onChange={e => setWoFormCategory(e.target.value as SystemCategory)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      <option value="Scrubber & Exhaust">Scrubber &amp; Exhaust</option>
                      <option value="Specialty Gases (TGM)">Specialty Gases (TGM)</option>
                      <option value="Ultra Pure Water (UPW)">Ultra Pure Water (UPW)</option>
                      <option value="Thermal & Chiller Plant">Thermal &amp; Chiller Plant</option>
                      <option value="Cleanroom HVAC & FFU">Cleanroom HVAC &amp; FFU</option>
                      <option value="Electrical & N+1 UPS">Electrical &amp; N+1 UPS</option>
                      <option value="Voice of Customer (VOC)">Voice of Customer (VOC)</option>
                    </select>
                  </div>
                </div>

                {/* Form Row 2: Location */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Location</label>
                  <input
                    type="text"
                    value={woFormLocation}
                    onChange={e => setWoFormLocation(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800"
                    placeholder="e.g. Roof Exhaust Deck, Sub-Module Area"
                  />
                </div>

                {/* Form Row 3: Title */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Work Order Title</label>
                  <input
                    type="text"
                    value={woFormTitle}
                    onChange={e => setWoFormTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                    placeholder="Brief descriptive title for maintenance dispatch..."
                  />
                </div>

                {/* Form Row 4: Detailed Engineering Scope */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Excursion Description &amp; Root Cause</label>
                  <textarea
                    value={woFormDescription}
                    onChange={e => setWoFormDescription(e.target.value)}
                    rows={4}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                    placeholder="Detail specific physical symptoms, instrument readings, and investigation protocol..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Auto-dispatches to CMMS Work Orders &amp; Tech Queue
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAlarmForWo(null)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Submit &amp; Dispatch WO</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POP-UP MODAL 2: SHELVE STANDING ALARM WITH WORK ORDER DETAILS              */}
      {/* ========================================================================= */}
      {selectedAlarmForShelve && (() => {
        const linkedTicket = linkedTicketsMap.get(selectedAlarmForShelve.tag) || tickets.find(t => t.id === selectedAlarmForShelve.workOrder.split(' ')[0] || (selectedAlarmForShelve.workOrder && selectedAlarmForShelve.workOrder.includes(t.id)));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                    <VolumeX className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      Authorized Alarm Shelving
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono font-normal">
                        {selectedAlarmForShelve.tag}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Temporarily suppress alarm annunciation with mandatory Work Order reference and auto-expiry.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlarmForShelve(null)}
                  className="text-slate-400 hover:text-white p-1 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 text-xs text-slate-700">
                {/* Alarm Overview Box */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-indigo-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-sm text-indigo-950">
                      {selectedAlarmForShelve.tag}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-200/60 text-indigo-900 font-bold font-mono">
                      Active: {selectedAlarmForShelve.durationHours} hrs
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-800 font-medium">
                    {selectedAlarmForShelve.description}
                  </div>
                  <div className="text-[10px] text-indigo-700 flex items-center justify-between pt-1">
                    <span>System: {selectedAlarmForShelve.system}</span>
                    <span>Location: {selectedAlarmForShelve.location}</span>
                  </div>
                </div>

                {/* WORK ORDER INFORMATION SECTION (Prominently displayed) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Linked CMMS Work Order Information</span>
                    {linkedTicket && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Verified CMMS Link
                      </span>
                    )}
                  </label>

                  {linkedTicket ? (
                    /* Display rich linked WO info */
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {linkedTicket.id}
                          </span>
                          <span className="text-[11px] font-bold text-slate-800">
                            {linkedTicket.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                          {linkedTicket.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Assigned Lead:</span>
                          <span className="font-semibold text-slate-800">{linkedTicket.assignedOwner}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Category &amp; Priority:</span>
                          <span className="font-semibold text-slate-800">{linkedTicket.category} ({linkedTicket.priority})</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-emerald-900 bg-emerald-50/70 p-1.5 rounded border border-emerald-100">
                        <strong>Compliance Note:</strong> This Work Order will be formally attached to the Shelving Register audit trail.
                      </div>
                    </div>
                  ) : selectedAlarmForShelve.workOrder && !selectedAlarmForShelve.workOrder.toLowerCase().includes('no') ? (
                    /* Fallback display for pre-existing work order string */
                    <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Work Order Reference:</span>
                        <span className="font-mono font-bold text-emerald-700 text-xs">
                          {selectedAlarmForShelve.workOrder}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                        Scheduled
                      </span>
                    </div>
                  ) : (
                    /* Notice if NO Work Order has been raised yet */
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-900">
                          <strong>No Work Order Linked Yet:</strong> Standing alarms (&gt;24h) require an active CMMS work order for compliance audit approval.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const alarmToRaise = selectedAlarmForShelve;
                          setSelectedAlarmForShelve(null);
                          handleOpenRaiseWoModal(alarmToRaise);
                        }}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>+ Raise CMMS Work Order First</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Shelve Duration Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Shelve Duration (Auto-Expiry Limit):</label>
                  <select
                    value={shelveHours}
                    onChange={e => setShelveHours(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value={1}>1 Hour (Quick Sensor Wipe / Diagnostic)</option>
                    <option value={2}>2 Hours (Filter Cartridge Replacement)</option>
                    <option value={4}>4 Hours (Standard Shift PM Window)</option>
                    <option value={8}>8 Hours (Full Shift Major Overhaul)</option>
                    <option value={24}>24 Hours (Full Day Re-engineering Bypass)</option>
                    <option value={48}>48 Hours (Weekend Scheduled Turnaround)</option>
                  </select>
                </div>

                {/* Authorized Approver */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Authorized Shift Lead / Engineer:</label>
                  <input
                    type="text"
                    value={shelveAuthorizedBy}
                    onChange={e => setShelveAuthorizedBy(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold"
                    placeholder="e.g. Marcus Vance (Shift Lead)"
                  />
                </div>

                {/* Engineering Justification Text Area */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">
                    Engineering Justification &amp; Work Order Notes:
                  </label>
                  <textarea
                    value={shelveReason}
                    onChange={e => setShelveReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                    placeholder="Enter reason for shelving, technician authorization, and maintenance window..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAlarmForShelve(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmShelve}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Confirm Shelving ({shelveHours}h)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

