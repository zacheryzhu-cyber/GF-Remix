import React, { useState, useEffect } from 'react';
import { Menu, Globe, ArrowLeft } from 'lucide-react';
import { useFacility } from '../context/FacilityContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    activeTab,
    shiftReport,
    returnToGlobalLanding,
  } = useFacility();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC+8'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Status & Telemetry Bar */}
      <div className="bg-slate-900 px-4 sm:px-6 py-1.5 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            <span className="font-semibold text-slate-200 text-[11px] tracking-wide">
              FAB-1 AUTOMATION ONLINE
            </span>
          </div>
        </div>

        {/* Right Info: Live UTC Clock & Shift */}
        <div className="flex items-center gap-3 text-[11px]">
          <button
            onClick={returnToGlobalLanding}
            className="flex items-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 hover:text-white px-2.5 py-0.5 rounded-lg border border-emerald-500/50 font-mono transition shadow-xs"
            title="Return to Global 3D Earth Management Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>Global 3D Hub</span>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <span className="bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono font-medium border border-slate-700">
              {shiftReport.shiftType.split(' ')[0]} {shiftReport.shiftType.split(' ')[1]}
            </span>
          </div>

          <div className="font-mono text-slate-200 bg-slate-800/90 px-2.5 py-0.5 rounded border border-slate-700 text-[11px]">
            {currentTime || '2026-08-30 19:45:00 UTC+8'}
          </div>
        </div>
      </div>

      {/* Main Bar with Breadcrumb / Title & Key Action Chips */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <button
                onClick={returnToGlobalLanding}
                className="text-slate-500 hover:text-emerald-600 transition flex items-center gap-1 text-[11px]"
              >
                <span>Global Sites</span>
                <span className="text-slate-300">/</span>
              </button>
              <span className="text-emerald-700 font-extrabold uppercase">SINGAPORE FAB-1</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-700 uppercase font-semibold">
                {activeTab === 'reports' && 'Shift Handover'}
                {activeTab === 'cpk' && 'Process Capability (cPk/pPk)'}
                {activeTab === 'tickets' && 'CMMS Work Orders'}
                {activeTab === 'alarms' && 'Alarm Management'}
                {activeTab === 'emergency' && 'Emergency Response'}
                {activeTab === 'energy' && 'Energy Management'}
                {activeTab === 'water' && 'Water Management & IWTP (PUB / NEA)'}
                {activeTab === 'lpg_visualizer' && 'LPG Semantic Engine'}
                {activeTab === 'rdf_engine' && 'RDF Semantic Engine'}
                {activeTab === 'agent_hive' && 'Agent Hive'}
                {activeTab === 'agent_forge' && 'Agent Forge'}
                {activeTab === 'ontology_manager' && 'Ontology Manager'}
                {activeTab === 'workflow_engine' && 'Workflow Engine'}
                {activeTab === 'notification_settings' && 'Notification Settings'}
                {activeTab === 'mobile_app' && 'Mobile App'}
                {activeTab === 'system_landscape' && 'System Landscape'}
                {activeTab === 'campus_3d' && '3D Campus Twin'}
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicator & Global Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={returnToGlobalLanding}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold border border-slate-200 hover:border-emerald-300 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Return to 3D Globe</span>
          </button>

          <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold text-emerald-700 tracking-wider">SYSTEM NOMINAL</span>
          </div>
        </div>
      </div>
    </header>
  );
};
