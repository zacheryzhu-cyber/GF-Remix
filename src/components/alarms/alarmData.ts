import { PriorityLevel, SystemCategory } from '../../types';

export interface BadActorItem {
  id: string;
  tag: string;
  name: string;
  system: SystemCategory;
  location: string;
  priority: PriorityLevel;
  baseWeeklyCount: number;
  baseMonthlyCount: number;
  baseDailyCount: number;
  standingHours: number;
  isChattering: boolean;
  chatteringBursts: number;
  rootCause: string;
  recommendation: string;
  owner: string;
  currentValue: string;
  setpoint: string;
  unit: string;
}

export const RAW_BAD_ACTORS: BadActorItem[] = [
  {
    id: 'UPW-RESIST-01',
    tag: 'UPW-RESIST-01',
    name: 'UPW Final Polisher Resistivity Loop',
    system: 'Ultra Pure Water (UPW)',
    location: 'UPW Polishing Skid Bay 1',
    priority: 'P1',
    baseWeeklyCount: 28,
    baseMonthlyCount: 112,
    baseDailyCount: 4,
    standingHours: 0,
    isChattering: true,
    chatteringBursts: 6,
    rootCause: 'Resin regeneration cycle transient & sensor micro-bubble fouling',
    recommendation: 'Increase deadband filter by 0.05 MΩ·cm and apply 10s debounce filter',
    owner: 'Marcus Vance (Shift Lead)',
    currentValue: '17.82 MΩ·cm',
    setpoint: '18.00 MΩ·cm',
    unit: 'MΩ·cm',
  },
  {
    id: 'CDA-PRESS-01',
    tag: 'CDA-PRESS-01',
    name: 'Clean Dry Air Main Ring Header Pressure',
    system: 'Clean Dry Air (CDA) & N2',
    location: 'Central Utility Building (CUB)',
    priority: 'P2',
    baseWeeklyCount: 22,
    baseMonthlyCount: 88,
    baseDailyCount: 3,
    standingHours: 0,
    isChattering: false,
    chatteringBursts: 1,
    rootCause: 'Compressor #3 lead/lag staging delay during tool batch change',
    recommendation: 'Tune sequencing logic and lower P2 trip threshold to 7.05 bar',
    owner: 'Chen Wei (HVAC Specialist)',
    currentValue: '7.12 bar',
    setpoint: '7.20 bar',
    unit: 'bar',
  },
  {
    id: 'SCRUB-DP-01',
    tag: 'SCRUB-DP-01',
    name: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
    system: 'Scrubber & Exhaust',
    location: 'Scrubber Deck Roof',
    priority: 'P2',
    baseWeeklyCount: 18,
    baseMonthlyCount: 72,
    baseDailyCount: 3,
    standingHours: 26.4,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Packing media particulate accumulation and demister pad wetting',
    recommendation: 'Perform demister chemical wash during scheduled PM window',
    owner: 'Elena Rostova (Gas & Chemical)',
    currentValue: '342 Pa',
    setpoint: '300 Pa',
    unit: 'Pa',
  },
  {
    id: 'CHILLER-CHW-01',
    tag: 'CHILLER-CHW-01',
    name: 'Primary Process Cooling Water Supply Temperature',
    system: 'Thermal & Chiller Plant',
    location: 'CUB Chiller Yard',
    priority: 'P1',
    baseWeeklyCount: 14,
    baseMonthlyCount: 56,
    baseDailyCount: 2,
    standingHours: 0,
    isChattering: true,
    chatteringBursts: 4,
    rootCause: '3-way mixing valve hunting under fluctuating cleanroom heat loads',
    recommendation: 'Apply PID rate derivative damping and adjust actuator stroke speed',
    owner: 'David Kim (Facilities Automation)',
    currentValue: '6.4 °C',
    setpoint: '6.0 °C',
    unit: '°C',
  },
  {
    id: 'TGM-N2-PURITY-01',
    tag: 'TGM-N2-PURITY-01',
    name: 'Bulk High Purity N2 Trace Oxygen Contamination',
    system: 'Specialty Gases (TGM)',
    location: 'Gas Pad Bulk Nitrogen Skid',
    priority: 'P1',
    baseWeeklyCount: 11,
    baseMonthlyCount: 44,
    baseDailyCount: 2,
    standingHours: 0,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Cryogenic vaporizer purge switchover blip',
    recommendation: 'Calibrate electrochemical sensor with 1.0 ppm certified span gas',
    owner: 'Elena Rostova (Gas & Chemical)',
    currentValue: '0.85 ppm',
    setpoint: '0.50 ppm',
    unit: 'ppm',
  },
  {
    id: 'HVAC-CR-DP-BAY3',
    tag: 'HVAC-CR-DP-BAY3',
    name: 'Cleanroom Bay 3 (Class 1) Differential Static Pressure',
    system: 'Cleanroom HVAC & FFU',
    location: 'Cleanroom Fab-1 Bay 3',
    priority: 'P2',
    baseWeeklyCount: 9,
    baseMonthlyCount: 36,
    baseDailyCount: 1,
    standingHours: 0,
    isChattering: true,
    chatteringBursts: 3,
    rootCause: 'Airlock door interlock cycling during high-traffic shift transition',
    recommendation: 'Add 15-second alarm delay filter on door open contact',
    owner: 'Chen Wei (HVAC Specialist)',
    currentValue: '21.5 Pa',
    setpoint: '25.0 Pa',
    unit: 'Pa',
  },
  {
    id: 'ELEC-UPS-N1-01',
    tag: 'ELEC-UPS-N1-01',
    name: 'Substation N+1 UPS Inverter Phase Imbalance',
    system: 'Electrical & N+1 UPS',
    location: 'Substation Sub-level B',
    priority: 'P2',
    baseWeeklyCount: 7,
    baseMonthlyCount: 28,
    baseDailyCount: 1,
    standingHours: 31.2,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Single-phase lithography scanner auxiliary load asymmetry',
    recommendation: 'Rebalance phase breakers at PDU distribution panel #4',
    owner: 'Thomas Sterling (Electrical)',
    currentValue: '4.8 %',
    setpoint: '3.0 %',
    unit: '%',
  },
  {
    id: 'TCM-SLURRY-01',
    tag: 'TCM-SLURRY-01',
    name: 'Chemical Dispense Slurry Loop Circulation Flow',
    system: 'Chemical Delivery (TCM)',
    location: 'Chemical Storage Bunker',
    priority: 'P3',
    baseWeeklyCount: 5,
    baseMonthlyCount: 20,
    baseDailyCount: 1,
    standingHours: 0,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Filter pressure buildup across 0.2 µm polishing membrane',
    recommendation: 'Schedule automatic backflush sequence every 12 hours',
    owner: 'Elena Rostova (Gas & Chemical)',
    currentValue: '4.2 L/min',
    setpoint: '4.5 L/min',
    unit: 'L/min',
  },
  {
    id: 'EXH-VOC-ROTOR-01',
    tag: 'EXH-VOC-ROTOR-01',
    name: 'VOC Concentrator Rotor Exhaust Temp',
    system: 'Scrubber & Exhaust',
    location: 'Abatement Utility Yard',
    priority: 'P3',
    baseWeeklyCount: 4,
    baseMonthlyCount: 16,
    baseDailyCount: 1,
    standingHours: 0,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Zeolite regeneration heater overshoot during low solvent influx',
    recommendation: 'Update heater SCR controller deadband by +2.0 °C',
    owner: 'Elena Rostova (Gas & Chemical)',
    currentValue: '188.5 °C',
    setpoint: '185.0 °C',
    unit: '°C',
  },
  {
    id: 'PCW-FLOW-LOOP-02',
    tag: 'PCW-FLOW-LOOP-02',
    name: 'Process Cooling Water Bay 4 Return Flow Rate',
    system: 'Thermal & Chiller Plant',
    location: 'SubFab Bay 4 Return Header',
    priority: 'P3',
    baseWeeklyCount: 3,
    baseMonthlyCount: 12,
    baseDailyCount: 1,
    standingHours: 0,
    isChattering: false,
    chatteringBursts: 0,
    rootCause: 'Manual throttling valve vibration drift on wet bench branch',
    recommendation: 'Lock valve handle with calibrated position collar',
    owner: 'David Kim (Facilities Automation)',
    currentValue: '118 L/min',
    setpoint: '125 L/min',
    unit: 'L/min',
  },
];

export interface StandingAlarmItem {
  tag: string;
  system: string;
  description: string;
  location: string;
  durationHours: number;
  tripValue: string;
  setpoint: string;
  reason: string;
  workOrder: string;
  priority: string;
}

export const STANDING_ALARMS: StandingAlarmItem[] = [
  {
    tag: 'SCRUB-DP-01',
    system: 'Scrubber & Exhaust',
    description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
    location: 'Roof Exhaust Deck',
    durationHours: 26.4,
    tripValue: '342 Pa',
    setpoint: '300 Pa',
    reason: 'Demister pad particulate loading; spray nozzle purge required during PM window',
    workOrder: 'WO-7892 (Scheduled Wed 08:00)',
    priority: 'P2',
  },
  {
    tag: 'ELEC-UPS-N1-01',
    system: 'Electrical & N+1 UPS',
    description: 'Substation N+1 UPS Inverter Phase Imbalance',
    location: 'Substation Sub-level B',
    durationHours: 31.2,
    tripValue: '4.8 %',
    setpoint: '3.0 %',
    reason: 'Single-phase scanner load imbalance on PDU #4 branch circuit',
    workOrder: 'WO-7901 (In Progress)',
    priority: 'P2',
  },
];

export interface ChatteringAlarmItem {
  tag: string;
  description: string;
  togglesPerMin: number;
  totalTogglesWeek: number;
  currentDeadband: string;
  recommendedDeadband: string;
  action: string;
}

export const CHATTERING_ALARMS: ChatteringAlarmItem[] = [
  {
    tag: 'UPW-RESIST-01',
    description: 'UPW Final Polisher Resistivity Loop',
    togglesPerMin: 4.8,
    totalTogglesWeek: 96,
    currentDeadband: '±0.02 MΩ·cm',
    recommendedDeadband: '±0.08 MΩ·cm + 10s Debounce Filter',
    action: 'Widen Deadband & Apply PLC Debounce',
  },
  {
    tag: 'HVAC-CR-DP-BAY3',
    description: 'Cleanroom Bay 3 Differential Static Pressure',
    togglesPerMin: 3.6,
    totalTogglesWeek: 72,
    currentDeadband: '±0.5 Pa',
    recommendedDeadband: '±2.0 Pa (Airlock Interlock Mask)',
    action: 'Add 15s Delay Filter on Door Sensor',
  },
  {
    tag: 'CHILLER-CHW-01',
    description: 'Primary Process Cooling Water Supply Temperature',
    togglesPerMin: 3.1,
    totalTogglesWeek: 54,
    currentDeadband: '±0.1 °C',
    recommendedDeadband: '±0.3 °C (PID Damping Filter)',
    action: 'Adjust Actuator Stroke & Increase Deadband',
  },
];

export interface FloodIncidentItem {
  id: string;
  weekId?: string;
  timeWindow: string;
  durationMinutes: number;
  peakRate10m: number;
  totalEventsInWindow: number;
  triggerTag: string;
  triggerSystem: string;
  rootCause: string;
  suppressionState: 'Active' | 'Suppressed' | 'Resolved';
  actionTaken: string;
  affectedTagsCount: number;
  severity: 'Severe' | 'Moderate' | 'Contained';
}

