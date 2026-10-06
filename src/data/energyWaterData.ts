/**
 * Energy & Water Management Master Data for Fab-1 (300mm Semiconductor Facility)
 * Standards: SEMI S23, ASHRAE 90.1, PUB NEWater & Singapore NEA EPMA 2020.
 */

import { EnPiIndicator } from '../components/energy_water/SpeedometerGauge';

export interface SeuItem {
  code: string;
  name: string;
  category: string;
  ratedPowerKw: number;
  substationFeed: string;
  dailyMwh: number;
  weeklyMwh: number;
  monthlyMwh: number;
  sharePercent: number;
  baselineMwhDay: number;
  status: 'Optimal' | 'Within Baseline' | 'Needs Attention';
  controlMeasure: string;
  color: string;
}

export interface EnergyHourlyPoint {
  hour: string; // e.g. '00:00', '01:00'
  timeDisplay: string; // e.g. '00:00'
  tariffBand: 'Off-Peak' | 'Standard' | 'Peak';
  shift: 'Shift 1 (07:00-15:00)' | 'Shift 2 (15:00-23:00)' | 'Shift 3 (23:00-07:00)';
  contextNote: string;
  totalMwh: number;
  baselineMwh: number;
  seu1: number; // Chiller & HVAC
  seu2: number; // CDA & Compressors
  seu3: number; // Process Tools
  seu4: number; // UPW High-Pressure
  seu5: number; // Scrubber Exhaust
  seu6: number; // Specialty Gases & Cryo
}

export interface EnergyIntervalPoint {
  label: string;
  dateStr: string;
  totalMwh: number;
  baselineMwh: number;
  seu1: number;
  seu2: number;
  seu3: number;
  seu4: number;
  seu5: number;
  seu6: number;
}

export interface WaterConsumerItem {
  id: string;
  name: string;
  specs: string;
  dailyM3: number;
  weeklyM3: number;
  monthlyM3: number;
  flowRateM3Hr: number;
  sharePercent: number;
  dischargeDestination: string;
  controlInitiative: string;
  color: string;
}

export interface IwtpTelemetrySummary {
  parameter: string;
  specLimit: string;
  internalBuffer: string;
  currentValue: number;
  unit: string;
  minObserved: number;
  maxObserved: number;
  compliancePercent: number;
  status: 'In Spec / Nominal' | 'Compliant' | 'Balanced' | 'Active Control';
  details: string;
}

export interface IwtpHourlyPoint {
  hour: string;
  timeDisplay: string;
  ph: number;
  phLowerLimit: number;
  phUpperLimit: number;
  phBufferLow: number;
  phBufferHigh: number;
  codMgL: number;
  codLimitMgL: number;
  codWarningMgL: number;
  fluorideMgL: number;
  fluorideLimitMgL: number;
  dischargeFlowM3Hr: number;
  acidDosingMlMin: number;
  causticDosingMlMin: number;
  complianceStatus: 'In Spec' | 'Warning' | 'Excursion';
  shift: string;
  notes: string;
}

// 1. EnPI Indicators (Speedometer Gauges)
export const ENPI_INDICATORS_DATA: EnPiIndicator[] = [
  {
    id: 'ENPI-01',
    name: 'Specific Energy Consumption (SEC)',
    metric: 'Fab SEC',
    unit: 'kWh / Wafer',
    currentValue: 14.18,
    baselineValue: 15.60,
    targetValue: 14.50,
    status: 'Better than Target',
    trendDirection: 'down',
    isLowerBetter: true,
    variancePercent: -9.1,
    description: 'Electrical & thermal energy consumed per 300mm wafer output slice.',
    standard: 'SEMI S23 Benchmark Standard',
  },
  {
    id: 'ENPI-02',
    name: 'Central Chiller Plant Efficiency',
    metric: 'Chiller Plant',
    unit: 'kW / RT',
    currentValue: 0.538,
    baselineValue: 0.620,
    targetValue: 0.560,
    status: 'Better than Target',
    trendDirection: 'down',
    isLowerBetter: true,
    variancePercent: -13.2,
    description: 'Chilled water production efficiency across 6x 1200RT magnetic bearing chillers.',
    standard: 'ASHRAE 90.1 / Green Mark Platinum',
  },
  {
    id: 'ENPI-03',
    name: 'Compressed Dry Air Compressor Efficiency',
    metric: 'CDA Compressor Efficiency',
    unit: 'kW / 100 CFM',
    currentValue: 17.40,
    baselineValue: 19.20,
    targetValue: 18.00,
    status: 'Better than Target',
    trendDirection: 'down',
    isLowerBetter: true,
    variancePercent: -9.4,
    description: 'Centrifugal compressor energy demand per 100 CFM dry air delivery at 7.0 bar.',
    standard: 'Compressed Air Challenge Benchmark',
  },
];

