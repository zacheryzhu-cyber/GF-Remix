import { WorkPermitType, WorkPermitStatus, Shift12HourWindow } from '../types';

export interface ShiftCriticalAlarm {
  id: string;
  time: string;
  title: string;
  system: string;
  severity: 'Critical';
  description: string;
  containmentAction: string;
  responsibleLead: string;
  status: 'Resolved' | 'Contained' | 'In Progress';
}

export interface ShiftCpkParameter {
  id: string;
  name: string;
  system: string;
  unit: string;
  target: number;
  lsl: number;
  usl: number;
  period1: {
    mean: number;
    sigma: number;
    cpk: number;
    status: 'In Control (Cpk >= 1.33)' | 'Warning (1.00 <= Cpk < 1.33)' | 'Out of Spec (Cpk < 1.00)';
  };
  period2: {
    mean: number;
    sigma: number;
    cpk: number;
    status: 'In Control (Cpk >= 1.33)' | 'Warning (1.00 <= Cpk < 1.33)' | 'Out of Spec (Cpk < 1.00)';
  };
  shiftCombined: {
    mean: number;
    sigma: number;
    cpk: number;
    status: 'In Control (Cpk >= 1.33)' | 'Warning (1.00 <= Cpk < 1.33)' | 'Out of Spec (Cpk < 1.00)';
  };
}