export const FLOOD_INCIDENTS: FloodIncidentItem[] = [
  {
    id: 'FL-2026-08-28-01',
    weekId: 'W35-2026',
    timeWindow: 'Aug 28, 14:20 – 14:32',
    durationMinutes: 12,
    peakRate10m: 7,
    totalEventsInWindow: 9,
    triggerTag: 'CDA-PRESS-01',
    triggerSystem: 'Clean Dry Air (CDA) & N2',
    rootCause: 'Compressor #3 lead/lag staging delay during simultaneous Bay 2 tooling purge load ramp',
    suppressionState: 'Resolved',
    actionTaken: 'State-based dynamic suppression activated for downstream secondary branch pressure sensors; compressor sequence tuned',
    affectedTagsCount: 5,
    severity: 'Moderate',
  },
  {
    id: 'FL-2026-08-25-01',
    weekId: 'W35-2026',
    timeWindow: 'Aug 25, 09:10 – 09:18',
    durationMinutes: 8,
    peakRate10m: 6,
    totalEventsInWindow: 8,
    triggerTag: 'UPW-RESIST-01',
    triggerSystem: 'Ultra Pure Water (UPW)',
    rootCause: 'Resin polishing bed regeneration switchover hydraulic surge causing microbubble transient',
    suppressionState: 'Resolved',
    actionTaken: 'Auto-masked secondary resistivity warning cascade during 5-minute regeneration sequence and debounced sensor response',
    affectedTagsCount: 4,
    severity: 'Contained',
  },
  {
    id: 'FL-2026-08-20-01',
    weekId: 'W34-2026',
    timeWindow: 'Aug 20, 11:05 – 11:22',
    durationMinutes: 17,
    peakRate10m: 11,
    totalEventsInWindow: 14,
    triggerTag: 'CHILLER-CHW-01',
    triggerSystem: 'Thermal & Chiller Plant',
    rootCause: 'Chiller #2 variable frequency drive trip causing thermal surge across secondary distribution headers',
    suppressionState: 'Resolved',
    actionTaken: 'Fast-start backup chiller #4 auto-engaged; secondary heat exchanger temperature alarms masked during ramp-up',
    affectedTagsCount: 8,
    severity: 'Severe',
  },
  {
    id: 'FL-2026-08-14-01',
    weekId: 'W33-2026',
    timeWindow: 'Aug 14, 16:40 – 16:51',
    durationMinutes: 11,
    peakRate10m: 8,
    totalEventsInWindow: 10,
    triggerTag: 'HVAC-CR-DP-BAY3',
    triggerSystem: 'Cleanroom HVAC & FFU',
    rootCause: 'Cleanroom airlock double-door interlock override during heavy tool move-in sequence',
    suppressionState: 'Resolved',
    actionTaken: 'Applied 15s debounce delay filter on door open contacts and verified positive room pressure boundary',
    affectedTagsCount: 6,
    severity: 'Moderate',
  },
  {
    id: 'FL-2026-08-05-01',
    weekId: 'W32-2026',
    timeWindow: 'Aug 05, 13:15 – 13:30',
    durationMinutes: 15,
    peakRate10m: 12,
    totalEventsInWindow: 16,
    triggerTag: 'ELEC-UPS-N1-01',
    triggerSystem: 'Electrical & N+1 UPS',
    rootCause: 'Substation PDU #4 transformer load stepping transient during main grid feeder maintenance',
    suppressionState: 'Resolved',
    actionTaken: 'Auto-isolated non-critical auxiliary heater breakers; restored steady state voltage envelope',
    affectedTagsCount: 9,
    severity: 'Severe',
  },
  {
    id: 'FL-2026-08-07-01',
    weekId: 'W32-2026',
    timeWindow: 'Aug 07, 10:20 – 10:31',
    durationMinutes: 11,
    peakRate10m: 8,
    totalEventsInWindow: 9,
    triggerTag: 'SCRUB-DP-01',
    triggerSystem: 'Scrubber & Exhaust',
    rootCause: 'Scrubber Tower 1 exhaust damper hunt during wet bench scrubber duct balance test',
    suppressionState: 'Resolved',
    actionTaken: 'Damper actuator limit switch recalibrated and duct velocity interlock tuned',
    affectedTagsCount: 5,
    severity: 'Moderate',
  },
];

export type SuppressionType =
  | 'Operator Shelved'
  | 'State-Based Mask'
  | 'Maintenance Bypass'
  | 'Deadband Debounce'
  | 'First-Out Interlock';

export interface SuppressedAlarmItem {
  id: string;
  tag: string;
  name: string;
  system: SystemCategory;
  location: string;
  priority: PriorityLevel;
  suppressionType: SuppressionType;
  suppressedAt: string;
  durationHours: number;
  expiresAt: string;
  authorizedBy: string;
  reason: string;
  workOrder?: string;
  status: 'Active' | 'Expiring Soon' | 'Automated Mask' | 'Scheduled Release';
  tripCondition: string;
  actionRequired: string;
}

export const SUPPRESSED_ALARMS_DATA: SuppressedAlarmItem[] = [
  {
    id: 'SUPP-01',
    tag: 'HVAC-EXH-FLOW-04',
    name: 'Solvent Exhaust Duct Velocity Sensor 4',
    system: 'Cleanroom HVAC & FFU',
    location: 'Roof Exhaust Deck Plenum 4',
    priority: 'P2',
    suppressionType: 'Operator Shelved',
    suppressedAt: '2026-08-30 08:00',
    durationHours: 8,
    expiresAt: '2026-08-30 16:00',
    authorizedBy: 'Marcus Vance (Shift Lead)',
    reason: 'Pitot tube recalibration and scheduled annual duct traverse flow verification',
    workOrder: 'WO-7930',
    status: 'Expiring Soon',
    tripCondition: 'Velocity < 12.5 m/s (Low Flow Alarm)',
    actionRequired: 'Complete multi-point pitot calibration and re-enable SCADA trip before shift end',
  },
  {
    id: 'SUPP-02',
    tag: 'SCRUB-DP-01',
    name: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
    system: 'Scrubber & Exhaust',
    location: 'Scrubber Deck Roof Tower 1',
    priority: 'P2',
    suppressionType: 'Maintenance Bypass',
    suppressedAt: '2026-08-29 14:30',
    durationHours: 24,
    expiresAt: '2026-08-30 14:30',
    authorizedBy: 'Elena Rostova (Gas & Chemical)',
    reason: 'Demister bed chemical spray wash sequence and differential pressure transmitter manifold flush',
    workOrder: 'WO-7892',
    status: 'Active',
    tripCondition: 'DP > 300 Pa (High Pressure Drop Alarm)',
    actionRequired: 'Verify DP drops below 280 Pa post-wash, remove physical tagout, and restore alarm trip',
  },
  {
    id: 'SUPP-03',
    tag: 'UPW-RECIRC-PUMP-02',
    name: 'UPW Polishing Secondary Booster Pump #2 Vibration High',
    system: 'Ultra Pure Water (UPW)',
    location: 'UPW Polishing Skid Bay 1',
    priority: 'P3',
    suppressionType: 'State-Based Mask',
    suppressedAt: '2026-08-24 00:00',
    durationHours: 168,
    expiresAt: 'Automated on Pump Start',
    authorizedBy: 'David Kim (Facilities Automation)',
    reason: 'Automated PLC state mask: Pump is in standby/off duty cycle; vibration trip suppressed while motor stopped',
    workOrder: 'SYS-LOGIC-04',
    status: 'Automated Mask',
    tripCondition: 'Vibration RMS > 4.5 mm/s',
    actionRequired: 'No action required; SCADA unmasks vibration trip automatically when pump starts',
  },
  {
    id: 'SUPP-04',
    tag: 'ELEC-UPS-N1-01',
    name: 'Substation N+1 UPS Inverter Phase Imbalance Warning',
    system: 'Electrical & N+1 UPS',
    location: 'Substation Sub-level B',
    priority: 'P2',
    suppressionType: 'Operator Shelved',
    suppressedAt: '2026-08-29 20:00',
    durationHours: 12,
    expiresAt: '2026-08-30 08:00',
    authorizedBy: 'Thomas Sterling (Electrical Lead)',
    reason: 'Temporary phase re-routing during PDU #4 distribution breaker replacement and infrared scan',
    workOrder: 'WO-7901',
    status: 'Scheduled Release',
    tripCondition: 'Phase Imbalance > 3.0%',
    actionRequired: 'Verify phase balance < 2.5% after PDU breaker torqueing and re-arm trip',
  },
  {
    id: 'SUPP-05',
    tag: 'CDA-DRYER-DEWPT-02',
    name: 'CDA Desiccant Tower 2 Regeneration Dewpoint Spike',
    system: 'Clean Dry Air (CDA) & N2',
    location: 'CUB Compressor Hall',
    priority: 'P3',
    suppressionType: 'State-Based Mask',
    suppressedAt: '2026-08-26 10:15',
    durationHours: 72,
    expiresAt: 'Automated State Release',
    authorizedBy: 'Chen Wei (HVAC Specialist)',
    reason: 'State-based dynamic masking during 45-minute desiccant bed thermal heating purge',
    workOrder: 'SYS-CDA-BED2',
    status: 'Automated Mask',
    tripCondition: 'Dewpoint > -70.0 °C',
    actionRequired: 'PLC automatically unmasks trip once tower switches to active on-stream drying cycle',
  },
  {
    id: 'SUPP-06',
    tag: 'TGM-HF-SNIFFER-04',
    name: 'VMB-4 Valve Manifold Box HF Sniffer Sample Port Secondary',
    system: 'Specialty Gases (TGM)',
    location: 'Gas Pad Bunker VMB-4',
    priority: 'P1',
    suppressionType: 'Maintenance Bypass',
    suppressedAt: '2026-08-30 06:00',
    durationHours: 6,
    expiresAt: '2026-08-30 12:00',
    authorizedBy: 'Elena Rostova (Gas & Chemical)',
    reason: 'Quarterly zero/span calibration and sniffer sample tubing leak test (Primary optical IR sensor remains 100% active)',
    workOrder: 'WO-7945',
    status: 'Expiring Soon',
    tripCondition: 'HF gas concentration > 0.5 ppm',
    actionRequired: 'Span calibration with 1.0 ppm certified mix, verify sample vacuum flow, re-enable secondary loop',
  },
];

export interface ShelvedAlarmItem {
  tag: string;
  system: string;
  description: string;
  shelvedAt: string;
  shelveDurationHours: number;
  expiresAt: string;
  authorizedBy: string;
  reason: string;
}

export const SHELVED_ALARMS_REGISTER: ShelvedAlarmItem[] = [
  {
    tag: 'HVAC-EXH-FLOW-04',
    system: 'Cleanroom HVAC & FFU',
    description: 'Solvent Exhaust Duct Velocity Sensor 4',
    shelvedAt: '2026-08-30 08:00',
    shelveDurationHours: 8,
    expiresAt: '2026-08-30 16:00',
    authorizedBy: 'Marcus Vance (Shift Lead)',
    reason: 'Pitot tube calibration and scheduled duct inspection (WO-7930)',
  },
];

// ============================================================================
// 7-DAY CALENDAR RANGE (PAST 7 DAYS for 24-Hour Option)
// ============================================================================
export interface CalendarDayItem {
  id: string; // '2026-08-30'
  label: string;
  shortLabel: string;
  date: string;
  dayOfWeek: string;
  dailyTotal: number;
  peakRate: number;
  peakHour: string;
  meanRate: number;
  p1: number;
  p2: number;
  p3: number;
  floodsCount: number;
  summary: string;
}

