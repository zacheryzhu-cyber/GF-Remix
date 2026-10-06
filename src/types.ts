/**
 * Types for Semiconductor Facilities Operation Management System (FabCore)
 * Supporting SEMI S2, ISO 14644-1 Cleanrooms, and Scope 4.1 A, B, C, D, E.
 */

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type FacilityTab =
  | 'campus_3d'
  | 'reports'
  | 'cpk'
  | 'tickets'
  | 'alarms'
  | 'emergency'
  | 'energy'
  | 'water'
  | 'system_landscape'
  | 'lpg_visualizer'
  | 'rdf_engine'
  | 'agent_hive'
  | 'agent_forge'
  | 'ontology_manager'
  | 'workflow_engine'
  | 'notification_settings'
  | 'mobile_app'
  | 'upw';

export type TicketStatus = 'Open' | 'In Progress' | 'Pending Verification' | 'Resolved' | 'Closed';

export type SystemCategory = 
  | 'Cleanroom HVAC & FFU'
  | 'Ultra Pure Water (UPW)'
  | 'Specialty Gases (TGM)'
  | 'Chemical Delivery (TCM)'
  | 'Thermal & Chiller Plant'
  | 'Clean Dry Air (CDA) & N2'
  | 'Scrubber & Exhaust'
  | 'Electrical & N+1 UPS'
  | 'Fire & Life Safety (VESDA)'
  | 'Voice of Customer (VOC)'
  | 'Copilot Runtime';

export interface AlarmItem {
  id: string;
  tag: string;
  description: string;
  system: SystemCategory;
  location: string;
  priority: PriorityLevel;
  timestamp: string;
  value: number | string;
  setpoint: number | string;
  unit: string;
  status: 'Active' | 'Acknowledged' | 'Shelved' | 'Cleared';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  shelvedUntil?: string;
  shelvedReason?: string;
  chatteringCount?: number;
  durationSeconds: number;
  hasOcap: boolean;
  linkedTicketId?: string;
}

export interface GuidedActionPlan {
  ocapTitle: string;
  severity: PriorityLevel;
  rootCauseHypothesis: string[];
  stepByStepChecklist: {
    step: number;
    action: string;
    role: string;
    critical: boolean;
    completed?: boolean;
  }[];
  emergencyContainment: string;
  historicalResolution: string;
  verificationCriteria?: string;
  generatedByAI?: boolean;
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  category: SystemCategory;
  priority: PriorityLevel;
  status: TicketStatus;
  location: string;
  assignedOwner: string;
  createdAt: string;
  updatedAt: string;
  source: 'Automated Alarm Rule' | 'AI Event Classifier' | 'SCADA Telemetry' | 'Manual Operator Submission' | 'VOC (Fab Module)';
  workOrderType: 'PM (Preventive)' | 'CM (Corrective)' | 'VOC Request' | 'Emergency Incident' | 'Safety Audit';
  estimatedHours: number;
  actualHours?: number;
  description: string;
  containmentPlan?: string;
  resolutionNotes?: string;
  closedAt?: string;
  linkedAlarmId?: string;
  requiredPPE?: string[];
  auditHistory: {
    timestamp: string;
    user: string;
    action: string;
    note?: string;
  }[];
}

export type WorkPermitStatus = 'open' | 'closed' | 'pending approval' | 'rejected';

export type WorkPermitType =
  | 'Cold Work'
  | 'Hot Work'
  | 'Working at Heights'
  | 'Confined Space Entry';

export type Shift12HourWindow =
  | 'Day Shift (07:00 - 19:00)'
  | 'Night Shift (19:00 - 07:00)';

export type ShiftOffsetType = 'current' | '-1' | '+1';

export interface WorkPermit {
  id: string; // e.g. 'WP-8801'
  workOrderId?: string; // Linked MaintenanceTicket ID e.g. 'WO-4102'
  title: string;
  permitType: WorkPermitType;
  status: WorkPermitStatus; // 'open' | 'closed' | 'pending approval' | 'rejected'
  location: string;
  safetyOfficer?: string;
  approvedBy?: string;
  approvedAt?: string;
  shiftWindow: Shift12HourWindow;
  shiftOffset?: ShiftOffsetType; // 'current' | '-1' | '+1'
  shiftLabel?: string; // e.g. 'Current Shift', 'Shift -1 (Previous)', 'Shift +1 (Next)'
  shiftDate: string;
  validFrom: string;
  validTo: string;
  safetyPrecautions: string[];
  gasChecksPpm?: string;
  lotoTagNumber?: string;
  ppeRequired: string[];
  rejectionReason?: string;
  closeoutNotes?: string;
  closedBy?: string;
  notes?: string;
  createdAt: string;
  closedAt?: string;
}

