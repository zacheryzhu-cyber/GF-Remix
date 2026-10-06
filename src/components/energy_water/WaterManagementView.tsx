import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Gauge,
  Info,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  WATER_CONSUMERS_DATA,
  WATER_TOTALS,
  IWTP_TELEMETRY_SUMMARY,
  IWTP_HOURLY_DATA,
  WaterConsumerItem,
} from '../../data/energyWaterData';
import { exportToCsv } from '../../utils/exportUtils';

export const WaterManagementView: React.FC = () => {
  const [interval, setInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [telemetryMode, setTelemetryMode] = useState<'all' | 'ph_dosing' | 'cod_fluoride' | 'flow'>('all');
  const [expandedConsumerId, setExpandedConsumerId] = useState<string | null>(null);

  // Total inflow calculated from interval
  const currentTotalM3 = useMemo(() => {
    if (interval === 'daily') return WATER_TOTALS.dailyM3;
    if (interval === 'weekly') return WATER_TOTALS.weeklyM3;
    return WATER_TOTALS.monthlyM3;
  }, [interval]);

  // Donut data for water consumers
  const waterDonutData = useMemo(() => {
    return WATER_CONSUMERS_DATA.map(c => {
      let value = c.dailyM3;
      if (interval === 'weekly') value = c.weeklyM3;
      if (interval === 'monthly') value = c.monthlyM3;
      return {
        name: c.id,
        fullName: c.name,
        value,
        share: c.sharePercent,
        color: c.color,
      };
    });
  }, [interval]);

  // Export CSV matching Section 5
  const handleExportCsv = () => {
    const rows = IWTP_HOURLY_DATA.map(d => ({
      Report_Section: 'Industrial Waste Water Treatment Plant (IWTP) Telemetry',
      Timestamp: `2026-08-30 ${d.hour}:00`,
      Label: d.timeDisplay,
      Effluent_pH: d.ph,
      pH_Lower_Limit: d.phLowerLimit,
      pH_Upper_Limit: d.phUpperLimit,
      COD_mg_L: d.codMgL,
      COD_Limit_mg_L: d.codLimitMgL,
      Fluoride_mg_L: d.fluorideMgL,
      Discharge_Flow_m3_hr: d.dischargeFlowM3Hr,
      Acid_Dosing_ml_min: d.acidDosingMlMin,
      Caustic_Dosing_ml_min: d.causticDosingMlMin,
      Compliance_Status: d.complianceStatus,
      Notes: d.notes,
    }));
    exportToCsv(`Fab1_IWTP_Water_Quality_Telemetry_${interval}`, rows);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar & Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Droplets className="w-5 h-5 text-emerald-600" />
            Water Balance &amp; IWTP Effluent Quality
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
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

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
            title="Export IWTP Effluent Water Quality Telemetry CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Water Balance Key KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Water Inflow</span>
            <span className="text-cyan-700 font-mono text-[11px] font-bold">PUB Grid (81% NEWater)</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-900">
              {currentTotalM3.toLocaleString(undefined, { minimumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">m³ / {interval}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Water Reclamation Rate</span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              High Circularity
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 text-emerald-600">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-2xl font-black font-mono">{WATER_TOTALS.reclaimedPercent}%</span>
            <span className="text-xs font-semibold text-slate-500">Recycled</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>IWTP Discharge Flow</span>
            <span className="text-indigo-600 font-mono text-[11px]">22.8 m³/hr Outfall</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-indigo-700">
              {(547.2 * (interval === 'daily' ? 1 : interval === 'weekly' ? 7 : 30)).toLocaleString(undefined, { minimumFractionDigits: 1 })}
            </span>
            <span className="text-xs font-semibold text-slate-500">m³ Outfall / {interval}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>NEA EPMA Compliance</span>
            <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
              ZERO EXCURSION
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-2xl font-black font-mono">100.0%</span>
            <span className="text-xs font-semibold text-slate-500">Audit Pass</span>
          </div>
        </div>
      </div>

      {/* 3. Water Balance Consumers & Flow Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Water Consumption Share */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Water Consumer Share (%)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold">1,420 m³/d</span>
            </div>

            <div className="h-56 w-full relative flex items-center justify-center mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={waterDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {waterDonutData.map((entry, index) => (
                      <Cell key={`w-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toFixed(1)} m³ (${item.payload.share}%)`,
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-medium">Inflow</span>
                <span className="text-base font-black font-mono text-slate-900">
                  {currentTotalM3.toFixed(0)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">m³</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs mt-2">
            {WATER_CONSUMERS_DATA.map(c => (
              <div key={c.id} className="flex items-center justify-between p-1.5 rounded bg-slate-50">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="font-bold text-slate-800 text-[11px] shrink-0">{c.id}</span>
                  <span className="text-slate-500 text-[11px] truncate">{c.name.split('(')[0]}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-slate-900">{c.sharePercent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Water Balance Consumer Table & Specs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Water Consumer Master Register
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
              {(interval || 'hourly').toUpperCase()} Flow
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Consumer Unit</th>
                  <th className="py-3 px-3">Quality Spec</th>
                  <th className="py-3 px-3 font-mono">{(interval || 'hourly').toUpperCase()} m³</th>
                  <th className="py-3 px-3 font-mono">Flow (m³/hr)</th>
                  <th className="py-3 px-3 font-mono">Share %</th>
                  <th className="py-3 px-3">Discharge Destination</th>
                  <th className="py-3 px-3">Control Initiative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WATER_CONSUMERS_DATA.map(c => {
                  let vol = c.dailyM3;
                  if (interval === 'weekly') vol = c.weeklyM3;
                  if (interval === 'monthly') vol = c.monthlyM3;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <div>
                            <span className="font-bold text-slate-900 font-mono mr-1.5">{c.id}</span>
                            <span className="font-semibold text-slate-800">{c.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                        {c.specs}
                      </td>
                      <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                        {vol.toLocaleString(undefined, { minimumFractionDigits: 1 })} m³
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 font-bold">
                        {c.flowRateM3Hr.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-700">
                        {c.sharePercent}%
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        {c.dischargeDestination}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs truncate" title={c.controlInitiative}>
                        {c.controlInitiative}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. IWTP Continuous Online Telemetry Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                IWTP Effluent Online Quality Telemetry (Continuous Monitoring)
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            100% REGULATORY COMPLIANCE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {IWTP_TELEMETRY_SUMMARY.slice(0, 4).map(item => (
            <div
              key={item.parameter}
              className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 flex flex-col justify-between hover:bg-white hover:border-emerald-200 transition"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                  <span className="truncate pr-1">{item.parameter.split('(')[0]}</span>
                  <span className="text-emerald-700 font-mono text-[10px] bg-emerald-100/70 px-1.5 py-0.5 rounded shrink-0">
                    {item.compliancePercent}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1 my-1">
                  <span className="text-xl font-black font-mono text-slate-900">
                    {item.currentValue}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  <span className="text-slate-400">Spec:</span> <span className="font-bold text-slate-700">{item.specLimit}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 mt-2 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Min: {item.minObserved}</span>
                <span>Max: {item.maxObserved}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Dual-Axis Interactive Time-Series Telemetry Visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                IWTP 24-Hour Continuous Telemetry Trend (Dual-Axis)
              </h3>
            </div>
          </div>

          {/* Telemetry Metric Focus Selector */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setTelemetryMode('all')}
              className={`px-2.5 py-1 rounded transition ${
                telemetryMode === 'all'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Signals
            </button>
            <button
              onClick={() => setTelemetryMode('ph_dosing')}
              className={`px-2.5 py-1 rounded transition ${
                telemetryMode === 'ph_dosing'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              pH &amp; Dosing
            </button>
            <button
              onClick={() => setTelemetryMode('cod_fluoride')}
              className={`px-2.5 py-1 rounded transition ${
                telemetryMode === 'cod_fluoride'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              COD &amp; Fluoride
            </button>
            <button
              onClick={() => setTelemetryMode('flow')}
              className={`px-2.5 py-1 rounded transition ${
                telemetryMode === 'flow'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Discharge Flow
            </button>
          </div>
        </div>

        {/* Recharts Dual-Axis Chart */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={IWTP_HOURLY_DATA} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="timeDisplay" stroke="#64748b" fontSize={11} />
              
              {/* Left Y-Axis for pH or concentration */}
              <YAxis
                yAxisId="left"
                stroke="#0284c7"
                fontSize={11}
                domain={telemetryMode === 'ph_dosing' ? [5.5, 9.5] : [0, 110]}
                unit={telemetryMode === 'ph_dosing' ? ' pH' : ''}
              />

              {/* Right Y-Axis for Dosing (ml/min) or Flow (m3/hr) */}
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#7c3aed"
                fontSize={11}
                domain={[0, 70]}
                unit=" rate"
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-lg text-xs shadow-xl min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                        <span className="font-bold text-cyan-300">{label} (UTC+8)</span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                          {d?.complianceStatus}
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-sky-300">Effluent pH:</span>
                          <span className="font-bold text-white">{d?.ph} pH</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-300">COD:</span>
                          <span className="font-bold text-white">{d?.codMgL} mg/L</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-300">Fluoride:</span>
                          <span className="font-bold text-white">{d?.fluorideMgL} mg/L</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300">Discharge Flow:</span>
                          <span className="font-bold text-white">{d?.dischargeFlowM3Hr} m³/hr</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-rose-300">H2SO4 Acid Dosing:</span>
                          <span className="font-bold text-white">{d?.acidDosingMlMin} ml/min</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-300">NaOH Caustic Dosing:</span>
                          <span className="font-bold text-white">{d?.causticDosingMlMin} ml/min</span>
                        </div>
                      </div>
                      {d?.notes && (
                        <p className="mt-2 text-[10px] text-slate-400 italic bg-slate-950 p-1.5 rounded border border-slate-800">
                          {d.notes}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

              {/* Regulatory Reference Lines */}
              {(telemetryMode === 'all' || telemetryMode === 'ph_dosing') && (
                <>
                  <ReferenceLine
                    yAxisId="left"
                    y={9.00}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'NEA pH Max (9.00)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={6.00}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: 'NEA pH Min (6.00)', fill: '#ef4444', fontSize: 10, position: 'insideBottomLeft' }}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={7.00}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                    label={{ value: 'Neutral pH (7.00)', fill: '#10b981', fontSize: 9, position: 'insideLeft' }}
                  />
                </>
              )}

              {(telemetryMode === 'all' || telemetryMode === 'cod_fluoride') && (
                <ReferenceLine
                  yAxisId="left"
                  y={100.0}
                  stroke="#dc2626"
                  strokeDasharray="3 3"
                  label={{ value: 'NEA COD Limit (100 mg/L)', fill: '#dc2626', fontSize: 10, position: 'top' }}
                />
              )}

              {/* Signal Lines */}
              {(telemetryMode === 'all' || telemetryMode === 'ph_dosing') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ph"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  name="Effluent pH"
                  dot={{ r: 3 }}
                />
              )}

              {(telemetryMode === 'all' || telemetryMode === 'cod_fluoride') && (
                <>
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="codMgL"
                    stroke="#d97706"
                    strokeWidth={2}
                    name="COD (mg/L)"
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="fluorideMgL"
                    stroke="#059669"
                    strokeWidth={2}
                    name="Fluoride (mg/L)"
                    dot={false}
                  />
                </>
              )}

              {(telemetryMode === 'all' || telemetryMode === 'flow') && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dischargeFlowM3Hr"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="Discharge Flow (m³/hr)"
                  dot={false}
                />
              )}

              {(telemetryMode === 'all' || telemetryMode === 'ph_dosing') && (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="causticDosingMlMin"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    name="NaOH Caustic Dosing (ml/min)"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="acidDosingMlMin"
                    stroke="#e11d48"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    name="H2SO4 Acid Dosing (ml/min)"
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 6. Hourly Detailed Telemetry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                24-Hour Telemetry Audit Records (NEA Compliance Log)
              </h3>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            24 Hourly Samples
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-4">Hour (UTC+8)</th>
                <th className="py-2.5 px-3">Shift</th>
                <th className="py-2.5 px-3 font-mono">Effluent pH (6-9)</th>
                <th className="py-2.5 px-3 font-mono">COD (&le;100 mg/L)</th>
                <th className="py-2.5 px-3 font-mono">Fluoride (&lt;5 mg/L)</th>
                <th className="py-2.5 px-3 font-mono">Flow (m³/hr)</th>
                <th className="py-2.5 px-3 font-mono">Acid (ml/min)</th>
                <th className="py-2.5 px-3 font-mono">NaOH (ml/min)</th>
                <th className="py-2.5 px-3">Compliance</th>
                <th className="py-2.5 px-4">Operational SCADA Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {IWTP_HOURLY_DATA.map(d => (
                <tr key={d.hour} className="hover:bg-slate-50/80 transition">
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                    {d.timeDisplay}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                    {d.shift}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-extrabold text-sky-700">
                    {d.ph.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {d.codMgL.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                    {d.fluorideMgL.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-purple-700">
                    {d.dischargeFlowM3Hr.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-rose-600">
                    {d.acidDosingMlMin}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-indigo-600">
                    {d.causticDosingMlMin}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {d.complianceStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-[11px] text-slate-600 max-w-sm truncate" title={d.notes}>
                    {d.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
