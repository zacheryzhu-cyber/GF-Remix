import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileCheck,
  FileText,
  Filter,
  Flame,
  HardHat,
  Lock,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wind,
  Wrench,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useFacility } from '../context/FacilityContext';
import { exportToCsv, triggerPrintReport } from '../utils/exportUtils';
import { WorkPermitStatus, WorkPermitType } from '../types';
import {
  SHIFT_REPORT_PRESETS,
  ShiftReportEntry,
  ShiftCriticalAlarm,
} from '../data/shiftReportsData';

export const ReportsView: React.FC = () => {
  const { showToast } = useFacility();

  // ---------------------------------------------------------------------------
  // 0. SHIFT SELECTOR STATE (TODAY - 7 DAYS, 2 SHIFTS/DAY = 16 SHIFTS)
  // ---------------------------------------------------------------------------
  // We keep a local dictionary of all 16 shifts so user edits/saves persist during session
  const [reportsMap, setReportsMap] = useState<Record<string, ShiftReportEntry>>(() => {
    const map: Record<string, ShiftReportEntry> = {};
    SHIFT_REPORT_PRESETS.forEach(item => {
      map[item.id] = { ...item };
    });
    return map;
  });

  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    SHIFT_REPORT_PRESETS[0]?.id || '2026-09-02_Day'
  );

  const currentShift: ShiftReportEntry = useMemo(() => {
    return reportsMap[selectedShiftId] || SHIFT_REPORT_PRESETS[0];
  }, [reportsMap, selectedShiftId]);

  const isSignedOff = currentShift.approvalStatus === 'Signed-Off by Ops Manager';

  const handleSelectShift = (shiftId: string) => {
    setSelectedShiftId(shiftId);
    setIsEditingSummary(false);
    showToast(`Switched to report: ${reportsMap[shiftId]?.label || shiftId}`);
  };

  const handleUpdateLeadEngineer = (val: string) => {
    if (isSignedOff) return;
    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        leadEngineer: val,
      },
    }));
  };

  const handleUpdateIncomingLead = (val: string) => {
    if (isSignedOff) return;
    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        incomingLead: val,
      },
    }));
  };

  const [isConfirmSignOffOpen, setIsConfirmSignOffOpen] = useState<boolean>(false);

  // Sign-off handler for active shift
  const handleSignOff = (role: 'Lead' | 'OpsManager') => {
    const newStatus =
      role === 'Lead' ? 'Approved by Lead' : 'Signed-Off by Ops Manager';

    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        approvalStatus: newStatus,
      },
    }));

    if (newStatus === 'Signed-Off by Ops Manager') {
      setIsEditingSummary(false);
      setIsAlarmModalOpen(false);
      setIsConfirmSignOffOpen(false);
    }

    showToast(
      role === 'Lead'
        ? 'Shift Report approved by Shift Lead'
        : 'Shift Report signed off and sent by Operations Manager • Report Locked'
    );
  };

  // ---------------------------------------------------------------------------
  // 1. SECTION 1: EDITABLE EXECUTIVE SUMMARY STATE
  // ---------------------------------------------------------------------------
  const [isEditingSummary, setIsEditingSummary] = useState<boolean>(false);
  const [summaryDraft, setSummaryDraft] = useState<string>(currentShift.executiveSummary);
  const [isSummarySaved, setIsSummarySaved] = useState<boolean>(false);

  // Sync draft when selected shift changes
  React.useEffect(() => {
    setSummaryDraft(currentShift.executiveSummary);
    setIsEditingSummary(false);
  }, [selectedShiftId, currentShift.executiveSummary]);

  const handleSaveSummary = () => {
    if (isSignedOff) return;
    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        executiveSummary: summaryDraft,
      },
    }));
    setIsEditingSummary(false);
    setIsSummarySaved(true);
    showToast('Shift Executive Summary updated and saved');
    setTimeout(() => setIsSummarySaved(false), 2500);
  };

  const handleCancelSummaryEdit = () => {
    setSummaryDraft(currentShift.executiveSummary);
    setIsEditingSummary(false);
  };

  // ---------------------------------------------------------------------------
  // 2. SECTION 2: CRITICAL ALARMS STATE (MAXIMUM 1 CRITICAL ALARM ONLY)
  // ---------------------------------------------------------------------------
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState<boolean>(false);
  const [modalAlarmTime, setModalAlarmTime] = useState<string>('14:30');
  const [modalAlarmTitle, setModalAlarmTitle] = useState<string>('');
  const [modalAlarmSystem, setModalAlarmSystem] = useState<string>('Ultra Pure Water (UPW)');
  const [modalAlarmDesc, setModalAlarmDesc] = useState<string>('');
  const [modalAlarmAction, setModalAlarmAction] = useState<string>('');
  const [modalAlarmLead, setModalAlarmLead] = useState<string>('Marcus Vance');
  const [modalAlarmStatus, setModalAlarmStatus] = useState<'Resolved' | 'Contained' | 'In Progress'>('Resolved');

  const openAlarmModal = () => {
    if (isSignedOff) return;
    if (currentShift.criticalAlarm) {
      setModalAlarmTime(currentShift.criticalAlarm.time);
      setModalAlarmTitle(currentShift.criticalAlarm.title);
      setModalAlarmSystem(currentShift.criticalAlarm.system);
      setModalAlarmDesc(currentShift.criticalAlarm.description);
      setModalAlarmAction(currentShift.criticalAlarm.containmentAction);
      setModalAlarmLead(currentShift.criticalAlarm.responsibleLead);
      setModalAlarmStatus(currentShift.criticalAlarm.status);
    } else {
      setModalAlarmTime('14:30');
      setModalAlarmTitle('');
      setModalAlarmSystem('Specialty Gases (TGM)');
      setModalAlarmDesc('');
      setModalAlarmAction('');
      setModalAlarmLead(currentShift.leadEngineer);
      setModalAlarmStatus('Resolved');
    }
    setIsAlarmModalOpen(true);
  };

  const handleSaveAlarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignedOff) return;
    if (!modalAlarmTitle.trim() || !modalAlarmDesc.trim()) return;

    const savedAlarm: ShiftCriticalAlarm = {
      id: currentShift.criticalAlarm?.id || `ALM-CRIT-${Date.now().toString().slice(-4)}`,
      time: modalAlarmTime,
      title: modalAlarmTitle.trim(),
      system: modalAlarmSystem,
      severity: 'Critical',
      description: modalAlarmDesc.trim(),
      containmentAction:
        modalAlarmAction.trim() || 'Excursion contained and verified within operational safety envelope.',
      responsibleLead: modalAlarmLead.trim() || currentShift.leadEngineer,
      status: modalAlarmStatus,
    };

    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        criticalAlarm: savedAlarm, // Strictly maximum 1 critical alarm
      },
    }));

    setIsAlarmModalOpen(false);
    showToast('Critical Alarm logged for this shift (Max 1)');
  };

  const handleClearAlarm = () => {
    if (isSignedOff) return;
    setReportsMap(prev => ({
      ...prev,
      [selectedShiftId]: {
        ...prev[selectedShiftId],
        criticalAlarm: null,
      },
    }));
    setIsAlarmModalOpen(false);
    showToast('Critical Alarm cleared (0 critical alarms recorded)');
  };

  // ---------------------------------------------------------------------------
  // 3. SECTION 3: CPK 2x 6-HOURLY SHIFT REPORT DATA
  // ---------------------------------------------------------------------------
  const sixHourCpkData = currentShift.cpkData;

  const cpkChartData = useMemo(() => {
    return sixHourCpkData.map(item => ({
      name: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
      fullName: item.name,
      period1Cpk: item.period1.cpk,
      period2Cpk: item.period2.cpk,
      shiftCombinedCpk: item.shiftCombined.cpk,
      benchmark: 1.33,
    }));
  }, [sixHourCpkData]);

  const period1Label =
    currentShift.shiftCode === 'Day'
      ? 'Period 1 (07:00 – 13:00)'
      : 'Period 1 (19:00 – 01:00)';
  const period2Label =
    currentShift.shiftCode === 'Day'
      ? 'Period 2 (13:00 – 19:00)'
      : 'Period 2 (01:00 – 07:00)';

  // ---------------------------------------------------------------------------
  // 4. SECTION 4: WORK PERMITS STATUS STATE (NO SAFETY OFFICER & NO LOTO)
  // ---------------------------------------------------------------------------
  const [permitStatusFilter, setPermitStatusFilter] = useState<WorkPermitStatus | 'ALL'>('ALL');
  const [permitTypeFilter, setPermitTypeFilter] = useState<WorkPermitType | 'ALL'>('ALL');
  const [permitSearchQuery, setPermitSearchQuery] = useState<string>('');

  const shiftPermits = currentShift.workPermits;

  // Permit Counts
  const totalPermitsCount = shiftPermits.length;
  const openPermitsCount = shiftPermits.filter(p => p.status === 'open').length;
  const pendingPermitsCount = shiftPermits.filter(p => p.status === 'pending approval').length;
  const closedPermitsCount = shiftPermits.filter(p => p.status === 'closed').length;
  const rejectedPermitsCount = shiftPermits.filter(p => p.status === 'rejected').length;

  const hotWorkCount = shiftPermits.filter(p => p.permitType === 'Hot Work').length;
  const coldWorkCount = shiftPermits.filter(p => p.permitType === 'Cold Work').length;
  const heightsCount = shiftPermits.filter(p => p.permitType === 'Working at Heights').length;
  const confinedSpaceCount = shiftPermits.filter(p => p.permitType === 'Confined Space Entry').length;

  const filteredPermits = shiftPermits.filter(permit => {
    if (permitStatusFilter !== 'ALL' && permit.status !== permitStatusFilter) {
      return false;
    }
    if (permitTypeFilter !== 'ALL' && permit.permitType !== permitTypeFilter) {
      return false;
    }
    if (permitSearchQuery.trim()) {
      const q = permitSearchQuery.toLowerCase();
      const match =
        permit.id.toLowerCase().includes(q) ||
        permit.title.toLowerCase().includes(q) ||
        permit.location.toLowerCase().includes(q) ||
        (permit.workOrderId && permit.workOrderId.toLowerCase().includes(q)) ||
        permit.permitType.toLowerCase().includes(q) ||
        permit.status.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getPermitTypeIcon = (type: WorkPermitType) => {
    switch (type) {
      case 'Cold Work':
        return <Wind className="w-3.5 h-3.5 text-slate-600" />;
      case 'Hot Work':
        return <Flame className="w-3.5 h-3.5 text-amber-700" />;
      case 'Working at Heights':
        return <HardHat className="w-3.5 h-3.5 text-slate-700" />;
      case 'Confined Space Entry':
        return <Lock className="w-3.5 h-3.5 text-slate-700" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const getPermitTypeBadge = (type: WorkPermitType) => {
    switch (type) {
      case 'Hot Work':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Cold Work':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Working at Heights':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'Confined Space Entry':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPermitStatusBadge = (status: WorkPermitStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            Open
          </span>
        );
      case 'pending approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Pending
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Check className="w-3.5 h-3.5 text-slate-500" />
            Closed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-700" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT HANDLER
  // ---------------------------------------------------------------------------
  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'print') {
      triggerPrintReport();
      return;
    }

    const filename = `FabCore_Shift_Report_${currentShift.id}`;

    const rows = [
      { Section: 'Header', Item: 'Shift Report ID', Value: currentShift.id },
      { Section: 'Header', Item: 'Date', Value: currentShift.formattedDate },
      { Section: 'Header', Item: 'Shift Window', Value: currentShift.shiftType },
      { Section: 'Header', Item: 'Lead Engineer', Value: currentShift.leadEngineer },
      { Section: 'Header', Item: 'Incoming Lead', Value: currentShift.incomingLead },
      { Section: 'Header', Item: 'Approval Status', Value: currentShift.approvalStatus },
      { Section: 'Section 1', Item: 'Executive Summary', Value: currentShift.executiveSummary },
      {
        Section: 'Section 2 (Critical Alarms)',
        Item: 'Critical Alarm Status',
        Value: currentShift.criticalAlarm
          ? `[CRITICAL] ${currentShift.criticalAlarm.time} - ${currentShift.criticalAlarm.title}: ${currentShift.criticalAlarm.description} | Action: ${currentShift.criticalAlarm.containmentAction} (Owner: ${currentShift.criticalAlarm.responsibleLead}, Status: ${currentShift.criticalAlarm.status})`
          : 'Zero Critical Alarms Recorded (100% nominal operation)',
      },
      ...sixHourCpkData.map(cpk => ({
        Section: 'Section 3 (6-Hourly CPk)',
        Item: cpk.name,
        Value: `${period1Label}: Cpk ${cpk.period1.cpk} | ${period2Label}: Cpk ${cpk.period2.cpk} | 12hr Combined: Cpk ${cpk.shiftCombined.cpk} (${cpk.shiftCombined.status})`,
      })),
      {
        Section: 'Section 4 (Work Permits Summary)',
        Item: 'Status Counts',
        Value: `Total: ${totalPermitsCount} | Closed: ${closedPermitsCount} | Rejected: ${rejectedPermitsCount} | Open: ${openPermitsCount}`,
      },
      ...shiftPermits.map(p => ({
        Section: 'Section 4 (Work Permits List)',
        Item: `${p.id} - ${p.permitType}`,
        Value: `[${(p.status || 'OPEN').toUpperCase()}] ${p.title} | Location: ${p.location} | Window: ${p.validFrom} → ${p.validTo} | Notes: ${p.notes || p.rejectionReason || 'Completed'}`,
      })),
    ];
    exportToCsv(filename, rows);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* =======================================================================
          TOP BAR: SHIFT SELECTOR DROPDOWN (TODAY - 7 DAYS, 2 SHIFTS/DAY) & CONTROLS
         ======================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-lg bg-slate-100 text-teal-800">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    Shift Handover Report
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-md text-xs sm:text-sm font-bold ${
                      currentShift.approvalStatus === 'Signed-Off by Ops Manager'
                        ? 'bg-teal-50 text-teal-800 border border-teal-300'
                        : currentShift.approvalStatus === 'Approved by Lead'
                        ? 'bg-slate-100 text-slate-800 border border-slate-300'
                        : 'bg-amber-50 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {currentShift.approvalStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Shift Report Dropdown Selector */}
            <div className="flex items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg px-3.5 py-2 transition">
                <Calendar className="w-4 h-4 text-slate-700 shrink-0" />
                <label htmlFor="shift-report-select" className="text-sm font-bold text-slate-700 whitespace-nowrap">
                  Select Shift Report:
                </label>
                <select
                  id="shift-report-select"
                  value={selectedShiftId}
                  onChange={e => handleSelectShift(e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-900 focus:outline-none cursor-pointer pr-2"
                >
                  {SHIFT_REPORT_PRESETS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Controls: Sign-Off & Global Export */}
          <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-end">
            {currentShift.approvalStatus === 'Pending Review' && (
              <button
                onClick={() => handleSignOff('Lead')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-xs"
                title="Shift Lead verifies all sections and approves handover"
              >
                <UserCheck className="w-4.5 h-4.5 text-teal-300" />
                <span>Shift Lead Sign-Off</span>
              </button>
            )}

            {currentShift.approvalStatus === 'Approved by Lead' && (
              <button
                onClick={() => setIsConfirmSignOffOpen(true)}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-xs"
                title="Operations Manager final authorization and send"
              >
                <Award className="w-4.5 h-4.5 text-teal-300" />
                <span>Sign Off & Send</span>
              </button>
            )}

            {isSignedOff && (
              <span className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Report Transmitted &amp; Locked</span>
              </span>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={() => handleExport('csv')}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              title="Export shift report to CSV"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('print')}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
              title="Print clean handover document"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Shift Leaders Ingestion Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-slate-200">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                Current Shift Leader
              </label>
              {isSignedOff && (
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Locked
                </span>
              )}
            </div>
            <input
              type="text"
              disabled={isSignedOff}
              value={currentShift.leadEngineer}
              onChange={e => handleUpdateLeadEngineer(e.target.value)}
              placeholder="e.g. Marcus Vance"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 transition focus:outline-none ${
                isSignedOff
                  ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'border-slate-300 focus:ring-1 focus:ring-teal-700 focus:border-teal-700'
              }`}
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-700" />
                Incoming Shift Leader
              </label>
              {isSignedOff && (
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Locked
                </span>
              )}
            </div>
            <input
              type="text"
              disabled={isSignedOff}
              value={currentShift.incomingLead}
              onChange={e => handleUpdateIncomingLead(e.target.value)}
              placeholder="e.g. Sarah Lin"
              className={`w-full bg-white border rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 transition focus:outline-none ${
                isSignedOff
                  ? 'bg-slate-100/90 text-slate-600 border-slate-200 cursor-not-allowed'
                  : 'border-slate-300 focus:ring-1 focus:ring-teal-700 focus:border-teal-700'
              }`}
            />
          </div>
        </div>
      </div>

      {/* =======================================================================
          SECTION 1: SUMMARY
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 text-teal-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  1. Executive Handover Summary
                </h3>
                {isSummarySaved && (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5 text-teal-600" /> Saved
                  </span>
                )}
                {isEditingSummary && (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                    Editing
                  </span>
                )}
                {isSignedOff && (
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Locked
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSignedOff ? (
              <span className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Locked
              </span>
            ) : isEditingSummary ? (
              <>
                <button
                  onClick={handleCancelSummaryEdit}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSaveSummary}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4 text-teal-300" /> Save Summary
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditingSummary(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 border border-slate-200"
              >
                <Edit3 className="w-4 h-4 text-slate-600" /> Edit Summary
              </button>
            )}
          </div>
        </div>

        {/* Editable Text Area or Display View */}
        {isEditingSummary && !isSignedOff ? (
          <div className="space-y-2.5">
            <textarea
              rows={4}
              value={summaryDraft}
              onChange={e => setSummaryDraft(e.target.value)}
              placeholder="Type executive shift handover summary here..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-4 text-sm sm:text-base text-slate-900 leading-relaxed font-medium focus:outline-none focus:ring-1 focus:ring-slate-500 focus:bg-white transition"
            />
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                {summaryDraft.length} characters • {summaryDraft.trim().split(/\s+/).filter(Boolean).length} words
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setSummaryDraft(
                      'Facilities operations maintained continuous cleanroom specifications across all Fab 1 Bays. UPW product water resistivity averaged 18.21 MΩ·cm, and cleanroom particulate levels complied with ISO Class 1-4 boundaries. All critical utilities operated with zero uncontained excursions.'
                    )
                  }
                  className="text-xs sm:text-sm text-slate-500 hover:text-slate-800 underline"
                >
                  Reset Template
                </button>
                <button
                  onClick={handleSaveSummary}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              if (!isSignedOff) setIsEditingSummary(true);
            }}
            className={`group relative text-sm sm:text-base text-slate-800 p-5 rounded-lg border leading-relaxed font-medium transition ${
              isSignedOff
                ? 'bg-slate-50/90 border-slate-200 cursor-default'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 hover:border-slate-300 cursor-pointer'
            }`}
            title={isSignedOff ? 'Report signed off and locked' : 'Click to edit summary'}
          >
            <p className="whitespace-pre-line">{currentShift.executiveSummary}</p>
            {!isSignedOff && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-xs text-slate-700 font-semibold flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                <Edit3 className="w-3.5 h-3.5" /> Click to Edit
              </div>
            )}
          </div>
        )}
      </section>

      {/* =======================================================================
          SECTION 2: CRITICAL ALARM (P1)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800">
              <ShieldAlert className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  2. Critical Alarm (P1)
                </h3>
                <span
                  className={`px-3 py-1 rounded-md text-xs font-bold ${
                    currentShift.criticalAlarm
                      ? 'bg-slate-100 text-red-900 border border-red-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {currentShift.criticalAlarm ? '1 Critical Alarm' : '0 Critical Alarms'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSignedOff ? (
              <span className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-sm font-semibold flex items-center gap-1.5 cursor-not-allowed">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Locked
              </span>
            ) : (
              <button
                onClick={openAlarmModal}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-sm font-semibold transition flex items-center gap-1.5 border border-slate-200"
              >
                {currentShift.criticalAlarm ? (
                  <>
                    <Edit3 className="w-4 h-4 text-slate-600" />
                    <span>Edit Alarm</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-slate-600" />
                    <span>Log Critical Alarm</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Render Single Critical Alarm Card or Nominal Empty State */}
        {currentShift.criticalAlarm ? (
          <div className="bg-slate-50 border border-red-200/80 rounded-xl p-5 transition text-sm space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-red-900 bg-red-100/70 border border-red-200 px-2.5 py-0.5 rounded-md text-xs sm:text-sm">
                    {currentShift.criticalAlarm.time}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white shadow-2xs">
                    Critical
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-slate-700 border border-slate-200">
                    {currentShift.criticalAlarm.system}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                      currentShift.criticalAlarm.status === 'Resolved'
                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                        : 'bg-slate-100 text-slate-800 border border-slate-300'
                    }`}
                  >
                    {currentShift.criticalAlarm.status}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base sm:text-lg mt-1">
                  {currentShift.criticalAlarm.title}
                </h4>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs sm:text-sm text-slate-600 block">
                  Owner: <strong className="text-slate-900">{currentShift.criticalAlarm.responsibleLead}</strong>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ID: {currentShift.criticalAlarm.id}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 text-slate-800 space-y-1.5">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider block">
                Excursion / Root Cause:
              </span>
              <p className="text-slate-700 text-sm leading-relaxed font-sans">
                {currentShift.criticalAlarm.description}
              </p>
            </div>

            {currentShift.criticalAlarm.containmentAction && (
              <div className="bg-slate-100 border border-slate-300 rounded-lg p-3.5 text-sm text-slate-800 space-y-1.5">
                <span className="font-bold text-teal-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" /> Containment & Action Taken:
                </span>
                <p className="text-slate-800 text-sm leading-relaxed">
                  {currentShift.criticalAlarm.containmentAction}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2.5">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300">
              <ShieldCheck className="w-6 h-6 text-teal-800" />
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900">Zero Critical Alarms Recorded</h4>
          </div>
        )}
      </section>

      {/* =======================================================================
          SECTION 3: PROCESS CAPABILITY (CPK) REPORT (2x 6-HOURLY BREAKDOWN)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 text-teal-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  3. Process Capability (cPk/pPk) Report
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* 6-Hourly CPK Comparison Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-bold">Parameter / System</th>
                <th className="py-3 px-3.5 font-semibold text-center">Spec Window (LSL / USL)</th>
                <th className="py-3 px-3.5 font-bold bg-slate-200/60 text-slate-900 border-l border-r border-slate-300 text-center">
                  {period1Label}
                </th>
                <th className="py-3 px-3.5 font-bold bg-slate-200/60 text-slate-900 border-r border-slate-300 text-center">
                  {period2Label}
                </th>
                <th className="py-3 px-4 font-bold text-center">12-Hour Combined Cpk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sixHourCpkData.map(item => {
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* Name & System */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm sm:text-base">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.system}</div>
                    </td>

                    {/* Target & Specs */}
                    <td className="py-3.5 px-3.5 text-center font-mono text-xs sm:text-sm text-slate-600">
                      <div>
                        Target: <strong className="text-slate-900">{item.target} {item.unit}</strong>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        [{item.lsl} – {item.usl} {item.unit}]
                      </div>
                    </td>

                    {/* Period 1 */}
                    <td className="py-3.5 px-3.5 bg-slate-50 border-l border-r border-slate-200 text-center">
                      <div className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                        Cpk:{' '}
                        <span
                          className={
                            item.period1.cpk >= 1.33
                              ? 'text-teal-900'
                              : 'text-red-600 font-extrabold bg-red-100/90 border border-red-300 px-2 py-0.5 rounded shadow-2xs'
                          }
                        >
                          {item.period1.cpk.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Period 2 */}
                    <td className="py-3.5 px-3.5 bg-slate-50 border-r border-slate-200 text-center">
                      <div className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                        Cpk:{' '}
                        <span
                          className={
                            item.period2.cpk >= 1.33
                              ? 'text-teal-900'
                              : 'text-red-600 font-extrabold bg-red-100/90 border border-red-300 px-2 py-0.5 rounded shadow-2xs'
                          }
                        >
                          {item.period2.cpk.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* 12-Hour Combined Shift Cpk */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-mono font-bold text-slate-900 text-sm sm:text-base flex items-center justify-center">
                        <span
                          className={
                            item.shiftCombined.cpk >= 1.33
                              ? 'text-teal-900'
                              : 'text-red-600 font-extrabold bg-red-100/90 border border-red-300 px-2.5 py-0.5 rounded shadow-2xs'
                          }
                        >
                          {item.shiftCombined.cpk.toFixed(2)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual Cpk Comparison Chart */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-bold text-slate-800">
              6-Hourly Process Capability Comparison ({period1Label.split(' ')[0]} vs {period2Label.split(' ')[0]} vs Benchmark 1.33)
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cpkChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis domain={[0, 3.0]} ticks={[0, 0.5, 1.0, 1.33, 2.0, 2.5]} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} />
                <Tooltip
                  formatter={(val: number) => [val.toFixed(2), 'Cpk']}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#FFF', borderRadius: '8px', fontSize: '13px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <ReferenceLine
                  y={1.33}
                  stroke="#991B1B"
                  strokeDasharray="4 4"
                  label={{ value: 'Target Cpk ≥ 1.33', position: 'insideTopRight', fill: '#991B1B', fontSize: 11 }}
                />
                <Bar dataKey="period1Cpk" name={period1Label} fill="#00646E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="period2Cpk" name={period2Label} fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* =======================================================================
          SECTION 4: WORK PERMITS STATUS (NO SAFETY OFFICER & NO LOTO)
         ======================================================================= */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 text-teal-800">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-slate-900">
                  4. Work Permit Status
                </h3>
                <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                  {totalPermitsCount} Shift Permits
                </span>
              </div>
            </div>
          </div>

          {/* Filter Status Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPermitStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                permitStatusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({totalPermitsCount})
            </button>
            <button
              onClick={() => setPermitStatusFilter('closed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                permitStatusFilter === 'closed'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Closed ({closedPermitsCount})
            </button>
            <button
              onClick={() => setPermitStatusFilter('rejected')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                permitStatusFilter === 'rejected'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rejected ({rejectedPermitsCount})
            </button>
            {openPermitsCount > 0 && (
              <button
                onClick={() => setPermitStatusFilter('open')}
                className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  permitStatusFilter === 'open'
                    ? 'bg-teal-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Open ({openPermitsCount})
              </button>
            )}
          </div>
        </div>

        {/* Work Permits Overview KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-semibold">Closed & Verified</span>
            <span className="text-xl font-bold text-slate-900 font-mono mt-0.5 block">{closedPermitsCount} Closed</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-semibold">Rejected / Rescheduled</span>
            <span className="text-xl font-bold text-slate-700 font-mono mt-0.5 block">{rejectedPermitsCount} Rejected</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-semibold">Active at Handover</span>
            <span className="text-xl font-bold text-teal-800 font-mono mt-0.5 block">{openPermitsCount} Open</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-xs uppercase font-semibold">Hazard Class Breakdown</span>
            <div className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-1 space-x-1.5">
              <span className="text-amber-800">{hotWorkCount} Hot</span> • <span className="text-slate-700">{coldWorkCount} Cold</span> • <span className="text-slate-700">{heightsCount} Height</span> • <span className="text-slate-700">{confinedSpaceCount} Conf</span>
            </div>
            <span className="text-xs text-slate-500 block mt-0.5">Total: {totalPermitsCount} Shift Permits</span>
          </div>
        </div>

        {/* Filter by Permit Type & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search permit ID, title, location, or type..."
              value={permitSearchQuery}
              onChange={e => setPermitSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <select
              value={permitTypeFilter}
              onChange={e => setPermitTypeFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="ALL">All Permit Types</option>
              <option value="Hot Work">Hot Work</option>
              <option value="Cold Work">Cold Work</option>
              <option value="Working at Heights">Working at Heights</option>
              <option value="Confined Space Entry">Confined Space Entry</option>
            </select>
          </div>
        </div>

        {/* Work Permits Table - CLEANED UP (NO SAFETY OFFICER, NO LOTO, NO WO, NO SHIFT WINDOW) */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider text-xs font-bold">
              <tr>
                <th className="py-3 px-3.5 font-bold">Permit ID</th>
                <th className="py-3 px-4 font-bold">Title / Task Description</th>
                <th className="py-3 px-3.5 font-semibold">Permit Type</th>
                <th className="py-3 px-3.5 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold">Execution & Closeout Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPermits.map(permit => {
                return (
                  <tr key={permit.id} className="hover:bg-slate-50 transition">
                    {/* Permit ID */}
                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {permit.id}
                      </div>
                    </td>

                    {/* Title & Location */}
                    <td className="py-3 px-4 align-top max-w-sm">
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {permit.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span>📍</span>
                        <span className="truncate">{permit.location}</span>
                      </div>
                    </td>

                    {/* Permit Type */}
                    <td className="py-3 px-3.5 align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${getPermitTypeBadge(
                          permit.permitType
                        )}`}
                      >
                        {getPermitTypeIcon(permit.permitType)}
                        <span>{permit.permitType}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3.5 align-top text-center whitespace-nowrap">
                      {getPermitStatusBadge(permit.status)}
                    </td>

                    {/* Execution & Closeout Notes */}
                    <td className="py-3 px-4 align-top text-slate-700 text-xs sm:text-sm">
                      {permit.notes ? (
                        <p className="leading-relaxed text-slate-800 font-normal">{permit.notes}</p>
                      ) : permit.rejectionReason ? (
                        <p className="leading-relaxed text-slate-800 font-normal">
                          Rejected: {permit.rejectionReason}
                        </p>
                      ) : permit.closedAt ? (
                        <span className="text-slate-600">
                          Closed at <strong className="font-mono text-slate-800">{permit.closedAt}</strong> • Verified by shift engineer
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard shift closeout logged</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredPermits.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    No work permits match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =======================================================================
          MODAL: LOG / EDIT CRITICAL ALARM (MAX 1)
         ======================================================================= */}
      {isAlarmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-slate-700" />
                {currentShift.criticalAlarm ? 'Edit Shift Critical Alarm' : 'Log Shift Critical Alarm'}
              </h3>
              <button
                onClick={() => setIsAlarmModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAlarmSubmit} className="space-y-3.5 text-sm">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs sm:text-sm text-slate-800 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Shift report protocol displays a maximum of 1 critical alarm per 12-hour shift.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Time (HH:MM)</label>
                  <input
                    type="text"
                    required
                    value={modalAlarmTime}
                    onChange={e => setModalAlarmTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                    placeholder="14:22"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Containment Status</label>
                  <select
                    value={modalAlarmStatus}
                    onChange={e => setModalAlarmStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Contained">Contained</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">System Category</label>
                <select
                  value={modalAlarmSystem}
                  onChange={e => setModalAlarmSystem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="Ultra Pure Water (UPW)">Ultra Pure Water (UPW)</option>
                  <option value="Cleanroom HVAC & FFU">Cleanroom HVAC & FFU</option>
                  <option value="Specialty Gases (TGM)">Specialty Gases (TGM)</option>
                  <option value="Chemical Delivery (TCM)">Chemical Delivery (TCM)</option>
                  <option value="Thermal & Chiller Plant">Thermal & Chiller Plant</option>
                  <option value="Clean Dry Air (CDA) & N2">Clean Dry Air (CDA) & N2</option>
                  <option value="Scrubber & Exhaust">Scrubber & Exhaust</option>
                  <option value="Electrical & N+1 UPS">Electrical & N+1 UPS</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Alarm Title</label>
                <input
                  type="text"
                  required
                  value={modalAlarmTitle}
                  onChange={e => setModalAlarmTitle(e.target.value)}
                  placeholder="e.g. Subfab Silane TGDS Sensor Pre-Warning Check"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Excursion / Root Cause Details</label>
                <textarea
                  rows={2}
                  required
                  value={modalAlarmDesc}
                  onChange={e => setModalAlarmDesc(e.target.value)}
                  placeholder="Details of the critical SCADA excursion or alarm trip..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Containment & Action Taken</label>
                <textarea
                  rows={2}
                  value={modalAlarmAction}
                  onChange={e => setModalAlarmAction(e.target.value)}
                  placeholder="Actions taken to isolate, purge, failover, or verify safety..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1 text-xs sm:text-sm">Responsible Lead / System Owner</label>
                <input
                  type="text"
                  value={modalAlarmLead}
                  onChange={e => setModalAlarmLead(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {currentShift.criticalAlarm ? (
                  <button
                    type="button"
                    onClick={handleClearAlarm}
                    className="px-3 py-1.5 text-slate-500 hover:text-red-700 text-xs sm:text-sm font-semibold"
                  >
                    Clear Alarm (Set to 0)
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAlarmModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-sm shadow-xs"
                  >
                    Save Critical Alarm
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Sign Off & Send */}
      {isConfirmSignOffOpen && !isSignedOff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-teal-950 text-teal-300 rounded-lg border border-teal-800">
                  <Award className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Confirm Sign-Off &amp; Send</h3>
                  <p className="text-xs text-slate-400">Final Shift Handover Authorization</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmSignOffOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Are you sure you want to sign off and transmit the shift report for{' '}
                <strong className="text-slate-900">{currentShift.label}</strong>?
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Shift Code:</span>
                  <span className="font-mono font-bold text-slate-800">{currentShift.shiftCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Current Shift Leader:</span>
                  <span className="font-semibold text-slate-800">{currentShift.leadEngineer || 'Unspecified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Incoming Shift Leader:</span>
                  <span className="font-semibold text-slate-800">{currentShift.incomingLead || 'Unspecified'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Critical Alarms (P1):</span>
                  <span className="font-bold text-slate-800">
                    {currentShift.criticalAlarm ? '1 Logged' : '0 Clean'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
                <Lock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <span>
                  Once signed off, this report will be <strong>permanently locked</strong> and all input fields, executive summaries, and alarm logs will no longer be editable.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmSignOffOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSignOff('OpsManager')}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-sm shadow-xs flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-teal-300" />
                <span>Confirm Sign-Off &amp; Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
