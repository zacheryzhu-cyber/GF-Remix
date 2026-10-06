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
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    },
    {
      id: 'alarms',
      label: 'Alarm Management',
      icon: AlertTriangle,
      badge: activeP1Count > 0 ? `${activeP1Count} P1` : null,
      badgeColor: 'bg-red-600 text-white animate-pulse',
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
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    },
    {
      id: 'water',
      label: 'Water Management',
      icon: Droplets,
      badge: 'PUB / NEA',
      badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300',
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
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300',
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
          className="fixed inset-0 z-40 bg-slate-950/60 md:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-ix-surface text-ix-text-2 flex flex-col border-r border-ix-border transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Fab Header: continues the navy app bar */}
        <div className="h-12 px-4 bg-ix-appbar border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-emerald-500 rounded-sm flex items-center justify-center text-white shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[13px] font-semibold text-white tracking-wide truncate">Facility Ops Centre</h1>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-white/10 text-emerald-300 border border-white/15">
                FAB-1
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-300 hover:text-white p-1"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Return to Global Landing / 3D Globe Button */}
        <div className="p-3 border-b border-ix-border">
          <button
            onClick={() => {
              returnToGlobalLanding();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-sm border border-emerald-500 bg-transparent text-emerald-700 dark:text-emerald-300 hover:bg-ix-accent-soft text-xs font-semibold transition group"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-ix-accent group-hover:rotate-45 transition-transform" />
              <span>Global 3D Earth Hub</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-ix-accent-soft px-1.5 py-0.5 rounded-sm">
              MGMT
            </span>
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <div className="flex-1 px-0 py-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold text-ix-text-2 uppercase tracking-wider flex items-center justify-between">
            <span>Singapore</span>
            <span className="text-[9px] bg-ix-accent-soft text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-sm font-semibold">
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
                className={`relative w-full flex items-center justify-between pl-4 pr-3 py-2.5 text-[13px] transition-colors group border-l-[3px] ${
                  isActive
                    ? 'bg-ix-accent-soft text-ix-text font-semibold border-ix-accent'
                    : 'text-ix-text-2 hover:bg-ix-surface-2 hover:text-ix-text border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 text-left truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-ix-accent'
                        : item.id === 'emergency' && isEmergencyActive
                        ? 'text-rose-500 animate-pulse'
                        : 'text-ix-text-2 group-hover:text-ix-accent'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0 ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Integrated System Landscape Appendix A & Ops Copilot */}
          <div className="pt-3 mt-3 border-t border-ix-border space-y-1">
            <div className="px-4 pb-1 text-[10px] font-semibold text-ix-text-2 uppercase tracking-wider">
              AI Knowledge &amp; Architecture
            </div>

            <button
              onClick={() => {
                openAiAssistant();
                setIsMobileOpen(false);
              }}
              className="w-[calc(100%-1.5rem)] mx-3 mb-1 flex items-center justify-between px-3 py-2 rounded-sm border border-emerald-500 bg-transparent text-emerald-700 dark:text-emerald-300 hover:bg-ix-accent-soft text-xs font-semibold transition group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-ix-accent group-hover:rotate-12 transition-transform" />
                <span>Ops Copilot</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ix-accent group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => {
                setActiveTab('system_landscape');
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-between pl-4 pr-3 py-2.5 text-[13px] transition-colors border-l-[3px] ${
                activeTab === 'system_landscape'
                  ? 'bg-ix-accent-soft text-ix-text font-semibold border-ix-accent'
                  : 'text-ix-text-2 hover:bg-ix-surface-2 hover:text-ix-text border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className={`w-4 h-4 ${activeTab === 'system_landscape' ? 'text-ix-accent' : 'text-ix-text-2'}`} />
                <span>System Landscape (Appx A)</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-ix-text-2" />
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Shift & Operator Info */}
        <div className="p-3.5 border-t border-ix-border bg-ix-surface-2 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-ix-text-2 uppercase tracking-wider">Active shift</span>
            <span className="text-[10px] font-semibold text-ix-accent">
              {shiftReport.shiftType.split(' ')[0]} {shiftReport.shiftType.split(' ')[1]}
            </span>
          </div>
          <div className="font-semibold text-ix-text text-xs truncate">
            Lead: {shiftReport.leadEngineer}
          </div>
          <div className="text-[10px] text-ix-accent mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ix-accent animate-pulse"></span>
            Alarm engine active
          </div>
        </div>
      </aside>
    </>
  );
};
