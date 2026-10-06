import React, { useState, useMemo } from 'react';
import {
  Sliders,
  FileCheck,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Download,
  Printer,
  Layers,
  ArrowRight,
  Check,
  Tag,
  ExternalLink,
  Calendar,
  LayoutGrid,
  List,
  Wrench,
  Info,
} from 'lucide-react';
import { useAlarmReport } from '../../context/AlarmReportContext';
import { useFacility } from '../../context/FacilityContext';
import { exportToCsv, triggerPrintReport } from '../../utils/exportUtils';
import { PriorityLevel } from '../../types';
import { AiBadge } from '../common/AiBadge';
import { RationalizationChangeItem } from './alarmData';

interface RationalizationViewProps {
  onOpenAiModal: () => void;
  onNavigateSubPage: (subPage: 'weekly_report' | 'hourly_trends' | 'top_bad_actors' | 'nuisance_alarms' | 'rationalization') => void;
}

export const RationalizationView: React.FC<RationalizationViewProps> = ({
  onOpenAiModal,
  onNavigateSubPage,
}) => {
  const {
    getAllRationalizationItems,
    tuneAlarmTag,
    isAlarmTuned,
    tunedChatteringMap,
    raiseWorkOrderForAlarm,
    getLinkedWorkOrder,
  } = useAlarmReport();

  const { showToast } = useFacility();

  // Active View Tab (Changes Register vs Simulator)
  const [activeTab, setActiveTab] = useState<'changes' | 'simulator'>('changes');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [systemFilter, setSystemFilter] = useState<string>('ALL');
  const [paramTypeFilter, setParamTypeFilter] = useState<string>('ALL');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Deadband Simulator State
  const [simSelectedTag, setSimSelectedTag] = useState<string>('UPW-RESIST-01');
  const [simDeadband, setSimDeadband] = useState<number>(15);
  const [simDebounceSec, setSimDebounceSec] = useState<number>(10);
  const [simMocNote, setSimMocNote] = useState<string>('Expand deadband ±15% and add 10s on-delay to eliminate chattering during resin switchover.');

  // All active items (plant-wide, no timeframe filter)
  const allRationalizationChanges = useMemo(() => {
    return getAllRationalizationItems();
  }, [getAllRationalizationItems]);

  // Filtered Changes
  const filteredChanges = useMemo(() => {
    return allRationalizationChanges.filter(item => {
      const matchesSearch =
        searchQuery === '' ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.parameter.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.paramType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.changeRationale.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.initialAlarmValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.newAlarmValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.system.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status.toLowerCase().includes(statusFilter.toLowerCase());
      const matchesSystem = systemFilter === 'ALL' || item.system.toLowerCase().includes(systemFilter.toLowerCase());
      const matchesParamType = paramTypeFilter === 'ALL' || item.paramType === paramTypeFilter;

      return matchesSearch && matchesPriority && matchesStatus && matchesSystem && matchesParamType;
    });
  }, [allRationalizationChanges, searchQuery, priorityFilter, statusFilter, systemFilter, paramTypeFilter]);

  // Summary Metrics for Rationalization
  const totalCount = allRationalizationChanges.length;
  const readyCount = allRationalizationChanges.filter(a => a.status === 'Ready to Deploy').length;
  const inProgressCount = allRationalizationChanges.filter(a => a.status === 'In Progress' || a.status === 'Under Review').length;
  const completedCount = allRationalizationChanges.filter(a => a.status === 'MOC Completed').length;
  const p1Count = allRationalizationChanges.filter(a => a.priority === 'P1').length;

  // Handle MOC Tuning Toggle
  const handleToggleMocTuning = (tag: string, actionId: string) => {
    const isNowTuned = tuneAlarmTag(tag);
    if (isNowTuned) {
      setActionFeedback(`MOC Verified for ${tag}: Setpoint & debounce filter deployed. Status updated to MOC Completed.`);
      showToast(`MOC Approved & Applied for ${tag}`);
    } else {
      setActionFeedback(`Tuning reset for ${tag}. Status restored to active.`);
      showToast(`Tuning reset for ${tag}`);
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Handle Quick CMMS Work Order Dispatch
  const handleDispatchWorkOrder = (action: RationalizationChangeItem) => {
    const woId = `WO-${Math.floor(8900 + Math.random() * 99)}`;
    raiseWorkOrderForAlarm(
      action.tag,
      woId,
      `[Rationalization Calibration] ${action.title}`,
      'Calibration & Span',
      action.location,
      action.changeRationale
    );
    setActionFeedback(`Work Order ${woId} dispatched for ${action.tag} (${action.parameter}).`);
    showToast(`Work Order ${woId} created for ${action.tag}`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Handle Simulator MOC Submission
  const handleApplySimulatorMoc = () => {
    tuneAlarmTag(simSelectedTag);
    setActionFeedback(`MOC Setpoint Authorization Submitted for ${simSelectedTag}: Deadband ±${simDeadband}%, Debounce ${simDebounceSec}s applied.`);
    showToast(`MOC Rationalization applied to ${simSelectedTag}`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const rows = allRationalizationChanges.map(item => ({
      ID: item.id,
      Initiation_Date: item.initiationDate,
      Alarm_Tag: item.tag,
      Parameter_Type: item.paramType,
      Parameter_Name: item.parameter,
      Title: item.title,
      System: item.system,
      Location: item.location,
      Priority: item.priority,
      Initial_Alarm_Value: item.initialAlarmValue,
      New_Alarm_Value: item.newAlarmValue,
      Change_Rationale: item.changeRationale,
      Target_Benefit: item.targetBenefit,
      Status: item.status,
      Due_Date: item.dueDate,
    }));

    exportToCsv('Alarm_Rationalization_Register', rows);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* =======================================================================
          HEADER
         ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Alarm Rationalization
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Systematic alarm setpoint rationalization, deadband optimization, and parameter changes to eliminate nuisance and standing alarms.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <AiBadge
            label="AI Rationalization Audit"
            colorScheme="emerald"
            variant="button"
            size="sm"
            onClick={onOpenAiModal}
            title="Run AI Rationalization & Bad Actor Audit"
          />

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            title="Export all rationalization change records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV Export</span>
          </button>

          <button
            onClick={() => triggerPrintReport()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5"
            title="Print clean rationalization report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-indigo-400 hover:text-indigo-800 text-xs font-bold px-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =======================================================================
          SUMMARY CARDS
         ======================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Total Active Rationalization Items */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Total Active Items
            </span>
            <FileCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium">facility-wide</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-rose-700 font-semibold">{p1Count} Critical P1</span>
            <span className="text-slate-600 font-medium">{totalCount - p1Count} P2/P3 Standard</span>
          </div>
        </div>

        {/* Metric 2: Ready to Deploy */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Ready to Deploy
            </span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-indigo-700">{readyCount}</span>
            <span className="text-xs text-slate-500 font-medium">approved changes</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-indigo-700 font-semibold">MOC Stage Authorized</span>
          </div>
        </div>

        {/* Metric 3: In Progress / Review */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              In Progress / Review
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-700">{inProgressCount}</span>
            <span className="text-xs text-slate-500 font-medium">in calibration</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-amber-800 font-semibold">Under field validation</span>
          </div>
        </div>

        {/* Metric 4: MOC Completed */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              MOC Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-700">{completedCount}</span>
            <span className="text-xs text-slate-500 font-medium">implemented</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span className="text-emerald-700 font-semibold">Setpoints live in PLC/SCADA</span>
          </div>
        </div>
      </div>

      {/* =======================================================================
          SECTION TABS & FILTER BAR
         ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Inner Navigation Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('changes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'changes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Rationalization Changes ({allRationalizationChanges.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Deadband &amp; Debounce Simulator</span>
            </button>
          </div>

          {activeTab === 'changes' && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Controls (for Changes tab) */}
        {activeTab === 'changes' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tag, parameter, rationale, or system..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Parameter Type Filter */}
              <select
                value={paramTypeFilter}
                onChange={e => setParamTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Parameter Types</option>
                <option value="Setpoint">Setpoint</option>
                <option value="Delay">Delay</option>
                <option value="Threshold">Threshold</option>
                <option value="Deadband">Deadband</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Ready">Ready to Deploy</option>
                <option value="In Progress">In Progress</option>
                <option value="Under Review">Under Review</option>
                <option value="Completed">MOC Completed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Priorities</option>
                <option value="P1">P1 Critical</option>
                <option value="P2">P2 High</option>
                <option value="P3">P3 Low</option>
              </select>

              {/* System Filter */}
              <select
                value={systemFilter}
                onChange={e => setSystemFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Systems</option>
                <option value="UPW">Ultra Pure Water</option>
                <option value="Scrubber">Scrubber &amp; Exhaust</option>
                <option value="HVAC">Cleanroom HVAC</option>
                <option value="Electrical">Electrical / UPS</option>
                <option value="Thermal">Thermal &amp; Chiller</option>
                <option value="Pneumatics">Pneumatics (CDA)</option>
                <option value="Gas">Specialty Gases</option>
                <option value="Chemical">Chemical Delivery</option>
                <option value="VESDA">VESDA &amp; Fire Safety</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-mono">
              Showing {filteredChanges.length} of {totalCount} records
            </div>
          </div>
        )}
      </div>

      {/* =======================================================================
          TAB 1: RATIONALIZATION CHANGES
         ======================================================================= */}
      {activeTab === 'changes' && (
        <div className="space-y-4">
          {/* Table View */}
          {viewMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5 font-bold">Initiation Date</th>
                      <th className="py-3 px-3 font-bold">Alarm Tag &amp; Parameter</th>
                      <th className="py-3 px-3 font-bold">Initial Alarm Value</th>
                      <th className="py-3 px-3 font-bold">New Alarm Value</th>
                      <th className="py-3 px-3 font-bold min-w-[260px]">Change Rationale</th>
                      <th className="py-3 px-3 font-bold">Priority &amp; Status</th>
                      <th className="py-3 px-3.5 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredChanges.map(item => {
                      const isTuned = isAlarmTuned(item.tag);
                      const linkedWo = getLinkedWorkOrder(item.tag);
                      const isCompleted = isTuned || item.status === 'MOC Completed';

                      const paramBadgeStyle =
                        item.paramType === 'Setpoint'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : item.paramType === 'Delay'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : item.paramType === 'Threshold'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isCompleted ? 'bg-emerald-50/20' : ''
                          }`}
                        >
                          {/* 1. Initiation Date */}
                          <td className="py-3.5 px-3.5 whitespace-nowrap align-top">
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold text-xs">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.initiationDate}</span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                              {item.id}
                            </span>
                          </td>

                          {/* 2. Alarm Tag & Parameter (with 1 Param Type Badge) */}
                          <td className="py-3.5 px-3 align-top min-w-[200px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {item.tag}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${paramBadgeStyle}`}>
                                {item.paramType}
                              </span>
                            </div>
                            <div className="font-bold text-slate-900 text-xs mt-1.5 leading-snug">
                              {item.parameter}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.system} &bull; {item.location}
                            </div>
                          </td>

                          {/* 3. Initial Alarm Value (Only 1 Parameter) */}
                          <td className="py-3.5 px-3 align-top min-w-[150px]">
                            <div className="p-2.5 bg-rose-50/70 border border-rose-200 text-rose-900 rounded-lg text-xs leading-relaxed space-y-1">
                              <div className="text-[9px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
                                <span>Initial {item.paramType}</span>
                              </div>
                              <div className="font-mono font-bold text-rose-950 text-xs">
                                {item.initialAlarmValue}
                              </div>
                            </div>
                          </td>

                          {/* 4. New Alarm Value (Only 1 Parameter Changed) */}
                          <td className="py-3.5 px-3 align-top min-w-[160px]">
                            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs leading-relaxed space-y-1">
                              <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                                <span>New {item.paramType}</span>
                              </div>
                              <div className="font-mono font-bold text-emerald-950 text-xs">
                                {item.newAlarmValue}
                              </div>
                            </div>
                          </td>

                          {/* 5. Change Rationale */}
                          <td className="py-3.5 px-3 align-top max-w-md">
                            <p className="text-slate-700 text-xs leading-relaxed">
                              {item.changeRationale}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
                              <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>{item.targetBenefit}</span>
                            </div>
                          </td>

                          {/* 6. Priority & Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap align-top">
                            <div className="space-y-1.5">
                              <span
                                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  item.priority === 'P1'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : item.priority === 'P2'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {item.priority}
                              </span>

                              <div>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isCompleted
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : item.status === 'Ready to Deploy'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : item.status === 'In Progress'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isCompleted && <Check className="w-3 h-3 text-emerald-600" />}
                                  {isCompleted ? 'MOC Completed' : item.status}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 7. Action Controls */}
                          <td className="py-3.5 px-3.5 text-center whitespace-nowrap align-top">
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleToggleMocTuning(item.tag, item.id)}
                                className={`px-2.5 py-1 rounded text-xs font-bold transition flex items-center justify-center gap-1 ${
                                  isTuned
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                }`}
                                title={isTuned ? 'Reset tuning to initial values' : 'Execute MOC setpoint in PLC'}
                              >
                                <Sliders className="w-3 h-3" />
                                <span>{isTuned ? 'Reset' : 'Execute MOC'}</span>
                              </button>

                              <button
                                onClick={() => handleDispatchWorkOrder(item)}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold transition flex items-center justify-center gap-1"
                                title="Dispatch CMMS Calibration Work Order"
                              >
                                <Wrench className="w-3 h-3 text-slate-500" />
                                <span>CMMS WO</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredChanges.map(item => {
                const isTuned = isAlarmTuned(item.tag);
                const linkedWo = getLinkedWorkOrder(item.tag);
                const isCompleted = isTuned || item.status === 'MOC Completed';

                const paramBadgeStyle =
                  item.paramType === 'Setpoint'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : item.paramType === 'Delay'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : item.paramType === 'Threshold'
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div
                    key={item.id}
                    className={`border rounded-xl p-4.5 transition flex flex-col justify-between space-y-3.5 shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-50/30 border-emerald-200'
                        : item.priority === 'P1'
                        ? 'bg-white border-rose-200 hover:border-rose-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Top: ID, Tag, ParamType, Priority, Status */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                            {item.id}
                          </span>
                          <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-bold">
                            {item.tag}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${paramBadgeStyle}`}>
                            {item.paramType}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              item.priority === 'P1'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : item.priority === 'P2'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{item.initiationDate}</span>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1'
                                : item.status === 'Ready to Deploy'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : item.status === 'In Progress'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isCompleted && <Check className="w-3 h-3 text-emerald-600" />}
                            {isCompleted ? 'MOC Completed' : item.status}
                          </span>
                        </div>
                      </div>

                      {/* Parameter & Title */}
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Alarm Parameter
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 leading-snug">
                          {item.parameter}
                        </h4>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.title} &bull; <span className="font-medium text-slate-700">{item.system} ({item.location})</span>
                        </div>
                      </div>

                      {/* Before / After Setpoint Comparison (Only 1 Parameter) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-lg">
                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                            Initial {item.paramType} Value
                          </span>
                          <span className="font-mono text-rose-950 font-bold block leading-tight text-xs">
                            {item.initialAlarmValue}
                          </span>
                        </div>

                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                            New {item.paramType} Value
                          </span>
                          <span className="font-mono text-emerald-950 font-bold block leading-tight text-xs">
                            {item.newAlarmValue}
                          </span>
                        </div>
                      </div>

                      {/* Change Rationale Box */}
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                        <div className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Change Rationale</span>
                        </div>
                        <p className="leading-relaxed">
                          {item.changeRationale}
                        </p>
                      </div>

                      {/* Target Benefit */}
                      <div className="text-[11px] text-indigo-700 bg-indigo-50/60 p-2 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span><strong>Expected Benefit:</strong> {item.targetBenefit}</span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="border-t border-slate-200/70 pt-3 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 font-mono">
                        Target Date: <strong className="text-slate-700">{item.dueDate}</strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleMocTuning(item.tag, item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            isTuned
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                          title={isTuned ? 'Reset tuning to initial values' : 'Execute MOC Setpoint'}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>{isTuned ? 'Reset Tuning' : 'Execute MOC'}</span>
                        </button>

                        <button
                          onClick={() => handleDispatchWorkOrder(item)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                          title="Dispatch CMMS Calibration Work Order"
                        >
                          <Wrench className="w-3.5 h-3.5 text-slate-600 inline mr-1" />
                          <span>CMMS WO</span>
                        </button>

                        <button
                          onClick={() => onNavigateSubPage('top_bad_actors')}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-xs transition"
                          title="Inspect in Top 10 Bad Actors view"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredChanges.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
              <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-sm text-slate-800">No rationalization records match your filter criteria</div>
              <p className="text-xs text-slate-500">Try clearing the search query or resetting priority/system filters.</p>
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          TAB 2: DEADBAND & DEBOUNCE FILTER SIMULATOR
         ======================================================================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                Alarm Parameter Tuning &amp; Filter Calculator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate hysteresis deadband widening and time-delay debouncing to eliminate signal noise without compromising trip safety.
              </p>
            </div>

            <div className="space-y-4">
              {/* Select Alarm Tag */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target SCADA Alarm Loop
                </label>
                <select
                  value={simSelectedTag}
                  onChange={e => setSimSelectedTag(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="UPW-RESIST-01">UPW-RESIST-01 - UPW Polish Skid Resistivity Cell (42 events/wk)</option>
                  <option value="SCRUB-DP-01">SCRUB-DP-01 - Scrubber Tower 1 Demister DP Cell (26.4h standing)</option>
                  <option value="HVAC-CR-DP-BAY3">HVAC-CR-DP-BAY3 - Cleanroom Airlock Bay 3 DP (15 events/wk)</option>
                  <option value="CHILLER-CHW-01">CHILLER-CHW-01 - Chiller CHW Supply Temp RTD (22 events/wk)</option>
                  <option value="ELEC-UPS-N1-01">ELEC-UPS-N1-01 - Substation PDU Phase Imbalance (31.2h standing)</option>
                </select>
              </div>

              {/* Deadband Slider */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">Deadband Hysteresis (±%)</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    ±{simDeadband}% of Full Scale
                  </span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={simDeadband}
                  onChange={e => setSimDeadband(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>2% (Tight / Sensitive)</span>
                  <span>15% (Recommended)</span>
                  <span>30% (Wide / Damped)</span>
                </div>
              </div>

              {/* On-Delay Debounce Filter Slider */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">On-Delay Debounce Filter (Seconds)</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {simDebounceSec} Seconds Delay
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={simDebounceSec}
                  onChange={e => setSimDebounceSec(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0s (Instant Trigger)</span>
                  <span>10s (Standard)</span>
                  <span>30s (Maximum Transit Filter)</span>
                </div>
              </div>

              {/* MOC Justification Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Management of Change (MOC) Engineering Justification
                </label>
                <textarea
                  rows={2}
                  value={simMocNote}
                  onChange={e => setSimMocNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleApplySimulatorMoc}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit MOC Setpoint Authorization &amp; Update PLC</span>
              </button>
            </div>
          </div>

          {/* Real-time Projected Outcome Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Simulated Reduction Output</span>
              </div>

              <div className="p-4 bg-white/10 rounded-lg border border-white/15 space-y-2">
                <span className="text-xs text-slate-300 block">Estimated Alarm Reduction</span>
                <div className="text-3xl font-mono font-black text-emerald-400">
                  {Math.min(96, 60 + simDeadband + simDebounceSec)}%
                </div>
                <p className="text-[11px] text-slate-300">
                  Calculated from 1,000 historic SCADA data points on {simSelectedTag}.
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span>Residual Chattering:</span>
                  <span className="font-mono text-white font-bold">
                    {Math.max(1, Math.round(42 * (1 - (60 + simDeadband + simDebounceSec) / 100)))} bursts/wk
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-1.5">
                  <span>Safety Margin:</span>
                  <span className="font-mono text-emerald-300 font-bold">100% Compliant</span>
                </div>
                <div className="flex justify-between">
                  <span>Interlock Delay:</span>
                  <span className="font-mono text-white font-bold">{simDebounceSec}.0 sec</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-black/30 p-3 rounded-lg border border-white/10">
              Complies with plant alarm management procedures and MOC authorization workflow.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