export interface CleanroomMetricPoint {
  timestamp: string;
  bay: string; // e.g. 'Bay 1 Photolithography (Class 1)', 'Bay 2 Dry Etch (Class 10)'
  temperature: number; // target: 21.0 °C
  humidity: number; // target: 42.0 %RH
  diffPressure: number; // target: +25.0 Pa
  particle01um: number; // target: <10 particles/m³ for Class 1
  particle05um: number; // target: <35 particles/m³
  particle50um: number; // target: 0
  ffuSpeedRpm: number; // target: 1150 RPM
  airVelocity: number; // target: 0.45 m/s
}

export interface CleanroomBoxplotData {
  bay: string;
  parameter: string;
  unit: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
  specLow: number;
  specHigh: number;
}

export interface CpkParameterData {
  id: string;
  name: string;
  system: SystemCategory;
  unit: string;
  lsl: number; // Lower Spec Limit
  usl: number; // Upper Spec Limit
  target: number;
  currentValue: number;
  mean3Day: number;
  sigma3Day: number;
  cp3Day: number;
  cpk3Day: number;
  ppkMonthly: number;
  status: 'In Control (Cpk >= 1.33)' | 'Warning (1.00 <= Cpk < 1.33)' | 'Out of Spec (Cpk < 1.00)';
  history3Days: { date: string; value: number; cpk: number }[];
  history2Months: { date: string; mean: number; cpk: number; ppk: number }[];
  systemOwner: string;
}

export interface RedundantEquipment {
  id: string;
  name: string;
  category: string;
  totalUnits: number;
  runningUnits: number;
  standbyUnits: number;
  requiredUnits: number;
  redundancyScheme: 'N+1' | 'N+2' | '2N';
  healthScore: number;
  currentLoadPercent: number;
  status: 'Normal' | 'Degraded' | 'At Risk';
  lastSwitchoverTest: string;
  units: {
    unitId: string;
    status: 'Running' | 'Standby (Ready)' | 'Maintenance (PM)' | 'Faulted';
    hoursRun: number;
    efficiencyPercent: number;
    vibrationMmS: number;
    temperatureC: number;
  }[];
}

export interface ScadaAnnotation {
  id: string;
  timestamp: string;
  tag: string;
  tagName: string;
  system: SystemCategory;
  author: string;
  authorRole: string;
  type: 'Setpoint Override' | 'Interlock Bypass' | 'Sensor Calibration' | 'Shift Note' | 'Force Trip Inhibit';
  previousValue: string | number;
  newValue: string | number;
  reason: string;
  approvedBy?: string;
  expirationTime?: string;
}

export interface ShiftReport {
  id: string;
  shiftDate: string;
  shiftType: 'Shift A (Day 07:00 - 19:00)' | 'Shift B (Night 19:00 - 07:00)' | 'Shift C (Swing)';
  leadEngineer: string;
  facilityManager: string;
  approvalStatus: 'Draft' | 'Pending Review' | 'Approved by Lead' | 'Signed-Off by Ops Manager';
  approvedAt?: string;
  executiveSummary: string;
  detailedNarrative: string;
  keyEvents: string[];
  alarmsSummary: {
    totalAlarms: number;
    p1Critical: number;
    p2High: number;
    p3Medium: number;
    p4Low: number;
    acknowledgedCount: number;
    standingAlarmsCount: number;
  };
  ticketsSummary: {
    openedDuringShift: number;
    closedDuringShift: number;
    pendingAction: number;
  };
  vocEvents: {
    time: string;
    fabBay: string;
    requestor: string;
    module: 'Photolithography' | 'Etch' | 'Thin Film' | 'Diffusion' | 'CMP';
    requestDetails: string;
    actionTaken: string;
  }[];
  pmcmEvents: {
    workOrder: string;
    equipment: string;
    type: 'PM' | 'CM';
    technician: string;
    status: 'Completed' | 'In Progress' | 'Deferred';
    notes: string;
  }[];
  actionItemsForNextShift: string[];
  iec62682ComplianceNote: string;
  scadaOverridesCount: number;
}