export const ENPI_INDICATORS_BY_INTERVAL: Record<'daily' | 'weekly' | 'monthly', EnPiIndicator[]> = {
  daily: ENPI_INDICATORS_DATA,
  weekly: [
    {
      id: 'ENPI-01',
      name: 'Specific Energy Consumption (SEC)',
      metric: 'Fab SEC',
      unit: 'kWh / Wafer',
      currentValue: 14.24,
      baselineValue: 15.60,
      targetValue: 14.50,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -8.7,
      description: '7-day rolling electrical & thermal energy consumed per 300mm wafer.',
      standard: 'SEMI S23 Benchmark Standard',
    },
    {
      id: 'ENPI-02',
      name: 'Central Chiller Plant Efficiency',
      metric: 'Chiller Plant',
      unit: 'kW / RT',
      currentValue: 0.542,
      baselineValue: 0.620,
      targetValue: 0.560,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -12.6,
      description: '7-day average chilled water production efficiency.',
      standard: 'ASHRAE 90.1 / Green Mark Platinum',
    },
    {
      id: 'ENPI-03',
      name: 'Compressed Dry Air Compressor Efficiency',
      metric: 'CDA Compressor Efficiency',
      unit: 'kW / 100 CFM',
      currentValue: 17.55,
      baselineValue: 19.20,
      targetValue: 18.00,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -8.6,
      description: '7-day average compressor energy demand per 100 CFM dry air delivery.',
      standard: 'Compressed Air Challenge Benchmark',
    },
  ],
  monthly: [
    {
      id: 'ENPI-01',
      name: 'Specific Energy Consumption (SEC)',
      metric: 'Fab SEC',
      unit: 'kWh / Wafer',
      currentValue: 14.15,
      baselineValue: 15.60,
      targetValue: 14.50,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -9.3,
      description: '30-day cumulative electrical & thermal energy consumed per 300mm wafer.',
      standard: 'SEMI S23 Benchmark Standard',
    },
    {
      id: 'ENPI-02',
      name: 'Central Chiller Plant Efficiency',
      metric: 'Chiller Plant',
      unit: 'kW / RT',
      currentValue: 0.535,
      baselineValue: 0.620,
      targetValue: 0.560,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -13.7,
      description: '30-day monthly chiller plant efficiency across all operating shifts.',
      standard: 'ASHRAE 90.1 / Green Mark Platinum',
    },
    {
      id: 'ENPI-03',
      name: 'Compressed Dry Air Compressor Efficiency',
      metric: 'CDA Compressor Efficiency',
      unit: 'kW / 100 CFM',
      currentValue: 17.38,
      baselineValue: 19.20,
      targetValue: 18.00,
      status: 'Better than Target',
      trendDirection: 'down',
      isLowerBetter: true,
      variancePercent: -9.5,
      description: '30-day compressor energy demand per 100 CFM dry air delivery.',
      standard: 'Compressed Air Challenge Benchmark',
    },
  ],
};

