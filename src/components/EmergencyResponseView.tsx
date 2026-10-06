import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  FileCheck,
  Flame,
  HelpCircle,
  History,
  Info,
  Layers,
  MapPin,
  Megaphone,
  PhoneCall,
  Printer,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { AlarmItem, EmergencyIncident, EmergencySubStep } from '../types';
import { exportToCsv, triggerPrintReport } from '../utils/exportUtils';

export const EmergencyResponseView: React.FC = () => {
  const {
    alarms,
    emergencyIncident,
    triggerSimFireAlarm,
    triggerEmergencyIncident,
    acknowledgeEmergencyIncident,
    triggerVerification,
    setVerificationOutcome,
    completeWorkflowSubStep,
    resolveEmergencyIncident,
    resetEmergencyIncident,
    showToast,
    tickets,
    setActiveTab,
  } = useFacility();

  // Resolution form state
  const [resolutionNotes, setResolutionNotes] = useState<string>(
    'Incident resolved in accordance with SOP-FLS-401. FLIR thermal scan confirmed nominal conditions. Interlocks reset to standard auto recirculation. All clear broadcasted.'
  );

  // Live Elapsed Time Tracker
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!emergencyIncident || emergencyIncident.status === 'All Clear') {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      if (emergencyIncident.detectedTimestamp) {
        const secs = Math.floor((Date.now() - emergencyIncident.detectedTimestamp) / 1000);
        setElapsedSeconds(secs);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [emergencyIncident]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `T+${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Filter fire alarm related alarms if present
  const fireAlarms = useMemo(() => {
    return alarms.filter(a => a.tag.includes('VESDA') || a.system.includes('Fire') || a.priority === 'P1');
  }, [alarms]);

  return (
    <div id="emergency-response-view" className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div id="emergency-header-card" className="bg-slate-900 text-white p-5 sm:p-6 rounded-xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-red-600/30 text-red-400 rounded-lg border border-red-500/30">
              <Flame className="w-6 h-6 animate-pulse text-red-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Emergency Response System</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/40">
                  SOP-FLS-401
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Only Sim Fire Alarm, Reset, Print */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!emergencyIncident ? (
            <button
              id="btn-trigger-sim-fire"
              onClick={() => triggerSimFireAlarm()}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-red-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Flame className="w-4 h-4" />
              <span>Sim Fire Alarm</span>
            </button>
          ) : (
            <>
              <button
                id="btn-reset-incident"
                onClick={() => resetEmergencyIncident()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Reset response to standby"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Reset to Standby</span>
              </button>
              <button
                id="btn-print-incident"
                onClick={() => triggerPrintReport()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>Print Incident Report</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Public Evacuation / Stand-down Live PA Broadcast Banner (if active) */}
      {emergencyIncident?.announcementActive && (
        <div id="announcement-broadcast-banner" className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-md animate-pulse ${
          emergencyIncident.verificationOutcome === 'true'
            ? 'bg-red-950/70 border-red-500 text-red-100'
            : 'bg-emerald-950/70 border-emerald-500 text-emerald-100'
        }`}>
          <Megaphone className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
            emergencyIncident.verificationOutcome === 'true' ? 'text-red-400' : 'text-emerald-400'
          }`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
              <span>{emergencyIncident.verificationOutcome === 'true' ? '🔴 LIVE PA EVACUATION BROADCAST ACTIVE' : '🟢 LIVE PA ALL-CLEAR BROADCAST ACTIVE'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-black/40 font-mono">PLANT-WIDE PA CH-1 & CH-3</span>
            </div>
            <p className="text-sm mt-1 font-medium leading-relaxed">
              {emergencyIncident.announcementText || 'Attention all personnel: Follow on-screen emergency guidance.'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!emergencyIncident ? (
        /* Standby State (No active emergency) */
        <div id="emergency-standby-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <span className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Life-Safety & Fire Response: Nominal Standby</h2>
              </div>
            </div>

            {/* Standard Response Protocol Sequence Diagram */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Standard Fire Emergency Response Sequence (SOP-FLS-401)</h3>
              
              <div className="space-y-4">
                {/* Alarm Activation */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Flame className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Activate Alarm & Inform Fire Team</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">Automatic / Manual</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      VESDA laser optical smoke sensor excursion triggers primary fire alarm. Automatic SCADA pager alert dispatches In-House Fire Team and logs ingress timestamp.
                    </p>
                  </div>
                </div>

                {/* Operations Acknowledgment */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <VolumeX className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Operations Acknowledge Alarm</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">Target: &lt; 30s</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Operations Shift Lead acknowledges the active alarm on the SCADA console, silencing local audible sirens while maintaining life-safety interlock supervision.
                    </p>
                  </div>
                </div>

                {/* Field Verification */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    <Activity className="w-4 h-4 text-teal-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Trigger Verification</h4>
                      <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium">Field Physical Check</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      On-site physical & optical verification triggered. Fire Team deploys with FLIR thermal imaging cameras to inspect the plenum/zone for thermal hotspots.
                    </p>
                  </div>
                </div>

                {/* Verified Protocols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Confirmed Fire Protocol */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-300">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                      <Flame className="w-4 h-4 text-red-700" />
                      <span>Confirmed Fire Emergency Protocol</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Announcement:</strong> Broadcast PA evacuation alert to Area C and Cleanroom bays.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Activate CERT Team:</strong> Mobilize in-house Company Emergency Response Team.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Headcount:</strong> Conduct muster count at Assembly Area 3 (18/18 personnel).</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Suppression / SCDF:</strong> Engage FM-200 suppression & SCDF external staging.</span>
                      </li>
                    </ul>
                  </div>

                  {/* False Alarm Protocol */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-300">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>False Alarm Stand-Down Protocol</span>
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1.5 pl-1">
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Inform SCDF:</strong> Notify SCDF Ops Centre of false alarm & stand down turnout.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Announcement:</strong> Broadcast All-Clear message; resume operations.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-slate-400">•</span>
                        <span><strong>Follow-up with RCA:</strong> Auto-generate CMMS RCA investigation work order.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Fire Simulation Button */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                To initiate an emergency safety drill or verify the automated workflow sequence, click the button.
              </div>
              <button
                id="btn-drill-sim-fire"
                onClick={() => triggerSimFireAlarm()}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Flame className="w-4 h-4 text-red-400" />
                <span>Simulate Fire Alarm Drill</span>
              </button>
            </div>
          </div>

          {/* Right Column: Readiness Indicators */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-800" />
                <span>Life-Safety Subsystems Status</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-700 font-medium">VESDA Laser Aspirating System</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">Online (0.012% obs/m)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-700 font-medium">Fire Water Ring & Hydrants</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">12.4 bar (Pressurized)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-700 font-medium">AHU Smoke Purge Dampers</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">Auto / Ready</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-700 font-medium">CERT On-Duty Squad</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">Squad 1 (8 Officers)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-700 font-medium">SCDF Direct Line Interconnect</span>
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Emergency Incident View */
        <div id="active-emergency-container" className="space-y-6">
          {/* Incident Alert Header */}
          <div id="active-incident-banner" className="bg-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-300 font-semibold">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
                  <span>Active Emergency Incident • {emergencyIncident.id}</span>
                </div>
                <h2 className="text-xl font-bold mt-1 text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-400" />
                  <span>{emergencyIncident.hazardName}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Location:</strong> {emergencyIncident.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Reading:</strong> {emergencyIncident.ppmReading}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <strong>Detected:</strong> {emergencyIncident.detectedAt}
                  </span>
                </div>
              </div>

              {/* Status & Timer Card */}
              <div className="flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-lg border border-slate-700">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Elapsed Response Time</div>
                  <div className="text-2xl font-mono font-bold text-slate-100">{formattedTimer}</div>
                </div>
                <div className="h-9 w-px bg-slate-700"></div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Current State</div>
                  <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-md mt-0.5 ${
                    emergencyIncident.status === 'All Clear'
                      ? 'bg-teal-900/60 text-teal-200 border border-teal-700'
                      : emergencyIncident.status.includes('True')
                      ? 'bg-red-800 text-white'
                      : emergencyIncident.status.includes('False')
                      ? 'bg-teal-800 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}>
                    {emergencyIncident.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper / Sequential Workflow Card */}
          <div id="emergency-workflow-stepper" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-200 gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-teal-800" />
                  <span>Mandatory Emergency Response Sequence</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Execute standard operational procedure in compliance with SCDF and plant safety regulations.
                </p>
              </div>

              {/* Workflow Step Pill */}
              <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <span>Current Stage:</span>
                <span className="text-slate-900 font-bold">
                  {emergencyIncident.currentWorkflowStep === 1 && 'Alarm Active & Dispatched'}
                  {emergencyIncident.currentWorkflowStep === 2 && 'Operations Acknowledged'}
                  {emergencyIncident.currentWorkflowStep === 3 && 'Trigger Verification'}
                  {emergencyIncident.currentWorkflowStep === 4 && emergencyIncident.verificationOutcome === 'true' && 'Confirmed Fire Protocol Active'}
                  {emergencyIncident.currentWorkflowStep === 4 && emergencyIncident.verificationOutcome === 'false' && 'False Alarm Stand-Down Active'}
                </span>
              </div>
            </div>

            {/* Step Cards Grid */}
            <div className="space-y-4">
              {/* Activate Alarm and Inform Fire Team */}
              <div id="workflow-step-1" className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Activate Alarm and Inform Fire Team</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                          ✓ Completed (T+00:00s)
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        VESDA Laser smoke excursion &gt;0.086% obs/m in Area C Photolithography Cleanroom. Fire alarm activated; In-House Fire Team automatically paged and informed via SCADA.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center text-xs">
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-slate-600" />
                      <span>Fire Team Informed: {emergencyIncident.fireTeamInformedAt || 'T+0s'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Operations Acknowledge Alarm */}
              <div id="workflow-step-2" className={`p-4 rounded-xl border transition-all ${
                emergencyIncident.acknowledgedAt
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-50 border-slate-300 ring-1 ring-slate-300'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      emergencyIncident.acknowledgedAt
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-700 text-white'
                    }`}>
                      {emergencyIncident.acknowledgedAt ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Operations Acknowledge Alarm</h4>
                        {emergencyIncident.acknowledgedAt ? (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                            ✓ Acknowledged (T+{emergencyIncident.timeToAcknowledgeSec || 14}s)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-100 text-amber-900">
                            Action Required (Shift Lead)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {emergencyIncident.acknowledgedAt
                          ? `Alarm acknowledged by ${emergencyIncident.acknowledgedBy || 'Shift Lead'}. Local sirens silenced; supervisory life-safety loop engaged.`
                          : 'Shift Lead must acknowledge active fire alarm to confirm console awareness and silence horns.'}
                      </p>
                    </div>
                  </div>

                  {/* Action Button for Step 2 */}
                  {!emergencyIncident.acknowledgedAt && (
                    <button
                      id="btn-ack-fire-alarm"
                      onClick={() => acknowledgeEmergencyIncident('Marcus Vance (Shift Lead)')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                    >
                      <VolumeX className="w-4 h-4" />
                      <span>Acknowledge Alarm & Silence Siren</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Trigger Verification */}
              <div id="workflow-step-3" className="p-4 rounded-xl border transition-all bg-slate-50 border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      emergencyIncident.verificationOutcome !== 'unverified'
                        ? 'bg-slate-800 text-white'
                        : emergencyIncident.verificationTriggered
                        ? 'bg-teal-800 text-white'
                        : 'bg-slate-300 text-slate-700'
                    }`}>
                      {emergencyIncident.verificationOutcome !== 'unverified' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Trigger Verification</h4>
                        {emergencyIncident.verificationTriggered && emergencyIncident.verificationOutcome === 'unverified' && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                            Field Thermal Scan in Progress
                          </span>
                        )}
                        {emergencyIncident.verificationOutcome !== 'unverified' && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                            ✓ Verified ({emergencyIncident.verificationOutcome === 'true' ? 'Confirmed Fire' : 'False Alarm'})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Dispatch on-duty Fire Lead and emergency team with FLIR thermal imaging cameras to inspect Area C plenum for physical fire, smoke density, or false sensor trip.
                      </p>
                    </div>
                  </div>

                  {/* Trigger Verification Button */}
                  {emergencyIncident.acknowledgedAt && !emergencyIncident.verificationTriggered && (
                    <button
                      id="btn-trigger-verification"
                      onClick={() => triggerVerification('Marcus Vance (Shift Lead)')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                    >
                      <Activity className="w-4 h-4" />
                      <span>Trigger Verification</span>
                    </button>
                  )}
                </div>

                {/* Decision Card: When Verification is Triggered, select Confirmed Fire vs False Alarm */}
                {emergencyIncident.verificationTriggered && emergencyIncident.verificationOutcome === 'unverified' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">
                      <HelpCircle className="w-4 h-4 text-teal-800" />
                      <span>On-Site Verification Findings: Select Result</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">
                      The Fire Team has inspected the ceiling plenum. Confirm whether the thermal imaging scan detects real fire/heat excursion or confirmed false alarm.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Confirmed Fire Decision */}
                      <button
                        id="btn-verify-outcome-true"
                        onClick={() => setVerificationOutcome('true', 'Robert Zhao (Safety Lead & FLIR Lead)')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-left transition-all group flex items-start gap-3"
                      >
                        <div className="p-2 rounded bg-slate-800 text-white group-hover:scale-105 transition-transform flex-shrink-0">
                          <Flame className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                            <span>Confirmed Fire Emergency Protocol</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Thermal anomaly confirmed (84.2°C). Execute PA evacuation, CERT mobilization, headcount, and suppression.
                          </p>
                        </div>
                      </button>

                      {/* False Alarm Decision */}
                      <button
                        id="btn-verify-outcome-false"
                        onClick={() => setVerificationOutcome('false', 'Robert Zhao (Safety Lead & FLIR Lead)')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-left transition-all group flex items-start gap-3"
                      >
                        <div className="p-2 rounded bg-teal-900 text-white group-hover:scale-105 transition-transform flex-shrink-0">
                          <ShieldCheck className="w-5 h-5 text-teal-300" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
                            <span>False Alarm Stand-Down Protocol</span>
                            <ArrowRight className="w-3.5 h-3.5 text-teal-700" />
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Ambient 21.1°C with zero thermal heat. Execute SCDF stand-down notification, announcement, and RCA ticket.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Verified Fire Emergency Response Protocol */}
              {emergencyIncident.verificationOutcome === 'true' && (
                <div id="branch-4a-container" className="p-5 rounded-xl bg-slate-50 border border-slate-300 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded bg-slate-900 text-white">
                        <Flame className="w-5 h-5 text-red-400" />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">Verified Fire Emergency Protocol</h4>
                        <p className="text-xs text-slate-600">Follow operational response: Announcement → Activate CERT → Headcount → Containment</p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-slate-900 text-white font-bold rounded-md">
                      CRITICAL EVACUATION PROTOCOL
                    </span>
                  </div>

                  {/* Sub-steps */}
                  <div className="space-y-3">
                    {emergencyIncident.trueBranchSteps.map(step => (
                      <div
                        key={step.id}
                        id={`substep-${step.code}`}
                        className="p-3.5 rounded-lg border bg-white border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            step.completed ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {step.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Flame className="w-3.5 h-3.5 text-red-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-900">{step.title}</h5>
                              {step.completed ? (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                                  ✓ Completed ({step.completedAt}) by {step.completedBy}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                                  Target: {step.targetTime}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
                            
                            {/* Headcount tracker info */}
                            {step.code === 'HEADCOUNT' && (
                              <div className="mt-2 flex items-center gap-3 text-xs">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-medium">
                                  Assembly Area: <strong>Station 3 (North Yard)</strong>
                                </span>
                                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded font-bold">
                                  Headcount: {emergencyIncident.headcountAccounted || (step.completed ? 18 : 0)} / {emergencyIncident.headcountTotal || 18} (100% Accounted)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {!step.completed && (
                          <button
                            id={`btn-complete-${step.code}`}
                            onClick={() => completeWorkflowSubStep(step.code, 'Marcus Vance (Shift Lead)')}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors whitespace-nowrap self-end sm:self-center"
                          >
                            Execute Action
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resolution when all sub-steps complete */}
                  {emergencyIncident.trueBranchSteps.every(s => s.completed) && emergencyIncident.status !== 'All Clear' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-lg">
                      <h5 className="text-xs font-bold text-slate-900 mb-2">Final Incident Closure & All-Clear</h5>
                      <textarea
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        rows={2}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg mb-3"
                        placeholder="Enter clearance notes and post-suppression air quality status..."
                      />
                      <button
                        id="btn-resolve-true-incident"
                        onClick={() => resolveEmergencyIncident(resolutionNotes)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 text-teal-400" />
                        <span>Declare All-Clear & Restore System</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* False Alarm Response Protocol */}
              {emergencyIncident.verificationOutcome === 'false' && (
                <div id="branch-3b-container" className="p-5 rounded-xl bg-slate-50 border border-slate-300 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded bg-teal-900 text-white">
                        <ShieldCheck className="w-5 h-5 text-teal-300" />
                      </span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">False Alarm Stand-Down Protocol</h4>
                        <p className="text-xs text-slate-600">Follow operational response: Inform SCDF → Announcement → Follow-up with RCA</p>
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-teal-900 text-white font-bold rounded-md">
                      STAND-DOWN & RCA PROTOCOL
                    </span>
                  </div>

                  {/* Sub-steps */}
                  <div className="space-y-3">
                    {emergencyIncident.falseBranchSteps.map(step => (
                      <div
                        key={step.id}
                        id={`substep-${step.code}`}
                        className="p-3.5 rounded-lg border bg-white border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            step.completed ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {step.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-bold text-slate-900">{step.title}</h5>
                              {step.completed ? (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                                  ✓ Completed ({step.completedAt}) by {step.completedBy}
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                                  Target: {step.targetTime}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>

                            {/* Extra details for SCDF Call or RCA Ticket */}
                            {step.code === 'SCDF-NOTIFY' && step.completed && (
                              <div className="mt-1.5 text-[11px] text-slate-700 flex items-center gap-1.5">
                                <PhoneCall className="w-3.5 h-3.5 text-teal-700" />
                                <span>SCDF Ops Call Logged: Dispatch Ref #SCDF-ST-994. Turnout cancelled.</span>
                              </div>
                            )}

                            {step.code === 'RCA-FOLLOWUP' && (
                              <div className="mt-2 flex items-center gap-2">
                                {emergencyIncident.rcaTicketId ? (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold">
                                    <Wrench className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Linked CMMS Ticket: {emergencyIncident.rcaTicketId}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    Executing this step will automatically generate a formal RCA investigation work order in CMMS.
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {!step.completed && (
                          <button
                            id={`btn-complete-${step.code}`}
                            onClick={() => completeWorkflowSubStep(step.code, 'Marcus Vance (Shift Lead)')}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors whitespace-nowrap self-end sm:self-center"
                          >
                            Execute Action
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resolution when all sub-steps complete */}
                  {emergencyIncident.falseBranchSteps.every(s => s.completed) && emergencyIncident.status !== 'All Clear' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-lg">
                      <h5 className="text-xs font-bold text-slate-900 mb-2">Final Stand-Down & System Restoration</h5>
                      <p className="text-xs text-slate-600 mb-3">
                        All stand-down actions (SCDF notification, all-clear PA, RCA work order) completed. Click below to close the incident and restore nominal monitoring.
                      </p>
                      <button
                        id="btn-resolve-false-incident"
                        onClick={() => resolveEmergencyIncident('False alarm stand-down verified. Optical particulate transient confirmed. RCA Ticket created.')}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4 text-teal-400" />
                        <span>Close Stand-Down & Restore Standby</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lower Grid: Audit Log & Automated Interlocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Response Audit Log */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Chronological Response Sequence & Audit Trail</span>
                </h3>
                <span className="text-xs font-mono text-slate-500">{emergencyIncident.responseLog?.length || 0} Events Logged</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {emergencyIncident.responseLog?.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start gap-3 text-xs">
                    <span className="font-mono text-slate-500 font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 flex-shrink-0">
                      T+{log.timeOffsetSec}s
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.stage}</span>
                        <span className="text-slate-400 text-[11px]">{log.timestamp} • {log.actor}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{log.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Life Safety Interlocks & Impacted Zones */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-red-600" />
                  <span>Automated Safety Interlocks</span>
                </h3>
                <ul className="space-y-2 text-xs">
                  {emergencyIncident.automatedInterlocksEngaged?.map((interlock, idx) => (
                    <li key={idx} className="p-2 bg-red-50 text-red-800 rounded border border-red-200/60 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      <span>{interlock}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-600" />
                  <span>Impacted Facility Zones</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {emergencyIncident.impactedZones?.map((zone, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
