import React, { useState, useMemo } from 'react';
import {
  Zap,
  TrendingDown,
  TrendingUp,
  Download,
  Info,
  CheckCircle2,
  Gauge,
  Layers,
  PieChart as PieChartIcon,
  BarChart2,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SpeedometerGauge } from './SpeedometerGauge';
import {
  ENPI_INDICATORS_DATA,
  ENPI_INDICATORS_BY_INTERVAL,
  SEU_MASTER_REGISTRY,
  ENERGY_HOURLY_DATA,
  ENERGY_WEEKLY_DATA,
  ENERGY_MONTHLY_DATA,
  ENERGY_TOTALS,
  SeuItem,
} from '../../data/energyWaterData';
import { exportToCsv } from '../../utils/exportUtils';

export const EnergyManagementView: React.FC = () => {
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [visibleSeus, setVisibleSeus] = useState<Record<string, boolean>>({
    'SEU 1': true,
    'SEU 2': true,
    'SEU 3': true,
    'SEU 4': true,
    'SEU 5': true,
    'SEU 6': true,
  });
  const [expandedSeuCode, setExpandedSeuCode] = useState<string | null>(null);

  const toggleSeuVisibility = (code: string) => {
    setVisibleSeus(prev => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const currentTotals = ENERGY_TOTALS[interval];
  const currentEnpiIndicators = ENPI_INDICATORS_BY_INTERVAL[interval] || ENPI_INDICATORS_DATA;

  // Prepare chart series depending on interval
  const chartData = useMemo(() => {
    if (interval === 'daily') {
      return ENERGY_HOURLY_DATA.map(d => ({
        label: d.timeDisplay,
        total: d.totalMwh,
        baseline: d.baselineMwh,
        'SEU 1': d.seu1,
        'SEU 2': d.seu2,
        'SEU 3': d.seu3,
        'SEU 4': d.seu4,
        'SEU 5': d.seu5,
        'SEU 6': d.seu6,
        tariffBand: d.tariffBand,
        shift: d.shift,
        contextNote: d.contextNote,
      }));
    } else if (interval === 'weekly') {
      return ENERGY_WEEKLY_DATA.map(d => ({
        label: `${d.label} (${d.dateStr.slice(5)})`,
        total: d.totalMwh,
        baseline: d.baselineMwh,
        'SEU 1': d.seu1,
        'SEU 2': d.seu2,
        'SEU 3': d.seu3,
        'SEU 4': d.seu4,
        'SEU 5': d.seu5,
        'SEU 6': d.seu6,
      }));
    } else {
      return ENERGY_MONTHLY_DATA.map(d => ({
        label: d.label,
        total: d.totalMwh,
        baseline: d.baselineMwh,
        'SEU 1': d.seu1,
        'SEU 2': d.seu2,
        'SEU 3': d.seu3,
        'SEU 4': d.seu4,
        'SEU 5': d.seu5,
        'SEU 6': d.seu6,
      }));
    }
  }, [interval]);

  // Donut chart data for SEUs
  const donutData = useMemo(() => {
    return SEU_MASTER_REGISTRY.map(seu => {
      let value = seu.dailyMwh;
      if (interval === 'weekly') value = seu.weeklyMwh;
      if (interval === 'monthly') value = seu.monthlyMwh;
      return {
        name: seu.code,
        fullName: seu.name,
        value,
        share: seu.sharePercent,
        color: seu.color,
      };
    });
  }, [interval]);

  // Export CSV conforming to Section 5
  const handleExportCsv = () => {
    const rows = SEU_MASTER_REGISTRY.map(s => ({
      Report_Section: 'Facility Energy Management & SEU Telemetry',
      SEU_Code: s.code,
      SEU_Name: s.name,
      Category: s.category,
      Rated_Power_kW: s.ratedPowerKw,
      Substation_Feed: s.substationFeed,
      Daily_Consumption_MWh: s.dailyMwh,
      Weekly_Consumption_MWh: s.weeklyMwh,
      Monthly_Consumption_MWh: s.monthlyMwh,
      Share_Percent: `${s.sharePercent}%`,
      Daily_Baseline_MWh: s.baselineMwhDay,
      Operating_Status: s.status,
      Control_Measure: s.controlMeasure,
    }));
    exportToCsv(`Fab1_Energy_Management_${interval}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header & Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600" />
            Energy Management &amp; SEU Performance
          </h2>
        </div>

        {/* Action Controls: Interval Selector + CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interval Toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setInterval('daily')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                interval === 'daily'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily (24h)</span>
            </button>
            <button
              onClick={() => setInterval('weekly')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                interval === 'weekly'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Weekly (7d)</span>
            </button>
            <button
              onClick={() => setInterval('monthly')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                interval === 'monthly'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Monthly (30d)</span>
            </button>
          </div>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
            title="Export Master Energy Registry CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top-Level Summary Cards: Baseline vs Actual Energy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Fab Actual Energy</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
              -5.4% Optimal
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {currentTotals.actualMwh.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">MWh / {interval}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Energy Baseline (EnB)</span>
            <span className="text-slate-600 font-mono text-[11px]">EnB Standard</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-700">
              {currentTotals.baselineMwh.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">MWh / {interval}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Energy Saved vs Baseline</span>
            <span className="text-emerald-700 font-mono text-[11px] font-bold">2.79 MWh/d</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 text-emerald-600">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <span className="text-2xl font-black font-mono">
              {(currentTotals.baselineMwh - currentTotals.actualMwh).toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">MWh Saved</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Carbon Equivalent per Day</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
              Scope 2 Grid
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {(
                interval === 'daily'
                  ? currentTotals.actualMwh * 0.4057
                  : interval === 'weekly'
                  ? (currentTotals.actualMwh / 7) * 0.4057
                  : (currentTotals.actualMwh / 30) * 0.4057
              ).toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-slate-500">tCO₂e / day</span>
          </div>
        </div>
      </div>

      {/* 3. 3x EnPI (Energy Performance Indicator) Speedometer Dial Gauges */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Energy Performance Indicator (EnPI)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Blue needle = Current • Sky tag = Target • Dashed slate = Baseline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentEnpiIndicators.map(indicator => {
            return (
              <div
                key={indicator.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition"
              >
                {/* Gauge Title & Badge */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {indicator.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {indicator.variancePercent > 0 ? `+${indicator.variancePercent}%` : `${indicator.variancePercent}%`}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug line-clamp-1" title={indicator.name}>
                    {indicator.name}
                  </h4>
                </div>

                {/* SVG Speedometer Dial */}
                <div className="my-2 py-1">
                  <SpeedometerGauge indicator={indicator} />
                </div>

                {/* Baseline vs Target Footnote */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Target</span>
                    <span className="font-bold font-mono text-sky-700">
                      {indicator.targetValue} {indicator.unit.split('/')[0]}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">Baseline</span>
                    <span className="font-bold font-mono text-slate-600">
                      {indicator.baselineValue} {indicator.unit.split('/')[0]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SEU Breakdown & Trend Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: SEU Energy Share */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  SEU Energy Share (%)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">100% FAB LOAD</span>
            </div>

            {/* Donut Visual */}
            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toFixed(2)} MWh (${item.payload.share}%)`,
                      item.payload.fullName,
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Callout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">Fab Total</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {currentTotals.actualMwh.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">MWh</span>
              </div>
            </div>
          </div>

          {/* Donut Legend List */}
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs mt-2">
            {SEU_MASTER_REGISTRY.map(seu => (
              <div
                key={seu.code}
                onClick={() => toggleSeuVisibility(seu.code)}
                className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                  visibleSeus[seu.code] ? 'bg-slate-50 hover:bg-slate-100' : 'opacity-40 hover:opacity-75'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seu.color }}
                  />
                  <span className="font-bold text-slate-800 text-[11px] shrink-0">{seu.code}</span>
                  <span className="text-slate-500 text-[11px] truncate">{seu.name.split('&')[0]}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-slate-900">{seu.sharePercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Single Line Trend Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  SEU Energy Profiles &amp; Line Trend Dynamics
                </h3>
              </div>
            </div>

            {/* SEU Interactive Toggle Filters */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
              {SEU_MASTER_REGISTRY.map(seu => {
                const isVisible = visibleSeus[seu.code];
                return (
                  <button
                    key={seu.code}
                    onClick={() => toggleSeuVisibility(seu.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition flex items-center gap-1.5 border ${
                      isVisible
                        ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                        : 'bg-transparent text-slate-400 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${!isVisible ? 'grayscale opacity-50' : ''}`}
                      style={{ backgroundColor: seu.color }}
                    />
                    <span>{seu.code}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Recharts Line Chart Container */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} unit=" MWh" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2.5} name="Total Actual MWh" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="3 3" name="Baseline MWh" dot={false} />
                  {SEU_MASTER_REGISTRY.map(s => {
                    if (!visibleSeus[s.code]) return null;
                    return (
                      <Line key={s.code} type="monotone" dataKey={s.code} stroke={s.color} strokeWidth={1.5} dot={false} />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Tariff Context Footer */}
          {interval === 'daily' && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400" />
                  <span>Peak Tariff (09:00 - 22:00)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400" />
                  <span>Standard (07:00 - 09:00)</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400" />
                  <span>Off-Peak (22:00 - 07:00)</span>
                </span>
              </div>
              <span className="font-mono text-slate-400">Singapore Power (EMA) National Grid Interconnection</span>
            </div>
          )}
        </div>
      </div>

      {/* 5. SEU Master Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Significant Energy Users (SEU) Master Registry
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 self-start sm:self-auto">
            Showing {(interval || 'hourly').toUpperCase()} Consumption
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SEU Code &amp; Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 font-mono">{(interval || 'hourly').toUpperCase()} Consumption</th>
                <th className="py-3 px-3 font-mono">Share %</th>
                <th className="py-3 px-3 font-mono">{(interval || 'hourly').toUpperCase()} Baseline</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Primary Control Measure</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {SEU_MASTER_REGISTRY.map(seu => {
                let consumption = seu.dailyMwh;
                let baselineVal = seu.baselineMwhDay;
                if (interval === 'weekly') {
                  consumption = seu.weeklyMwh;
                  baselineVal = seu.baselineMwhDay * 7;
                }
                if (interval === 'monthly') {
                  consumption = seu.monthlyMwh;
                  baselineVal = seu.baselineMwhDay * 30;
                }
                const isExpanded = expandedSeuCode === seu.code;

                return (
                  <React.Fragment key={seu.code}>
                    <tr className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: seu.color }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 font-mono text-xs mr-2">{seu.code}</span>
                            <span className="font-semibold text-slate-800">{seu.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                          {seu.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                        {consumption.toFixed(2)} MWh
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                        {seu.sharePercent}%
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {baselineVal.toFixed(2)} MWh
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            seu.status === 'Optimal'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {seu.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs text-[11px] text-slate-600 truncate" title={seu.controlMeasure}>
                        {seu.controlMeasure}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setExpandedSeuCode(isExpanded ? null : seu.code)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-500 transition"
                          title="View Engineering Details & Control Measures"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Engineering Sub-Panel */}
                    {isExpanded && (
                      <tr className="bg-emerald-50/40 border-y border-emerald-100">
                        <td colSpan={8} className="p-4">
                          <div className="bg-white rounded-lg border border-emerald-100 p-3.5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                                Operational Control Measure
                              </span>
                              <p className="text-xs font-semibold text-slate-800">
                                {seu.controlMeasure}
                              </p>
                              <div className="mt-2 text-[11px] text-slate-500">
                                Continuous feedback from building automation system (BMS) and SCADA energy meters.
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                                Substation Feeder Architecture
                              </span>
                              <p className="text-xs font-mono text-emerald-700 font-bold">
                                {seu.substationFeed}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Dual-redundant bus coupler with Class 0.2S digital power quality meters.
                              </p>
                            </div>

                            <div>
                              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
                                Facility Energy Action Plan
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-700 font-bold text-xs bg-emerald-100/60 px-2 py-0.5 rounded">
                                  ECO Active
                                </span>
                                <span className="text-slate-600 text-[11px]">Next Audit: Q4 2026</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1">
                                Automated setback scheduled during non-peak production intervals.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