export type EmergencyWorkflowStep =
  | 'Activate alarm & inform Fire Team'
  | 'Operations acknowledge alarm'
  | 'Trigger verification'
  | 'Verified Fire Response'
  | 'False Alarm Stand-Down Response'
  | 'Resolved';

export type VerificationOutcome = 'unverified' | 'true' | 'false';

export interface EmergencySubStep {
  id: string;
  code: string;
  title: string;
  description: string;
  targetTime: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  details?: string;
}

export interface EmergencyIncident {
  id: string;
  type: 'Fire (VESDA)' | 'Toxic/Flammable Gas' | 'Chemical Spill' | 'Scrubber Abatement Excursion' | 'Power Outage' | string;
  hazardName: string; // e.g., 'Area C Cleanroom Fire', 'VESDA Bay 1 Plenum'
  location: string;
  severityLevel: 'LEVEL 1 (Advisory)' | 'LEVEL 2 (Urgent Containment)' | 'LEVEL 3 (Critical Evacuation)' | string;
  status:
    | 'Active Alert'
    | 'Acknowledged'
    | 'Verification in Progress'
    | 'True Incident (Active)'
    | 'False Alarm (Stand-Down)'
    | 'Controlled'
    | 'All Clear';
  detectedAt: string;
  detectedTimestamp?: number;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  timeToAcknowledgeSec?: number;
  linkedAlarmId?: string;
  ppmReading?: string;
  impactedZones: string[];
  automatedInterlocksEngaged: string[];
  
  // Sequential Workflow tracking
  currentWorkflowStep: 1 | 2 | 3 | 4;
  fireTeamInformed: boolean;
  fireTeamInformedAt?: string;
  verificationTriggered: boolean;
  verificationTriggeredAt?: string;
  verificationOutcome: VerificationOutcome;
  verificationDetails?: string;

  // Verified Fire Response: PA Evacuation Announcement, Activate CERT Team, Headcount Verification, Containment & Suppression
  trueBranchSteps: EmergencySubStep[];

  // False Alarm Stand-Down: Inform SCDF, All-Clear Announcement, Follow-up with RCA
  falseBranchSteps: EmergencySubStep[];

  ertChecklist: {
    id: string;
    action: string;
    targetTime: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }[];
  responseLog?: {
    timeOffsetSec: number;
    timestamp: string;
    event: string;
    actor: string;
    stage: string;
  }[];
  commanderNotes?: string;
  rcaTicketId?: string;
  announcementActive?: boolean;
  announcementText?: string;
  headcountTotal?: number;
  headcountAccounted?: number;
}

export interface DistributionRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
  subscribedReports: {
    dailyCpk: boolean;
    monthlyCpk: boolean;
    weeklyAlarm: boolean;
    cleanroom6Hourly: boolean;
    shiftHandover: boolean;
    nPlusOne: boolean;
  };
}

export interface GlobalSite {
  id: string;
  name: string;
  code: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  status: 'Operational' | 'Commissioning' | 'Maintenance' | 'Expansion';
  isAccessible: boolean;
  fabType: string;
  waferCapacity: string;
  cleanroomClass: string;
  powerDemandMW: number;
  cPkAvg: number;
  activeAlarmsCount: number;
  director: string;
  timezone: string;
  description: string;
  keyMetrics: {
    upwResistivity: string;
    chillerLoad: string;
    airPurity: string;
    powerN1: string;
  };
}

export type WorkflowNodeType = 'trigger' | 'condition' | 'action' | 'cmms' | 'notification' | 'compose_email' | 'delay' | 'human_approval' | 'data_fetch';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  description: string;
  config: {
    system?: SystemCategory;
    target?: string;
    notificationChannel?: 'whatsapp' | 'email' | 'teams';
    threshold?: string;
    actionVerb?: string;
    lotoRequired?: boolean;
    workOrderPriority?: PriorityLevel;
    emailContext?: string;
    emailRecipient?: string;
    systemPrompt?: string;
    duration?: string;
    approverRole?: string;
    sensorTag?: string;
    [key: string]: any;
  };
  x: number;
  y: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface FacilityWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'UPW' | 'HVAC' | 'Safety & LOTO' | 'Cleanroom' | 'Gas' | 'Tool';
  status: 'Ready' | 'Executing' | 'Completed' | 'Idle';
  isActiveTool: boolean;
  version: string;
  lastModified: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executionLogs?: string[];
}
