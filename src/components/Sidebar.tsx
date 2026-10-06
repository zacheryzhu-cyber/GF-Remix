import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  ChevronRight,
  Cpu,
  Database,
  Droplets,
  FileText,
  Flame,
  GitBranch,
  Globe,
  Layers,
  ListTodo,
  Network,
  Smartphone,
  Sparkles,
  Workflow,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import { BeehiveIcon } from './common/BeehiveIcon';
import { useFacility } from '../context/FacilityContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    alarms,
    tickets,
    emergencyIncident,
    shiftReport,
    returnToGlobalLanding,
    openAiAssistant,
  } = useFacility();

  const activeP1Count = alarms.filter(a => a.priority === 'P1' && a.status === 'Active').length;
  const openWorkOrdersCount = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
  const isEmergencyActive = emergencyIncident && emergencyIncident.status !== 'All Clear';

  const navItems = [
    {
      id: 'campus_3d',
      label: '3D Campus Twin',
      icon: Box,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'reports',
      label: 'Shift Handover',
      icon: FileText,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'cpk',
      label: 'Process Capability (cPk/pPk)',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'tickets',
      label: 'CMMS Work Orders',
      icon: ListTodo,
      badge: openWorkOrdersCount > 0 ? `${openWorkOrdersCount} Open` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'alarms',
      label: 'Alarm Management',
      icon: AlertTriangle,
      badge: activeP1Count > 0 ? `${activeP1Count} P1` : null,
      badgeColor: 'bg-red-500 text-white animate-pulse',
    },
    {
      id: 'emergency',
      label: 'Emergency Response',
      icon: Flame,
      badge: isEmergencyActive ? 'ACTIVE' : null,
      badgeColor: 'bg-red-600 text-white animate-pulse',
    },
    {
      id: 'energy',
      label: 'Energy Management',
      icon: Zap,
      badge: '48.6 MWh/d',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    {
      id: 'water',
      label: 'Water Management',
      icon: Droplets,
      badge: 'PUB / NEA',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    },
    {
      id: 'lpg_visualizer',
      label: 'LPG Semantic Engine',
      icon: Layers,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'rdf_engine',
      label: 'RDF Semantic Engine',
      icon: Database,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'agent_hive',
      label: 'Agent Hive',
      icon: BeehiveIcon,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'agent_forge',
      label: 'Agent Forge',
      icon: Workflow,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ontology_manager',
      label: 'Ontology Manager',
      icon: Network,
      badge: 'LPG ⇄ RDF',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'workflow_engine',
      label: 'Workflow Engine',
      icon: GitBranch,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'notification_settings',
      label: 'Notification Settings',
      icon: Bell,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'mobile_app',
      label: 'Mobile App',
      icon: Smartphone,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'upw',
      label: 'UPW',
      icon: Waves,
      badge: null,
      badgeColor: '',
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Fab Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-950/70 border border-emerald-500/50 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-950/60 backdrop-blur-md text-emerald-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">FACILITY OPS CENTRE</h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  FAB-1
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">ISO 14644 • SEMI S2</p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Return to Global Landing / 3D Globe Button */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800">
          <button
            onClick={() => {
              returnToGlobalLanding();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-semibold shadow-md shadow-emerald-950/40 backdrop-blur-md transition group active:scale-95"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400 group-hover:rotate-45 transition-transform" />
              <span>Global 3D Earth Hub</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
              MGMT
            </span>
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Singapore</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono font-bold">
              6 TABS
            </span>
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group border ${
                  isActive
                    ? 'bg-emerald-950/80 text-emerald-200 font-bold border-emerald-500/60 shadow-md shadow-emerald-950/60 backdrop-blur-md ring-1 ring-emerald-400/40'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-emerald-300'
                        : item.id === 'emergency' && isEmergencyActive
                        ? 'text-rose-400 animate-pulse'
                        : 'text-slate-400 group-hover:text-emerald-300'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Integrated System Landscape Appendix A & Ops Copilot */}
          <div className="pt-4 mt-4 border-t border-slate-800 space-y-1.5">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              AI Knowledge &amp; Architecture
            </div>

            <button
              onClick={() => {
                openAiAssistant();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/60 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-semibold shadow-md shadow-emerald-950/40 backdrop-blur-md transition group active:scale-95"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span>Ops Copilot</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-400/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setActiveTab('system_landscape');
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition border ${
                activeTab === 'system_landscape'
                  ? 'bg-emerald-950/80 text-emerald-200 font-bold border-emerald-500/60 shadow-md shadow-emerald-950/60 backdrop-blur-md ring-1 ring-emerald-400/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className={`w-4 h-4 ${activeTab === 'system_landscape' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                <span>System Landscape (Appx A)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Shift & Operator Info */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-mono">ACTIVE SHIFT</span>
            <span className="text-[10px] font-bold text-emerald-400 font-mono">
              {shiftReport.shiftType.split(' ')[0]} {shiftReport.shiftType.split(' ')[1]}
            </span>
          </div>
          <div className="font-semibold text-slate-200 text-xs truncate">
            Lead: {shiftReport.leadEngineer}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ALARM ENGINE ACTIVE
          </div>
        </div>
      </aside>
    </>
  );
};