export const PAST_7_DAYS: CalendarDayItem[] = [
  {
    id: '2026-08-30',
    label: 'Sun, Aug 30, 2026 — Active Day (Today)',
    shortLabel: 'Sun Aug 30',
    date: '2026-08-30',
    dayOfWeek: 'Sunday',
    dailyTotal: 12,
    peakRate: 7,
    peakHour: '14:00',
    meanRate: 0.50,
    p1: 0,
    p2: 1,
    p3: 11,
    floodsCount: 0,
    summary: 'Weekend steady state. Localized purge surge at 14:00 safely handled within operational deadband.',
  },
  {
    id: '2026-08-29',
    label: 'Sat, Aug 29, 2026',
    shortLabel: 'Sat Aug 29',
    date: '2026-08-29',
    dayOfWeek: 'Saturday',
    dailyTotal: 15,
    peakRate: 4,
    peakHour: '11:00',
    meanRate: 0.63,
    p1: 0,
    p2: 2,
    p3: 13,
    floodsCount: 0,
    summary: 'Weekend shift maintenance. Low baseline chattering and smooth chiller loop staging.',
  },
  {
    id: '2026-08-28',
    label: 'Fri, Aug 28, 2026 (Peak Shift Activity)',
    shortLabel: 'Fri Aug 28',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    dailyTotal: 35,
    peakRate: 8,
    peakHour: '14:00',
    meanRate: 1.46,
    p1: 2,
    p2: 5,
    p3: 28,
    floodsCount: 1,
    summary: 'Elevated Friday production rate. Transient CDA header surge at 14:20 suppressed by SCADA logic.',
  },
  {
    id: '2026-08-27',
    label: 'Thu, Aug 27, 2026',
    shortLabel: 'Thu Aug 27',
    date: '2026-08-27',
    dayOfWeek: 'Thursday',
    dailyTotal: 25,
    peakRate: 5,
    peakHour: '10:00',
    meanRate: 1.04,
    p1: 1,
    p2: 4,
    p3: 20,
    floodsCount: 0,
    summary: 'Nominal mid-week manufacturing throughput. No standing alarms breached the 24h limit.',
  },
  {
    id: '2026-08-26',
    label: 'Wed, Aug 26, 2026 (High Tool Batch Volume)',
    shortLabel: 'Wed Aug 26',
    date: '2026-08-26',
    dayOfWeek: 'Wednesday',
    dailyTotal: 38,
    peakRate: 9,
    peakHour: '15:00',
    meanRate: 1.58,
    p1: 3,
    p2: 6,
    p3: 29,
    floodsCount: 0,
    summary: 'High tool load shift. Scrubber tower differential pressure transient under active wet etch cycles.',
  },
  {
    id: '2026-08-25',
    label: 'Tue, Aug 25, 2026',
    shortLabel: 'Tue Aug 25',
    date: '2026-08-25',
    dayOfWeek: 'Tuesday',
    dailyTotal: 31,
    peakRate: 6,
    peakHour: '09:00',
    meanRate: 1.29,
    p1: 2,
    p2: 5,
    p3: 24,
    floodsCount: 1,
    summary: 'Resin regeneration sequence transient at 09:10 on UPW polishing bed, debounced safely.',
  },
  {
    id: '2026-08-24',
    label: 'Mon, Aug 24, 2026 (Week Start Ramp)',
    shortLabel: 'Mon Aug 24',
    date: '2026-08-24',
    dayOfWeek: 'Monday',
    dailyTotal: 26,
    peakRate: 5,
    peakHour: '08:00',
    meanRate: 1.08,
    p1: 1,
    p2: 4,
    p3: 21,
    floodsCount: 0,
    summary: 'Weekly startup ramp. Airlock interlock cycling during tool move-in successfully resolved.',
  },
];

// ============================================================================
// 4-WEEK AUDIT PERIOD RANGE (PAST 4 WEEKS for 7-Day Option)
// ============================================================================
export interface AvailableWeekItem {
  id: string; // 'W35-2026'
  label: string;
  shortLabel: string;
  dateRange: string;
  totalAlarms: number;
  meanRate: number;
  peakDay: string;
  peakHourlyRate: number;
  status: 'COMPLIANT' | 'WARNING' | 'CRITICAL';
  floodsCount: number;
  topBadActor: string;
}

export const AVAILABLE_WEEKS_4W: AvailableWeekItem[] = [
  {
    id: 'W35-2026',
    label: 'Week 35 (Aug 24 – Aug 30, 2026) — Active Audit Period',
    shortLabel: 'Week 35',
    dateRange: 'Aug 24 – Aug 30, 2026',
    totalAlarms: 182,
    meanRate: 1.08,
    peakDay: 'Wed Aug 26',
    peakHourlyRate: 9.0,
    status: 'COMPLIANT',
    floodsCount: 2,
    topBadActor: 'UPW-RESIST-01 (28 events)',
  },
  {
    id: 'W34-2026',
    label: 'Week 34 (Aug 17 – Aug 23, 2026)',
    shortLabel: 'Week 34',
    dateRange: 'Aug 17 – Aug 23, 2026',
    totalAlarms: 212,
    meanRate: 1.26,
    peakDay: 'Thu Aug 20',
    peakHourlyRate: 11.0,
    status: 'COMPLIANT',
    floodsCount: 1,
    topBadActor: 'CHILLER-CHW-01 (32 events)',
  },
  {
    id: 'W33-2026',
    label: 'Week 33 (Aug 10 – Aug 16, 2026)',
    shortLabel: 'Week 33',
    dateRange: 'Aug 10 – Aug 16, 2026',
    totalAlarms: 198,
    meanRate: 1.18,
    peakDay: 'Fri Aug 14',
    peakHourlyRate: 8.0,
    status: 'COMPLIANT',
    floodsCount: 1,
    topBadActor: 'HVAC-CR-DP-BAY3 (29 events)',
  },
  {
    id: 'W32-2026',
    label: 'Week 32 (Aug 03 – Aug 09, 2026)',
    shortLabel: 'Week 32',
    dateRange: 'Aug 03 – Aug 09, 2026',
    totalAlarms: 245,
    meanRate: 1.46,
    peakDay: 'Wed Aug 05',
    peakHourlyRate: 12.0,
    status: 'COMPLIANT',
    floodsCount: 2,
    topBadActor: 'ELEC-UPS-N1-01 (34 events)',
  },
];

// Helper to get 24-hour continuous timeline for any date
export function getHourlyDataForDate(dateStr: string) {
  const dayConfig = PAST_7_DAYS.find(d => d.id === dateStr) || PAST_7_DAYS[0];
  const scale = dayConfig.dailyTotal / 24;

  const baseHourProfiles: { [hour: string]: { mult: number; shift: string; p1Chance: number; p2Chance: number } } = {
    '00:00': { mult: 0.4, shift: 'Night', p1Chance: 0, p2Chance: 0 },
    '01:00': { mult: 0.2, shift: 'Night', p1Chance: 0, p2Chance: 0 },
    '02:00': { mult: 0.3, shift: 'Night', p1Chance: 0, p2Chance: 0 },
    '03:00': { mult: 0.5, shift: 'Night', p1Chance: 0, p2Chance: 0.2 },
    '04:00': { mult: 0.3, shift: 'Night', p1Chance: 0, p2Chance: 0 },
    '05:00': { mult: 0.4, shift: 'Night', p1Chance: 0, p2Chance: 0 },
    '06:00': { mult: 0.6, shift: 'Night', p1Chance: 0, p2Chance: 0.3 },
    '07:00': { mult: 1.6, shift: 'Shift Handover', p1Chance: 0.3, p2Chance: 0.5 },
    '08:00': { mult: 1.4, shift: 'Day', p1Chance: 0.1, p2Chance: 0.4 },
    '09:00': { mult: 1.8, shift: 'Day', p1Chance: 0.3, p2Chance: 0.6 },
    '10:00': { mult: 1.5, shift: 'Day', p1Chance: 0.2, p2Chance: 0.5 },
    '11:00': { mult: 1.1, shift: 'Day', p1Chance: 0.1, p2Chance: 0.3 },
    '12:00': { mult: 1.2, shift: 'Day', p1Chance: 0.1, p2Chance: 0.4 },
    '13:00': { mult: 1.5, shift: 'Day', p1Chance: 0.3, p2Chance: 0.5 },
    '14:00': { mult: 2.4, shift: 'Tool Purge Window', p1Chance: 0.4, p2Chance: 0.8 },
    '15:00': { mult: 1.6, shift: 'Day', p1Chance: 0.2, p2Chance: 0.5 },
    '16:00': { mult: 1.3, shift: 'Day', p1Chance: 0.1, p2Chance: 0.4 },
    '17:00': { mult: 1.0, shift: 'Day', p1Chance: 0.1, p2Chance: 0.2 },
    '18:00': { mult: 1.2, shift: 'Day', p1Chance: 0.1, p2Chance: 0.3 },
    '19:00': { mult: 1.5, shift: 'Shift Handover', p1Chance: 0.2, p2Chance: 0.5 },
    '20:00': { mult: 0.8, shift: 'Night', p1Chance: 0, p2Chance: 0.2 },
    '21:00': { mult: 0.5, shift: 'Night', p1Chance: 0, p2Chance: 0.1 },
    '22:00': { mult: 0.4, shift: 'Night', p1Chance: 0, p2Chance: 0.1 },
    '23:00': { mult: 0.2, shift: 'Night', p1Chance: 0, p2Chance: 0 },
  };

  return Object.entries(baseHourProfiles).map(([time, prof]) => {
    let rate = Math.round(prof.mult * scale);
    if (time === dayConfig.peakHour) {
      rate = dayConfig.peakRate;
    }
    const p1 = Math.min(rate, Math.round(rate * prof.p1Chance * (dayConfig.p1 > 0 ? 1 : 0)));
    const p2 = Math.min(rate - p1, Math.round(rate * prof.p2Chance));
    const p3 = Math.max(0, rate - p1 - p2);
    const peak10m = Math.min(rate, Math.ceil(rate * 0.85));

    return {
      time,
      rate,
      p1,
      p2,
      p3,
      peak10m,
      mean: dayConfig.meanRate,
      upperLimit: 6.0,
      floodLimit: 10.0,
      shift: prof.shift,
    };
  });
}

// Helper to get daily breakdown for any of the 4 weeks
export function getDailyDataForWeek(weekId: string) {
  const weekConfig = AVAILABLE_WEEKS_4W.find(w => w.id === weekId) || AVAILABLE_WEEKS_4W[0];
  
  if (weekId === 'W35-2026') {
    return [
      { day: 'Mon Aug 24', p1: 1, p2: 4, p3: 21, total: 26, ratePerHour: 1.08, targetLimit: 6.0, peakHourRate: 5 },
      { day: 'Tue Aug 25', p1: 2, p2: 5, p3: 24, total: 31, ratePerHour: 1.29, targetLimit: 6.0, peakHourRate: 6 },
      { day: 'Wed Aug 26', p1: 3, p2: 6, p3: 29, total: 38, ratePerHour: 1.58, targetLimit: 6.0, peakHourRate: 9 },
      { day: 'Thu Aug 27', p1: 1, p2: 4, p3: 20, total: 25, ratePerHour: 1.04, targetLimit: 6.0, peakHourRate: 5 },
      { day: 'Fri Aug 28', p1: 2, p2: 5, p3: 28, total: 35, ratePerHour: 1.46, targetLimit: 6.0, peakHourRate: 8 },
      { day: 'Sat Aug 29', p1: 0, p2: 2, p3: 13, total: 15, ratePerHour: 0.63, targetLimit: 6.0, peakHourRate: 4 },
      { day: 'Sun Aug 30', p1: 0, p2: 1, p3: 11, total: 12, ratePerHour: 0.50, targetLimit: 6.0, peakHourRate: 7 },
    ];
  } else if (weekId === 'W34-2026') {
    return [
      { day: 'Mon Aug 17', p1: 2, p2: 6, p3: 24, total: 32, ratePerHour: 1.33, targetLimit: 6.0, peakHourRate: 6 },
      { day: 'Tue Aug 18', p1: 1, p2: 5, p3: 22, total: 28, ratePerHour: 1.17, targetLimit: 6.0, peakHourRate: 5 },
      { day: 'Wed Aug 19', p1: 2, p2: 7, p3: 26, total: 35, ratePerHour: 1.46, targetLimit: 6.0, peakHourRate: 7 },
      { day: 'Thu Aug 20', p1: 4, p2: 8, p3: 31, total: 43, ratePerHour: 1.79, targetLimit: 6.0, peakHourRate: 11 },
      { day: 'Fri Aug 21', p1: 2, p2: 6, p3: 28, total: 36, ratePerHour: 1.50, targetLimit: 6.0, peakHourRate: 8 },
      { day: 'Sat Aug 22', p1: 1, p2: 3, p3: 16, total: 20, ratePerHour: 0.83, targetLimit: 6.0, peakHourRate: 4 },
      { day: 'Sun Aug 23', p1: 0, p2: 2, p3: 16, total: 18, ratePerHour: 0.75, targetLimit: 6.0, peakHourRate: 4 },
    ];
  } else if (weekId === 'W33-2026') {
    return [
      { day: 'Mon Aug 10', p1: 1, p2: 4, p3: 23, total: 28, ratePerHour: 1.17, targetLimit: 6.0, peakHourRate: 5 },
      { day: 'Tue Aug 11', p1: 2, p2: 5, p3: 25, total: 32, ratePerHour: 1.33, targetLimit: 6.0, peakHourRate: 6 },
      { day: 'Wed Aug 12', p1: 1, p2: 4, p3: 22, total: 27, ratePerHour: 1.13, targetLimit: 6.0, peakHourRate: 5 },
      { day: 'Thu Aug 13', p1: 2, p2: 6, p3: 24, total: 32, ratePerHour: 1.33, targetLimit: 6.0, peakHourRate: 6 },
      { day: 'Fri Aug 14', p1: 3, p2: 7, p3: 30, total: 40, ratePerHour: 1.67, targetLimit: 6.0, peakHourRate: 8 },
      { day: 'Sat Aug 15', p1: 1, p2: 3, p3: 17, total: 21, ratePerHour: 0.88, targetLimit: 6.0, peakHourRate: 4 },
      { day: 'Sun Aug 16', p1: 0, p2: 2, p3: 16, total: 18, ratePerHour: 0.75, targetLimit: 6.0, peakHourRate: 3 },
    ];
  } else {
    // W32-2026
    return [
      { day: 'Mon Aug 03', p1: 2, p2: 7, p3: 28, total: 37, ratePerHour: 1.54, targetLimit: 6.0, peakHourRate: 7 },
      { day: 'Tue Aug 04', p1: 3, p2: 8, p3: 31, total: 42, ratePerHour: 1.75, targetLimit: 6.0, peakHourRate: 8 },
      { day: 'Wed Aug 05', p1: 5, p2: 9, p3: 34, total: 48, ratePerHour: 2.00, targetLimit: 6.0, peakHourRate: 12 },
      { day: 'Thu Aug 06', p1: 2, p2: 6, p3: 29, total: 37, ratePerHour: 1.54, targetLimit: 6.0, peakHourRate: 7 },
      { day: 'Fri Aug 07', p1: 3, p2: 7, p3: 32, total: 42, ratePerHour: 1.75, targetLimit: 6.0, peakHourRate: 9 },
      { day: 'Sat Aug 08', p1: 1, p2: 3, p3: 17, total: 21, ratePerHour: 0.88, targetLimit: 6.0, peakHourRate: 4 },
      { day: 'Sun Aug 09', p1: 0, p2: 2, p3: 16, total: 18, ratePerHour: 0.75, targetLimit: 6.0, peakHourRate: 4 },
    ];
  }
}