// 2. Significant Energy Users (SEUs) Master Registry
export const SEU_MASTER_REGISTRY: SeuItem[] = [
  {
    code: 'SEU 1',
    name: 'Central Chiller Plant & Cleanroom HVAC (RAHU/MAHU)',
    category: 'Thermal & HVAC',
    ratedPowerKw: 4800,
    substationFeed: 'Substation SS-A (11kV/400V)',
    dailyMwh: 20.40,
    weeklyMwh: 142.80,
    monthlyMwh: 612.00,
    sharePercent: 42.0,
    baselineMwhDay: 21.60,
    status: 'Optimal',
    controlMeasure: 'Chilled water supply temp reset (6.5°C to 7.8°C) & VFD fan staging',
    color: '#0284c7', // sky-600
  },
  {
    code: 'SEU 2',
    name: 'Compressed Dry Air (CDA) & Process Gas Compressors',
    category: 'Pneumatics & Bulk Gas',
    ratedPowerKw: 2400,
    substationFeed: 'Substation SS-B (11kV/400V)',
    dailyMwh: 10.70,
    weeklyMwh: 74.90,
    monthlyMwh: 321.00,
    sharePercent: 22.0,
    baselineMwhDay: 11.20,
    status: 'Within Baseline',
    controlMeasure: 'Automated header pressure modulation (7.2 -> 6.6 bar) + Ultrasonic leak audit',
    color: '#d97706', // amber-600
  },
  {
    code: 'SEU 3',
    name: 'Cleanroom Fab Process Tool Hookup Load (Litho, Etch, CMP)',
    category: 'Process Tools',
    ratedPowerKw: 2100,
    substationFeed: 'Substation SS-C (Clean UPS)',
    dailyMwh: 8.75,
    weeklyMwh: 61.25,
    monthlyMwh: 262.50,
    sharePercent: 18.0,
    baselineMwhDay: 8.60,
    status: 'Within Baseline',
    controlMeasure: 'SECS/GEM automated equipment sleep mode during wafer lot idle gaps',
    color: '#7c3aed', // purple-600
  },
  {
    code: 'SEU 4',
    name: 'Ultra Pure Water (UPW) Generation & High-Pressure Pumps',
    category: 'UPW Purification',
    ratedPowerKw: 1100,
    substationFeed: 'Substation SS-D (11kV/400V)',
    dailyMwh: 4.37,
    weeklyMwh: 30.60,
    monthlyMwh: 131.10,
    sharePercent: 9.0,
    baselineMwhDay: 4.60,
    status: 'Optimal',
    controlMeasure: 'VFD loop pressure trimming & energy recovery turbo-chargers on RO stage 2',
    color: '#0d9488', // teal-600
  },
  {
    code: 'SEU 5',
    name: 'Acid/Ammonia Exhaust Scrubbers & Thermal Oxidizers (RTO)',
    category: 'Environmental Abatement',
    ratedPowerKw: 650,
    substationFeed: 'Substation SS-E (11kV/400V)',
    dailyMwh: 2.43,
    weeklyMwh: 17.00,
    monthlyMwh: 72.90,
    sharePercent: 5.0,
    baselineMwhDay: 2.50,
    status: 'Within Baseline',
    controlMeasure: 'Dynamic static pressure setpoint tracking with Fab exhaust damper feedback',
    color: '#e11d48', // rose-600
  },
  {
    code: 'SEU 6',
    name: 'Bulk Specialty Gases & Cryogenic Nitrogen Plant (ASU)',
    category: 'Cryogenic Gas Generation',
    ratedPowerKw: 520,
    substationFeed: 'Substation SS-A (11kV/400V)',
    dailyMwh: 1.96,
    weeklyMwh: 13.70,
    monthlyMwh: 58.70,
    sharePercent: 4.0,
    baselineMwhDay: 2.90,
    status: 'Optimal',
    controlMeasure: 'Liquid Nitrogen (LIN) peak shaving & off-peak vaporization storage shift',
    color: '#059669', // emerald-600
  },
];

export const ENERGY_TOTALS = {
  daily: {
    baselineMwh: 51.40,
    actualMwh: 48.61,
    variancePercent: -5.4,
    status: '5.4% Below Energy Baseline (Optimal)',
  },
  weekly: {
    baselineMwh: 359.80,
    actualMwh: 340.25,
    variancePercent: -5.4,
    status: '5.4% Below Energy Baseline (Optimal)',
  },
  monthly: {
    baselineMwh: 1542.00,
    actualMwh: 1458.20,
    variancePercent: -5.4,
    status: '5.4% Below Energy Baseline (Optimal)',
  },
};

