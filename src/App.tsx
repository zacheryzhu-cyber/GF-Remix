/**
 * FabCore - Semiconductor Facilities Operation Management System
 * Operations Management Platform & Customer Scope 4.1 A, B, C, D, E
 */

import React, { useState } from 'react';
import { FacilityProvider, useFacility } from './context/FacilityContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPageView } from './components/LandingPageView';
import { AlarmsView } from './components/AlarmsView';
import { CpkReportView } from './components/CpkReportView';
import { TicketsView } from './components/TicketsView';
import { ReportsView } from './components/ReportsView';
import { SingaporeFabCampus3D } from './components/globe/SingaporeFabCampus3D';
import { EmergencyResponseView } from './components/EmergencyResponseView';
import { SystemLandscapeModal } from './components/SystemLandscapeModal';
import { GuidedActionModal } from './components/GuidedActionModal';
import { AiQueryAssistantModal } from './components/AiQueryAssistantModal';
import { EnergyManagementView } from './components/energy_water/EnergyManagementView';
import { WaterManagementView } from './components/energy_water/WaterManagementView';
import { LpgVisualizer } from './pages/LpgVisualizer';
import { RdfEngine } from './pages/RdfEngine';
import { AgentHive } from './pages/AgentHive';
import { AgentForge } from './pages/AgentForge';
import { OntologyManager } from './pages/OntologyManager';
import { VisualWorkflowCanvas } from './components/VisualWorkflowCanvas';
import { NotificationSettingsView } from './components/NotificationSettingsView';
import { MobileAppView } from './components/MobileAppView';
import { UpwProcessView } from './pages/UpwProcessView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CheckCircle2, Sparkles } from 'lucide-react';

const MainContent: React.FC = () => {
  const { viewMode, activeTab, toastMessage, shiftReport, openAiAssistant } = useFacility();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // 1. Top-Level Global Management Landing Page (with 3D Earth Globe & Multi-site Topology)
  if (viewMode === 'global_landing') {
    return (
      <div className="min-h-screen bg-slate-950">
        <ErrorBoundary>
          <LandingPageView />
        </ErrorBoundary>

        {/* Global LLM AI Query Modal */}
        <AiQueryAssistantModal />

        {/* Floating AI Query Assistant Quick Launcher */}
        <button
          onClick={() => openAiAssistant()}
          className="fixed bottom-6 right-6 z-40 bg-emerald-950/80 hover:bg-emerald-900/70 text-emerald-300 hover:text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-950/80 flex items-center gap-2 font-bold text-xs border border-emerald-500/50 hover:border-emerald-400 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group"
          title="Ask Ops Copilot"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Ops Copilot</span>
        </button>

        {/* Toast Notification Alert Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
            <div className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Singapore Fab-1 Facility Operations Workspace (5 Primary Modules)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex selection:bg-emerald-500 selection:text-white">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Right Main Content Area */}
      <div className="flex-1 md:pl-72 flex flex-col min-w-0">
        {/* Global Top Bar */}
        <Header onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)} />

        {/* Dynamic Main View - Dedicated Modules */}
        <main className="flex-1 w-full max-w-[1750px] mx-auto px-4 sm:px-6 2xl:px-8 pt-5 pb-8">
          <ErrorBoundary>
            {activeTab === 'campus_3d' && (
              <div className="h-[calc(100vh-140px)] w-full">
                <SingaporeFabCampus3D />
              </div>
            )}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'cpk' && <CpkReportView />}
            {activeTab === 'tickets' && <TicketsView />}
            {activeTab === 'alarms' && <AlarmsView />}
            {activeTab === 'emergency' && <EmergencyResponseView />}
            {activeTab === 'energy' && <EnergyManagementView />}
            {activeTab === 'water' && <WaterManagementView />}
            {activeTab === 'system_landscape' && <SystemLandscapeModal />}
            {activeTab === 'lpg_visualizer' && <LpgVisualizer />}
            {activeTab === 'rdf_engine' && <RdfEngine />}
            {activeTab === 'agent_hive' && <AgentHive />}
            {activeTab === 'agent_forge' && <AgentForge />}
            {activeTab === 'ontology_manager' && <OntologyManager />}
            {activeTab === 'workflow_engine' && <VisualWorkflowCanvas />}
            {activeTab === 'notification_settings' && <NotificationSettingsView />}
            {activeTab === 'mobile_app' && <MobileAppView />}
            {activeTab === 'upw' && <UpwProcessView />}
          </ErrorBoundary>
        </main>

        {/* Guided Action (OCAP) Modal */}
        <GuidedActionModal />

        {/* Global LLM AI Query Modal */}
        <AiQueryAssistantModal />

        {/* Floating AI Query Assistant Quick Launcher */}
        <button
          onClick={() => openAiAssistant()}
          className="fixed bottom-6 right-6 z-40 bg-emerald-950/80 hover:bg-emerald-900/70 text-emerald-300 hover:text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-2xl shadow-emerald-950/80 flex items-center gap-2 font-bold text-xs border border-emerald-500/50 hover:border-emerald-400 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group"
          title="Ask Ops Copilot"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">Ops Copilot</span>
        </button>

        {/* Toast Notification Alert Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
            <div className="bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Compliance Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-600 mt-auto shadow-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FACILITY OPS CENTER</span>
              <div className="w-px h-3.5 bg-slate-200 hidden sm:block"></div>
              <span className="font-medium text-slate-700">Lead: {shiftReport.leadEngineer}</span>
              <div className="w-px h-3.5 bg-slate-200 hidden sm:block"></div>
              <span className="text-slate-500 font-mono text-[11px]">{shiftReport.shiftType}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FacilityProvider>
      <MainContent />
    </FacilityProvider>
  );
}
