import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Info,
  Layers,
  ListFilter,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
  Cell,
  Legend,
} from 'recharts';
import { useFacility } from '../context/FacilityContext';
import { calculateCpk } from '../utils/cpkCalculator';
import { exportToCsv, triggerPrintReport } from '../utils/exportUtils';
import { PriorityLevel, SystemCategory, CpkParameterData } from '../types';
import { AiBadge } from './common/AiBadge';

export const CpkReportView: React.FC = () => {
  const { cpkParameters, alarms, openAiAssistant } = useFacility();

  // Period Selection Mode: Daily | Weekly | Monthly
  const [timeMode, setTimeMode] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Selected Date / Week / Month values
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-30');
  const [selectedWeek, setSelectedWeek] = useState<string>('W35-2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');

  // Filters
  const [selectedSystem, setSelectedSystem] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_CONTROL' | 'WARNING' | 'OUT_OF_SPEC'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected parameter for deep-dive control chart & histogram
  const [selectedParamId, setSelectedParamId] = useState<string>('CPK-UPW-RES');

  // Active chart view tab
  const [chartTab, setChartTab] = useState<'trend' | 'control_chart' | 'distribution' | 'comparison'>('control_chart');

  // AI Diagnostic Modal
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Available options for selection dropdowns
  const availableWeeks = [
    { id: 'W35-2026', label: 'Week 35 (Aug 24 – Aug 30, 2026) — Current' },
    { id: 'W34-2026', label: 'Week 34 (Aug 17 – Aug 23, 2026)' },
    { id: 'W33-2026', label: 'Week 33 (Aug 10 – Aug 16, 2026)' },
    { id: 'W32-2026', label: 'Week 32 (Aug 03 – Aug 09, 2026)' },
  ];

  const availableMonths = [
    { id: '2026-08', label: 'August 2026 (Month-to-Date)' },
    { id: '2026-07', label: 'July 2026 (Historical Capable)' },
    { id: '2026-06', label: 'June 2026 (Quarterly Review)' },
  ];

  const availableDays = [
    { id: '2026-08-30', label: 'Today (Sunday, Aug 30, 2026)' },
    { id: '2026-08-29', label: 'Yesterday (Saturday, Aug 29, 2026)' },
    { id: '2026-08-28', label: 'Friday, Aug 28, 2026' },
  ];

  // System options
  const systemOptions: (SystemCategory | 'All')[] = [
    'All',
    'Ultra Pure Water (UPW)',
    'Cleanroom HVAC & FFU',
    'Specialty Gases (TGM)',
    'Chemical Delivery (TCM)',
    'Thermal & Chiller Plant',
    'Clean Dry Air (CDA) & N2',
    'Scrubber & Exhaust',
    'Electrical & N+1 UPS',
  ];

  // Enriched parameters with daily, weekly, monthly calculations
  const enrichedParams = useMemo(() => {
    return cpkParameters.map((p, idx) => {
      // Base spec values
      const target = p.target;
      const usl = p.usl;
      const lsl = p.lsl;
      const span = usl - lsl;

      // Deterministic variations per parameter based on timeMode
      let mean = p.mean3Day;
      let sigma = p.sigma3Day;
      let cp = p.cp3Day;
      let cpk = p.cpk3Day;
      let ppk = p.ppkMonthly;

      // Adjust metrics depending on timeMode selection
      if (timeMode === 'daily') {
        const dateHash = selectedDate ? selectedDate.split('-').reduce((acc, part) => acc + (parseInt(part, 10) || 0), 0) : 0;
        const offset = ((dateHash % 7) - 3) * 0.004;
        mean = Number((p.currentValue + offset * span).toFixed(3));
        sigma = Number((p.sigma3Day * (0.92 + (dateHash % 3) * 0.03)).toFixed(4));
        cp = Number(((usl - lsl) / (6 * sigma)).toFixed(2));
        const cpu = (usl - mean) / (3 * sigma);
        const cpl = (mean - lsl) / (3 * sigma);
        cpk = Number(Math.max(0, Math.min(cpu, cpl)).toFixed(2));
        ppk = Number((cpk * 0.94).toFixed(2));
      } else if (timeMode === 'monthly') {
        mean = Number(((p.mean3Day * 0.998) + (target * 0.002)).toFixed(3));
        sigma = Number((p.sigma3Day * 1.12).toFixed(4));
        cp = Number(((usl - lsl) / (6 * sigma)).toFixed(2));
        const cpu = (usl - mean) / (3 * sigma);
        const cpl = (mean - lsl) / (3 * sigma);
        cpk = Number(Math.max(0, Math.min(cpu, cpl)).toFixed(2));
        ppk = Number((cpk * 0.96).toFixed(2));
      }

      let status: 'In Control (Cpk >= 1.33)' | 'Warning (1.00 <= Cpk < 1.33)' | 'Out of Spec (Cpk < 1.00)' =
        'In Control (Cpk >= 1.33)';
      if (cpk < 1.0) {
        status = 'Out of Spec (Cpk < 1.00)';
      } else if (cpk < 1.33) {
        status = 'Warning (1.00 <= Cpk < 1.33)';
      }

      // Generate 24 hourly data points for Daily mode
      const hourlySamples = Array.from({ length: 24 }, (_, i) => {
        const hourLabel = `${String(i).padStart(2, '0')}:00`;
        const noise = (Math.sin(i / 3) * 0.15 + (Math.random() - 0.5) * 0.1) * sigma * 2;
        const val = Number((mean + noise).toFixed(3));
        return {
          time: hourLabel,
          value: val,
          target,
          usl,
          lsl,
          ucl: Number((mean + 3 * sigma).toFixed(3)),
          lcl: Number((mean - 3 * sigma).toFixed(3)),
          mean,
        };
      });

      // Generate 7 daily data points for Weekly mode
      const days = ['Mon (08/24)', 'Tue (08/25)', 'Wed (08/26)', 'Thu (08/27)', 'Fri (08/28)', 'Sat (08/29)', 'Sun (08/30)'];
      const weeklySamples = days.map((day, i) => {
        const val = Number((mean + ((i % 3) - 1) * 0.05 * span).toFixed(3));
        const dayCpk = Number((cpk + (i % 2 === 0 ? 0.04 : -0.03)).toFixed(2));
        return {
          time: day,
          value: val,
          cpk: dayCpk,
          ppk: Number((dayCpk * 0.96).toFixed(2)),
          target,
          usl,
          lsl,
          ucl: Number((mean + 3 * sigma).toFixed(3)),
          lcl: Number((mean - 3 * sigma).toFixed(3)),
          mean,
        };
      });

      // Generate monthly samples (weeks 1-4 of July and August)
      const ucl = Number((mean + 3 * sigma).toFixed(3));
      const lcl = Number((mean - 3 * sigma).toFixed(3));
      const monthlySamples = [
        { time: 'W1 (08/03)', value: Number((mean - 0.02 * span).toFixed(3)), cpk: Number((cpk - 0.02).toFixed(2)), ppk: Number((ppk - 0.03).toFixed(2)), target, usl, lsl, ucl, lcl, mean },
        { time: 'W2 (08/10)', value: Number((mean + 0.01 * span).toFixed(3)), cpk: Number((cpk + 0.01).toFixed(2)), ppk: Number((ppk + 0.01).toFixed(2)), target, usl, lsl, ucl, lcl, mean },
        { time: 'W3 (08/17)', value: Number((mean - 0.01 * span).toFixed(3)), cpk: Number((cpk + 0.03).toFixed(2)), ppk: Number((ppk + 0.02).toFixed(2)), target, usl, lsl, ucl, lcl, mean },
        { time: 'W4 (08/24)', value: Number((mean + 0.02 * span).toFixed(3)), cpk: Number((cpk).toFixed(2)), ppk: Number((ppk).toFixed(2)), target, usl, lsl, ucl, lcl, mean },
        { time: 'MTD Peak', value: Number((mean + 0.04 * span).toFixed(3)), cpk: Number((cpk + 0.05).toFixed(2)), ppk: Number((ppk + 0.04).toFixed(2)), target, usl, lsl, ucl, lcl, mean },
      ];

      return {
        ...p,
        currentMean: mean,
        currentSigma: sigma,
        currentCp: cp,
        currentCpk: cpk,
        currentPpk: ppk,
        currentStatus: status,
        hourlySamples,
        weeklySamples,
        monthlySamples,
      };
    });
  }, [cpkParameters, timeMode, selectedDate, selectedWeek, selectedMonth]);

  // Filtered parameters list based on system & status & search
  const filteredParams = useMemo(() => {
    return enrichedParams.filter(p => {
      if (selectedSystem !== 'All' && p.system !== selectedSystem) return false;
      if (statusFilter === 'IN_CONTROL' && p.currentCpk < 1.33) return false;
      if (statusFilter === 'WARNING' && (p.currentCpk < 1.0 || p.currentCpk >= 1.33)) return false;
      if (statusFilter === 'OUT_OF_SPEC' && p.currentCpk >= 1.0) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchSys = p.system.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSys) return false;
      }
      return true;
    });
  }, [enrichedParams, selectedSystem, statusFilter, searchQuery]);

  // Selected parameter object for deep-dive charts
  const activeParam = useMemo(() => {
    return enrichedParams.find(p => p.id === selectedParamId) || enrichedParams[0];
  }, [enrichedParams, selectedParamId]);

  // Summary statistics for the overall facility in the chosen period
  const overallStats = useMemo(() => {
    if (enrichedParams.length === 0) return { meanCpk: 0, inControlRatio: 0, warningCount: 0, outOfSpecCount: 0, meanPpk: 0 };
    const sumCpk = enrichedParams.reduce((sum, p) => sum + p.currentCpk, 0);
    const sumPpk = enrichedParams.reduce((sum, p) => sum + p.currentPpk, 0);
    const inControlCount = enrichedParams.filter(p => p.currentCpk >= 1.33).length;
    const warningCount = enrichedParams.filter(p => p.currentCpk >= 1.0 && p.currentCpk < 1.33).length;
    const outOfSpecCount = enrichedParams.filter(p => p.currentCpk < 1.0).length;

    return {
      meanCpk: Number((sumCpk / enrichedParams.length).toFixed(2)),
      meanPpk: Number((sumPpk / enrichedParams.length).toFixed(2)),
      inControlRatio: Number(((inControlCount / enrichedParams.length) * 100).toFixed(1)),
      inControlCount,
      warningCount,
      outOfSpecCount,
      totalMonitored: enrichedParams.length,
    };
  }, [enrichedParams]);

  // Active chart data depending on timeMode
  const activeControlChartData = useMemo(() => {
    if (!activeParam) return [];
    if (timeMode === 'daily') return activeParam.hourlySamples;
    if (timeMode === 'weekly') return activeParam.weeklySamples;
    return activeParam.monthlySamples;
  }, [activeParam, timeMode]);

  // Normal distribution / Histogram curve data for active parameter
  const distributionData = useMemo(() => {
    if (!activeParam) return [];
    const mean = activeParam.currentMean;
    const sigma = activeParam.currentSigma || 0.001;
    const lsl = activeParam.lsl;
    const usl = activeParam.usl;
    const target = activeParam.target;

    // Generate 25 points spanning from mean - 4 sigma to mean + 4 sigma
    const points = [];
    const start = Math.min(lsl - sigma, mean - 3.8 * sigma);
    const end = Math.max(usl + sigma, mean + 3.8 * sigma);
    const step = (end - start) / 24;

    for (let x = start; x <= end; x += step) {
      // Gaussian PDF formula: (1 / (sigma * sqrt(2pi))) * exp(-0.5 * ((x-mean)/sigma)^2)
      const exponent = -0.5 * Math.pow((x - mean) / sigma, 2);
      const density = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      const normalizedDensity = Number((density * sigma * 100).toFixed(1)); // Scale for visual display

      points.push({
        x: Number(x.toFixed(3)),
        density: normalizedDensity,
        isWithinSpec: x >= lsl && x <= usl,
        target,
        lsl,
        usl,
      });
    }
    return points;
  }, [activeParam]);

  // Comparison Bar Chart across all parameters
  const parameterComparisonData = useMemo(() => {
    return enrichedParams.map(p => ({
      name: p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name,
      fullName: p.name,
      system: p.system,
      cpk: p.currentCpk,
      ppk: p.currentPpk,
      cp: p.currentCp,
      status: p.currentStatus,
    }));
  }, [enrichedParams]);

  // Period title & metadata
  const periodLabel = useMemo(() => {
    if (timeMode === 'daily') {
      try {
        if (selectedDate) {
          const parts = selectedDate.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          }
        }
      } catch {
        // fallback
      }
      return `Date: ${selectedDate}`;
    }
    if (timeMode === 'weekly') {
      const matched = availableWeeks.find(w => w.id === selectedWeek);
      return matched ? matched.label : `Week: ${selectedWeek}`;
    }
    const matched = availableMonths.find(m => m.id === selectedMonth);
    return matched ? matched.label : `Month: ${selectedMonth}`;
  }, [timeMode, selectedDate, selectedWeek, selectedMonth]);

  // Handle Export
  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'print') {
      triggerPrintReport();
      return;
    }
    const title = `FabCore_CPK_${timeMode.toUpperCase()}_Report_${timeMode === 'daily' ? selectedDate : timeMode === 'weekly' ? selectedWeek : selectedMonth}`;
    const rows = filteredParams.map(p => ({
      ID: p.id,
      Parameter: p.name,
      System: p.system,
      Unit: p.unit,
      Target: p.target,
      LSL: p.lsl,
      USL: p.usl,
      ProcessMean: p.currentMean,
      StdDev: p.currentSigma,
      Cp: p.currentCp,
      Cpk: p.currentCpk,
      Ppk: p.currentPpk,
      Status: p.currentStatus,
      Owner: p.systemOwner,
    }));

    exportToCsv(title, rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Card with Timeframe Selection (Daily / Weekly / Monthly) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Process Capability (cPk/pPk) Report
            </h2>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const currentParam = cpkParameters.find(p => p.id === selectedParamId);
                const paramName = currentParam ? currentParam.name : 'Cleanroom Parameters';
                openAiAssistant(`Explain the statistical process capability (Cpk / Ppk), potential root causes of variance, and out-of-control rules for ${paramName} in semiconductor cleanrooms.`);
              }}
              className="px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40 backdrop-blur-md active:scale-95 group"
              title="Ask Ops Copilot about this SPC metric"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Ask Ops Copilot</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              title="Export to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('print')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
              title="Print PDF report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Time Selection Mode Toggle (Daily / Weekly / Monthly) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTimeMode('daily')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                timeMode === 'daily'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily (24h)</span>
            </button>
            <button
              onClick={() => setTimeMode('weekly')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                timeMode === 'weekly'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Weekly (7 Days)</span>
            </button>
            <button
              onClick={() => setTimeMode('monthly')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                timeMode === 'monthly'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Monthly (30 Days)</span>
            </button>
          </div>

          {/* Specific Date / Week / Month selector based on mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {timeMode === 'daily' ? 'Select Date:' : timeMode === 'weekly' ? 'Week:' : 'Month:'}
            </span>

            {timeMode === 'daily' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 shadow-xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>
            )}

            {timeMode === 'weekly' && (
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
              >
                {availableWeeks.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.label}
                  </option>
                ))}
              </select>
            )}

            {timeMode === 'monthly' && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
              >
                {availableMonths.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Mean Plant Cpk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Mean Cpk
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              Target: &ge;1.33
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{overallStats.meanCpk}</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Capable
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Period: <strong>{timeMode.toUpperCase()}</strong></span>
            <span className="text-emerald-600 font-medium flex items-center text-[11px]">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +0.06 vs prior
            </span>
          </div>
        </div>

        {/* KPI 2: Six Sigma Compliance Ratio */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              In-Control Ratio
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">
              {overallStats.inControlCount}/{overallStats.totalMonitored}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">{overallStats.inControlRatio}%</span>
            <span className="text-xs text-slate-500 font-medium">&ge;1.33 Index</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Warnings: <strong className="text-amber-600">{overallStats.warningCount}</strong></span>
            <span>Out of Spec: <strong className="text-rose-600">{overallStats.outOfSpecCount}</strong></span>
          </div>
        </div>

        {/* KPI 3: Long-Term Performance Index (Ppk) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Long-Term Ppk
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
              Target: &ge;1.20
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{overallStats.meanPpk}</span>
            <span className="text-xs text-slate-500 font-medium">Overall Process</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Drift: <strong className="text-slate-800">0.06 σ</strong></span>
            <span className="text-emerald-600 font-medium text-[11px]">Stable</span>
          </div>
        </div>

        {/* KPI 4: Active Process Excursions */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Active Excursions
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              0.04 PPM
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-600">0</span>
            <span className="text-xs text-slate-500 font-medium">Excursions</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Coverage: <strong className="text-slate-800 font-mono">100%</strong></span>
            <span className="text-emerald-600 font-medium text-[11px]">Nominal</span>
          </div>
        </div>
      </div>

      {/* 2. Cpk / Ppk AI Capability & Process Health Summary (NEW DEDICATED SECTION) */}
      <section className="bg-gradient-to-br from-slate-900 via-emerald-950/70 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 shadow-xl text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/30 pb-3">
          <div className="flex items-center gap-3">
            <AiBadge variant="icon-only" size="md" colorScheme="emerald" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold tracking-tight text-white">
                  2. Cpk / Ppk AI Capability &amp; Process Health Summary
                </h3>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Automated statistical inference, short-term (Cpk) vs. long-term (Ppk) stability delta, and automated anomaly root-cause remediation.
              </p>
            </div>
          </div>
        </div>

        {/* AI Health & Stability Analysis Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Six Sigma Process Health Rating */}
          <div className="bg-emerald-950/40 backdrop-blur-xs border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Process Capability Rating
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/30">
                Six Sigma Grade A
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white">{overallStats.inControlRatio}%</span>
              <span className="text-xs text-emerald-200">Loops In-Control (Cpk &ge; 1.33)</span>
            </div>
            <p className="text-[11px] text-emerald-100/80 leading-relaxed pt-1 border-t border-emerald-500/20">
              Mean facility capability is <strong>Cpk {overallStats.meanCpk}</strong>. 11 of 12 critical cleanroom loops operate inside 4.5&sigma; process safety boundaries.
            </p>
          </div>

          {/* Card 2: Short-Term vs Long-Term Gap Analysis (Cpk vs Ppk) */}
          <div className="bg-emerald-950/40 backdrop-blur-xs border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Cpk vs Ppk Stability Gap
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                &Delta; {Math.abs(overallStats.meanCpk - overallStats.meanPpk).toFixed(2)} Drift
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-xs text-emerald-300/80 block">Short-Term (Cpk)</span>
                <span className="text-2xl font-bold font-mono text-white">{overallStats.meanCpk}</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">vs</span>
              <div>
                <span className="text-xs text-sky-300/80 block">Long-Term (Ppk)</span>
                <span className="text-2xl font-bold font-mono text-sky-300">{overallStats.meanPpk}</span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-100/80 leading-relaxed pt-1 border-t border-emerald-500/20">
              Low Cpk/Ppk spread confirms zero special-cause disturbance. Process variance is dominated by expected random noise rather than systemic drift.
            </p>
          </div>

          {/* Card 3: AI Detected Anomalies & Remediation */}
          <div className="bg-emerald-950/40 backdrop-blur-xs border border-emerald-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                AI Anomaly &amp; Tuning Alerts
              </span>
              <AiBadge label="2 Alerts" variant="subtle" size="xs" className="bg-amber-500/20 text-amber-300 border-amber-400/30" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="flex items-start justify-between text-[11px] bg-black/30 p-1.5 rounded border border-emerald-500/20">
                <div>
                  <strong className="text-amber-300 font-mono">CDA Dew Point:</strong>{' '}
                  <span className="text-emerald-100/90">Cpk 1.18 (Warning). Desiccant purge timer ripple.</span>
                </div>
              </div>
              <div className="flex items-start justify-between text-[11px] bg-black/30 p-1.5 rounded border border-emerald-500/20">
                <div>
                  <strong className="text-amber-300 font-mono">UPW Resistivity:</strong>{' '}
                  <span className="text-emerald-100/90">Cpk 1.28. Diurnal draw variance during Bay 4 lot clean.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Deep-Dive Statistical Workbench & Control Charts */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        {/* Top Header of the workbench: Parameter Selector & View Modes */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-950/70 border border-emerald-500/50 rounded-lg flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/40 backdrop-blur-md">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {activeParam.name}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    activeParam.currentCpk >= 1.33
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : activeParam.currentCpk >= 1.0
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  Cpk: {activeParam.currentCpk} &bull; {activeParam.currentStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                System: <strong>{activeParam.system}</strong> &bull; Target: <strong>{activeParam.target} {activeParam.unit}</strong> &bull; Spec Limits: [{activeParam.lsl} to {activeParam.usl} {activeParam.unit}]
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Parameter Selector Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold">Tag:</span>
              <select
                value={selectedParamId}
                onChange={e => setSelectedParamId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {enrichedParams.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.id} — {p.name} (Cpk {p.currentCpk})
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setChartTab('control_chart')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  chartTab === 'control_chart'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Control Chart (X-Bar)
              </button>
              <button
                onClick={() => setChartTab('distribution')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  chartTab === 'distribution'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Histogram & Bell Curve
              </button>
              <button
                onClick={() => setChartTab('trend')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  chartTab === 'trend'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cpk Progression
              </button>
              <button
                onClick={() => setChartTab('comparison')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  chartTab === 'comparison'
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plant Matrix Comparison
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Control Chart (X-Bar / Individuals with UCL, LCL, Target, USL, LSL) */}
        {chartTab === 'control_chart' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Statistical Process Control (SPC) Chart — Subgroup Mean ({timeMode === 'daily' ? 'Hourly' : timeMode === 'weekly' ? 'Daily' : 'Weekly Subgroups'})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> USL / LSL Spec
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> Process Target
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-teal-500 inline-block"></span> Mean (X̄)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Subgroup Sample
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={activeControlChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={activeParam.usl} stroke="#e11d48" strokeDasharray="3 3" label={{ value: `USL: ${activeParam.usl}`, fill: '#e11d48', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={activeParam.lsl} stroke="#e11d48" strokeDasharray="3 3" label={{ value: `LSL: ${activeParam.lsl}`, fill: '#e11d48', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={activeParam.target} stroke="#059669" strokeWidth={1.5} label={{ value: `Target: ${activeParam.target}`, fill: '#059669', fontSize: 10, position: 'left' }} />
                  <ReferenceLine y={activeParam.currentMean} stroke="#0d9488" strokeDasharray="4 4" label={{ value: `Mean: ${activeParam.currentMean}`, fill: '#0d9488', fontSize: 10, position: 'insideBottomLeft' }} />
                  <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} fill="#a7f3d0" fillOpacity={0.35} />
                  <Line type="monotone" dataKey="value" stroke="#059669" strokeWidth={2} dot={{ r: 4, fill: '#059669' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">PROCESS MEAN (X̄)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeParam.currentMean} {activeParam.unit}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">ESTIMATED SIGMA (σ)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeParam.currentSigma}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SHORT-TERM CAPABILITY (Cp / Cpk)</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">{activeParam.currentCp} / {activeParam.currentCpk}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">LONG-TERM PERFORMANCE (Pp / Ppk)</span>
                <span className="font-mono font-bold text-teal-700 text-sm">{activeParam.currentPpk}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Histogram & Gaussian Distribution Bell Curve */}
        {chartTab === 'distribution' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Probability Density Function &amp; Spec Boundaries ({activeParam.name})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-rose-600 inline-block"></span> LSL ({activeParam.lsl}) &amp; USL ({activeParam.usl})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> Target ({activeParam.target})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 inline-block"></span> Normal Distribution Curve
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={distributionData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#64748b' }} unit={` ${activeParam.unit}`} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine x={activeParam.usl} stroke="#e11d48" strokeWidth={2} label={{ value: `USL (${activeParam.usl})`, fill: '#e11d48', fontSize: 10, position: 'top' }} />
                  <ReferenceLine x={activeParam.lsl} stroke="#e11d48" strokeWidth={2} label={{ value: `LSL (${activeParam.lsl})`, fill: '#e11d48', fontSize: 10, position: 'top' }} />
                  <ReferenceLine x={activeParam.target} stroke="#059669" strokeDasharray="4 4" label={{ value: `Target (${activeParam.target})`, fill: '#059669', fontSize: 10, position: 'top' }} />
                  <Area type="monotone" dataKey="density" stroke="#059669" strokeWidth={2.5} fill="#6ee7b7" fillOpacity={0.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <strong>Tail Risk Analysis:</strong> The process is centered within spec bounds. Probability of defect excursion &lt; 0.001%.
              </div>
              <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                Six Sigma (Z &ge; 4.8)
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Cpk Progression Trend */}
        {chartTab === 'trend' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Cpk &amp; Ppk Index Stability Progression across {periodLabel}
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-emerald-600 inline-block"></span> Cpk Index
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-teal-600 inline-block"></span> Ppk Index
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block"></span> 1.33 Threshold
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeControlChartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0.8, 2.8]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={1.33} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target: 1.33 (In Control)', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={1.00} stroke="#e11d48" strokeDasharray="4 4" label={{ value: 'Minimum: 1.00 (Critical)', fill: '#e11d48', fontSize: 10 }} />
                  <Line type="monotone" dataKey="cpk" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Cpk" />
                  <Line type="monotone" dataKey="ppk" stroke="#0d9488" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3, fill: '#0d9488' }} name="Ppk" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Plant Matrix Comparison Bar Chart */}
        {chartTab === 'comparison' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Plant-Wide Process Capability Index Comparison ({periodLabel})
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block"></span> 1.33 Benchmark
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm inline-block"></span> Cpk &ge; 1.33
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block"></span> 1.00 &le; Cpk &lt; 1.33
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={parameterComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" />
                  <YAxis domain={[0, 3.0]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={1.33} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '1.33 Benchmark', fill: '#f59e0b', fontSize: 10 }} />
                  <Bar dataKey="cpk" name="Cpk Index" radius={[4, 4, 0, 0]}>
                    {parameterComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cpk >= 1.33 ? '#10b981' : entry.cpk >= 1.0 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4. Tabular Capability Matrix with Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Critical Parameter Capability Matrix ({filteredParams.length} Monitored Parameters)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated for <strong>{periodLabel}</strong>. Click any row to update the deep-dive statistical control charts above.
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search parameter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-40 sm:w-48"
              />
            </div>

            {/* System Discipline Filter */}
            <select
              value={selectedSystem}
              onChange={e => setSelectedSystem(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              {systemOptions.map(sys => (
                <option key={sys} value={sys}>
                  {sys === 'All' ? 'All Systems' : sys}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_CONTROL">In Control (&ge;1.33)</option>
              <option value="WARNING">Warning (1.00 - 1.33)</option>
              <option value="OUT_OF_SPEC">Out of Spec (&lt;1.00)</option>
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tag & Parameter Name</th>
                <th className="py-3 px-4">Discipline / System</th>
                <th className="py-3 px-4">Target &amp; Spec Limits</th>
                <th className="py-3 px-4">Process Mean (X̄)</th>
                <th className="py-3 px-4">Std Dev (σ)</th>
                <th className="py-3 px-4">Cp</th>
                <th className="py-3 px-4">Cpk</th>
                <th className="py-3 px-4">Ppk</th>
                <th className="py-3 px-4">Process Status</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredParams.map(param => {
                const isSelected = param.id === selectedParamId;
                return (
                  <tr
                    key={param.id}
                    onClick={() => setSelectedParamId(param.id)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50/80 hover:bg-emerald-100/80 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{param.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{param.id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="text-[11px]">{param.system}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900">{param.target} {param.unit}</span>
                      <div className="text-[10px] text-slate-500">[{param.lsl} to {param.usl}]</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{param.currentMean}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{param.currentSigma}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{param.currentCp}</td>
                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          param.currentCpk >= 1.33
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : param.currentCpk >= 1.0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {param.currentCpk}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{param.currentPpk}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          param.currentCpk >= 1.33
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : param.currentCpk >= 1.0
                            ? 'text-amber-700 bg-amber-50 border border-amber-200'
                            : 'text-rose-700 bg-rose-50 border border-rose-200'
                        }`}
                      >
                        {param.currentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 truncate max-w-[140px]">
                      {param.systemOwner}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedParamId(param.id);
                          setChartTab('control_chart');
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 rounded text-slate-700 hover:text-emerald-800 text-[11px] font-semibold transition"
                      >
                        View Chart
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. AI Six Sigma Capability Diagnostics Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-emerald-500/30 flex items-center justify-between bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 text-white">
              <div className="flex items-center gap-2.5">
                <AiBadge variant="icon-only" size="sm" colorScheme="emerald" />
                <h3 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
                  AI {timeMode.toUpperCase()} SIX SIGMA PROCESS CAPABILITY REVIEW
                  <AiBadge label="Automated Intelligence" variant="gradient" size="xs" colorScheme="emerald" />
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Overall Plant Process Capability: Capable ({overallStats.meanCpk} Cpk / {overallStats.inControlRatio}% In Control)
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Evaluated across {overallStats.totalMonitored} critical fab parameters for {periodLabel}. Total out-of-spec excursions: 0. Long-term machine stability (Ppk) is {overallStats.meanPpk}.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                  1. Critical Parameter Recommendations &amp; Process Tuning
                </h4>
                <div className="space-y-2">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-800 block">Clean Dry Air (CDA) Header Pressure (Cpk 1.28 - Warning)</span>
                    <p className="text-[11px] text-slate-600">
                      CDA pressure fluctuates near the lower control limit (7.12 bar vs 7.20 bar target). Recommend adjusting lead-lag compressor staging sequence in CUB to prevent pressure dips during cleanroom tool batch starts.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-700 block">UPW Product Water Resistivity (Cpk 1.54 - In Control)</span>
                    <p className="text-[11px] text-slate-600">
                      UPW resistivity demonstrates superior Six Sigma control (18.19 MΩ·cm vs 18.0 MΩ·cm LSL). Continue scheduled polishing resin regeneration cycles every 30 days.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                  2. Six Sigma Quality Action Plan
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs">
                  <li>Verify PID gain on Bay 2 Lithography precision reheat coils to reduce temperature σ from 0.051 °C to &lt;0.035 °C.</li>
                  <li>Schedule calibration of Toxic Scrubber DP sensor during next planned maintenance window.</li>
                </ul>
              </div>

              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Evaluated by FabCore AI Process Engine</span>
                <span>Period: {periodLabel}</span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAiModal(false);
                  triggerPrintReport();
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Diagnostic Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
