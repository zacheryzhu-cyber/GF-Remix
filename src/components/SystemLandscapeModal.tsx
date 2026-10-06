import React from 'react';
import {
  Activity,
  ArrowDown,
  Cpu,
  Database,
  Layers,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';

export const SystemLandscapeModal: React.FC = () => {
  const { activeTab, setActiveTab } = useFacility();

  if (activeTab !== 'system_landscape') return null;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Integrated Semiconductor Facility Architecture (Appendix A)
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              ISA-95 &amp; Facility Hierarchy
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end data pipeline from physical fab utility sensors to edge PLCs, supervisory SCADA, AI analytics engine, and enterprise CMMS.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('alarms')}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition shadow-sm"
        >
          ← Return to Alarm Management
        </button>
      </div>

      {/* Architecture Stack Layers */}
      <div className="space-y-4">
        {/* Layer 4: Enterprise & CMMS Layer */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="font-bold text-xs text-purple-700 flex items-center gap-2">
              <Database className="w-4 h-4" /> LEVEL 4: Enterprise CMMS & MES (SAP PM / IBM Maximo / Wafer MES)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">REST / OData / MQTT Broker</span>
          </div>
          <p className="text-xs text-slate-600">
            Work order lifecycle dispatch, spare parts inventory (FFU motors, UPW resin columns), long-term asset depreciations, and wafer lot yield correlation.
          </p>
        </div>

        <div className="flex justify-center text-slate-400">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Layer 3: FabCore Facilities Operation Management Platform (Current App) */}
        <div className="bg-indigo-50/50 border-2 border-indigo-300 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
            <span className="font-bold text-sm text-indigo-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> LEVEL 3: FabCore Facilities Operation Management Platform (Scope 4.1 A-E)
            </span>
            <span className="px-2.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold shadow-xs">
              THIS CORE ENGINE
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-xs">
              <strong className="text-slate-900 block mb-1">4.1.A: Automated Shift Reports</strong>
              <span className="text-slate-600 text-[11px] leading-relaxed">AI executive summaries, VOC and PM/CM consolidation, 2-tier Lead & Manager approval workflow, automated distribution lists.</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-xs">
              <strong className="text-slate-900 block mb-1">4.1.B & 4.1.D: Event & Alarm OCAPs</strong>
              <span className="text-slate-600 text-[11px] leading-relaxed">Facility alarm rates, bad-actor suppression, automated CMMS ticketing, interactive step-by-step OCAP checklists.</span>
            </div>
            <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-xs">
              <strong className="text-slate-900 block mb-1">4.1.C & 4.1.E: CPK & Live Telemetry</strong>
              <span className="text-slate-600 text-[11px] leading-relaxed">Six Sigma Cp/Cpk/Ppk indices, 6-hourly cleanroom boxplots, real-time SCADA telemetry streaming & N+1 equipment health.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center text-slate-400">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Layer 2: Supervisory SCADA & Real-Time Historian */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="font-bold text-xs text-blue-700 flex items-center gap-2">
              <Server className="w-4 h-4" /> LEVEL 2: Supervisory SCADA & Process Historian (Wonderware / Ignition / OSIsoft PI)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">OPC-UA / Modbus TCP (1-sec sample rate)</span>
          </div>
          <p className="text-xs text-slate-600">
            Redundant tag acquisition servers, deadband chattering filtering, historian compression (Boxcar/Devon algorithms), and primary graphical HMIs.
          </p>
        </div>

        <div className="flex justify-center text-slate-400">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Layer 1: Edge PLC & DDC Automation */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="font-bold text-xs text-emerald-700 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> LEVEL 1: Edge PLC & DDC Automation (Siemens S7-1500 / Rockwell ControlLogix / Beckhoff)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Profinet / EtherNet/IP / Hardwired Safety Relays</span>
          </div>
          <p className="text-xs text-slate-600">
            Autonomous closed-loop PID control loops for UPW polishing, CDA header pressure, Litho Bay AHU temperature/RH cascade loops, and emergency ESV interlocks.
          </p>
        </div>

        <div className="flex justify-center text-slate-400">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Layer 0: Physical Field Instrumentation & Sensors */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="font-bold text-xs text-amber-700 flex items-center gap-2">
              <Radio className="w-4 h-4" /> LEVEL 0: Physical Semiconductor Fab Field Sensors & Actuators
            </span>
            <span className="text-[10px] text-slate-500 font-mono">4-20mA HART / Foundation Fieldbus / IO-Link</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <strong className="text-slate-900 block">UPW Resistivity</strong>
              <span className="text-[10px] text-slate-500">Thornton 0.01 cell const</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <strong className="text-slate-900 block">Litho Temp/RH</strong>
              <span className="text-[10px] text-slate-500">Vaisala ±0.05°C RTD</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <strong className="text-slate-900 block">Gas Detection (TGDS)</strong>
              <span className="text-[10px] text-slate-500">Honeywell Chemcassette (ppb)</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <strong className="text-slate-900 block">Aspirating Smoke</strong>
              <span className="text-[10px] text-slate-500">Xtralis VESDA Laser Focus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Standards Footer */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Engineered according to: <strong>ISO 14644-1</strong> (Cleanroom Airborne Particulate Class 1-4) and <strong>SEMI S2/S8</strong> Guidelines.</span>
        </div>
      </div>
    </div>
  );
};