// Dynamic Top 10 bad actors computed for any 24h date or 7-day week
export function getTop10BadActors(mode: '24hr' | '7days', selectedId: string) {
  let multiplier = 1.0;
  let totalFacilityAlarms = 182;

  if (mode === '24hr') {
    const day = PAST_7_DAYS.find(d => d.id === selectedId) || PAST_7_DAYS[0];
    totalFacilityAlarms = day.dailyTotal;
    multiplier = day.dailyTotal / 26; // normalized around base daily load
  } else {
    const week = AVAILABLE_WEEKS_4W.find(w => w.id === selectedId) || AVAILABLE_WEEKS_4W[0];
    totalFacilityAlarms = week.totalAlarms;
    multiplier = week.totalAlarms / 182; // normalized around Week 35
  }

  // Generate weighted event counts per bad actor
  const calculated = RAW_BAD_ACTORS.map(item => {
    let count = 0;
    if (mode === '24hr') {
      count = Math.max(1, Math.round(item.baseDailyCount * multiplier));
      // Add day-specific signature
      if (selectedId === '2026-08-28' && item.tag === 'CDA-PRESS-01') count += 2;
      if (selectedId === '2026-08-25' && item.tag === 'UPW-RESIST-01') count += 3;
      if (selectedId === '2026-08-26' && item.tag === 'SCRUB-DP-01') count += 2;
    } else {
      count = Math.max(2, Math.round(item.baseWeeklyCount * multiplier));
      // Add week-specific signature
      if (selectedId === 'W34-2026' && item.tag === 'CHILLER-CHW-01') count = 48;
      if (selectedId === 'W33-2026' && item.tag === 'HVAC-CR-DP-BAY3') count = 44;
      if (selectedId === 'W32-2026' && item.tag === 'ELEC-UPS-N1-01') count = 45;
    }

    return {
      ...item,
      eventCount: count,
    };
  });

  const sorted = [...calculated].sort((a, b) => b.eventCount - a.eventCount).slice(0, 10);
  const totalEvents = sorted.reduce((sum, item) => sum + item.eventCount, 0);

  let runningSum = 0;
  return sorted.map((item, idx) => {
    runningSum += item.eventCount;
    const loadPct = totalFacilityAlarms > 0 ? Number(((item.eventCount / totalFacilityAlarms) * 100).toFixed(1)) : 0;
    const cumPct = totalEvents > 0 ? Number(((runningSum / totalEvents) * 100).toFixed(1)) : 0;

    return {
      ...item,
      rank: idx + 1,
      loadPct,
      cumPct,
      totalEvents,
      totalFacilityAlarms,
      shortTag: item.tag.replace('-01', '').replace('HVAC-CR-', 'CR-'),
    };
  });
}

// ============================================================================
// PERIOD SPECIFIC CHATTERING ALARMS MAPPING
// ============================================================================
export const PERIOD_CHATTERING_MAP: Record<string, ChatteringAlarmItem[]> = {
  'W35-2026': [
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 4.8,
      totalTogglesWeek: 96,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm + 10s Debounce Filter',
      action: 'Widen Deadband & Apply PLC Debounce',
    },
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 3.6,
      totalTogglesWeek: 72,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa (Airlock Interlock Mask)',
      action: 'Add 15s Delay Filter on Door Sensor',
    },
    {
      tag: 'CHILLER-CHW-01',
      description: 'Primary Process Cooling Water Supply Temperature',
      togglesPerMin: 3.1,
      totalTogglesWeek: 54,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C (PID Damping Filter)',
      action: 'Adjust Actuator Stroke & Increase Deadband',
    },
  ],
  'W34-2026': [
    {
      tag: 'CHILLER-CHW-01',
      description: 'Primary Process Cooling Water Supply Temperature',
      togglesPerMin: 5.4,
      totalTogglesWeek: 118,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.35 °C (PID Damping Filter)',
      action: 'Adjust Actuator Stroke & Increase Deadband',
    },
    {
      tag: 'CDA-PRESS-01',
      description: 'Clean Dry Air Main Ring Header Pressure',
      togglesPerMin: 4.2,
      totalTogglesWeek: 84,
      currentDeadband: '±0.05 bar',
      recommendedDeadband: '±0.15 bar (Staging Debounce)',
      action: 'Tune Staging Logic Deadband',
    },
    {
      tag: 'TGM-N2-PURITY-01',
      description: 'Bulk High Purity N2 Trace Oxygen Sensor',
      togglesPerMin: 3.8,
      totalTogglesWeek: 68,
      currentDeadband: '±0.05 ppm',
      recommendedDeadband: '±0.12 ppm',
      action: 'Recalibrate Sensor & Widen Deadband',
    },
    {
      tag: 'TCM-SLURRY-01',
      description: 'Chemical Dispense Slurry Loop Circulation Flow',
      togglesPerMin: 3.2,
      totalTogglesWeek: 52,
      currentDeadband: '±0.1 L/min',
      recommendedDeadband: '±0.3 L/min',
      action: 'Schedule Automatic Backflush & Filter Check',
    },
  ],
  'W33-2026': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 5.1,
      totalTogglesWeek: 104,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa (Airlock Interlock Mask)',
      action: 'Add 15s Delay Filter on Door Sensor',
    },
    {
      tag: 'ELEC-UPS-N1-01',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      togglesPerMin: 3.7,
      totalTogglesWeek: 66,
      currentDeadband: '±0.3 %',
      recommendedDeadband: '±0.8 %',
      action: 'Rebalance Phase Breakers on PDU #4',
    },
    {
      tag: 'EXH-VOC-ROTOR-01',
      description: 'VOC Concentrator Rotor Exhaust Temp',
      togglesPerMin: 3.3,
      totalTogglesWeek: 48,
      currentDeadband: '±1.0 °C',
      recommendedDeadband: '±2.5 °C',
      action: 'Tune SCR Temperature Deadband',
    },
  ],
  'W32-2026': [
    {
      tag: 'ELEC-UPS-N1-01',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      togglesPerMin: 6.2,
      totalTogglesWeek: 132,
      currentDeadband: '±0.3 %',
      recommendedDeadband: '±1.0 %',
      action: 'Rebalance Phase Breakers on PDU #4',
    },
    {
      tag: 'SCRUB-DP-01',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      togglesPerMin: 4.8,
      totalTogglesWeek: 98,
      currentDeadband: '±10 Pa',
      recommendedDeadband: '±25 Pa',
      action: 'Perform Demister Pad Chemical Wash',
    },
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 4.1,
      totalTogglesWeek: 82,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Widen Deadband & Apply PLC Debounce',
    },
    {
      tag: 'CHILLER-CHW-01',
      description: 'Primary Process Cooling Water Supply Temperature',
      togglesPerMin: 3.9,
      totalTogglesWeek: 74,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C',
      action: 'PID Rate Derivative Damping',
    },
    {
      tag: 'TCM-SLURRY-01',
      description: 'Chemical Dispense Slurry Loop Circulation Flow',
      togglesPerMin: 3.0,
      totalTogglesWeek: 46,
      currentDeadband: '±0.1 L/min',
      recommendedDeadband: '±0.3 L/min',
      action: 'Backflush Slurry Membrane',
    },
  ],
  // Daily 24hr Mappings
  '2026-08-30': [
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 3.8,
      totalTogglesWeek: 14,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm + 10s Debounce Filter',
      action: 'Widen Deadband & Apply PLC Debounce',
    },
  ],
  '2026-08-29': [
    {
      tag: 'CHILLER-CHW-01',
      description: 'Primary Process Cooling Water Supply Temperature',
      togglesPerMin: 3.2,
      totalTogglesWeek: 12,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C (PID Damping Filter)',
      action: 'Adjust Actuator Stroke & Increase Deadband',
    },
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 3.4,
      totalTogglesWeek: 15,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Apply Debounce Filter',
    },
  ],
  '2026-08-28': [
    {
      tag: 'CDA-PRESS-01',
      description: 'Clean Dry Air Main Ring Header Pressure',
      togglesPerMin: 4.9,
      totalTogglesWeek: 26,
      currentDeadband: '±0.05 bar',
      recommendedDeadband: '±0.15 bar',
      action: 'Tune Staging Logic Deadband',
    },
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 4.5,
      totalTogglesWeek: 22,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Apply PLC Debounce',
    },
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 3.8,
      totalTogglesWeek: 18,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa',
      action: 'Add Door Delay Filter',
    },
    {
      tag: 'CHILLER-CHW-01',
      description: 'Process Cooling Water Supply Temperature',
      togglesPerMin: 3.1,
      totalTogglesWeek: 14,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C',
      action: 'PID Damping Filter',
    },
  ],
  '2026-08-27': [
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 4.2,
      totalTogglesWeek: 19,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Widen Deadband',
    },
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 3.4,
      totalTogglesWeek: 14,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa',
      action: 'Door Sensor Filter',
    },
  ],
  '2026-08-26': [
    {
      tag: 'SCRUB-DP-01',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      togglesPerMin: 4.6,
      totalTogglesWeek: 24,
      currentDeadband: '±10 Pa',
      recommendedDeadband: '±25 Pa',
      action: 'Demister Wash & DP Threshold Adjustment',
    },
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 4.4,
      totalTogglesWeek: 21,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Widen Deadband',
    },
    {
      tag: 'CHILLER-CHW-01',
      description: 'Process Cooling Water Supply Temperature',
      togglesPerMin: 3.3,
      totalTogglesWeek: 16,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C',
      action: 'PID Damping Filter',
    },
  ],
  '2026-08-25': [
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 5.2,
      totalTogglesWeek: 28,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm + 10s Debounce Filter',
      action: 'Widen Deadband & Apply PLC Debounce',
    },
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 3.5,
      totalTogglesWeek: 15,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa',
      action: 'Add 15s Delay Filter',
    },
    {
      tag: 'CHILLER-CHW-01',
      description: 'Process Cooling Water Supply Temperature',
      togglesPerMin: 3.0,
      totalTogglesWeek: 12,
      currentDeadband: '±0.1 °C',
      recommendedDeadband: '±0.3 °C',
      action: 'PID Damping Filter',
    },
  ],
  '2026-08-24': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      togglesPerMin: 4.1,
      totalTogglesWeek: 18,
      currentDeadband: '±0.5 Pa',
      recommendedDeadband: '±2.0 Pa',
      action: 'Airlock Door Sensor Debounce',
    },
    {
      tag: 'UPW-RESIST-01',
      description: 'UPW Final Polisher Resistivity Loop',
      togglesPerMin: 3.9,
      totalTogglesWeek: 16,
      currentDeadband: '±0.02 MΩ·cm',
      recommendedDeadband: '±0.08 MΩ·cm',
      action: 'Widen Deadband',
    },
  ],
};

