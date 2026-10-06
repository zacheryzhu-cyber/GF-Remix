import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Flame,
  Layers,
  Printer,
  Radio,
  ShieldAlert,
  Sliders,
  Sparkles,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { AlarmItem } from '../types';
import { triggerPrintReport } from '../utils/exportUtils';
import { AlarmReportProvider } from '../context/AlarmReportContext';
import { WeeklyAlarmReportView } from './alarms/WeeklyAlarmReportView';
import { HourlyTrendsFloodsView } from './alarms/HourlyTrendsFloodsView';
import { TopBadActorsView } from './alarms/TopBadActorsView';
import { NuisanceAlarmsView } from './alarms/NuisanceAlarmsView';
import { RationalizationView } from './alarms/RationalizationView';

export type AlarmSubPageType =
  | 'weekly_report'
  | 'hourly_trends'
  | 'top_bad_actors'
  | 'nuisance_alarms'
  | 'rationalization';

export const AlarmsView: React.FC = () => {
  const {
    alarms,
    acknowledgeAlarm,
    shelfAlarm,
    unshelfAlarm,
    clearAlarm,
    openOcapModal,
    convertAlarmToTicket,
    triggerSimulatedAlarm,
    showToast,
  } = useFacility();

  // Top-Level Navigation Sub-Pages State (Strictly updated to 4 requested sub-pages)
  const [activeSubPage, setActiveSubPage] = useState<AlarmSubPageType>('weekly_report');

  // AI Diagnostic Modal State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);

  // Shelving Modal State
  const [shelveModalAlarm, setShelveModalAlarm] = useState<AlarmItem | null>(null);
  const [shelveHours, setShelveHours] = useState<number>(4);
  const [shelveReason, setShelveReason] = useState<string>(
    'Scheduled sensor calibration & deadband tuning in progress'
  );

  const handleConfirmShelve = () => {
    if (!shelveModalAlarm) return;
    shelfAlarm(shelveModalAlarm.id, shelveHours, shelveReason);
    showToast(`Alarm ${shelveModalAlarm.tag} shelved for ${shelveHours} hours.`);
    setShelveModalAlarm(null);
  };

  return (
    <AlarmReportProvider>
      <div className="space-y-6 pb-16 animate-in fade-in duration-200">
        {/* Top Main Navigation Tabs for the 4 Sub-Pages */}
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs">
          <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar gap-1">
            {/* Sub-Page 1 */}
            <button
              onClick={() => setActiveSubPage('weekly_report')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeSubPage === 'weekly_report'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Weekly Alarm Report</span>
            </button>

            {/* Sub-Page 2 */}
            <button
              onClick={() => setActiveSubPage('hourly_trends')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeSubPage === 'hourly_trends'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Hourly Trends &amp; Floods</span>
            </button>

            {/* Sub-Page 3 */}
            <button
              onClick={() => setActiveSubPage('top_bad_actors')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeSubPage === 'top_bad_actors'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              <span>Top 10 Bad Actors</span>
            </button>

            {/* Sub-Page 4 */}
            <button
              onClick={() => setActiveSubPage('nuisance_alarms')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeSubPage === 'nuisance_alarms'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Nuisance Alarms</span>
            </button>

            {/* Sub-Page 5: Rationalization */}
            <button
              onClick={() => setActiveSubPage('rationalization')}
              className={`flex items-center gap-2 py-2.5 px-4 text-xs font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeSubPage === 'rationalization'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Rationalization</span>
            </button>
          </div>
        </div>

        {/* Dynamic Sub-Page View Render */}
        {activeSubPage === 'weekly_report' && (
          <WeeklyAlarmReportView
            onOpenAiModal={() => setShowAiModal(true)}
            onNavigateSubPage={setActiveSubPage}
          />
        )}

        {activeSubPage === 'hourly_trends' && (
          <HourlyTrendsFloodsView
            onOpenAiModal={() => setShowAiModal(true)}
            showToast={showToast}
          />
        )}

        {activeSubPage === 'top_bad_actors' && (
          <TopBadActorsView
            onOpenAiModal={() => setShowAiModal(true)}
            onShelveAlarm={setShelveModalAlarm}
            showToast={showToast}
          />
        )}

        {activeSubPage === 'nuisance_alarms' && (
          <NuisanceAlarmsView
            onOpenAiModal={() => setShowAiModal(true)}
            onShelveAlarm={setShelveModalAlarm}
            showToast={showToast}
          />
        )}

        {activeSubPage === 'rationalization' && (
          <RationalizationView
            onOpenAiModal={() => setShowAiModal(true)}
            onNavigateSubPage={setActiveSubPage}
          />
        )}

      {/* AI Alarm Diagnostic Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-emerald-950 to-teal-950 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm tracking-wide uppercase">
                  AI ALARM SYSTEM RATIONALIZATION &amp; FLOOD AUDIT
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Overall Performance: Compliant (1.08 alarms/hr Mean Rate vs &lt;6.0/hr Target)
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Weekly evaluation across all cleanroom, UPW, CDA, and chemical SCADA loops. Alarm flood duration is 0.0%. Priority distribution meets standard benchmarks: P1 4.9%, P2 14.8%, P3/4 80.3%.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                  1. Top 10 Bad Actor Mitigation Recommendations
                </h4>
                <div className="space-y-2">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-700 block">UPW-RESIST-01 (Chattering Nuisance &bull; 42 Events / Week)</span>
                    <p className="text-[11px] text-slate-600">
                      Resistivity sensor experiences high-frequency chattering during resin polish switchovers. Recommend widening the alarm deadband from ±0.02 to ±0.08 MΩ·cm and applying a 10s on-delay debounce filter.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-amber-700 block">SCRUB-DP-01 (Standing Alarm &bull; 26.4h Duration)</span>
                    <p className="text-[11px] text-slate-600">
                      Differential pressure remains high across the demister bed. Schedule off-line spray nozzle purge during Wednesday preventive maintenance window.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-[11px]">
                  2. Alarm Rationalization Action Plan
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-xs">
                  <li>Deploy automated 15-second suppression filters on cleanroom airlock door sensors.</li>
                  <li>Rebalance single-phase PDU loads on Substation N+1 UPS to clear 31.2h standing alarm.</li>
                  <li>Recalibrate high-purity N2 trace oxygen sensor against 1.0 ppm certified benchmark.</li>
                </ul>
              </div>

              <div className="border-t border-slate-200 pt-3 text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>Evaluated by FabCore AI Alarm Engineering Engine</span>
                <span>Operational Standards Compliant</span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowAiModal(false);
                  triggerPrintReport();
                }}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Diagnostic Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Shelving Modal */}
      {shelveModalAlarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Temporary Alarm Shelving</h3>
              </div>
              <button onClick={() => setShelveModalAlarm(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-950">
                <div className="font-bold font-mono">{shelveModalAlarm.tag}</div>
                <div className="text-[11px] text-emerald-800">{shelveModalAlarm.description}</div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Shelve Duration (Hours):</label>
                <select
                  value={shelveHours}
                  onChange={e => setShelveHours(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                >
                  <option value={1}>1 Hour (Quick Maintenance)</option>
                  <option value={2}>2 Hours (Sensor Cleaning)</option>
                  <option value={4}>4 Hours (Standard Shift PM)</option>
                  <option value={8}>8 Hours (Full Shift Maintenance)</option>
                  <option value={24}>24 Hours (Overnight Re-engineering)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Engineering Justification &amp; Work Order:</label>
                <textarea
                  value={shelveReason}
                  onChange={e => setShelveReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800"
                  placeholder="Enter reason for shelving and technician authorization..."
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setShelveModalAlarm(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShelve}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Shelving
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AlarmReportProvider>
  );
};