// 3. Hourly 24-hour Energy Profile
export const ENERGY_HOURLY_DATA: EnergyHourlyPoint[] = [
  { hour: '00:00', timeDisplay: '00:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - LIN storage charging active', totalMwh: 1.76, baselineMwh: 1.88, seu1: 0.73, seu2: 0.39, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '01:00', timeDisplay: '01:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - Chiller condenser water loop optimized', totalMwh: 1.74, baselineMwh: 1.86, seu1: 0.72, seu2: 0.38, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '02:00', timeDisplay: '02:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - Minimal ambient solar load', totalMwh: 1.72, baselineMwh: 1.85, seu1: 0.71, seu2: 0.38, seu3: 0.31, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '03:00', timeDisplay: '03:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - UPW RO permeate flush cycle', totalMwh: 1.73, baselineMwh: 1.85, seu1: 0.71, seu2: 0.38, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '04:00', timeDisplay: '04:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - Stable fab tool hookup consumption', totalMwh: 1.74, baselineMwh: 1.85, seu1: 0.72, seu2: 0.38, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '05:00', timeDisplay: '05:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Base Load - RAHU fan speeds at night setback', totalMwh: 1.76, baselineMwh: 1.87, seu1: 0.73, seu2: 0.39, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.07 },
  { hour: '06:00', timeDisplay: '06:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Off-Peak Night Transition - Nitrogen ASU vaporizers pre-warming', totalMwh: 1.82, baselineMwh: 1.92, seu1: 0.76, seu2: 0.40, seu3: 0.33, seu4: 0.16, seu5: 0.09, seu6: 0.08 },
  { hour: '07:00', timeDisplay: '07:00', tariffBand: 'Standard', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Morning Shift Handover & Production Ramp - Bay lighting & tool ramp', totalMwh: 1.98, baselineMwh: 2.10, seu1: 0.83, seu2: 0.44, seu3: 0.36, seu4: 0.18, seu5: 0.10, seu6: 0.07 },
  { hour: '08:00', timeDisplay: '08:00', tariffBand: 'Standard', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Standard Tariff - Lithography & Etch tool full lot processing', totalMwh: 2.08, baselineMwh: 2.20, seu1: 0.88, seu2: 0.46, seu3: 0.38, seu4: 0.19, seu5: 0.10, seu6: 0.07 },
  { hour: '09:00', timeDisplay: '09:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Tariff Window Start - Automated CDA pressure trimming engaged', totalMwh: 2.18, baselineMwh: 2.30, seu1: 0.92, seu2: 0.48, seu3: 0.40, seu4: 0.20, seu5: 0.11, seu6: 0.07 },
  { hour: '10:00', timeDisplay: '10:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Tariff - Outdoor wet-bulb temp rising; Chiller 3 modulated', totalMwh: 2.25, baselineMwh: 2.38, seu1: 0.96, seu2: 0.49, seu3: 0.41, seu4: 0.20, seu5: 0.11, seu6: 0.08 },
  { hour: '11:00', timeDisplay: '11:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Solar Irradiance & Max Chiller Ambient Load - VFD fans at 88%', totalMwh: 2.32, baselineMwh: 2.45, seu1: 1.00, seu2: 0.51, seu3: 0.42, seu4: 0.21, seu5: 0.11, seu6: 0.07 },
  { hour: '12:00', timeDisplay: '12:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Midday Production & Cooling Load - Chilled supply reset 7.2°C', totalMwh: 2.36, baselineMwh: 2.50, seu1: 1.02, seu2: 0.51, seu3: 0.43, seu4: 0.21, seu5: 0.11, seu6: 0.08 },
  { hour: '13:00', timeDisplay: '13:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Production - Ambient temp 33.5°C; Cooling tower delta-T 5.8°C', totalMwh: 2.38, baselineMwh: 2.52, seu1: 1.03, seu2: 0.52, seu3: 0.43, seu4: 0.21, seu5: 0.11, seu6: 0.08 },
  { hour: '14:00', timeDisplay: '14:00', tariffBand: 'Peak', shift: 'Shift 1 (07:00-15:00)', contextNote: 'Peak Afternoon Sustained - Full wafer lot transport across AMHS tracks', totalMwh: 2.34, baselineMwh: 2.48, seu1: 1.01, seu2: 0.51, seu3: 0.42, seu4: 0.21, seu5: 0.11, seu6: 0.08 },
  { hour: '15:00', timeDisplay: '15:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Shift 2 Handover & Mid-Afternoon Peak - Tool idle sleep mode active', totalMwh: 2.28, baselineMwh: 2.42, seu1: 0.98, seu2: 0.50, seu3: 0.41, seu4: 0.20, seu5: 0.11, seu6: 0.08 },
  { hour: '16:00', timeDisplay: '16:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Peak Tariff - Scrubber static pressure reset to dynamic damper feedback', totalMwh: 2.22, baselineMwh: 2.35, seu1: 0.95, seu2: 0.49, seu3: 0.40, seu4: 0.20, seu5: 0.10, seu6: 0.08 },
  { hour: '17:00', timeDisplay: '17:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Peak Tariff - Evening cooling transition; Outdoor humidity rising', totalMwh: 2.16, baselineMwh: 2.28, seu1: 0.92, seu2: 0.47, seu3: 0.39, seu4: 0.19, seu5: 0.11, seu6: 0.08 },
  { hour: '18:00', timeDisplay: '18:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Evening Thermal Cooling Peak - MAHU pre-cooling loop trimming', totalMwh: 2.12, baselineMwh: 2.24, seu1: 0.90, seu2: 0.46, seu3: 0.38, seu4: 0.19, seu5: 0.11, seu6: 0.08 },
  { hour: '19:00', timeDisplay: '19:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Peak Tariff - Sustained high wafer volume; Clean UPS load 82%', totalMwh: 2.08, baselineMwh: 2.20, seu1: 0.88, seu2: 0.45, seu3: 0.37, seu4: 0.19, seu5: 0.11, seu6: 0.08 },
  { hour: '20:00', timeDisplay: '20:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Peak Tariff - Ambient cooling drops; Chiller 2 unloaded to 62%', totalMwh: 2.02, baselineMwh: 2.14, seu1: 0.85, seu2: 0.44, seu3: 0.36, seu4: 0.18, seu5: 0.11, seu6: 0.08 },
  { hour: '21:00', timeDisplay: '21:00', tariffBand: 'Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Peak Tariff Final Hour - Off-peak nitrogen prep initiation', totalMwh: 1.94, baselineMwh: 2.06, seu1: 0.81, seu2: 0.43, seu3: 0.35, seu4: 0.17, seu5: 0.10, seu6: 0.08 },
  { hour: '22:00', timeDisplay: '22:00', tariffBand: 'Off-Peak', shift: 'Shift 2 (15:00-23:00)', contextNote: 'Off-Peak Tariff Begins - LIN storage tank refilling initiated', totalMwh: 1.84, baselineMwh: 1.95, seu1: 0.76, seu2: 0.41, seu3: 0.33, seu4: 0.17, seu5: 0.10, seu6: 0.07 },
  { hour: '23:00', timeDisplay: '23:00', tariffBand: 'Off-Peak', shift: 'Shift 3 (23:00-07:00)', contextNote: 'Shift 3 Handover - Night setback active across secondary fan arrays', totalMwh: 1.78, baselineMwh: 1.90, seu1: 0.74, seu2: 0.39, seu3: 0.32, seu4: 0.16, seu5: 0.09, seu6: 0.08 },
];

// 4. Weekly 7-day Energy Profile (Mon - Sun, total 340.25 MWh)
export const ENERGY_WEEKLY_DATA: EnergyIntervalPoint[] = [
  { label: 'Mon', dateStr: '2026-08-25', totalMwh: 49.20, baselineMwh: 52.00, seu1: 20.66, seu2: 10.82, seu3: 8.86, seu4: 4.43, seu5: 2.46, seu6: 1.97 },
  { label: 'Tue', dateStr: '2026-08-26', totalMwh: 49.85, baselineMwh: 52.60, seu1: 20.94, seu2: 10.97, seu3: 8.97, seu4: 4.49, seu5: 2.49, seu6: 1.99 },
  { label: 'Wed', dateStr: '2026-08-27', totalMwh: 50.10, baselineMwh: 53.00, seu1: 21.04, seu2: 11.02, seu3: 9.02, seu4: 4.51, seu5: 2.51, seu6: 2.00 },
  { label: 'Thu', dateStr: '2026-08-28', totalMwh: 49.45, baselineMwh: 52.20, seu1: 20.77, seu2: 10.88, seu3: 8.90, seu4: 4.45, seu5: 2.47, seu6: 1.98 },
  { label: 'Fri', dateStr: '2026-08-29', totalMwh: 48.61, baselineMwh: 51.40, seu1: 20.40, seu2: 10.70, seu3: 8.75, seu4: 4.37, seu5: 2.43, seu6: 1.96 },
  { label: 'Sat', dateStr: '2026-08-30', totalMwh: 46.80, baselineMwh: 49.60, seu1: 19.66, seu2: 10.30, seu3: 8.42, seu4: 4.21, seu5: 2.34, seu6: 1.87 },
  { label: 'Sun', dateStr: '2026-08-31', totalMwh: 46.24, baselineMwh: 49.00, seu1: 19.33, seu2: 10.21, seu3: 8.33, seu4: 4.14, seu5: 2.29, seu6: 1.94 },
];

// 5. Monthly 30-day Energy Profile (Day 1 - 30, total 1,458.20 MWh)
export const ENERGY_MONTHLY_DATA: EnergyIntervalPoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const isWeekend = day % 7 === 6 || day % 7 === 0;
  const total = isWeekend ? 46.5 + (Math.sin(day) * 0.8) : 49.5 + (Math.cos(day) * 0.9);
  const totalMwh = Number(total.toFixed(2));
  const baselineMwh = Number((totalMwh * 1.057).toFixed(2));
  return {
    label: `Day ${day}`,
    dateStr: `2026-08-${day.toString().padStart(2, '0')}`,
    totalMwh,
    baselineMwh,
    seu1: Number((totalMwh * 0.42).toFixed(2)),
    seu2: Number((totalMwh * 0.22).toFixed(2)),
    seu3: Number((totalMwh * 0.18).toFixed(2)),
    seu4: Number((totalMwh * 0.09).toFixed(2)),
    seu5: Number((totalMwh * 0.05).toFixed(2)),
    seu6: Number((totalMwh * 0.04).toFixed(2)),
  };
});