// ============================================================================
// PERIOD SPECIFIC STANDING ALARMS MAPPING
// ============================================================================
export const PERIOD_STANDING_MAP: Record<string, StandingAlarmItem[]> = {
  'W35-2026': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 26.4,
      tripValue: '342 Pa',
      setpoint: '300 Pa',
      reason: 'Demister pad particulate loading; spray nozzle purge required during PM window',
      workOrder: 'WO-7892 (Scheduled)',
      priority: 'P2',
    },
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      location: 'Substation Sub-level B',
      durationHours: 31.2,
      tripValue: '4.8 %',
      setpoint: '3.0 %',
      reason: 'Single-phase scanner load imbalance on PDU #4 branch circuit',
      workOrder: 'WO-7901 (In Progress)',
      priority: 'P2',
    },
  ],
  'W34-2026': [
    {
      tag: 'CHILLER-CHW-01',
      system: 'Thermal & Chiller Plant',
      description: 'Primary Process Cooling Water Supply Temperature',
      location: 'CUB Chiller Yard',
      durationHours: 28.5,
      tripValue: '6.8 °C',
      setpoint: '6.0 °C',
      reason: 'Chiller #2 VFD drive cooling fan fault causing secondary loop temperature creep',
      workOrder: 'WO-7840 (Completed)',
      priority: 'P1',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 24.1,
      tripValue: '335 Pa',
      setpoint: '300 Pa',
      reason: 'Demister pad wetting and packing particulate drift',
      workOrder: 'WO-7855 (Reviewed)',
      priority: 'P2',
    },
    {
      tag: 'PCW-FLOW-LOOP-02',
      system: 'Thermal & Chiller Plant',
      description: 'Process Cooling Water Bay 4 Return Flow Rate',
      location: 'SubFab Bay 4 Return Header',
      durationHours: 25.8,
      tripValue: '116 L/min',
      setpoint: '125 L/min',
      reason: 'Manual throttling valve position drift on wet bench branch',
      workOrder: 'WO-7862 (Closed)',
      priority: 'P3',
    },
  ],
  'W33-2026': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      location: 'Cleanroom Fab-1 Bay 3',
      durationHours: 29.4,
      tripValue: '21.0 Pa',
      setpoint: '25.0 Pa',
      reason: 'Airlock seal gasket minor wear and exhaust balancing dampener oscillation',
      workOrder: 'WO-7798 (Resolved)',
      priority: 'P2',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 24.8,
      tripValue: '328 Pa',
      setpoint: '300 Pa',
      reason: 'Particulate loading on mist eliminator pad',
      workOrder: 'WO-7810 (Completed)',
      priority: 'P2',
    },
  ],
  'W32-2026': [
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      location: 'Substation Sub-level B',
      durationHours: 35.8,
      tripValue: '5.2 %',
      setpoint: '3.0 %',
      reason: 'Transformer stepping phase imbalance during grid utility maintenance',
      workOrder: 'WO-7740 (Resolved)',
      priority: 'P2',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 30.1,
      tripValue: '350 Pa',
      setpoint: '300 Pa',
      reason: 'Scrubber demister heavy loading during continuous etch tool run',
      workOrder: 'WO-7751 (Completed)',
      priority: 'P2',
    },
    {
      tag: 'HVAC-EXH-FLOW-04',
      system: 'Cleanroom HVAC & FFU',
      description: 'Solvent Exhaust Duct Velocity Sensor 4',
      location: 'Roof Exhaust Deck Plenum 4',
      durationHours: 27.2,
      tripValue: '12.1 m/s',
      setpoint: '13.5 m/s',
      reason: 'Pitot tube differential drift and velocity sensor calibration',
      workOrder: 'WO-7763 (Closed)',
      priority: 'P2',
    },
    {
      tag: 'TGM-HF-SNIFFER-04',
      system: 'Specialty Gases (TGM)',
      description: 'VMB-4 Valve Manifold Box HF Sniffer Sample Port Secondary',
      location: 'Gas Pad Bunker VMB-4',
      durationHours: 24.5,
      tripValue: '0.48 ppm',
      setpoint: '0.50 ppm',
      reason: 'Sniffer sensor zero-point drift during hot weather cycle',
      workOrder: 'WO-7770 (Calibrated)',
      priority: 'P1',
    },
  ],
  // Daily 24hr Mappings
  '2026-08-30': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 26.4,
      tripValue: '342 Pa',
      setpoint: '300 Pa',
      reason: 'Demister pad particulate loading; spray nozzle purge scheduled',
      workOrder: 'WO-7892 (Scheduled)',
      priority: 'P2',
    },
  ],
  '2026-08-29': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 14.4,
      tripValue: '338 Pa',
      setpoint: '300 Pa',
      reason: 'Demister pad particulate loading',
      workOrder: 'WO-7892 (Logged)',
      priority: 'P2',
    },
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      location: 'Substation Sub-level B',
      durationHours: 21.2,
      tripValue: '4.6 %',
      setpoint: '3.0 %',
      reason: 'Single-phase scanner load imbalance on PDU #4 branch circuit',
      workOrder: 'WO-7901 (In Progress)',
      priority: 'P2',
    },
  ],
  '2026-08-28': [
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      location: 'Substation Sub-level B',
      durationHours: 12.0,
      tripValue: '4.5 %',
      setpoint: '3.0 %',
      reason: 'Single-phase scanner load imbalance on PDU #4 branch circuit',
      workOrder: 'WO-7901 (Assigned)',
      priority: 'P2',
    },
    {
      tag: 'CDA-PRESS-01',
      system: 'Clean Dry Air (CDA) & N2',
      description: 'Clean Dry Air Main Ring Header Pressure',
      location: 'Central Utility Building (CUB)',
      durationHours: 4.5,
      tripValue: '7.08 bar',
      setpoint: '7.20 bar',
      reason: 'Compressor staging lag during Friday tool ramp',
      workOrder: 'WO-7922 (Investigating)',
      priority: 'P2',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 6.2,
      tripValue: '330 Pa',
      setpoint: '300 Pa',
      reason: 'Demister particulate accumulation',
      workOrder: 'WO-7892 (Scheduled)',
      priority: 'P2',
    },
  ],
  '2026-08-27': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 8.5,
      tripValue: '325 Pa',
      setpoint: '300 Pa',
      reason: 'Demister particulate accumulation',
      workOrder: 'WO-7892 (Logged)',
      priority: 'P2',
    },
    {
      tag: 'PCW-FLOW-LOOP-02',
      system: 'Thermal & Chiller Plant',
      description: 'Process Cooling Water Bay 4 Return Flow Rate',
      location: 'SubFab Bay 4 Return Header',
      durationHours: 5.2,
      tripValue: '119 L/min',
      setpoint: '125 L/min',
      reason: 'Manual throttling valve vibration drift',
      workOrder: 'WO-7880 (Open)',
      priority: 'P3',
    },
  ],
  '2026-08-26': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 16.0,
      tripValue: '345 Pa',
      setpoint: '300 Pa',
      reason: 'High tool batch volume etch gas influx',
      workOrder: 'WO-7892 (Initiated)',
      priority: 'P2',
    },
    {
      tag: 'TGM-N2-PURITY-01',
      system: 'Specialty Gases (TGM)',
      description: 'Bulk High Purity N2 Trace Oxygen Contamination',
      location: 'Gas Pad Bulk Nitrogen Skid',
      durationHours: 4.8,
      tripValue: '0.82 ppm',
      setpoint: '0.50 ppm',
      reason: 'Cryogenic vaporizer purge switchover blip',
      workOrder: 'WO-7871 (Inspected)',
      priority: 'P1',
    },
    {
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      location: 'Cleanroom Fab-1 Bay 3',
      durationHours: 3.2,
      tripValue: '21.8 Pa',
      setpoint: '25.0 Pa',
      reason: 'Airlock door traffic surge',
      workOrder: 'WO-7865 (Open)',
      priority: 'P2',
    },
  ],
  '2026-08-25': [
    {
      tag: 'UPW-RESIST-01',
      system: 'Ultra Pure Water (UPW)',
      description: 'UPW Final Polisher Resistivity Loop',
      location: 'UPW Polishing Skid Bay 1',
      durationHours: 5.5,
      tripValue: '17.75 MΩ·cm',
      setpoint: '18.00 MΩ·cm',
      reason: 'Resin regeneration transient surge',
      workOrder: 'WO-7850 (Resolved)',
      priority: 'P1',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      location: 'Roof Exhaust Deck',
      durationHours: 4.2,
      tripValue: '320 Pa',
      setpoint: '300 Pa',
      reason: 'Demister pad wetting',
      workOrder: 'WO-7892 (Scheduled)',
      priority: 'P2',
    },
  ],
  '2026-08-24': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      location: 'Cleanroom Fab-1 Bay 3',
      durationHours: 6.8,
      tripValue: '21.2 Pa',
      setpoint: '25.0 Pa',
      reason: 'Weekly tool move-in door cycling',
      workOrder: 'WO-7835 (Closed)',
      priority: 'P2',
    },
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      location: 'Substation Sub-level B',
      durationHours: 4.0,
      tripValue: '4.2 %',
      setpoint: '3.0 %',
      reason: 'Startup auxiliary load switching',
      workOrder: 'WO-7838 (Assigned)',
      priority: 'P2',
    },
  ],
};

