import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  History,
  Layers,
  ListFilter,
  ListPlus,
  Lock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Wind,
  Wrench,
  XCircle,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import {
  MaintenanceTicket,
  Shift12HourWindow,
  ShiftOffsetType,
  SystemCategory,
  TicketStatus,
  WorkPermit,
  WorkPermitStatus,
  WorkPermitType,
} from '../types';
import { exportToCsv } from '../utils/exportUtils';
import { AiBadge } from './common/AiBadge';

export const TicketsView: React.FC = () => {
  const {
    tickets,
    createTicket,
    updateTicketStatus,
    workPermits,
    updateWorkPermitStatus,
    showToast,
    selectedCmmsItem,
    clearSelectedCmmsItem,
    openAiAssistant,
  } = useFacility();

  // Sub-pages: 1. work orders, 2. work permits
  const [activeSubPage, setActiveSubPage] = useState<'work_orders' | 'work_permits'>('work_orders');

  // --- WORK ORDERS STATE ---
  const [woStatusFilter, setWoStatusFilter] = useState<'Open' | 'All' | 'In Progress' | 'Resolved' | 'Closed'>('Open');
  const [woCategoryFilter, setWoCategoryFilter] = useState<string>('All');
  const [woSearchQuery, setWoSearchQuery] = useState<string>('');
  const [expandedTicketIds, setExpandedTicketIds] = useState<Record<string, boolean>>({
    'WO-4105': true,
    'WO-4106': true,
    'WO-4102': true,
  });

  // Ticket Creation Modal
  const [isCreateWoModalOpen, setIsCreateWoModalOpen] = useState<boolean>(false);
  const [newWoTitle, setNewWoTitle] = useState<string>('');
  const [newWoCategory, setNewWoCategory] = useState<SystemCategory>('Cleanroom HVAC & FFU');
  const [newWoLocation, setNewWoLocation] = useState<string>('Fab 1 Cleanroom Bay 1');
  const [newWoOwner, setNewWoOwner] = useState<string>('Marcus Vance (HVAC System Owner)');
  const [newWoDescription, setNewWoDescription] = useState<string>('');
  const [aiPromptText, setAiPromptText] = useState<string>('');
  const [isAiClassifying, setIsAiClassifying] = useState<boolean>(false);

  // Ticket Resolution Modal
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Work Permit Closeout Modal
  const [closingPermit, setClosingPermit] = useState<WorkPermit | null>(null);
  const [permitCloseoutNotes, setPermitCloseoutNotes] = useState<string>('');
  const [permitClosedBy, setPermitClosedBy] = useState<string>('Facilities Operations Lead');

  // Work Permit Comprehensive Details Modal
  const [selectedPermitForDetails, setSelectedPermitForDetails] = useState<WorkPermit | null>(null);

  // --- WORK PERMITS SHIFT +1 / CURRENT / -1 STATE ---
  const [shiftFilter, setShiftFilter] = useState<ShiftOffsetType | 'All'>('current');
  const [permitStatusFilter, setPermitStatusFilter] = useState<WorkPermitStatus | 'All'>('All');
  const [permitTypeFilter, setPermitTypeFilter] = useState<string>('All');
  const [permitSearchQuery, setPermitSearchQuery] = useState<string>('');

  // Respond to LLM or cross-link CMMS item selection
  useEffect(() => {
    if (selectedCmmsItem) {
      if (selectedCmmsItem.type === 'permit') {
        setActiveSubPage('work_permits');
        setShiftFilter('All');
        setPermitStatusFilter('All');
        setPermitTypeFilter('All');
        setPermitSearchQuery('');
        const found = workPermits.find(p => p.id === selectedCmmsItem.id);
        if (found) {
          setSelectedPermitForDetails(found);
        }
      } else if (selectedCmmsItem.type === 'ticket') {
        setActiveSubPage('work_orders');
        setWoStatusFilter('All');
        setWoCategoryFilter('All');
        setWoSearchQuery('');
        setExpandedTicketIds(prev => ({
          ...prev,
          [selectedCmmsItem.id]: true,
        }));
      }
    }
  }, [selectedCmmsItem, workPermits]);

  // Helper to derive shiftOffset accurately for any permit
  const getPermitShiftOffset = (permit: WorkPermit): ShiftOffsetType => {
    if (permit.shiftOffset) return permit.shiftOffset;
    if (permit.id.startsWith('WP-88')) return '-1';
    if (permit.id.startsWith('WP-90')) return '+1';
    return 'current';
  };

  // Map of tickets for linking permit locations
  const ticketMap = useMemo(() => {
    const map = new Map<string, MaintenanceTicket>();
    tickets.forEach(t => map.set(t.id, t));
    return map;
  }, [tickets]);

  // Shift Horizon Statistics
  const shiftHorizonStats = useMemo(() => {
    const prev = workPermits.filter(p => getPermitShiftOffset(p) === '-1');
    const curr = workPermits.filter(p => getPermitShiftOffset(p) === 'current');
    const next = workPermits.filter(p => getPermitShiftOffset(p) === '+1');

    return {
      prev: {
        total: prev.length,
        open: prev.filter(p => p.status === 'open').length,
        pending: prev.filter(p => p.status === 'pending approval').length,
        closed: prev.filter(p => p.status === 'closed').length,
        rejected: prev.filter(p => p.status === 'rejected').length,
        shiftCode: '2026-08-30 (07:00 - 19:00)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        date: '2026-08-30',
        subtitle: 'Handover Completed & Audited',
      },
      current: {
        total: curr.length,
        open: curr.filter(p => p.status === 'open').length,
        pending: curr.filter(p => p.status === 'pending approval').length,
        closed: curr.filter(p => p.status === 'closed').length,
        rejected: curr.filter(p => p.status === 'rejected').length,
        shiftCode: '2026-08-30 (19:00 - 07:00)',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        date: '2026-08-30',
        subtitle: 'Live Operational Window',
      },
      next: {
        total: next.length,
        open: next.filter(p => p.status === 'open').length,
        pending: next.filter(p => p.status === 'pending approval').length,
        closed: next.filter(p => p.status === 'closed').length,
        rejected: next.filter(p => p.status === 'rejected').length,
        shiftCode: '2026-08-31 (07:00 - 19:00)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        date: '2026-08-31',
        subtitle: 'Upcoming Scheduled Plan',
      },
    };
  }, [workPermits]);

  // Helper to calculate time since work order has been open (in days)
  const getTimeSinceOpen = (createdAt: string, status: string, closedAt?: string) => {
    try {
      const createdTime = new Date(createdAt.replace(' ', 'T')).getTime();
      if (isNaN(createdTime)) return '1 day';

      // Benchmark reference timestamp aligning with current shift time (2026-08-30 19:35:00)
      const benchmarkTime = new Date('2026-08-30T19:35:00').getTime();
      const endTime = (status === 'Closed' || status === 'Resolved') && closedAt
        ? new Date(closedAt.replace(' ', 'T')).getTime()
        : benchmarkTime;

      const diffMs = Math.max(0, endTime - createdTime);
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (days <= 0) {
        return '1 day';
      }
      return `${days} ${days === 1 ? 'day' : 'days'}`;
    } catch {
      return '1 day';
    }
  };

  // Toggle expand for work orders
  const toggleExpandTicket = (ticketId: string) => {
    setExpandedTicketIds(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId],
    }));
  };

  // Filter Work Orders
  const filteredTickets = tickets.filter(t => {
    if (woStatusFilter === 'Open') {
      if (t.status === 'Closed' || t.status === 'Resolved') return false;
    } else if (woStatusFilter !== 'All') {
      if (t.status !== woStatusFilter) return false;
    }
    if (woCategoryFilter !== 'All' && t.category !== woCategoryFilter) return false;
    if (woSearchQuery) {
      const q = woSearchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.assignedOwner.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter Work Permits (enrich with linked work order location and derived shiftOffset)
  const filteredPermits = useMemo(() => {
    return workPermits.map(p => {
      const linkedTicket = p.workOrderId ? ticketMap.get(p.workOrderId) : undefined;
      const resolvedLocation = linkedTicket ? linkedTicket.location : p.location;
      const offset = getPermitShiftOffset(p);
      return {
        ...p,
        shiftOffset: offset,
        resolvedLocation,
        linkedTicket,
      };
    }).filter(p => {
      if (shiftFilter !== 'All' && p.shiftOffset !== shiftFilter) return false;
      if (permitStatusFilter !== 'All' && p.status !== permitStatusFilter) return false;
      if (permitTypeFilter !== 'All' && p.permitType !== permitTypeFilter) return false;
      if (permitSearchQuery) {
        const q = permitSearchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.resolvedLocation.toLowerCase().includes(q) ||
          (p.workOrderId && p.workOrderId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [workPermits, ticketMap, shiftFilter, permitStatusFilter, permitTypeFilter, permitSearchQuery]);

  // Work Permit Status Counts (scoped to active shift filter)
  const shiftScopedPermits = useMemo(() => {
    return workPermits.filter(p => {
      const offset = getPermitShiftOffset(p);
      if (shiftFilter !== 'All' && offset !== shiftFilter) return false;
      return true;
    });
  }, [workPermits, shiftFilter]);

  const permitCounts = useMemo(() => ({
    total: shiftScopedPermits.length,
    open: shiftScopedPermits.filter(p => p.status === 'open').length,
    pending: shiftScopedPermits.filter(p => p.status === 'pending approval').length,
    closed: shiftScopedPermits.filter(p => p.status === 'closed').length,
    rejected: shiftScopedPermits.filter(p => p.status === 'rejected').length,
  }), [shiftScopedPermits]);

  // Open tickets count & priority counts
  const openWorkOrdersCount = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
  const p1WorkOrdersCount = tickets.filter(t => t.priority === 'P1' && t.status !== 'Closed' && t.status !== 'Resolved').length;
  const p2WorkOrdersCount = tickets.filter(t => t.priority === 'P2' && t.status !== 'Closed' && t.status !== 'Resolved').length;
  const lotoPermitCount = workPermits.filter(p => p.lotoTagNumber).length;

  const handleAiAutoClassify = async () => {
    if (!aiPromptText) return;
    setIsAiClassifying(true);
    try {
      const res = await fetch('/api/ai/classify-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDescription: aiPromptText,
          sourceSystem: 'SCADA / Operator Freeform',
          location: newWoLocation,
          rawTelemetry: { status: 'Excursion detected in bay' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewWoTitle(data.ticketTitle || newWoTitle);
        if (data.category) setNewWoCategory(data.category as SystemCategory);
        if (data.assignedOwner) setNewWoOwner(data.assignedOwner);
        if (data.location) setNewWoLocation(data.location);
        setNewWoDescription(aiPromptText);
        showToast('AI auto-classified event metadata successfully');
      }
    } catch {
      showToast('AI classification fallback applied');
    } finally {
      setIsAiClassifying(false);
    }
  };

  const handleCreateWoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWoTitle) return;

    createTicket({
      title: newWoTitle,
      category: newWoCategory,
      priority: 'P2',
      status: 'Open',
      location: newWoLocation,
      assignedOwner: newWoOwner,
      source: aiPromptText ? 'AI Event Classifier' : 'Manual Operator Submission',
      workOrderType: 'CM (Corrective)',
      estimatedHours: 4,
      description: newWoDescription || newWoTitle,
    });

    setIsCreateWoModalOpen(false);
    setNewWoTitle('');
    setNewWoDescription('');
    setAiPromptText('');
  };

  const handleConfirmResolveWo = () => {
    if (resolvingTicketId) {
      updateTicketStatus(resolvingTicketId, 'Resolved', resolutionNotes);
      setResolvingTicketId(null);
      setResolutionNotes('');
    }
  };

  const handleInitiateClosePermit = (permit: WorkPermit) => {
    setClosingPermit(permit);
    setPermitCloseoutNotes('');
    setPermitClosedBy('Facilities Operations Lead');
  };

  const handleConfirmClosePermit = () => {
    if (closingPermit) {
      updateWorkPermitStatus(
        closingPermit.id,
        'closed',
        undefined,
        undefined,
        permitCloseoutNotes || 'Work completed safely, LOTO isolation surrendered, area restored to operational status.',
        permitClosedBy || 'Facilities Operations Lead'
      );
      setClosingPermit(null);
      setPermitCloseoutNotes('');
    }
  };

  const formatShiftValidity = (permit: { shiftDate?: string; shiftWindow?: string; shiftOffset?: ShiftOffsetType }) => {
    const match = permit.shiftWindow?.match(/\(([^)]+)\)/);
    let timeSlot = '(07:00 - 19:00)';
    if (match) {
      timeSlot = `(${match[1]})`;
    } else if (permit.shiftOffset === 'current') {
      timeSlot = '(19:00 - 07:00)';
    }
    const date = permit.shiftDate || (permit.shiftOffset === '+1' ? '2026-08-31' : '2026-08-30');
    return `${date} ${timeSlot}`;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-2xs">
            P1 Critical
          </span>
        );
      case 'P2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            P2 High
          </span>
        );
      case 'P3':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            P3 Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {priority}
          </span>
        );
    }
  };

  const getTicketStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Open
          </span>
        );
      case 'In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            In Progress
          </span>
        );
      case 'Pending Verification':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            Pending Verif.
          </span>
        );
      case 'Resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Resolved
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            Closed
          </span>
        );
    }
  };

  const getPermitTypeIcon = (type: WorkPermitType) => {
    switch (type) {
      case 'Cold Work':
        return <Wind className="w-4 h-4 text-cyan-600" />;
      case 'Hot Work':
        return <Flame className="w-4 h-4 text-orange-600" />;
      case 'Working at Heights':
        return <HardHat className="w-4 h-4 text-amber-600" />;
      case 'Confined Space Entry':
        return <Lock className="w-4 h-4 text-emerald-700" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const getPermitStatusBadge = (status: WorkPermitStatus) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Open (Active)
          </span>
        );
      case 'pending approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Approval
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            Closed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Rejected
          </span>
        );
    }
  };

  const getShiftBadge = (offset: ShiftOffsetType) => {
    switch (offset) {
      case '-1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <History className="w-3.5 h-3.5 text-slate-500" />
            2026-08-30 (07:00 - 19:00)
          </span>
        );
      case 'current':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            2026-08-30 (19:00 - 07:00)
          </span>
        );
      case '+1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-teal-50 text-teal-700 border border-teal-200">
            <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
            2026-08-31 (07:00 - 19:00)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & CMMS Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  CMMS (Computerized Maintenance Management System)
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Fab corrective work orders, system owner assignments &amp; multi-shift safety work permits
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Ask Ops Copilot Action */}
            <button
              onClick={() =>
                openAiAssistant(
                  activeSubPage === 'work_orders'
                    ? `Analyze the CMMS work order backlog: review open vs resolved status, evaluate P1/P2 priorities, and recommend shift maintenance resource allocations for Fab 1.`
                    : `Audit safety work permits across shifts: review active LOTO isolations, high-risk permit controls, and upcoming shift handover permit readiness.`
                )
              }
              className="px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-lg text-sm font-bold shadow-md shadow-emerald-950/40 border border-emerald-500/50 backdrop-blur-md transition flex items-center gap-2 group"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Ask Ops Copilot</span>
            </button>

            {activeSubPage === 'work_orders' && (
              <button
                onClick={() => setIsCreateWoModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Work Order (AI Assisted)
              </button>
            )}
            <button
              onClick={() => {
                if (activeSubPage === 'work_orders') {
                  exportToCsv('FabCore_Work_Orders', filteredTickets);
                } else {
                  exportToCsv('FabCore_Work_Permits', filteredPermits);
                }
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Export CSV
            </button>
          </div>
        </div>

        {/* 2 Sub-Pages Navigation Bar */}
        <div className="flex border-b border-slate-200 pt-2">
          <button
            onClick={() => setActiveSubPage('work_orders')}
            className={`flex items-center gap-2.5 py-3.5 px-6 text-sm font-bold transition-all border-b-2 ${
              activeSubPage === 'work_orders'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Wrench className="w-4.5 h-4.5" />
            <span>1. Work Orders</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeSubPage === 'work_orders'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {openWorkOrdersCount} Open
            </span>
          </button>

          <button
            onClick={() => setActiveSubPage('work_permits')}
            className={`flex items-center gap-2.5 py-3.5 px-6 text-sm font-bold transition-all border-b-2 ${
              activeSubPage === 'work_permits'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4.5 h-4.5" />
            <span>2. Work Permits</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                activeSubPage === 'work_permits'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {workPermits.length} Total Permits
            </span>
          </button>
        </div>
      </div>

      {/* Executive AI CMMS Insights & Health Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950/75 to-slate-950 border border-emerald-500/40 rounded-xl p-4 sm:p-5 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AiBadge variant="icon-only" size="sm" colorScheme="emerald" />
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                AI CMMS Operations &amp; Work Order Health Review
                <AiBadge label="Ops Copilot Monitored" variant="gradient" size="xs" colorScheme="emerald" />
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Real-time tracking of corrective work orders, system owner dispatch, and multi-shift SEMI S2 work permits.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              openAiAssistant(
                `Provide a concise status report on open CMMS work orders (${openWorkOrdersCount} open, ${p1WorkOrdersCount} P1 critical, ${p2WorkOrdersCount} P2 high) and active work permits. Highlight immediate risks and recommend shift engineering priorities.`
              )
            }
            className="self-start sm:self-auto px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 hover:border-emerald-400 rounded-lg text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Generate Shift Maintenance Summary</span>
          </button>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 block">Active Backlog</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-white font-mono">{openWorkOrdersCount}</span>
              <span className="text-xs text-slate-300 font-medium">Open WO</span>
            </div>
            <span className="text-[11px] text-amber-400 font-medium block mt-0.5">
              {p1WorkOrdersCount > 0 ? `${p1WorkOrdersCount} Critical (P1)` : '0 P1 Critical'} • {p2WorkOrdersCount} High (P2)
            </span>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 block">Live Shift Permits</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-emerald-400 font-mono">{shiftHorizonStats.current.open}</span>
              <span className="text-xs text-slate-300 font-medium">Authorized</span>
            </div>
            <span className="text-[11px] text-emerald-300/90 font-medium block mt-0.5">
              100% Audited • {shiftHorizonStats.current.pending} Pending Review
            </span>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 block">LOTO Tagged Isolations</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-white font-mono">{lotoPermitCount}</span>
              <span className="text-xs text-slate-300 font-medium">Active Locks</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-medium block mt-0.5">
              Zero-Energy Verified (OSHA 1910.147)
            </span>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80 block">Next Shift Handover</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-teal-400 font-mono">{shiftHorizonStats.next.total}</span>
              <span className="text-xs text-slate-300 font-medium">Permits (Day +1)</span>
            </div>
            <span className="text-[11px] text-teal-300/90 font-medium block mt-0.5">
              {shiftHorizonStats.next.open} Approved • Ready for Handover
            </span>
          </div>
        </div>

        {/* AI Actionable Alert Strip */}
        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-100">
              <strong className="text-white font-semibold">Priority Countermeasure:</strong> Scrubber #2 dosing pump (WO-4105) and UPW TOC spike (WO-4106) actively assigned with live permits under execution.
            </span>
          </div>
          <button
            onClick={() => {
              if (activeSubPage !== 'work_orders') setActiveSubPage('work_orders');
              setWoSearchQuery('Scrubber #2');
            }}
            className="text-emerald-300 hover:text-white font-bold underline decoration-emerald-500/50 hover:decoration-emerald-300 whitespace-nowrap self-start sm:self-auto"
          >
            Locate Priority WO &rarr;
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-PAGE 1: WORK ORDERS */}
      {/* ========================================================================= */}
      {activeSubPage === 'work_orders' && (
        <div className="space-y-5">
          {/* Work Orders Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3.5 flex-1">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search work order #, title, owner, or location..."
                  value={woSearchQuery}
                  onChange={e => setWoSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-semibold whitespace-nowrap">Status:</span>
                <select
                  value={woStatusFilter}
                  onChange={e => setWoStatusFilter(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="Open">Open Work Orders (Active)</option>
                  <option value="All">All Statuses</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-semibold whitespace-nowrap">Category:</span>
                <select
                  value={woCategoryFilter}
                  onChange={e => setWoCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="All">All Categories</option>
                  <option value="Specialty Gases (TGM)">Specialty Gases (TGM)</option>
                  <option value="Ultra Pure Water (UPW)">Ultra Pure Water (UPW)</option>
                  <option value="Cleanroom HVAC & FFU">Cleanroom HVAC & FFU</option>
                  <option value="Thermal & Chiller Plant">Thermal & Chiller Plant</option>
                  <option value="Voice of Customer (VOC)">Voice of Customer (VOC)</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-slate-500 font-medium flex items-center gap-3">
              <span>
                Showing <strong className="text-slate-900 font-bold">{filteredTickets.length}</strong> work orders
              </span>
              <button
                onClick={() => {
                  const allExpanded = filteredTickets.every(t => expandedTicketIds[t.id]);
                  const newState: Record<string, boolean> = {};
                  filteredTickets.forEach(t => {
                    newState[t.id] = !allExpanded;
                  });
                  setExpandedTicketIds(newState);
                }}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition"
              >
                Toggle All
              </button>
            </div>
          </div>

          {/* Work Orders List with Aligned Structured Columns */}
          <div className="space-y-3.5">
            {filteredTickets.map(ticket => {
              const isExpanded = !!expandedTicketIds[ticket.id];
              const timeSinceOpen = getTimeSinceOpen(ticket.createdAt, ticket.status, ticket.closedAt || ticket.updatedAt);

              return (
                <div
                  key={ticket.id}
                  className={`bg-white border rounded-xl transition-all shadow-xs overflow-hidden ${
                    isExpanded ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Collapsed/Header Row with Aligned 12-Column Grid */}
                  <div
                    onClick={() => toggleExpandTicket(ticket.id)}
                    className="p-4 sm:p-5 cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-4 items-center select-none hover:bg-slate-50/80 transition"
                  >
                    {/* Col 1: Expand Button + WO ID + Priority (col-span-3) */}
                    <div className="lg:col-span-3 flex items-center gap-3">
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition shrink-0"
                        aria-label="Expand work order"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-emerald-700">{ticket.id}</span>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>

                    {/* Col 2: Title & Category & Opened Date (col-span-4) */}
                    <div className="lg:col-span-4 space-y-1">
                      <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">{ticket.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <span className="text-slate-700 font-semibold">{ticket.category}</span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Opened: {ticket.createdAt.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Col 3: Location (col-span-2) */}
                    <div className="lg:col-span-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">LOCATION</span>
                      <span className="text-sm font-semibold text-slate-800 block truncate" title={ticket.location}>
                        📍 {ticket.location}
                      </span>
                    </div>

                    {/* Col 4: Owner (col-span-2) */}
                    <div className="lg:col-span-2">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">OWNER</span>
                      <span className="text-sm font-semibold text-slate-800 block truncate" title={ticket.assignedOwner}>
                        {ticket.assignedOwner.split('(')[0]}
                      </span>
                    </div>

                    {/* Col 5: Status (col-span-1 / right-aligned) */}
                    <div className="lg:col-span-1 flex items-center justify-start lg:justify-end">
                      {getTicketStatusBadge(ticket.status)}
                    </div>
                  </div>

                  {/* Expanded Work Order Body */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-5">
                      {/* Structured Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Date WO Opened</span>
                          <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-900">
                            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{ticket.createdAt}</span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                            {ticket.closedAt ? 'Date WO Closed' : 'Open Duration'}
                          </span>
                          <div className="flex items-center gap-2 text-sm font-mono font-bold text-slate-900">
                            {ticket.closedAt ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{ticket.closedAt}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>{timeSinceOpen} (In Progress)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Assigned Engineer</span>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 truncate">
                            <User className="w-4 h-4 text-slate-500 shrink-0" />
                            <span className="truncate">{ticket.assignedOwner}</span>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Facility Location</span>
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            📍 {ticket.location}
                          </div>
                        </div>
                      </div>

                      {/* Description & Scope Box */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                          Work Order Description &amp; Scope
                        </span>
                        <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                          {ticket.description}
                        </p>
                      </div>

                      {/* Action & Status Toolbar */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700">Update Status:</span>
                            <select
                              value={ticket.status}
                              onChange={e => updateTicketStatus(ticket.id, e.target.value as TicketStatus)}
                              className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3.5 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
                            >
                              <option value="Open">Open</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Pending Verification">Pending Verification</option>
                              <option value="Resolved">Resolved</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>

                          {/* AI Troubleshoot Work Order Button */}
                          <button
                            type="button"
                            onClick={() =>
                              openAiAssistant(
                                `Provide corrective maintenance guidance, root-cause troubleshooting steps, and safety precautions for Work Order ${ticket.id}: "${ticket.title}" located at ${ticket.location} (${ticket.category}). System Owner: ${ticket.assignedOwner}. Description: "${ticket.description}".`
                              )
                            }
                            className="px-3.5 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-lg text-xs font-bold border border-emerald-500/40 backdrop-blur-xs transition flex items-center gap-1.5 shadow-2xs group"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
                            <span>AI Troubleshoot SOP</span>
                          </button>
                        </div>

                        {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                          <button
                            onClick={() => setResolvingTicketId(ticket.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 shadow-2xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Resolve Work Order</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Wrench className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No Work Orders Match Your Filter</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Try adjusting the status or category filter above, or create a new work order.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 2: WORK PERMITS (CURRENT SHIFT +1 AND -1) */}
      {/* ========================================================================= */}
      {activeSubPage === 'work_permits' && (
        <div className="space-y-6">
          {/* Shift Selector & Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shift 1 Card */}
            <div
              onClick={() => setShiftFilter('-1')}
              className={`cursor-pointer rounded-xl p-5 border transition-all relative overflow-hidden ${
                shiftFilter === '-1'
                  ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-emerald-400 shadow-md'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`w-4 h-4 ${shiftFilter === '-1' ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      2026-08-30 (07:00 - 19:00)
                    </span>
                  </div>
                  <h3 className={`text-base font-bold mt-1 ${shiftFilter === '-1' ? 'text-white' : 'text-slate-900'}`}>
                    {shiftHorizonStats.prev.shiftWindow}
                  </h3>
                  <p className={`text-xs mt-0.5 ${shiftFilter === '-1' ? 'text-slate-300' : 'text-slate-500'}`}>
                    {shiftHorizonStats.prev.subtitle}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    shiftFilter === '-1' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {shiftHorizonStats.prev.total} Permits
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/30 text-center">
                <div className={`p-2 rounded-lg ${shiftFilter === '-1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Closed</span>
                  <span className="text-sm font-bold text-slate-300">{shiftHorizonStats.prev.closed}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === '-1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Rejected</span>
                  <span className="text-sm font-bold text-red-400">{shiftHorizonStats.prev.rejected}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === '-1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Audited</span>
                  <span className="text-sm font-bold text-emerald-400">100%</span>
                </div>
              </div>
            </div>

            {/* Shift 2 Card */}
            <div
              onClick={() => setShiftFilter('current')}
              className={`cursor-pointer rounded-xl p-5 border transition-all relative overflow-hidden ${
                shiftFilter === 'current'
                  ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-emerald-400 shadow-md'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      2026-08-30 (19:00 - 07:00)
                    </span>
                  </div>
                  <h3 className={`text-base font-bold mt-1 ${shiftFilter === 'current' ? 'text-white' : 'text-slate-900'}`}>
                    {shiftHorizonStats.current.shiftWindow}
                  </h3>
                  <p className={`text-xs mt-0.5 ${shiftFilter === 'current' ? 'text-slate-300' : 'text-slate-500'}`}>
                    {shiftHorizonStats.current.subtitle}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    shiftFilter === 'current' ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {shiftHorizonStats.current.total} Permits
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/30 text-center">
                <div className={`p-2 rounded-lg ${shiftFilter === 'current' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Open</span>
                  <span className="text-sm font-bold text-emerald-400">{shiftHorizonStats.current.open}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === 'current' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Pending</span>
                  <span className="text-sm font-bold text-amber-400">{shiftHorizonStats.current.pending}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === 'current' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Closed</span>
                  <span className="text-sm font-bold text-slate-300">{shiftHorizonStats.current.closed}</span>
                </div>
              </div>
            </div>

            {/* Shift 3 Card */}
            <div
              onClick={() => setShiftFilter('+1')}
              className={`cursor-pointer rounded-xl p-5 border transition-all relative overflow-hidden ${
                shiftFilter === '+1'
                  ? 'bg-slate-900 text-white border-slate-800 ring-2 ring-teal-400 shadow-md'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className={`w-4 h-4 ${shiftFilter === '+1' ? 'text-teal-400' : 'text-teal-600'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider font-mono">
                      2026-08-31 (07:00 - 19:00)
                    </span>
                  </div>
                  <h3 className={`text-base font-bold mt-1 ${shiftFilter === '+1' ? 'text-white' : 'text-slate-900'}`}>
                    {shiftHorizonStats.next.shiftWindow}
                  </h3>
                  <p className={`text-xs mt-0.5 ${shiftFilter === '+1' ? 'text-slate-300' : 'text-slate-500'}`}>
                    {shiftHorizonStats.next.subtitle}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    shiftFilter === '+1' ? 'bg-teal-500/30 text-teal-300 border border-teal-400/40' : 'bg-teal-50 text-teal-700 border border-teal-200'
                  }`}
                >
                  {shiftHorizonStats.next.total} Permits
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-200/30 text-center">
                <div className={`p-2 rounded-lg ${shiftFilter === '+1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Approved</span>
                  <span className="text-sm font-bold text-emerald-400">{shiftHorizonStats.next.open}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === '+1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Awaiting Appr.</span>
                  <span className="text-sm font-bold text-amber-400">{shiftHorizonStats.next.pending}</span>
                </div>
                <div className={`p-2 rounded-lg ${shiftFilter === '+1' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <span className="text-xs block opacity-70">Scheduled</span>
                  <span className="text-sm font-bold text-teal-400">{shiftHorizonStats.next.total}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Filter Navigation & Status Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            {/* Shift Horizon Selection Tabs */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100">
              {[
                { id: 'current', label: '2026-08-30 (19:00 - 07:00)', count: shiftHorizonStats.current.total },
                { id: '-1', label: '2026-08-30 (07:00 - 19:00)', count: shiftHorizonStats.prev.total },
                { id: '+1', label: '2026-08-31 (07:00 - 19:00)', count: shiftHorizonStats.next.total },
                { id: 'All', label: 'All Shifts', count: workPermits.length },
              ].map(shift => (
                <button
                  key={shift.id}
                  onClick={() => setShiftFilter(shift.id as any)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-bold font-mono transition flex items-center gap-2 ${
                    shiftFilter === shift.id
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{shift.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      shiftFilter === shift.id ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {shift.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Status Categories Bar: open, closed, pending approval, rejected */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 font-semibold mr-1">Permit Status:</span>
                {(
                  [
                    { id: 'All', label: 'All Permits', count: permitCounts.total },
                    { id: 'open', label: 'Open (Active / Approved)', count: permitCounts.open, color: 'text-emerald-700 bg-emerald-50' },
                    { id: 'pending approval', label: 'Pending Approval', count: permitCounts.pending, color: 'text-amber-700 bg-amber-50' },
                    { id: 'closed', label: 'Closed', count: permitCounts.closed, color: 'text-slate-700 bg-slate-100' },
                    { id: 'rejected', label: 'Rejected', count: permitCounts.rejected, color: 'text-red-700 bg-red-50' },
                  ] as const
                ).map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setPermitStatusFilter(cat.id as any)}
                    className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition flex items-center gap-2 border ${
                      permitStatusFilter === cat.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        permitStatusFilter === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Type Filter & Search */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={permitTypeFilter}
                  onChange={e => setPermitTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="All">All Permit Types</option>
                  <option value="Cold Work">Cold Work</option>
                  <option value="Hot Work">Hot Work</option>
                  <option value="Working at Heights">Working at Heights</option>
                  <option value="Confined Space Entry">Confined Space Entry</option>
                </select>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search permit title, ID, location..."
                    value={permitSearchQuery}
                    onChange={e => setPermitSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Permits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPermits.map(permit => (
              <div
                key={permit.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  {/* Card Header with Shift Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-emerald-700">{permit.id}</span>
                        {permit.workOrderId && (
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
                            {permit.workOrderId}
                          </span>
                        )}
                        {getShiftBadge(permit.shiftOffset)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-2">
                        {getPermitTypeIcon(permit.permitType)}
                        <span className="line-clamp-1">{permit.permitType}</span>
                      </div>
                    </div>
                    {/* Status Badge */}
                    {getPermitStatusBadge(permit.status)}
                  </div>

                  <h4 className="text-base font-bold text-slate-900 leading-snug">{permit.title}</h4>

                  {/* Shift Validity & Location Information Block */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-sm text-slate-700">
                    <div>
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
                        SHIFT VALIDITY
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatShiftValidity(permit)}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">
                        LOCATION
                      </span>
                      <span className="font-semibold text-slate-800 text-sm block truncate">
                        📍 {permit.resolvedLocation}
                      </span>
                    </div>

                    {permit.rejectionReason && (
                      <div className="pt-2 border-t border-red-200 space-y-1 bg-red-50/80 p-2.5 rounded-lg text-xs text-red-800">
                        <span className="font-bold uppercase tracking-wider text-red-700 block text-xs">
                          REJECTION / HOLD REASON:
                        </span>
                        <p className="leading-relaxed">{permit.rejectionReason}</p>
                      </div>
                    )}

                    {permit.closeoutNotes && (
                      <div className="pt-2 border-t border-emerald-200 space-y-1 bg-emerald-50/80 p-2.5 rounded-lg text-xs text-emerald-900">
                        <span className="font-bold uppercase tracking-wider text-emerald-800 block text-xs">
                          CLOSEOUT NOTES:
                        </span>
                        <p className="leading-relaxed">{permit.closeoutNotes}</p>
                        {permit.closedAt && (
                          <span className="text-[11px] text-emerald-700 block mt-0.5 opacity-85">
                            Closed on {permit.closedAt} {permit.closedBy ? `• ${permit.closedBy}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedPermitForDetails(permit)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>View Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openAiAssistant(
                          `Review SEMI S2 safety compliance and LOTO isolation requirements for Work Permit ${permit.id}: "${permit.title}" (${permit.permitType}) at ${permit.resolvedLocation}. LOTO tag: ${permit.lotoTagNumber || 'None'}. Provide immediate safety recommendations.`
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 border border-transparent hover:border-emerald-200 transition"
                      title="Ask Copilot to Audit Permit Safety"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {permit.status === 'open' && permit.shiftOffset === 'current' && (
                      <button
                        onClick={() => handleInitiateClosePermit(permit)}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        Close Permit
                      </button>
                    )}
                    {permit.status === 'pending approval' && (
                      <button
                        onClick={() => updateWorkPermitStatus(permit.id, 'open')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                      >
                        Authorize &amp; Open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredPermits.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-sm">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800">No Work Permits for Selected Shift / Filter</h4>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Switch between selectable shift timings or clear category filters to view permits.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE WORK ORDER (AI ASSISTED) */}
      {/* ========================================================================= */}
      {isCreateWoModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Create New CMMS Work Order</h3>
              </div>
              <button
                onClick={() => setIsCreateWoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* AI Assistant Classification Input */}
            <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>AI Auto-Classification Assistant</span>
              </div>
              <p className="text-xs text-emerald-700">
                Paste operator log notes, excursion details, or SCADA alarms below to auto-fill category, owner, and description.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Scrubber #2 dosing pump pH drift to 10.4 in roof yard..."
                  value={aiPromptText}
                  onChange={e => setAiPromptText(e.target.value)}
                  className="flex-1 bg-white border border-emerald-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAiAutoClassify}
                  disabled={isAiClassifying || !aiPromptText}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  {isAiClassifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Auto-Fill
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateWoSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Work Order Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cleanroom Bay 1 Airflow FFU Sensor Re-Calibration"
                  value={newWoTitle}
                  onChange={e => setNewWoTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">System Category</label>
                <select
                  value={newWoCategory}
                  onChange={e => setNewWoCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cleanroom HVAC & FFU">Cleanroom HVAC & FFU</option>
                  <option value="Ultra Pure Water (UPW)">Ultra Pure Water (UPW)</option>
                  <option value="Specialty Gases (TGM)">Specialty Gases (TGM)</option>
                  <option value="Thermal & Chiller Plant">Thermal & Chiller Plant</option>
                  <option value="Voice of Customer (VOC)">Voice of Customer (VOC)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Facility Location</label>
                  <input
                    type="text"
                    value={newWoLocation}
                    onChange={e => setNewWoLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Owner</label>
                  <input
                    type="text"
                    value={newWoOwner}
                    onChange={e => setNewWoOwner(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description</label>
                <textarea
                  rows={4}
                  value={newWoDescription}
                  onChange={e => setNewWoDescription(e.target.value)}
                  placeholder="Detailed symptoms, setpoint excursion values, and initial operator observations..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateWoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition shadow-sm"
                >
                  Create Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESOLVE WORK ORDER */}
      {/* ========================================================================= */}
      {resolvingTicketId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Resolve Work Order {resolvingTicketId}</h3>
            </div>
            <p className="text-sm text-slate-500">
              Enter root cause corrective action details and verification notes before signing off this work order.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Diaphragm replaced, pneumatic purge confirmed leak-free, secondary sensor calibrated."
              value={resolutionNotes}
              onChange={e => setResolutionNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingTicketId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolveWo}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition shadow-sm"
              >
                Sign-Off &amp; Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLOSE WORK PERMIT (WITH CLOSEOUT NOTES ENTRY) */}
      {/* ========================================================================= */}
      {closingPermit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Close Work Permit {closingPermit.id}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {closingPermit.permitType} • {closingPermit.workOrderId || 'General Task'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setClosingPermit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{closingPermit.title}</div>
              <div className="text-slate-500">📍 {closingPermit.location}</div>
              <div className="text-slate-500">⏰ {formatShiftValidity(closingPermit)}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold text-sm mb-1">
                  Closeout Notes &amp; Safety Handover *
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Work successfully completed, all LOTO physical isolations removed, housekeeping inspected, and system handed back to operations."
                  value={permitCloseoutNotes}
                  onChange={e => setPermitCloseoutNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold text-sm mb-1">
                  Signing Lead / Safety Officer
                </label>
                <input
                  type="text"
                  value={permitClosedBy}
                  onChange={e => setPermitClosedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClosingPermit(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClosePermit}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-sm font-bold transition shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirm &amp; Close Permit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPREHENSIVE WORK PERMIT SAFETY SPECIFICATION & DETAILS */}
      {/* ========================================================================= */}
      {selectedPermitForDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-base text-white">
                      {selectedPermitForDetails.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedPermitForDetails.permitType}
                    </span>
                    {getPermitStatusBadge(selectedPermitForDetails.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Semiconductor Fab-1 Environmental Health &amp; Safety (EHS) Work Authorization
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPermitForDetails(null);
                  clearSelectedCmmsItem();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Title & Core Meta */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedPermitForDetails.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md font-medium text-slate-700">
                    📍 Location: <strong className="text-slate-900">{selectedPermitForDetails.location}</strong>
                  </span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md font-mono text-slate-700">
                    ⏰ Window: <strong>{selectedPermitForDetails.shiftWindow}</strong>
                  </span>
                  {selectedPermitForDetails.shiftLabel && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold">
                      {selectedPermitForDetails.shiftLabel}
                    </span>
                  )}
                </div>
              </div>

              {/* Linked Maintenance Work Order (if present) */}
              {selectedPermitForDetails.workOrderId && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                        Linked CMMS Work Order
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-800">
                        {selectedPermitForDetails.workOrderId}
                        {ticketMap.get(selectedPermitForDetails.workOrderId)?.title
                          ? ` • ${ticketMap.get(selectedPermitForDetails.workOrderId)?.title}`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const woId = selectedPermitForDetails.workOrderId;
                      setSelectedPermitForDetails(null);
                      clearSelectedCmmsItem();
                      if (woId) {
                        setActiveSubPage('work_orders');
                        setWoStatusFilter('All');
                        setWoCategoryFilter('All');
                        setWoSearchQuery('');
                        setExpandedTicketIds(prev => ({ ...prev, [woId]: true }));
                        showToast(`Switched to Work Order ${woId}`);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    <span>View Work Order</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* LOTO Isolation & Hazardous Energy Tagging */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>Hazardous Energy Isolation (LOTO OSHA 1910.147)</span>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedPermitForDetails.lotoTagNumber || 'LOTO Tag: Verified & Logged'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Physical isolation, zero-energy bleed-down, double-valve block verification, and master lockout padlock verified by Area System Owner before work inception.
                </p>
              </div>

              {/* Gas Checks & Atmospheric Sniffer Readings */}
              {selectedPermitForDetails.gasChecksPpm && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                    <Wind className="w-4 h-4 text-emerald-600" />
                    <span>Atmospheric Sniffer &amp; Gas Clearance</span>
                  </div>
                  <p className="text-xs font-mono font-bold text-emerald-800">
                    {selectedPermitForDetails.gasChecksPpm}
                  </p>
                </div>
              )}

              {/* Safety Precautions & Controls */}
              {selectedPermitForDetails.safetyPrecautions && selectedPermitForDetails.safetyPrecautions.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Mandatory Safety Precautions &amp; Operating Checks
                  </span>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    {selectedPermitForDetails.safetyPrecautions.map((precaution, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{precaution}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mandatory PPE Required */}
              {selectedPermitForDetails.ppeRequired && selectedPermitForDetails.ppeRequired.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Personal Protective Equipment (PPE) Required
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPermitForDetails.ppeRequired.map((ppe, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <HardHat className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{ppe}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Closeout Notes / Rejection Notes if already populated */}
              {selectedPermitForDetails.closeoutNotes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1 text-xs text-emerald-900">
                  <span className="font-bold uppercase tracking-wider text-emerald-800 block">
                    Closeout Audit &amp; Handover Record
                  </span>
                  <p className="leading-relaxed">{selectedPermitForDetails.closeoutNotes}</p>
                  {selectedPermitForDetails.closedAt && (
                    <span className="text-[11px] text-emerald-700 block mt-1">
                      Closed on {selectedPermitForDetails.closedAt}{' '}
                      {selectedPermitForDetails.closedBy ? `by ${selectedPermitForDetails.closedBy}` : ''}
                    </span>
                  )}
                </div>
              )}

              {selectedPermitForDetails.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 space-y-1 text-xs text-red-900">
                  <span className="font-bold uppercase tracking-wider text-red-800 block">
                    Rejection / Hold Justification
                  </span>
                  <p className="leading-relaxed">{selectedPermitForDetails.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 font-mono">
                SEMI S2 &bull; OSHA 1910.147
              </div>
              <div className="flex items-center gap-2">
                {selectedPermitForDetails.status === 'open' && (
                  <button
                    onClick={() => {
                      const p = selectedPermitForDetails;
                      setSelectedPermitForDetails(null);
                      handleInitiateClosePermit(p);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    Close Work Permit
                  </button>
                )}
                {selectedPermitForDetails.status === 'pending approval' && (
                  <button
                    onClick={() => {
                      updateWorkPermitStatus(selectedPermitForDetails.id, 'open');
                      setSelectedPermitForDetails(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                  >
                    Authorize &amp; Open
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPermitForDetails(null);
                    clearSelectedCmmsItem();
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
