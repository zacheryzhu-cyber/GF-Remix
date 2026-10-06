import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Activity,
  Gauge,
  Sliders,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Filter,
  Layers,
  Cpu,
  RotateCcw,
  BarChart3,
  Thermometer,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
  Radio,
  Power,
  Settings,
  X,
  Play,
  Square,
  ShieldAlert,
  Server,
  Terminal,
  FileSpreadsheet,
  History,
  SlidersHorizontal
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

export interface StageData {
  id: number;
  name: string;
  shortName: string;
  tagline: string;
  color: string;
  bgGlow: string;
  borderGlow: string;
  incomingFluid: string;
  outgoingFluid: string;
  targetResistivity: string;
  targetToc: string;
  targetDo: string;
  equipmentList: ScadaEquipment[];
  scientificSummary: string;
  keyMissions: string[];
}

export interface ScadaEquipment {
  tag: string;
  name: string;
  type: string;
  stageId: number;
  status: 'Running' | 'Standby' | 'Tripped' | 'Maintenance' | 'Isolated';
  controlMode: 'AUTO' | 'MANUAL' | 'LOCAL';
  vfdSpeedHz?: number;
  flowM3h?: number;
  pressureBar?: number;
  tempC?: number;
  powerKw?: number;
  runHours?: number;
  interlocksHealthy: boolean;
  permissives: string[];
  specs: string;
  details: string;
  hasVfd?: boolean;
  hasPid?: boolean;
  pidSetpoint?: number;
  valvePositionPct?: number;
  // Side-stream equipment drawn off the main process line on the P&ID:
  // 'inject' feeds into the line (dosing), 'reject' draws out of it (drain,
  // reclaim), 'parallel' is an N+1 standby beside its duty unit, 'service'
  // is a support connection (backwash, regeneration).
  auxOf?: string;
  auxKind?: 'inject' | 'reject' | 'parallel' | 'service';
}

export interface ScadaInstrumentTag {
  tag: string;
  description: string;
  unit: string;
  stage: string;
  value: number;
  nominal: number;
  lowAlarm?: number;
  lowLowAlarm?: number;
  highAlarm?: number;
  highHighAlarm?: number;
  status: 'NORM' | 'LOW' | 'LOW_LOW' | 'HIGH' | 'HIGH_HIGH';
  plcSource: string;
  // Equipment the transmitter is mounted on, for P&ID alarm indicators and
  // unit-detail displays.
  equip?: string;
  // ISA-18.2 designed suppression: the alarm is inhibited while its unit is
  // out of service (a stopped RO train's low pressure is not an alarm).
  suppressed?: boolean;
}

export interface HistorianPoint {
  timeStr: string;
  resistivity: number;
  toc: number;
  dissolvedOxygen: number;
  silica: number;
  loopFlow: number;
  supplyPressure: number;
  returnPressure: number;
  deliveryTemp: number;
  velocity: number;
}

export interface SoeEvent {
  id: string;
  timestamp: string;
  type: 'ALARM' | 'COMMAND' | 'INTERLOCK' | 'SYSTEM';
  tag: string;
  description: string;
  severity: 'INFO' | 'WARN' | 'CRIT';
}

export interface WaferToolBay {
  id: string;
  bayName: string;
  toolType: string;
  subSystem: string;
  requiredResistivity: string;
  flowRateLpm: number;
  pressureBar: number;
  tempTolerance: string;
  pouFilterDpBar: number;
  valveStatus: 'OPEN' | 'THROTTLED' | 'ISOLATED';
  cleanroomClass: string;
}

export const UPW_STAGES: StageData[] = [
  {
    id: 1,
    name: 'Stage 1: Pre-Treatment & Conditioning',
    shortName: 'Pre-Treatment',
    tagline: 'Raw Water Conditioning & Membrane Protection',
    color: 'text-sky-400',
    bgGlow: 'bg-sky-500/10',
    borderGlow: 'border-sky-500/30',
    incomingFluid: 'City Raw Water / PUB NEWater (100–300 µS/cm)',
    outgoingFluid: 'Dechlorinated, Softened & Microfiltered Water',
    targetResistivity: '0.01 – 0.05 MΩ·cm',
    targetToc: '< 1500 ppb',
    targetDo: '6,000 – 8,000 ppb (Ambient)',
    equipmentList: [
      {
        tag: 'XV-101',
        name: 'Raw Water Feed Isolation Valve',
        type: 'Manual-Override Pneumatic Isolation Valve',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 100,
        interlocksHealthy: true,
        permissives: ['Upstream PUB Supply Pressure Normal', 'Actuator Air > 6 bar'],
        specs: '6-inch butterfly valve, pneumatic fail-closed actuator.',
        details: 'Primary block valve isolating the plant from the municipal/NEWater header. Fails closed on loss of instrument air.'
      },
      {
        tag: 'LCV-100',
        name: 'Break Tank Level Control Valve',
        type: 'Modulating Globe Control Valve',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 48,
        interlocksHealthy: true,
        permissives: ['LIC-100 In AUTO', 'Actuator Air > 6 bar'],
        specs: '4-inch globe valve, equal-% trim, pneumatic fail-closed positioner.',
        details: 'Final element of LIC-100: throttles city/NEWater make-up to hold T-100 at its 72% level setpoint.'
      },
      {
        tag: 'T-100',
        name: 'Raw Water / Feed Tank',
        type: 'Atmospheric Break Storage Tank',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        interlocksHealthy: true,
        permissives: ['LT-100 Level > 25%', 'Overflow Weir Clear'],
        specs: '120 m³ FRP tank with air-gap inlet [LPG: UPW-TK-01].',
        details: 'Hydraulically decouples the plant from the city header and provides suction head for P-101A/B. Low-low level trips the feed pumps via I-101.'
      },
      {
        tag: 'P-101A',
        name: 'Raw Water Feed Pump 01',
        type: 'Centrifugal Feed Pump',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 48.5,
        flowM3h: 345,
        pressureBar: 4.8,
        powerKw: 37,
        runHours: 4210,
        interlocksHealthy: true,
        permissives: ['Suction Pressure > 1.2 bar', 'Break Tank Level Normal', 'E-Stop OK'],
        specs: 'Duplex 316L, 360 m³/h @ 5.2 bar [LPG: UPW-P-01].',
        details: 'Main feed pump delivering city water through multimedia and carbon filtration beds.',
        hasVfd: true
      },
      {
        tag: 'P-101B',
        name: 'Raw Water Feed Pump 02 (N+1)',
        type: 'Centrifugal Standby Pump',
        stageId: 1,
        status: 'Standby',
        controlMode: 'AUTO',
        vfdSpeedHz: 0,
        flowM3h: 0,
        pressureBar: 0,
        powerKw: 0,
        runHours: 3980,
        interlocksHealthy: true,
        permissives: ['Auto-Failover Ready', 'Isolation Valves Open', 'E-Stop OK'],
        specs: 'Duplex 316L, 360 m³/h @ 5.2 bar [LPG: UPW-P-02].',
        details: 'Automatic standby pump ready for bumpless failover upon P-101A trip.',
        hasVfd: true,
        auxOf: 'P-101A',
        auxKind: 'parallel'
      },
      {
        tag: 'MMF-101',
        name: 'Multi-Media Filter Bank Vessel A',
        type: 'Granular Media Filter',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 3.9,
        interlocksHealthy: true,
        permissives: ['Delta-P < 0.8 bar', 'Backwash Idle'],
        specs: 'Anthracite, quartz sand, garnet bed. 350 m³/h capacity [LPG: MMF].',
        details: 'Filters silt, colloids, and particulates > 10 µm. Runs in parallel with vessel B; each backwashes on its own differential pressure (PDT-101A) while the partner carries full flow.'
      },
      {
        tag: 'ACF-102',
        name: 'Activated Carbon Filter & Dechlorination',
        type: 'Adsorption Column & Chemical Dosing',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 3.5,
        interlocksHealthy: true,
        permissives: ['SBS Metering Pump Active', 'ORP < 250 mV'],
        specs: 'Granular activated carbon + NaHSO₃ injection.',
        details: 'Scavenges free chlorine down to < 0.01 ppm to shield downstream polyamide RO membranes.'
      },
      {
        tag: 'SFT-103',
        name: 'Strong Acid Cation Exchanger 0911',
        type: 'Zeolite Hardness Exchanger',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 3.1,
        interlocksHealthy: true,
        permissives: ['Brine Tank Ready', 'Total Hardness < 0.2 ppm'],
        specs: 'Strong acid cation (Na⁺ form) resin bed [LPG: SAC-0911].',
        details: 'Substitutes Ca²⁺ and Mg²⁺ scale-forming cations with soluble sodium ions. Twin alternating with SFT-103B: on exhaustion the PLC swaps service to the regenerated partner and brine-regenerates this unit.'
      },
      {
        tag: 'HX-106',
        name: 'RO Feed Temperature Exchanger',
        type: 'Plate Heat Exchanger (Feed Temperature Control)',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        tempC: 24.0,
        interlocksHealthy: true,
        permissives: ['Heating/Cooling Water Available', 'TIC-106 In AUTO'],
        specs: '316L gasketed plate exchanger on facility heating/cooling water.',
        details: 'Holds RO feed at 24°C. RO flux falls ~3% per °C below design, so cold feed starves permeate production.'
      },
      {
        tag: 'CF-104',
        name: 'Pretreatment Filter 01 (5.0 µm)',
        type: 'Depth Cartridge Microfiltration',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 2.8,
        interlocksHealthy: true,
        permissives: ['Filter Differential Pressure < 0.4 bar'],
        specs: '5.0 µm & 1.0 µm melt-blown polypropylene cartridges [LPG: UPW-F-01].',
        details: 'Final barrier safeguarding the RO high-pressure pumps against particulate carryover. Duplex with CF-104B: stopping the duty housing swings flow to the standby so cartridges can be changed on line.'
      },
      {
        tag: 'BWP-105',
        name: 'MMF Backwash Pump',
        type: 'Centrifugal Backwash Pump',
        stageId: 1,
        status: 'Standby',
        controlMode: 'AUTO',
        flowM3h: 0,
        powerKw: 0,
        runHours: 640,
        interlocksHealthy: true,
        permissives: ['Backwash Waste Line Open', 'MMF Vessel Isolated From Service'],
        specs: '220 m³/h @ 2.5 bar, 316L.',
        details: 'Reverse-flushes MMF-101 media beds on high differential pressure or timer. Waste goes to the neutralization sump.',
        auxOf: 'MMF-101',
        auxKind: 'service'
      },
      {
        tag: 'CDS-102',
        name: 'Bisulfite Injection System (Dechlorination)',
        type: 'Diaphragm Metering Pump',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        flowM3h: 0.012,
        powerKw: 0.37,
        runHours: 3820,
        interlocksHealthy: true,
        permissives: ['SBS Day Tank Level > 15%', 'ORP Feedback Loop Active'],
        specs: 'ProMinent diaphragm pump, 12 L/h, ORP-trimmed [LPG: S-131].',
        details: 'Injects sodium bisulfite to scavenge residual chlorine ahead of the RO membranes. Loss of dosing drives ORP up (AIT-102) as chlorine breaks through.',
        auxOf: 'ACF-102',
        auxKind: 'inject'
      },
      {
        tag: 'BRN-103',
        name: 'Acid / Brine Regeneration System',
        type: 'Brine Saturator Tank',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        interlocksHealthy: true,
        permissives: ['Salt Level Above Water Line', 'Brine Valve Ready'],
        specs: '4 m³ polyethylene saturator with salt grid [LPG: S-091].',
        details: 'Supplies saturated NaCl brine to regenerate SFT-103/103B resin. Each regeneration draws the saturator down; it refills as salt dissolves.',
        auxOf: 'SFT-103',
        auxKind: 'service'
      },
      {
        tag: 'MMF-101B',
        name: 'Multi-Media Filter Bank Vessel B',
        type: 'Granular Media Filter',
        stageId: 1,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 3.9,
        interlocksHealthy: true,
        permissives: ['Delta-P < 0.8 bar', 'Backwash Idle'],
        specs: 'Anthracite, quartz sand, garnet bed. 175 m³/h per vessel [LPG: MMF].',
        details: 'Parallel partner of vessel A. Backwash is inhibited while the partner vessel is out of service, so filtration never stops.',
        auxOf: 'MMF-101',
        auxKind: 'parallel'
      },
      {
        tag: 'SFT-103B',
        name: 'Strong Acid Cation Exchanger 0912',
        type: 'Zeolite Hardness Exchanger',
        stageId: 1,
        status: 'Standby',
        controlMode: 'AUTO',
        pressureBar: 0,
        interlocksHealthy: true,
        permissives: ['Regenerated & Rinsed', 'Brine Tank Ready'],
        specs: 'Strong acid cation (Na⁺ form) resin bed [LPG: SAC-0912].',
        details: 'Regenerated standby of the twin alternating softener pair. Takes service automatically when SFT-103 exhausts.',
        auxOf: 'SFT-103',
        auxKind: 'parallel'
      },
      {
        tag: 'CF-104B',
        name: 'Pretreatment Filter 02 (5.0 µm)',
        type: 'Depth Cartridge Microfiltration',
        stageId: 1,
        status: 'Standby',
        controlMode: 'AUTO',
        pressureBar: 0,
        interlocksHealthy: true,
        permissives: ['Filter Differential Pressure < 0.4 bar', 'Housing Vented & Filled'],
        specs: '5.0 µm & 1.0 µm melt-blown polypropylene cartridges [LPG: UPW-F-02].',
        details: 'Standby housing of the duplex cartridge filter. Swings into service automatically when CF-104 is stopped for a cartridge change.',
        auxOf: 'CF-104',
        auxKind: 'parallel'
      }
    ],
    scientificSummary:
      'Raw incoming municipal water or NEWater contains high concentrations of multivalent minerals (calcium, magnesium), organic humic acids, and oxidizing disinfectants (chlorine/chloramines). Pre-treatment systematically strips coarse particulates (SDI < 3.0) and chemical oxidants to prevent fouling or chemical degradation of downstream reverse osmosis membranes.',
    keyMissions: [
      'Maintain Silt Density Index (SDI₁₅) below 3.0',
      'Neutralize free chlorine oxidants (< 0.01 mg/L)',
      'Mitigate calcium carbonate scaling on high-pressure membranes',
      'Buffer feed temperature to optimal 22.0°C – 25.0°C'
    ]
  },
  {
    id: 2,
    name: 'Stage 2: Primary Purification (Make-Up Loop)',
    shortName: 'Primary Make-Up',
    tagline: 'Bulk Demineralization & Dissolved Gas Stripping',
    color: 'text-blue-400',
    bgGlow: 'bg-blue-500/10',
    borderGlow: 'border-blue-500/30',
    incomingFluid: 'Filtered Soft Water (~200 µS/cm)',
    outgoingFluid: 'High-Purity Permeate (10 – 16 MΩ·cm)',
    targetResistivity: '12.0 – 16.5 MΩ·cm',
    targetToc: '< 10 ppb',
    targetDo: '< 20 ppb',
    equipmentList: [
      {
        tag: 'RO-P-201A',
        name: 'RO Train A High-Pressure Pump',
        type: 'Multi-Stage High Pressure Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 49.2,
        flowM3h: 170,
        pressureBar: 15.6,
        powerKw: 75,
        runHours: 5890,
        interlocksHealthy: true,
        permissives: ['Feed Suction Pressure > 2.0 bar', 'Membrane Permeate Valve Open'],
        specs: 'Super-Duplex multi-stage pump, 180 m³/h @ 16.0 bar.',
        details: 'Drives RO Train A. Two 60% trains run in parallel; losing one leaves the other carrying 60% of make-up demand while T-205 draws down.',
        hasVfd: true
      },
      {
        tag: 'RO1-201',
        name: 'Reverse Osmosis Train 01',
        type: 'Spiral-Wound Polyamide Array',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 15.4,
        interlocksHealthy: true,
        permissives: ['Flux Normalized OK', 'Conductivity Rejection > 98.5%'],
        specs: '8-inch spiral-wound thin-film composite modules, 2:1 array [LPG: UPW-RO-01].',
        details: 'Removes 99% of dissolved mineral ions, silica, and heavy organics. Fouls over time: normalized permeate flow (FY-201A) falling 15% calls for a CIP.'
      },
      {
        tag: 'RO-P-202A',
        name: 'RO Interstage Booster Pump A',
        type: 'Vertical Multi-Stage Interstage Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 46.0,
        flowM3h: 270,
        pressureBar: 10.4,
        powerKw: 55,
        runHours: 5760,
        interlocksHealthy: true,
        permissives: ['1st-Pass Permeate Pressure > 0.5 bar', 'E-Stop OK'],
        specs: '316L vertical multi-stage pump, 280 m³/h @ 11 bar.',
        details: 'Re-pressurizes 1st-pass permeate to drive the 2nd-pass RO array. Loss of both interstage pumps stops permeate production.',
        hasVfd: true
      },
      {
        tag: 'RO2-202',
        name: '2nd-Pass Reverse Osmosis Skid',
        type: 'Permeate Polishing Array',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 10.2,
        interlocksHealthy: true,
        permissives: ['Permeate Pressure Normal', 'Concentrate Divert Operational'],
        specs: 'Low-energy polyamide membrane array.',
        details: 'Elevates total ionic rejection to > 99.8%, with concentrate recycled back to Stage 1 feed.'
      },
      {
        tag: 'MDG-203',
        name: 'Vacuum Membrane Degasifier (Liqui-Cel)',
        type: 'Hollow-Fiber Gas Contactor',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: -0.92,
        interlocksHealthy: true,
        permissives: ['Vacuum Blower Healthy', 'Seal Water Flow Normal'],
        specs: 'Hydrophobic microporous hollow-fiber contactor with vacuum pump.',
        details: 'Strips dissolved CO₂ and bulk O₂ to prevent carbonate loading on downstream resin beds.'
      },
      {
        tag: 'CEDI-204',
        name: 'Electrodeionization Train 01 (CEDI)',
        type: 'Electrochemical Polisher',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        powerKw: 18.5,
        interlocksHealthy: true,
        permissives: ['DC Rectifier Output Stable', 'Reject Flow Minimum Satisfied'],
        specs: 'Multi-cell ion exchange membranes with DC electrical water-splitting [LPG: UPW-EDI-01].',
        details: 'Continuously regenerates resin without requiring bulk acid/caustic chemicals.'
      },
      {
        tag: 'XV-201',
        name: 'RO Concentrate/Reject Divert Valve',
        type: 'Modulating Pneumatic Divert Valve',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 100,
        interlocksHealthy: true,
        permissives: ['Recovery Ratio Within Design Band', 'Actuator Air > 6 bar'],
        specs: '3-inch V-notch ball valve, pneumatic fail-closed modulating actuator.',
        details: 'Routes RO concentrate to drain or, when within spec, back to Stage 1 feed for recovery.',
        auxOf: 'RO1-201',
        auxKind: 'reject'
      },
      {
        tag: 'RO-P-201B',
        name: 'RO Train B High-Pressure Pump',
        type: 'Multi-Stage High Pressure Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 49.6,
        flowM3h: 170,
        pressureBar: 15.8,
        powerKw: 75,
        runHours: 5410,
        interlocksHealthy: true,
        permissives: ['Feed Suction Pressure > 2.0 bar', 'Train B Not In CIP', 'E-Stop OK'],
        specs: 'Super-Duplex multi-stage pump, 180 m³/h @ 16.0 bar.',
        details: 'Drives RO Train B, in parallel with Train A. Stop it to isolate Train B for CIP.',
        hasVfd: true,
        auxOf: 'RO-P-201A',
        auxKind: 'parallel'
      },
      {
        tag: 'ADS-200',
        name: 'Antiscalant Dosing Skid',
        type: 'Duplex Diaphragm Metering Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        flowM3h: 0.004,
        powerKw: 0.25,
        runHours: 5220,
        interlocksHealthy: true,
        permissives: ['Antiscalant Tote Level > 10%', 'Flow-Paced Signal From FT-201'],
        specs: 'Flow-paced dosing at 3 ppm, duty/standby heads.',
        details: 'Injects antiscalant ahead of the HP pump to stop CaCO₃/silica scaling on RO membranes. Loss of dosing drives RO differential pressure up (PDT-201).',
        auxOf: 'RO-P-201A',
        auxKind: 'inject'
      },
      {
        tag: 'SMP-206',
        name: 'RO Reject & Neutralization Sump Tank',
        type: 'Neutralization Sump Tank',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        interlocksHealthy: true,
        permissives: ['pH Neutralization 6.0–9.0', 'Discharge Pumps Available'],
        specs: '40 m³ lined concrete sump with pH-controlled discharge [LPG: T-200 / WASTE].',
        details: 'Collects RO concentrate, MMF backwash waste and CIP spent chemicals before permitted discharge.',
        auxOf: 'RO1-201',
        auxKind: 'reject'
      },
      {
        tag: 'RO1-211',
        name: 'Reverse Osmosis Train 02',
        type: 'Spiral-Wound Polyamide Array',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 15.6,
        interlocksHealthy: true,
        permissives: ['Flux Normalized OK', 'Conductivity Rejection > 98.5%'],
        specs: '8-inch spiral-wound thin-film composite modules, 2:1 array [LPG: UPW-RO-02].',
        details: 'Parallel 60% train. Its own HP pump, concentrate valve and instruments let it be isolated for CIP while Train A keeps producing.',
        auxOf: 'RO1-201',
        auxKind: 'parallel'
      },
      {
        tag: 'FCV-201A',
        name: 'Train A Concentrate Control Valve',
        type: 'Modulating Concentrate Control Valve',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 38,
        interlocksHealthy: true,
        permissives: ['Train A Running', 'Actuator Air > 6 bar'],
        specs: '2-inch V-port ball valve, fail-last positioner.',
        details: 'Throttles Train A concentrate to hold 75% recovery. Concentrate goes to SMP-206 via XV-201.',
        auxOf: 'RO1-201',
        auxKind: 'reject'
      },
      {
        tag: 'FCV-201B',
        name: 'Train B Concentrate Control Valve',
        type: 'Modulating Concentrate Control Valve',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 40,
        interlocksHealthy: true,
        permissives: ['Train B Running', 'Actuator Air > 6 bar'],
        specs: '2-inch V-port ball valve, fail-last positioner.',
        details: 'Throttles Train B concentrate to hold 75% recovery.',
        auxOf: 'RO1-211',
        auxKind: 'reject'
      },
      {
        tag: 'RO-P-202B',
        name: 'RO Interstage Booster Pump B (N+1)',
        type: 'Vertical Multi-Stage Interstage Standby Pump',
        stageId: 2,
        status: 'Standby',
        controlMode: 'AUTO',
        vfdSpeedHz: 0,
        flowM3h: 0,
        pressureBar: 0,
        powerKw: 0,
        runHours: 5130,
        interlocksHealthy: true,
        permissives: ['Auto-Failover Ready', 'E-Stop OK'],
        specs: '316L vertical multi-stage pump, 280 m³/h @ 11 bar.',
        details: 'Automatic standby for RO-P-202A. Bumpless transfer within 1.2s on duty pump stop.',
        hasVfd: true,
        auxOf: 'RO-P-202A',
        auxKind: 'parallel'
      },
      {
        tag: 'CDS-202',
        name: 'Caustic Injection System (pH Control)',
        type: 'Diaphragm Metering Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        flowM3h: 0.006,
        powerKw: 0.37,
        runHours: 5010,
        interlocksHealthy: true,
        permissives: ['NaOH Day Tank Level > 15%', 'AIC-203 pH Loop In AUTO'],
        specs: 'ProMinent diaphragm pump, 6 L/h 25% NaOH, pH-trimmed [LPG: S-0511].',
        details: 'Raises 2nd-pass feed to pH 9.5 so boric acid ionizes and is rejected. Loss of dosing drops the pH and boron slips into the permeate (AIT-202).',
        auxOf: 'RO-P-202A',
        auxKind: 'inject'
      },
      {
        tag: 'VP-203',
        name: 'Degasifier Vacuum Pump',
        type: 'Liquid-Ring Vacuum Pump',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: -0.92,
        powerKw: 7.5,
        runHours: 6020,
        interlocksHealthy: true,
        permissives: ['Seal Water Flow Normal', 'Vacuum < -0.85 bar'],
        specs: 'Liquid-ring vacuum pump with seal-water recirculation.',
        details: 'Pulls vacuum on the MDG-203 contactor shell. Without it CO₂ stays dissolved and loads CEDI-204, dropping its product resistivity (AIT-204).',
        auxOf: 'MDG-203',
        auxKind: 'service'
      },
      {
        tag: 'T-205',
        name: 'RO Permeate Tank (Product Storage)',
        type: 'N₂-Blanketed Storage Tank',
        stageId: 2,
        status: 'Running',
        controlMode: 'AUTO',
        interlocksHealthy: true,
        permissives: ['LT-205 Level > 25%', 'N₂ Blanket Pressure Normal'],
        specs: '200 m³ electropolished 316L tank, N₂ blanketed, 0.2 µm vent filter [LPG: UPW-TK-02 / T-2511].',
        details: 'Buffers make-up production from the polishing loop. Level falls when RO production stops while Stage 3 keeps drawing.'
      }
    ],
    scientificSummary:
      'The Primary Make-Up section performs bulk demineralization, taking water from ~200 µS/cm up to > 15 MΩ·cm. Combining two passes of reverse osmosis with membrane degasification and continuous electro-deionization (CEDI) removes over 99.9% of all dissolved salts, ionic silica, and dissolved carbonate species.',
    keyMissions: [
      'Reject > 99.8% of dissolved ionic salts via double-pass RO',
      'Strip volatile CO₂ to prevent carbonate loading on polisher beds',
      'Achieve continuous CEDI operation without chemical regeneration downtime',
      'Supply constant makeup volume to the cleanroom polishing storage tank'
    ]
  },
  {
    id: 3,
    name: 'Stage 3: Sub-Fab Polishing Loop',
    shortName: 'Polishing Loop',
    tagline: 'Sub-ppb Ultra-Purification to Theoretical Limits',
    color: 'text-cyan-400',
    bgGlow: 'bg-cyan-500/10',
    borderGlow: 'border-cyan-500/30',
    incomingFluid: 'Primary Make-Up Water (~15 MΩ·cm)',
    outgoingFluid: 'Semiconductor-Grade UPW (18.20 MΩ·cm @ 25°C)',
    targetResistivity: '18.18 – 18.20 MΩ·cm',
    targetToc: '< 1.0 ppb (Target: 0.5 ppb)',
    targetDo: '< 1.0 ppb',
    equipmentList: [
      {
        tag: 'P-301A',
        name: 'UPW Circulation Pump 03 (Polishing Feed)',
        type: 'Sanitary Centrifugal Loop Pump',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 48.0,
        flowM3h: 360,
        pressureBar: 5.6,
        powerKw: 45,
        runHours: 7010,
        interlocksHealthy: true,
        permissives: ['T-205 Level > 10% (I-301)', 'Discharge Valve Open', 'E-Stop OK'],
        specs: 'PVDF-lined magnetically coupled sanitary pump, 380 m³/h @ 6 bar [LPG: UPW-P-03].',
        details: 'Draws make-up water from T-205 through the polishing train. Tripped by I-301 on T-205 low-low level to protect against dry running.',
        hasVfd: true
      },
      {
        tag: 'P-301B',
        name: 'UPW Circulation Pump 04 (N+1 Standby)',
        type: 'Sanitary Centrifugal Loop Standby Pump',
        stageId: 3,
        status: 'Standby',
        controlMode: 'AUTO',
        vfdSpeedHz: 0,
        flowM3h: 0,
        pressureBar: 0,
        powerKw: 0,
        runHours: 6660,
        interlocksHealthy: true,
        permissives: ['Auto-Failover Ready', 'E-Stop OK'],
        specs: 'PVDF-lined magnetically coupled sanitary pump, 380 m³/h @ 6 bar [LPG: UPW-P-04].',
        details: 'Automatic standby for P-301A. Bumpless transfer within 1.2s on duty pump stop.',
        hasVfd: true,
        auxOf: 'P-301A',
        auxKind: 'parallel'
      },
      {
        tag: 'VP-303',
        name: 'Catalytic Degasifier Vacuum Pump',
        type: 'Dry Screw Vacuum Pump',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: -0.96,
        powerKw: 5.5,
        runHours: 6840,
        interlocksHealthy: true,
        permissives: ['Exhaust Line Clear', 'Vacuum < -0.90 bar'],
        specs: 'Oil-free dry screw vacuum pump.',
        details: 'Holds vacuum on CAT-MDG-303 alongside the N₂ sweep. Without it dissolved oxygen climbs above spec.',
        auxOf: 'CAT-MDG-303',
        auxKind: 'service'
      },
      {
        tag: 'TOC-UV-301',
        name: '185nm / 254nm Dual Photolytic UV Reactor',
        type: 'Photochemical Organics Destruction',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        powerKw: 24,
        interlocksHealthy: true,
        permissives: ['Lamp Ballast Faults: 0', 'Chamber Temperature < 40°C'],
        specs: 'Low-pressure high-output lamps emitting at 185 nm & 254 nm.',
        details: 'Photolyzes water into hydroxyl free radicals (•OH), oxidizing trace organic molecules to CO₂.'
      },
      {
        tag: 'UPW-MB-302',
        name: 'Primary Mixed Bed Polisher 3411 (Lead)',
        type: 'Non-Regenerable Mixed Bed Ion Exchanger',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 4.2,
        interlocksHealthy: true,
        permissives: ['Effluent Resistivity > 18.0 MΩ·cm', 'Resin Volume 100%'],
        specs: '1:1 stoichiometric ratio of ultra-clean strong acid cation & strong base anion virgin resin [LPG: MB-3411].',
        details: 'Lead bed of the lead/lag pair. Takes the ionic load from UV oxidation; its breakthrough shows first at the inter-bed cell AIT-312 while the lag bed still holds 18.2 MΩ·cm.'
      },
      {
        tag: 'UPW-MB-312',
        name: 'Primary Mixed Bed Polisher 3412 (Lag)',
        type: 'Non-Regenerable Mixed Bed Ion Exchanger',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 4.0,
        interlocksHealthy: true,
        permissives: ['Effluent Resistivity > 18.0 MΩ·cm', 'Resin Volume 100%'],
        specs: 'Virgin nuclear-grade 1:1 SAC/SBA resin, 2.5 m³ [LPG: MB-3411].',
        details: 'Lag (guard) bed. Catches lead-bed breakthrough so the lead resin can be run to full exhaustion before change-out.'
      },
      {
        tag: 'CAT-MDG-303',
        name: 'Catalytic Degasifier & N₂ Vacuum Contactor',
        type: 'Deep Dissolved Oxygen Stripping',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: -0.96,
        interlocksHealthy: true,
        permissives: ['N2 Blanket Pressure > 4.5 bar', 'Vacuum Pump Operational'],
        specs: 'Gas-permeable hollow fiber membranes with nitrogen sweep.',
        details: 'Reduces dissolved oxygen (DO) to < 1.0 ppb to prevent uncontrolled oxide growth on silicon wafers.'
      },
      {
        tag: 'UF-304',
        name: 'Terminal Ultrafiltration (UF Polisher)',
        type: 'Nanoparticle & Endotoxin Barrier',
        stageId: 3,
        status: 'Running',
        controlMode: 'AUTO',
        pressureBar: 3.8,
        interlocksHealthy: true,
        permissives: ['Transmembrane Delta-P < 0.6 bar', 'Integrity Test OK'],
        specs: '0.02 µm (6,000–10,000 Dalton MWCO) polysulfone hollow-fiber modules.',
        details: 'Guarantees zero particle shedding (> 0.05 µm) and retains cellular fragments before fab distribution.'
      },
      {
        tag: 'XV-301',
        name: 'Mixed Bed Pair Bypass Valve (N.C.)',
        type: 'Normally-Closed Pneumatic Bypass Valve',
        stageId: 3,
        status: 'Isolated',
        controlMode: 'AUTO',
        valvePositionPct: 0,
        interlocksHealthy: true,
        permissives: ['Bed Differential Pressure Normal', 'Actuator Air > 6 bar'],
        specs: '4-inch diaphragm valve, PVDF-lined, pneumatic fail-closed actuator.',
        details: 'Bypasses the lead/lag mixed-bed pair. Only needed if both beds must come out at once; product falls to CEDI grade and I-402 will isolate the loop.',
        auxOf: 'UPW-MB-302',
        auxKind: 'parallel'
      }
    ],
    scientificSummary:
      'The Polishing Loop represents the apex of industrial chemical purity. Water is constantly circulated through high-energy 185nm photolysis, virgin non-regenerable nuclear-grade ion-exchange resins, and 0.02 µm ultrafiltration. This achieves theoretical water purity: 18.20 MΩ·cm resistivity at 25°C with single-digit parts-per-trillion (ppt) metallic ion contamination.',
    keyMissions: [
      'Attain and stabilize 18.20 MΩ·cm electrical resistivity at 25°C',
      'Sustain Total Organic Carbon (TOC) below 1.0 ppb (sub-ppb)',
      'Deplete Dissolved Oxygen (DO) to < 1.0 ppb to shield silicon substrates',
      'Filter all particulates > 0.05 µm to zero counts per milliliter'
    ]
  },
  {
    id: 4,
    name: 'Stage 4: Distribution Loop & Cleanroom Reclaim',
    shortName: 'Distribution & Reclaim',
    tagline: 'Zero-Deadleg Fab Tool Delivery & 80%+ Water Recycling',
    color: 'text-emerald-400',
    bgGlow: 'bg-emerald-500/10',
    borderGlow: 'border-emerald-500/30',
    incomingFluid: 'Polished UPW (18.20 MΩ·cm)',
    outgoingFluid: 'Direct to Wet Benches, CMP & Reclaim Return',
    targetResistivity: '18.18 – 18.20 MΩ·cm (Supply & Return)',
    targetToc: '< 1.0 ppb',
    targetDo: '< 1.0 ppb',
    equipmentList: [
      {
        tag: 'DST-P-401A',
        name: 'Sub-Fab Recirculation Lead Pump A (UPW Circulation)',
        type: 'Continuous Loop Propulsion (N+1 Lead)',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        vfdSpeedHz: 49.8,
        flowM3h: 342,
        pressureBar: 6.2,
        powerKw: 45,
        runHours: 7120,
        interlocksHealthy: true,
        permissives: ['Loop Minimum Flow Satisfied', 'Bearing Vibration Normal', 'E-Stop OK'],
        specs: 'Electropolished 316L / PVDF magnetically coupled sanitary pump (350 m³/h) [LPG: UPW-P-03].',
        details: 'Maintains turbulent flow (> 1.8 m/s) throughout the PVDF loop to prevent biofilm formation.',
        hasVfd: true
      },
      {
        tag: 'DST-P-401B',
        name: 'Sub-Fab Recirculation Standby Pump B (UPW Circulation)',
        type: 'Continuous Loop Propulsion (N+1 Standby)',
        stageId: 4,
        status: 'Standby',
        controlMode: 'AUTO',
        vfdSpeedHz: 0,
        flowM3h: 0,
        pressureBar: 0,
        powerKw: 0,
        runHours: 6890,
        interlocksHealthy: true,
        permissives: ['Auto-Failover Active', 'Discharge Valve Ready', 'E-Stop OK'],
        specs: 'Electropolished 316L / PVDF magnetically coupled sanitary pump (350 m³/h) [LPG: UPW-P-04].',
        details: 'Instantaneous bumpless transfer within 1.2s if Lead Pump A experiences an electrical or hydraulic trip.',
        hasVfd: true,
        auxOf: 'DST-P-401A',
        auxKind: 'parallel'
      },
      {
        tag: 'PHE-402',
        name: 'Sanitary Titanium Heat Exchanger',
        type: 'Ultra-Precision Temperature Control',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        tempC: 23.02,
        interlocksHealthy: true,
        permissives: ['Process Chilled Water Valve Modulating', 'Temp Delta < 0.2°C'],
        specs: 'Double-tube sheet titanium plate exchanger fed by process chilled water (PCW).',
        details: 'Holds UPW delivery temperature rock-solid at 23.0°C ± 0.1°C across all wafer production bays.',
        hasPid: true,
        pidSetpoint: 23.0,
        valvePositionPct: 42.5
      },
      {
        tag: 'TCV-402',
        name: 'PCW Temperature Control Valve',
        type: 'Modulating Globe Control Valve',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 42.5,
        interlocksHealthy: true,
        permissives: ['TIC-402 In AUTO', 'PCW Supply Available'],
        specs: '3-inch globe valve, linear trim, pneumatic fail-closed positioner.',
        details: 'Final element of TIC-402: throttles process chilled water through PHE-402. Closed, the loop warms above 23.2°C (TT-402).',
        auxOf: 'PHE-402',
        auxKind: 'service'
      },
      {
        tag: 'XV-401',
        name: 'Cleanroom Supply Isolation Valve',
        type: 'Safety Interlock Isolation Valve',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 100,
        interlocksHealthy: true,
        permissives: ['Delivery Resistivity > 17.50 MΩ·cm (I-402)', 'Actuator Air > 6 bar'],
        specs: '8-inch PFA-lined ball valve, pneumatic fail-closed actuator.',
        details: 'Closes automatically under I-402 (resistivity slip interlock) to protect wafer tools from off-spec UPW. Cannot be manually reopened while I-402 is tripped.'
      },
      {
        tag: 'TOOL-BAY',
        name: 'Main UPW Distribution Header (Tool Bays)',
        type: 'Point-of-Use Delivery Header',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        flowM3h: 215,
        interlocksHealthy: true,
        permissives: ['Supply Pressure > 4.5 bar', 'Resistivity Normal (> 18.0 MΩ·cm)'],
        specs: 'Immersion Litho Scanners, Wet Etch & Clean Benches, CMP, Wafer Scrubbers [LPG: UPW-HDR-01].',
        details: 'Zero-dead-leg PFA take-off valves deliver ultra-pure water directly to wafer processing chambers.'
      },
      {
        tag: 'RCL-404',
        name: 'Online Reclaim & Segregation Divert Valve',
        type: 'Conductivity-Switched Pneumatic Divert Valve',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 100,
        flowM3h: 172,
        interlocksHealthy: true,
        permissives: ['Effluent Resistivity > 14.0 MΩ·cm', 'Pneumatic Actuator Air > 6 bar'],
        specs: 'Thornton inline conductivity sensors & high-speed pneumatic divert valves.',
        details: 'Rinses with resistivity > 14 MΩ·cm are diverted back to Stage 1/2, recovering > 78% of total water.'
      },
      {
        tag: 'T-405',
        name: 'Rinse Reclaim Recovery Tank',
        type: 'Reclaim Storage Tank',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        interlocksHealthy: true,
        permissives: ['LT-405 Level < 90%', 'Reclaim Transfer Pump Available'],
        specs: '80 m³ PVDF-lined tank with UV-254 sterilizer on outlet.',
        details: 'Receives rinse water diverted by RCL-404 and returns it to the head of Stage 1 for re-treatment.',
        auxOf: 'RCL-404',
        auxKind: 'reject'
      },
      {
        tag: 'PCV-403',
        name: 'Loop Return Back-Pressure Control Valve',
        type: 'Sanitary Diaphragm Back-Pressure Control Valve',
        stageId: 4,
        status: 'Running',
        controlMode: 'AUTO',
        valvePositionPct: 55,
        interlocksHealthy: true,
        permissives: ['PIC-403 In AUTO', 'Actuator Air > 6 bar'],
        specs: '6-inch PFA-lined sanitary diaphragm valve, pneumatic fail-closed positioner.',
        details: 'Final element of PIC-403: throttles unused water returning to T-205 to hold loop return pressure. Closed, the ring main dead-heads — velocity collapses and pressure climbs.'
      }
    ],
    scientificSummary:
      'Ultra-pure water is an aggressive solvent that will leach ions from standard piping. The Distribution system utilizes high-purity PVDF-HP and PFA piping with zero dead-legs, sanitary diaphragm valves, and continuous turbulent velocity (> 1.8 m/s). Unused water recirculates back to the polishing stage, while high-resistivity tool rinses are reclaimed and recycled.',
    keyMissions: [
      'Maintain loop circulation velocity above 1.8 m/s (zero stagnation)',
      'Regulate temperature within ± 0.1°C tolerance (23.0°C setpoint)',
      'Deliver uninterrupted 18.20 MΩ·cm UPW to cleanroom tools',
      'Recover and recycle 75%–85% of clean rinse water to conserve PUB water'
    ]
  }
];