// ============================================================================
// PERIOD SPECIFIC SHELVED ALARMS MAPPING
// ============================================================================
export const PERIOD_SHELVED_MAP: Record<string, ShelvedAlarmItem[]> = {
  'W35-2026': [
    {
      tag: 'HVAC-EXH-FLOW-04',
      system: 'Cleanroom HVAC & FFU',
      description: 'Solvent Exhaust Duct Velocity Sensor 4',
      shelvedAt: '2026-08-30 08:00',
      shelveDurationHours: 8,
      expiresAt: '2026-08-30 16:00',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Pitot tube calibration and scheduled duct inspection (WO-7930)',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      shelvedAt: '2026-08-29 14:30',
      shelveDurationHours: 24,
      expiresAt: '2026-08-30 14:30',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Demister bed chemical spray wash sequence (WO-7892)',
    },
  ],
  'W34-2026': [
    {
      tag: 'CHILLER-CHW-01',
      system: 'Thermal & Chiller Plant',
      description: 'Primary Process Cooling Water Supply Temperature',
      shelvedAt: '2026-08-20 12:00',
      shelveDurationHours: 12,
      expiresAt: '2026-08-21 00:00',
      authorizedBy: 'David Kim (Facilities Automation)',
      reason: 'Chiller #2 VFD fan replacement & PID retuning (WO-7840)',
    },
    {
      tag: 'CDA-PRESS-01',
      system: 'Clean Dry Air (CDA) & N2',
      description: 'Clean Dry Air Main Ring Header Pressure',
      shelvedAt: '2026-08-19 08:00',
      shelveDurationHours: 6,
      expiresAt: '2026-08-19 14:00',
      authorizedBy: 'Chen Wei (HVAC Specialist)',
      reason: 'Compressor #3 lead/lag sequencer firmware update',
    },
    {
      tag: 'TGM-N2-PURITY-01',
      system: 'Specialty Gases (TGM)',
      description: 'Bulk High Purity N2 Trace Oxygen Contamination',
      shelvedAt: '2026-08-18 10:00',
      shelveDurationHours: 4,
      expiresAt: '2026-08-18 14:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Electrochemical sensor 1.0 ppm certified span calibration',
    },
  ],
  'W33-2026': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      shelvedAt: '2026-08-14 17:00',
      shelveDurationHours: 8,
      expiresAt: '2026-08-15 01:00',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Cleanroom airlock door gasket inspection and door interlock wiring repair',
    },
  ],
  'W32-2026': [
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      shelvedAt: '2026-08-05 14:00',
      shelveDurationHours: 16,
      expiresAt: '2026-08-06 06:00',
      authorizedBy: 'Thomas Sterling (Electrical Lead)',
      reason: 'Main substation grid feeder maintenance & load balancing',
    },
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      shelvedAt: '2026-08-07 11:00',
      shelveDurationHours: 8,
      expiresAt: '2026-08-07 19:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Scrubber exhaust damper actuator replacement',
    },
    {
      tag: 'TGM-HF-SNIFFER-04',
      system: 'Specialty Gases (TGM)',
      description: 'VMB-4 Valve Manifold Box HF Sniffer Sample Port Secondary',
      shelvedAt: '2026-08-04 08:00',
      shelveDurationHours: 6,
      expiresAt: '2026-08-04 14:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Quarterly sample tubing vacuum leak test',
    },
    {
      tag: 'HVAC-EXH-FLOW-04',
      system: 'Cleanroom HVAC & FFU',
      description: 'Solvent Exhaust Duct Velocity Sensor 4',
      shelvedAt: '2026-08-06 09:00',
      shelveDurationHours: 8,
      expiresAt: '2026-08-06 17:00',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Duct plenum velocity sensor traverse verification',
    },
  ],
  // Daily 24hr Mappings
  '2026-08-30': [
    {
      tag: 'HVAC-EXH-FLOW-04',
      system: 'Cleanroom HVAC & FFU',
      description: 'Solvent Exhaust Duct Velocity Sensor 4',
      shelvedAt: '2026-08-30 08:00',
      shelveDurationHours: 8,
      expiresAt: '2026-08-30 16:00',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Pitot tube calibration and scheduled duct inspection (WO-7930)',
    },
  ],
  '2026-08-29': [
    {
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      description: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      shelvedAt: '2026-08-29 14:30',
      shelveDurationHours: 24,
      expiresAt: '2026-08-30 14:30',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Demister bed chemical spray wash sequence (WO-7892)',
    },
    {
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      description: 'Substation N+1 UPS Inverter Phase Imbalance',
      shelvedAt: '2026-08-29 20:00',
      shelveDurationHours: 12,
      expiresAt: '2026-08-30 08:00',
      authorizedBy: 'Thomas Sterling (Electrical Lead)',
      reason: 'PDU #4 distribution breaker replacement (WO-7901)',
    },
  ],
  '2026-08-28': [
    {
      tag: 'CDA-PRESS-01',
      system: 'Clean Dry Air (CDA) & N2',
      description: 'Clean Dry Air Main Ring Header Pressure',
      shelvedAt: '2026-08-28 14:30',
      shelveDurationHours: 4,
      expiresAt: '2026-08-28 18:30',
      authorizedBy: 'Chen Wei (HVAC Specialist)',
      reason: 'Post-flood compressor staging parameter tuning',
    },
  ],
  '2026-08-27': [
    {
      tag: 'PCW-FLOW-LOOP-02',
      system: 'Thermal & Chiller Plant',
      description: 'Process Cooling Water Bay 4 Return Flow Rate',
      shelvedAt: '2026-08-27 10:00',
      shelveDurationHours: 6,
      expiresAt: '2026-08-27 16:00',
      authorizedBy: 'David Kim (Facilities Automation)',
      reason: 'Manual throttling valve collar locking & recalibration',
    },
  ],
  '2026-08-26': [
    {
      tag: 'TGM-N2-PURITY-01',
      system: 'Specialty Gases (TGM)',
      description: 'Bulk High Purity N2 Trace Oxygen Contamination',
      shelvedAt: '2026-08-26 11:00',
      shelveDurationHours: 6,
      expiresAt: '2026-08-26 17:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Vaporizer purge valve diaphragm replacement',
    },
  ],
  '2026-08-25': [
    {
      tag: 'UPW-RESIST-01',
      system: 'Ultra Pure Water (UPW)',
      description: 'UPW Final Polisher Resistivity Loop',
      shelvedAt: '2026-08-25 09:30',
      shelveDurationHours: 4,
      expiresAt: '2026-08-25 13:30',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Post-flood resin bed settling and optical cell cleaning',
    },
  ],
  '2026-08-24': [
    {
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      description: 'Cleanroom Bay 3 Differential Static Pressure',
      shelvedAt: '2026-08-24 08:30',
      shelveDurationHours: 8,
      expiresAt: '2026-08-24 16:30',
      authorizedBy: 'Chen Wei (HVAC Specialist)',
      reason: 'Airlock door sensor alignment and debounce filter application',
    },
  ],
};

// ============================================================================
// PERIOD SPECIFIC SUPPRESSED ALARMS MAPPING (WEEKS)
// ============================================================================
export const PERIOD_SUPPRESSED_MAP: Record<string, SuppressedAlarmItem[]> = {
  'W35-2026': SUPPRESSED_ALARMS_DATA,
  'W34-2026': [
    {
      id: 'SUPP-W34-01',
      tag: 'CHILLER-CHW-01',
      name: 'Primary Process Cooling Water Supply Temperature',
      system: 'Thermal & Chiller Plant',
      location: 'CUB Chiller Yard',
      priority: 'P1',
      suppressionType: 'Operator Shelved',
      suppressedAt: '2026-08-20 12:00',
      durationHours: 12,
      expiresAt: '2026-08-21 00:00',
      authorizedBy: 'David Kim (Facilities Automation)',
      reason: 'Chiller #2 VFD drive cooling fan replacement & PID retuning',
      workOrder: 'WO-7840',
      status: 'Scheduled Release',
      tripCondition: 'Temp > 6.5 °C',
      actionRequired: 'Verify chiller supply temp stable at 6.0 °C before un-shelving',
    },
    {
      id: 'SUPP-W34-02',
      tag: 'CDA-PRESS-01',
      name: 'Clean Dry Air Main Ring Header Pressure',
      system: 'Clean Dry Air (CDA) & N2',
      location: 'CUB Compressor Hall',
      priority: 'P2',
      suppressionType: 'Operator Shelved',
      suppressedAt: '2026-08-19 08:00',
      durationHours: 6,
      expiresAt: '2026-08-19 14:00',
      authorizedBy: 'Chen Wei (HVAC Specialist)',
      reason: 'Compressor #3 lead/lag sequencer firmware update',
      workOrder: 'WO-7850',
      status: 'Active',
      tripCondition: 'Pressure < 7.05 bar',
      actionRequired: 'Test compressor staging under 80% flow demand',
    },
    {
      id: 'SUPP-W34-03',
      tag: 'UPW-RECIRC-PUMP-02',
      name: 'UPW Polishing Booster Pump #2 Vibration',
      system: 'Ultra Pure Water (UPW)',
      location: 'UPW Polishing Skid Bay 1',
      priority: 'P3',
      suppressionType: 'State-Based Mask',
      suppressedAt: '2026-08-17 00:00',
      durationHours: 168,
      expiresAt: 'Automated on Pump Start',
      authorizedBy: 'David Kim (Facilities Automation)',
      reason: 'PLC State Mask: Pump standby mode',
      workOrder: 'SYS-LOGIC-04',
      status: 'Automated Mask',
      tripCondition: 'Vibration RMS > 4.5 mm/s',
      actionRequired: 'Automated SCADA release on motor contactor engagement',
    },
  ],
  'W33-2026': [
    {
      id: 'SUPP-W33-01',
      tag: 'HVAC-CR-DP-BAY3',
      name: 'Cleanroom Bay 3 Differential Static Pressure',
      system: 'Cleanroom HVAC & FFU',
      location: 'Cleanroom Fab-1 Bay 3',
      priority: 'P2',
      suppressionType: 'Maintenance Bypass',
      suppressedAt: '2026-08-14 17:00',
      durationHours: 8,
      expiresAt: '2026-08-15 01:00',
      authorizedBy: 'Marcus Vance (Shift Lead)',
      reason: 'Cleanroom airlock door gasket inspection and wiring repair',
      workOrder: 'WO-7798',
      status: 'Scheduled Release',
      tripCondition: 'DP < 20.0 Pa',
      actionRequired: 'Perform airlock pressurization decay test',
    },
    {
      id: 'SUPP-W33-02',
      tag: 'CDA-DRYER-DEWPT-02',
      name: 'CDA Desiccant Tower 2 Dewpoint',
      system: 'Clean Dry Air (CDA) & N2',
      location: 'CUB Compressor Hall',
      priority: 'P3',
      suppressionType: 'State-Based Mask',
      suppressedAt: '2026-08-12 09:00',
      durationHours: 72,
      expiresAt: 'Automated State Release',
      authorizedBy: 'Chen Wei (HVAC Specialist)',
      reason: 'State mask during thermal desiccant bed purge',
      workOrder: 'SYS-CDA-BED2',
      status: 'Automated Mask',
      tripCondition: 'Dewpoint > -70.0 °C',
      actionRequired: 'PLC automatically unmasks trip once tower is online',
    },
  ],
  'W32-2026': [
    {
      id: 'SUPP-W32-01',
      tag: 'ELEC-UPS-N1-01',
      name: 'Substation N+1 UPS Inverter Phase Imbalance',
      system: 'Electrical & N+1 UPS',
      location: 'Substation Sub-level B',
      priority: 'P2',
      suppressionType: 'Operator Shelved',
      suppressedAt: '2026-08-05 14:00',
      durationHours: 16,
      expiresAt: '2026-08-06 06:00',
      authorizedBy: 'Thomas Sterling (Electrical Lead)',
      reason: 'Main substation grid feeder maintenance & load rebalance',
      workOrder: 'WO-7740',
      status: 'Scheduled Release',
      tripCondition: 'Phase Imbalance > 3.0%',
      actionRequired: 'Verify balance < 2.5% post-breaker torque',
    },
    {
      id: 'SUPP-W32-02',
      tag: 'SCRUB-DP-01',
      name: 'Acid Exhaust Scrubber Tower 1 Differential Pressure',
      system: 'Scrubber & Exhaust',
      location: 'Roof Exhaust Deck',
      priority: 'P2',
      suppressionType: 'Maintenance Bypass',
      suppressedAt: '2026-08-07 11:00',
      durationHours: 8,
      expiresAt: '2026-08-07 19:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Scrubber exhaust damper actuator replacement',
      workOrder: 'WO-7751',
      status: 'Active',
      tripCondition: 'DP > 300 Pa',
      actionRequired: 'Recalibrate actuator limit switches',
    },
    {
      id: 'SUPP-W32-03',
      tag: 'TGM-HF-SNIFFER-04',
      name: 'VMB-4 Valve Manifold Box HF Sniffer Sample Port Secondary',
      system: 'Specialty Gases (TGM)',
      location: 'Gas Pad Bunker VMB-4',
      priority: 'P1',
      suppressionType: 'Maintenance Bypass',
      suppressedAt: '2026-08-04 08:00',
      durationHours: 6,
      expiresAt: '2026-08-04 14:00',
      authorizedBy: 'Elena Rostova (Gas & Chemical)',
      reason: 'Quarterly zero/span calibration and vacuum leak check',
      workOrder: 'WO-7770',
      status: 'Expiring Soon',
      tripCondition: 'HF gas > 0.5 ppm',
      actionRequired: 'Span calibration with 1.0 ppm certified gas',
    },
  ],
};

// ============================================================================
// COMPREHENSIVE ALARM RATIONALIZATION CHANGE RECORDS (ALL ACTIVE ITEMS)
// ============================================================================
export type RationalizationParamType = 'Setpoint' | 'Delay' | 'Threshold' | 'Deadband';

export interface RationalizationChangeItem {
  id: string;
  initiationDate: string;
  tag: string;
  paramType: RationalizationParamType;
  parameter: string;
  title: string;
  system: string;
  location: string;
  priority: 'P1' | 'P2' | 'P3';
  initialAlarmValue: string;
  newAlarmValue: string;
  changeRationale: string;
  targetBenefit: string;
  status: 'Ready to Deploy' | 'In Progress' | 'MOC Completed' | 'Under Review';
  dueDate: string;
}

