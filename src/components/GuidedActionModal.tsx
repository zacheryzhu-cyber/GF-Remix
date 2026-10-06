import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  History,
  Info,
  Shield,
  Sparkles,
  UserCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';

export const GuidedActionModal: React.FC = () => {
  const {
    selectedAlarmForOcap,
    currentOcapPlan,
    isOcapLoading,
    closeOcapModal,
    toggleOcapStep,
    convertAlarmToTicket,
  } = useFacility();

  if (!selectedAlarmForOcap) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  selectedAlarmForOcap.priority === 'P1'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {selectedAlarmForOcap.priority}
              </span>
              <span className="font-mono font-bold text-slate-900 text-base">
                {selectedAlarmForOcap.tag}
              </span>
              <span className="text-xs text-slate-500">({selectedAlarmForOcap.system})</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              {selectedAlarmForOcap.description}
            </h3>
            <p className="text-xs text-slate-500">
              Excursion Value: <strong className="text-slate-900 font-mono">{selectedAlarmForOcap.value} {selectedAlarmForOcap.unit}</strong> • Setpoint Limit: <strong className="text-slate-700 font-mono">{selectedAlarmForOcap.setpoint} {selectedAlarmForOcap.unit}</strong> • Location: <strong className="text-slate-700">{selectedAlarmForOcap.location}</strong>
            </p>
          </div>

          <button
            onClick={closeOcapModal}
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {isOcapLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs text-indigo-600 font-mono font-medium">
              Analyzing SCADA telemetry & formulating AI Out-of-Control Action Plan (OCAP)...
            </p>
          </div>
        ) : currentOcapPlan ? (
          <div className="space-y-5 text-xs">
            {/* Title & AI indicator */}
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-indigo-950 text-sm">{currentOcapPlan.ocapTitle}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold">
                {currentOcapPlan.generatedByAI ? 'AI Formulated OCAP' : 'Standard Standard OCAP'}
              </span>
            </div>

            {/* Root Cause Hypotheses */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" /> Root-Cause Hypotheses & Diagnostic Vectors:
              </h4>
              <div className="space-y-1.5">
                {currentOcapPlan.rootCauseHypothesis.map((cause, idx) => (
                  <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 flex items-start gap-2">
                    <span className="text-indigo-600 font-bold font-mono">[{idx + 1}]</span>
                    <span>{cause}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-step Interactive Checklist */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Standard Out-of-Control Checklist (Interactive):
              </h4>
              <div className="space-y-2">
                {currentOcapPlan.stepByStepChecklist.map(step => (
                  <div
                    key={step.step}
                    onClick={() => toggleOcapStep(step.step)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex items-start justify-between gap-3 ${
                      step.completed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 font-bold font-mono text-xs ${
                          step.completed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {step.completed ? '✓' : step.step}
                      </div>
                      <div>
                        <p className={`font-medium ${step.completed ? 'line-through text-emerald-700' : 'text-slate-900'}`}>
                          {step.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span>Role: <strong className="text-slate-700">{step.role}</strong></span>
                          {step.critical && (
                            <span className="text-rose-600 font-bold uppercase">Critical Step</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-slate-400 font-mono font-medium">
                      {step.completed ? 'COMPLETED' : 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Containment Rule */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl space-y-1">
              <h5 className="font-bold text-amber-800 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Emergency Containment & Risk Mitigation:
              </h5>
              <p className="text-amber-900 text-[11px] leading-relaxed">
                {currentOcapPlan.emergencyContainment}
              </p>
            </div>

            {/* Historical Resolution Case */}
            {currentOcapPlan.historicalResolution && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <h5 className="font-semibold text-slate-600 flex items-center gap-1.5 text-[11px]">
                  <History className="w-3.5 h-3.5 text-indigo-600" /> Historical Excursion Knowledge Base:
                </h5>
                <p className="text-slate-700 text-[11px]">
                  {currentOcapPlan.historicalResolution}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={closeOcapModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
          >
            Close OCAP
          </button>

          <div className="flex items-center gap-2">
            {!selectedAlarmForOcap.linkedTicketId && (
              <button
                onClick={() => {
                  convertAlarmToTicket(selectedAlarmForOcap);
                  closeOcapModal();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" /> Create Maintenance Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
