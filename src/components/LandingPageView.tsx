import React, { useState } from 'react';
import {
  Globe,
  Building2,
  Cpu,
  Zap,
  Activity,
  ShieldCheck,
  Lock,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  FileText,
  BarChart3,
  ListTodo,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  Info,
  ChevronRight,
  MapPin,
  Droplets
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { Globe3D } from './globe/Globe3D';
import { GLOBAL_SITES } from '../data/globalSitesData';
import { GlobalSite } from '../types';

export const LandingPageView: React.FC = () => {
  const { enterFacilityWorkspace, shiftReport, alarms, tickets } = useFacility();
  const [selectedSite, setSelectedSite] = useState<GlobalSite>(GLOBAL_SITES[0]); // Defaults to Singapore

  const totalGlobalCapacity = '570,000 WSPM';
  const totalPowerDemand = '285.7 MW';
  const avgFleetCpk = '1.59';
  const activeSitesCount = GLOBAL_SITES.filter(s => s.status === 'Operational').length;

  const activeP1Count = alarms.filter(a => a.priority === 'P1' && a.status === 'Active').length;
  const openTicketsCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Global Management Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/60 backdrop-blur-md">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wider text-white">
                FABCORE GLOBAL
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                MGMT PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Semiconductor Multi-Site Fleet Operations &amp; Executive Command
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-950/70 hover:bg-violet-900/80 text-violet-300 hover:text-white border border-violet-500/50 hover:border-violet-400 font-mono text-xs shadow-md shadow-violet-950/50 transition active:scale-95"
            title="Open Live App in a dedicated new tab with full microphone and audio access"
          >
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
            <span>Open in Dedicated Tab</span>
          </a>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Sites: <strong className="text-white">7 Global Nodes</strong></span>
          </div>

          <button
            onClick={() => enterFacilityWorkspace('singapore-fab1')}
            className="px-4 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/50 backdrop-blur-md transition flex items-center gap-2 group active:scale-95"
          >
            <span>Enter Singapore Fab-1</span>
            <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Global Summary KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Total Wafer Output</span>
              <span className="text-lg font-bold font-mono text-slate-100">{totalGlobalCapacity}</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Fleet Process cPk</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-emerald-400">{avgFleetCpk}</span>
                <span className="text-[10px] text-emerald-300 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                  Capable
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Global Power Demand</span>
              <span className="text-lg font-bold font-mono text-slate-100">{totalPowerDemand}</span>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Operational Fabs</span>
              <span className="text-lg font-bold font-mono text-slate-100">{activeSitesCount} / 7 Online</span>
            </div>
          </div>
        </div>

        {/* 3D Earth Globe + Selected Site Inspector Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 3D Globe Viewer */}
          <div className="lg:col-span-7 h-[560px] relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/50">
            {/* Dedicated Tab Floating Badge */}
            <div className="absolute top-3.5 left-3.5 z-20">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-violet-950/90 text-violet-300 hover:text-white border border-violet-500/40 hover:border-violet-400 font-mono text-[11px] backdrop-blur-md shadow-lg shadow-black/70 transition group"
                title="Open app in direct tab to enable full microphone hardware permissions"
              >
                <ExternalLink className="w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition-transform" />
                <span>Open in Dedicated Tab</span>
                <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded border border-violet-500/30">
                  Full Mic &amp; Audio
                </span>
              </a>
            </div>

            <Globe3D
              selectedSite={selectedSite}
              onSelectSite={(site) => setSelectedSite(site)}
            />
          </div>

          {/* Site Detail Inspector Panel */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            {/* Background ambient glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-5 relative z-10">
              {/* Site Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                      {selectedSite.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selectedSite.isAccessible
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 font-bold'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1'
                      }`}
                    >
                      {selectedSite.isAccessible ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>LIVE WORKSPACE ACCESSIBLE</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>RESTRICTED DOMAIN</span>
                        </>
                      )}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-white mt-2">
                    {selectedSite.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{selectedSite.city}, {selectedSite.country} ({selectedSite.timezone})</span>
                  </div>
                </div>
              </div>

              {/* Site Description */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                {selectedSite.description}
              </p>

              {/* Site Specifications Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Wafer Technology</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">{selectedSite.fabType}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Cleanroom Standard</span>
                  <span className="font-semibold text-emerald-300 mt-0.5 block">{selectedSite.cleanroomClass}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Wafer Capacity</span>
                  <span className="font-mono font-bold text-slate-200 mt-0.5 block">{selectedSite.waferCapacity}</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Process Capability (cPk)</span>
                  <span className="font-mono font-bold text-emerald-400 mt-0.5 block">{selectedSite.cPkAvg}</span>
                </div>
              </div>

              {/* Real-time Telemetry Snapshot */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider block">
                  SCADA Telemetry Snapshot
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[9px]">UPW Resistivity</span>
                    <span className="text-slate-200 font-semibold">{selectedSite.keyMetrics.upwResistivity}</span>
                  </div>
                  <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[9px]">Thermal Chiller</span>
                    <span className="text-slate-200 font-semibold">{selectedSite.keyMetrics.chillerLoad}</span>
                  </div>
                  <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[9px]">Cleanroom Air Purity</span>
                    <span className="text-slate-200 font-semibold">{selectedSite.keyMetrics.airPurity}</span>
                  </div>
                  <div className="bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 block text-[9px]">Power Grid (N+1)</span>
                    <span className="text-slate-200 font-semibold">{selectedSite.keyMetrics.powerN1}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action CTA Area */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              {selectedSite.isAccessible ? (
                <div className="space-y-3">
                  <button
                    onClick={() => enterFacilityWorkspace('singapore-fab1')}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 hover:text-white font-bold text-sm border border-emerald-500/50 hover:border-emerald-400 shadow-lg shadow-emerald-950/60 backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-2 group active:scale-[0.99]"
                  >
                    <span>Enter Singapore Fab-1 Facility Workspace</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 group-hover:translate-x-1 transition-all" />
                  </button>

                  {/* Module Direct Links for Singapore */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'reports')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <FileText className="w-3 h-3 text-emerald-400" />
                      <span>Shift Handover</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'cpk')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <BarChart3 className="w-3 h-3 text-emerald-400" />
                      <span>cPk Telemetry</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'tickets')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <ListTodo className="w-3 h-3 text-blue-400" />
                      <span>CMMS Tickets</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'alarms')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span>Alarms &amp; MOC</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'emergency')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Emergency ERT</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'energy')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Energy</span>
                    </button>
                    <button
                      onClick={() => enterFacilityWorkspace('singapore-fab1', 'water')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold transition flex items-center gap-1.5"
                    >
                      <Droplets className="w-3 h-3 text-cyan-400" />
                      <span>Water</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-100">Remote Access Restricted</strong>
                      <span>
                        This regional site is air-gapped on its local intranet. Operational workspace and real-time SCADA workflow controls are currently active on the <strong>Singapore Fab-1 Megasite</strong>.
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const sg = GLOBAL_SITES.find(s => s.id === 'singapore-fab1')!;
                      setSelectedSite(sg);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-emerald-500/50 hover:border-emerald-400 font-bold text-xs shadow-md shadow-emerald-950/40 backdrop-blur-md transition flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Focus Singapore Fab-1 Hub</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3D SINGAPORE FAB CAMPUS SECTION (Appears below the 3D Map when Singapore is selected or inspected) */}
        {selectedSite.id === 'singapore-fab1' ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>Singapore Fab-1 Woodlands Campus</span>
                </h3>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-950/60">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-white font-bold text-lg mb-2">Singapore Fab-1 Operations Center</h4>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  The full 3D Campus Twin, structural visualizer, and live facility operations workspace are available in the dedicated operations center.
                </p>
                <button
                  onClick={() => enterFacilityWorkspace()}
                  className="px-6 py-3 bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 hover:text-white font-bold text-sm border border-emerald-500/50 hover:border-emerald-400 rounded-xl shadow-lg shadow-emerald-950/60 backdrop-blur-md transition-all duration-200 flex items-center gap-2 mx-auto group active:scale-[0.99]"
                >
                  <span>Enter Facility Operations Workspace</span>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* When inspecting another site, offer a prompt to view the Singapore 3D Campus or switch back */
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/50 backdrop-blur-md">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  Singapore Fab-1 Megasite 3D Campus Model Available
                </h4>
                <p className="text-xs text-slate-400">
                  Switch view back to Singapore to explore the 3D multi-building campus with connecting AMHS skybridges.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const sg = GLOBAL_SITES.find(s => s.id === 'singapore-fab1')!;
                setSelectedSite(sg);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/50 backdrop-blur-md transition flex items-center gap-2 shrink-0 group active:scale-95"
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Inspect Singapore Fab Campus</span>
            </button>
          </div>
        )}

        {/* Global Sites Directory Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Global Fabrication Network Directory</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Click any site to rotate globe and inspect
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {GLOBAL_SITES.map((site) => {
              const isSelected = selectedSite.id === site.id;
              return (
                <button
                  key={site.id}
                  onClick={() => setSelectedSite(site)}
                  className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-400/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${
                        isSelected 
                          ? 'text-emerald-200 bg-emerald-950 border-emerald-700' 
                          : 'text-slate-300 bg-slate-800 border-slate-700'
                      }`}>
                        {site.code}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          site.isAccessible
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {site.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                      {site.city}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {site.name}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">{site.waferCapacity}</span>
                    <span className="text-emerald-400 font-bold">cPk {site.cPkAvg}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Blank Management Overview Canvas for Future Elements */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Executive Management Canvas</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Dedicated workspace slot reserved for executive KPI summaries, yield correlations, and corporate governance dashboards.
              </p>
            </div>
            <span className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-slate-800 text-indigo-300 border border-slate-700">
              SLOT: ACTIVE / READY
            </span>
          </div>

          {/* Blank Canvas Area */}
          <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/40 flex flex-col items-center justify-center min-h-[200px] space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
              <PlusCircle className="w-5 h-5 text-slate-500" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xs font-bold text-slate-300">
                Management Custom Widget Area
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Add executive dashboards, cross-fab yields, global energy benchmarks, or strategic management widgets here.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        FabCore Semiconductor Operations Management &bull; Global Multi-Site Intelligence Portal &bull; ISO 14644-1 / SEMI S2 Compliant
      </footer>
    </div>
  );
};
