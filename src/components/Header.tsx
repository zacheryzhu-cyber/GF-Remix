import React, { useState, useEffect } from 'react';
import { Menu, Globe, ArrowLeft, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
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

  const { theme, toggleTheme } = useTheme();
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
    <header className="sticky top-0 z-30 bg-ix-surface border-b border-ix-border">
      {/* Siemens-style navy app bar */}
      <div className="h-12 bg-ix-appbar px-4 sm:px-6 flex items-center justify-between text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={onToggleSidebar}
            className="md:hidden text-slate-300 hover:text-white p-1 rounded-sm hover:bg-white/10"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            <span className="font-semibold text-white text-[12px] tracking-wide">
              FAB-1 Automation Online
            </span>
          </div>
        </div>

        {/* Right Info: Hub link, shift, live clock, theme */}
        <div className="flex items-center gap-2 text-[11px]">
          <button
            onClick={returnToGlobalLanding}
            className="flex items-center gap-1.5 text-slate-200 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-sm transition"
            title="Return to Global 3D Earth Management Landing Page"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span>Global 3D Hub</span>
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-emerald-300 px-2 py-0.5 rounded-sm font-medium bg-white/10">
              {shiftReport.shiftType.split(' ')[0]} {shiftReport.shiftType.split(' ')[1]}
            </span>
          </div>

          <div className="hidden sm:block tabular-nums text-slate-200 px-2.5 py-0.5 text-[11px]">
            {currentTime || '2026-08-30 19:45:00 UTC+8'}
          </div>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-sm text-slate-200 hover:text-white hover:bg-white/10 transition"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle light/dark theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Bar with Breadcrumb / Title & Key Action Chips */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-sm border border-ix-border text-ix-text hover:bg-ix-surface-2"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div>
            <div className="text-xs text-ix-text flex items-center gap-2">
              <button
                onClick={returnToGlobalLanding}
                className="text-ix-text-2 hover:text-ix-accent transition flex items-center gap-1 text-[11px]"
              >
                <span>Global Sites</span>
                <span className="text-ix-border">/</span>
              </button>
              <span className="text-ix-text-2 font-medium">Singapore Fab-1</span>
              <span className="text-ix-border">/</span>
              <span className="text-ix-text text-sm font-semibold">
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
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-sm text-ix-text hover:bg-ix-accent-soft text-xs font-semibold border border-ix-border hover:border-ix-accent transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-ix-text-2" />
            <span>Return to 3D Globe</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-sm border border-ix-border">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-[11px] font-semibold text-ix-text-2 tracking-wide">System nominal</span>
          </div>
        </div>
      </div>
    </header>
  );
};