// Plant utilities every pneumatic valve and the N₂-blanketed tanks depend on.
// Not a process stage, so they're drawn in their own strip under the mimic.
export const UPW_UTILITIES: ScadaEquipment[] = [
  {
    tag: 'IAC-501A',
    name: 'Instrument Air Compressor A',
    type: 'Oil-Free Rotary Screw Compressor',
    stageId: 5,
    status: 'Running',
    controlMode: 'AUTO',
    pressureBar: 7.2,
    powerKw: 55,
    runHours: 9120,
    interlocksHealthy: true,
    permissives: ['Discharge Temp < 95°C', 'Dryer Dewpoint < -40°C'],
    specs: 'Class 0 oil-free, 9 Nm³/min @ 7.5 bar, with desiccant dryer.',
    details: 'Supplies clean dry instrument air to every pneumatic valve actuator. Total loss of instrument air fails all XV valves closed.'
  },
  {
    tag: 'IAC-501B',
    name: 'Instrument Air Compressor B (N+1)',
    type: 'Oil-Free Rotary Screw Standby Compressor',
    stageId: 5,
    status: 'Standby',
    controlMode: 'AUTO',
    pressureBar: 0,
    powerKw: 0,
    runHours: 8640,
    interlocksHealthy: true,
    permissives: ['Auto-Start On Header < 6.5 bar', 'E-Stop OK'],
    specs: 'Class 0 oil-free, 9 Nm³/min @ 7.5 bar, with desiccant dryer.',
    details: 'Auto-starts within 1.2s of IAC-501A stopping to hold the instrument air header.'
  },
  {
    tag: 'N2-502',
    name: 'Nitrogen PSA Generator',
    type: 'Pressure Swing Adsorption Nitrogen Generator',
    stageId: 5,
    status: 'Running',
    controlMode: 'AUTO',
    pressureBar: 5.2,
    powerKw: 22,
    runHours: 7730,
    interlocksHealthy: true,
    permissives: ['Feed Air Available', 'O₂ Purity < 10 ppm'],
    specs: '99.999% N₂, 60 Nm³/h, carbon molecular sieve beds.',
    details: 'Blankets T-205 and sweeps CAT-MDG-303. Loss of N₂ lets oxygen back into the polishing loop and dissolved O₂ climbs.'
  },
  {
    tag: 'CIP-503',
    name: 'RO/UF Clean-In-Place Skid',
    type: 'Clean-In-Place Chemical Skid',
    stageId: 5,
    status: 'Standby',
    controlMode: 'MANUAL',
    flowM3h: 0,
    powerKw: 0,
    runHours: 410,
    interlocksHealthy: true,
    permissives: ['Target Train Isolated', 'CIP Tank Temperature 30–35°C'],
    specs: '6 m³ heated CIP tank, 60 m³/h recirculation pump, 5 µm cartridge.',
    details: 'Circulates caustic/acid cleaning solutions through an isolated RO or UF train to restore membrane flux.'
  },
  {
    tag: 'P-206',
    name: 'Neutralization Sump Discharge Pump',
    type: 'Submersible Effluent Pump',
    stageId: 5,
    status: 'Running',
    controlMode: 'AUTO',
    flowM3h: 45,
    powerKw: 7.5,
    runHours: 5280,
    interlocksHealthy: true,
    permissives: ['Effluent pH 6.0–9.0', 'Trade Effluent Consent Active'],
    specs: 'Duplex submersible pump, 50 m³/h, pH-permissive discharge.',
    details: 'Empties SMP-206 to trade effluent. Stopped, the sump fills from RO reject and backwash waste until LT-206 alarms high.'
  },
  {
    tag: 'P-405',
    name: 'Reclaim Transfer Pump',
    type: 'Sanitary Centrifugal Transfer Pump',
    stageId: 5,
    status: 'Running',
    controlMode: 'AUTO',
    flowM3h: 170,
    powerKw: 22,
    runHours: 6110,
    interlocksHealthy: true,
    permissives: ['T-405 Level > 15%', 'Reclaim Conductivity OK'],
    specs: '316L sanitary pump, 180 m³/h, returns reclaim to T-100.',
    details: 'Returns reclaimed rinse water from T-405 to the head of Stage 1. Stopped, T-405 fills until LT-405 alarms high.'
  }
];

// Every equipment item on the page, for tag lookups outside the stage lists.
const ALL_EQUIPMENT: ScadaEquipment[] = [...UPW_STAGES.flatMap(s => s.equipmentList), ...UPW_UTILITIES];
const EQUIPMENT_BY_TAG: Record<string, ScadaEquipment> = Object.fromEntries(ALL_EQUIPMENT.map(e => [e.tag, e]));

// MMF-101 backwash PLC sequence steps, each held for a number of 1.5s scans.
const MMF_PARTNER: Record<string, string> = { 'MMF-101': 'MMF-101B', 'MMF-101B': 'MMF-101' };
const MMF_PDT: Record<string, string> = { 'MMF-101': 'PDT-101A', 'MMF-101B': 'PDT-101B' };
const SOFTENER_PARTNER: Record<string, string> = { 'SFT-103': 'SFT-103B', 'SFT-103B': 'SFT-103' };
const SOFTENER_REGEN_SCANS = 10;
const RO_CIP_SCANS = 16;

const BACKWASH_STEPS = [
  { name: 'ISOLATE VESSEL FROM SERVICE', scans: 1 },
  { name: 'BACKWASH — BWP-105 REVERSE FLOW TO SMP-206', scans: 8 },
  { name: 'MEDIA SETTLE', scans: 2 },
  { name: 'FORWARD RINSE TO DRAIN', scans: 3 },
];

// Duty → standby pairs that get automatic bumpless transfer on duty stop.
const N1_STANDBY: Record<string, string> = {
  'P-101A': 'P-101B',
  'CF-104': 'CF-104B',
  'CF-104B': 'CF-104',
  'RO-P-202A': 'RO-P-202B',
  'P-301A': 'P-301B',
  'IAC-501A': 'IAC-501B',
};

// The two parallel 60% first-pass RO trains: each has its own HP pump,
// membrane array and concentrate valve.
const RO_TRAINS = [
  { id: 'A', pump: 'RO-P-201A', membrane: 'RO1-201' },
  { id: 'B', pump: 'RO-P-201B', membrane: 'RO1-211' },
];

// ISA-101 display hierarchy: Level 2 is one process area (a stage), Level 3
// is one unit inside it. Each unit lists the equipment it contains; its
// instruments are every transmitter mounted on that equipment.
const UPW_UNITS: { id: string; flowIn: string; flowOut: string; stageId: number; title: string; tags: string[]; loops: string[]; interlocks: string[] }[] = [
  { id: 'FEED', flowIn: 'FROM PUB / NEWATER', flowOut: 'TO MMF-101/101B', stageId: 1, title: 'Raw Water Feed & Storage Tank [UPW-TK-01]', tags: ['XV-101', 'LCV-100', 'T-100', 'P-101A', 'P-101B'], loops: ['LIC-100'], interlocks: ['I101'] },
  { id: 'MMF', flowIn: 'FROM P-101A/B', flowOut: 'TO ACF-102', stageId: 1, title: 'Multi-Media Filter Bank A/B [MMF]', tags: ['MMF-101', 'MMF-101B', 'BWP-105'], loops: [], interlocks: [] },
  { id: 'SOFT', flowIn: 'FROM MMF-101/101B', flowOut: 'TO HX-106', stageId: 1, title: 'Dechlorination & Cation Exchanger Bank [SAC]', tags: ['ACF-102', 'CDS-102', 'SFT-103', 'SFT-103B', 'BRN-103'], loops: ['AIC-102'], interlocks: [] },
  { id: 'CART', flowIn: 'FROM SFT-103/103B', flowOut: 'TO RO TRAINS A/B', stageId: 1, title: 'Feed Heater & Pretreatment Filters [UPW-F-01/02]', tags: ['HX-106', 'CF-104', 'CF-104B'], loops: [], interlocks: [] },
  { id: 'ROA', flowIn: 'FROM CF-104/104B', flowOut: 'TO 2ND PASS (RO-P-202)', stageId: 2, title: 'Reverse Osmosis Train 01 [UPW-RO-01]', tags: ['ADS-200', 'RO-P-201A', 'RO1-201', 'FCV-201A', 'XV-201'], loops: ['FIC-201'], interlocks: [] },
  { id: 'ROB', flowIn: 'FROM CF-104/104B', flowOut: 'TO 2ND PASS (RO-P-202)', stageId: 2, title: 'Reverse Osmosis Train 02 [UPW-RO-02]', tags: ['RO-P-201B', 'RO1-211', 'FCV-201B'], loops: ['FIC-201'], interlocks: [] },
  { id: 'RO2', flowIn: 'FROM RO TRAINS A/B', flowOut: 'TO T-205', stageId: 2, title: '2nd-Pass RO, Degasifier & EDI Train [UPW-EDI-01]', tags: ['RO-P-202A', 'RO-P-202B', 'CDS-202', 'RO2-202', 'MDG-203', 'VP-203', 'CEDI-204'], loops: ['AIC-203'], interlocks: [] },
  { id: 'MKUP', flowIn: 'FROM CEDI-204', flowOut: 'TO P-301A/B', stageId: 2, title: 'RO Product Storage & Reject Sump [T-2511/T-200]', tags: ['T-205', 'SMP-206'], loops: ['LIC-205'], interlocks: ['I301'] },
  { id: 'POL', flowIn: 'FROM T-205', flowOut: 'TO CAT-MDG-303', stageId: 3, title: 'UV Oxidation & Mixed Bed Polishers [MB-3411]', tags: ['P-301A', 'P-301B', 'TOC-UV-301', 'UPW-MB-302', 'UPW-MB-312', 'XV-301'], loops: [], interlocks: ['I301', 'I403'] },
  { id: 'DEG', flowIn: 'FROM MIXED BEDS', flowOut: 'TO DST-P-401A/B', stageId: 3, title: 'Catalytic Degasifier & Ultrafiltration', tags: ['CAT-MDG-303', 'VP-303', 'UF-304'], loops: [], interlocks: [] },
  { id: 'DST', flowIn: 'FROM UF-304', flowOut: 'TO RING MAIN (XV-401)', stageId: 4, title: 'UPW Circulation Pumps & Loop Cooling [UPW-P-03/04]', tags: ['DST-P-401A', 'DST-P-401B', 'PHE-402', 'TCV-402'], loops: ['TIC-402', 'PIC-402'], interlocks: ['I401'] },
  { id: 'RING', flowIn: 'FROM PHE-402', flowOut: 'LOOP RETURN → T-205', stageId: 4, title: 'Main UPW Distribution Header & Reclaim [UPW-HDR-01]', tags: ['XV-401', 'TOOL-BAY', 'RCL-404', 'T-405', 'PCV-403'], loops: ['PIC-403'], interlocks: ['I402', 'I403'] },
  { id: 'AIR', flowIn: '', flowOut: '', stageId: 5, title: 'Instrument Air & Nitrogen', tags: ['IAC-501A', 'IAC-501B', 'N2-502'], loops: [], interlocks: [] },
  { id: 'SVC', flowIn: '', flowOut: '', stageId: 5, title: 'CIP, Effluent & Reclaim Transfer', tags: ['CIP-503', 'P-206', 'P-405'], loops: [], interlocks: [] },
];

export const WAFER_TOOL_BAYS: WaferToolBay[] = [
  {
    id: 'BAY-01-LITHO',
    bayName: 'Bay 01: ASML Twinscan Immersion Litho',
    toolType: 'Immersion 193nm Scanner [TOOL-LITHO-01 / UPW-POU-01]',
    subSystem: 'Lens Immersion Liquid & Wafer Edge Rinse',
    requiredResistivity: '18.20 MΩ·cm',
    flowRateLpm: 48.5,
    pressureBar: 4.85,
    tempTolerance: '± 0.05°C (23.00°C)',
    pouFilterDpBar: 0.18,
    valveStatus: 'OPEN',
    cleanroomClass: 'ISO Class 1 (Bay 01)'
  },
  {
    id: 'BAY-02-CLEAN',
    bayName: 'Bay 02: TEL & SCREEN Wet Clean Benches',
    toolType: 'Automated 300mm Wet Clean Bench [TOOL-WC-01 / UPW-POU-03]',
    subSystem: 'SC-1 / SC-2 Post-Clean Marangoni Quick-Dump Rinse',
    requiredResistivity: '18.18 MΩ·cm',
    flowRateLpm: 125.0,
    pressureBar: 4.60,
    tempTolerance: '± 0.20°C',
    pouFilterDpBar: 0.22,
    valveStatus: 'OPEN',
    cleanroomClass: 'ISO Class 3 (Bay 02)'
  },
  {
    id: 'BAY-03-CMP',
    bayName: 'Bay 03: AMAT Reflexion Wafer CMP Platen',
    toolType: 'Chemical Mechanical Planarization [TOOL-CMP-01 / UPW-POU-02]',
    subSystem: 'Slurry Post-Clean & High-Pressure Megasonic De-stick',
    requiredResistivity: '18.15 MΩ·cm',
    flowRateLpm: 88.0,
    pressureBar: 4.55,
    tempTolerance: '± 0.20°C',
    pouFilterDpBar: 0.28,
    valveStatus: 'OPEN',
    cleanroomClass: 'ISO Class 4 (Bay 03)'
  },
  {
    id: 'BAY-04-ECD',
    bayName: 'Bay 04: Copper Electro-Deposition & Scrubber',
    toolType: 'Single-Wafer Bevel Etch & Scrubber [TOOL-ETCH-01 / UPW-POU-04]',
    subSystem: 'Direct Wafer Bevel Clean & Post-Plating Rinse',
    requiredResistivity: '18.15 MΩ·cm',
    flowRateLpm: 65.0,
    pressureBar: 4.70,
    tempTolerance: '± 0.30°C',
    pouFilterDpBar: 0.19,
    valveStatus: 'OPEN',
    cleanroomClass: 'ISO Class 3 (Bay 04)'
  }
];

