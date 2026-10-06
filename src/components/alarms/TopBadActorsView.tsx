import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  Search,
  ShieldAlert,
  Sliders,
  Sparkles,
  TrendingDown,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
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
  PAST_7_DAYS,
  AVAILABLE_WEEKS_4W,
  getTop10BadActors,
} from './alarmData';
import { PriorityLevel, SystemCategory } from '../../types';
import { exportToCsv, exportToJson, triggerPrintReport } from '../../utils/exportUtils';
import { useAlarmReport } from '../../context/AlarmReportContext';
import { AiBadge } from '../common/AiBadge';
import { Wrench, X, ShieldCheck } from 'lucide-react';

interface TopBadActorsViewProps {
  onOpenAiModal: () => void;
  onShelveAlarm: (alarm: any) => void;
  showToast: (msg: string) => void;
  onOpenOcap?: (tag: string) => void;
}

export const TopBadActorsView: React.FC<TopBadActorsViewProps> = ({
  onOpenAiModal,
  onShelveAlarm,
  showToast,
}) => {
  const {
    periodMode: timeHorizon,
    setPeriodMode: setTimeHorizon,
    selectedDate,
    setSelectedDate,
    selectedWeek,
    setSelectedWeek,
    past7Days,
    availableWeeks,
    getTopBadActors,
    isAlarmShelved,
    isAlarmTuned,
    getLinkedWorkOrder,
  } = useAlarmReport();

  const [selectedTagId, setSelectedTagId] = useState<string>('UPW-RESIST-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [showBadActorAiModal, setShowBadActorAiModal] = useState<boolean>(false);
  const [advisorBadActor, setAdvisorBadActor] = useState<any>(null);

  // Active day config for 24hr mode
  const activeDayConfig = useMemo(() => {
    return (past7Days && past7Days.find(d => d.id === selectedDate)) || past7Days?.[0] || PAST_7_DAYS[0];
  }, [past7Days, selectedDate]);

  // Active week config for 7days mode
  const activeWeekConfig = useMemo(() => {
    return (availableWeeks && availableWeeks.find(w => w.id === selectedWeek)) || availableWeeks?.[0] || AVAILABLE_WEEKS_4W[0];
  }, [availableWeeks, selectedWeek]);

  // Dynamically compute Top 10 with rank and Pareto cumulative percentages
  const top10BadActors = useMemo(() => {
    return getTopBadActors(
      timeHorizon,
      timeHorizon === '24hr' ? selectedDate : selectedWeek
    );
  }, [getTopBadActors, timeHorizon, selectedDate, selectedWeek]);

  // Currently active selected tag object
  const activeBadActor = useMemo(() => {
    return top10BadActors.find(t => t.id === selectedTagId) || top10BadActors[0];
  }, [top10BadActors, selectedTagId]);

  // Filtered Top 10 for table search and filters
  const filteredTop10 = useMemo(() => {
    return top10BadActors.filter(item => {
      if (selectedArea !== 'All') {
        if (selectedArea === 'Cleanroom' && !item.location.includes('Cleanroom') && !item.location.includes('Bay')) return false;
        if (selectedArea === 'CUB' && !item.location.includes('CUB') && !item.location.includes('Building')) return false;
        if (selectedArea === 'SubFab' && !item.location.includes('SubFab') && !item.location.includes('Skid')) return false;
      }
      if (selectedSystem !== 'All' && item.system !== selectedSystem) return false;
      if (selectedPriority !== 'All' && item.priority !== selectedPriority) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.tag.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.system.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.rootCause.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [top10BadActors, selectedArea, selectedSystem, selectedPriority, searchQuery]);

  // Pareto load stats
  const top10TotalEvents = useMemo(() => {
    return top10BadActors.reduce((sum, item) => sum + item.eventCount, 0);
  }, [top10BadActors]);

  const top3LoadPct = useMemo(() => {
    if (top10BadActors.length >= 3) {
      return (top10BadActors[0].loadPct + top10BadActors[1].loadPct + top10BadActors[2].loadPct).toFixed(1);
    }
    return '0.0';
  }, [top10BadActors]);

  const top10LoadPct = useMemo(() => {
    const totalFacility = timeHorizon === '24hr' ? activeDayConfig.dailyTotal : activeWeekConfig.totalAlarms;
    if (totalFacility <= 0) return '0.0';
    return ((top10TotalEvents / totalFacility) * 100).toFixed(1);
  }, [timeHorizon, activeDayConfig, activeWeekConfig, top10TotalEvents]);

  const handleExportCsv = () => {
    exportToCsv(
      `Top_10_Bad_Actors_${timeHorizon}_${timeHorizon === '24hr' ? selectedDate : selectedWeek}`,
      top10BadActors.map(item => ({
        Rank: item.rank,
        Tag: item.tag,
        Name: item.name,
        System: item.system,
        Location: item.location,
        Priority: item.priority,
        'Event Count': item.eventCount,
        'Facility Load %': item.loadPct,
        'Cumulative Top 10 %': item.cumPct,
        'Root Cause': item.rootCause,
        Remediation: item.recommendation,
        Owner: item.owner,
      }))
    );
  };

  const handleExportJson = () => {
    exportToJson(
      `Top_10_Bad_Actors_${timeHorizon}_${timeHorizon === '24hr' ? selectedDate : selectedWeek}`,
      {
        timeHorizon,
        period: timeHorizon === '24hr' ? selectedDate : selectedWeek,
        totalEventsInTop10: top10TotalEvents,
        top10BadActors,
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card & Primary Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Top 10 Bad Actor Analysis (Pareto Distribution)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeHorizon === '24hr'
                ? '24-Hour Tag-Level Alarm Concentration (Selectable past 7 calendar days)'
                : '7-Day Multi-Week Bad Actor Pareto Ranking (Selectable past 4 audit weeks)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AiBadge
              label="AI Bad Actor Advisor"
              colorScheme="emerald"
              variant="button"
              size="sm"
              onClick={() => {
                setAdvisorBadActor(activeBadActor);
                setShowBadActorAiModal(true);
              }}
              title="Launch AI Root Cause & Remediation Advisor"
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

        {/* Primary Period Selection (24hr vs 7 Days) and Range Pickers */}
        <div className="pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-slate-100">
          {/* Time Horizon Mode Toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Period:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setTimeHorizon('24hr')}
                className={`px-3.5 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  timeHorizon === '24hr'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>24hr</span>
              </button>
              <button
                onClick={() => setTimeHorizon('7days')}
                className={`px-3.5 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 ${
                  timeHorizon === '7days'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>7 Days</span>
              </button>
            </div>

            {/* Sub-selector based on Time Horizon */}
            {timeHorizon === '24hr' ? (
              <div className="flex items-center gap-2 flex-wrap">
                {/* HTML5 Date Input Picker (Calendar to -7 days: 2026-08-24 to 2026-08-30) */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-500 font-medium">Calendar:</span>
                  <input
                    type="date"
                    min="2026-08-24"
                    max="2026-08-30"
                    value={selectedDate}
                    onChange={e => {
                      if (e.target.value) {
                        setSelectedDate(e.target.value);
                      }
                    }}
                    className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs cursor-pointer"
                  />
                </div>

                {/* Quick day dropdown */}
                <select
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
                >
                  {PAST_7_DAYS.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({d.dailyTotal} alarms)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Week selector (-4 weeks matching Weekly Alarm Report) */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-slate-500 font-medium">Audit Week:</span>
                  <select
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs cursor-pointer"
                  >
                    {AVAILABLE_WEEKS_4W.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>ISA 18.2 Guideline:</span>
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Top 10 should generate &lt; 50% of total alarms
            </span>
          </div>
        </div>

        {/* Fast selector pills for past 7 days (in 24hr mode) or 4 weeks (in 7days mode) */}
        <div className="pt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap mr-1">
            {timeHorizon === '24hr' ? 'Past 7 Days (-7d):' : 'Audit Range (-4w):'}
          </span>
          {timeHorizon === '24hr' ? (
            PAST_7_DAYS.map(day => (
              <button
                key={day.id}
                onClick={() => setSelectedDate(day.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition border ${
                  selectedDate === day.id
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day.shortLabel} ({day.dailyTotal})
              </button>
            ))
          ) : (
            AVAILABLE_WEEKS_4W.map(week => (
              <button
                key={week.id}
                onClick={() => setSelectedWeek(week.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition border ${
                  selectedWeek === week.id
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {week.shortLabel} ({week.totalAlarms} alarms)
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Pareto KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Top 10 Total Alarms */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Top 10 Alarm Volume
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold font-mono">
              {timeHorizon === '24hr' ? activeDayConfig.shortLabel : activeWeekConfig.shortLabel}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{top10TotalEvents}</span>
            <span className="text-xs text-slate-500 font-medium">events in top 10</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Facility Total:{' '}
              <strong className="text-slate-800 font-mono">
                {timeHorizon === '24hr' ? activeDayConfig.dailyTotal : activeWeekConfig.totalAlarms} alarms
              </strong>
            </span>
            <span className="text-slate-700 font-semibold">{top10LoadPct}% share</span>
          </div>
        </div>

        {/* KPI 2: Top 3 Concentration */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Top 3 Concentration
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
              Primary Focus
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-rose-600">{top3LoadPct}%</span>
            <span className="text-xs text-slate-500 font-medium">of facility alarms</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Rank #1 Tag:{' '}
              <strong className="text-indigo-700 font-mono">
                {top10BadActors[0]?.tag || 'None'}
              </strong>
            </span>
            <span className="text-rose-700 font-semibold">{top10BadActors[0]?.eventCount || 0} ev</span>
          </div>
        </div>

        {/* KPI 3: Chattering Bad Actors */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Chattering Bad Actors
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">
              Deadband Drift
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-purple-600">
              {top10BadActors.filter(b => b.isChattering).length}
            </span>
            <span className="text-xs text-slate-500 font-medium">tags with &gt;3 bursts/hr</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Debounce Candidate:{' '}
              <strong className="text-slate-800 font-mono">UPW-RESIST-01</strong>
            </span>
            <span className="text-purple-700 font-semibold">Tune +0.05</span>
          </div>
        </div>

        {/* KPI 4: Rationalization Readiness */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Work Orders / MOC
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Actionable
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">8 / 10</span>
            <span className="text-xs text-slate-500 font-medium">with root causes</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Remediation Potential:{' '}
              <strong className="text-emerald-700 font-mono">-65% Alarms</strong>
            </span>
            <span className="text-emerald-700 font-semibold">High ROI</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Pareto Distribution Chart (Dual-Axis) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Pareto Distribution: Individual Alarm Counts &amp; Cumulative Percentage
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeHorizon === '24hr'
                ? `Daily Bad Actor Pareto profile for ${activeDayConfig.label}`
                : `Weekly Bad Actor Pareto profile for ${activeWeekConfig.label}`}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-3 h-3 bg-indigo-600 rounded-xs inline-block"></span> Alarm Count (Left Axis)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> Cumulative % (Right Axis)
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-600">
              <span className="w-3 h-0.5 bg-amber-500 stroke-dasharray-2 inline-block"></span> 80% Pareto Cutoff
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={top10BadActors} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="shortTag"
                tick={{ fontSize: 10, fill: '#475569' }}
                interval={0}
                angle={-25}
                textAnchor="end"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                label={{ value: 'Alarm Events', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '80% Pareto Limit', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }} />
              <Bar
                yAxisId="left"
                dataKey="eventCount"
                name="Alarm Count"
                fill="#4f46e5"
                radius={[4, 4, 0, 0]}
                onClick={(entry: any) => setSelectedTagId(entry.id)}
                className="cursor-pointer"
              >
                {top10BadActors.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.id === selectedTagId ? '#312e81' : entry.priority === 'P1' ? '#f43f5e' : '#6366f1'}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumPct"
                name="Cumulative %"
                stroke="#e11d48"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#e11d48' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Pareto Insight:</strong> Addressing the top 3 bad actors (
            <span className="font-mono font-bold text-slate-900">
              {top10BadActors.slice(0, 3).map(b => b.tag).join(', ')}
            </span>
            ) will eliminate <strong>{top3LoadPct}%</strong> of all facility alarm noise.
          </div>
          <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 whitespace-nowrap">
            Selected: {activeBadActor?.tag} ({activeBadActor?.eventCount} events)
          </span>
        </div>
      </div>

      {/* 4. Active Tag Deep Dive Card */}
      {activeBadActor && (
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center font-mono text-sm">
                #{activeBadActor.rank}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="font-mono text-indigo-700">{activeBadActor.tag}</span>
                  <span className="text-slate-400">—</span>
                  <span>{activeBadActor.name}</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Location: <strong className="text-slate-700">{activeBadActor.location}</strong> | System:{' '}
                  <strong className="text-slate-700">{activeBadActor.system}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`font-bold px-2.5 py-1 rounded text-xs ${
                  activeBadActor.priority === 'P1'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : activeBadActor.priority === 'P2'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                Priority: {activeBadActor.priority}
              </span>
              <button
                onClick={() =>
                  onShelveAlarm({
                    id: activeBadActor.id,
                    tag: activeBadActor.tag,
                    description: activeBadActor.name,
                    priority: activeBadActor.priority,
                    system: activeBadActor.system,
                    value: activeBadActor.currentValue,
                    setpoint: activeBadActor.setpoint,
                    location: activeBadActor.location,
                  })
                }
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition"
              >
                Shelve Tag
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Telemetry &amp; Setpoint</span>
              <div className="font-mono font-bold text-slate-900 mt-1">
                {activeBadActor.currentValue} / {activeBadActor.setpoint}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Period Event Volume</span>
              <div className="font-mono font-bold text-indigo-600 mt-1">
                {activeBadActor.eventCount} alarms ({activeBadActor.loadPct}% facility load)
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Nuisance Characteristic</span>
              <div className="font-semibold text-slate-800 mt-1">
                {activeBadActor.isChattering ? 'Chattering (Rapid Cycling)' : activeBadActor.standingHours > 0 ? `Standing (${activeBadActor.standingHours}h)` : 'Transient Spike'}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px] block">Responsible Lead</span>
              <div className="font-medium text-slate-800 mt-1">{activeBadActor.owner}</div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <AiBadge colorScheme="emerald" label="AI Root Cause &amp; Remediation" variant="badge" size="xs" />
              </span>
              <AiBadge
                label="AI Remediation Advisor"
                variant="button"
                size="xs"
                onClick={() => {
                  setAdvisorBadActor(activeBadActor);
                  setShowBadActorAiModal(true);
                }}
              />
            </div>
            <div className="text-slate-800 font-semibold">
              Root Mechanism:{' '}
              <span className="font-normal text-slate-700">{activeBadActor.rootCause}</span>
            </div>
            <div className="text-indigo-900 font-semibold">
              Engineering Remediation:{' '}
              <span className="font-normal text-indigo-800">{activeBadActor.recommendation}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Detailed Top 10 Table & Search/Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Top 10 Bad Actor Register &amp; Action Plan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by total event occurrence for the selected period. Click any row to inspect deep-dive telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tag, system, root cause..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 w-56 text-slate-800 placeholder-slate-400"
              />
            </div>
            <select
              value={selectedArea}
              onChange={e => setSelectedArea(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5"
            >
              <option value="All">All Locations</option>
              <option value="Cleanroom">Cleanroom</option>
              <option value="CUB">CUB</option>
              <option value="SubFab">SubFab</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Rank &amp; Tag ID</th>
                <th className="py-3 px-4">Asset Name &amp; Location</th>
                <th className="py-3 px-4">System / Discipline</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Alarm Count</th>
                <th className="py-3 px-4">Load %</th>
                <th className="py-3 px-4">Cum %</th>
                <th className="py-3 px-4">Nuisance State</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Root Cause &amp; Remediation</span>
                    <AiBadge colorScheme="emerald" variant="icon-only" size="xs" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTop10.map(item => {
                const isSelected = item.id === selectedTagId;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedTagId(item.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                            item.rank <= 3
                              ? 'bg-rose-600 text-white'
                              : item.rank <= 6
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-800 text-white'
                          }`}
                        >
                          {item.rank}
                        </span>
                        <span className="font-mono font-bold text-slate-900">{item.tag}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.location}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="text-[11px]">{item.system}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          item.priority === 'P1'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.priority === 'P2'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.eventCount}</td>
                    <td className="py-3 px-4 font-mono text-indigo-600 font-bold">{item.loadPct}%</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{item.cumPct}%</td>
                    <td className="py-3 px-4">
                      {item.isChattering ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                          <Activity className="w-3 h-3 text-purple-600" /> Chattering
                        </span>
                      ) : item.standingHours > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Standing ({item.standingHours}h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" /> Controlled
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[220px]">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <AiBadge colorScheme="emerald" label="AI Root Cause" variant="subtle" size="xs" />
                        <span className="truncate font-semibold text-slate-800">{item.rootCause}</span>
                      </div>
                      <div className="truncate text-[10px] text-slate-500 pl-1">{item.recommendation}</div>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdvisorBadActor(item);
                            setShowBadActorAiModal(true);
                          }}
                          className="px-2 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition flex items-center gap-1"
                          title="Open AI Root Cause & Remediation Advisor"
                        >
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>AI Action</span>
                        </button>
                        <button
                          onClick={() => setSelectedTagId(item.id)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-bold transition"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() =>
                            onShelveAlarm({
                              id: item.id,
                              tag: item.tag,
                              description: item.name,
                              priority: item.priority,
                              system: item.system,
                              value: item.currentValue,
                              setpoint: item.setpoint,
                              location: item.location,
                            })
                          }
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold transition"
                        >
                          Shelve
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Bad Actor Root Cause & Remediation Advisor Modal */}
      {showBadActorAiModal && advisorBadActor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-teal-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AiBadge colorScheme="emerald" variant="icon-only" size="sm" />
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    AI Bad Actor Root Cause &amp; Remediation Advisor
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/20 text-white font-mono">
                      #{advisorBadActor.rank} • {advisorBadActor.tag}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Probabilistic fault-tree diagnosis, deadband rationalization, and maintenance countermeasure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBadActorAiModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-700">
              {/* Asset & Load Profile */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{advisorBadActor.name}</div>
                  <div className="text-slate-500 text-[11px]">
                    System: <strong>{advisorBadActor.system}</strong> • Location: <strong>{advisorBadActor.location}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black font-mono text-emerald-700">
                    {advisorBadActor.eventCount} Alarms ({advisorBadActor.loadPct}% of Plant Total)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Telemetry: {advisorBadActor.currentValue} | Setpoint: {advisorBadActor.setpoint}
                  </div>
                </div>
              </div>

              {/* AI Probabilistic Fault Diagnosis */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <AiBadge colorScheme="emerald" label="AI Fault Tree Analysis" variant="gradient" size="xs" />
                  <span>Primary Physical Failure Mechanisms:</span>
                </h4>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 block">Identified Root Mechanism (94.2% Confidence):</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{advisorBadActor.rootCause}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/60">
                    <span className="w-5 h-5 rounded bg-teal-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 block">Process Dynamics &amp; Signal Noise:</strong>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">
                        Sensor signal exhibits high frequency ripples across the alarm threshold ({advisorBadActor.setpoint}). Without hysteresis damping, each transient crossing triggers duplicate SCADA annunciation cycles.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Engineering Countermeasures */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AI Recommended Engineering Remediation:</span>
                </h4>
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-emerald-950">
                  <p className="leading-relaxed font-medium">
                    {advisorBadActor.recommendation}
                  </p>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
                    <span>Predicted Noise Reduction: <strong className="font-mono text-emerald-900">-91.4% False Events</strong></span>
                    <span>Safety Protection Margin: <strong className="text-emerald-900">100% Retained</strong></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Owner: <strong>{advisorBadActor.owner}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBadActorAiModal(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast(`AI Remediation MOC initiated for ${advisorBadActor.tag}. Engineering work order created.`);
                    setShowBadActorAiModal(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Adopt AI Remediation Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
