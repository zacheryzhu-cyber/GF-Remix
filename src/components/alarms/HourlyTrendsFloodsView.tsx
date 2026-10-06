import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Info,
  Layers,
  Printer,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  FLOOD_INCIDENTS,
  FloodIncidentItem,
  PAST_7_DAYS,
  AVAILABLE_WEEKS_4W,
  getHourlyDataForDate,
  getDailyDataForWeek,
} from './alarmData';
import { exportToCsv, exportToJson, triggerPrintReport } from '../../utils/exportUtils';
import { useAlarmReport } from '../../context/AlarmReportContext';
import { AiBadge } from '../common/AiBadge';

interface HourlyTrendsFloodsViewProps {
  onOpenAiModal: () => void;
  showToast: (msg: string) => void;
  onOpenOcap?: (tag: string) => void;
}

export const HourlyTrendsFloodsView: React.FC<HourlyTrendsFloodsViewProps> = ({
  onOpenAiModal,
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
    floodIncidents,
    addSimulatedFlood,
  } = useAlarmReport();

  // Sub-view options for 24hr and 7days
  const [twentyFourHourView, setTwentyFourHourView] = useState<'hourly' | 'ten_minute'>('hourly');
  const [sevenDayView, setSevenDayView] = useState<'daily_bars' | 'hourly_average'>('daily_bars');

  const [simulatedFloodActive, setSimulatedFloodActive] = useState<boolean>(false);

  // Active day config for 24hr mode
  const activeDayConfig = useMemo(() => {
    return (past7Days && past7Days.find(d => d.id === selectedDate)) || past7Days?.[0] || PAST_7_DAYS[0];
  }, [past7Days, selectedDate]);

  // Active week config for 7days mode
  const activeWeekConfig = useMemo(() => {
    return (availableWeeks && availableWeeks.find(w => w.id === selectedWeek)) || availableWeeks?.[0] || AVAILABLE_WEEKS_4W[0];
  }, [availableWeeks, selectedWeek]);

  // 24-Hour continuous data (00:00 to 23:00) for selected date
  const hourlyData = useMemo(() => {
    return getHourlyDataForDate(selectedDate);
  }, [selectedDate]);

  // 7-Day daily breakdown for selected week
  const weeklyDailyData = useMemo(() => {
    return getDailyDataForWeek(selectedWeek);
  }, [selectedWeek]);

  // 7-Day diurnal average curve (averaged 24h profile for the whole week)
  const weeklyAverageHourlyData = useMemo(() => {
    const scale = activeWeekConfig.totalAlarms / 182;
    return [
      { time: '00:00', rate: Number((0.6 * scale).toFixed(2)), shift: 'Night' },
      { time: '01:00', rate: Number((0.4 * scale).toFixed(2)), shift: 'Night' },
      { time: '02:00', rate: Number((0.5 * scale).toFixed(2)), shift: 'Night' },
      { time: '03:00', rate: Number((0.7 * scale).toFixed(2)), shift: 'Night' },
      { time: '04:00', rate: Number((0.5 * scale).toFixed(2)), shift: 'Night' },
      { time: '05:00', rate: Number((0.6 * scale).toFixed(2)), shift: 'Night' },
      { time: '06:00', rate: Number((0.9 * scale).toFixed(2)), shift: 'Night' },
      { time: '07:00', rate: Number((1.8 * scale).toFixed(2)), shift: 'Shift Handover' },
      { time: '08:00', rate: Number((1.6 * scale).toFixed(2)), shift: 'Day' },
      { time: '09:00', rate: Number((2.1 * scale).toFixed(2)), shift: 'Day' },
      { time: '10:00', rate: Number((1.9 * scale).toFixed(2)), shift: 'Day' },
      { time: '11:00', rate: Number((1.4 * scale).toFixed(2)), shift: 'Day' },
      { time: '12:00', rate: Number((1.5 * scale).toFixed(2)), shift: 'Day' },
      { time: '13:00', rate: Number((1.8 * scale).toFixed(2)), shift: 'Day' },
      { time: '14:00', rate: Number((2.8 * scale).toFixed(2)), shift: 'Tool Purge Window' },
      { time: '15:00', rate: Number((1.9 * scale).toFixed(2)), shift: 'Day' },
      { time: '16:00', rate: Number((1.5 * scale).toFixed(2)), shift: 'Day' },
      { time: '17:00', rate: Number((1.2 * scale).toFixed(2)), shift: 'Day' },
      { time: '18:00', rate: Number((1.4 * scale).toFixed(2)), shift: 'Day' },
      { time: '19:00', rate: Number((1.7 * scale).toFixed(2)), shift: 'Shift Handover' },
      { time: '20:00', rate: Number((1.0 * scale).toFixed(2)), shift: 'Night' },
      { time: '21:00', rate: Number((0.7 * scale).toFixed(2)), shift: 'Night' },
      { time: '22:00', rate: Number((0.6 * scale).toFixed(2)), shift: 'Night' },
      { time: '23:00', rate: Number((0.4 * scale).toFixed(2)), shift: 'Night' },
    ];
  }, [activeWeekConfig]);

  // 10-Minute interval dataset for detailed flood analysis
  const tenMinuteData = useMemo(() => {
    return [
      { interval: '14:00', count: 0, floodThreshold: 10, compliantLimit: 1 },
      { interval: '14:10', count: 1, floodThreshold: 10, compliantLimit: 1 },
      { interval: '14:20', count: selectedDate === '2026-08-28' ? 7 : 4, floodThreshold: 10, compliantLimit: 1 },
      { interval: '14:30', count: selectedDate === '2026-08-28' ? 8 : 6, floodThreshold: 10, compliantLimit: 1 },
      { interval: '14:40', count: 2, floodThreshold: 10, compliantLimit: 1 },
      { interval: '14:50', count: 1, floodThreshold: 10, compliantLimit: 1 },
      { interval: '15:00', count: 0, floodThreshold: 10, compliantLimit: 1 },
      { interval: '15:10', count: 1, floodThreshold: 10, compliantLimit: 1 },
    ];
  }, [selectedDate]);

  // Filtered flood incidents matching active range
  const filteredFloods = useMemo(() => {
    if (timeHorizon === '24hr') {
      // Return floods relevant to the selected day or recent
      return floodIncidents.filter(f => f.id.includes(selectedDate) || f.id.startsWith('SIM'));
    } else {
      // Return floods for the selected week
      return floodIncidents.filter(f => !f.weekId || f.weekId === selectedWeek || f.id.startsWith('SIM'));
    }
  }, [floodIncidents, timeHorizon, selectedDate, selectedWeek]);

  // Day vs Night shift metrics calculation
  const shiftMetrics = useMemo(() => {
    if (timeHorizon === '24hr') {
      const dayHours = hourlyData.filter(h => h.shift === 'Day' || h.shift === 'Tool Purge Window' || h.shift === 'Shift Handover');
      const nightHours = hourlyData.filter(h => h.shift === 'Night');
      const dayTotal = dayHours.reduce((acc, h) => acc + h.rate, 0);
      const nightTotal = nightHours.reduce((acc, h) => acc + h.rate, 0);
      const total = dayTotal + nightTotal || 1;
      return {
        dayTotal,
        nightTotal,
        dayPct: ((dayTotal / total) * 100).toFixed(1),
        nightPct: ((nightTotal / total) * 100).toFixed(1),
        dayMean: (dayTotal / 12).toFixed(2),
        nightMean: (nightTotal / 12).toFixed(2),
      };
    } else {
      const total = activeWeekConfig.totalAlarms;
      const dayTotal = Math.round(total * 0.65);
      const nightTotal = total - dayTotal;
      return {
        dayTotal,
        nightTotal,
        dayPct: '65.0',
        nightPct: '35.0',
        dayMean: (dayTotal / (7 * 12)).toFixed(2),
        nightMean: (nightTotal / (7 * 12)).toFixed(2),
      };
    }
  }, [timeHorizon, hourlyData, activeWeekConfig]);

  const triggerSimulateFlood = () => {
    setSimulatedFloodActive(true);
    const newFlood: FloodIncidentItem = {
      id: `SIM-FL-${Date.now()}`,
      weekId: selectedWeek,
      timeWindow: 'Simulated Influx (Current 10m Window)',
      durationMinutes: 10,
      peakRate10m: 11,
      totalEventsInWindow: 12,
      triggerTag: 'CDA-PRESS-01',
      triggerSystem: 'Clean Dry Air (CDA) & N2',
      rootCause: 'Simulated multi-branch load drop trigger testing SCADA alarm suppression rules',
      suppressionState: 'Active',
      actionTaken: 'SCADA Dynamic Flood Suppression Layer engaged — 8 secondary cascade alarms masked',
      affectedTagsCount: 8,
      severity: 'Severe',
    };
    addSimulatedFlood(newFlood);
    showToast('Simulated Alarm Flood trigger launched & dynamic suppression engaged');
    setTimeout(() => {
      setSimulatedFloodActive(false);
    }, 5000);
  };

  const handleExportCsv = () => {
    if (timeHorizon === '24hr') {
      exportToCsv(
        `Hourly_Alarm_Trends_${selectedDate}`,
        hourlyData.map(h => ({
          Hour: h.time,
          Rate: h.rate,
          P1: h.p1,
          P2: h.p2,
          P3: h.p3,
          'Peak 10m': h.peak10m,
          Shift: h.shift,
        }))
      );
    } else {
      exportToCsv(
        `Weekly_Daily_Alarm_Trends_${selectedWeek}`,
        weeklyDailyData.map(d => ({
          Day: d.day,
          P1: d.p1,
          P2: d.p2,
          P3: d.p3,
          'Total Alarms': d.total,
          'Rate / Hour': d.ratePerHour,
          'Peak Hour Rate': d.peakHourRate,
        }))
      );
    }
  };

  const handleExportJson = () => {
    exportToJson(
      `Alarm_Trends_${timeHorizon}_${timeHorizon === '24hr' ? selectedDate : selectedWeek}`,
      {
        timeHorizon,
        selectedDate: timeHorizon === '24hr' ? selectedDate : undefined,
        selectedWeek: timeHorizon === '7days' ? selectedWeek : undefined,
        hourlyData: timeHorizon === '24hr' ? hourlyData : undefined,
        weeklyDailyData: timeHorizon === '7days' ? weeklyDailyData : undefined,
        floodIncidents: filteredFloods,
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
              <Clock className="w-5 h-5 text-emerald-600" />
              Hourly Alarm Trends &amp; Flood Analysis
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeHorizon === '24hr'
                ? '24-Hour Diurnal Dynamics & High-Resolution Flood Monitoring (Selectable past 7 calendar days)'
                : '7-Day Multi-Day Trend & Historical Audit Range (Selectable past 4 audit weeks)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <AiBadge
              label="AI Surge Diagnosis"
              colorScheme="emerald"
              variant="button"
              size="sm"
              onClick={onOpenAiModal}
              title="Launch AI Alarm Surge & Flood Incident Diagnosis"
            />
            <button
              onClick={triggerSimulateFlood}
              disabled={simulatedFloodActive}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                simulatedFloodActive
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${simulatedFloodActive ? 'animate-bounce text-amber-600' : 'text-rose-600'}`} />
              <span>{simulatedFloodActive ? 'Suppressed' : 'Simulate Flood'}</span>
            </button>
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
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
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
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
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
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
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

                {/* Dropdown for quick access to -7 days */}
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
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
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

          {/* Granularity / Chart Resolution Toggle */}
          <div className="flex items-center gap-2">
            {timeHorizon === '24hr' ? (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setTwentyFourHourView('hourly')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    twentyFourHourView === 'hourly'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  24-Hour Timeline
                </button>
                <button
                  onClick={() => setTwentyFourHourView('ten_minute')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    twentyFourHourView === 'ten_minute'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  10-Minute Flood Window
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setSevenDayView('daily_bars')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    sevenDayView === 'daily_bars'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7-Day Daily Breakdown
                </button>
                <button
                  onClick={() => setSevenDayView('hourly_average')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    sevenDayView === 'hourly_average'
                      ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Diurnal Hourly Average
                </button>
              </div>
            )}
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
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs font-bold'
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
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-2xs font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {week.shortLabel} ({week.totalAlarms} alarms)
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Peak Rate / Total Alarms */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {timeHorizon === '24hr' ? 'Peak Hourly Rate' : 'Total 7-Day Alarms'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              {timeHorizon === '24hr' ? 'Target < 6.0/hr' : 'Compliant (<300/wk)'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {timeHorizon === '24hr' ? activeDayConfig.peakRate : activeWeekConfig.totalAlarms}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {timeHorizon === '24hr' ? `alarms @ ${activeDayConfig.peakHour}` : 'alarms / week'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              {timeHorizon === '24hr' ? 'Daily Total: ' : 'Peak Day: '}
              <strong className="text-slate-800 font-mono">
                {timeHorizon === '24hr' ? `${activeDayConfig.dailyTotal} alarms` : activeWeekConfig.peakDay}
              </strong>
            </span>
            <span className="text-emerald-700 font-semibold">Pass</span>
          </div>
        </div>

        {/* KPI 2: Mean Hourly Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {timeHorizon === '24hr' ? 'Daily Mean Rate' : 'Weekly Mean Rate'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              ISA 18.2 Limit: &lt;6.0/hr
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {timeHorizon === '24hr' ? activeDayConfig.meanRate.toFixed(2) : activeWeekConfig.meanRate.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-medium">alarms / hour</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Manageability: <strong className="text-emerald-700 font-mono">82% Headroom</strong>
            </span>
            <span className="text-emerald-700 font-semibold">Optimal</span>
          </div>
        </div>

        {/* KPI 3: Flood Incidents */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Flood Episodes (&gt;10/10m)
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Target 0
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">
              {timeHorizon === '24hr' ? activeDayConfig.floodsCount : activeWeekConfig.floodsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Recorded Floods</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Dynamic Suppression: <strong className="text-slate-800 font-mono">100% Active</strong>
            </span>
            <span className="text-emerald-700 font-semibold">Protected</span>
          </div>
        </div>

        {/* KPI 4: Day vs Night Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Day / Night Shift Split
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Diurnal Balance
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{shiftMetrics.dayPct}%</span>
            <span className="text-xs text-slate-500 font-medium">Day Shift Load</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>
              Night Shift: <strong className="text-slate-800 font-mono">{shiftMetrics.nightPct}% ({shiftMetrics.nightTotal})</strong>
            </span>
            <span className="text-emerald-700 font-semibold">Normal</span>
          </div>
        </div>
      </div>

      {/* 3. Primary Interactive Timeline Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              {timeHorizon === '24hr'
                ? twentyFourHourView === 'hourly'
                  ? `24-Hour Continuous Alarm Rate Timeline (${activeDayConfig.shortLabel})`
                  : `10-Minute High-Resolution Flood Window (${activeDayConfig.shortLabel} 14:00 – 15:20)`
                : sevenDayView === 'daily_bars'
                ? `7-Day Daily Alarm Volume & Priority Breakdown (${activeWeekConfig.label})`
                : `7-Day Average Diurnal Hourly Curve (${activeWeekConfig.shortLabel})`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {timeHorizon === '24hr'
                ? 'Reference lines show the alarm flood threshold (10 alarms / 10m) and manageable hourly limit (6.0 alarms / hr).'
                : 'Evaluates weekly load compliance against the ISA 18.2 steady-state limit of 6.0 alarms per hour.'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> Flood Limit (10/10m)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-0.5 bg-amber-500 inline-block"></span> Target Limit (6.0 / hr)
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-600">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span> Baseline Mean
            </span>
          </div>
        </div>

        {/* Render Chart based on Mode */}
        {timeHorizon === '24hr' ? (
          twentyFourHourView === 'hourly' ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Alarms / Hour', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={10.0} stroke="#e11d48" strokeDasharray="3 3" label={{ value: 'Flood Limit: 10', fill: '#e11d48', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={6.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target: 6.0/hr', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={activeDayConfig.meanRate} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Mean: ${activeDayConfig.meanRate.toFixed(2)}`, fill: '#10b981', fontSize: 10, position: 'insideBottomLeft' }} />
                  <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2} fill="#e0e7ff" fillOpacity={0.4} />
                  <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: '#4f46e5' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tenMinuteData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="interval" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Alarms / 10 min', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={10.0} stroke="#e11d48" strokeDasharray="3 3" label={{ value: 'Flood Threshold: 10/10m', fill: '#e11d48', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={1.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target Steady State: 1/10m', fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <Bar dataKey="count" name="10-Min Alarm Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )
        ) : sevenDayView === 'daily_bars' ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyDailyData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" domain={[0, 55]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Daily Alarm Events', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 6]} unit="/hr" tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <ReferenceLine yAxisId="right" y={6.0} stroke="#e11d48" strokeDasharray="3 3" label={{ value: 'Manageable Limit: 6.0/hr', fill: '#e11d48', fontSize: 10, position: 'right' }} />
                <Bar yAxisId="left" dataKey="p1" name="P1 Critical" fill="#f43f5e" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="p2" name="P2 High" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="p3" name="P3 Medium / Low" fill="#6366f1" stackId="a" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="ratePerHour" name="Rate (alarms/hr)" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 4, fill: '#0f172a' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyAverageHourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[0, 6]} tick={{ fontSize: 11, fill: '#64748b' }} label={{ value: 'Mean Alarms / Hour', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <ReferenceLine y={6.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Target: 6.0/hr', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                <ReferenceLine y={activeWeekConfig.meanRate} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Weekly Mean: ${activeWeekConfig.meanRate.toFixed(2)}`, fill: '#10b981', fontSize: 10, position: 'insideBottomLeft' }} />
                <Area type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={2} fill="#e0e7ff" fillOpacity={0.4} />
                <Line type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: '#4f46e5' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <strong>Operational Observation:</strong>{' '}
            {timeHorizon === '24hr'
              ? activeDayConfig.summary
              : `Selected ${activeWeekConfig.label}: Overall rate maintained at ${activeWeekConfig.meanRate} alarms/hr with primary bad actor ${activeWeekConfig.topBadActor}.`}
          </div>
          <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
            {timeHorizon === '24hr'
              ? `Peak: ${activeDayConfig.peakRate} events @ ${activeDayConfig.peakHour}`
              : `Peak Day: ${activeWeekConfig.peakDay} (${activeWeekConfig.peakHourlyRate} / hr)`}
          </span>
        </div>
      </div>

      {/* 4. Shift Comparison & Telemetry Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day Shift */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              Day Shift Operations (07:00 – 19:00)
            </h4>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
              {shiftMetrics.dayPct}% Total Load
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-emerald-600">{shiftMetrics.dayTotal}</span>
              <span className="text-xs text-slate-500 font-medium ml-1.5">Total Events</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Mean Shift Rate</span>
              <span className="text-base font-bold font-mono text-slate-900">{shiftMetrics.dayMean} alarms/hr</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Elevated activity coincides with tool wafer cassette load ramps, chemical delivery turnover, and cleanroom airlock personnel traffic.
          </p>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Shift Handover Spike (07:00): <strong className="text-slate-900 font-mono">Controlled</strong></span>
            <span className="text-emerald-600 font-bold">Compliant</span>
          </div>
        </div>

        {/* Night Shift */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              Night Shift Operations (19:00 – 07:00)
            </h4>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-mono">
              {shiftMetrics.nightPct}% Total Load
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black font-mono text-sky-600">{shiftMetrics.nightTotal}</span>
              <span className="text-xs text-slate-500 font-medium ml-1.5">Total Events</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Mean Shift Rate</span>
              <span className="text-base font-bold font-mono text-slate-900">{shiftMetrics.nightMean} alarms/hr</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Quiet baseline state. Night operations maintain steady-state flow with mean alarm rate well beneath the 1 alarm / 10-minute guideline.
          </p>

          <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span>Shift Handover Spike (19:00): <strong className="text-slate-900 font-mono">Controlled</strong></span>
            <span className="text-emerald-600 font-bold">Compliant</span>
          </div>
        </div>
      </div>

      {/* 5. Alarm Flood Incidents & Upset State Register */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Alarm Flood &amp; Transient Surge Incident Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of transient peak alarm bursts, trigger equipment, and automatic SCADA state-based alarm suppression.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold font-mono">
            {filteredFloods.length} Incidents Documented in Selected Period
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Incident ID &amp; Time Window</th>
                <th className="py-3 px-4">Peak 10m Rate</th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Trigger Tag &amp; System</span>
                    <AiBadge colorScheme="emerald" variant="icon-only" size="xs" />
                  </div>
                </th>
                <th className="py-3 px-4">Root Mechanism</th>
                <th className="py-3 px-4">Dynamic Suppression &amp; Action</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredFloods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
                    <p className="font-semibold text-slate-700">Zero Alarm Floods in Selected Period</p>
                    <p className="text-[11px] text-slate-400">Continuous operation was maintained below 10 alarms per 10-minute window.</p>
                  </td>
                </tr>
              ) : (
                filteredFloods.map(inc => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="font-mono text-emerald-700">{inc.id}</div>
                      <div className="text-[10px] text-slate-500">{inc.timeWindow}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {inc.peakRate10m} / 10m
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <AiBadge colorScheme="emerald" label="AI Trigger" variant="subtle" size="xs" />
                        <span className="font-mono font-bold text-slate-900">{inc.triggerTag}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span className="font-semibold text-slate-700">{inc.triggerSystem}</span>
                        <span>• Isolated</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">{inc.rootCause}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-700 max-w-sm">
                      <div className="font-medium">{inc.actionTaken}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          inc.suppressionState === 'Active'
                            ? 'bg-rose-100 text-rose-800 animate-pulse'
                            : inc.suppressionState === 'Suppressed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {inc.suppressionState}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] text-slate-500 font-medium font-mono">
                        {inc.affectedTagsCount} Suppressed
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
