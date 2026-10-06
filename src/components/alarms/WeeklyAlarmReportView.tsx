import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Award,
  BarChart3,
  BellOff,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  Info,
  Layers,
  Lock,
  Printer,
  Radio,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  RAW_BAD_ACTORS,
  BadActorItem,
  FLOOD_INCIDENTS,
  FloodIncidentItem,
  SUPPRESSED_ALARMS_DATA,
  SuppressedAlarmItem,
  SuppressionType,
  AVAILABLE_WEEKS_4W,
  getDailyDataForWeek,
} from './alarmData';
import { exportToCsv, triggerPrintReport } from '../../utils/exportUtils';
import { PriorityLevel } from '../../types';
import { useAlarmReport } from '../../context/AlarmReportContext';
import { AiBadge } from '../common/AiBadge';

interface WeeklyAlarmReportViewProps {
  onOpenAiModal: () => void;
  onNavigateSubPage: (subPage: 'weekly_report' | 'hourly_trends' | 'top_bad_actors' | 'nuisance_alarms' | 'rationalization') => void;
  onOpenOcap?: (tag: string) => void;
}

export const WeeklyAlarmReportView: React.FC<WeeklyAlarmReportViewProps> = ({
  onOpenAiModal,
  onNavigateSubPage,
}) => {
  const {
    selectedWeek,
    setSelectedWeek,
    availableWeeks,
    getTopBadActors,
    floodIncidents,
    getSuppressedAlarmsForPeriod,
    isAlarmShelved,
    isAlarmTuned,
    getLinkedWorkOrder,
    tuneAlarmTag,
    shelveAlarmTag,
    raiseWorkOrderForAlarm,
  } = useAlarmReport();

  const [badActorSearch, setBadActorSearch] = useState<string>('');
  const [badActorPriorityFilter, setBadActorPriorityFilter] = useState<string>('ALL');
  
  // Flood filter state
  const [floodSeverityFilter, setFloodSeverityFilter] = useState<string>('ALL');

  // Suppressed alarms filter state
  const [suppressedTypeFilter, setSuppressedTypeFilter] = useState<string>('ALL');
  const [suppressedSearch, setSuppressedSearch] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Active week config
  const activeWeekConfig = useMemo(() => {
    return (availableWeeks && availableWeeks.find(w => w.id === selectedWeek)) || availableWeeks?.[0] || AVAILABLE_WEEKS_4W[0];
  }, [availableWeeks, selectedWeek]);

  // Daily Alarm Volume for selected week broken down by Priority
  const weeklyDailyBreakdown = useMemo(() => {
    return getDailyDataForWeek(selectedWeek);
  }, [selectedWeek]);

  // Total plant alarms for active week
  const totalPlantWeeklyAlarms = activeWeekConfig?.totalAlarms || 182;

  // ---------------------------------------------------------------------------
  // 1. TOP 10 ALARMS DATA (DYNMICALLY COMPUTED FOR SELECTED WEEK)
  // ---------------------------------------------------------------------------
  const top10Alarms = useMemo(() => {
    return getTopBadActors('7days', selectedWeek);
  }, [getTopBadActors, selectedWeek]);

  const filteredTop10 = useMemo(() => {
    return top10Alarms.filter(item => {
      if (badActorPriorityFilter !== 'ALL' && item.priority !== badActorPriorityFilter) {
        return false;
      }
      if (badActorSearch.trim()) {
        const q = badActorSearch.toLowerCase();
        const match =
          item.tag.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.system.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.rootCause.toLowerCase().includes(q) ||
          item.owner.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [top10Alarms, badActorPriorityFilter, badActorSearch]);

  const top10TotalCount = useMemo(() => {
    return top10Alarms.reduce((sum, item) => sum + item.eventCount, 0);
  }, [top10Alarms]);

  const top10Percentage = useMemo(() => {
    if (totalPlantWeeklyAlarms <= 0) return '0.0';
    const pct = (top10TotalCount / totalPlantWeeklyAlarms) * 100;
    return Math.min(100, Math.max(0, pct)).toFixed(1);
  }, [top10TotalCount, totalPlantWeeklyAlarms]);

  // ---------------------------------------------------------------------------
  // 2. ALARM FLOOD EPISODES DATA FOR SELECTED WEEK
  // ---------------------------------------------------------------------------
  const weekFloodIncidents = useMemo(() => {
    return floodIncidents.filter(f => !f.weekId || f.weekId === selectedWeek);
  }, [floodIncidents, selectedWeek]);

  const filteredFloods = useMemo(() => {
    return weekFloodIncidents.filter(item => {
      if (floodSeverityFilter !== 'ALL' && item.severity !== floodSeverityFilter) {
        return false;
      }
      return true;
    });
  }, [weekFloodIncidents, floodSeverityFilter]);

  const floodTotalEpisodes = weekFloodIncidents.length;
  const floodTotalDurationMin = weekFloodIncidents.reduce((acc, f) => acc + f.durationMinutes, 0);
  const maxFloodPeakRate = weekFloodIncidents.length > 0 ? Math.max(...weekFloodIncidents.map(f => f.peakRate10m)) : 0;
  const maxFloodCount = weekFloodIncidents.length > 0 ? Math.max(...weekFloodIncidents.map(f => f.totalEventsInWindow)) : 0;
  const totalFloodAlarmsCount = weekFloodIncidents.reduce((acc, f) => acc + f.totalEventsInWindow, 0);

  // ---------------------------------------------------------------------------
  // 3. SUPPRESSED ALARMS DATA FOR SELECTED WEEK
  // ---------------------------------------------------------------------------
  const suppressedList = useMemo(() => {
    return getSuppressedAlarmsForPeriod(selectedWeek);
  }, [getSuppressedAlarmsForPeriod, selectedWeek]);

  const filteredSuppressed = useMemo(() => {
    return suppressedList.filter(item => {
      if (suppressedTypeFilter !== 'ALL' && item.suppressionType !== suppressedTypeFilter) {
        return false;
      }
      if (suppressedSearch.trim()) {
        const q = suppressedSearch.toLowerCase();
        const match =
          item.tag.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.system.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.authorizedBy.toLowerCase().includes(q) ||
          (item.workOrder && item.workOrder.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [suppressedList, suppressedTypeFilter, suppressedSearch]);

  const suppressedCount = suppressedList.length;
  const operatorShelvedCount = suppressedList.filter(s => s.suppressionType === 'Operator Shelved').length;
  const stateBasedCount = suppressedList.filter(s => s.suppressionType === 'State-Based Mask').length;
  const maintenanceBypassCount = suppressedList.filter(s => s.suppressionType === 'Maintenance Bypass').length;

  const handleUnsuppressAlarm = (tag: string) => {
    setActionFeedback(`Initiated unsuppress review for ${tag}. Verification logged.`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // EXPORT HANDLER
  // ---------------------------------------------------------------------------
  const handleExportCsv = () => {
    const dailyRows = weeklyDailyBreakdown.map(d => ({
      Section: 'Daily Volume Breakdown',
      Item: d.day,
      P1_Critical: d.p1,
      P2_High: d.p2,
      P3_Low: d.p3,
      Total: d.total,
      Hourly_Rate: d.ratePerHour,
      Details: `Rate: ${d.ratePerHour}/hr vs target 6.0/hr`,
    }));

    const top10Rows = top10Alarms.map(item => ({
      Section: 'Top 10 Bad Actor Alarms',
      Item: `#${item.rank} - ${item.tag}`,
      P1_Critical: item.priority === 'P1' ? item.eventCount : 0,
      P2_High: item.priority === 'P2' ? item.eventCount : 0,
      P3_Low: item.priority === 'P3' ? item.eventCount : 0,
      Total: item.eventCount,
      Hourly_Rate: (item.eventCount / 168).toFixed(2),
      Details: `${item.name} (${item.system}) | % Contribution: ${item.loadPct}% | Root Cause: ${item.rootCause} | Action: ${item.recommendation} | Owner: ${item.owner}`,
    }));

    const floodRows = FLOOD_INCIDENTS.map(f => ({
      Section: 'Alarm Flood Episodes',
      Item: f.id,
      P1_Critical: 0,
      P2_High: 0,
      P3_Low: 0,
      Total: f.totalEventsInWindow,
      Hourly_Rate: f.peakRate10m,
      Details: `Window: ${f.timeWindow} (${f.durationMinutes}m) | Peak Rate: ${f.peakRate10m} per 10m | Trigger: ${f.triggerTag} (${f.triggerSystem}) | Cause: ${f.rootCause} | Mitigation: ${f.actionTaken}`,
    }));

    const suppressedRows = suppressedList.map(s => ({
      Section: 'Suppressed & Shelved Alarms',
      Item: s.tag,
      P1_Critical: s.priority === 'P1' ? 1 : 0,
      P2_High: s.priority === 'P2' ? 1 : 0,
      P3_Low: s.priority === 'P3' ? 1 : 0,
      Total: 1,
      Hourly_Rate: s.durationHours,
      Details: `${s.name} (${s.system}) | Type: ${s.suppressionType} | Suppressed: ${s.suppressedAt} | Expires: ${s.expiresAt} | Auth: ${s.authorizedBy} | Reason: ${s.reason} | WO: ${s.workOrder || 'N/A'} | Action: ${s.actionRequired}`,
    }));

    exportToCsv(`Weekly_Alarm_Report_${selectedWeek}`, [
      ...dailyRows,
      ...top10Rows,
      ...floodRows,
      ...suppressedRows,
    ]);
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'P1':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            P1 Critical
          </span>
        );
      case 'P2':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            P2 High
          </span>
        );
      case 'P3':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            P3 Low
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {priority}
          </span>
        );
    }
  };

  const getSuppressionTypeBadge = (type: SuppressionType) => {
    switch (type) {
      case 'Operator Shelved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <VolumeX className="w-3 h-3 text-amber-600" />
            Operator Shelved
          </span>
        );
      case 'State-Based Mask':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Layers className="w-3 h-3 text-indigo-600" />
            State-Based Mask
          </span>
        );
      case 'Maintenance Bypass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <HardHat className="w-3 h-3 text-purple-600" />
            Maintenance Bypass
          </span>
        );
      case 'Deadband Debounce':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Activity className="w-3 h-3 text-cyan-600" />
            Deadband Filtered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <Lock className="w-3 h-3 text-slate-600" />
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =======================================================================
          1. HEADER CARD & WEEK AUDIT SELECTOR
         ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Weekly Alarm System Report
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    Week 35 Audit Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Operational Alarm Analysis, Top 10 Bad Actors, Flood Episodes &amp; Suppressed Alarms
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            <AiBadge
              label="AI Diagnostic"
              variant="button"
              size="sm"
              onClick={onOpenAiModal}
              title="Run AI diagnostic summary on weekly alarm trends"
              colorScheme="emerald"
            />
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              title="Export complete weekly alarm report to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => triggerPrintReport()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
              title="Print clean weekly report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Action Feedback Banner if triggered */}
        {actionFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Week Selector Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label htmlFor="audit-period-select" className="text-xs font-bold text-slate-700">
              Audit Period:
            </label>
            <select
              id="audit-period-select"
              value={selectedWeek}
              onChange={e => setSelectedWeek(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              {availableWeeks.map(w => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Operating State: <strong className="text-emerald-700 font-semibold">Normal (Zero Uncontained Floods)</strong></span>
            <span className="hidden md:inline">&bull;</span>
            <span className="hidden md:inline">Plant Baseline: <strong className="text-slate-800 font-mono">1.08 alarms/hr</strong></span>
          </div>
        </div>
      </div>

      {/* =======================================================================
          2. TOP WEEKLY KPI CARDS GRID
         ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Total Alarms */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Total Alarms (168h)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3 text-emerald-600" /> -14.2% vs W34
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalPlantWeeklyAlarms}</span>
            <span className="text-xs text-slate-500 font-medium">Events / 7 Days</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Average Rate:</span>
            <span className="text-indigo-600 font-mono font-bold">1.08 / hr (0.18 / 10m)</span>
          </div>
        </div>

        {/* KPI 2: Top 10 Bad Actors Load */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Top 10 Bad Actors
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              Pareto Concentration
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{top10Percentage}%</span>
            <span className="text-xs text-slate-500 font-medium">({top10TotalCount} / {totalPlantWeeklyAlarms})</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Chattering Loops:</span>
            <span className="text-purple-700 font-bold font-mono">3 Loops Identified</span>
          </div>
        </div>

        {/* KPI 3: Alarm Flood Episodes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Alarm Floods (&gt;10/10m)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              100% Contained
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{floodTotalEpisodes}</span>
            <span className="text-xs text-slate-500 font-medium">Episodes ({floodTotalDurationMin} min total)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Peak 10m Rate:</span>
            <span className="text-slate-800 font-mono font-bold">{maxFloodPeakRate} alarms / 10m</span>
          </div>
        </div>

        {/* KPI 4: Suppressed & Shelved */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Suppressed Alarms
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
              Authorized Register
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-indigo-600">{suppressedCount}</span>
            <span className="text-xs text-slate-500 font-medium">Active Suppressions</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Operator Shelved:</span>
            <span className="text-amber-700 font-bold font-mono">{operatorShelvedCount} Tags</span>
          </div>
        </div>
      </div>

      {/* =======================================================================
          3. WEEKLY DAY-BY-DAY PROGRESSION CHART
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Weekly Alarm Event Progression &bull; Monday through Sunday (Week 35)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily distribution of P1 (Critical), P2 (High), and P3/P4 (Low) alarms against the 6.0/hr operating limit ceiling.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-3 bg-rose-500 rounded-xs inline-block"></span> P1 Critical
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-3 bg-amber-500 rounded-xs inline-block"></span> P2 High
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-3 bg-indigo-500 rounded-xs inline-block"></span> P3/P4 Low
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyDailyBreakdown} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Daily Alarm Count', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="p1" name="P1 Critical" fill="#f43f5e" stackId="a" />
              <Bar dataKey="p2" name="P2 High" fill="#f59e0b" stackId="a" />
              <Bar dataKey="p3" name="P3/P4 Low" fill="#6366f1" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">TOTAL P1 CRITICAL</span>
            <span className="font-mono font-bold text-rose-600 text-sm">9 Events (4.9%)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">TOTAL P2 HIGH</span>
            <span className="font-mono font-bold text-amber-600 text-sm">27 Events (14.8%)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">TOTAL P3/P4 LOW</span>
            <span className="font-mono font-bold text-indigo-600 text-sm">146 Events (80.3%)</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">MEAN TIME TO ACK (MTTA)</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">1.18 Minutes</span>
          </div>
        </div>
      </section>

      {/* =======================================================================
          4. SECTION FOR TOP 10 ALARMS (SHOWING ALL 10 ALARMS)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Top 10 Bad Actor Alarms
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Showing All 10 Alarms (100%)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pareto ranking of the 10 most frequent alarms in {selectedWeek}, contributing <strong className="text-slate-700 font-mono">{top10TotalCount} alarms ({top10Percentage}% of total plant load)</strong>.
              </p>
            </div>
          </div>

          {/* Search & Priority Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={badActorSearch}
                onChange={e => setBadActorSearch(e.target.value)}
                placeholder="Search tag or system..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setBadActorPriorityFilter('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  badActorPriorityFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (10)
              </button>
              <button
                onClick={() => setBadActorPriorityFilter('P1')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  badActorPriorityFilter === 'P1' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                P1 (3)
              </button>
              <button
                onClick={() => setBadActorPriorityFilter('P2')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  badActorPriorityFilter === 'P2' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                P2 (4)
              </button>
              <button
                onClick={() => setBadActorPriorityFilter('P3')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  badActorPriorityFilter === 'P3' ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                P3 (3)
              </button>
            </div>
          </div>
        </div>

        {/* Top 10 Alarms Full Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-3.5">Alarm Tag &amp; System</th>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-3 text-center">Weekly Events</th>
                <th className="py-3 px-3">% of Plant Load</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTop10.map(item => {
                const itemLoadPct = item.loadPct ?? 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    {/* Rank Badge */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-mono font-bold text-xs ${
                          item.rank === 1
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.rank === 2
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : item.rank === 3
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        #{item.rank}
                      </span>
                    </td>

                    {/* Tag & Subsystem */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 text-xs">{item.tag}</span>
                      </div>
                      <div className="text-[11px] text-slate-800 font-medium">{item.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.system} • {item.location}</div>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getPriorityBadge(item.priority)}
                    </td>

                    {/* Weekly Events Count */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="font-bold text-slate-900 text-sm">{item.eventCount}</span>
                      <span className="text-[10px] text-slate-400 block font-sans">events / wk</span>
                    </td>

                    {/* % Contribution & Visual Bar */}
                    <td className="py-3 px-3">
                      <div className="w-28 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="font-bold text-slate-800">{itemLoadPct}%</span>
                          <span className="text-[10px] text-slate-400">of total</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.rank <= 2 ? 'bg-rose-500' : item.rank <= 5 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(itemLoadPct * 3.5, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => onNavigateSubPage('top_bad_actors')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition border border-slate-300"
                        title="View Bad Actor details"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* =======================================================================
          5. SECTION FOR ALARM FLOOD EPISODES (SIMPLIFIED)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Alarm Flood Episodes
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  {floodTotalEpisodes} Episodes Recorded
                </span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  (Standard Threshold: &gt;10 alarms / 10 min)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Log of high-density alarm surges and flood episodes during Week 35.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFloodSeverityFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                floodSeverityFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Episodes ({FLOOD_INCIDENTS.length})
            </button>
            <button
              onClick={() => setFloodSeverityFilter('Severe')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                floodSeverityFilter === 'Severe' ? 'bg-rose-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Severe (1)
            </button>
            <button
              onClick={() => setFloodSeverityFilter('Moderate')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                floodSeverityFilter === 'Moderate' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Moderate (2)
            </button>
          </div>
        </div>

        {/* Flood KPI Summary Metrics: Keep only Max Flood Count and Peak Surge Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Max Flood Count
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
                Weekly Peak
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{maxFloodCount}</span>
              <span className="text-xs text-slate-500 font-medium">Alarms in Single Flood Window</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
              Total alarms across all flood episodes: <strong className="text-rose-700 font-mono font-bold">{totalFloodAlarmsCount} alarms</strong>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Peak Surge Rate
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
                Surge Density
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold font-mono text-rose-700">{maxFloodPeakRate}</span>
              <span className="text-xs text-slate-500 font-medium">Alarms / 10 Minutes</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">
              Standard compliance ceiling: <strong className="text-slate-800 font-mono font-bold">&le; 10 alarms / 10m</strong>
            </div>
          </div>
        </div>

        {/* Flood Episodes Simplified Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredFloods.map(flood => (
            <div
              key={flood.id}
              className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl transition space-y-3"
            >
              {/* Card Top: Episode ID, Time Window, Severity */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                    {flood.id}
                  </span>
                  <span className="font-mono text-xs text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                    {flood.timeWindow}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold self-start sm:self-auto ${
                    flood.severity === 'Severe'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : flood.severity === 'Moderate'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {flood.severity} Episode ({flood.durationMinutes} min)
                </span>
              </div>

              {/* Flood Scenario Metrics: Total Alarm Count due to flood & Peak Surge Rate */}
              <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Alarm Count
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-mono font-bold text-base text-slate-900">
                      {flood.totalEventsInWindow}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">alarms</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Peak Surge Rate
                  </span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="font-mono font-bold text-base text-rose-600">
                      {flood.peakRate10m}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">/ 10m</span>
                  </div>
                </div>
              </div>

              {/* Trigger Tag & Isolated System */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <AiBadge colorScheme="emerald" label="AI Trigger" variant="subtle" size="xs" />
                  <span className="font-mono font-bold text-slate-900">{flood.triggerTag}</span>
                  <span className="text-[11px] text-slate-500 font-medium">({flood.triggerSystem})</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {flood.suppressionState}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =======================================================================
          6. SECTION FOR SUPPRESSED ALARMS (SHELVED, STATE-BASED, BYPASS)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <VolumeX className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Suppressed &amp; Shelved Alarms Register
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  {suppressedCount} Active Suppressions
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Log of authorized operator-shelved tags, state-based dynamic PLC masks, and maintenance bypasses during Week 35.
              </p>
            </div>
          </div>

          {/* Search & Suppression Type Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={suppressedSearch}
                onChange={e => setSuppressedSearch(e.target.value)}
                placeholder="Search tag or work order..."
                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setSuppressedTypeFilter('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  suppressedTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({suppressedCount})
              </button>
              <button
                onClick={() => setSuppressedTypeFilter('Operator Shelved')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  suppressedTypeFilter === 'Operator Shelved' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shelved ({operatorShelvedCount})
              </button>
              <button
                onClick={() => setSuppressedTypeFilter('State-Based Mask')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  suppressedTypeFilter === 'State-Based Mask' ? 'bg-indigo-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                State Mask ({stateBasedCount})
              </button>
              <button
                onClick={() => setSuppressedTypeFilter('Maintenance Bypass')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  suppressedTypeFilter === 'Maintenance Bypass' ? 'bg-purple-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bypass ({maintenanceBypassCount})
              </button>
            </div>
          </div>
        </div>

        {/* Suppressed Alarms Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3.5">Alarm Tag &amp; Location</th>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-3.5">Suppression Type</th>
                <th className="py-3 px-3 font-mono">Suppressed Window</th>
                <th className="py-3 px-3.5">Reason &amp; Work Order</th>
                <th className="py-3 px-3">Authorized By</th>
                <th className="py-3 px-3.5">Release / Re-Arm Action</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredSuppressed.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  {/* Tag & Location */}
                  <td className="py-3 px-3.5">
                    <div className="font-mono font-bold text-slate-900 text-xs">{item.tag}</div>
                    <div className="text-[11px] text-slate-800 font-medium">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.system} • {item.location}</div>
                  </td>

                  {/* Priority Badge */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {getPriorityBadge(item.priority)}
                  </td>

                  {/* Suppression Classification */}
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    {getSuppressionTypeBadge(item.suppressionType)}
                  </td>

                  {/* Duration & Expiration Window */}
                  <td className="py-3 px-3 font-mono text-[11px]">
                    <div className="text-slate-800 font-semibold">{item.durationHours}h Active</div>
                    <div className="text-[10px] text-slate-500">Exp: {item.expiresAt}</div>
                  </td>

                  {/* Reason & Work Order */}
                  <td className="py-3 px-3.5 max-w-xs">
                    <div className="text-[11px] text-slate-700 leading-snug">
                      {item.reason}
                    </div>
                    {item.workOrder && (
                      <span className="inline-block mt-1 font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {item.workOrder}
                      </span>
                    )}
                  </td>

                  {/* Authorizing Lead */}
                  <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-700 font-medium">
                    {item.authorizedBy}
                  </td>

                  {/* Release Action */}
                  <td className="py-3 px-3.5 max-w-xs text-[11px] text-slate-600 leading-snug">
                    <span className="text-[10px] font-bold text-amber-800 block">Condition: {item.tripCondition}</span>
                    {item.actionRequired}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleUnsuppressAlarm(item.tag)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition border border-slate-200"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Link banner to dedicated Rationalization Sub-Page */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span>Alarm Rationalization</span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Dedicated Sub-Tab
              </span>
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              Setpoint rationalization, deadband hysteresis tuning, and active parameter change records are managed in the dedicated <strong>Rationalization</strong> sub-tab.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateSubPage('rationalization')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs"
        >
          <span>Open Rationalization Tab</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </section>
    </div>
  );
};