// 6. Key Water Balance Consumers
export const WATER_CONSUMERS_DATA: WaterConsumerItem[] = [
  {
    id: 'WU-01',
    name: 'Ultra Pure Water (UPW) System & Polishers',
    specs: 'UPW Grade A (18.2 MΩ·cm, TOC < 1 ppb)',
    dailyM3: 781.0,
    weeklyM3: 5467.0,
    monthlyM3: 23430.0,
    flowRateM3Hr: 32.54,
    sharePercent: 55.0,
    dischargeDestination: 'CMP & Wet Bench Sump to IWTP',
    controlInitiative: 'Multi-stage RO recovery turbo-chargers + EDI polishing',
    color: '#0284c7', // sky-600
  },
  {
    id: 'WU-02',
    name: 'Cooling Towers & Chiller Plant Make-up',
    specs: 'Softened Make-up (TDS < 350 ppm)',
    dailyM3: 326.6,
    weeklyM3: 2286.2,
    monthlyM3: 9798.0,
    flowRateM3Hr: 13.61,
    sharePercent: 23.0,
    dischargeDestination: 'Condenser Blowdown Neutralization',
    controlInitiative: 'Cycles of Concentration (CoC) maintained at 6.2 via automated blowdown',
    color: '#d97706', // amber-600
  },
  {
    id: 'WU-03',
    name: 'Wet Scrubber Exhaust Systems (Acid/Toxic)',
    specs: 'Industrial Grade Make-up (pH 7.0 ± 0.5)',
    dailyM3: 156.2,
    weeklyM3: 1093.4,
    monthlyM3: 4686.0,
    flowRateM3Hr: 6.51,
    sharePercent: 11.0,
    dischargeDestination: 'IWTP Chemical Treatment Plant',
    controlInitiative: 'ORP & pH-controlled automated bleed valve staging',
    color: '#e11d48', // rose-600
  },
  {
    id: 'WU-04',
    name: 'Process & Utility Facility Services',
    specs: 'Potable & Utility Grade Water',
    dailyM3: 156.2,
    weeklyM3: 1093.4,
    monthlyM3: 4686.0,
    flowRateM3Hr: 6.51,
    sharePercent: 11.0,
    dischargeDestination: 'Municipal Public Sewer Outfall',
    controlInitiative: 'Ultrasonic flow metering & automated humidification solenoid timing',
    color: '#059669', // emerald-600
  },
];