export const UpwProcessView: React.FC = () => {
  // SCADA Navigation Sub-View
  // ISA-101 display hierarchy: L1 plant overview → L2 process area → L3 unit
  // detail, plus the Level 4 support displays (trends, alarms, loops, ...).
  const [scadaTab, setScadaTab] = useState<'OVERVIEW' | 'AREA' | 'UNIT' | 'POU_TOOLS' | 'TRENDS' | 'TAGS' | 'ALARMS' | 'LOOPS' | 'INTERLOCKS' | 'SOE_LOGS' | 'STAGES'>('OVERVIEW');

  // Selected Level 2 area (stage id, 5 = utilities) and Level 3 unit.
  const [selectedStageId, setSelectedStageId] = useState<number>(2);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('ROA');
  const openArea = (id: number) => { setSelectedStageId(id); setScadaTab('AREA'); };
  const openUnit = (id: string) => {
    const u = UPW_UNITS.find(x => x.id === id);
    if (!u) return;
    setSelectedStageId(u.stageId);
    setSelectedUnitId(id);
    setScadaTab('UNIT');
  };

  // SCADA Equipment Faceplate Modal State
  const [faceplateEquipment, setFaceplateEquipment] = useState<ScadaEquipment | null>(null);

  // SCADA System States
  const [scadaControlMode, setScadaControlMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [hornSilenced, setHornSilenced] = useState<boolean>(false);
  const [scanCycleMs, setScanCycleMs] = useState<number>(250);
  const [plcStatus, setPlcStatus] = useState<Record<string, { status: 'ONLINE' | 'FAULT'; pingMs: number }>>({
    'PLC-01 (Pre-Treat)': { status: 'ONLINE', pingMs: 8 },
    'PLC-02 (Make-Up)': { status: 'ONLINE', pingMs: 11 },
    'PLC-03 (Polishing)': { status: 'ONLINE', pingMs: 6 },
    'PLC-04 (Distribution)': { status: 'ONLINE', pingMs: 7 },
    'PLC-05 (Utilities)': { status: 'ONLINE', pingMs: 9 }
  });

  // Live Process Variables — change only through real operator commands
  // (faceplate START/STOP/MANUAL, VFD/PID setpoint sliders) or the RESET action below.
  const [uvLampIntensity, setUvLampIntensity] = useState<number>(98);
  const [resinExhaustion, setResinExhaustion] = useState<number>(12);
  const [recircVelocity, setRecircVelocity] = useState<number>(1.95);
  const [tempSetpoint, setTempSetpoint] = useState<number>(23.0);
  const [leadPumpRunning, setLeadPumpRunning] = useState<boolean>(true);
  const [standbyPumpRunning, setStandbyPumpRunning] = useState<boolean>(false);

  // VFD Tuning for Faceplate
  const [vfdSpeedHz, setVfdSpeedHz] = useState<number>(49.8);

  // Operator-commanded equipment state overrides, keyed by tag (START/STOP/MANUAL
  // dispatched from the faceplate land here instead of the static UPW_STAGES data).
  const [equipmentOverrides, setEquipmentOverrides] = useState<Record<string, { status?: ScadaEquipment['status']; controlMode?: ScadaEquipment['controlMode'] }>>({});

  // Live tank levels (%), integrated every scan from the real in/out flows below.
  const [tankLevels, setTankLevels] = useState<Record<string, number>>({
    'T-100': 72, 'T-205': 68, 'T-405': 46, 'SMP-206': 31, 'BRN-103': 74,
    // Chemical day tanks feeding the dosing pumps.
    'DT-102': 64, 'DT-200': 41, 'DT-202': 77,
  });

  // Consumable wear, per vessel/housing. Filters load up while flow passes
  // through them; backwash and cartridge change are how operators recover them.
  const [mmfDp, setMmfDp] = useState<Record<string, number>>({ 'MMF-101': 0.36, 'MMF-101B': 0.55 });
  const [cartridgeDp, setCartridgeDp] = useState<Record<string, number>>({ 'CF-104': 0.15, 'CF-104B': 0.12 });
  // MMF backwash PLC sequence, one vessel at a time: null when both are in service.
  const [backwash, setBackwash] = useState<{ vessel: string; step: number; scansLeft: number } | null>(null);
  // Twin alternating softeners: remaining exchange capacity (%) of each unit,
  // and the brine regeneration sequence of whichever unit is offline.
  const [softCap, setSoftCap] = useState<Record<string, number>>({ 'SFT-103': 58, 'SFT-103B': 100 });
  const [softRegen, setSoftRegen] = useState<{ unit: string; scansLeft: number } | null>(null);
  // RO membrane fouling per train (% flux loss), and the CIP sequence of an isolated train.
  const [roFouling, setRoFouling] = useState<Record<string, number>>({ 'RO1-201': 5, 'RO1-211': 11 });
  const [roCip, setRoCip] = useState<{ train: string; scansLeft: number } | null>(null);
  // Lag mixed-bed exhaustion (the lead bed uses resinExhaustion).
  const [lagResinExhaustion, setLagResinExhaustion] = useState<number>(4);
  // I-402 2oo3 resistivity channels bypassed for calibration.
  const [sensorOos, setSensorOos] = useState<Record<string, boolean>>({});
  // The ESD pushbutton is two-step: ARM, then CONFIRM within 5 s.
  const [esdArmed, setEsdArmed] = useState<boolean>(false);

  // ISA-18.2 alarm records: each alarm tracks its own time-in, priority and
  // acknowledgement state instead of one global "acknowledged" flag.
  const [alarmLog, setAlarmLog] = useState<Record<string, {
    tag: string; description: string; priority: 'P1' | 'P2'; condition: ScadaInstrumentTag['status'];
    state: 'UNACK' | 'ACK' | 'RTN_UNACK'; timeIn: string; value: number; unit: string;
  }>>({});

  // Regulatory PID loop outputs (%), stepped toward their controller demand
  // each scan so final elements move like real positioners, not instantly.
  const [loopOutputs, setLoopOutputs] = useState<Record<string, number>>({
    'LIC-100': 48, 'LIC-205': 62, 'FIC-201': 84, 'AIC-102': 45, 'AIC-203': 52,
    'TIC-402': 42.5, 'PIC-402': 83, 'PIC-403': 55,
  });

  const statusOf = (tag: string): ScadaEquipment['status'] =>
    equipmentOverrides[tag]?.status ?? EQUIPMENT_BY_TAG[tag].status;
  const isRunning = (tag: string) => statusOf(tag) === 'Running';
  const isFailClosedValve = (eq: ScadaEquipment) =>
    eq.type.toLowerCase().includes('valve') && eq.specs.toLowerCase().includes('fail-closed');

  // Plant-wide conditions everything downstream depends on.
  const airHealthy = isRunning('IAC-501A') || isRunning('IAC-501B');
  const n2Healthy = isRunning('N2-502');
  // A valve passes flow if it's commanded open and, for fail-closed
  // actuators, still has instrument air to hold it there.
  const valveOpen = (tag: string) =>
    !(isFailClosedValve(EQUIPMENT_BY_TAG[tag]) && !airHealthy) && statusOf(tag) !== 'Isolated';

  // P-101 suction head comes from the break tank level (72% ≈ 2.1 bar).
  const suctionPressureBar = +(0.9 + tankLevels['T-100'] * 0.0167).toFixed(2);
  const lowSuction = suctionPressureBar < 1.2;
  const feedValveOpen = valveOpen('XV-101') && valveOpen('LCV-100');
  const feedPumpsRunning = !lowSuction && (isRunning('P-101A') || isRunning('P-101B'));
  const interstageRunning = isRunning('RO-P-202A') || isRunning('RO-P-202B');
  // Series equipment taken out of service (STOP → Standby) blocks the flow
  // path through it; parallel pairs pass flow while either unit is on line.
  const inService = (tag: string) => statusOf(tag) !== 'Standby';
  const mmfOnline = ['MMF-101', 'MMF-101B'].filter(isRunning);
  const softenerOnline = ['SFT-103', 'SFT-103B'].filter(isRunning);
  const cartridgeOnline = ['CF-104', 'CF-104B'].filter(isRunning);
  const pretreatPathOpen = mmfOnline.length > 0 && inService('ACF-102') && softenerOnline.length > 0 && cartridgeOnline.length > 0;
  // Hardness slips through once no on-line softener has capacity left.
  const hardnessBreakthrough = softenerOnline.every(u => softCap[u] <= 3);
  const roCommonPathOpen = ['RO2-202', 'MDG-203', 'CEDI-204'].every(inService);
  // Concentrate leaves through the train's FCV and the common divert valve
  // XV-201 (fail-closed): with either shut the train dead-heads and can't produce.
  const roFeedAvailable = feedPumpsRunning && pretreatPathOpen && interstageRunning && roCommonPathOpen && valveOpen('XV-201');
  const trainsProducing = RO_TRAINS.filter(t =>
    roFeedAvailable && isRunning(t.pump) && isRunning(t.membrane) && valveOpen(`FCV-201${t.id}`));
  const roProducing = trainsProducing.length > 0;
  // I-301: T-205 low-low protects the polishing pumps from running dry.
  const makeupLowLow = tankLevels['T-205'] < 10;
  // Lead/lag mixed beds: either bed on line keeps the loop polished; with
  // both out, only the N.C. bypass XV-301 keeps water moving.
  const leadBedOn = isRunning('UPW-MB-302');
  const lagBedOn = isRunning('UPW-MB-312');
  const mixedBedInService = leadBedOn || lagBedOn;
  const polishPathOpen = ['CAT-MDG-303', 'UF-304'].every(inService) && (mixedBedInService || valveOpen('XV-301'));
  const polishRunning = !makeupLowLow && polishPathOpen && (isRunning('P-301A') || isRunning('P-301B'));
  const uvLampsOn = isRunning('TOC-UV-301');
  // Dosing pumps lose prime when their day tank runs dry.
  const sbsDosing = isRunning('CDS-102') && tankLevels['DT-102'] > 2;
  const antiscalantDosing = isRunning('ADS-200') && tankLevels['DT-200'] > 2;
  const causticDosing = isRunning('CDS-202') && tankLevels['DT-202'] > 2;
  const degasVacuum = isRunning('VP-203');
  const catDegasVacuum = isRunning('VP-303');
  const feedHeaterOn = isRunning('HX-106');
  const coolingValveOpen = valveOpen('TCV-402');
  const returnValveOpen = valveOpen('PCV-403');
  const sumpPumpRunning = isRunning('P-206');
  const reclaimPumpRunning = isRunning('P-405');

  // Sequence of Events (SOE) Audit Log
  const [soeEvents, setSoeEvents] = useState<SoeEvent[]>([
    {
      id: 'SOE-001',
      timestamp: '10:00:00.124',
      type: 'SYSTEM',
      tag: 'SYS-BOOT',
      description: 'UPW Pure SCADA System Bootstrapped. OPC-UA driver initialized.',
      severity: 'INFO'
    },
    {
      id: 'SOE-002',
      timestamp: '10:00:01.450',
      type: 'SYSTEM',
      tag: 'PLC-ALL',
      description: 'All 5 field PLCs synchronized via EtherNet/IP CIP protocol (Scan: 250ms).',
      severity: 'INFO'
    },
    {
      id: 'SOE-003',
      timestamp: '10:01:14.280',
      type: 'INTERLOCK',
      tag: 'I-401',
      description: 'Loop minimum velocity verified healthy (> 1.8 m/s). N+1 standby armed.',
      severity: 'INFO'
    }
  ]);

  // Rolling Historian Buffer (Recharts) initialized with 30 rolling telemetry points
  const [historianPenGroup, setHistorianPenGroup] = useState<'PURITY' | 'HYDRAULICS' | 'THERMAL'>('PURITY');
  const [fabTransientCountdown, setFabTransientCountdown] = useState<number>(0);

  const [historianData, setHistorianData] = useState<HistorianPoint[]>(() => {
    const now = Date.now();
    const pts: HistorianPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const t = new Date(now - i * 2000);
      const timeStr = t.toTimeString().split(' ')[0];
      const wave = Math.sin((30 - i) * 0.45);
      const wave2 = Math.cos((30 - i) * 0.3);
      pts.push({
        timeStr,
        resistivity: +(18.19 + wave * 0.02 + wave2 * 0.01).toFixed(2),
        toc: +(0.52 + Math.abs(wave) * 0.12 + Math.abs(wave2) * 0.05).toFixed(2),
        dissolvedOxygen: +(0.78 + wave2 * 0.08 + wave * 0.04).toFixed(2),
        silica: +(0.18 + wave * 0.03).toFixed(2),
        loopFlow: Math.round(342 + wave * 10 + wave2 * 6),
        supplyPressure: +(6.6 + wave * 0.12).toFixed(2),
        returnPressure: +(2.2 + wave2 * 0.07).toFixed(2),
        deliveryTemp: +(23.01 + wave * 0.07).toFixed(2),
        velocity: +(2.18 + wave * 0.05).toFixed(2),
      });
    }
    return pts;
  });

  // Live Jitter Timer for SCADA feel
  const [jitterTick, setJitterTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setJitterTick((prev) => prev + 1);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  // Integrate tank levels each scan from their real inflows and outflows.
  useEffect(() => {
    setTankLevels(prev => {
      const clamp = (v: number) => Math.min(100, Math.max(0, v));
      const settle = (v: number, target: number) => v + (target - v) * 0.15;
      const next = { ...prev };
      // T-100: filled through XV-101, drawn by the feed pumps; level-controlled when both flow.
      if (feedValveOpen && feedPumpsRunning) next['T-100'] = settle(prev['T-100'], 72);
      else if (feedValveOpen) next['T-100'] = clamp(prev['T-100'] + 1.5);
      else if (feedPumpsRunning) next['T-100'] = clamp(prev['T-100'] - 3);
      // T-205: filled by the two 60% RO trains, drawn by the polishing pumps.
      // One train alone can't keep up, so the tank slowly draws down.
      const trains = trainsProducing.length;
      if (trains === 2 && polishRunning) next['T-205'] = settle(prev['T-205'], 68);
      else if (trains === 2) next['T-205'] = clamp(prev['T-205'] + 1.0);
      else if (trains === 1 && polishRunning) next['T-205'] = clamp(prev['T-205'] - 0.35);
      else if (trains === 1) next['T-205'] = clamp(prev['T-205'] + 0.6);
      else if (polishRunning) next['T-205'] = clamp(prev['T-205'] - 1.2);
      // T-405: tool rinse reclaim flows in continuously; P-405 transfers it out.
      next['T-405'] = reclaimPumpRunning
        ? settle(prev['T-405'], 46 + Math.sin(jitterTick * 0.4) * 2)
        : clamp(prev['T-405'] + 1.0);
      // SMP-206: RO reject flows in while RO produces; P-206 discharges it.
      if (roProducing && sumpPumpRunning) next['SMP-206'] = settle(prev['SMP-206'], 31 + Math.cos(jitterTick * 0.3) * 2);
      else if (roProducing) next['SMP-206'] = clamp(prev['SMP-206'] + 1.2);
      else if (sumpPumpRunning) next['SMP-206'] = settle(prev['SMP-206'], 12);
      // Backwash waste lands in the sump too.
      if (backwash?.step === 1) next['SMP-206'] = clamp(next['SMP-206'] + 2);
      // The brine saturator refills slowly as salt dissolves after each regeneration.
      next['BRN-103'] = Math.min(74, prev['BRN-103'] + 0.3);
      // Chemical day tanks draw down while their metering pump doses.
      if (sbsDosing) next['DT-102'] = clamp(prev['DT-102'] - 0.012);
      if (antiscalantDosing) next['DT-200'] = clamp(prev['DT-200'] - 0.01);
      if (causticDosing) next['DT-202'] = clamp(prev['DT-202'] - 0.008);
      return next;
    });
  }, [jitterTick]);

  // Consumable wear and the automatic PLC sequences (MMF backwash, softener
  // alternation, RO CIP), advanced every scan. Plant time is accelerated so
  // wear shows up in minutes, not months.
  useEffect(() => {
    const setOverride = (tag: string, status: ScadaEquipment['status']) =>
      setEquipmentOverrides(prev => ({ ...prev, [tag]: { ...prev[tag], status } }));

    // MMF vessels share the feed, so a vessel carrying the flow alone loads twice as fast.
    if (feedPumpsRunning && mmfOnline.length > 0) {
      const rate = 0.003 / mmfOnline.length;
      setMmfDp(prev => ({ ...prev, ...Object.fromEntries(mmfOnline.map(v => [v, +(prev[v] + rate).toFixed(4)])) }));
      setSoftCap(prev => ({ ...prev, ...Object.fromEntries(softenerOnline.map(u => [u, Math.max(0, +(prev[u] - 0.03 / softenerOnline.length).toFixed(3))])) }));
    }
    if (roProducing) {
      setCartridgeDp(prev => ({ ...prev, ...Object.fromEntries(cartridgeOnline.map(c => [c, +(prev[c] + 0.00015 / cartridgeOnline.length).toFixed(4)])) }));
      // Scale builds fast without antiscalant, and faster still on hard feed water.
      const foulRate = (antiscalantDosing ? 0.004 : 0.05) * (hardnessBreakthrough ? 5 : 1);
      setRoFouling(prev => ({ ...prev, ...Object.fromEntries(trainsProducing.map(t => [t.membrane, Math.min(60, +(prev[t.membrane] + foulRate).toFixed(3))])) }));
    }
    if (polishRunning) {
      if (leadBedOn) setResinExhaustion(v => Math.min(100, +(v + 0.02).toFixed(2)));
      // The lag bed only sees the ions the lead bed lets through.
      if (lagBedOn) setLagResinExhaustion(v => Math.min(100, +(v + (!leadBedOn ? 0.02 : resinExhaustion > 60 ? 0.03 : 0.003)).toFixed(3)));
    }
    if (uvLampsOn) setUvLampIntensity(v => Math.max(0, +(v - 0.005).toFixed(3)));

    // MMF backwash sequence.
    if (backwash) {
      const v = backwash.vessel;
      if (backwash.scansLeft > 1) {
        setBackwash({ ...backwash, scansLeft: backwash.scansLeft - 1 });
      } else if (backwash.step < BACKWASH_STEPS.length - 1) {
        const step = backwash.step + 1;
        setBackwash({ vessel: v, step, scansLeft: BACKWASH_STEPS[step].scans });
        if (step === 1) setOverride('BWP-105', 'Running');
        if (step === 2) setOverride('BWP-105', 'Standby');
        logSoeEvent('SYSTEM', v, `Backwash step ${step + 1}/${BACKWASH_STEPS.length}: ${BACKWASH_STEPS[step].name}.`, 'INFO');
      } else {
        setBackwash(null);
        setMmfDp(prev => ({ ...prev, [v]: 0.34 }));
        setOverride(v, 'Running');
        setOverride('BWP-105', 'Standby');
        logSoeEvent('SYSTEM', v, `Backwash complete — ${v} returned to service, ΔP reset to 0.34 bar.`, 'INFO');
      }
    } else {
      // Auto-backwash only while the partner vessel can take the full flow.
      const due = ['MMF-101', 'MMF-101B'].find(v =>
        mmfDp[v] >= 0.7 && isRunning(v) && getLiveControlMode(EQUIPMENT_BY_TAG[v]) === 'AUTO' && isRunning(MMF_PARTNER[v]));
      if (due) startBackwash(due, `auto — ${MMF_PDT[due]} at ${mmfDp[due].toFixed(2)} bar`);
    }

    // Twin softener alternation: at 5% capacity — before hardness can slip — the PLC puts the regenerated
    // partner in service and brine-regenerates the exhausted unit.
    if (softRegen) {
      if (softRegen.scansLeft > 1) {
        setSoftRegen({ ...softRegen, scansLeft: softRegen.scansLeft - 1 });
      } else {
        setSoftRegen(null);
        setSoftCap(prev => ({ ...prev, [softRegen.unit]: 100 }));
        setOverride(softRegen.unit, 'Standby');
        logSoeEvent('SYSTEM', softRegen.unit, 'Regeneration complete (brine draw, slow rinse, fast rinse) — unit in regenerated standby.', 'INFO');
      }
    } else {
      const exhausted = softenerOnline.find(u => softCap[u] <= 5 && getLiveControlMode(EQUIPMENT_BY_TAG[u]) === 'AUTO');
      if (exhausted) {
        const partner = SOFTENER_PARTNER[exhausted];
        if (statusOf(partner) === 'Standby' && softCap[partner] > 50) {
          setOverride(partner, 'Running');
          logSoeEvent('SYSTEM', partner, `Softener alternation: ${partner} placed in service, ${exhausted} exhausted.`, 'INFO');
          startSoftenerRegen(exhausted, 'auto — capacity exhausted');
        }
      }
    }

    // RO clean-in-place of an isolated train.
    if (roCip) {
      if (roCip.scansLeft > 1) {
        setRoCip({ ...roCip, scansLeft: roCip.scansLeft - 1 });
      } else {
        setRoCip(null);
        setRoFouling(prev => ({ ...prev, [roCip.train]: 1.5 }));
        setOverride(roCip.train, 'Running');
        setOverride('CIP-503', 'Standby');
        logSoeEvent('SYSTEM', roCip.train, 'CIP complete (caustic, rinse, acid, rinse) — flux restored. Start the train HP pump to return it to production.', 'INFO');
      }
    }
  }, [jitterTick]);

  // I-301: T-205 low-low trips running polishing pumps; latches like I-101.
  useEffect(() => {
    if (!makeupLowLow) return;
    const tripped = ['P-301A', 'P-301B'].filter(isRunning);
    if (tripped.length === 0) return;
    setEquipmentOverrides(prev => {
      const next = { ...prev };
      tripped.forEach(t => { next[t] = { ...next[t], status: 'Tripped' }; });
      return next;
    });
    tripped.forEach(t => logSoeEvent('INTERLOCK', 'I-301', `${t} tripped on T-205 low-low level (${tankLevels['T-205'].toFixed(1)}% < 10%) — dry-run protection.`, 'CRIT'));
  }, [makeupLowLow, equipmentOverrides]);

  // I-101: low suction trips any running feed pump, and the trip latches until
  // an operator restarts it (and the restart is refused while suction is low).
  useEffect(() => {
    if (!lowSuction) return;
    const tripped = ['P-101A', 'P-101B'].filter(isRunning);
    if (tripped.length === 0) return;
    setEquipmentOverrides(prev => {
      const next = { ...prev };
      tripped.forEach(t => { next[t] = { ...next[t], status: 'Tripped' }; });
      return next;
    });
    tripped.forEach(t => logSoeEvent('INTERLOCK', 'I-101', `${t} tripped on low suction pressure (${suctionPressureBar} bar < 1.2 bar).`, 'CRIT'));
  }, [lowSuction, equipmentOverrides]);

  useEffect(() => {
    if (!airHealthy) logSoeEvent('ALARM', 'PT-501', 'Instrument air header lost — all fail-closed pneumatic valves driven CLOSED.', 'CRIT');
  }, [airHealthy]);

  useEffect(() => {
    if (!n2Healthy) logSoeEvent('ALARM', 'PT-502', 'N₂ supply lost — T-205 blanket and CAT-MDG-303 sweep unprotected.', 'CRIT');
  }, [n2Healthy]);

  // Compute Live Process Telemetry
  const liveMetrics = useMemo(() => {
    const jRes = (Math.sin(jitterTick * 0.7) * 0.015);
    const jToc = (Math.cos(jitterTick * 0.5) * 0.03);
    const jDo = (Math.sin(jitterTick * 0.3) * 0.04);
    const jTemp = (Math.cos(jitterTick * 0.8) * 0.02);

    let resistivity = 18.20;
    let toc = 0.55;
    let dissolvedOxygen = 0.8;
    let silica = 0.35;
    let loopFlow = (leadPumpRunning || standbyPumpRunning) ? Math.round((vfdSpeedHz / 50) * 342) : 45;
    let deliveryTemp = tempSetpoint;
    let currentVelocity = +(recircVelocity * (vfdSpeedHz / 50)).toFixed(2);

    // UV impact: aged lamps (< 80% output) or lamps switched off let TOC through.
    const effectiveUv = uvLampsOn ? uvLampIntensity : 0;
    if (effectiveUv < 80) {
      toc += (80 - effectiveUv) * 0.16;
    }

    // Without degasifier vacuum, CO₂ carries into CEDI and product resistivity sags.
    const cediResistivity = +((degasVacuum ? 16.5 : 9.6) + Math.sin(jitterTick * 0.5) * 0.1).toFixed(1);

    // Lead/lag mixed beds: an exhausted bed lets ions through past 50% use.
    // The inter-bed cell (AIT-312) sees lead breakthrough first; the lag bed
    // keeps the product at 18.2 until it too is loaded.
    const bedOutlet = (inlet: number, exhaustion: number) =>
      exhaustion > 50 ? Math.max(Math.min(inlet, 12.5), 18.20 - (exhaustion - 50) * 0.05) : 18.20;
    const interBedResistivity = leadBedOn ? bedOutlet(cediResistivity, resinExhaustion) : cediResistivity;
    const polishExhaustion = lagBedOn ? lagResinExhaustion : resinExhaustion;
    resistivity = lagBedOn ? bedOutlet(interBedResistivity, lagResinExhaustion) : interBedResistivity;
    if (polishExhaustion > 50) silica += (polishExhaustion - 50) * 0.05;

    // With both beds bypassed, polishing only delivers CEDI-grade water.
    if (!mixedBedInService) {
      resistivity = Math.min(resistivity, cediResistivity);
      silica += 1.2;
    }

    // Velocity & Stagnancy
    if (currentVelocity < 1.5) {
      toc += 0.45;
    }

    // Loss of loop recirculation when neither the lead nor standby pump is running
    if (!leadPumpRunning && !standbyPumpRunning) {
      loopFlow = 42;
      currentVelocity = 0.45;
    }

    // Without the N₂ sweep/blanket or the catalytic degasifier vacuum, oxygen
    // re-dissolves into the polishing loop.
    if (!n2Healthy) {
      dissolvedOxygen += 1.4;
    }
    if (!catDegasVacuum) {
      dissolvedOxygen += 2.0;
    }

    // Pump affinity law: head scales with the square of recirc pump speed.
    let supplyPressure = 4.85 * Math.pow(vfdSpeedHz / 49.8, 2) + Math.sin(jitterTick) * 0.05;
    let returnPressure = 2.15 * Math.pow(vfdSpeedHz / 49.8, 2) + Math.cos(jitterTick) * 0.04;
    if (!leadPumpRunning && !standbyPumpRunning) {
      supplyPressure = 1.4;
      returnPressure = 0.9;
    }

    // Polishing pumps feed the distribution pumps; without them the ring
    // main is starved of supply.
    if (!polishRunning) {
      loopFlow = 42;
      currentVelocity = 0.45;
      supplyPressure = 1.1;
      returnPressure = 0.6;
    }

    // PCV-403 closed dead-heads the ring main: return pressure climbs to
    // supply pressure and loop velocity collapses into stagnation.
    if (polishRunning && !returnValveOpen) {
      loopFlow = 60;
      currentVelocity = 0.3;
      returnPressure = supplyPressure - 0.2;
      toc += 0.45;
    }

    // Without chilled water through PHE-402 the loop warms from pump heat.
    if (!coolingValveOpen) {
      deliveryTemp += 1.6;
    }

    // Cold RO feed cuts membrane flux ~3% per °C.
    const roFeedTemp = feedHeaterOn ? 24.0 : 16.5;
    const coldFluxFactor = Math.max(0.6, 1 - (24 - roFeedTemp) * 0.03);
    // Each 60% train makes 131 m³/h first-pass permeate with both on line; a
    // train running alone is pushed to 158 m³/h (higher flux, higher pressure).
    // FIC-201 raises feed pressure to hold flux as the membranes foul, so
    // fouling shows up as pressure, ΔP, rejection and normalized flow.
    const soloTrain = trainsProducing.length === 1;
    const trains = Object.fromEntries(RO_TRAINS.map(t => {
      const producing = trainsProducing.includes(t);
      const f = roFouling[t.membrane];
      const j = Math.sin(jitterTick * 0.6 + (t.id === 'B' ? 1.7 : 0));
      const rejection = +(99.2 - f * 0.03 + j * 0.01).toFixed(2);
      return [t.id, {
        producing,
        feedPressure: producing ? +(15.2 * (1 + f * 0.006) * (soloTrain ? 1.12 : 1) + j * 0.1).toFixed(1) : 0.3,
        diffPressure: producing ? +((1.0 + f * 0.03) * (soloTrain ? 1.2 : 1) + j * 0.02).toFixed(2) : 0,
        permeateFlow: producing ? Math.round((soloTrain ? 158 : 131) * coldFluxFactor + j * 1.5) : 0,
        permeateCond: +(200 * (1 - rejection / 100)).toFixed(2),
        rejection,
        npf: +(100 - f * 0.9 + j * 0.2).toFixed(1),
        fouling: f,
      }];
    })) as Record<string, { producing: boolean; feedPressure: number; diffPressure: number; permeateFlow: number; permeateCond: number; rejection: number; npf: number; fouling: number }>;
    const firstPassPermeate = trains.A.permeateFlow + trains.B.permeateFlow;
    // 2nd-pass reject is recycled to the RO feed, so ~97% of first-pass permeate reaches T-205.
    const roPermeateFlow = Math.round(firstPassPermeate * 0.97);
    // Trains run at 75% recovery on their concentrate valves.
    const feedFlow = roProducing ? Math.round(firstPassPermeate / 0.75 + Math.sin(jitterTick * 0.4) * 2) : 0;
    const polishFlow = polishRunning ? Math.round(360 + Math.sin(jitterTick * 0.6) * 3) : 0;

    const finalResistivity = +(Math.min(18.20, Math.max(10.0, resistivity + jRes))).toFixed(2);
    const finalToc = +(Math.max(0.2, toc + jToc)).toFixed(2);
    const finalDo = +(Math.max(0.1, dissolvedOxygen + jDo)).toFixed(1);
    const finalTemp = +(deliveryTemp + jTemp).toFixed(2);
    const finalFlow = Math.round(loopFlow + Math.sin(jitterTick) * 2);

    return {
      resistivity: finalResistivity,
      toc: finalToc,
      dissolvedOxygen: finalDo,
      silica: +silica.toFixed(2),
      loopFlow: finalFlow,
      velocity: currentVelocity,
      temp: finalTemp,
      trains,
      feedFlow,
      roPermeateFlow,
      interBedResistivity: +interBedResistivity.toFixed(2),
      hardness: +((hardnessBreakthrough ? 2.4 : 0.05) + Math.sin(jitterTick * 0.3) * 0.01).toFixed(2),
      roFeedTemp: +(roFeedTemp + Math.sin(jitterTick * 0.3) * 0.1).toFixed(1),
      // Caustic holds the 2nd-pass feed at pH 9.5 so boric acid ionizes and is rejected.
      ro2FeedPh: +((causticDosing ? 9.5 : 6.4) + Math.cos(jitterTick * 0.4) * 0.04).toFixed(2),
      cediResistivity,
      polishFlow,
      // A filter out of service reads no differential pressure.
      mmfDp: Object.fromEntries(Object.entries(mmfDp).map(([k, v]) => [k, isRunning(k) && feedPumpsRunning ? +(v + Math.sin(jitterTick * 0.9) * 0.005).toFixed(3) : 0])) as Record<string, number>,
      cartridgeDp: Object.fromEntries(Object.entries(cartridgeDp).map(([k, v]) => [k, isRunning(k) && roProducing ? +(v + Math.cos(jitterTick * 0.7) * 0.004).toFixed(3) : 0])) as Record<string, number>,
      uvOutput: +effectiveUv.toFixed(1),
      resinRemaining: +(100 - resinExhaustion).toFixed(1),
      lagResinRemaining: +(100 - lagResinExhaustion).toFixed(1),
      // Water balance: RO recovery from real feed/permeate flows, reclaim from
      // what RCL-404 returns versus what the tools draw.
      roRecovery: roProducing ? +((firstPassPermeate / feedFlow) * 100).toFixed(1) : 0,
      reclaimRate: reclaimPumpRunning ? +((172 / 215) * 100).toFixed(1) : 0,
      // UF transmembrane pressure scales with the flow being pushed through it.
      filterDp: +(0.38 * (polishFlow / 360) + Math.sin(jitterTick * 0.4) * 0.005).toFixed(3),
      // SBS dosing holds ORP low; without it residual chlorine breaks through.
      orp: Math.round((sbsDosing ? 180 : 385) + Math.sin(jitterTick * 0.7) * 6),
      turbidity: +(0.08 + Math.cos(jitterTick * 0.4) * 0.01).toFixed(3),
      sdi: +(2.1 + Math.sin(jitterTick * 0.2) * 0.08).toFixed(2),
      ph: +(6.9 + Math.sin(jitterTick * 0.35) * 0.05).toFixed(2),
      boron: +((causticDosing ? 0.6 : 1.7) + Math.cos(jitterTick * 0.45) * 0.04).toFixed(2),
      particles: Math.round(12 + Math.sin(jitterTick * 0.8) * 3),
      suctionPressure: suctionPressureBar,
      instrumentAirBar: airHealthy ? +(7.2 + Math.sin(jitterTick) * 0.05).toFixed(2) : 2.8,
      n2PressureBar: n2Healthy ? +(5.2 + Math.cos(jitterTick) * 0.04).toFixed(2) : 0.9,
      supplyPressureBar: +supplyPressure.toFixed(2),
      returnPressureBar: +returnPressure.toFixed(2)
    };
  }, [jitterTick, uvLampIntensity, resinExhaustion, lagResinExhaustion, recircVelocity, tempSetpoint, leadPumpRunning, standbyPumpRunning, vfdSpeedHz, n2Healthy, roProducing, trainsProducing.map(t => t.id).join(), roFouling, hardnessBreakthrough, sbsDosing, suctionPressureBar, airHealthy, catDegasVacuum, polishRunning, returnValveOpen, coolingValveOpen, feedHeaterOn, causticDosing, degasVacuum, uvLampsOn, leadBedOn, lagBedOn, mmfDp, cartridgeDp, reclaimPumpRunning, equipmentOverrides, feedPumpsRunning]);

  // Update Historian Buffer periodically with dynamic process micro-variations & fab transients
  useEffect(() => {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const isTransient = fabTransientCountdown > 0;
    const wave = Math.sin(jitterTick * 0.7);
    const wave2 = Math.cos(jitterTick * 0.45);

    const resTransient = isTransient ? -0.10 * (fabTransientCountdown / 10) : 0;
    const tocTransient = isTransient ? 0.75 * (fabTransientCountdown / 10) : 0;
    const flowTransient = isTransient ? 42 * (fabTransientCountdown / 10) : 0;
    const pressTransient = isTransient ? -0.38 * (fabTransientCountdown / 10) : 0;

    const newPoint: HistorianPoint = {
      timeStr,
      resistivity: +(Math.max(17.80, Math.min(18.25, liveMetrics.resistivity + wave * 0.02 + resTransient))).toFixed(2),
      toc: +(Math.max(0.1, liveMetrics.toc + Math.abs(wave) * 0.09 + tocTransient)).toFixed(2),
      dissolvedOxygen: +(Math.max(0.1, liveMetrics.dissolvedOxygen + wave2 * 0.07)).toFixed(2),
      silica: +(Math.max(0.05, liveMetrics.silica + wave * 0.03)).toFixed(2),
      loopFlow: Math.round(liveMetrics.loopFlow + wave * 9 + flowTransient),
      supplyPressure: +(liveMetrics.supplyPressureBar + wave * 0.12 + pressTransient).toFixed(2),
      returnPressure: +(liveMetrics.returnPressureBar + wave2 * 0.06).toFixed(2),
      deliveryTemp: +(liveMetrics.temp + wave * 0.07).toFixed(2),
      velocity: +(liveMetrics.velocity + wave * 0.05).toFixed(2)
    };

    setHistorianData((prev) => {
      const updated = [...prev.slice(-29), newPoint];
      return updated;
    });

    if (fabTransientCountdown > 0) {
      setFabTransientCountdown(prev => prev - 1);
    }
  }, [jitterTick, liveMetrics, fabTransientCountdown]);

  // Log SOE Event Helper
  const logSoeEvent = (type: 'ALARM' | 'COMMAND' | 'INTERLOCK' | 'SYSTEM', tag: string, description: string, severity: 'INFO' | 'WARN' | 'CRIT') => {
    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const timestamp = `${now.toTimeString().split(' ')[0]}.${ms}`;
    const newEvent: SoeEvent = {
      id: `SOE-${Date.now().toString().slice(-4)}`,
      timestamp,
      type,
      tag,
      description,
      severity
    };
    setSoeEvents(prev => [newEvent, ...prev.slice(0, 49)]);
  };

  // Real client-side CSV export of the SOE audit log — no backend needed, this page
  // is intentionally isolated from the rest of the app.
  const exportSoeLogCsv = () => {
    const header = 'ID,Timestamp,Type,Tag,Severity,Description';
    const rows = soeEvents.map(e =>
      [e.id, e.timestamp, e.type, e.tag, e.severity, `"${e.description.replace(/"/g, '""')}"`].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upw-soe-log-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logSoeEvent('COMMAND', 'SCADA-OP', 'SOE Audit log exported to CSV.', 'INFO');
  };

  // I-402 2oo3 voting on three independent supply-header resistivity cells.
  // A channel bypassed for calibration drops out of the vote: 2oo3 degrades
  // to 1oo2, then 1oo1, and with no healthy channel left the interlock trips
  // fail-safe.
  const i402Channels = ['AIT-401A', 'AIT-401C', 'AIT-401D'].map((tag, k) => ({
    tag,
    value: +Math.min(18.2, liveMetrics.resistivity + [0, -0.01, 0.01][k]).toFixed(2),
    oos: !!sensorOos[tag],
  }));
  const i402Healthy = i402Channels.filter(c => !c.oos);
  const i402Votes = i402Healthy.filter(c => c.value < 17.5).length;
  const i402Required = i402Healthy.length === 3 ? 2 : 1;
  const i402VoteMode = i402Healthy.length === 3 ? '2oo3' : i402Healthy.length === 2 ? '1oo2' : i402Healthy.length === 1 ? '1oo1' : 'FAIL-SAFE';
  const i402Trip = i402Healthy.length === 0 || i402Votes >= i402Required;

  // SCADA Analog Instrument Tags. Every tag's alarm state is evaluated against
  // its own configured limits — none are hardcoded NORM.
  const scadaTags: ScadaInstrumentTag[] = useMemo(() => {
    const S1 = 'Stage 1: Pre-Treatment', S2 = 'Stage 2: Primary RO', S3 = 'Stage 3: Polishing', S4 = 'Stage 4: Distribution', S5 = 'Utilities';
    const lm = liveMetrics;
    // Per-train RO instruments, alarm-suppressed by design while the train is off line.
    const trainTags = RO_TRAINS.flatMap((t, k): Omit<ScadaInstrumentTag, 'status'>[] => {
      const m = lm.trains[t.id];
      const slot = (n: number) => `PLC-02.RACK${4 + k}.SLOT${n}`;
      const off = !m.producing;
      return [
        { tag: `PT-201${t.id}`, description: `RO Train ${t.id} HP Feed Pressure`, unit: 'bar', stage: S2, value: m.feedPressure, nominal: 15.3, lowLowAlarm: 8.0, lowAlarm: 12.0, highAlarm: 19.0, highHighAlarm: 21.0, plcSource: slot(1), equip: t.pump, suppressed: off },
        { tag: `PDT-201${t.id}`, description: `RO Train ${t.id} Feed-Concentrate ΔP`, unit: 'bar', stage: S2, value: m.diffPressure, nominal: 1.1, highAlarm: 2.0, highHighAlarm: 3.0, plcSource: slot(2), equip: t.membrane, suppressed: off },
        { tag: `FT-201${t.id}`, description: `RO Train ${t.id} Permeate Flow`, unit: 'm³/h', stage: S2, value: m.permeateFlow, nominal: 131, lowLowAlarm: 60, lowAlarm: 110, plcSource: slot(3), equip: t.membrane, suppressed: off },
        { tag: `AIT-201${t.id}`, description: `RO Train ${t.id} Permeate Conductivity`, unit: 'µS/cm', stage: S2, value: m.permeateCond, nominal: 1.6, highAlarm: 3.0, highHighAlarm: 5.0, plcSource: slot(4), equip: t.membrane, suppressed: off },
        { tag: `XI-201${t.id}`, description: `RO Train ${t.id} Salt Rejection (calc)`, unit: '%', stage: S2, value: m.rejection, nominal: 99.2, lowLowAlarm: 97.5, lowAlarm: 98.5, plcSource: slot(5), equip: t.membrane, suppressed: off },
        { tag: `FY-201${t.id}`, description: `RO Train ${t.id} Normalized Permeate Flow (CIP at 85%)`, unit: '%', stage: S2, value: m.npf, nominal: 100, lowLowAlarm: 75, lowAlarm: 85, plcSource: slot(6), equip: t.membrane },
      ];
    });
    const tags: Omit<ScadaInstrumentTag, 'status'>[] = [
      // Stage 1: Pre-Treatment
      { tag: 'LT-100', description: 'Raw Water Break Tank Level', unit: '%', stage: S1, value: +tankLevels['T-100'].toFixed(1), nominal: 72, lowLowAlarm: 10, lowAlarm: 25, highAlarm: 90, highHighAlarm: 97, plcSource: 'PLC-01.RACK1.SLOT1', equip: 'T-100' },
      { tag: 'PT-101', description: 'Feed Pump Suction Pressure (I-101)', unit: 'bar', stage: S1, value: lm.suctionPressure, nominal: 2.1, lowLowAlarm: 1.2, lowAlarm: 1.5, plcSource: 'PLC-01.RACK1.SLOT2', equip: 'P-101A' },
      { tag: 'FT-101', description: 'RO Feed Flow (Pre-Treatment Outlet)', unit: 'm³/h', stage: S1, value: lm.feedFlow, nominal: 350, lowLowAlarm: 100, plcSource: 'PLC-01.RACK1.SLOT6', equip: 'P-101A' },
      { tag: 'AIT-102', description: 'Post-Carbon ORP (Chlorine Breakthrough)', unit: 'mV', stage: S1, value: lm.orp, nominal: 180, highAlarm: 250, highHighAlarm: 350, plcSource: 'PLC-01.RACK2.SLOT1', equip: 'ACF-102' },
      { tag: 'LT-102', description: 'SBS Day Tank Level', unit: '%', stage: S1, value: +tankLevels['DT-102'].toFixed(1), nominal: 60, lowLowAlarm: 5, lowAlarm: 20, plcSource: 'PLC-01.RACK3.SLOT1', equip: 'CDS-102' },
      { tag: 'PDT-101A', description: 'MMF Vessel A Differential Pressure', unit: 'bar', stage: S1, value: lm.mmfDp['MMF-101'], nominal: 0.4, highAlarm: 0.8, highHighAlarm: 1.0, plcSource: 'PLC-01.RACK1.SLOT4', equip: 'MMF-101' },
      { tag: 'PDT-101B', description: 'MMF Vessel B Differential Pressure', unit: 'bar', stage: S1, value: lm.mmfDp['MMF-101B'], nominal: 0.4, highAlarm: 0.8, highHighAlarm: 1.0, plcSource: 'PLC-01.RACK1.SLOT7', equip: 'MMF-101B' },
      { tag: 'AIT-103', description: 'Softened Water Hardness (as CaCO₃)', unit: 'ppm', stage: S1, value: lm.hardness, nominal: 0.05, highAlarm: 0.5, highHighAlarm: 2.0, plcSource: 'PLC-01.RACK2.SLOT5', equip: 'SFT-103' },
      { tag: 'XI-103A', description: 'Softener A Exchange Capacity Remaining', unit: '%', stage: S1, value: +softCap['SFT-103'].toFixed(1), nominal: 60, plcSource: 'PLC-01.RACK3.SLOT2', equip: 'SFT-103' },
      { tag: 'XI-103B', description: 'Softener B Exchange Capacity Remaining', unit: '%', stage: S1, value: +softCap['SFT-103B'].toFixed(1), nominal: 60, plcSource: 'PLC-01.RACK3.SLOT3', equip: 'SFT-103B' },
      { tag: 'LT-103', description: 'Brine Saturator Level', unit: '%', stage: S1, value: +tankLevels['BRN-103'].toFixed(1), nominal: 74, lowLowAlarm: 10, lowAlarm: 20, plcSource: 'PLC-01.RACK3.SLOT4', equip: 'BRN-103' },
      { tag: 'PDT-104A', description: 'Cartridge Housing A Differential Pressure', unit: 'bar', stage: S1, value: lm.cartridgeDp['CF-104'], nominal: 0.15, highAlarm: 0.4, highHighAlarm: 0.6, plcSource: 'PLC-01.RACK1.SLOT5', equip: 'CF-104' },
      { tag: 'PDT-104B', description: 'Cartridge Housing B Differential Pressure', unit: 'bar', stage: S1, value: lm.cartridgeDp['CF-104B'], nominal: 0.15, highAlarm: 0.4, highHighAlarm: 0.6, plcSource: 'PLC-01.RACK1.SLOT8', equip: 'CF-104B' },
      { tag: 'AIT-104', description: 'RO Feed Turbidity', unit: 'NTU', stage: S1, value: lm.turbidity, nominal: 0.08, highAlarm: 0.5, highHighAlarm: 1.0, plcSource: 'PLC-01.RACK2.SLOT2', equip: 'CF-104' },
      { tag: 'AIT-105', description: 'RO Feed Silt Density Index (SDI₁₅)', unit: 'SDI', stage: S1, value: lm.sdi, nominal: 2.1, highAlarm: 3.0, highHighAlarm: 4.0, plcSource: 'PLC-01.RACK2.SLOT3', equip: 'CF-104' },
      { tag: 'AIT-106', description: 'RO Feed pH', unit: 'pH', stage: S1, value: lm.ph, nominal: 6.9, lowAlarm: 6.0, highAlarm: 8.5, plcSource: 'PLC-01.RACK2.SLOT4', equip: 'HX-106' },
      { tag: 'TT-106', description: 'RO Feed Temperature', unit: '°C', stage: S1, value: lm.roFeedTemp, nominal: 24.0, lowAlarm: 20.0, highAlarm: 28.0, plcSource: 'PLC-01.RACK1.SLOT3', equip: 'HX-106' },
      // Stage 2: Primary RO
      { tag: 'LT-200', description: 'Antiscalant Day Tank Level', unit: '%', stage: S2, value: +tankLevels['DT-200'].toFixed(1), nominal: 60, lowLowAlarm: 5, lowAlarm: 20, plcSource: 'PLC-02.RACK3.SLOT2', equip: 'ADS-200' },
      ...trainTags,
      { tag: 'FT-201', description: 'Total RO Permeate to T-205', unit: 'm³/h', stage: S2, value: lm.roPermeateFlow, nominal: 255, lowLowAlarm: 100, lowAlarm: 200, plcSource: 'PLC-02.RACK1.SLOT3', equip: 'CEDI-204' },
      { tag: 'LT-202', description: 'NaOH Day Tank Level', unit: '%', stage: S2, value: +tankLevels['DT-202'].toFixed(1), nominal: 60, lowLowAlarm: 5, lowAlarm: 20, plcSource: 'PLC-02.RACK3.SLOT3', equip: 'CDS-202' },
      { tag: 'AIT-203', description: '2nd-Pass RO Feed pH', unit: 'pH', stage: S2, value: lm.ro2FeedPh, nominal: 9.5, lowLowAlarm: 8.5, lowAlarm: 9.0, highAlarm: 10.5, plcSource: 'PLC-02.RACK2.SLOT3', equip: 'RO-P-202A', suppressed: !roProducing },
      { tag: 'AIT-202', description: '2nd-Pass RO Permeate Boron', unit: 'ppb', stage: S2, value: lm.boron, nominal: 0.6, highAlarm: 1.0, highHighAlarm: 2.0, plcSource: 'PLC-02.RACK2.SLOT1', equip: 'RO2-202', suppressed: !roProducing },
      { tag: 'AIT-204', description: 'CEDI Product Resistivity', unit: 'MΩ·cm', stage: S2, value: lm.cediResistivity, nominal: 16.5, lowLowAlarm: 10.0, lowAlarm: 12.0, plcSource: 'PLC-02.RACK2.SLOT4', equip: 'CEDI-204' },
      { tag: 'LT-205', description: 'RO Permeate / Make-Up Tank Level', unit: '%', stage: S2, value: +tankLevels['T-205'].toFixed(1), nominal: 68, lowLowAlarm: 10, lowAlarm: 25, highAlarm: 92, plcSource: 'PLC-02.RACK2.SLOT2', equip: 'T-205' },
      { tag: 'LT-206', description: 'Neutralization Sump Level', unit: '%', stage: S2, value: +tankLevels['SMP-206'].toFixed(1), nominal: 31, highAlarm: 80, highHighAlarm: 92, plcSource: 'PLC-02.RACK3.SLOT1', equip: 'SMP-206' },
      // Stage 3: Polishing
      { tag: 'FT-301', description: 'Polishing Loop Feed Flow', unit: 'm³/h', stage: S3, value: lm.polishFlow, nominal: 360, lowLowAlarm: 150, lowAlarm: 300, plcSource: 'PLC-03.RACK1.SLOT1', equip: 'P-301A' },
      { tag: 'AIT-301', description: '185nm UV Lamp Output', unit: '%', stage: S3, value: lm.uvOutput, nominal: 98, lowLowAlarm: 60, lowAlarm: 80, plcSource: 'PLC-03.RACK1.SLOT2', equip: 'TOC-UV-301' },
      { tag: 'AIT-302', description: 'Total Organic Carbon (Sievers Analyzer)', unit: 'ppb', stage: S3, value: lm.toc, nominal: 0.55, highAlarm: 1.00, highHighAlarm: 2.00, plcSource: 'PLC-03.RACK2.SLOT1', equip: 'TOC-UV-301' },
      { tag: 'XI-302', description: 'Lead Mixed Bed Resin Capacity Remaining', unit: '%', stage: S3, value: lm.resinRemaining, nominal: 88, lowLowAlarm: 10, lowAlarm: 25, plcSource: 'PLC-03.RACK1.SLOT3', equip: 'UPW-MB-302' },
      { tag: 'AIT-312', description: 'Inter-Bed Resistivity (Lead Outlet)', unit: 'MΩ·cm', stage: S3, value: lm.interBedResistivity, nominal: 18.2, lowAlarm: 17.8, plcSource: 'PLC-03.RACK1.SLOT6', equip: 'UPW-MB-302', suppressed: !leadBedOn },
      { tag: 'XI-312', description: 'Lag Mixed Bed Resin Capacity Remaining', unit: '%', stage: S3, value: lm.lagResinRemaining, nominal: 96, lowLowAlarm: 10, lowAlarm: 25, plcSource: 'PLC-03.RACK1.SLOT4', equip: 'UPW-MB-312' },
      { tag: 'AIT-303', description: 'Polished Water Silica', unit: 'ppb', stage: S3, value: lm.silica, nominal: 0.35, highAlarm: 1.0, highHighAlarm: 2.0, plcSource: 'PLC-03.RACK2.SLOT3', equip: 'UPW-MB-312' },
      { tag: 'AIT-304', description: 'Dissolved Oxygen (Orbisphere Optical Sensor)', unit: 'ppb', stage: S3, value: lm.dissolvedOxygen, nominal: 0.8, highAlarm: 1.0, highHighAlarm: 2.0, plcSource: 'PLC-03.RACK2.SLOT2', equip: 'CAT-MDG-303' },
      { tag: 'PDT-304', description: 'Terminal Ultrafiltration Transmembrane Drop', unit: 'bar', stage: S3, value: lm.filterDp, nominal: 0.35, highAlarm: 0.70, highHighAlarm: 1.00, plcSource: 'PLC-03.RACK1.SLOT5', equip: 'UF-304' },
      // Stage 4: Distribution. AIT-401A/C/D are the 2oo3 voting cells for I-402.
      ...i402Channels.map((c, k): Omit<ScadaInstrumentTag, 'status'> => ({
        tag: c.tag, description: `Supply Header Resistivity — I-402 Channel ${k + 1}${c.oos ? ' (OOS)' : ''}`, unit: 'MΩ·cm', stage: S4,
        value: c.value, nominal: 18.20, lowAlarm: 18.00, lowLowAlarm: 17.50, plcSource: `PLC-04.RACK1.SLOT${3 + k * 4}`, equip: 'XV-401', suppressed: c.oos,
      })),
      { tag: 'AIT-401B', description: 'UPW Return Loop Header Resistivity', unit: 'MΩ·cm', stage: S4, value: +(lm.resistivity - 0.04).toFixed(2), nominal: 18.16, lowAlarm: 17.90, lowLowAlarm: 17.40, plcSource: 'PLC-04.RACK1.SLOT9', equip: 'PCV-403' },
      { tag: 'PC-401', description: 'Online Particle Counter (> 0.05 µm)', unit: 'p/L', stage: S4, value: lm.particles, nominal: 12, highAlarm: 100, highHighAlarm: 200, plcSource: 'PLC-04.RACK3.SLOT1', equip: 'TOOL-BAY' },
      { tag: 'FT-401', description: 'Sub-Fab Recirculation Flow Rate', unit: 'm³/h', stage: S4, value: lm.loopFlow, nominal: 340, lowAlarm: 280, lowLowAlarm: 150, plcSource: 'PLC-04.RACK2.SLOT1', equip: 'DST-P-401A' },
      { tag: 'VT-401', description: 'PVDF Ring Main Recirculation Velocity', unit: 'm/s', stage: S4, value: lm.velocity, nominal: 1.95, lowAlarm: 1.80, lowLowAlarm: 1.50, plcSource: 'PLC-04.RACK2.SLOT2', equip: 'DST-P-401A' },
      { tag: 'PT-402', description: 'PVDF Loop Cleanroom Supply Pressure', unit: 'bar', stage: S4, value: lm.supplyPressureBar, nominal: 4.80, lowAlarm: 4.20, highAlarm: 5.50, plcSource: 'PLC-04.RACK1.SLOT1', equip: 'TOOL-BAY' },
      { tag: 'PT-403', description: 'PVDF Loop Cleanroom Return Pressure', unit: 'bar', stage: S4, value: lm.returnPressureBar, nominal: 2.20, lowAlarm: 1.80, highAlarm: 3.00, plcSource: 'PLC-04.RACK1.SLOT2', equip: 'PCV-403' },
      { tag: 'TT-402', description: 'Titanium Exchanger Supply Temperature', unit: '°C', stage: S4, value: lm.temp, nominal: 23.00, lowAlarm: 22.80, highAlarm: 23.20, plcSource: 'PLC-04.RACK1.SLOT4', equip: 'PHE-402' },
      { tag: 'LT-405', description: 'Rinse Reclaim Tank Level', unit: '%', stage: S4, value: +tankLevels['T-405'].toFixed(1), nominal: 46, highAlarm: 85, highHighAlarm: 95, plcSource: 'PLC-04.RACK3.SLOT2', equip: 'T-405' },
      // Utilities
      { tag: 'PT-501', description: 'Instrument Air Header Pressure', unit: 'bar', stage: S5, value: lm.instrumentAirBar, nominal: 7.2, lowLowAlarm: 5.0, lowAlarm: 6.0, plcSource: 'PLC-05.RACK1.SLOT1', equip: 'IAC-501A' },
      { tag: 'PT-502', description: 'N₂ Blanket / Sweep Header Pressure', unit: 'bar', stage: S5, value: lm.n2PressureBar, nominal: 5.2, lowLowAlarm: 3.0, lowAlarm: 4.5, plcSource: 'PLC-05.RACK1.SLOT2', equip: 'N2-502' },
    ];
    const evaluate = (t: Omit<ScadaInstrumentTag, 'status'>): ScadaInstrumentTag['status'] => {
      if (t.suppressed) return 'NORM';
      if (t.lowLowAlarm !== undefined && t.value < t.lowLowAlarm) return 'LOW_LOW';
      if (t.highHighAlarm !== undefined && t.value >= t.highHighAlarm) return 'HIGH_HIGH';
      if (t.lowAlarm !== undefined && t.value < t.lowAlarm) return 'LOW';
      if (t.highAlarm !== undefined && t.value >= t.highAlarm) return 'HIGH';
      return 'NORM';
    };
    return tags.map(t => ({ ...t, status: evaluate(t) }));
  }, [liveMetrics, tankLevels, softCap, sensorOos, equipmentOverrides]);

  const tagByName = useMemo(() => Object.fromEntries(scadaTags.map(t => [t.tag, t])), [scadaTags]);

  // Active Alarms Count
  const activeAlarms = useMemo(() => {
    return scadaTags.filter(t => t.status !== 'NORM');
  }, [scadaTags]);

  // ISA-18.2 alarm lifecycle, updated every scan from the tag states:
  // raise → UNACK; operator ACK → ACK; condition clears while ACK → removed;
  // condition clears while still UNACK → RTN_UNACK (needs ACK to clear).
  useEffect(() => {
    const now = new Date().toTimeString().split(' ')[0];
    const next = { ...alarmLog };
    const raised: string[] = [];
    scadaTags.forEach(t => {
      const rec = alarmLog[t.tag];
      if (t.status !== 'NORM') {
        const isNew = !rec || rec.state === 'RTN_UNACK' || rec.condition !== t.status;
        next[t.tag] = {
          tag: t.tag,
          description: t.description,
          priority: t.status === 'LOW_LOW' || t.status === 'HIGH_HIGH' ? 'P1' : 'P2',
          condition: t.status,
          state: isNew ? 'UNACK' : rec.state,
          timeIn: isNew ? now : rec.timeIn,
          value: t.value,
          unit: t.unit,
        };
        if (isNew) raised.push(`${t.tag} ${t.status.replace('_', '-')} (${t.value} ${t.unit})`);
      } else if (rec) {
        if (rec.state === 'ACK') delete next[t.tag];
        else if (rec.state === 'UNACK') next[t.tag] = { ...rec, state: 'RTN_UNACK', value: t.value };
      }
    });
    if (JSON.stringify(next) !== JSON.stringify(alarmLog)) setAlarmLog(next);
    if (raised.length > 0) {
      setHornSilenced(false);
      raised.forEach(r => logSoeEvent('ALARM', r.split(' ')[0], `Alarm raised: ${r}.`, r.includes('LOW-LOW') || r.includes('HIGH-HIGH') ? 'CRIT' : 'WARN'));
    }
  }, [scadaTags]);

  const alarmRecords = Object.values(alarmLog).sort((a, b) =>
    a.priority !== b.priority ? a.priority.localeCompare(b.priority) : b.timeIn.localeCompare(a.timeIn));
  const unackedAlarmCount = alarmRecords.filter(a => a.state !== 'ACK').length;

  const acknowledgeAlarm = (tag: string) => {
    setAlarmLog(prev => {
      const rec = prev[tag];
      if (!rec) return prev;
      const next = { ...prev };
      if (rec.state === 'RTN_UNACK') delete next[tag];
      else next[tag] = { ...rec, state: 'ACK' };
      return next;
    });
  };

  const acknowledgeAllAlarms = () => {
    setAlarmLog(prev => Object.fromEntries(
      Object.entries(prev).filter(([, r]) => r.state !== 'RTN_UNACK').map(([k, r]) => [k, { ...r, state: 'ACK' as const }])
    ));
    logSoeEvent('COMMAND', 'SCADA-OP', `Operator acknowledged ${unackedAlarmCount} alarm(s) (ACK ALL).`, 'INFO');
  };

  // Real trip state for each interlock, tied to live process values.
  const interlockTripped = {
    I101: lowSuction,
    I301: makeupLowLow,
    I401: !leadPumpRunning,
    I402: i402Trip,
    I403: liveMetrics.toc > 2.0,
  };
  const anyInterlockTripped = Object.values(interlockTripped).some(Boolean);

  // Restore all live process setpoints to their design nominal values. A real
  // operator action (equivalent to a "load nominal setpoint profile" command),
  // not a fault simulator — it only ever restores, never injects a fault.
  const resetToNominal = () => {
    // Any running PLC sequence is aborted, since its units return to their design state.
    setBackwash(null);
    setSoftRegen(null);
    setRoCip(null);
    setEsdArmed(false);
    setEquipmentOverrides({});
    setLeadPumpRunning(true);
    setStandbyPumpRunning(false);
    setRecircVelocity(1.95);
    setTempSetpoint(23.0);
    setVfdSpeedHz(49.8);
    setHornSilenced(false);
    logSoeEvent('COMMAND', 'SCADA-OP', 'Restored plant setpoints to nominal steady-state profile.', 'INFO');
  };

  // Live equipment status, merging operator overrides on top of each equipment's
  // static baseline. The recirc pumps read from real running-state, since that's
  // commanded directly (see dispatchCommand) rather than tracked as an override.
  const getLiveStatus = (eq: ScadaEquipment): ScadaEquipment['status'] => {
    if (eq.tag === 'DST-P-401A') return leadPumpRunning ? 'Running' : 'Tripped';
    if (eq.tag === 'DST-P-401B') return standbyPumpRunning ? 'Running' : 'Standby';
    // Fail-closed actuators need instrument air to stay open.
    if (isFailClosedValve(eq) && !airHealthy) return 'Isolated';
    // I-402 is a safety interlock: it forces the valve isolated regardless of any
    // operator override, and only releases control back once resistivity recovers.
    if (eq.tag === 'XV-401' && interlockTripped.I402) return 'Isolated';
    return statusOf(eq.tag);
  };

  const getLiveControlMode = (eq: ScadaEquipment): ScadaEquipment['controlMode'] =>
    equipmentOverrides[eq.tag]?.controlMode ?? eq.controlMode;

  // Real SCADA operator command dispatch: enforces interlocks on START (a real DCS
  // always allows STOP), and for the lead recirc pump genuinely engages the N+1
  // standby via bumpless auto-transfer — the same interlock behavior a real trip
  // would trigger, just reached through an operator STOP command instead of a
  // simulated fault.
  const startBackwash = (vessel: string, trigger: string) => {
    if (backwash) return;
    if (!isRunning(MMF_PARTNER[vessel])) {
      logSoeEvent('COMMAND', vessel, `Backwash INHIBITED — partner vessel ${MMF_PARTNER[vessel]} is out of service and cannot carry full flow.`, 'WARN');
      return;
    }
    setBackwash({ vessel, step: 0, scansLeft: BACKWASH_STEPS[0].scans });
    setEquipmentOverrides(prev => ({ ...prev, [vessel]: { ...prev[vessel], status: 'Maintenance' } }));
    logSoeEvent('SYSTEM', vessel, `Backwash sequence initiated (${trigger}). Step 1/${BACKWASH_STEPS.length}: ${BACKWASH_STEPS[0].name}.`, 'INFO');
  };

  const startSoftenerRegen = (unit: string, trigger: string) => {
    setSoftRegen({ unit, scansLeft: SOFTENER_REGEN_SCANS });
    setTankLevels(prev => ({ ...prev, 'BRN-103': Math.max(0, prev['BRN-103'] - 18) }));
    setEquipmentOverrides(prev => ({ ...prev, [unit]: { ...prev[unit], status: 'Maintenance' } }));
    logSoeEvent('SYSTEM', unit, `Brine regeneration started (${trigger}).`, 'INFO');
  };

  // A unit held in Maintenance by an automatic sequence can't be started until it finishes.
  const sequenceHolding = (tag: string): string | null => {
    if (backwash?.vessel === tag) return 'backwash';
    if (softRegen?.unit === tag) return 'brine regeneration';
    if (roCip && (roCip.train === tag || RO_TRAINS.some(t => t.pump === tag && t.membrane === roCip.train))) return 'CIP';
    return null;
  };

  const refillDayTank = (tank: string, chemical: string) => ({
    label: 'REFILL DAY TANK',
    wear: () => `${tank} ${chemical} ${tankLevels[tank].toFixed(0)}% (low alarm 20%)`,
    blockedReason: () => tankLevels[tank] > 90 ? `${tank} is already full.` : null,
    perform: () => setTankLevels(prev => ({ ...prev, [tank]: 95 })),
  });
  const cartridgeChange = (housing: string) => ({
    label: 'REPLACE CARTRIDGES',
    wear: () => `ΔP ${cartridgeDp[housing].toFixed(2)} bar (replace at 0.40)`,
    blockedReason: () => statusOf(housing) !== 'Standby' ? `Swing flow to the other housing (STOP ${housing}) before opening it.` : null,
    perform: () => setCartridgeDp(prev => ({ ...prev, [housing]: 0.12 })),
  });
  const mmfBackwash = (vessel: string) => ({
    label: 'START BACKWASH',
    wear: () => backwash?.vessel === vessel
      ? `Backwash step ${backwash.step + 1}/${BACKWASH_STEPS.length}: ${BACKWASH_STEPS[backwash.step].name}`
      : `ΔP ${mmfDp[vessel].toFixed(2)} bar (auto-backwash at 0.70 in AUTO)`,
    blockedReason: () => backwash ? `Backwash already running on ${backwash.vessel}.`
      : !isRunning(MMF_PARTNER[vessel]) ? `Partner vessel ${MMF_PARTNER[vessel]} must be in service.` : null,
    perform: () => startBackwash(vessel, 'manual — operator request'),
  });
  const softenerRegen = (unit: string) => ({
    label: 'REGENERATE',
    wear: () => softRegen?.unit === unit
      ? `Regenerating — ${softRegen.scansLeft} scans remaining`
      : `Capacity ${softCap[unit].toFixed(0)}% remaining`,
    blockedReason: () => isRunning(unit) ? 'Unit is in service — put the partner in service and STOP this unit first.'
      : softRegen ? `${softRegen.unit} is already regenerating.`
      : tankLevels['BRN-103'] < 20 ? 'Brine saturator below 20% — wait for it to refill.' : null,
    perform: () => startSoftenerRegen(unit, 'manual — operator request'),
  });
  const trainCip = (membrane: string, pump: string) => ({
    label: 'START CIP',
    wear: () => roCip?.train === membrane
      ? `CIP in progress — ${roCip.scansLeft} scans remaining`
      : `Fouling ${roFouling[membrane].toFixed(1)}% • NPF ${liveMetrics.trains[RO_TRAINS.find(t => t.membrane === membrane)!.id].npf}% (CIP at 85%)`,
    blockedReason: () => isRunning(pump) ? `Isolate the train first — STOP ${pump}.`
      : roCip ? `CIP skid busy on ${roCip.train}.`
      : statusOf('CIP-503') === 'Tripped' || statusOf('CIP-503') === 'Isolated' ? 'CIP-503 skid unavailable.' : null,
    perform: () => {
      setRoCip({ train: membrane, scansLeft: RO_CIP_SCANS });
      setEquipmentOverrides(prev => ({
        ...prev,
        [membrane]: { ...prev[membrane], status: 'Maintenance' },
        'CIP-503': { ...prev['CIP-503'], status: 'Running' },
      }));
      logSoeEvent('SYSTEM', membrane, 'CIP sequence started: CIP-503 circulating caustic then acid through the isolated train.', 'INFO');
    },
  });

  // Consumable maintenance procedures, each gated on the isolation a real
  // procedure requires before the work can be done.
  const MAINTENANCE: Record<string, { label: string; wear: () => string; blockedReason: () => string | null; perform: () => void }> = {
    'CF-104': cartridgeChange('CF-104'),
    'CF-104B': cartridgeChange('CF-104B'),
    'MMF-101': mmfBackwash('MMF-101'),
    'MMF-101B': mmfBackwash('MMF-101B'),
    'SFT-103': softenerRegen('SFT-103'),
    'SFT-103B': softenerRegen('SFT-103B'),
    'RO1-201': trainCip('RO1-201', 'RO-P-201A'),
    'RO1-211': trainCip('RO1-211', 'RO-P-201B'),
    'CDS-102': refillDayTank('DT-102', 'SBS'),
    'ADS-200': refillDayTank('DT-200', 'antiscalant'),
    'CDS-202': refillDayTank('DT-202', 'NaOH'),
    'UPW-MB-302': {
      label: 'REPLACE RESIN',
      wear: () => `Lead bed resin ${liveMetrics.resinRemaining}% remaining`,
      blockedReason: () => statusOf('UPW-MB-302') !== 'Standby' ? 'Take the lead bed out of service (STOP) — the lag bed carries the load.' : null,
      perform: () => setResinExhaustion(0),
    },
    'UPW-MB-312': {
      label: 'REPLACE RESIN',
      wear: () => `Lag bed resin ${liveMetrics.lagResinRemaining}% remaining`,
      blockedReason: () => statusOf('UPW-MB-312') !== 'Standby' ? 'Take the lag bed out of service (STOP) first.' : null,
      perform: () => setLagResinExhaustion(0),
    },
    'TOC-UV-301': {
      label: 'REPLACE UV LAMPS',
      wear: () => `Lamp output ${uvLampIntensity.toFixed(1)}% (replace below 80%)`,
      blockedReason: () => statusOf('TOC-UV-301') !== 'Standby' ? 'De-energize the reactor (STOP) before changing lamps.' : null,
      perform: () => setUvLampIntensity(100),
    },
  };

  const performMaintenance = (eq: ScadaEquipment) => {
    const m = MAINTENANCE[eq.tag];
    const blocked = m.blockedReason();
    if (blocked) {
      logSoeEvent('COMMAND', eq.tag, `${m.label} REFUSED — ${blocked}`, 'WARN');
      return;
    }
    m.perform();
    // Sequences log their own progress; one-shot tasks log completion here.
    if (m.label === 'REFILL DAY TANK') logSoeEvent('COMMAND', eq.tag, 'Chemical delivery transferred — day tank refilled to 95%.', 'INFO');
    else if (!['MMF-101', 'MMF-101B', 'SFT-103', 'SFT-103B', 'RO1-201', 'RO1-211'].includes(eq.tag)) logSoeEvent('COMMAND', eq.tag, `Maintenance complete: ${m.label.toLowerCase()}. Return unit to service with START.`, 'INFO');
  };

  const dispatchCommand = (eq: ScadaEquipment, command: 'START' | 'STOP' | 'MANUAL') => {
    // BWP-105 only runs as part of the backwash sequence.
    if (eq.tag === 'BWP-105' && command === 'START') {
      // Backwash whichever vessel is dirtier.
      startBackwash(mmfDp['MMF-101'] >= mmfDp['MMF-101B'] ? 'MMF-101' : 'MMF-101B', 'manual — BWP-105 start');
      return;
    }
    if (eq.tag === 'BWP-105' && command === 'STOP' && backwash) {
      const v = backwash.vessel;
      setBackwash(null);
      setEquipmentOverrides(prev => ({
        ...prev,
        [v]: { ...prev[v], status: 'Running' },
        'BWP-105': { ...prev['BWP-105'], status: 'Standby' },
      }));
      logSoeEvent('COMMAND', v, 'Backwash sequence ABORTED by operator — vessel returned to service without ΔP reset.', 'WARN');
      return;
    }
    const isValve = eq.type.toLowerCase().includes('valve');
    const setStatus = (tag: string, status: ScadaEquipment['status']) =>
      setEquipmentOverrides(prev => ({ ...prev, [tag]: { ...prev[tag], status } }));

    if (command === 'START') {
      if (!eq.interlocksHealthy) {
        logSoeEvent('COMMAND', eq.tag, 'START REJECTED by PLC — interlock chain unhealthy. Permissives not satisfied.', 'CRIT');
        return;
      }
      if (isFailClosedValve(eq) && !airHealthy) {
        logSoeEvent('COMMAND', eq.tag, 'OPEN REJECTED — no instrument air (PT-501). Fail-closed actuator cannot stroke open.', 'CRIT');
        return;
      }
      const holding = sequenceHolding(eq.tag);
      if (holding) {
        logSoeEvent('COMMAND', eq.tag, `START REJECTED — ${holding} sequence in progress. Wait for it to complete.`, 'WARN');
        return;
      }
      if (esdArmed) setEsdArmed(false);
      if (eq.tag === 'XV-401' && interlockTripped.I402) {
        logSoeEvent('COMMAND', eq.tag, 'OPEN REJECTED — I-402 safety interlock active. Cannot override while resistivity < 17.50 MΩ·cm.', 'CRIT');
        return;
      }
      if ((eq.tag === 'P-101A' || eq.tag === 'P-101B') && lowSuction) {
        logSoeEvent('COMMAND', eq.tag, `START REJECTED — I-101 low suction (${suctionPressureBar} bar < 1.2 bar). Restore break tank level first.`, 'CRIT');
        return;
      }
      if ((eq.tag === 'P-301A' || eq.tag === 'P-301B') && makeupLowLow) {
        logSoeEvent('COMMAND', eq.tag, `START REJECTED — I-301 T-205 low-low (${tankLevels['T-205'].toFixed(1)}% < 10%). Restore make-up production first.`, 'CRIT');
        return;
      }
      if (eq.tag === 'DST-P-401A') {
        setLeadPumpRunning(true);
      } else if (eq.tag === 'DST-P-401B') {
        setStandbyPumpRunning(true);
      } else {
        setStatus(eq.tag, 'Running');
      }
      logSoeEvent('COMMAND', eq.tag, isValve ? 'Operator OPEN command accepted. Valve stroked OPEN.' : 'Operator START command accepted by PLC. Equipment transitioning to RUN.', 'INFO');
    } else if (command === 'STOP' && isValve) {
      setStatus(eq.tag, 'Isolated');
      logSoeEvent('COMMAND', eq.tag, 'Operator CLOSE command accepted. Valve stroked CLOSED.', 'WARN');
    } else if (command === 'STOP' && N1_STANDBY[eq.tag]) {
      const standby = N1_STANDBY[eq.tag];
      setStatus(eq.tag, 'Standby');
      logSoeEvent('COMMAND', eq.tag, 'Operator STOP command accepted by PLC. Duty unit de-energized.', 'WARN');
      if (!isRunning(standby)) {
        setTimeout(() => {
          setStatus(standby, 'Running');
          logSoeEvent('INTERLOCK', standby, `Bumpless transfer: ${standby} auto-started in 1.2s on ${eq.tag} stop.`, 'INFO');
        }, 1200);
      }
    } else if (command === 'STOP') {
      if (eq.tag === 'DST-P-401A') {
        setLeadPumpRunning(false);
        logSoeEvent('COMMAND', eq.tag, 'Operator STOP command accepted by PLC. Lead Recirculation Pump de-energized.', 'WARN');
        if (!standbyPumpRunning) {
          setTimeout(() => {
            setStandbyPumpRunning(true);
            logSoeEvent('INTERLOCK', 'I-401', 'Bumpless transfer: Standby Pump DST-P-401B auto-started in 1.2s.', 'INFO');
          }, 1200);
        }
      } else if (eq.tag === 'DST-P-401B') {
        setStandbyPumpRunning(false);
        logSoeEvent('COMMAND', eq.tag, 'Operator STOP command accepted by PLC. Equipment de-energized to STANDBY.', 'WARN');
      } else {
        setEquipmentOverrides(prev => ({ ...prev, [eq.tag]: { ...prev[eq.tag], status: 'Standby' } }));
        logSoeEvent('COMMAND', eq.tag, 'Operator STOP command accepted by PLC. Equipment de-energized to STANDBY.', 'WARN');
      }
    } else if (command === 'MANUAL') {
      const currentMode = getLiveControlMode(eq);
      const nextMode = currentMode === 'MANUAL' ? 'AUTO' : 'MANUAL';
      setEquipmentOverrides(prev => ({ ...prev, [eq.tag]: { ...prev[eq.tag], controlMode: nextMode } }));
      logSoeEvent('COMMAND', eq.tag, `Operator toggled control mode to ${nextMode}.`, 'WARN');
    }
  };

  // Emergency shutdown: trips every running process pump and closes the
  // plant feed and cleanroom supply block valves. Two-step (ARM → CONFIRM
  // within 5 s) so a single stray click can't shut the plant down.
  useEffect(() => {
    if (!esdArmed) return;
    const t = setTimeout(() => setEsdArmed(false), 5000);
    return () => clearTimeout(t);
  }, [esdArmed]);

  const executeEsd = () => {
    // Process pumps only — utilities (air, N₂, effluent) stay up.
    const pumps = ALL_EQUIPMENT.filter(eq => eq.stageId < 5 && getEquipmentShape(eq) === 'pump' && isRunning(eq.tag) && !eq.tag.startsWith('DST-P'));
    setEquipmentOverrides(prev => {
      const next = { ...prev };
      pumps.forEach(eq => { next[eq.tag] = { ...next[eq.tag], status: 'Tripped' }; });
      ['XV-101', 'XV-401'].forEach(v => { next[v] = { ...next[v], status: 'Isolated' }; });
      return next;
    });
    setLeadPumpRunning(false);
    setStandbyPumpRunning(false);
    setBackwash(null);
    setSoftRegen(null);
    setRoCip(null);
    setEsdArmed(false);
    logSoeEvent('INTERLOCK', 'ESD', `EMERGENCY SHUTDOWN executed by operator — ${pumps.length + 2} pumps tripped, XV-101 and XV-401 closed.`, 'CRIT');
  };

  const toggleChannelBypass = (tag: string) => {
    const next = !sensorOos[tag];
    setSensorOos(prev => ({ ...prev, [tag]: next }));
    logSoeEvent('COMMAND', tag, next
      ? `Channel bypassed for calibration — I-402 vote degrades from ${i402VoteMode}.`
      : 'Channel returned to service — restored to the I-402 vote.', next ? 'WARN' : 'INFO');
  };

  // I-402 voting channel panel with the calibration bypass for each cell.
  const renderI402Channels = () => (
    <div className="pt-2 space-y-1">
      <div className="text-[10px] font-mono text-slate-400">VOTING: <span className="font-bold text-slate-200">{i402VoteMode}</span> • {i402Votes} of {i402Healthy.length} healthy channel(s) below 17.50 MΩ·cm</div>
      {i402Channels.map(c => (
        <div key={c.tag} className="flex items-center justify-between gap-2 text-[11px] font-mono">
          <span className="text-slate-300 font-bold w-20">{c.tag}</span>
          <span className={c.oos ? 'text-slate-500' : c.value < 17.5 ? 'text-red-400' : 'text-slate-300'}>{c.value} MΩ·cm</span>
          <span className={`w-10 text-right ${c.oos ? 'text-violet-300' : 'text-slate-500'}`}>{c.oos ? 'OOS' : 'GOOD'}</span>
          <button
            onClick={() => toggleChannelBypass(c.tag)}
            className="px-2 py-0.5 rounded border border-slate-600 text-[10px] font-bold text-slate-300 hover:bg-slate-800"
          >
            {c.oos ? 'RETURN' : 'BYPASS'}
          </button>
        </div>
      ))}
    </div>
  );

  // Regulatory PID control loops. Each has a live PV, a setpoint, a final
  // element it drives, and a controller demand; when the final element isn't
  // available the loop drops to IMAN and its output tracks to zero.
  const recircAvailable = leadPumpRunning || standbyPumpRunning;
  const recircMode = getLiveControlMode(EQUIPMENT_BY_TAG['DST-P-401A']);
  const controlLoops = [
    { tag: 'LIC-100', description: 'Break Tank Level → Make-Up Valve', pv: +tankLevels['T-100'].toFixed(1), sp: 72, unit: '%', finalElement: 'LCV-100', available: feedValveOpen, demand: 48 + 4 * (72 - tankLevels['T-100']) },
    { tag: 'LIC-205', description: 'Make-Up Tank Level → RO Production', pv: +tankLevels['T-205'].toFixed(1), sp: 68, unit: '%', finalElement: 'RO Trains A/B', available: roProducing, demand: 62 + 4 * (68 - tankLevels['T-205']) },
    { tag: 'FIC-201', description: 'RO Permeate Flow → HP Pump Speed', pv: liveMetrics.roPermeateFlow, sp: 255, unit: 'm³/h', finalElement: 'RO-P-201A/B VFDs', available: roProducing, demand: 84 + 0.4 * (255 - liveMetrics.roPermeateFlow) },
    { tag: 'AIC-102', description: 'Post-Carbon ORP → SBS Dosing Stroke', pv: liveMetrics.orp, sp: 180, unit: 'mV', finalElement: 'CDS-102', available: sbsDosing, demand: 45 + 0.3 * (liveMetrics.orp - 180) },
    { tag: 'AIC-203', description: '2nd-Pass Feed pH → Caustic Stroke', pv: liveMetrics.ro2FeedPh, sp: 9.5, unit: 'pH', finalElement: 'CDS-202', available: causticDosing, demand: 52 + 25 * (9.5 - liveMetrics.ro2FeedPh) },
    { tag: 'TIC-402', description: 'UPW Supply Temperature → PCW Valve', pv: liveMetrics.temp, sp: tempSetpoint, unit: '°C', finalElement: 'TCV-402', available: coolingValveOpen, demand: 42.5 + 40 * (liveMetrics.temp - tempSetpoint) },
    { tag: 'PIC-402', description: 'Loop Supply Pressure → Recirc VFD', pv: liveMetrics.supplyPressureBar, sp: 4.85, unit: 'bar', finalElement: 'DST-P-401A/B VFD', available: recircAvailable, demand: (vfdSpeedHz / 60) * 100 },
    { tag: 'PIC-403', description: 'Loop Return Pressure → Back-Pressure Valve', pv: liveMetrics.returnPressureBar, sp: 2.2, unit: 'bar', finalElement: 'PCV-403', available: returnValveOpen && polishRunning, demand: 55 + 30 * (liveMetrics.returnPressureBar - 2.2) },
  ].map(l => ({
    ...l,
    mode: !l.available ? 'IMAN' : l.tag === 'PIC-402' && recircMode === 'MANUAL' ? 'MAN' : 'AUTO',
    output: l.tag === 'PIC-402' ? (l.available ? (vfdSpeedHz / 60) * 100 : 0) : (loopOutputs[l.tag] ?? 0),
  }));

  // Each scan, step every loop output toward its controller demand. In AUTO,
  // PIC-402 also trims the recirc VFD to hold 4.85 bar supply pressure.
  useEffect(() => {
    setLoopOutputs(prev => {
      const next = { ...prev };
      controlLoops.forEach(l => {
        if (l.tag === 'PIC-402') return;
        const target = l.available ? Math.min(100, Math.max(0, l.demand)) : 0;
        next[l.tag] = (prev[l.tag] ?? 0) + (target - (prev[l.tag] ?? 0)) * 0.35;
      });
      return next;
    });
    if (recircAvailable && recircMode === 'AUTO') {
      const error = 4.85 - liveMetrics.supplyPressureBar;
      setVfdSpeedHz(v => Math.min(60, Math.max(30, +(v + Math.max(-1, Math.min(1, error * 3))).toFixed(2))));
    }
  }, [jitterTick]);

  type PidShape = 'pump' | 'tank' | 'membrane' | 'valve' | 'reactor' | 'exchanger' | 'header' | 'vessel';

  // Which real P&ID symbol category an equipment item draws as.
  const getEquipmentShape = (eq: ScadaEquipment): PidShape => {
    const t = eq.type.toLowerCase();
    if (t.includes('valve')) return 'valve';
    if (t.includes('tank') || t.includes('sump')) return 'tank';
    if (t.includes('pump') || t.includes('compressor') || t.includes('propulsion')) return 'pump';
    if (t.includes('osmosis') || t.includes('polyamide') || t.includes('polishing array')) return 'membrane';
    if (t.includes('photo') || t.includes('electro') || t.includes('degas') || t.includes('contactor')) return 'reactor';
    if (t.includes('temperature') || t.includes('heat')) return 'exchanger';
    if (t.includes('header') || t.includes('delivery')) return 'header';
    return 'vessel';
  };

  // A closed valve is only an alarm condition when something forced it shut
  // (lost instrument air or an interlock) — a normally-closed valve at rest isn't.
  const isAbnormallyClosed = (eq: ScadaEquipment) =>
    eq.status !== 'Isolated' &&
    ((isFailClosedValve(eq) && !airHealthy) || (eq.tag === 'XV-401' && interlockTripped.I402));

  // ISA-101 high-performance palette. Equipment state is shown by fill —
  // running is solid light grey, stopped is a hollow outline — and saturated
  // colour is reserved for abnormal conditions and alarm priorities.
  const HP = {
    bg: '#1c2026', panel: '#22272e', rule: '#2e353e', line: '#3a414b', flow: '#8b96a5',
    text: '#d4d9e0', dim: '#7d8793', running: '#aeb6c1', runningStroke: '#dde2e8',
    stoppedStroke: '#6b7480', maint: '#8b9be0', trip: '#e5484d', p2: '#f5a524', chem: '#a39584',
  };

  const getStatusColor = (eq: ScadaEquipment): { fill: string; stroke: string; mark: string } => {
    const status = getLiveStatus(eq);
    const abnormal = { fill: '#5a1d1f', stroke: HP.trip, mark: HP.trip };
    const stopped = { fill: HP.bg, stroke: HP.stoppedStroke, mark: HP.stoppedStroke };
    if (status === 'Tripped') return abnormal;
    if (status === 'Isolated') return isAbnormallyClosed(eq) ? abnormal : stopped;
    if (status === 'Standby') return stopped;
    if (status === 'Maintenance') return { fill: HP.bg, stroke: HP.maint, mark: HP.maint };
    return { fill: HP.running, stroke: HP.runningStroke, mark: '#2a3038' };
  };

  // Draws the real P&ID glyph for one equipment item at a local (cx, cy) —
  // circle+impeller for pumps, striped housing for membranes, bowtie for
  // valves, coil for exchangers, zigzag for UV/electro reactors, plain
  // vessel rect otherwise.
  const renderPidSymbol = (eq: ScadaEquipment, cx: number, cy: number) => {
    const shape = getEquipmentShape(eq);
    const { fill, stroke, mark } = getStatusColor(eq);
    const dash = getLiveStatus(eq) === 'Maintenance' ? '4,2' : undefined;
    switch (shape) {
      case 'pump':
        return (
          <g>
            <circle cx={cx} cy={cy} r={18} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />
            <polygon points={`${cx - 6},${cy - 8} ${cx - 6},${cy + 8} ${cx + 9},${cy}`} fill={mark} />
          </g>
        );
      case 'tank': {
        // Vertical cylinder with its live liquid level drawn inside.
        const level = tankLevels[eq.tag] ?? 50;
        const liquidH = 34 * (level / 100);
        return (
          <g>
            <rect x={cx - 26} y={cy - 18} width={52} height={36} fill={HP.bg} stroke={stroke} strokeWidth={2} />
            <rect x={cx - 24} y={cy + 17 - liquidH} width={48} height={liquidH} fill="#5b6b80" opacity={0.8} />
            <ellipse cx={cx} cy={cy - 18} rx={26} ry={5} fill={HP.bg} stroke={stroke} strokeWidth={2} />
            <path d={`M${cx - 26},${cy + 18} A26,5 0 0 0 ${cx + 26},${cy + 18}`} fill="none" stroke={stroke} strokeWidth={2} />
          </g>
        );
      }
      case 'valve':
        return (
          <g>
            <polygon points={`${cx - 16},${cy - 13} ${cx},${cy} ${cx - 16},${cy + 13}`} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
            <polygon points={`${cx + 16},${cy - 13} ${cx},${cy} ${cx + 16},${cy + 13}`} fill={fill} stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
          </g>
        );
      case 'membrane':
        return (
          <g>
            <rect x={cx - 44} y={cy - 17} width={88} height={34} rx={3} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />
            {[-27, -9, 9, 27].map((k) => (
              <line key={k} x1={cx + k - 7} y1={cy - 12} x2={cx + k + 7} y2={cy + 12} stroke={mark} strokeWidth={1.5} opacity={0.75} />
            ))}
          </g>
        );
      case 'reactor':
        return (
          <g>
            <rect x={cx - 40} y={cy - 17} width={80} height={34} rx={4} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />
            <polyline points={`${cx - 18},${cy - 8} ${cx - 6},${cy + 8} ${cx + 6},${cy - 8} ${cx + 18},${cy + 8}`} stroke={mark} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      case 'exchanger':
        return (
          <g>
            <rect x={cx - 40} y={cy - 17} width={80} height={34} rx={4} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />
            <polyline points={`${cx - 24},${cy} ${cx - 16},${cy - 9} ${cx - 8},${cy + 9} ${cx},${cy - 9} ${cx + 8},${cy + 9} ${cx + 16},${cy - 9} ${cx + 24},${cy}`} stroke={mark} strokeWidth={1.75} fill="none" strokeLinecap="round" />
          </g>
        );
      case 'header':
        return <rect x={cx - 48} y={cy - 9} width={96} height={18} rx={3} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />;
      case 'vessel':
      default:
        return <rect x={cx - 40} y={cy - 17} width={80} height={34} rx={7} fill={fill} stroke={stroke} strokeWidth={2} strokeDasharray={dash} />;
    }
  };

  // Symbol half-extents per shape, for routing pipes to symbol edges and
  // placing labels just below each symbol.
  const SHAPE_HALF: Record<PidShape, { w: number; h: number }> = {
    pump: { w: 18, h: 18 }, tank: { w: 26, h: 23 }, membrane: { w: 44, h: 17 }, valve: { w: 16, h: 13 },
    reactor: { w: 40, h: 17 }, exchanger: { w: 40, h: 17 }, header: { w: 48, h: 9 }, vessel: { w: 40, h: 17 },
  };

  const alarmPriorityOf = (t: ScadaInstrumentTag): 'P1' | 'P2' | null =>
    t.status === 'NORM' ? null : t.status === 'LOW_LOW' || t.status === 'HIGH_HIGH' ? 'P1' : 'P2';
  const alarmColor = (t: ScadaInstrumentTag) =>
    t.suppressed ? HP.dim : alarmPriorityOf(t) === 'P1' ? HP.trip : alarmPriorityOf(t) === 'P2' ? HP.p2 : HP.text;

  // Live position of each modulating valve, from the loop output driving it.
  const valvePosition = (eq: ScadaEquipment): number | null => {
    const loopFor: Record<string, string> = { 'LCV-100': 'LIC-100', 'PCV-403': 'PIC-403', 'TCV-402': 'TIC-402' };
    if (loopFor[eq.tag]) return Math.round(loopOutputs[loopFor[eq.tag]] ?? 0);
    const train = RO_TRAINS.find(t => `FCV-201${t.id}` === eq.tag);
    if (train) {
      const m = liveMetrics.trains[train.id];
      return m.producing ? Math.round(38 - m.fouling * 0.3) : 0;
    }
    return null;
  };

  const SHORT_UNIT: Record<string, string> = { bar: 'b', 'MΩ·cm': 'MΩ', 'µS/cm': 'µS', '°C': '°', 'm³/h': '', NTU: '', SDI: '', pH: '', 'p/L': '', 'm/s': '' };

  // ISA instrument bubbles for one equipment item: the valve positioner (ZT)
  // and every transmitter mounted on it, alarmed ones first.
  const getInstrumentBubbles = (eq: ScadaEquipment, max: number): { code: string; value: string; color: string }[] => {
    const out: { code: string; value: string; color: string; rank: number }[] = [];
    const zt = valvePosition(eq);
    if (zt !== null) out.push({ code: 'ZT', value: `${zt}%`, color: HP.running, rank: 1 });
    scadaTags.filter(t => t.equip === eq.tag).forEach(t => out.push({
      code: t.tag.split('-')[0],
      value: `${t.value}${SHORT_UNIT[t.unit] ?? t.unit}`,
      color: t.suppressed ? HP.dim : alarmPriorityOf(t) ? alarmColor(t) : HP.running,
      rank: alarmPriorityOf(t) ? 0 : 1,
    }));
    if (out.length === 0) {
      const running = getLiveStatus(eq) === 'Running';
      const hz = eq.tag.startsWith('DST-P') ? vfdSpeedHz : eq.vfdSpeedHz;
      if (eq.hasVfd && hz !== undefined) out.push({ code: 'ST', value: running ? `${hz.toFixed(0)}Hz` : '0Hz', color: HP.running, rank: 1 });
      else if (eq.powerKw !== undefined && !eq.type.toLowerCase().includes('valve')) out.push({ code: 'JT', value: running ? `${eq.powerKw}kW` : '0kW', color: HP.running, rank: 1 });
    }
    return out.sort((a, b) => a.rank - b.rank).slice(0, max);
  };

  // SVG text with a dark halo so labels stay legible where they cross piping.
  const haloText = (x: number, y: number, text: string, size: number, fill: string, bold = false) => (
    <text
      x={x} y={y} textAnchor="middle" fontSize={size} fontFamily="monospace" fontWeight={bold ? 'bold' : 'normal'}
      fill={fill} stroke={HP.bg} strokeWidth={3} paintOrder="stroke"
    >
      {text}
    </text>
  );

  const renderBubble = (bubble: { code: string; value: string; color: string }, bx: number, by: number) => (
    <g>
      <circle cx={bx} cy={by} r={11} fill={HP.bg} stroke={bubble.color === HP.running ? HP.stoppedStroke : bubble.color} strokeWidth={1.25} />
      <line x1={bx - 11} y1={by} x2={bx + 11} y2={by} stroke={HP.line} strokeWidth={0.75} />
      <text x={bx} y={by - 2.5} textAnchor="middle" fontSize="5.5" fontFamily="monospace" fontWeight="bold" fill={HP.text}>{bubble.code}</text>
      <text x={bx} y={by + 6.5} textAnchor="middle" fontSize="4.3" fontFamily="monospace" fill={bubble.color}>{bubble.value}</text>
    </g>
  );

  // ISA-101 alarm indicator beside an equipment symbol: red square "1" for
  // P1, amber triangle "2" for P2, flashing until acknowledged.
  const tagEquip = Object.fromEntries(scadaTags.map(t => [t.tag, t.equip]));
  const equipmentAlarm = (tag: string) => {
    const recs = alarmRecords.filter(a => tagEquip[a.tag] === tag);
    if (recs.length === 0) return null;
    return { priority: recs.some(r => r.priority === 'P1') ? 'P1' : 'P2', unack: recs.some(r => r.state !== 'ACK') };
  };
  const renderAlarmIndicator = (priority: string, unack: boolean, x: number, y: number) => (
    <g className={unack ? 'animate-pulse' : undefined}>
      {priority === 'P1'
        ? <rect x={x - 6} y={y - 6} width={12} height={12} fill={HP.trip} stroke="#000" strokeWidth={0.5} />
        : <polygon points={`${x},${y - 7} ${x + 7},${y + 6} ${x - 7},${y + 6}`} fill={HP.p2} stroke="#000" strokeWidth={0.5} />}
      <text x={x} y={y + (priority === 'P1' ? 3 : 4.5)} textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="monospace" fill="#000">{priority === 'P1' ? '1' : '2'}</text>
    </g>
  );

  // P&ID schematic for an area (Level 2) or a unit (Level 3). Main-line
  // equipment sits on one trunk pipe with flow arrows; side-stream equipment
  // is drawn to the right and connected the way it really is — parallel
  // trains and standbys on a split, dosing injected into the line, rejects
  // and drains drawn out of it. Level 3 draws every instrument on each item.
  // P&ID schematic for an area (Level 2) or a unit (Level 3).
  // Single-column for Level 3 unit detail (< 6 items), and 2-Tier Snake
  // layout for Level 2 areas to eliminate vertical scrolling while preserving
  // ISA-101 high-performance aesthetics and full equipment fidelity.
  const renderPidSchematic = (key: string, equipment: ScadaEquipment[], flowIn: string, flowOut: string, flowing: boolean, detail = false) => {
    const kindRank = { parallel: 0, inject: 1, service: 2, reject: 3 } as const;
    const onDisplay = new Set(equipment.map(e => e.tag));
    // An item whose parent isn't on this display is drawn on the main line.
    const list = equipment.map(e => (e.auxOf && !onDisplay.has(e.auxOf) ? { ...e, auxOf: undefined, auxKind: undefined } : e));
    const childrenOf = (tag: string) => list
      .filter(a => a.auxOf === tag)
      .sort((a, b) => kindRank[a.auxKind ?? 'service'] - kindRank[b.auxKind ?? 'service']);

    const isMultiTier = !detail && equipment.length > 5;
    const flowMarker = `pid-flow-${key}`;
    const chemMarker = `pid-chem-${key}`;
    const drainMarker = `pid-drain-${key}`;
    const pipe = flowing ? HP.flow : HP.line;
    const half = (eq: ScadaEquipment) => SHAPE_HALF[getEquipmentShape(eq)];

    const defs = (
      <defs>
        <marker id={flowMarker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={HP.flow} />
        </marker>
        <marker id={chemMarker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={HP.chem} />
        </marker>
        <marker id={drainMarker} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={HP.dim} />
        </marker>
      </defs>
    );

    // ==========================================
    // 1. DUAL-TIER SNAKE LAYOUT (LEVEL 2 AREAS)
    // ==========================================
    if (isMultiTier) {
      const mainUnits = list.filter(e => !e.auxOf);
      const mainBlocks: { eq: ScadaEquipment; parent: ScadaEquipment | null }[][] = mainUnits.map(main => [
        { eq: main, parent: null as ScadaEquipment | null },
        ...childrenOf(main.tag).flatMap(a => [
          { eq: a, parent: main as ScadaEquipment | null },
          ...childrenOf(a.tag).map(c => ({ eq: c, parent: main as ScadaEquipment | null })),
        ]),
      ]);

      const totalRowsCount = mainBlocks.reduce((acc, b) => acc + b.length, 0);
      let cumulative = 0;
      let splitIdx = Math.ceil(mainBlocks.length / 2);
      for (let i = 0; i < mainBlocks.length; i++) {
        cumulative += mainBlocks[i].length;
        if (cumulative >= totalRowsCount / 2) {
          splitIdx = i + 1;
          break;
        }
      }
      splitIdx = Math.max(1, Math.min(splitIdx, mainBlocks.length - 1));

      const tier1Rows = mainBlocks.slice(0, splitIdx).flat();
      const tier2Rows = mainBlocks.slice(splitIdx).flat();
      const maxTierRows = Math.max(tier1Rows.length, tier2Rows.length);

      const rowH = 82;
      const marginTop = 58;
      const marginBottom = 48;
      const height = marginTop + (maxTierRows - 1) * rowH + marginBottom;
      const width = 580;
      const yOf = (i: number) => marginTop + i * rowH;

      const cx1 = 78;
      const auxX1 = 170;
      const gutterX = 268;
      const cx2 = 368;
      const auxX2 = 460;

      const tier1MainIdx = tier1Rows.map((r, i) => (r.parent ? -1 : i)).filter(i => i >= 0);
      const tier2MainIdx = tier2Rows.map((r, i) => (r.parent ? -1 : i)).filter(i => i >= 0);
      const last1 = tier1MainIdx[tier1MainIdx.length - 1];
      const last2 = tier2MainIdx[tier2MainIdx.length - 1];
      const yCrossBottom = height - 18;

      const renderSideStream = (
        r: { eq: ScadaEquipment; parent: ScadaEquipment | null },
        i: number,
        rowsArr: typeof tier1Rows,
        cx: number,
        auxX: number
      ) => {
        if (!r.parent) return null;
        const y = yOf(i);
        const auxLeft = auxX - half(r.eq).w;
        const live = getLiveStatus(r.eq) === 'Running';
        if (r.eq.auxKind === 'parallel') {
          const pIdx = rowsArr.findIndex(x => x.eq === r.parent);
          const splitY = yOf(pIdx >= 0 ? pIdx : 0) - half(r.parent).h - 7;
          const color = live && flowing ? HP.flow : HP.line;
          return (
            <g key={`aux-${r.eq.tag}`}>
              <polyline points={`${cx},${splitY} ${auxX},${splitY} ${auxX},${y - half(r.eq).h - 2}`} fill="none" stroke={color} strokeWidth={2} />
              <line x1={auxLeft - 2} y1={y} x2={cx + 3} y2={y} stroke={color} strokeWidth={2} markerEnd={live && flowing ? `url(#${flowMarker})` : undefined} />
            </g>
          );
        }
        if (r.eq.auxKind === 'inject') {
          return (
            <line key={`aux-${r.eq.tag}`} x1={auxLeft - 2} y1={y} x2={cx + 3} y2={y}
              stroke={live ? HP.chem : HP.line} strokeWidth={1.5} strokeDasharray="4,2" markerEnd={live ? `url(#${chemMarker})` : undefined} />
          );
        }
        if (r.eq.auxKind === 'reject') {
          return (
            <line key={`aux-${r.eq.tag}`} x1={cx} y1={y} x2={auxLeft - 3} y2={y}
              stroke={HP.dim} strokeWidth={1.5} strokeDasharray="4,2" markerEnd={`url(#${drainMarker})`} />
          );
        }
        return (
          <line key={`aux-${r.eq.tag}`} x1={cx} y1={y} x2={auxLeft - 2} y2={y}
            stroke={HP.stoppedStroke} strokeWidth={1.5} strokeDasharray="1,3" />
        );
      };

      const renderEquipmentRow = (
        r: { eq: ScadaEquipment; parent: ScadaEquipment | null },
        i: number,
        cx: number,
        auxX: number,
        isTier2 = false
      ) => {
        const x = r.parent ? auxX : cx;
        const y = yOf(i);
        const h = half(r.eq);
        const bubbles = getInstrumentBubbles(r.eq, 1);
        const bubbleXs = bubbles.map((_, k) =>
          r.parent
            ? x + h.w + 14 + k * 24
            : isTier2
            ? (cx - h.w - 14) - k * 24
            : 18 + k * 24
        );
        const alarm = equipmentAlarm(r.eq.tag);
        const maxName = 22;
        const name = r.eq.name.length > maxName ? r.eq.name.slice(0, maxName - 2) + '…' : r.eq.name;
        return (
          <g key={r.eq.tag} onClick={() => setFaceplateEquipment(EQUIPMENT_BY_TAG[r.eq.tag])} className="cursor-pointer">
            {bubbles.length > 0 && (
              <line
                x1={r.parent ? x + h.w : bubbleXs[bubbleXs.length - 1] + 11} y1={y}
                x2={r.parent ? bubbleXs[0] - 11 : x - h.w} y2={y}
                stroke={HP.stoppedStroke} strokeWidth={1} strokeDasharray="2,2"
              />
            )}
            {renderPidSymbol(r.eq, x, y)}

            {/* Crisp semi-opaque equipment label badge that protects text from intersecting pipes */}
            <g>
              <rect
                x={x - 44}
                y={y + h.h + 2}
                width={88}
                height={20}
                rx={4}
                fill={HP.bg}
                stroke={HP.rule}
                strokeWidth={1}
                opacity={0.94}
              />
              <text x={x} y={y + h.h + 10.5} textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="bold" fill={HP.text}>
                {r.eq.tag}
              </text>
              <text x={x} y={y + h.h + 18} textAnchor="middle" fontSize="5" fontFamily="monospace" fill={HP.dim}>
                {name}
              </text>
            </g>

            {bubbles.map((b, k) => <g key={b.code + k}>{renderBubble(b, bubbleXs[k], y)}</g>)}
            {alarm && renderAlarmIndicator(alarm.priority, alarm.unack, x + h.w + 3, y - h.h - 5)}
          </g>
        );
      };

      return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={`${key} P&ID Snake`}>
          {defs}

          {/* Tier Headers */}
          <text x={cx1} y={16} fontSize="7" fontFamily="monospace" fontWeight="bold" fill="#38bdf8" textAnchor="middle">
            TRAIN A / INTAKE TIER
          </text>
          <text x={cx2} y={16} fontSize="7" fontFamily="monospace" fontWeight="bold" fill="#38bdf8" textAnchor="middle">
            TRAIN B / POLISHING TIER
          </text>

          {/* TIER 1 Process Trunk */}
          <line x1={cx1} y1={22} x2={cx1} y2={yCrossBottom} stroke={HP.line} strokeWidth={3} />
          <line x1={cx1} y1={22} x2={cx1} y2={yOf(0) - half(tier1Rows[0].eq).h - 4} stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined} />
          <text x={cx1 + 8} y={28} fontSize="6" fontFamily="monospace" fontWeight="bold" fill={HP.dim}>{flowIn}</text>

          {/* Connections between main-line units in Tier 1: starts below the label badge and ends with clear arrow */}
          {tier1MainIdx.slice(0, -1).map((a, k) => {
            const b = tier1MainIdx[k + 1];
            return (
              <line
                key={`flow-t1-${tier1Rows[a].eq.tag}`}
                x1={cx1} y1={yOf(a) + half(tier1Rows[a].eq).h + 23}
                x2={cx1} y2={yOf(b) - half(tier1Rows[b].eq).h - 4}
                stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined}
              />
            );
          })}

          {/* Exit from Tier 1 last unit with smooth rounded bend into cross pipe */}
          <path
            d={`M ${cx1} ${yOf(last1) + half(tier1Rows[last1].eq).h + 23} L ${cx1} ${yCrossBottom - 10} Q ${cx1} ${yCrossBottom} ${cx1 + 10} ${yCrossBottom} L ${gutterX} ${yCrossBottom}`}
            fill="none"
            stroke={pipe}
            strokeWidth={2}
          />

          {/* ==================================================== */}
          {/* U-LOOP INTERSTAGE TRANSFER PIPE (Tier 1 -> Tier 2)   */}
          {/* ==================================================== */}
          {/* Bottom horizontal directional flow arrow */}
          <line x1={cx1 + 25} y1={yCrossBottom} x2={gutterX - 25} y2={yCrossBottom} stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined} />

          {/* Vertical riser up through clear gutter channel */}
          <line x1={gutterX} y1={yCrossBottom} x2={gutterX} y2={28} stroke={pipe} strokeWidth={2} />

          {/* Interstage Flow Indicator Badge */}
          <g>
            <rect x={gutterX - 35} y={height / 2 - 14} width={70} height={28} rx={5} fill={HP.panel} stroke={flowing ? HP.flow : HP.line} strokeWidth={1.5} />
            <text x={gutterX} y={height / 2 - 3} fontSize="5.5" fontFamily="monospace" fontWeight="bold" fill={flowing ? HP.flow : HP.dim} textAnchor="middle">
              INTERSTAGE
            </text>
            <text x={gutterX} y={height / 2 + 7} fontSize="5" fontFamily="monospace" fill={flowing ? '#38bdf8' : HP.dim} textAnchor="middle">
              TRANSFER ➔
            </text>
          </g>

          {/* Mid-span directional arrow on top horizontal transfer segment */}
          <line x1={gutterX + 15} y1={28} x2={cx2 - 22} y2={28} stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined} />

          {/* Smooth curved 90° pipe elbow into Tier 2 trunk — no awkward arrow on the corner */}
          <path
            d={`M ${gutterX} 28 L ${cx2 - 10} 28 Q ${cx2} 28 ${cx2} 38 L ${cx2} ${yOf(0) - half(tier2Rows[0].eq).h - 4}`}
            fill="none"
            stroke={pipe}
            strokeWidth={2}
            markerEnd={flowing ? `url(#${flowMarker})` : undefined}
          />

          {/* TIER 2 Process Trunk background guide line */}
          <line x1={cx2} y1={36} x2={cx2} y2={height - 4} stroke={HP.line} strokeWidth={3} />

          {/* Connections between main-line units in Tier 2 */}
          {tier2MainIdx.slice(0, -1).map((a, k) => {
            const b = tier2MainIdx[k + 1];
            return (
              <line
                key={`flow-t2-${tier2Rows[a].eq.tag}`}
                x1={cx2} y1={yOf(a) + half(tier2Rows[a].eq).h + 23}
                x2={cx2} y2={yOf(b) - half(tier2Rows[b].eq).h - 4}
                stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined}
              />
            );
          })}

          {/* Final Exit from Tier 2 */}
          <line
            x1={cx2} y1={yOf(last2) + half(tier2Rows[last2].eq).h + 23}
            x2={cx2} y2={height - 6}
            stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined}
          />
          <text x={cx2 + 8} y={height - 8} fontSize="6" fontFamily="monospace" fontWeight="bold" fill={HP.dim}>{flowOut}</text>

          {/* Tier 1 Side-streams & Equipment */}
          {tier1Rows.map((r, i) => renderSideStream(r, i, tier1Rows, cx1, auxX1))}
          {tier1Rows.map((r, i) => renderEquipmentRow(r, i, cx1, auxX1, false))}

          {/* Tier 2 Side-streams & Equipment */}
          {tier2Rows.map((r, i) => renderSideStream(r, i, tier2Rows, cx2, auxX2))}
          {tier2Rows.map((r, i) => renderEquipmentRow(r, i, cx2, auxX2, true))}
        </svg>
      );
    }

    // ==========================================
    // 2. SINGLE-COLUMN LAYOUT (LEVEL 3 UNITS)
    // ==========================================
    const rows = list.filter(e => !e.auxOf).flatMap(main => [
      { eq: main, parent: null as ScadaEquipment | null },
      ...childrenOf(main.tag).flatMap(a => [
        { eq: a, parent: main as ScadaEquipment | null },
        ...childrenOf(a.tag).map(c => ({ eq: c, parent: main as ScadaEquipment | null })),
      ]),
    ]);
    const rowH = detail ? 86 : 82;
    const marginTop = 46;
    const marginBottom = 56;
    const cx = detail ? 160 : 86;
    const auxX = detail ? 268 : 190;
    const width = detail ? 374 : 292;
    const height = marginTop + (rows.length - 1) * rowH + marginBottom;
    const yOf = (i: number) => marginTop + i * rowH;
    const mainIdx = rows.map((r, i) => (r.parent ? -1 : i)).filter(i => i >= 0);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={`${key} P&ID`}>
        {defs}

        {/* Main process trunk, with where this water comes from and goes */}
        <line x1={cx} y1={4} x2={cx} y2={height - 4} stroke={HP.line} strokeWidth={3} />
        <line x1={cx} y1={4} x2={cx} y2={yOf(0) - half(rows[0].eq).h - 4} stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined} />
        <line x1={cx} y1={yOf(mainIdx[mainIdx.length - 1]) + half(rows[mainIdx[mainIdx.length - 1]].eq).h + 26} x2={cx} y2={height - 6} stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined} />
        <text x={cx + 7} y={12} fontSize="6" fontFamily="monospace" fontWeight="bold" fill={HP.dim}>{flowIn}</text>
        <text x={cx + 7} y={height - 8} fontSize="6" fontFamily="monospace" fontWeight="bold" fill={HP.dim}>{flowOut}</text>
        {mainIdx.slice(0, -1).map((a, k) => {
          const b = mainIdx[k + 1];
          return (
            <line
              key={`flow-${rows[a].eq.tag}`}
              x1={cx} y1={yOf(a) + half(rows[a].eq).h + 23} x2={cx} y2={yOf(b) - half(rows[b].eq).h - 4}
              stroke={pipe} strokeWidth={2} markerEnd={flowing ? `url(#${flowMarker})` : undefined}
            />
          );
        })}

        {/* Side-stream connections */}
        {rows.map((r, i) => {
          if (!r.parent) return null;
          const y = yOf(i);
          const auxLeft = auxX - half(r.eq).w;
          const live = getLiveStatus(r.eq) === 'Running';
          if (r.eq.auxKind === 'parallel') {
            const pIdx = rows.findIndex(x => x.eq === r.parent);
            const splitY = yOf(pIdx >= 0 ? pIdx : 0) - half(r.parent).h - 7;
            const color = live && flowing ? HP.flow : HP.line;
            return (
              <g key={`aux-${r.eq.tag}`}>
                <polyline points={`${cx},${splitY} ${auxX},${splitY} ${auxX},${y - half(r.eq).h - 2}`} fill="none" stroke={color} strokeWidth={2} />
                <line x1={auxLeft - 2} y1={y} x2={cx + 3} y2={y} stroke={color} strokeWidth={2} markerEnd={live && flowing ? `url(#${flowMarker})` : undefined} />
              </g>
            );
          }
          if (r.eq.auxKind === 'inject') {
            return (
              <line key={`aux-${r.eq.tag}`} x1={auxLeft - 2} y1={y} x2={cx + 3} y2={y}
                stroke={live ? HP.chem : HP.line} strokeWidth={1.5} strokeDasharray="4,2" markerEnd={live ? `url(#${chemMarker})` : undefined} />
            );
          }
          if (r.eq.auxKind === 'reject') {
            return (
              <line key={`aux-${r.eq.tag}`} x1={cx} y1={y} x2={auxLeft - 3} y2={y}
                stroke={HP.dim} strokeWidth={1.5} strokeDasharray="4,2" markerEnd={`url(#${drainMarker})`} />
            );
          }
          return (
            <line key={`aux-${r.eq.tag}`} x1={cx} y1={y} x2={auxLeft - 2} y2={y}
              stroke={HP.stoppedStroke} strokeWidth={1.5} strokeDasharray="1,3" />
          );
        })}

        {/* Equipment symbols, labels, instrument bubbles and alarm indicators */}
        {rows.map((r, i) => {
          const x = r.parent ? auxX : cx;
          const y = yOf(i);
          const h = half(r.eq);
          const bubbles = getInstrumentBubbles(r.eq, detail ? (r.parent ? 2 : 4) : 1);
          // Main-line bubbles sit left of the trunk, side-stream bubbles right of their symbol.
          const bubbleXs = bubbles.map((_, k) => r.parent ? x + h.w + 16 + k * 26 : (detail ? 18 : 20) + k * 26);
          const alarm = equipmentAlarm(r.eq.tag);
          const maxName = detail ? 30 : 24;
          const name = r.eq.name.length > maxName ? r.eq.name.slice(0, maxName - 2) + '…' : r.eq.name;
          return (
            <g key={r.eq.tag} onClick={() => setFaceplateEquipment(EQUIPMENT_BY_TAG[r.eq.tag])} className="cursor-pointer">
              {bubbles.length > 0 && (
                <line
                  x1={r.parent ? x + h.w : bubbleXs[bubbleXs.length - 1] + 11} y1={y}
                  x2={r.parent ? bubbleXs[0] - 11 : x - h.w} y2={y}
                  stroke={HP.stoppedStroke} strokeWidth={1} strokeDasharray="2,2"
                />
              )}
              {renderPidSymbol(r.eq, x, y)}

              {/* Crisp semi-opaque equipment label badge that protects text from intersecting pipes */}
              <g>
                <rect
                  x={x - 44}
                  y={y + h.h + 2}
                  width={88}
                  height={20}
                  rx={4}
                  fill={HP.bg}
                  stroke={HP.rule}
                  strokeWidth={1}
                  opacity={0.94}
                />
                <text x={x} y={y + h.h + 10.5} textAnchor="middle" fontSize={7} fontFamily="monospace" fontWeight="bold" fill={HP.text}>
                  {r.eq.tag}
                </text>
                <text x={x} y={y + h.h + 18} textAnchor="middle" fontSize={5} fontFamily="monospace" fill={HP.dim}>
                  {name}
                </text>
              </g>

              {bubbles.map((b, k) => <g key={b.code + k}>{renderBubble(b, bubbleXs[k], y)}</g>)}
              {alarm && renderAlarmIndicator(alarm.priority, alarm.unack, x + h.w + 3, y - h.h - 5)}
            </g>
          );
        })}
      </svg>
    );
  };

  // Plant utilities are support systems, not a series process — drawn as a
  // row of independent units with their header-pressure transmitters.
  const renderPidUtilityStrip = (equipment: ScadaEquipment[]) => {
    const spacing = 150;
    const width = spacing * equipment.length;
    const cy = 34;
    return (
      <svg viewBox={`0 0 ${width} 90`} className="w-full h-auto" role="img" aria-label="Plant utilities P&ID">
        {equipment.map((eq, i) => {
          const x = spacing * i + spacing / 2 + 14;
          const h = SHAPE_HALF[getEquipmentShape(eq)];
          const bubble = getInstrumentBubbles(eq, 1)[0];
          const alarm = equipmentAlarm(eq.tag);
          const name = eq.name.length > 30 ? eq.name.slice(0, 28) + '…' : eq.name;
          return (
            <g key={eq.tag} onClick={() => setFaceplateEquipment(eq)} className="cursor-pointer">
              {bubble && <line x1={x - h.w - 15} y1={cy} x2={x - h.w} y2={cy} stroke={HP.stoppedStroke} strokeWidth={1} strokeDasharray="2,2" />}
              {renderPidSymbol(eq, x, cy)}
              {haloText(x, cy + h.h + 11, eq.tag, 7.5, HP.text, true)}
              {haloText(x, cy + h.h + 20, name, 5.5, HP.dim)}
              {bubble && renderBubble(bubble, x - h.w - 26, cy)}
              {alarm && renderAlarmIndicator(alarm.priority, alarm.unack, x + h.w + 3, cy - h.h - 5)}
            </g>
          );
        })}
      </svg>
    );
  };

  // ISA-101 moving analog indicator: the light band is the normal operating
  // range, ticks mark alarm limits, and the pointer turns alarm-coloured only
  // when the value is in alarm.
  const renderAnalogIndicator = (t: ScadaInstrumentTag, width = 110) => {
    const limits = [t.lowLowAlarm, t.lowAlarm, t.highAlarm, t.highHighAlarm].filter((v): v is number => v !== undefined);
    const pts = [...limits, t.nominal];
    let lo = Math.min(...pts);
    let hi = Math.max(...pts);
    const span = hi - lo || Math.abs(hi) || 1;
    lo -= span * 0.4;
    hi += span * 0.4;
    if (pts.every(v => v >= 0)) lo = Math.max(0, lo);
    const x = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (width - 8) + 4;
    const normLo = t.lowAlarm ?? t.lowLowAlarm ?? lo;
    const normHi = t.highAlarm ?? t.highHighAlarm ?? hi;
    const px = x(t.value);
    const color = alarmColor(t);
    return (
      <svg width={width} height={14} viewBox={`0 0 ${width} 14`} role="img" aria-label={`${t.tag} ${t.value} ${t.unit}`}>
        <rect x={4} y={5} width={width - 8} height={5} fill={HP.rule} />
        <rect x={x(normLo)} y={5} width={Math.max(1, x(normHi) - x(normLo))} height={5} fill="#4a525d" />
        {limits.map((l, k) => <line key={k} x1={x(l)} y1={3} x2={x(l)} y2={12} stroke={HP.dim} strokeWidth={1} />)}
        <polygon points={`${px - 4},0 ${px + 4},0 ${px},6`} fill={color} />
        <line x1={px} y1={5} x2={px} y2={13} stroke={color} strokeWidth={1.5} />
      </svg>
    );
  };

  const renderInstrumentRow = (t: ScadaInstrumentTag) => (
    <div key={t.tag} className="grid grid-cols-[70px_minmax(0,1fr)_110px_84px] items-center gap-2 py-1 text-[11px] font-mono" style={{ borderBottom: `1px solid ${HP.rule}` }}>
      <span className="font-bold flex items-center gap-1" style={{ color: HP.text }}>
        {alarmPriorityOf(t) && (
          <span className="inline-block w-2 h-2" style={{ background: alarmPriorityOf(t) === 'P1' ? HP.trip : HP.p2 }} />
        )}
        {t.tag}
      </span>
      <span className="truncate" style={{ color: HP.dim }} title={t.description}>{t.description}</span>
      {renderAnalogIndicator(t)}
      <span className="text-right tabular-nums" style={{ color: alarmColor(t) }} title={t.suppressed ? 'Alarm suppressed by design — unit out of service' : undefined}>
        {t.value} <span style={{ color: HP.dim }}>{t.unit}</span>{t.suppressed && <span style={{ color: HP.dim }}> ·S</span>}
      </span>
    </div>
  );

  const currentStage = useMemo(() => {
    return UPW_STAGES.find((s) => s.id === selectedStageId) || UPW_STAGES[2];
  }, [selectedStageId]);

  // Live electrical load: rated power of every running unit. Standby units
  // carry 0 kW in their data, so they draw their duty unit's rating when run.
  const plantLoadKw = Math.round(ALL_EQUIPMENT.reduce((sum, eq) => {
    if (getLiveStatus(eq) !== 'Running') return sum;
    const duty = eq.auxKind === 'parallel' && eq.auxOf ? EQUIPMENT_BY_TAG[eq.auxOf] : eq.tag === 'IAC-501B' ? EQUIPMENT_BY_TAG['IAC-501A'] : eq;
    return sum + (eq.powerKw || duty.powerKw || 0);
  }, 0));

  // ISA-101 Level 2 process areas.
  const AREAS = [
    { id: 1, title: 'PRE-TREATMENT', stage: 'Stage 1: Pre-Treatment', flowIn: 'FROM PUB / NEWATER + T-405 RECLAIM', flowOut: 'TO RO TRAINS A/B', flowing: feedPumpsRunning && pretreatPathOpen, keyTags: ['FT-101', 'AIT-102', 'AIT-103', 'AIT-105'] },
    { id: 2, title: 'PRIMARY RO / MAKE-UP', stage: 'Stage 2: Primary RO', flowIn: 'FROM CF-104/104B', flowOut: 'TO STAGE 3 (P-301 SUCTION)', flowing: roProducing, keyTags: ['FT-201', 'LT-205', 'FY-201A', 'FY-201B'] },
    { id: 3, title: 'POLISHING', stage: 'Stage 3: Polishing', flowIn: 'FROM T-205 MAKE-UP TANK', flowOut: 'TO STAGE 4 (DST-P-401)', flowing: polishRunning, keyTags: ['FT-301', 'AIT-302', 'AIT-312', 'AIT-304'] },
    { id: 4, title: 'DISTRIBUTION', stage: 'Stage 4: Distribution', flowIn: 'FROM STAGE 3 (UF-304)', flowOut: 'LOOP RETURN → T-205', flowing: polishRunning && recircAvailable, keyTags: ['AIT-401A', 'FT-401', 'PT-402', 'TT-402'] },
    { id: 5, title: 'UTILITIES', stage: 'Utilities', flowIn: '', flowOut: '', flowing: true, keyTags: ['PT-501', 'PT-502'] },
  ];
  const areaEquipment = (id: number) => (id === 5 ? UPW_UTILITIES : UPW_STAGES.find(s => s.id === id)!.equipmentList);
  const areaTags = (stage: string) => scadaTags.filter(t => t.stage === stage);
  const alarmCounts = (tags: string[]) => {
    const set = new Set(tags);
    const recs = alarmRecords.filter(r => set.has(r.tag));
    return { p1: recs.filter(r => r.priority === 'P1').length, p2: recs.filter(r => r.priority === 'P2').length, unack: recs.some(r => r.state !== 'ACK') };
  };
  const unitTags = (unit: typeof UPW_UNITS[number]) => scadaTags.filter(t => t.equip && unit.tags.includes(t.equip));

  // Redundancy status for the Level 1 overview.
  const availableUnit = (tag: string) => ['Running', 'Standby'].includes(getLiveStatus(EQUIPMENT_BY_TAG[tag]));
  const REDUNDANCY: { label: string; units: string[]; status: () => { text: string; level: 0 | 1 | 2 } }[] = [
    ...[
      ['Feed pumps', 'P-101A', 'P-101B'], ['MMF vessels', 'MMF-101', 'MMF-101B'], ['Softeners', 'SFT-103', 'SFT-103B'],
      ['Cartridge housings', 'CF-104', 'CF-104B'], ['Interstage pumps', 'RO-P-202A', 'RO-P-202B'], ['Polishing pumps', 'P-301A', 'P-301B'],
      ['Distribution pumps', 'DST-P-401A', 'DST-P-401B'], ['Air compressors', 'IAC-501A', 'IAC-501B'],
    ].map(([label, a, b]) => ({
      label, units: [a, b],
      status: () => {
        const n = [a, b].filter(availableUnit).length;
        return n === 2 ? { text: 'N+1', level: 0 as const } : n === 1 ? { text: 'NO SPARE', level: 1 as const } : { text: 'LOST', level: 2 as const };
      },
    })),
    {
      label: 'RO trains (2×60%)', units: ['RO-P-201A', 'RO-P-201B'],
      status: () => trainsProducing.length === 2 ? { text: '100% MAKE-UP', level: 0 }
        : trainsProducing.length === 1 ? { text: '60% MAKE-UP', level: 1 } : { text: 'NO PRODUCTION', level: 2 },
    },
    {
      label: 'Mixed beds (lead/lag)', units: ['UPW-MB-302', 'UPW-MB-312'],
      status: () => leadBedOn && lagBedOn ? { text: 'LEAD/LAG', level: 0 }
        : mixedBedInService ? { text: 'SINGLE BED', level: 1 } : { text: 'BYPASSED', level: 2 },
    },
  ];
  const levelColor = (level: 0 | 1 | 2) => (level === 0 ? HP.dim : level === 1 ? HP.p2 : HP.trip);
  const stateLetter = (tag: string) => {
    const st = getLiveStatus(EQUIPMENT_BY_TAG[tag]);
    const isValve = EQUIPMENT_BY_TAG[tag].type.toLowerCase().includes('valve');
    return {
      Running: isValve ? 'OPEN' : 'RUN', Standby: 'STBY', Tripped: 'TRIP', Maintenance: 'MAINT', Isolated: isValve ? 'CLOSED' : 'ISO',
    }[st];
  };
  const stateColor = (tag: string) => {
    const eq = EQUIPMENT_BY_TAG[tag];
    const st = getLiveStatus(eq);
    return st === 'Tripped' || (st === 'Isolated' && isAbnormallyClosed(eq)) ? HP.trip : st === 'Maintenance' ? HP.maint : st === 'Running' ? HP.text : HP.dim;
  };

  // Automatic sequences and abnormal operating states for the overview.
  const plantSequences = [
    backwash && `${backwash.vessel} backwash — step ${backwash.step + 1}/${BACKWASH_STEPS.length}: ${BACKWASH_STEPS[backwash.step].name}`,
    softRegen && `${softRegen.unit} brine regeneration — ${softRegen.scansLeft} scans remaining`,
    roCip && `${roCip.train} CIP — ${roCip.scansLeft} scans remaining`,
    ...i402Channels.filter(c => c.oos).map(c => `${c.tag} bypassed for calibration — I-402 voting ${i402VoteMode}`),
    ...Object.entries(interlockTripped).filter(([, v]) => v).map(([k]) => `Interlock ${k.replace('I', 'I-')} active`),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4 pb-12 font-sans selection:bg-cyan-500 selection:text-white">
      {/* 1. SCADA INDUSTRIAL TOP HEADER & ANNUNCIATOR BAR (100% PURE SCADA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Left: Industrial SCADA Identity */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  SCADA HMI • FAB-1 UPW MAIN COCKPIT
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  OPC-UA SCAN: {scanCycleMs}ms
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
                  MODE: {scadaControlMode}
                </span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                Ultra-Pure Water Production & Distribution SCADA
              </h1>
            </div>
          </div>

          {/* Center/Right: ISA-18.2 Alarm Annunciator & Silence Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Alarm Annunciator Tile */}
            <div
              className={`px-3 py-2 rounded-lg border font-mono text-xs flex items-center gap-2 transition-all ${
                activeAlarms.length > 0 || unackedAlarmCount > 0
                  ? unackedAlarmCount === 0
                    ? 'bg-amber-950/80 border-amber-600/80 text-amber-300'
                    : 'bg-red-950/90 border-red-500 text-red-200 animate-pulse shadow-lg shadow-red-950'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${activeAlarms.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
              <div>
                <span className="font-bold uppercase tracking-wider block text-[10px]">
                  {activeAlarms.length > 0 ? `${activeAlarms.length} ACTIVE ALARM${activeAlarms.length > 1 ? 'S' : ''}` : 'SYSTEM NOMINAL'}
                </span>
                <span className="text-[11px]">
                  {activeAlarms.length > 0
                    ? `${activeAlarms[0].tag}: ${activeAlarms[0].status}${unackedAlarmCount > 0 ? ` • ${unackedAlarmCount} UNACK` : ''}`
                    : unackedAlarmCount > 0 ? `${unackedAlarmCount} cleared, awaiting ACK` : 'All Interlocks Healthy'}
                </span>
              </div>
            </div>

            {/* Operator Annunciator Pushbuttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <button
                onClick={() => {
                  setHornSilenced(prev => !prev);
                  logSoeEvent('COMMAND', 'SCADA-OP', `Audible alarm horn ${!hornSilenced ? 'silenced' : 'restored'}.`, 'INFO');
                }}
                className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                  hornSilenced
                    ? 'bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-amber-900/40 hover:bg-amber-800/60 text-amber-300 border border-amber-700/50'
                }`}
                title="Silence Audible SCADA Klaxon"
              >
                {hornSilenced ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-bounce" />}
                {hornSilenced ? 'HORN OFF' : 'SILENCE'}
              </button>

              <button
                onClick={acknowledgeAllAlarms}
                className="px-2.5 py-1.5 rounded text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-all"
                title="Acknowledge Flashing Alarms (ACK)"
              >
                <Check className="w-3.5 h-3.5 text-cyan-400" />
                ACK ALL
              </button>

              <button
                onClick={resetToNominal}
                className="px-2.5 py-1.5 rounded text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 transition-all"
                title="Restore Setpoints to Nominal Steady State"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                RESET
              </button>
            </div>

            {/* Industrial Emergency Shutdown (ESD) Pushbutton */}
            {/* Two-step emergency shutdown: ARM, then CONFIRM within 5 s */}
            {esdArmed ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={executeEsd}
                  className="px-3 py-2 rounded-lg bg-red-700 hover:bg-red-600 border border-red-400 text-white font-mono text-xs font-bold shadow-lg flex items-center gap-1.5 animate-pulse"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  CONFIRM ESD
                </button>
                <button
                  onClick={() => setEsdArmed(false)}
                  className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold"
                >
                  CANCEL
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEsdArmed(true);
                  logSoeEvent('COMMAND', 'ESD', 'ESD armed by operator — awaiting confirmation (5 s).', 'WARN');
                }}
                className="px-3 py-2 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 font-mono text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
                title="Emergency shutdown: trips all pumps and closes XV-101 / XV-401. Requires confirmation."
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                ESD
              </button>
            )}
          </div>
        </div>

        {/* Distributed Field PLC Status Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-500 flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-cyan-500" />
              FIELD CONTROLLERS:
            </span>
            {Object.entries(plcStatus).map(([name, info]) => (
              <span key={name} className="flex items-center gap-1 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {name}: <span className="text-slate-300 font-bold">{info.pingMs}ms</span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span>RO RECOVERY: <span className="text-cyan-400 font-bold">{liveMetrics.roRecovery}%</span></span>
            <span>RECLAIM: <span className="text-cyan-400 font-bold">{liveMetrics.reclaimRate}%</span></span>
            <span>PLANT LOAD: <span className="text-cyan-400 font-bold">{plantLoadKw} kW</span></span>
            <span>LOOP VELOCITY: <span className="text-emerald-400 font-bold">{liveMetrics.velocity} m/s</span></span>
            <span>CLEANROOM SPEC: <span className="text-emerald-400 font-bold">18.20 MΩ·cm @ 25°C</span></span>
          </div>
        </div>
      </div>

      {/* 2. SCADA SUB-VIEW NAVIGATION RIBBON */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-500 pr-1">PROCESS</span>
          {([['OVERVIEW', 'L1 PLANT OVERVIEW'], ['AREA', 'L2 AREA'], ['UNIT', 'L3 UNIT DETAIL']] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setScadaTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                scadaTab === tab
                  ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
          <span className="text-[10px] font-mono font-bold text-slate-500 pl-3 pr-1">SUPPORT</span>

          <button
            onClick={() => setScadaTab('POU_TOOLS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'POU_TOOLS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            CLEANROOM TOOL TAKE-OFFS (POU)
          </button>

          <button
            onClick={() => setScadaTab('TRENDS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'TRENDS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            MULTI-PEN HISTORIAN
          </button>

          <button
            onClick={() => setScadaTab('TAGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'TAGS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            INSTRUMENT TAG BROWSER
          </button>

          <button
            onClick={() => setScadaTab('SOE_LOGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'SOE_LOGS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            SOE AUDIT LOG
          </button>

          <button
            onClick={() => setScadaTab('ALARMS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'ALARMS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : unackedAlarmCount > 0 ? 'text-red-400 hover:bg-slate-800/60 animate-pulse' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            ALARM SUMMARY{alarmRecords.length > 0 ? ` (${alarmRecords.length})` : ''}
          </button>

          <button
            onClick={() => setScadaTab('LOOPS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'LOOPS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            CONTROL LOOPS
          </button>

          <button
            onClick={() => setScadaTab('INTERLOCKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'INTERLOCKS'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            INTERLOCK MATRIX
          </button>

          <button
            onClick={() => setScadaTab('STAGES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              scadaTab === 'STAGES'
                ? 'bg-slate-700/60 text-slate-100 border border-slate-500/60 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            STAGE SPECS
          </button>
        </div>
      </div>

      {/* 3. ISA-101 PROCESS DISPLAYS — L1 PLANT OVERVIEW, L2 AREA, L3 UNIT DETAIL */}
      {(scadaTab === 'OVERVIEW' || scadaTab === 'AREA' || scadaTab === 'UNIT') && (() => {
        const area = AREAS.find(a => a.id === selectedStageId) ?? AREAS[0];
        const unit = UPW_UNITS.find(u => u.id === selectedUnitId) ?? UPW_UNITS[0];
        const panel = { background: HP.panel, border: `1px solid ${HP.rule}` };
        const heading = 'text-[11px] font-mono font-bold uppercase tracking-wider';
        const crumb = (label: string, onClick: (() => void) | null) => (
          <button
            onClick={onClick ?? undefined}
            disabled={!onClick}
            className="font-mono text-[11px] font-bold uppercase"
            style={{ color: onClick ? HP.running : HP.text, textDecoration: onClick ? 'underline' : 'none' }}
          >
            {label}
          </button>
        );
        const alarmBadges = (c: { p1: number; p2: number; unack: boolean }) => (
          <span className={`flex items-center gap-1 font-mono text-[10px] font-bold ${c.unack ? 'animate-pulse' : ''}`}>
            {c.p1 > 0 && <span className="px-1 text-black" style={{ background: HP.trip }}>1 × {c.p1}</span>}
            {c.p2 > 0 && <span className="px-1 text-black" style={{ background: HP.p2 }}>2 × {c.p2}</span>}
          </span>
        );
        const legend = (
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono pt-2" style={{ color: HP.dim }}>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{ background: HP.running }} />Running</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{ border: `2px solid ${HP.stoppedStroke}` }} />Stopped / closed</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full" style={{ border: `2px dashed ${HP.maint}` }} />Sequence / maintenance</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: HP.trip }} />P1 alarm / tripped</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3" style={{ background: HP.p2, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />P2 alarm</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: HP.chem }} />Chemical injection</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t border-dashed" style={{ borderColor: HP.dim }} />Reject / drain</span>
          </div>
        );
        const ILK_TEXT: Record<string, string> = {
          I101: 'Feed pumps trip on low suction (PT-101 < 1.2 bar)',
          I301: 'Polishing pumps trip on T-205 low-low (LT-205 < 10%)',
          I401: 'Lead distribution pump lost → standby auto-start',
          I402: `Supply resistivity < 17.50 MΩ·cm (${i402VoteMode} of AIT-401A/C/D) → close XV-401`,
          I403: 'TOC > 2.0 ppb → off-spec quality to fab',
        };

        return (
          <div className="rounded-2xl p-4 space-y-4" style={{ background: HP.bg, border: `1px solid ${HP.rule}` }}>
            {/* Display hierarchy breadcrumb */}
            <div className="flex flex-wrap items-center gap-2" style={{ color: HP.dim }}>
              {crumb('L1 · Plant Overview', scadaTab === 'OVERVIEW' ? null : () => setScadaTab('OVERVIEW'))}
              {scadaTab !== 'OVERVIEW' && <><ChevronRight className="w-3 h-3" />{crumb(`L2 · ${area.title}`, scadaTab === 'AREA' ? null : () => openArea(area.id))}</>}
              {scadaTab === 'UNIT' && <><ChevronRight className="w-3 h-3" />{crumb(`L3 · ${unit.title}`, null)}</>}
              <span className="ml-auto font-mono text-[10px]">
                {plantSequences.length > 0 ? `${plantSequences.length} ABNORMAL STATE${plantSequences.length > 1 ? 'S' : ''}` : 'ALL AREAS IN NORMAL OPERATION'}
              </span>
            </div>

            {/* ── LEVEL 1: PLANT OVERVIEW ── */}
            {scadaTab === 'OVERVIEW' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  {AREAS.map(a => {
                    const eqs = areaEquipment(a.id);
                    const running = eqs.filter(e => getLiveStatus(e) === 'Running').length;
                    const abnormal = eqs.filter(e => stateColor(e.tag) === HP.trip).length;
                    const counts = alarmCounts(areaTags(a.stage).map(t => t.tag));
                    return (
                      <button
                        key={a.id}
                        onClick={() => openArea(a.id)}
                        className="text-left rounded-lg p-3 space-y-2 transition hover:brightness-125"
                        style={{ ...panel, borderColor: abnormal > 0 ? HP.trip : HP.rule }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={heading} style={{ color: HP.text }}>{a.id < 5 ? `${a.id} · ` : ''}{a.title}</span>
                          {alarmBadges(counts)}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: abnormal > 0 ? HP.trip : HP.dim }}>
                          {running}/{eqs.length} RUNNING{abnormal > 0 ? ` · ${abnormal} ABNORMAL` : ''}{a.id < 5 ? ` · ${a.flowing ? 'FLOWING' : 'NO FLOW'}` : ''}
                        </div>
                        <div className="space-y-1">
                          {a.keyTags.map(k => tagByName[k]).filter(Boolean).map(t => (
                            <div key={t.tag} className="grid grid-cols-[62px_72px_minmax(0,1fr)] items-center gap-1 text-[10px] font-mono">
                              <span style={{ color: HP.dim }}>{t.tag}</span>
                              {renderAnalogIndicator(t, 72)}
                              <span className="text-right tabular-nums" style={{ color: alarmColor(t) }}>{t.value}{SHORT_UNIT[t.unit] ?? t.unit}</span>
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 rounded-lg p-3 space-y-2" style={panel}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={heading} style={{ color: HP.text }}>Delivered UPW Quality & Plant Performance</span>
                      <span className="font-mono text-[10px]" style={{ color: HP.dim }}>
                        RO RECOVERY {liveMetrics.roRecovery}% · RECLAIM {liveMetrics.reclaimRate}% · LOAD {plantLoadKw} kW · {trainsProducing.length}/2 RO TRAINS
                      </span>
                    </div>
                    <div>
                      {['AIT-401A', 'AIT-302', 'AIT-304', 'AIT-303', 'PC-401', 'TT-402', 'PT-402', 'FT-401', 'VT-401', 'FT-201', 'LT-205', 'LT-100']
                        .map(k => tagByName[k]).filter(Boolean).map(renderInstrumentRow)}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg p-3 space-y-1" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Redundancy</span>
                      {REDUNDANCY.map(r => {
                        const st = r.status();
                        return (
                          <div key={r.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-0.5 text-[10px] font-mono" style={{ borderBottom: `1px solid ${HP.rule}` }}>
                            <span className="truncate" style={{ color: HP.dim }}>{r.label}</span>
                            <span className="flex gap-1">
                              {r.units.map(u => (
                                <span key={u} title={`${u} ${stateLetter(u)}`} style={{ color: stateColor(u) }}>{stateLetter(u)}</span>
                              ))}
                            </span>
                            <span className="font-bold text-right w-24" style={{ color: levelColor(st.level) }}>{st.text}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="rounded-lg p-3 space-y-1" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Sequences & Abnormal States</span>
                      {plantSequences.length === 0
                        ? <p className="text-[10px] font-mono" style={{ color: HP.dim }}>No sequences running, no bypasses, no interlocks active.</p>
                        : plantSequences.map(s => <p key={s} className="text-[10px] font-mono" style={{ color: s.startsWith('Interlock') ? HP.trip : HP.maint }}>{s}</p>)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── LEVEL 2: AREA ── */}
            {scadaTab === 'AREA' && (
              <>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map(a => {
                    const counts = alarmCounts(areaTags(a.stage).map(t => t.tag));
                    return (
                      <button
                        key={a.id}
                        onClick={() => openArea(a.id)}
                        className="px-3 py-1.5 rounded font-mono text-[11px] font-bold flex items-center gap-2"
                        style={{ background: a.id === area.id ? HP.rule : 'transparent', color: a.id === area.id ? HP.text : HP.dim, border: `1px solid ${HP.rule}` }}
                      >
                        {a.title}{alarmBadges(counts)}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-4">
                  <div className="rounded-lg p-3" style={panel}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={heading} style={{ color: HP.text }}>{area.title} — P&ID</span>
                      <span className="font-mono text-[10px]" style={{ color: area.flowing ? HP.dim : HP.p2 }}>
                        {area.id === 5 ? (airHealthy && n2Healthy ? 'SUPPLY HEADERS NORMAL' : 'UTILITY SUPPLY LOST') : area.flowing ? 'PROCESS FLOWING' : 'NO PROCESS FLOW'}
                      </span>
                    </div>
                    <div className="mx-auto" style={{ maxWidth: area.id === 5 ? 900 : 780 }}>
                      {area.id === 5
                        ? renderPidUtilityStrip(UPW_UTILITIES)
                        : renderPidSchematic(`area-${area.id}`, areaEquipment(area.id), area.flowIn, area.flowOut, area.flowing)}
                    </div>
                    {legend}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg p-3 space-y-1" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Units — open Level 3 detail</span>
                      {UPW_UNITS.filter(u => u.stageId === area.id).map(u => {
                        const counts = alarmCounts(unitTags(u).map(t => t.tag));
                        const abnormal = u.tags.some(t => stateColor(t) === HP.trip);
                        return (
                          <button
                            key={u.id}
                            onClick={() => openUnit(u.id)}
                            className="w-full grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 py-1 text-left text-[11px] font-mono hover:brightness-125"
                            style={{ borderBottom: `1px solid ${HP.rule}` }}
                          >
                            <span className="truncate" style={{ color: abnormal ? HP.trip : HP.text }}>{u.title}</span>
                            {alarmBadges(counts)}
                            <span style={{ color: HP.dim }}>{u.tags.filter(t => getLiveStatus(EQUIPMENT_BY_TAG[t]) === 'Running').length}/{u.tags.length} ›</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="rounded-lg p-3" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Area Instruments</span>
                      <div className="mt-1">
                        {[...areaTags(area.stage)]
                          .sort((a, b) => (alarmPriorityOf(a) ? 0 : 1) - (alarmPriorityOf(b) ? 0 : 1))
                          .map(renderInstrumentRow)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── LEVEL 3: UNIT DETAIL ── */}
            {scadaTab === 'UNIT' && (
              <>
                <div className="flex flex-wrap gap-2">
                  {UPW_UNITS.filter(u => u.stageId === unit.stageId).map(u => (
                    <button
                      key={u.id}
                      onClick={() => openUnit(u.id)}
                      className="px-3 py-1.5 rounded font-mono text-[11px] font-bold"
                      style={{ background: u.id === unit.id ? HP.rule : 'transparent', color: u.id === unit.id ? HP.text : HP.dim, border: `1px solid ${HP.rule}` }}
                    >
                      {u.title}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                  <div className="rounded-lg p-3" style={panel}>
                    <span className={heading} style={{ color: HP.text }}>{unit.title} — Detail P&ID</span>
                    <div className="mx-auto mt-2" style={{ maxWidth: unit.stageId === 5 ? 700 : 620 }}>
                      {unit.stageId === 5
                        ? renderPidUtilityStrip(unit.tags.map(t => EQUIPMENT_BY_TAG[t]))
                        : renderPidSchematic(`unit-${unit.id}`, unit.tags.map(t => EQUIPMENT_BY_TAG[t]), unit.flowIn, unit.flowOut, area.flowing, true)}
                    </div>
                    {legend}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-lg p-3" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Equipment</span>
                      <div className="mt-1">
                        {unit.tags.map(t => EQUIPMENT_BY_TAG[t]).map(eq => {
                          const hold = sequenceHolding(eq.tag);
                          return (
                            <div key={eq.tag} className="grid grid-cols-[82px_minmax(0,1fr)_56px_44px_auto] items-center gap-2 py-1 text-[11px] font-mono" style={{ borderBottom: `1px solid ${HP.rule}` }}>
                              <span className="font-bold" style={{ color: HP.text }}>{eq.tag}</span>
                              <span className="truncate" style={{ color: HP.dim }} title={eq.name}>{hold ? `${eq.name} — ${hold}` : eq.name}</span>
                              <span className="font-bold" style={{ color: stateColor(eq.tag) }}>{stateLetter(eq.tag)}</span>
                              <span style={{ color: HP.dim }}>{getLiveControlMode(eq)}</span>
                              <button
                                onClick={() => setFaceplateEquipment(eq)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{ border: `1px solid ${HP.stoppedStroke}`, color: HP.running }}
                              >
                                FACEPLATE
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="rounded-lg p-3" style={panel}>
                      <span className={heading} style={{ color: HP.text }}>Instruments</span>
                      <div className="mt-1">
                        {unitTags(unit).length > 0
                          ? unitTags(unit).map(renderInstrumentRow)
                          : <p className="text-[10px] font-mono" style={{ color: HP.dim }}>No analog transmitters on this unit.</p>}
                      </div>
                    </div>
                    {unit.loops.length > 0 && (
                      <div className="rounded-lg p-3" style={panel}>
                        <span className={heading} style={{ color: HP.text }}>Control Loops</span>
                        {controlLoops.filter(l => unit.loops.includes(l.tag)).map(l => (
                          <div key={l.tag} className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-2 py-1 text-[11px] font-mono" style={{ borderBottom: `1px solid ${HP.rule}` }}>
                            <span className="font-bold" style={{ color: HP.text }}>{l.tag}</span>
                            <span className="truncate" style={{ color: HP.dim }}>PV {l.pv} · SP {l.sp} {l.unit} · OUT {l.output.toFixed(0)}% → {l.finalElement}</span>
                            <span className="font-bold" style={{ color: l.mode === 'IMAN' ? HP.p2 : HP.dim }}>{l.mode}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {unit.interlocks.length > 0 && (
                      <div className="rounded-lg p-3 space-y-1" style={panel}>
                        <span className={heading} style={{ color: HP.text }}>Interlocks</span>
                        {unit.interlocks.map(k => (
                          <div key={k} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 py-1 text-[11px] font-mono" style={{ borderBottom: `1px solid ${HP.rule}` }}>
                            <span className="font-bold" style={{ color: HP.text }}>{k.replace('I', 'I-')}</span>
                            <span style={{ color: HP.dim }}>{ILK_TEXT[k]}</span>
                            <span className="font-bold" style={{ color: interlockTripped[k as keyof typeof interlockTripped] ? HP.trip : HP.dim }}>
                              {interlockTripped[k as keyof typeof interlockTripped] ? 'ACTIVE' : 'CLEAR'}
                            </span>
                          </div>
                        ))}
                        {unit.interlocks.includes('I402') && renderI402Channels()}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* 4. CLEANROOM TOOL TAKE-OFFS (POINT-OF-USE WAFER TOOLBAYS) (TAB 2) */}
      {scadaTab === 'POU_TOOLS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Semiconductor Wafer Cleanroom Tool Point-of-Use (POU) Headers
              </h3>
              <p className="text-xs text-slate-400">
                Active consumption manifolds feeding Immersion Litho scanners, automated wet clean benches, and CMP planarization tables.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                {getLiveStatus(EQUIPMENT_BY_TAG['XV-401']) === 'Isolated' ? 'ALL BAYS ISOLATED — XV-401 CLOSED' : `SUPPLY ${liveMetrics.supplyPressureBar} bar • ${liveMetrics.resistivity} MΩ·cm`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WAFER_TOOL_BAYS.map((bay) => {
              // Each bay's take-off sees the live header pressure less its own branch
              // losses; flow follows √ΔP. XV-401 closed isolates every bay.
              const supplied = getLiveStatus(EQUIPMENT_BY_TAG['XV-401']) !== 'Isolated';
              const pressure = supplied ? Math.max(0, +(liveMetrics.supplyPressureBar - (4.85 - bay.pressureBar)).toFixed(2)) : 0;
              const flow = supplied ? +(bay.flowRateLpm * Math.sqrt(Math.max(0, pressure) / bay.pressureBar)).toFixed(1) : 0;
              const valveStatus = supplied ? bay.valveStatus : 'ISOLATED';
              return (
              <div key={bay.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">{bay.bayName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${valveStatus === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : valveStatus === 'ISOLATED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {valveStatus}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{bay.toolType}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{bay.subSystem}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 block">Required Resistivity:</span>
                    <span className="text-cyan-300 font-bold">{bay.requiredResistivity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Delivery Flow Rate:</span>
                    <span className="text-slate-200 font-bold">{flow} L/min</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Supply Pressure:</span>
                    <span className="text-slate-200 font-bold">{pressure} bar</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">POU Filter ΔP (0.02µm):</span>
                    <span className="text-emerald-400 font-bold">{bay.pouFilterDpBar} bar (Clean)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Thermal Budget:</span>
                    <span className="text-slate-200">{bay.tempTolerance}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>CLEANROOM: {bay.cleanroomClass}</span>
                  <span>FED FROM TOOL-BAY HEADER VIA XV-401</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MULTI-PEN HISTORIAN STRIP CHART (TAB 3) */}
      {scadaTab === 'TRENDS' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  High-Speed Multi-Pen SCADA Historian Strip Chart
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time synchronized telemetry strip recorder with active Pen Groups & fab dynamic perturbations.
                </p>
              </div>

              {/* Group Selectors & Disturbance Trigger */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => setHistorianPenGroup('PURITY')}
                    className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                      historianPenGroup === 'PURITY'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💧 Purity Group
                  </button>
                  <button
                    onClick={() => setHistorianPenGroup('HYDRAULICS')}
                    className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                      historianPenGroup === 'HYDRAULICS'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Fab Hydraulics
                  </button>
                  <button
                    onClick={() => setHistorianPenGroup('THERMAL')}
                    className={`px-3 py-1.5 rounded-md transition-all font-semibold ${
                      historianPenGroup === 'THERMAL'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🌡️ Thermal & Velocity
                  </button>
                </div>

                <button
                  onClick={() => setFabTransientCountdown(10)}
                  disabled={fabTransientCountdown > 0}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                    fabTransientCountdown > 0
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 animate-pulse cursor-not-allowed'
                      : 'bg-indigo-950/80 border-indigo-700/60 hover:bg-indigo-900 text-indigo-300 hover:text-white'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {fabTransientCountdown > 0 ? `Transients Active (${fabTransientCountdown}s)` : '⚡ Simulate Wafer Rinse Surge'}
                </button>

                <span className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                  BUFFER: 30 SAMPLES (2s SCAN)
                </span>
              </div>
            </div>

            {/* Transient Alert Banner */}
            {fabTransientCountdown > 0 && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-between text-xs text-amber-200 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>
                    <strong>SIMULATED FAB RINSE SURGE ACTIVE:</strong> Tool Bay #3 CMP & Wet Bench wash valve opened (+42 m³/h consumption). UPW loop flow surging, pressure dipping, control loop recovering...
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400">T-{fabTransientCountdown}s</span>
              </div>
            )}

            {/* Historian Strip Chart */}
            <div className="h-84 w-full">
              <ResponsiveContainer width="100%" height={320}>
                {historianPenGroup === 'PURITY' ? (
                  <LineChart data={historianData} margin={{ top: 12, right: 35, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis
                      yAxisId="resistivity"
                      domain={[18.00, 18.25]}
                      stroke="#22d3ee"
                      tick={{ fontSize: 10, fill: '#22d3ee' }}
                      orientation="left"
                      tickFormatter={(v: number) => `${v.toFixed(2)} MΩ`}
                    />
                    <YAxis
                      yAxisId="contaminants"
                      domain={[0.0, 2.0]}
                      stroke="#f43f5e"
                      tick={{ fontSize: 10, fill: '#f43f5e' }}
                      orientation="right"
                      tickFormatter={(v: number) => `${v.toFixed(1)} ppb`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine yAxisId="resistivity" y={18.20} stroke="#34d399" strokeDasharray="3 3" label={{ value: '18.20 MΩ Spec', fill: '#34d399', fontSize: 10, position: 'insideTopLeft' }} />
                    <ReferenceLine yAxisId="contaminants" y={1.00} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '1.0 ppb TOC Limit', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />

                    <Line
                      yAxisId="resistivity"
                      type="monotone"
                      dataKey="resistivity"
                      name="Resistivity (MΩ·cm)"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="contaminants"
                      type="monotone"
                      dataKey="toc"
                      name="TOC (ppb)"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="contaminants"
                      type="monotone"
                      dataKey="dissolvedOxygen"
                      name="Dissolved O₂ (ppb)"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="contaminants"
                      type="monotone"
                      dataKey="silica"
                      name="Reactive Silica (ppb)"
                      stroke="#fbbf24"
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : historianPenGroup === 'HYDRAULICS' ? (
                  <LineChart data={historianData} margin={{ top: 12, right: 35, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis
                      yAxisId="flow"
                      domain={[290, 420]}
                      stroke="#38bdf8"
                      tick={{ fontSize: 10, fill: '#38bdf8' }}
                      orientation="left"
                      tickFormatter={(v: number) => `${v} m³/h`}
                    />
                    <YAxis
                      yAxisId="pressure"
                      domain={[0, 9]}
                      stroke="#c084fc"
                      tick={{ fontSize: 10, fill: '#c084fc' }}
                      orientation="right"
                      tickFormatter={(v: number) => `${v.toFixed(1)} b`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine yAxisId="flow" y={340} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: '340 m³/h Base Header Flow', fill: '#38bdf8', fontSize: 10, position: 'insideTopLeft' }} />
                    <ReferenceLine yAxisId="pressure" y={6.5} stroke="#c084fc" strokeDasharray="3 3" label={{ value: '6.5 bar Supply Target', fill: '#c084fc', fontSize: 10, position: 'insideTopRight' }} />

                    <Line
                      yAxisId="flow"
                      type="monotone"
                      dataKey="loopFlow"
                      name="Recirculation Flow (m³/h)"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="pressure"
                      type="monotone"
                      dataKey="supplyPressure"
                      name="Supply Header Pressure (bar)"
                      stroke="#c084fc"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="pressure"
                      type="monotone"
                      dataKey="returnPressure"
                      name="Return Header Pressure (bar)"
                      stroke="#ec4899"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                ) : (
                  <LineChart data={historianData} margin={{ top: 12, right: 35, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeStr" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis
                      yAxisId="temp"
                      domain={[21.0, 25.0]}
                      stroke="#f59e0b"
                      tick={{ fontSize: 10, fill: '#f59e0b' }}
                      orientation="left"
                      tickFormatter={(v: number) => `${v.toFixed(1)}°C`}
                    />
                    <YAxis
                      yAxisId="velocity"
                      domain={[1.4, 3.2]}
                      stroke="#06b6d4"
                      tick={{ fontSize: 10, fill: '#06b6d4' }}
                      orientation="right"
                      tickFormatter={(v: number) => `${v.toFixed(2)} m/s`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <ReferenceLine yAxisId="temp" y={23.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '23.0°C Fab Spec', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
                    <ReferenceLine yAxisId="velocity" y={1.8} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '1.8 m/s Min Scrub Velocity', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />

                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="deliveryTemp"
                      name="Loop Delivery Temp (°C)"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="velocity"
                      type="monotone"
                      dataKey="velocity"
                      name="Pipe Scrubbing Velocity (m/s)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Live Synchronized KPI Strip Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800">
              {historianPenGroup === 'PURITY' && (
                <>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase block font-semibold">Resistivity (MΩ·cm)</span>
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {historianData[historianData.length - 1]?.resistivity?.toFixed(2) ?? '18.19'}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>SPEC: ≥ 18.20</span>
                      <span className="text-emerald-400">QUALIFIED</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-rose-400 font-mono uppercase block font-semibold">Total Organic Carbon</span>
                    <span className="text-xl font-bold font-mono text-rose-300">
                      {historianData[historianData.length - 1]?.toc?.toFixed(2) ?? '0.55'} <span className="text-xs font-normal text-slate-400">ppb</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>LIMIT: &lt; 1.0</span>
                      <span className="text-emerald-400">OPTIMAL</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-mono uppercase block font-semibold">Dissolved O₂</span>
                    <span className="text-xl font-bold font-mono text-emerald-300">
                      {historianData[historianData.length - 1]?.dissolvedOxygen?.toFixed(2) ?? '0.80'} <span className="text-xs font-normal text-slate-400">ppb</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>LIMIT: &lt; 2.0</span>
                      <span className="text-emerald-400">DEGAS OK</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-mono uppercase block font-semibold">Reactive Silica</span>
                    <span className="text-xl font-bold font-mono text-amber-300">
                      {historianData[historianData.length - 1]?.silica?.toFixed(2) ?? '0.18'} <span className="text-xs font-normal text-slate-400">ppb</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>LIMIT: &lt; 0.5</span>
                      <span className="text-emerald-400">SUB-PPB</span>
                    </div>
                  </div>
                </>
              )}

              {historianPenGroup === 'HYDRAULICS' && (
                <>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-sky-400 font-mono uppercase block font-semibold">Recirculation Loop Flow</span>
                    <span className="text-xl font-bold font-mono text-sky-300">
                      {historianData[historianData.length - 1]?.loopFlow ?? '342'} <span className="text-xs font-normal text-slate-400">m³/h</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>DESIGN: 340 m³/h</span>
                      <span className="text-sky-400 font-semibold">BALANCED</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-purple-400 font-mono uppercase block font-semibold">Supply Header Pressure</span>
                    <span className="text-xl font-bold font-mono text-purple-300">
                      {historianData[historianData.length - 1]?.supplyPressure?.toFixed(2) ?? '6.60'} <span className="text-xs font-normal text-slate-400">bar</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>PIC-401 SP: 6.50</span>
                      <span className="text-emerald-400">STABLE</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-pink-400 font-mono uppercase block font-semibold">Return Header Pressure</span>
                    <span className="text-xl font-bold font-mono text-pink-300">
                      {historianData[historianData.length - 1]?.returnPressure?.toFixed(2) ?? '2.20'} <span className="text-xs font-normal text-slate-400">bar</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>PCV-403: BACKPRESS</span>
                      <span className="text-emerald-400">NORMAL</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Loop Net DP</span>
                    <span className="text-xl font-bold font-mono text-slate-200">
                      {(
                        (historianData[historianData.length - 1]?.supplyPressure ?? 6.6) -
                        (historianData[historianData.length - 1]?.returnPressure ?? 2.2)
                      ).toFixed(2)}{' '}
                      <span className="text-xs font-normal text-slate-400">bar</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>FAB TOOL DROPS</span>
                      <span className="text-emerald-400">IN RANGE</span>
                    </div>
                  </div>
                </>
              )}

              {historianPenGroup === 'THERMAL' && (
                <>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-amber-400 font-mono uppercase block font-semibold">Delivery Temperature</span>
                    <span className="text-xl font-bold font-mono text-amber-300">
                      {historianData[historianData.length - 1]?.deliveryTemp?.toFixed(2) ?? '23.01'} <span className="text-xs font-normal text-slate-400">°C</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>TIC-402 SP: 23.0°C</span>
                      <span className="text-emerald-400">± 0.1°C SPEC</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-cyan-400 font-mono uppercase block font-semibold">Recirc Scrub Velocity</span>
                    <span className="text-xl font-bold font-mono text-cyan-300">
                      {historianData[historianData.length - 1]?.velocity?.toFixed(2) ?? '2.18'} <span className="text-xs font-normal text-slate-400">m/s</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>MIN LIMIT: 1.8 m/s</span>
                      <span className="text-emerald-400">TURBULENT (NO BIOFILM)</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">PHE-402 Cooling Trim</span>
                    <span className="text-xl font-bold font-mono text-slate-200">
                      TCV-402 <span className="text-xs font-normal text-emerald-400">MODULATING</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>CHW SUPPLY: 7.0°C</span>
                      <span className="text-emerald-400">ACTIVE</span>
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Loop Thermal Stability</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      99.8% <span className="text-xs font-normal text-slate-400">IN BAND</span>
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                      <span>SEMICONDUCTOR GRADE</span>
                      <span className="text-emerald-400">LOCKED</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. INSTRUMENT TAG BROWSER (TAB 4) */}
      {scadaTab === 'TAGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-cyan-400" />
                Live SCADA Process Instrument Tag Browser
              </h3>
              <p className="text-xs text-slate-400">
                Direct OPC-UA tag telemetry with 4-tier alarm thresholds (Low-Low, Low, High, High-High).
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {scadaTags.length} ONLINE TAGS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Instrument Tag</th>
                  <th className="pb-3 font-semibold">Description</th>
                  <th className="pb-3 font-semibold">Stage</th>
                  <th className="pb-3 font-semibold">Current Value</th>
                  <th className="pb-3 font-semibold">Nominal / Limit</th>
                  <th className="pb-3 font-semibold">PLC Address</th>
                  <th className="pb-3 font-semibold text-right">Alarm State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scadaTags.map((tag) => (
                  <tr key={tag.tag} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 text-cyan-300 font-bold">{tag.tag}</td>
                    <td className="py-2.5 font-sans text-slate-200">{tag.description}</td>
                    <td className="py-2.5 text-slate-400">{tag.stage}</td>
                    <td className="py-2.5 text-white font-bold">
                      {tag.value} {tag.unit}
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {tag.nominal} {tag.unit}
                    </td>
                    <td className="py-2.5 text-slate-500">{tag.plcSource}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          tag.status === 'NORM'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : tag.status.includes('HIGH') || tag.status.includes('LOW_LOW')
                            ? 'bg-red-500/20 text-red-400 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {tag.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. SEQUENCE OF EVENTS (SOE) OPERATOR AUDIT LOG (TAB 5) */}
      {scadaTab === 'SOE_LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Millisecond Sequence of Events (SOE) Audit Trail
              </h3>
              <p className="text-xs text-slate-400">
                High-resolution chronological record of trips, operator setpoint changes, interlock operations, and OPC-UA events.
              </p>
            </div>
            <button
              onClick={exportSoeLogCsv}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              EXPORT CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-3 font-semibold">SOE Event ID</th>
                  <th className="pb-3 font-semibold">Timestamp (GPS-Synced)</th>
                  <th className="pb-3 font-semibold">Class</th>
                  <th className="pb-3 font-semibold">Tag Source</th>
                  <th className="pb-3 font-semibold">Event Description</th>
                  <th className="pb-3 font-semibold text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {soeEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 text-cyan-300 font-bold">{evt.id}</td>
                    <td className="py-2.5 text-slate-300">{evt.timestamp}</td>
                    <td className="py-2.5 text-slate-400">{evt.type}</td>
                    <td className="py-2.5 text-white font-bold">{evt.tag}</td>
                    <td className="py-2.5 font-sans text-slate-200">{evt.description}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          evt.severity === 'INFO'
                            ? 'bg-slate-800 text-slate-300'
                            : evt.severity === 'WARN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400 font-black animate-pulse'
                        }`}
                      >
                        {evt.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. SAFETY INTERLOCKS & PERMISSIVE MATRIX (TAB 6) */}
      {scadaTab === 'ALARMS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                ISA-18.2 Alarm Summary
              </h3>
              <p className="text-xs text-slate-400">
                P1 = LOW-LOW / HIGH-HIGH, P2 = LOW / HIGH. An alarm that clears before it is acknowledged stays listed as RTN UNACK until an operator acknowledges it.
              </p>
            </div>
            <button
              onClick={acknowledgeAllAlarms}
              disabled={unackedAlarmCount === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 text-cyan-400" />
              ACK ALL ({unackedAlarmCount})
            </button>
          </div>

          {alarmRecords.length === 0 ? (
            <div className="py-10 text-center text-sm font-mono text-emerald-400">NO STANDING ALARMS — ALL PROCESS VARIABLES WITHIN LIMITS</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-3">Pri</th>
                    <th className="py-2 pr-3">Time In</th>
                    <th className="py-2 pr-3">Tag</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Condition</th>
                    <th className="py-2 pr-3 text-right">Value</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {alarmRecords.map(a => (
                    <tr key={a.tag} className={a.state === 'UNACK' ? 'text-red-200 animate-pulse' : a.state === 'RTN_UNACK' ? 'text-slate-400' : 'text-amber-200'}>
                      <td className="py-2.5 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.priority === 'P1' ? 'bg-red-500/30 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{a.priority}</span>
                      </td>
                      <td className="py-2.5 pr-3">{a.timeIn}</td>
                      <td className="py-2.5 pr-3 font-bold text-cyan-300">{a.tag}</td>
                      <td className="py-2.5 pr-3">{a.description}</td>
                      <td className="py-2.5 pr-3 font-bold">{a.condition.replace('_', '-')}</td>
                      <td className="py-2.5 pr-3 text-right">{a.value} {a.unit}</td>
                      <td className="py-2.5 pr-3">{a.state === 'RTN_UNACK' ? 'RTN UNACK' : a.state}</td>
                      <td className="py-2.5">
                        {a.state !== 'ACK' && (
                          <button onClick={() => acknowledgeAlarm(a.tag)} className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-bold">
                            ACK
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {scadaTab === 'LOOPS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                Regulatory PID Control Loop Overview
              </h3>
              <p className="text-xs text-slate-400">
                Live process variable, setpoint and controller output for every loop. A loop drops to IMAN when its final element is unavailable.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              {controlLoops.filter(l => l.mode === 'AUTO').length}/{controlLoops.length} IN AUTO
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-2 pr-3">Loop</th>
                  <th className="py-2 pr-3">Service</th>
                  <th className="py-2 pr-3 text-right">PV</th>
                  <th className="py-2 pr-3 text-right">SP</th>
                  <th className="py-2 pr-3">Deviation</th>
                  <th className="py-2 pr-3">Output</th>
                  <th className="py-2 pr-3">Final Element</th>
                  <th className="py-2">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {controlLoops.map(l => {
                  const deviationPct = l.sp !== 0 ? ((l.pv - l.sp) / Math.abs(l.sp)) * 100 : 0;
                  const deviationBad = Math.abs(deviationPct) > 10;
                  return (
                    <tr key={l.tag} className="text-slate-300">
                      <td className="py-2.5 pr-3 font-bold text-cyan-300">{l.tag}</td>
                      <td className="py-2.5 pr-3 text-slate-400">{l.description}</td>
                      <td className={`py-2.5 pr-3 text-right font-bold ${deviationBad ? 'text-red-400' : 'text-slate-100'}`}>{l.pv} {l.unit}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-400">{l.sp} {l.unit}</td>
                      <td className="py-2.5 pr-3">
                        <div className="relative w-24 h-1.5 bg-slate-800 rounded">
                          <div className="absolute top-0 bottom-0 w-px bg-slate-500" style={{ left: '50%' }} />
                          <div
                            className={`absolute top-0 bottom-0 rounded ${deviationBad ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{
                              left: deviationPct < 0 ? `${50 + Math.max(-50, deviationPct)}%` : '50%',
                              width: `${Math.min(50, Math.abs(deviationPct))}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-800 rounded overflow-hidden">
                            <div className="h-full bg-cyan-500" style={{ width: `${Math.round(l.output)}%` }} />
                          </div>
                          <span className="text-slate-300">{Math.round(l.output)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-400">{l.finalElement}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.mode === 'AUTO' ? 'bg-emerald-500/20 text-emerald-400' : l.mode === 'MAN' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400 animate-pulse'
                        }`}>
                          {l.mode}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {scadaTab === 'INTERLOCKS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                SIS / ESD SIL-2 Process Interlock & Permissive Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Autonomous fail-safe logic safeguarding cleanroom wafer production tools from contaminated UPW delivery.
              </p>
            </div>
            <span className={`text-xs font-mono px-2.5 py-1 rounded border ${anyInterlockTripped ? 'text-red-300 bg-red-950/60 border-red-700/60 animate-pulse' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'}`}>
              {anyInterlockTripped ? 'TRIP LOGIC ACTIVE' : 'ALL TRIP LOGIC HEALTHY'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">INTERLOCK I-101</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${interlockTripped.I101 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {interlockTripped.I101 ? 'TRIPPED' : 'CLEAR'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Low Suction Pressure Pump Cavitation Cut-Out</h4>
              <p className="text-xs text-slate-400">
                If booster pump inlet suction pressure drops below 1.2 bar for &gt; 1.5s, trips P-101 to protect mechanical seals.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                SENSOR: PT-101 (Current: {liveMetrics.suctionPressure} bar, T-100 at {Math.round(tankLevels['T-100'])}%) • THRESHOLD: &lt; 1.2 bar
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">INTERLOCK I-301</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${interlockTripped.I301 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {interlockTripped.I301 ? 'TRIPPED' : 'CLEAR'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Make-Up Tank Low-Low Level Dry-Run Protection</h4>
              <p className="text-xs text-slate-400">
                If T-205 falls below 10%, trips polishing feed pumps P-301A/B to prevent dry running of their magnetic couplings. Restart is refused until the tank recovers.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                SENSOR: LT-205 (Current: {tankLevels['T-205'].toFixed(1)}%) • TRIP LIMIT: &lt; 10%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">INTERLOCK I-401</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${interlockTripped.I401 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {interlockTripped.I401 ? 'ACTIVE' : 'CLEAR'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">N+1 Recirculation Pump Automatic Bump-Less Failover</h4>
              <p className="text-xs text-slate-400">
                Upon motor fault, VFD trip, or flow &lt; 200 m³/h on Lead Pump DST-P-401A, automatically starts Standby DST-P-401B within 1.2s.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                FAILOVER TIME: 1.2s • STANDBY STATUS: {standbyPumpRunning ? 'RUNNING' : 'READY'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">INTERLOCK I-402</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${interlockTripped.I402 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {interlockTripped.I402 ? 'TRIPPED' : 'CLEAR'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">Wafer Tool Supply Emergency Isolation (Resistivity Slip)</h4>
              <p className="text-xs text-slate-400">
                If two of three supply-header resistivity cells read below 17.50 MΩ·cm, closes cleanroom supply isolation valve XV-401 to prevent wafer contamination.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                SENSORS: AIT-401A/C/D (2oo3) • TRIP LIMIT: &lt; 17.50 MΩ • ALL CHANNELS BYPASSED → FAIL-SAFE TRIP
              </div>
              {renderI402Channels()}
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-400">INTERLOCK I-403</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${interlockTripped.I403 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {interlockTripped.I403 ? 'TRIPPED' : 'CLEAR'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">High TOC Photolysis Protection Interlock</h4>
              <p className="text-xs text-slate-400">
                If TOC exceeds 2.0 ppb, engages auxiliary UV reactor bank and triggers high-speed reclaim diversion to protect CMP polishing heads.
              </p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                SENSOR: AIT-302 (Current: {liveMetrics.toc} ppb) • TRIP LIMIT: &gt; 2.0 ppb
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. DETAILED STAGE OPERATIONS VIEW (TAB 7) */}
      {scadaTab === 'STAGES' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-2">
              <div>
                <span className="text-xs font-mono font-bold uppercase text-cyan-400">
                  Chemical & Unit Operations Breakdown
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{currentStage.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {UPW_STAGES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStageId(s.id)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                      s.id === selectedStageId
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Stage {s.id}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {currentStage.scientificSummary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {currentStage.equipmentList.map((eq) => (
                <div
                  key={eq.tag}
                  onClick={() => setFaceplateEquipment(eq)}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {eq.tag}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getLiveStatus(eq) === 'Running' ? 'bg-emerald-500/20 text-emerald-400' : getLiveStatus(eq) === 'Tripped' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                        {getLiveStatus(eq)}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{eq.name}</h4>
                    <p className="text-xs text-cyan-400 font-mono mb-2">{eq.type}</p>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{eq.details}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex justify-between items-center">
                    <span>{eq.specs}</span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      OPERATE <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. AUTHENTIC SCADA OPERATOR FACEPLATE WITH VFD & PID TUNING */}
      {faceplateEquipment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Faceplate Top Bar */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
                  {faceplateEquipment.tag}
                </span>
                <span className="text-sm font-bold text-white">{faceplateEquipment.name}</span>
              </div>
              <button
                onClick={() => setFaceplateEquipment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Faceplate Content */}
            <div className="p-6 space-y-5 text-xs font-mono">
              {/* Status & Control Mode Selector */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Operating Status:</span>
                  <span className={`text-sm font-bold flex items-center gap-1.5 mt-0.5 ${getLiveStatus(faceplateEquipment) === 'Running' ? 'text-emerald-400' : getLiveStatus(faceplateEquipment) === 'Tripped' ? 'text-red-400' : 'text-slate-300'}`}>
                    <span className={`w-2 h-2 rounded-full ${getLiveStatus(faceplateEquipment) === 'Running' ? 'bg-emerald-400 animate-ping' : getLiveStatus(faceplateEquipment) === 'Tripped' ? 'bg-red-400 animate-pulse' : 'bg-slate-500'}`} />
                    {getLiveStatus(faceplateEquipment)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Control Mode:</span>
                  <span className="text-sm font-bold text-cyan-300 mt-0.5 block">
                    {getLiveControlMode(faceplateEquipment)}
                  </span>
                </div>
              </div>

              {/* VFD Speed Frequency Controller (if applicable) */}
              {faceplateEquipment.hasVfd && !faceplateEquipment.tag.startsWith('DST-P-401') && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    VFD Speed (Local Drive):
                  </span>
                  <span className="text-cyan-300 font-bold text-sm">
                    {getLiveStatus(faceplateEquipment) === 'Running' ? `${faceplateEquipment.vfdSpeedHz?.toFixed(1)} Hz` : '0.0 Hz'}
                  </span>
                </div>
              )}

              {faceplateEquipment.tag.startsWith('DST-P-401') && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                      VFD Speed Reference {getLiveControlMode(faceplateEquipment) === 'AUTO' ? '(PIC-402 in control)' : '(Manual)'}:
                    </span>
                    <span className="text-cyan-300 font-bold text-sm">{vfdSpeedHz.toFixed(1)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="30.0"
                    max="60.0"
                    step="0.5"
                    value={vfdSpeedHz}
                    disabled={getLiveControlMode(faceplateEquipment) === 'AUTO'}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVfdSpeedHz(val);
                      logSoeEvent('COMMAND', faceplateEquipment.tag, `VFD Speed reference adjusted to ${val} Hz.`, 'INFO');
                    }}
                    className="w-full accent-cyan-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  {getLiveControlMode(faceplateEquipment) === 'AUTO' && (
                    <p className="text-[10px] text-slate-500">Switch to MANUAL to set speed directly — in AUTO, PIC-402 trims speed to hold 4.85 bar supply.</p>
                  )}
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>30.0 Hz (Min)</span>
                    <span>50.0 Hz (Rated)</span>
                    <span>60.0 Hz (Max Overdrive)</span>
                  </div>
                </div>
              )}

              {/* PID Temperature Controller (if applicable) */}
              {faceplateEquipment.hasPid && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                      Sanitary Plate Exchanger PID Setpoint:
                    </span>
                    <span className="text-cyan-300 font-bold text-sm">{tempSetpoint.toFixed(1)} °C</span>
                  </div>
                  <input
                    type="range"
                    min="21.0"
                    max="25.0"
                    step="0.1"
                    value={tempSetpoint}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTempSetpoint(val);
                      logSoeEvent('COMMAND', faceplateEquipment.tag, `Exchanger temp setpoint adjusted to ${val.toFixed(1)} °C.`, 'INFO');
                    }}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>21.0 °C</span>
                    <span>23.0 °C (Cleanroom Standard)</span>
                    <span>25.0 °C</span>
                  </div>
                </div>
              )}

              {/* Operating Commands */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  SCADA Operator Commands:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => dispatchCommand(faceplateEquipment, 'START')}
                    disabled={getLiveStatus(faceplateEquipment) === 'Running'}
                    className="py-2.5 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600/30"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {faceplateEquipment.type.toLowerCase().includes('valve') ? 'OPEN' : 'START'}
                  </button>
                  <button
                    onClick={() => dispatchCommand(faceplateEquipment, 'STOP')}
                    disabled={getLiveStatus(faceplateEquipment) !== 'Running'}
                    className="py-2.5 px-3 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/30"
                  >
                    <Square className="w-3.5 h-3.5" />
                    {faceplateEquipment.type.toLowerCase().includes('valve') ? 'CLOSE' : 'STOP'}
                  </button>
                  <button
                    onClick={() => dispatchCommand(faceplateEquipment, 'MANUAL')}
                    className="py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {getLiveControlMode(faceplateEquipment) === 'MANUAL' ? 'GO AUTO' : 'MANUAL'}
                  </button>
                </div>
              </div>

              {/* Consumable wear & maintenance procedure */}
              {MAINTENANCE[faceplateEquipment.tag] && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      Consumable / Maintenance:
                    </span>
                    <span className="text-amber-300 text-[11px]">{MAINTENANCE[faceplateEquipment.tag].wear()}</span>
                  </div>
                  <button
                    onClick={() => performMaintenance(faceplateEquipment)}
                    disabled={MAINTENANCE[faceplateEquipment.tag].blockedReason() !== null}
                    className="w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 text-amber-300 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {MAINTENANCE[faceplateEquipment.tag].label}
                  </button>
                  {MAINTENANCE[faceplateEquipment.tag].blockedReason() && (
                    <p className="text-[10px] text-slate-500">{MAINTENANCE[faceplateEquipment.tag].blockedReason()}</p>
                  )}
                </div>
              )}

              {/* Interlocks & Permissives Checklist */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Permissives & Safety Interlocks:
                </span>
                {!faceplateEquipment.interlocksHealthy && (
                  <div className="p-2 rounded bg-red-950/60 border border-red-700/60 text-red-300 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    INTERLOCK CHAIN UNHEALTHY — START INHIBITED
                  </div>
                )}
                <div className="space-y-1.5">
                  {faceplateEquipment.permissives.map((perm, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      {faceplateEquipment.interlocksHealthy ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineering Specs */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Design Spec:</span>
                  <span className="text-slate-200 font-bold">{faceplateEquipment.specs}</span>
                </div>
                {faceplateEquipment.runHours && (
                  <div className="flex justify-between">
                    <span>Run Hours:</span>
                    <span className="text-slate-200 font-bold">{faceplateEquipment.runHours} hrs</span>
                  </div>
                )}
              </div>
            </div>

            {/* Faceplate Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-500">PLC ADDR: PLC-0{faceplateEquipment.stageId}.SKID</span>
              <button
                onClick={() => setFaceplateEquipment(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
              >
                Close Faceplate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