export const ALL_RATIONALIZATION_CHANGES: RationalizationChangeItem[] = [
  {
    id: 'RAT-2026-001',
    initiationDate: '2026-08-28',
    tag: 'UPW-RESIST-01',
    paramType: 'Delay',
    parameter: 'Resistivity Low-Low On-Delay Debounce Filter (s)',
    title: 'Resistivity Low-Low Trip Debounce Delay Calibration',
    system: 'Ultra Pure Water (UPW)',
    location: 'Fab-1 Polish Loop Skid B',
    priority: 'P1',
    initialAlarmValue: '0s (Instantaneous)',
    newAlarmValue: '10s (On-Delay Filter)',
    changeRationale: 'Resin bed regeneration rinse causes momentary 2-3s flow dips to 17.8 MΩ·cm with zero effect on fab point-of-use water quality. Adding a 10s debounce on-delay filter eliminates 42 chattering bursts/week while maintaining ASTM D5127 Type E-1 limits.',
    targetBenefit: 'Eliminates 42 chattering bursts/week (-23.1% plant alarm load)',
    status: 'Ready to Deploy',
    dueDate: '2026-09-02',
  },
  {
    id: 'RAT-2026-002',
    initiationDate: '2026-08-27',
    tag: 'SCRUB-DP-01',
    paramType: 'Threshold',
    parameter: 'Demister Bed Differential Pressure High Trip Threshold (Pa)',
    title: 'Scrubber Demister Bed DP High Alarm Threshold Calibration',
    system: 'Scrubber & Exhaust',
    location: 'Acid Exhaust Tower #1',
    priority: 'P2',
    initialAlarmValue: '> 350 Pa',
    newAlarmValue: '> 420 Pa',
    changeRationale: 'Normal airflow modulation during etch tool recipe transitions causes baseline DP to fluctuate up to 365 Pa. Updating the upper trip threshold from 350 Pa to 420 Pa reflects true demister clogging limits while clearing 26.4h false standing alarms.',
    targetBenefit: 'Clears 26.4h standing alarm and prevents spurious technician callouts',
    status: 'In Progress',
    dueDate: '2026-09-03',
  },
  {
    id: 'RAT-2026-003',
    initiationDate: '2026-08-26',
    tag: 'HVAC-CR-DP-BAY3',
    paramType: 'Delay',
    parameter: 'Airlock Door Open Transient Trip Delay (s)',
    title: 'Cleanroom Airlock Bay 3 Static DP Transient Delay',
    system: 'Cleanroom HVAC',
    location: 'Cleanroom Bay 3 Personnel Airlock',
    priority: 'P2',
    initialAlarmValue: '0s (Instantaneous)',
    newAlarmValue: '15s (Transit Delay Filter)',
    changeRationale: 'Personnel transit through interlocked doors causes momentary room DP drop for 4-8 seconds before air balancing restores nominal 25 Pa. Adding a 15s transit delay filter prevents spurious alarms during shift changes while maintaining ISO Class 4 cleanliness.',
    targetBenefit: 'Suppresses 15 false alarms per week during shift change transit',
    status: 'In Progress',
    dueDate: '2026-09-01',
  },
  {
    id: 'RAT-2026-004',
    initiationDate: '2026-08-25',
    tag: 'ELEC-UPS-N1-01',
    paramType: 'Threshold',
    parameter: 'Phase Current Imbalance Warning Threshold (%)',
    title: 'Substation PDU #4 Phase Imbalance Warning Threshold Re-calibration',
    system: 'Electrical & N+1 UPS',
    location: 'Substation Sub-02 PDU-04',
    priority: 'P2',
    initialAlarmValue: '> 5.0% Imbalance',
    newAlarmValue: '> 8.0% Imbalance',
    changeRationale: 'Single-phase lithography chillers cycling causes steady-state 6.2% phase asymmetry. Reclassifying warning threshold from 5.0% to 8.0% resolves persistent standing alarms while maintaining the P1 emergency trip threshold safely at 15.0%.',
    targetBenefit: 'Clears 31.2h standing alarm, aligns with IEEE 519 standards',
    status: 'Under Review',
    dueDate: '2026-09-04',
  },
  {
    id: 'RAT-2026-005',
    initiationDate: '2026-08-20',
    tag: 'CHILLER-CHW-01',
    paramType: 'Deadband',
    parameter: 'CHW Supply Temperature High Alarm Deadband Hysteresis (°C)',
    title: 'Process CHW Supply Temperature Deadband Hysteresis Expansion',
    system: 'Thermal & Chiller Plant',
    location: 'Central Utility Plant (CUP)',
    priority: 'P1',
    initialAlarmValue: '±0.1 °C (Deadband)',
    newAlarmValue: '±0.5 °C (Deadband)',
    changeRationale: 'Compressor staging transient during hot ambient afternoons creates a 20s oscillation around 7.2 °C. Expanding deadband hysteresis from ±0.1 °C to ±0.5 °C eliminates 48 nuisance alarms while protecting wafer fab process tool thermal specifications.',
    targetBenefit: 'Eliminated 48 nuisance temperature alarms/week',
    status: 'MOC Completed',
    dueDate: '2026-08-25',
  },
  {
    id: 'RAT-2026-006',
    initiationDate: '2026-08-19',
    tag: 'CDA-PRESS-01',
    paramType: 'Setpoint',
    parameter: 'Clean Dry Air Header Pressure Low Trip Setpoint (bar)',
    title: 'Clean Dry Air Header Pressure Low Limit Setpoint Tuning',
    system: 'Clean Dry Air (CDA) & N2',
    location: 'Fab-1 CDA Compressor Room',
    priority: 'P2',
    initialAlarmValue: '< 6.8 bar',
    newAlarmValue: '< 6.5 bar',
    changeRationale: 'Simultaneous batch tool purge cycles cause momentary header pressure drops to 6.6 bar for 2 seconds. Lowering low-pressure trip setpoint to 6.5 bar prevents nuisance alarms during normal tool pneumatic cycles while ensuring stable 6.0 bar supply.',
    targetBenefit: 'Reduced pressure cycling alerts by 80%',
    status: 'MOC Completed',
    dueDate: '2026-08-24',
  },
  {
    id: 'RAT-2026-007',
    initiationDate: '2026-08-18',
    tag: 'TGM-N2-PURITY-01',
    paramType: 'Setpoint',
    parameter: 'Trace O2 Impurity High Trip Setpoint (ppb)',
    title: 'Bulk N2 Trace Oxygen Impurity Setpoint Optimization',
    system: 'Specialty Gases (TGM)',
    location: 'Bulk Gas Farm N2 Skid',
    priority: 'P1',
    initialAlarmValue: '> 10.0 ppb',
    newAlarmValue: '> 12.0 ppb',
    changeRationale: 'Switchover between liquid N2 storage tanks produces minor sensor thermal baseline drift of ±1.2 ppb. Rationalizing setpoint from 10.0 ppb to 12.0 ppb eliminates spurious contamination alarms while safely guaranteeing sub-20 ppb semiconductor grade purity.',
    targetBenefit: 'Eliminated 32 false purity alarms during tanker offload',
    status: 'MOC Completed',
    dueDate: '2026-08-23',
  },
  {
    id: 'RAT-2026-008',
    initiationDate: '2026-08-12',
    tag: 'EXH-VOC-ROTOR-01',
    paramType: 'Deadband',
    parameter: 'Zeolite Rotor Desorption Temp Low Alarm Deadband (°C)',
    title: 'VOC Concentrator Zeolite Rotor Temperature Deadband Tuning',
    system: 'Scrubber & Exhaust',
    location: 'VOC Abatement Rotor #2',
    priority: 'P3',
    initialAlarmValue: '±0.0 °C (No Deadband)',
    newAlarmValue: '±5.0 °C (Deadband)',
    changeRationale: 'Low solvent concentration periods during fab tool maintenance reduce combustion enthalpy, causing desorption temperature to fluctuate near 175 °C. Adding ±5.0 °C deadband prevents 48 thermal cycling alarms/week while ensuring 98.5% VOC destruction efficiency.',
    targetBenefit: 'Eliminated 48 thermal cycling alarms during low load',
    status: 'MOC Completed',
    dueDate: '2026-08-17',
  },
  {
    id: 'RAT-2026-009',
    initiationDate: '2026-08-10',
    tag: 'VESDA-MOD-01',
    paramType: 'Threshold',
    parameter: 'Smoke Obscuration Alert Level 1 Threshold (%/m)',
    title: 'Cleanroom Subfab Return Air Smoke Alert Level Threshold Normalization',
    system: 'Fire & Life Safety (VESDA)',
    location: 'Subfab Module 01 Return Plenum',
    priority: 'P1',
    initialAlarmValue: '> 0.015 %/m',
    newAlarmValue: '> 0.025 %/m',
    changeRationale: 'Minor aerosol fluctuations during hot nitrogen baking in diffusion area cause transient 0.018 %/m optical obscuration spikes. Adjusting threshold from 0.015 %/m to 0.025 %/m avoids false fab evacuation callouts while exceeding NFPA 72 requirements.',
    targetBenefit: 'Prevented 2 false emergency subfab alerts',
    status: 'MOC Completed',
    dueDate: '2026-08-14',
  },
  {
    id: 'RAT-2026-010',
    initiationDate: '2026-08-08',
    tag: 'TCM-ACID-DRAIN-01',
    paramType: 'Delay',
    parameter: 'Neutralization Pit Inflow pH Low Transit Delay (s)',
    title: 'Acid Waste Neutralization Inflow pH Transit Delay Filter',
    system: 'Chemical Delivery (TCM)',
    location: 'AWN Sump Pit #2',
    priority: 'P2',
    initialAlarmValue: '0s (Instantaneous)',
    newAlarmValue: '10s (Transit Delay Filter)',
    changeRationale: 'Sudden batch dump of dilute HF from wet bench creates a 5-second pulse at pH 5.8 before caustic injection mixes in the equalizing basin. Adding a 10s transit debounce delay avoids false alarms while holding effluent pH within EPA 6.0-9.0 discharge envelope.',
    targetBenefit: 'Eliminated 18 weekly AWN sump false triggers',
    status: 'MOC Completed',
    dueDate: '2026-08-11',
  },
];