export const WATER_TOTALS = {
  dailyM3: 1420.0,
  weeklyM3: 9940.0,
  monthlyM3: 42600.0,
  reclaimedPercent: 68.4,
  neWaterInflowM3Day: 1150.0,
  potableBackupM3Day: 270.0,
};

// 7. IWTP Telemetry Parameter Master Table
export const IWTP_TELEMETRY_SUMMARY: IwtpTelemetrySummary[] = [
  {
    parameter: 'Effluent pH',
    specLimit: '6.00 – 9.00 pH',
    internalBuffer: '6.80 – 7.60 pH',
    currentValue: 7.34,
    unit: 'pH',
    minObserved: 7.04,
    maxObserved: 7.62,
    compliancePercent: 100.0,
    status: 'In Spec / Nominal',
    details: 'Continuous glass electrode online sensor with dual temperature compensation.',
  },
  {
    parameter: 'COD (Chemical Oxygen Demand)',
    specLimit: '≤ 100.0 mg/L',
    internalBuffer: '≤ 80.0 mg/L warning',
    currentValue: 42.4,
    unit: 'mg/L',
    minObserved: 38.2,
    maxObserved: 57.8,
    compliancePercent: 100.0,
    status: 'In Spec / Nominal',
    details: 'UV-Vis spectrophotometric online TOC/COD analyzer with automated cleaning cycle.',
  },
  {
    parameter: 'Fluoride Concentration',
    specLimit: '< 5.0 mg/L',
    internalBuffer: '< 3.0 mg/L target',
    currentValue: 1.34,
    unit: 'mg/L',
    minObserved: 1.10,
    maxObserved: 1.85,
    compliancePercent: 100.0,
    status: 'Compliant',
    details: 'Ion selective electrode (ISE) after calcium fluoride (CaF2) coagulation & clarifier precipitation.',
  },
  {
    parameter: 'Discharge Flow Rate',
    specLimit: 'Continuous Outfall',
    internalBuffer: 'Dynamic Fab Inflow',
    currentValue: 22.8,
    unit: 'm³/hr',
    minObserved: 18.2,
    maxObserved: 28.6,
    compliancePercent: 100.0,
    status: 'Balanced',
    details: 'Electromagnetic flowmeter tracking final discharge to PUB public sewer monitoring pit.',
  },
  {
    parameter: 'Neutralization Status',
    specLimit: 'Automated Dual-Stage',
    internalBuffer: 'Acid/Caustic Staging',
    currentValue: 100.0,
    unit: '% Health',
    minObserved: 18.0,
    maxObserved: 45.0,
    compliancePercent: 100.0,
    status: 'Active Control',
    details: 'Current dosing: H2SO4 acid 18 ml/min, NaOH caustic 45 ml/min. Interlock nominal.',
  },
];