export interface ShiftPermitRecord {
  id: string;
  workOrderId?: string;
  title: string;
  permitType: WorkPermitType;
  status: WorkPermitStatus;
  location: string;
  shiftWindow: Shift12HourWindow;
  shiftDate: string;
  validFrom: string;
  validTo: string;
  closedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface ShiftReportEntry {
  id: string;
  date: string;
  formattedDate: string;
  shiftType: Shift12HourWindow;
  shiftCode: 'Day' | 'Night';
  label: string;
  leadEngineer: string;
  incomingLead: string;
  facilityManager: string;
  approvalStatus: 'Draft' | 'Pending Review' | 'Approved by Lead' | 'Signed-Off by Ops Manager';
  executiveSummary: string;
  criticalAlarm: ShiftCriticalAlarm | null; // Maximum 1 critical alarm only!
  cpkData: ShiftCpkParameter[];
  workPermits: ShiftPermitRecord[];
}

// Generate base CPK dataset helper
function generateCpkData(shiftCode: 'Day' | 'Night', seed: number): ShiftCpkParameter[] {
  const upwCpk1 = +(1.58 + (seed % 5) * 0.02).toFixed(2);
  const upwCpk2 = +(1.52 + ((seed + 2) % 5) * 0.02).toFixed(2);
  const upwComb = +((upwCpk1 + upwCpk2) / 2).toFixed(2);

  const tempCpk1 = +(1.85 + (seed % 4) * 0.03).toFixed(2);
  const tempCpk2 = +(1.80 + ((seed + 1) % 4) * 0.03).toFixed(2);
  const tempComb = +((tempCpk1 + tempCpk2) / 2).toFixed(2);

  const rhCpk1 = +(1.70 + (seed % 3) * 0.02).toFixed(2);
  const rhCpk2 = +(1.66 + ((seed + 2) % 3) * 0.02).toFixed(2);
  const rhComb = +((rhCpk1 + rhCpk2) / 2).toFixed(2);

  const cdaCpk1 = +(1.34 + (seed % 4) * 0.02).toFixed(2);
  const cdaCpk2 = +(1.28 + ((seed + 1) % 4) * 0.02).toFixed(2);
  const cdaComb = +((cdaCpk1 + cdaCpk2) / 2).toFixed(2);

  const chwCpk1 = +(2.44 + (seed % 3) * 0.02).toFixed(2);
  const chwCpk2 = +(2.40 + ((seed + 1) % 3) * 0.02).toFixed(2);
  const chwComb = +((chwCpk1 + chwCpk2) / 2).toFixed(2);

  const exhCpk1 = +(2.26 + (seed % 4) * 0.02).toFixed(2);
  const exhCpk2 = +(2.21 + ((seed + 2) % 4) * 0.02).toFixed(2);
  const exhComb = +((exhCpk1 + exhCpk2) / 2).toFixed(2);

  return [
    {
      id: 'CPK-UPW-RES',
      name: 'UPW Product Water Resistivity',
      system: 'Ultra Pure Water (UPW)',
      unit: 'MΩ·cm',
      target: 18.20,
      lsl: 18.00,
      usl: 18.30,
      period1: { mean: 18.22, sigma: 0.022, cpk: upwCpk1, status: upwCpk1 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      period2: { mean: 18.19, sigma: 0.026, cpk: upwCpk2, status: upwCpk2 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      shiftCombined: { mean: 18.21, sigma: 0.024, cpk: upwComb, status: upwComb >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
    },
    {
      id: 'CPK-CR-TEMP',
      name: 'Cleanroom Bay 1-3 Temperature',
      system: 'Cleanroom HVAC & FFU',
      unit: '°C',
      target: 21.00,
      lsl: 20.70,
      usl: 21.30,
      period1: { mean: 21.01, sigma: 0.048, cpk: tempCpk1, status: tempCpk1 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      period2: { mean: 21.04, sigma: 0.052, cpk: tempCpk2, status: tempCpk2 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      shiftCombined: { mean: 21.02, sigma: 0.050, cpk: tempComb, status: tempComb >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
    },
    {
      id: 'CPK-CR-RH',
      name: 'Cleanroom Bay 1-3 Relative Humidity',
      system: 'Cleanroom HVAC & FFU',
      unit: '%RH',
      target: 42.00,
      lsl: 40.00,
      usl: 44.00,
      period1: { mean: 42.06, sigma: 0.35, cpk: rhCpk1, status: rhCpk1 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      period2: { mean: 42.15, sigma: 0.39, cpk: rhCpk2, status: rhCpk2 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      shiftCombined: { mean: 42.10, sigma: 0.37, cpk: rhComb, status: rhComb >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
    },
    {
      id: 'CPK-CDA-PRESS',
      name: 'Clean Dry Air (CDA) Header Pressure',
      system: 'Clean Dry Air (CDA) & N2',
      unit: 'bar',
      target: 7.20,
      lsl: 6.80,
      usl: 7.60,
      period1: { mean: 7.18, sigma: 0.082, cpk: cdaCpk1, status: cdaCpk1 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      period2: { mean: 7.12, sigma: 0.091, cpk: cdaCpk2, status: cdaCpk2 >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
      shiftCombined: { mean: 7.15, sigma: 0.087, cpk: cdaComb, status: cdaComb >= 1.33 ? 'In Control (Cpk >= 1.33)' : 'Warning (1.00 <= Cpk < 1.33)' },
    },
    {
      id: 'CPK-CHW-TEMP',
      name: 'Chilled Water Supply Temperature',
      system: 'Thermal & Chiller Plant',
      unit: '°C',
      target: 6.50,
      lsl: 5.80,
      usl: 7.20,
      period1: { mean: 6.50, sigma: 0.092, cpk: chwCpk1, status: 'In Control (Cpk >= 1.33)' },
      period2: { mean: 6.52, sigma: 0.096, cpk: chwCpk2, status: 'In Control (Cpk >= 1.33)' },
      shiftCombined: { mean: 6.51, sigma: 0.094, cpk: chwComb, status: 'In Control (Cpk >= 1.33)' },
    },
    {
      id: 'CPK-EXHAUST-SP',
      name: 'Toxic Scrubber Exhaust Static Pressure',
      system: 'Scrubber & Exhaust',
      unit: 'Pa',
      target: -250,
      lsl: -300,
      usl: -200,
      period1: { mean: -252, sigma: 6.8, cpk: exhCpk1, status: 'In Control (Cpk >= 1.33)' },
      period2: { mean: -248, sigma: 7.4, cpk: exhCpk2, status: 'In Control (Cpk >= 1.33)' },
      shiftCombined: { mean: -250, sigma: 7.1, cpk: exhComb, status: 'In Control (Cpk >= 1.33)' },
    },
  ];
}

// 8 days: Today (2026-09-02) down to Today - 7 days (2026-08-26)
export const SHIFT_REPORT_PRESETS: ShiftReportEntry[] = [
  // ---------------------------------------------------------------------------
  // DAY 0: 2026-09-02 (TODAY)
  // ---------------------------------------------------------------------------
  {
    id: '2026-09-02_Day',
    date: '2026-09-02',
    formattedDate: 'Wed, Sep 02, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-09-02 — Day Shift (07:00 - 19:00) [Today]',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Facilities operations throughout Day Shift maintained continuous cleanroom specifications across all Fab 1 Bays. UPW product water resistivity averaged 18.21 MΩ·cm, and cleanroom particulate levels complied with ISO Class 1-4 boundaries. Chiller #3 PM concluded with zero thermal disturbance. All shift work permits were finalized before handover.',
    criticalAlarm: {
      id: 'ALM-CRIT-902D',
      time: '14:22',
      title: 'Subfab Silane TGDS Sensor Pre-Warning Check',
      system: 'Specialty Gases (TGM)',
      severity: 'Critical',
      description: 'Pyrophoric sensor B04 pre-warning triggered (0.8 ppm vs TLV 5.0 ppm limit) during VMB manifold swap.',
      containmentAction: 'Field technician deployed with portable sniffer; verified zero ambient leak; high-purity N2 purge completed with zero excursion.',
      responsibleLead: 'Elena Rostova',
      status: 'Resolved',
    },
    cpkData: generateCpkData('Day', 1),
    workPermits: [
      {
        id: 'WP-8801',
        workOrderId: 'WO-4103',
        title: 'Exhaust duct manifold flange alignment and TIG weld sealing',
        permitType: 'Hot Work',
        status: 'closed',
        location: 'Subfab Roof Deck A (Scrubber Stack 4)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '08:00',
        validTo: '17:30',
        closedAt: '17:30',
        notes: '60-minute post-weld fire watch concluded with zero hot spots. Duct sealed and verified airtight.',
      },
      {
        id: 'WP-8802',
        workOrderId: 'WO-4102',
        title: 'UPW Polishing Loop Secondary Pump Mechanical Seal Overhaul',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Building 1 - SubFab Loop B (UPW Polish Room)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '08:30',
        validTo: '17:15',
        closedAt: '17:15',
        notes: 'Mechanical seal replacement and hydrostatic leak test completed. Secondary pump restored to standby.',
      },
      {
        id: 'WP-8803',
        workOrderId: 'WO-4098',
        title: 'Cleanroom FFU Ceiling Plenum Filter Inspection & Differential Pressure Check',
        permitType: 'Working at Heights',
        status: 'closed',
        location: 'Fab 1 Litho Bay 1 Overhead Gantry (Level 3)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '10:00',
        validTo: '15:45',
        closedAt: '15:45',
        notes: 'Plenum filter differential pressure verified within spec (142 Pa). Catwalk cleared.',
      },
      {
        id: 'WP-8804',
        workOrderId: 'WO-4091',
        title: 'Acid Waste Neutralization (AWN) Lift Station Sump Sediment Cleanout',
        permitType: 'Confined Space Entry',
        status: 'closed',
        location: 'Chemical Basement AWN Basin #2 (Zone 4)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '07:30',
        validTo: '12:15',
        closedAt: '12:15',
        notes: 'Sediment flush completed successfully. Sump sealed and returned to automatic pH dosing.',
      },
      {
        id: 'WP-8805',
        workOrderId: 'WO-4088',
        title: 'Process Cooling Loop Chilled Water Bypass Strainer Flush',
        permitType: 'Cold Work',
        status: 'rejected',
        location: 'Utility Building Chiller Plant Hall (Header 3)',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '12:00',
        validTo: '16:30',
        rejectionReason: 'Secondary isolation valve verification incomplete. Rescheduled to Night Shift.',
        notes: 'Resubmission scheduled once zero energy verification and secondary tagging is re-certified.',
      },
      {
        id: 'WP-8806',
        workOrderId: 'WO-4095',
        title: 'Nitrogen Header Pipe Section Brazing & Tie-In',
        permitType: 'Hot Work',
        status: 'rejected',
        location: 'Bulk Gas Yard Header Line Pad 3',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-02',
        validFrom: '13:00',
        validTo: '18:00',
        rejectionReason: 'Shift window elapsed before perimeter clearance granted. Rescheduled to Night Shift WP-8913.',
        notes: 'Day Shift permit cancelled before shift handover; brazing re-issued under Night Shift WP-8913.',
      },
    ],
  },
  {
    id: '2026-09-02_Night',
    date: '2026-09-02',
    formattedDate: 'Wed, Sep 02, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-09-02 — Night Shift (19:00 - 07:00) [Today]',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Approved by Lead',
    executiveSummary:
      'Night shift facility operation executed smoothly with complete parameter stability. Bulk nitrogen GN2 and CDA headers held steady at 7.15 bar. Chiller plant thermal loop balanced across Chillers #1, #2, and #4 with 6.51°C chilled water supply. Nitrogen line brazing tie-in completed on Bulk Gas Yard Pad 3.',
    criticalAlarm: null, // Zero critical alarms
    cpkData: generateCpkData('Night', 2),
    workPermits: [
      {
        id: 'WP-8911',
        workOrderId: 'WO-4112',
        title: 'Chiller Plant Secondary Loop Header Valve Repack',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Central Utility Building - Chiller Hall Unit #2',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-09-02',
        validFrom: '20:00',
        validTo: '03:30',
        closedAt: '03:30',
        notes: 'Valve packing replaced and torqued to manufacturer specification. Zero glycol seepage detected under full system pressure.',
      },
      {
        id: 'WP-8912',
        workOrderId: 'WO-4115',
        title: 'Toxic Scrubber Exhaust Fan EF-03 Belt Drive Tensioning',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Scrubber Deck Level 2 - Exhaust Fan EF-03',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-09-02',
        validFrom: '21:30',
        validTo: '02:00',
        closedAt: '02:00',
        notes: 'Belt alignment verified via laser sensor. Fan vibration decreased from 2.8 mm/s to 0.9 mm/s baseline.',
      },
      {
        id: 'WP-8913',
        workOrderId: 'WO-4095',
        title: 'Nitrogen Header Pipe Section Brazing & Tie-In (Night Execution)',
        permitType: 'Hot Work',
        status: 'closed',
        location: 'Bulk Gas Yard Header Line Pad 3',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-09-02',
        validFrom: '22:00',
        validTo: '04:30',
        closedAt: '04:30',
        notes: 'Nitrogen header tie-in completed and helium leak-checked (<1x10^-9 mbar·l/s). Fire watch completed with zero residual heat.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 1: 2026-09-01 (YESTERDAY)
  // ---------------------------------------------------------------------------
  {
    id: '2026-09-01_Day',
    date: '2026-09-01',
    formattedDate: 'Tue, Sep 01, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-09-01 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Day Shift operations achieved 100% equipment availability across Cleanroom HVAC, UPW loop, and process exhausts. CDA header pressure remained centered at 7.18 bar. Photolithography bay humidity tuning achieved tight ±0.2% RH stability matching customer recipe specs.',
    criticalAlarm: null, // Zero critical alarms
    cpkData: generateCpkData('Day', 3),
    workPermits: [
      {
        id: 'WP-8781',
        workOrderId: 'WO-4072',
        title: 'Acid Scrubber 1 Dosing Pump PM & Diaphragm Swap',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Subfab Acid Scrub Deck Level 1',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-01',
        validFrom: '08:00',
        validTo: '16:00',
        closedAt: '16:00',
        notes: 'Diaphragm replaced and caustic chemical metering rate calibrated.',
      },
      {
        id: 'WP-8782',
        workOrderId: 'WO-4075',
        title: 'Cleanroom Plenum Ceiling Access for Optical Fiber Routing',
        permitType: 'Working at Heights',
        status: 'closed',
        location: 'Fab 1 Bay 2 Ceiling Catwalk',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-09-01',
        validFrom: '09:30',
        validTo: '15:00',
        closedAt: '15:00',
        notes: 'Data trunk cable routed with zero particle intrusion into cleanroom clean bays.',
      },
    ],
  },
  {
    id: '2026-09-01_Night',
    date: '2026-09-01',
    formattedDate: 'Tue, Sep 01, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-09-01 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility systems ran stably under automated SCADA supervision. Toxic scrubber fan EF-02 experienced brief belt slip, handled via automated N+1 failover to EF-03 in 12 seconds with zero fab bay static pressure loss.',
    criticalAlarm: {
      id: 'ALM-CRIT-901N',
      time: '23:15',
      title: 'Toxic Scrubber Fan EF-02 Differential Pressure Low',
      system: 'Scrubber & Exhaust',
      severity: 'Critical',
      description: 'Differential pressure dropped below -180 Pa due to belt slip.',
      containmentAction: 'Auto-switched to N+1 backup fan EF-03; plenum static pressure recovered to -250 Pa in 12 seconds.',
      responsibleLead: 'Marcus Vance',
      status: 'Resolved',
    },
    cpkData: generateCpkData('Night', 4),
    workPermits: [
      {
        id: 'WP-8791',
        workOrderId: 'WO-4081',
        title: 'UPW Carbon Bed Pre-Filter Cartridge Bank Replacement',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Subfab UPW Water Treatment Hall B',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-09-01',
        validFrom: '21:00',
        validTo: '03:00',
        closedAt: '03:00',
        notes: '0.1-micron cartridge filters replaced, rinsed, and TOC verified < 1.0 ppb.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 2: 2026-08-31
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-31_Day',
    date: '2026-08-31',
    formattedDate: 'Mon, Aug 31, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-31 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Day Shift operations concluded with steady process capability metrics across all tracked parameters (all Cpks > 1.33 baseline). Subfab exhaust duct alignment completed and sign-off verified. Cleanroom particulate counts held < 5 counts/m³ at 0.1 μm.',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 5),
    workPermits: [
      {
        id: 'WP-8761',
        workOrderId: 'WO-4061',
        title: 'Solvent Exhaust Duct High-Pressure Inspection',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Fab 1 Subfab Solvent Riser 3',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-31',
        validFrom: '08:30',
        validTo: '16:30',
        closedAt: '16:30',
        notes: 'Manometer differential pressure verified; internal dampers adjusted to balance bay draw.',
      },
    ],
  },
  {
    id: '2026-08-31_Night',
    date: '2026-08-31',
    formattedDate: 'Mon, Aug 31, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-31 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility systems ran in full automatic mode. CDA main desiccant tower toggle caused brief dew point fluctuation (-62°C), swiftly remedied by purging standby tower D-03 to -74°C in 8 minutes with zero impact on cleanroom tool pneumatic lines.',
    criticalAlarm: {
      id: 'ALM-CRIT-831N',
      time: '04:10',
      title: 'CDA Main Desiccant Dryer Tower Switching Dew Point Excursion',
      system: 'Clean Dry Air (CDA) & N2',
      severity: 'Critical',
      description: 'Dew point spiked to -62°C (spec limit -60°C) during desiccant tower valve toggle.',
      containmentAction: 'Purged standby dryer tower D-03; dew point recovered to -74°C in 8 minutes.',
      responsibleLead: 'Dave Kowalski',
      status: 'Resolved',
    },
    cpkData: generateCpkData('Night', 6),
    workPermits: [
      {
        id: 'WP-8768',
        workOrderId: 'WO-4068',
        title: 'Compressor C-02 Intercooler Moisture Drain Valve Overhaul',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Compressor Hall CUB Level 1',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-31',
        validFrom: '22:00',
        validTo: '04:00',
        closedAt: '04:00',
        notes: 'Automatic solenoid drain rebuild completed; condensate discharge cycle tested normal.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 3: 2026-08-30
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-30_Day',
    date: '2026-08-30',
    formattedDate: 'Sun, Aug 30, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-30 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Day Shift operations maintained continuous production baseline. 4 scheduled work permits completed and verified closed. 2 permits rejected due to isolation/window constraints. UPW polishing loop and cleanroom FFU arrays operated at nominal setpoints.',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 7),
    workPermits: [
      {
        id: 'WP-8741',
        workOrderId: 'WO-4045',
        title: 'Emergency Generator 2 Fuel Filter Annual Replacement',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'CUB North Yard Gen-Set #2',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-30',
        validFrom: '09:00',
        validTo: '14:30',
        closedAt: '14:30',
        notes: 'Fuel filters replaced and crank test run successful. Generator returned to auto-standby.',
      },
    ],
  },
  {
    id: '2026-08-30_Night',
    date: '2026-08-30',
    formattedDate: 'Sun, Aug 30, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-30 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility operation executed smoothly with zero process interrupts. UPW resistivity maintained 18.22 MΩ·cm. Cleanroom temperatures in Bays 1-4 remained strictly inside 21.00 ±0.05°C.',
    criticalAlarm: null,
    cpkData: generateCpkData('Night', 8),
    workPermits: [
      {
        id: 'WP-8748',
        workOrderId: 'WO-4050',
        title: 'Cleanroom Bay 4 FFU Motor RPM Tachometer Calibration',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Fab 1 Bay 4 Cleanroom Plenum',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-30',
        validFrom: '20:30',
        validTo: '02:00',
        closedAt: '02:00',
        notes: 'Laser tachometer calibrated across 16 FFU units. Airflow velocity confirmed 0.45 m/s uniform.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 4: 2026-08-29
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-29_Day',
    date: '2026-08-29',
    formattedDate: 'Sat, Aug 29, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-29 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Weekend Day Shift facility oversight kept cleanroom facilities running at peak efficiency. Chilled water delta-T held at optimal 5.8°C across active cooling towers. No safety or environmental incidents occurred.',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 9),
    workPermits: [
      {
        id: 'WP-8721',
        workOrderId: 'WO-4028',
        title: 'Cooling Tower #4 Fan Gearbox Oil Sample & Analysis',
        permitType: 'Working at Heights',
        status: 'closed',
        location: 'Cooling Tower Basin 4 Roof Deck',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-29',
        validFrom: '10:00',
        validTo: '15:00',
        closedAt: '15:00',
        notes: 'Oil sample pulled for lab spectrographic analysis. Gearbox visual inspection normal.',
      },
    ],
  },
  {
    id: '2026-08-29_Night',
    date: '2026-08-29',
    formattedDate: 'Sat, Aug 29, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-29 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility operations concluded with high system availability. UPW Polishing Loop TOC level registered 0.4 ppb (spec limit < 1.0 ppb). Automated chiller sequencing staged down load seamlessly during ambient cooling hours.',
    criticalAlarm: null,
    cpkData: generateCpkData('Night', 10),
    workPermits: [
      {
        id: 'WP-8729',
        workOrderId: 'WO-4034',
        title: 'Subfab Solvent Drain Vented Sump Inspection',
        permitType: 'Confined Space Entry',
        status: 'closed',
        location: 'Subfab West Solvent Manifold Trench 2',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-29',
        validFrom: '21:00',
        validTo: '02:30',
        closedAt: '02:30',
        notes: 'Sump level sensors verified. Dual containment vacuum sensor integrity confirmed 100%.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 5: 2026-08-28
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-28_Day',
    date: '2026-08-28',
    formattedDate: 'Fri, Aug 28, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-28 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Friday Day Shift facility handover verified nominal operation for all critical semiconductor support infrastructure. Cleanroom particle counts in Lithography Bay 1 held at ISO Class 1 baseline (< 2 particles/m³).',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 11),
    workPermits: [
      {
        id: 'WP-8702',
        workOrderId: 'WO-4012',
        title: 'Bulk Gas Yard Argon Vaporizer Header Valve Maintenance',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Bulk Gas Yard Argon Pad A',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-28',
        validFrom: '08:00',
        validTo: '15:30',
        closedAt: '15:30',
        notes: 'Vaporizer cryogenic bypass valve lubricated and cycling verified normal.',
      },
    ],
  },
  {
    id: '2026-08-28_Night',
    date: '2026-08-28',
    formattedDate: 'Fri, Aug 28, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-28 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility operations ran smoothly without incident. UPS Battery String B impedance check completed. Thermal loop and CDA headers delivered steady uninterrupted utility service.',
    criticalAlarm: null,
    cpkData: generateCpkData('Night', 12),
    workPermits: [
      {
        id: 'WP-8709',
        workOrderId: 'WO-4019',
        title: 'UPS-2 Battery String B Annual Internal Resistance Check',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Electrical Switchgear Room Substation 2',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-28',
        validFrom: '22:00',
        validTo: '03:30',
        closedAt: '03:30',
        notes: 'All 120 cell internal resistances measured within 105% IEEE baseline specification.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 6: 2026-08-27
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-27_Day',
    date: '2026-08-27',
    formattedDate: 'Thu, Aug 27, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-27 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Full facility infrastructure maintained 100% operational uptime. Process cooling water supply held 6.50°C. Scrubber exhaust fan speeds and draft static pressures balanced across East and West risers.',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 13),
    workPermits: [
      {
        id: 'WP-8681',
        workOrderId: 'WO-3995',
        title: 'Exhaust Scrubber #2 Sump Recirculation Pump Seal Replacement',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Scrubber Enclosure Bay 2',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-27',
        validFrom: '08:30',
        validTo: '16:00',
        closedAt: '16:00',
        notes: 'Pump seal replaced and water flow verified at 450 GPM design capacity.',
      },
    ],
  },
  {
    id: '2026-08-27_Night',
    date: '2026-08-27',
    formattedDate: 'Thu, Aug 27, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-27 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility operations executed cleanly. Nitrogen header pressure maintained 7.20 bar. Cleanroom humidity in Bay 3 held steady at 42.04% RH.',
    criticalAlarm: null,
    cpkData: generateCpkData('Night', 14),
    workPermits: [
      {
        id: 'WP-8689',
        workOrderId: 'WO-4001',
        title: 'RO Membrane Bank 2 Cleaning & Permeate Conductivity Validation',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'UPW RO Room Basement Level 1',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-27',
        validFrom: '20:00',
        validTo: '04:00',
        closedAt: '04:00',
        notes: 'RO permeate conductivity restored to 1.2 μS/cm baseline; flux recovery confirmed.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // DAY 7: 2026-08-26 (TODAY - 7 DAYS)
  // ---------------------------------------------------------------------------
  {
    id: '2026-08-26_Day',
    date: '2026-08-26',
    formattedDate: 'Wed, Aug 26, 2026',
    shiftType: 'Day Shift (07:00 - 19:00)',
    shiftCode: 'Day',
    label: '2026-08-26 — Day Shift (07:00 - 19:00)',
    leadEngineer: 'Marcus Vance',
    incomingLead: 'David Kim',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Facilities Day Shift operations maintained complete environmental and utility compliance across the semiconductor fabrication envelope. All process parameters exhibited strong statistical control (all Cpks > 1.33).',
    criticalAlarm: null,
    cpkData: generateCpkData('Day', 15),
    workPermits: [
      {
        id: 'WP-8662',
        workOrderId: 'WO-3980',
        title: 'Clean Dry Air Header Desiccant Dryer Routine Filter Element PM',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Compressor Room Utility Pad 1',
        shiftWindow: 'Day Shift (07:00 - 19:00)',
        shiftDate: '2026-08-26',
        validFrom: '08:00',
        validTo: '14:30',
        closedAt: '14:30',
        notes: 'Coalescing filter cartridges replaced. Zero pressure differential across filter housing.',
      },
    ],
  },
  {
    id: '2026-08-26_Night',
    date: '2026-08-26',
    formattedDate: 'Wed, Aug 26, 2026',
    shiftType: 'Night Shift (19:00 - 07:00)',
    shiftCode: 'Night',
    label: '2026-08-26 — Night Shift (19:00 - 07:00)',
    leadEngineer: 'David Kim',
    incomingLead: 'Marcus Vance',
    facilityManager: 'Raymond Sterling',
    approvalStatus: 'Signed-Off by Ops Manager',
    executiveSummary:
      'Night shift facility operation executed smoothly. UPW TOC, resistivity, particle count, and dissolved oxygen maintained within ultra-high purity semiconductor specifications. Handover executed with zero pending alarms.',
    criticalAlarm: null,
    cpkData: generateCpkData('Night', 16),
    workPermits: [
      {
        id: 'WP-8669',
        workOrderId: 'WO-3988',
        title: 'Thermal Plant Secondary Chilled Water Loop Balancing',
        permitType: 'Cold Work',
        status: 'closed',
        location: 'Chiller Hall Mechanical Level 2',
        shiftWindow: 'Night Shift (19:00 - 07:00)',
        shiftDate: '2026-08-26',
        validFrom: '21:30',
        validTo: '03:30',
        closedAt: '03:30',
        notes: 'Triple-duty valve differential pressure trimmed to balance flow evenly across Litho Bay risers.',
      },
    ],
  },
];