// ============================================================================
// PERIOD SPECIFIC ENGINEERING ACTIONS MAPPING (WEEKS)
// ============================================================================
export const PERIOD_ACTIONS_MAP: Record<string, any[]> = {
  'W35-2026': [
    {
      id: 'ACT-W35-01',
      title: 'UPW Resistivity Deadband Filter Widening',
      tag: 'UPW-RESIST-01',
      owner: 'Marcus Vance (Shift Lead)',
      dueDate: '2026-09-02',
      status: 'Ready to Deploy',
      priority: 'P1',
      impact: 'Will eliminate 42 chattering bursts/week (-23.1% plant alarm load)',
    },
    {
      id: 'ACT-W35-02',
      title: 'Scrubber Tower 1 Demister Bed Chemical Cleanout',
      tag: 'SCRUB-DP-01',
      owner: 'Elena Rostova (Gas & Chemical)',
      dueDate: '2026-09-03',
      status: 'Scheduled PM',
      priority: 'P2',
      impact: 'Clears 26.4h standing alarm and restores DP to nominal 280 Pa',
    },
    {
      id: 'ACT-W35-03',
      title: 'Airlock Door Open Interlock 15s Delay Filter',
      tag: 'HVAC-CR-DP-BAY3',
      owner: 'Chen Wei (HVAC Specialist)',
      dueDate: '2026-09-01',
      status: 'In Progress',
      priority: 'P2',
      impact: 'Suppresses 15 false alarms during shift change personnel transit',
    },
    {
      id: 'ACT-W35-04',
      title: 'Substation PDU #4 Single-Phase Load Rebalance',
      tag: 'ELEC-UPS-N1-01',
      owner: 'Thomas Sterling (Electrical)',
      dueDate: '2026-09-04',
      status: 'Reviewing Schematic',
      priority: 'P2',
      impact: 'Clears 31.2h standing alarm and eliminates phase imbalance trip risk',
    },
  ],
  'W34-2026': [
    {
      id: 'ACT-W34-01',
      title: 'Chiller #2 VFD Cooling Fan Replacement',
      tag: 'CHILLER-CHW-01',
      owner: 'David Kim (Facilities Automation)',
      dueDate: '2026-08-25',
      status: 'Completed',
      priority: 'P1',
      impact: 'Eliminated 48 nuisance temperature excursion alarms',
    },
    {
      id: 'ACT-W34-02',
      title: 'CDA Compressor #3 Staging Logic Tuning',
      tag: 'CDA-PRESS-01',
      owner: 'Chen Wei (HVAC Specialist)',
      dueDate: '2026-08-24',
      status: 'Completed',
      priority: 'P2',
      impact: 'Reduced header pressure cycling during tool batch change',
    },
    {
      id: 'ACT-W34-03',
      title: 'Nitrogen Vaporizer Purge Switchover Span Calibration',
      tag: 'TGM-N2-PURITY-01',
      owner: 'Elena Rostova (Gas & Chemical)',
      dueDate: '2026-08-23',
      status: 'Completed',
      priority: 'P1',
      impact: 'Calibrated trace oxygen sensor to 1.0 ppm span certified mix',
    },
  ],
  'W33-2026': [
    {
      id: 'ACT-W33-01',
      title: 'Cleanroom Airlock Gasket Replacement & Door Sensor Alignment',
      tag: 'HVAC-CR-DP-BAY3',
      owner: 'Marcus Vance (Shift Lead)',
      dueDate: '2026-08-18',
      status: 'Completed',
      priority: 'P2',
      impact: 'Restored static pressure boundary in Bay 3 to 25.0 Pa nominal',
    },
    {
      id: 'ACT-W33-02',
      title: 'VOC Concentrator SCR Temperature Controller Deadband Tuning',
      tag: 'EXH-VOC-ROTOR-01',
      owner: 'Elena Rostova (Gas & Chemical)',
      dueDate: '2026-08-17',
      status: 'Completed',
      priority: 'P3',
      impact: 'Eliminated 48 thermal cycling alarms during low solvent periods',
    },
  ],
  'W32-2026': [
    {
      id: 'ACT-W32-01',
      title: 'Substation PDU #4 Auxiliary Load Phase Balancing',
      tag: 'ELEC-UPS-N1-01',
      owner: 'Thomas Sterling (Electrical Lead)',
      dueDate: '2026-08-10',
      status: 'Completed',
      priority: 'P2',
      impact: 'Rebalanced phase imbalance down from 5.2% to 1.8%',
    },
    {
      id: 'ACT-W32-02',
      title: 'Scrubber Tower 1 Exhaust Damper Actuator Replacement',
      tag: 'SCRUB-DP-01',
      owner: 'Elena Rostova (Gas & Chemical)',
      dueDate: '2026-08-09',
      status: 'Completed',
      priority: 'P2',
      impact: 'Stabilized scrubber differential pressure under 300 Pa',
    },
  ],
};

export interface PmDeliverableItem {
  id: string;
  workOrder: string;
  equipment: string;
  tag: string;
  system: string;
  location: string;
  pmType: 'Preventive Maintenance' | 'Calibration & Span' | 'Sensor Overhaul' | 'Filter & Demister Wash';
  interval: 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual';
  technician: string;
  scheduledDate: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Deferred';
  scope: string;
  alarmImpact: string;
}

export const PERIOD_PM_DELIVERABLES_MAP: Record<string, PmDeliverableItem[]> = {
  'W35-2026': [
    {
      id: 'PM-2026-W35-01',
      workOrder: 'WO-8901',
      equipment: 'UPW Polishing Skid Bay 1 Resin Bed & Resistivity Cell',
      tag: 'UPW-RESIST-01',
      system: 'Ultra Pure Water (UPW)',
      location: 'UPW Polishing Skid Bay 1',
      pmType: 'Calibration & Span',
      interval: 'Monthly',
      technician: 'Marcus Vance (Shift Lead)',
      scheduledDate: '2026-09-02',
      status: 'In Progress',
      scope: 'Dual-point reference cell calibration, electrode acid wash, and 10s on-delay debounce validation.',
      alarmImpact: 'Eliminates 28 weekly chattering events (-23% plant load)',
    },
    {
      id: 'PM-2026-W35-02',
      workOrder: 'WO-8904',
      equipment: 'Acid Scrubber Tower 1 Demister Bed & DP Impulse Lines',
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      location: 'Scrubber Deck Roof',
      pmType: 'Filter & Demister Wash',
      interval: 'Quarterly',
      technician: 'Elena Rostova (Gas & Chemical)',
      scheduledDate: '2026-09-03',
      status: 'Scheduled',
      scope: 'Chemical spray nozzle descaling, demister bed backwash, and impulse line blowdown purge.',
      alarmImpact: 'Clears 26.4h standing alarm & restores DP to nominal 280 Pa',
    },
    {
      id: 'PM-2026-W35-03',
      workOrder: 'WO-8908',
      equipment: 'Cleanroom Fab-1 Bay 3 Airlock Door Interlocks & Seal Gasket',
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      location: 'Cleanroom Fab-1 Bay 3',
      pmType: 'Preventive Maintenance',
      interval: 'Bi-Weekly',
      technician: 'Chen Wei (HVAC Specialist)',
      scheduledDate: '2026-09-01',
      status: 'In Progress',
      scope: 'Magnetic door switch realignment, pneumatic door closer torque check, and 15s transit delay logic test.',
      alarmImpact: 'Suppresses 9 nuisance alarms during shift transit',
    },
    {
      id: 'PM-2026-W35-04',
      workOrder: 'WO-8912',
      equipment: 'Substation PDU #4 Auxiliary Switchgear & Phase Bus',
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      location: 'Substation Sub-level B',
      pmType: 'Preventive Maintenance',
      interval: 'Monthly',
      technician: 'Thomas Sterling (Electrical)',
      scheduledDate: '2026-09-04',
      status: 'Scheduled',
      scope: 'Thermal imaging infrared scan, branch circuit rebalancing, and neutral bus torque verification.',
      alarmImpact: 'Clears 31.2h standing alarm & prevents phase imbalance trip',
    },
    {
      id: 'PM-2026-W35-05',
      workOrder: 'WO-8915',
      equipment: 'Gas Pad Bulk Nitrogen Supply Skid Trace O2 Analyzer',
      tag: 'TGM-N2-PURITY-01',
      system: 'Specialty Gases (TGM)',
      location: 'Gas Pad Bulk Nitrogen Skid',
      pmType: 'Calibration & Span',
      interval: 'Monthly',
      technician: 'Elena Rostova (Gas & Chemical)',
      scheduledDate: '2026-09-03',
      status: 'Scheduled',
      scope: 'Electrochemical trace oxygen cell span calibration against 1.0 ppm certified gas mix.',
      alarmImpact: 'Prevents false P1 gas purity excursions',
    },
    {
      id: 'PM-2026-W35-06',
      workOrder: 'WO-8919',
      equipment: 'Central Chiller CHW-01 Supply Temp RTD & Variable Flow Actuator',
      tag: 'CHILLER-CHW-01',
      system: 'Thermal & Chiller Plant',
      location: 'CUB Chiller Yard',
      pmType: 'Sensor Overhaul',
      interval: 'Quarterly',
      technician: 'David Kim (Automation)',
      scheduledDate: '2026-09-02',
      status: 'In Progress',
      scope: 'Dual PT100 RTD resistance cross-check, thermowell thermal paste refresh, and modulating valve loop calibration.',
      alarmImpact: 'Suppresses 14 nuisance thermal cycling alarms',
    },
  ],
  'W34-2026': [
    {
      id: 'PM-2026-W34-01',
      workOrder: 'WO-8840',
      equipment: 'Chiller #2 VFD Cooling Fan Assembly & Heat Sink Module',
      tag: 'CHILLER-CHW-01',
      system: 'Thermal & Chiller Plant',
      location: 'CUB Chiller Yard',
      pmType: 'Preventive Maintenance',
      interval: 'Quarterly',
      technician: 'David Kim (Automation)',
      scheduledDate: '2026-08-25',
      status: 'Completed',
      scope: 'Replaced dual axial cooling fans and thermal paste on IGBT power modules.',
      alarmImpact: 'Eliminated 32 nuisance temperature excursion alarms',
    },
    {
      id: 'PM-2026-W34-02',
      workOrder: 'WO-8845',
      equipment: 'CDA Compressor Header Pressure Transmitter #3',
      tag: 'CDA-PRESS-01',
      system: 'Clean Dry Air (CDA) & N2',
      location: 'Central Utility Building (CUB)',
      pmType: 'Calibration & Span',
      interval: 'Monthly',
      technician: 'Chen Wei (HVAC Specialist)',
      scheduledDate: '2026-08-24',
      status: 'Completed',
      scope: 'Zero/span trim on piezoresistive pressure transmitter and 3-way manifold seal replacement.',
      alarmImpact: 'Eliminated 22 header pressure cycling alarms',
    },
    {
      id: 'PM-2026-W34-03',
      workOrder: 'WO-8850',
      equipment: 'Bulk Nitrogen Vaporizer Skid Analytical Line Purge',
      tag: 'TGM-N2-PURITY-01',
      system: 'Specialty Gases (TGM)',
      location: 'Gas Pad Bulk Nitrogen Skid',
      pmType: 'Calibration & Span',
      interval: 'Monthly',
      technician: 'Elena Rostova (Gas & Chemical)',
      scheduledDate: '2026-08-23',
      status: 'Completed',
      scope: 'Replaced desiccant trap and executed zero-point argon baseline test.',
      alarmImpact: 'Stabilized trace O2 readings below 0.1 ppm spec',
    },
  ],
  'W33-2026': [
    {
      id: 'PM-2026-W33-01',
      workOrder: 'WO-8780',
      equipment: 'Cleanroom Fab-1 Bay 3 Fan Filter Units & Airlock Gaskets',
      tag: 'HVAC-CR-DP-BAY3',
      system: 'Cleanroom HVAC & FFU',
      location: 'Cleanroom Fab-1 Bay 3',
      pmType: 'Preventive Maintenance',
      interval: 'Monthly',
      technician: 'Marcus Vance (Shift Lead)',
      scheduledDate: '2026-08-18',
      status: 'Completed',
      scope: 'Replaced silicone perimeter door seals and realigned optical beam sensors.',
      alarmImpact: 'Eliminated 29 pressure transient alarms',
    },
    {
      id: 'PM-2026-W33-02',
      workOrder: 'WO-8788',
      equipment: 'VOC Concentrator Regenerative Thermal Oxidizer Burner Skid',
      tag: 'EXH-VOC-ROTOR-01',
      system: 'Scrubber & Exhaust',
      location: 'Abatement Utility Yard',
      pmType: 'Sensor Overhaul',
      interval: 'Quarterly',
      technician: 'Elena Rostova (Gas & Chemical)',
      scheduledDate: '2026-08-17',
      status: 'Completed',
      scope: 'Cleaned flame scanner optical lens and re-tuned PID proportional band.',
      alarmImpact: 'Eliminated thermal runaway cycling alarms',
    },
  ],
  'W32-2026': [
    {
      id: 'PM-2026-W32-01',
      workOrder: 'WO-8710',
      equipment: 'Substation PDU #4 Transformer Neutral Bus & Breaker Bank',
      tag: 'ELEC-UPS-N1-01',
      system: 'Electrical & N+1 UPS',
      location: 'Substation Sub-level B',
      pmType: 'Preventive Maintenance',
      interval: 'Semi-Annual',
      technician: 'Thomas Sterling (Electrical Lead)',
      scheduledDate: '2026-08-10',
      status: 'Completed',
      scope: 'Re-torqued terminal connections and balanced secondary feeder loads.',
      alarmImpact: 'Eliminated 34 phase imbalance standing alarm hours',
    },
    {
      id: 'PM-2026-W32-02',
      workOrder: 'WO-8718',
      equipment: 'Acid Exhaust Scrubber Deck Variable Pitch Fan Damper',
      tag: 'SCRUB-DP-01',
      system: 'Scrubber & Exhaust',
      location: 'Scrubber Deck Roof',
      pmType: 'Preventive Maintenance',
      interval: 'Monthly',
      technician: 'Elena Rostova (Gas & Chemical)',
      scheduledDate: '2026-08-09',
      status: 'Completed',
      scope: 'Replaced damper linkage ball joints and greased drive bearings.',
      alarmImpact: 'Stabilized static suction pressure within ±15 Pa',
    },
  ],
};