// 8. IWTP 24-hour Continuous Telemetry Profile
export const IWTP_HOURLY_DATA: IwtpHourlyPoint[] = [
  { hour: '00:00', timeDisplay: '00:00', ph: 7.28, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 40.1, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.25, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 19.4, acidDosingMlMin: 16, causticDosingMlMin: 42, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Night baseline discharge; Stage 1 neutralizer calm' },
  { hour: '01:00', timeDisplay: '01:00', ph: 7.30, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.5, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.22, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 18.8, acidDosingMlMin: 15, causticDosingMlMin: 40, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Stable pH buffering; CaF2 clarifier rake torque nominal' },
  { hour: '02:00', timeDisplay: '02:00', ph: 7.32, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 38.8, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.18, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 18.5, acidDosingMlMin: 15, causticDosingMlMin: 39, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Minimal CMP slurry discharge; TOC analyzer calibrated' },
  { hour: '03:00', timeDisplay: '03:00', ph: 7.29, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 38.2, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.10, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 18.2, acidDosingMlMin: 14, causticDosingMlMin: 38, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Lowest daily flow observed; All dosing pumps within calibration' },
  { hour: '04:00', timeDisplay: '04:00', ph: 7.31, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.0, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.14, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 18.6, acidDosingMlMin: 15, causticDosingMlMin: 40, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'UPW polisher regeneration backwash buffer drained safely' },
  { hour: '05:00', timeDisplay: '05:00', ph: 7.34, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.8, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.20, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 19.2, acidDosingMlMin: 16, causticDosingMlMin: 42, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Fluoride dosing coagulant batch auto-transferred to Day Tank A' },
  { hour: '06:00', timeDisplay: '06:00', ph: 7.36, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 41.2, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.28, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 20.4, acidDosingMlMin: 17, causticDosingMlMin: 44, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Shift transition prep; Scrubber blowdown surge tank balanced' },
  { hour: '07:00', timeDisplay: '07:00', ph: 7.38, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 43.5, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.35, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 22.0, acidDosingMlMin: 18, causticDosingMlMin: 46, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Shift 1 Handover - Etch and Wet Bench acid waste dump active' },
  { hour: '08:00', timeDisplay: '08:00', ph: 7.42, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 46.8, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.48, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 24.2, acidDosingMlMin: 20, causticDosingMlMin: 49, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Wet clean lot processing load; Caustic pump staging to 65% speed' },
  { hour: '09:00', timeDisplay: '09:00', ph: 7.48, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 51.2, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.62, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 26.5, acidDosingMlMin: 22, causticDosingMlMin: 52, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'High organic solvent rinse load; Aeration tank dissolved O2 at 3.2 mg/L' },
  { hour: '10:00', timeDisplay: '10:00', ph: 7.55, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 54.6, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.74, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 27.8, acidDosingMlMin: 24, causticDosingMlMin: 55, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Peak morning wet bench activity; Dual-stage pH feedback responding smoothly' },
  { hour: '11:00', timeDisplay: '11:00', ph: 7.62, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 57.8, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.85, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 28.6, acidDosingMlMin: 24, causticDosingMlMin: 54, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Daily maximum flow (28.6 m³/hr) and max COD (57.8 mg/L) observed; 100% compliant' },
  { hour: '12:00', timeDisplay: '12:00', ph: 7.50, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 52.0, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.68, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 26.9, acidDosingMlMin: 22, causticDosingMlMin: 51, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Midday production; Acid dosage modulated downward' },
  { hour: '13:00', timeDisplay: '13:00', ph: 7.44, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 48.5, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.55, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 25.4, acidDosingMlMin: 20, causticDosingMlMin: 48, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Post-CMP rinse effluent settled; Clarifier effluent turbidity < 1.2 NTU' },
  { hour: '14:00', timeDisplay: '14:00', ph: 7.39, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 45.2, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.44, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 24.1, acidDosingMlMin: 19, causticDosingMlMin: 47, complianceStatus: 'In Spec', shift: 'Shift 1', notes: 'Cooling tower blowdown blend valve modulated to maintain TDS < 1200' },
  { hour: '15:00', timeDisplay: '15:00', ph: 7.34, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 42.4, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.34, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 22.8, acidDosingMlMin: 18, causticDosingMlMin: 45, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Shift 2 Handover Current State - Optimal neutralization baseline' },
  { hour: '16:00', timeDisplay: '16:00', ph: 7.30, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 41.0, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.30, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 21.9, acidDosingMlMin: 17, causticDosingMlMin: 44, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Fluoride coagulant flocculation chamber inspection completed' },
  { hour: '17:00', timeDisplay: '17:00', ph: 7.25, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 40.4, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.26, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 21.2, acidDosingMlMin: 17, causticDosingMlMin: 43, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Scrubber chemical bleed tank cycle normal' },
  { hour: '18:00', timeDisplay: '18:00', ph: 7.22, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.8, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.23, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 20.8, acidDosingMlMin: 16, causticDosingMlMin: 42, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Effluent discharge telemetry stream transmitting to NEA portal' },
  { hour: '19:00', timeDisplay: '19:00', ph: 7.18, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.2, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.20, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 20.5, acidDosingMlMin: 16, causticDosingMlMin: 41, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Evening production load steady; Sand filter backwash scheduled' },
  { hour: '20:00', timeDisplay: '20:00', ph: 7.15, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 38.9, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.18, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 20.1, acidDosingMlMin: 15, causticDosingMlMin: 41, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Heavy metals atomic absorption test sample verified within trace limits' },
  { hour: '21:00', timeDisplay: '21:00', ph: 7.10, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 38.5, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.16, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 19.8, acidDosingMlMin: 15, causticDosingMlMin: 40, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Discharge weir free-flowing, no foam or suspended solids' },
  { hour: '22:00', timeDisplay: '22:00', ph: 7.04, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 38.4, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.15, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 19.5, acidDosingMlMin: 15, causticDosingMlMin: 39, complianceStatus: 'In Spec', shift: 'Shift 2', notes: 'Daily minimum pH observed (7.04); Well within 6.00-9.00 spec limit' },
  { hour: '23:00', timeDisplay: '23:00', ph: 7.12, phLowerLimit: 6.00, phUpperLimit: 9.00, phBufferLow: 6.80, phBufferHigh: 7.60, codMgL: 39.1, codLimitMgL: 100.0, codWarningMgL: 80.0, fluorideMgL: 1.19, fluorideLimitMgL: 5.0, dischargeFlowM3Hr: 19.6, acidDosingMlMin: 15, causticDosingMlMin: 40, complianceStatus: 'In Spec', shift: 'Shift 3', notes: 'Night shift handover; All continuous telemetry logs signed off' },
];
