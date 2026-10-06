import React, { useState, useEffect, useRef } from 'react';
import { 
  SlidersHorizontal, 
  Zap, 
  Flame, 
  Wind, 
  Cpu, 
  RotateCcw, 
  AlertTriangle,
  CheckCircle2, 
  Sparkles,
  Info,
  BookOpen,
  Droplets,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Layers,
  Activity,
  Gauge,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export interface SimVariable {
  id: string;
  assetId: string;
  nodeName: string;
  variableName: string;
  unit: string;
  normalVal: number;
  alarmVal: number;
  currentVal: number;
  min: number;
  max: number;
  step: number;
  alarmCondition: '>' | '<' | '<=';
  alarmThreshold: number;
  normalDesc: string;
  alarmDesc: string;
}

export const INITIAL_VARIABLES: Record<string, SimVariable> = {
  // --- ELECTRICAL & CHILLER CASCADE ---
  // Card 1: Process Electrical
  'MCC-01': {
    id: 'MCC-01',
    assetId: 'MCC-01',
    nodeName: 'Motor Control Center 01 (Root)',
    variableName: 'leakage_current',
    unit: 'A',
    normalVal: 0.02,
    alarmVal: 5.8,
    currentVal: 0.02,
    min: 0.0,
    max: 10.0,
    step: 0.01,
    alarmCondition: '>',
    alarmThreshold: 5.0,
    normalDesc: '0.02 A (< 0.1 A)',
    alarmDesc: '> 5.0 A (Ground Fault Trip @ 10:00:00)',
  },

  // Card 2: Chiller
  'CHW-P-05': {
    id: 'CHW-P-05',
    assetId: 'CHW-P-05',
    nodeName: 'Chilled Water Pump 05',
    variableName: 'supply_voltage',
    unit: 'V',
    normalVal: 415,
    alarmVal: 0,
    currentVal: 415,
    min: 0,
    max: 480,
    step: 1,
    alarmCondition: '<=',
    alarmThreshold: 0,
    normalDesc: '415 V',
    alarmDesc: '0 V (Undervoltage Cutoff @ 10:00:02)',
  },
  'CHW-HDR-01': {
    id: 'CHW-HDR-01',
    assetId: 'CHW-HDR-01',
    nodeName: 'Main Distribution Header',
    variableName: 'header_pressure',
    unit: 'bar',
    normalVal: 4.5,
    alarmVal: 1.8,
    currentVal: 4.5,
    min: 0.0,
    max: 8.0,
    step: 0.1,
    alarmCondition: '<',
    alarmThreshold: 2.5,
    normalDesc: '4.5 bar',
    alarmDesc: '< 2.5 bar (Collapses to 1.8 bar @ 10:00:10)',
  },
  'CHW-HX-01': {
    id: 'CHW-HX-01',
    assetId: 'CHW-HX-01',
    nodeName: 'Process Heat Exchanger 01',
    variableName: 'pcw_supply_temp',
    unit: '°C',
    normalVal: 18.0,
    alarmVal: 24.5,
    currentVal: 18.0,
    min: 10.0,
    max: 32.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 21.0,
    normalDesc: '18.0 °C',
    alarmDesc: '> 21.0 °C (Warms to 24.5°C @ 10:00:25)',
  },

  // Card 3: HVAC
  'CHW-AHU-01': {
    id: 'CHW-AHU-01',
    assetId: 'CHW-AHU-01',
    nodeName: 'Cleanroom AHU Cooling A',
    variableName: 'supply_air_temp',
    unit: '°C',
    normalVal: 20.2,
    alarmVal: 23.8,
    currentVal: 20.2,
    min: 15.0,
    max: 30.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 22.0,
    normalDesc: '20.2 °C',
    alarmDesc: '> 22.0 °C (Excursions to 23.8°C @ 10:00:40)',
  },

  // Card 4: Process Tools
  'TOOL-LITHO-01': {
    id: 'TOOL-LITHO-01',
    assetId: 'TOOL-LITHO-01',
    nodeName: 'Photolithography Scanner',
    variableName: 'laser_cavity_temp',
    unit: '°C',
    normalVal: 21.0,
    alarmVal: 22.2,
    currentVal: 21.0,
    min: 18.0,
    max: 26.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 21.5,
    normalDesc: '21.0 °C',
    alarmDesc: '> 21.5 °C (Optical drift trip @ 10:00:50)',
  },
  'TOOL-CMP-01': {
    id: 'TOOL-CMP-01',
    assetId: 'TOOL-CMP-01',
    nodeName: 'CMP Polishing Tool 01',
    variableName: 'platen_cooling_flow',
    unit: 'LPM',
    normalVal: 45.0,
    alarmVal: 12.0,
    currentVal: 45.0,
    min: 0.0,
    max: 60.0,
    step: 0.5,
    alarmCondition: '<',
    alarmThreshold: 25.0,
    normalDesc: '45.0 LPM',
    alarmDesc: '< 25.0 LPM (Drops to 12.0 LPM @ 10:00:55)',
  },
  'TOOL-CMP-02': {
    id: 'TOOL-CMP-02',
    assetId: 'TOOL-CMP-02',
    nodeName: 'CMP Polishing Tool 02',
    variableName: 'carrier_head_temp',
    unit: '°C',
    normalVal: 22.0,
    alarmVal: 27.5,
    currentVal: 22.0,
    min: 16.0,
    max: 35.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 25.0,
    normalDesc: '22.0 °C',
    alarmDesc: '> 25.0 °C (Rises to 27.5°C @ 10:00:58)',
  },

  // --- UPW REVERSE OSMOSIS & PRE-TREATMENT DRIFT SIMULATION ---
  // RO Train 01 (Primary Monitored Unit)
  'UPW-RO-01-COND': {
    id: 'UPW-RO-01-COND',
    assetId: 'UPW-RO-01',
    nodeName: 'RO Separation Skid 01',
    variableName: 'permeate_conductivity',
    unit: 'µS/cm',
    normalVal: 0.03,
    alarmVal: 0.09,
    currentVal: 0.03,
    min: 0.01,
    max: 0.20,
    step: 0.005,
    alarmCondition: '>',
    alarmThreshold: 0.06,
    normalDesc: '0.03 µS/cm (< 0.06 µS/cm)',
    alarmDesc: '> 0.06 µS/cm (Ionic salt passage alarm)',
  },
  'UPW-RO-01-DP': {
    id: 'UPW-RO-01-DP',
    assetId: 'UPW-RO-01',
    nodeName: 'RO Separation Skid 01',
    variableName: 'differential_pressure',
    unit: 'bar',
    normalVal: 1.4,
    alarmVal: 2.4,
    currentVal: 1.4,
    min: 0.5,
    max: 3.5,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 2.0,
    normalDesc: '1.4 bar (Clean mesh spacer flow)',
    alarmDesc: '> 2.0 bar (Physical membrane fouling / scaling)',
  },

  // RO Train 02 (Sister Benchmark Skid)
  'UPW-RO-02-COND': {
    id: 'UPW-RO-02-COND',
    assetId: 'UPW-RO-02',
    nodeName: 'RO Separation Skid 02',
    variableName: 'permeate_conductivity',
    unit: 'µS/cm',
    normalVal: 0.03,
    alarmVal: 0.08,
    currentVal: 0.03,
    min: 0.01,
    max: 0.20,
    step: 0.005,
    alarmCondition: '>',
    alarmThreshold: 0.06,
    normalDesc: '0.03 µS/cm (< 0.06 µS/cm)',
    alarmDesc: '> 0.06 µS/cm (Ionic salt passage alarm)',
  },
  'UPW-RO-02-DP': {
    id: 'UPW-RO-02-DP',
    assetId: 'UPW-RO-02',
    nodeName: 'RO Separation Skid 02',
    variableName: 'differential_pressure',
    unit: 'bar',
    normalVal: 1.4,
    alarmVal: 2.3,
    currentVal: 1.4,
    min: 0.5,
    max: 3.5,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 2.0,
    normalDesc: '1.4 bar (Clean mesh spacer flow)',
    alarmDesc: '> 2.0 bar (Physical membrane fouling / scaling)',
  },

  // Upstream Buffer Tank 1011 (Train A / Duty)
  'T-1011-COND': {
    id: 'T-1011-COND',
    assetId: 'T-1011',
    nodeName: 'Pre-Treated Storage Tank 1011',
    variableName: 'water_conductivity',
    unit: 'µS/cm',
    normalVal: 1.2,
    alarmVal: 5.5,
    currentVal: 1.2,
    min: 0.5,
    max: 12.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 4.0,
    normalDesc: '1.2 µS/cm (Decationized nominal)',
    alarmDesc: '> 4.0 µS/cm (Cation resin mineral exhaustion)',
  },
  'T-1011-PH': {
    id: 'T-1011-PH',
    assetId: 'T-1011',
    nodeName: 'Pre-Treated Storage Tank 1011',
    variableName: 'effluent_ph',
    unit: 'pH',
    normalVal: 6.8,
    alarmVal: 4.8,
    currentVal: 6.8,
    min: 3.0,
    max: 10.0,
    step: 0.1,
    alarmCondition: '<',
    alarmThreshold: 5.8,
    normalDesc: '6.8 pH (Neutral stabilized buffer)',
    alarmDesc: '< 5.8 pH (Acid dosing regeneration slip)',
  },

  // Upstream Buffer Tank 1012 (Train B / Standby)
  'T-1012-COND': {
    id: 'T-1012-COND',
    assetId: 'T-1012',
    nodeName: 'Pre-Treated Storage Tank 1012',
    variableName: 'water_conductivity',
    unit: 'µS/cm',
    normalVal: 1.2,
    alarmVal: 7.8,
    currentVal: 1.2,
    min: 0.5,
    max: 12.0,
    step: 0.1,
    alarmCondition: '>',
    alarmThreshold: 4.0,
    normalDesc: '1.2 µS/cm (Decationized nominal)',
    alarmDesc: '> 4.0 µS/cm (Cation resin mineral exhaustion)',
  },
  'T-1012-PH': {
    id: 'T-1012-PH',
    assetId: 'T-1012',
    nodeName: 'Pre-Treated Storage Tank 1012',
    variableName: 'effluent_ph',
    unit: 'pH',
    normalVal: 6.8,
    alarmVal: 4.8,
    currentVal: 6.8,
    min: 3.0,
    max: 10.0,
    step: 0.1,
    alarmCondition: '<',
    alarmThreshold: 5.8,
    normalDesc: '6.8 pH (Neutral stabilized buffer)',
    alarmDesc: '< 5.8 pH (Acid dosing regeneration slip)',
  },
};

export interface EventSimulatorProps {
  onSimulateEvent?: (eventName: string) => void;
  isRunning?: boolean;
  variables?: Record<string, SimVariable>;
  onVariablesChange?: React.Dispatch<React.SetStateAction<Record<string, SimVariable>>>;
}

export const EventSimulator: React.FC<EventSimulatorProps> = ({ 
  onSimulateEvent, 
  isRunning,
  variables: externalVars,
  onVariablesChange: externalSetVars,
}) => {
  const [internalVars, setInternalVars] = useState<Record<string, SimVariable>>(INITIAL_VARIABLES);
  const vars = externalVars ?? internalVars;
  const setVars = externalSetVars ?? setInternalVars;
  const [activeTab, setActiveTab] = useState<'hvac_chiller' | 'upw_drift'>('hvac_chiller');
  const [showHandbook, setShowHandbook] = useState<boolean>(false);
  const [selectedScenario, setSelectedScenario] = useState<number>(1);
  const [activeDriftCase, setActiveDriftCase] = useState<number | null>(null);
  const triggeredCasesRef = useRef<Set<number>>(new Set());

  // Live telemetry rolling buffer (last 24 points per parameter, 1.2s cadence)
  const [telemetryHistory, setTelemetryHistory] = useState<Record<string, number[]>>(() => {
    const initialHist: Record<string, number[]> = {};
    const upwKeys = [
      'UPW-RO-01-COND', 'UPW-RO-01-DP',
      'UPW-RO-02-COND', 'UPW-RO-02-DP',
      'T-1012-COND', 'T-1012-PH',
      'T-1011-COND', 'T-1011-PH'
    ];
    upwKeys.forEach(k => {
      const base = INITIAL_VARIABLES[k]?.currentVal ?? 0.03;
      initialHist[k] = Array.from({ length: 24 }, () => base);
    });
    return initialHist;
  });

  // Progressive live drift engine (kicked off by the 3 buttons)
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. If a drift case is active, progressively nudge target values with realistic engineering sequencing & lag
      if (activeDriftCase === 1) {
        // Case 1: Solely RO-01 Conductivity creeps upward from 0.03 -> 0.095
        // Slower increment (+0.0012/tick) to keep yellow SPC warning active for ~20-25 seconds!
        setVars(prev => {
          const current = prev['UPW-RO-01-COND']?.currentVal ?? 0.03;
          const currentDp = prev['UPW-RO-01-DP']?.currentVal ?? 1.4;
          const nextVal = current < 0.095 ? Math.min(0.095, Number((current + 0.0012).toFixed(3))) : current;

          // Dispatch exactly 1 message to the chat once yellow drift warning occurs on Permeate Conductivity (>= 0.033) or Differential Pressure (>= 1.45)
          const isDriftWarning = nextVal >= 0.033 || currentDp >= 1.45 || nextVal >= 0.06;
          if (isDriftWarning && !triggeredCasesRef.current.has(1)) {
            triggeredCasesRef.current.add(1);
            if (onSimulateEvent) {
              setTimeout(() => {
                onSimulateEvent('Drift detected for UPW-RO-01');
              }, 4000);
            }
          }

          if (current < 0.095) {
            return {
              ...prev,
              'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: nextVal }
            };
          }
          return prev;
        });
      } else if (activeDriftCase === 2) {
        // Case 2: Realistic Hydraulic Sequence
        // Phase 1: Upstream Active Tank T-1012 slips first (Cation breakthrough)
        // Phase 2: Hydraulic transport delay through Pump Header S-111 -> RO-01 and RO-02 drift together
        // Phase 3: Slower rate allows yellow warning to stay visible for ~20 seconds
        setVars(prev => {
          const tCond = prev['T-1012-COND']?.currentVal ?? 1.2;
          const tPh = prev['T-1012-PH']?.currentVal ?? 6.8;
          const ro1Cond = prev['UPW-RO-01-COND']?.currentVal ?? 0.03;
          const ro2Cond = prev['UPW-RO-02-COND']?.currentVal ?? 0.03;
          const ro1Dp = prev['UPW-RO-01-DP']?.currentVal ?? 1.4;
          const ro2Dp = prev['UPW-RO-02-DP']?.currentVal ?? 1.4;

          const nextTCond = Math.min(7.8, Number((tCond + 0.14).toFixed(2)));
          const nextTPh = Math.max(4.8, Number((tPh - 0.04).toFixed(2)));

          // Engineering lag: RO skids only start drifting once T-1012 has entered early warning (tCond > 2.0 µS/cm)
          const isFeedContaminated = tCond >= 2.0;

          const nextRo1Cond = isFeedContaminated
            ? Math.min(0.092, Number((ro1Cond + 0.0012).toFixed(3)))
            : ro1Cond;
          const nextRo2Cond = isFeedContaminated
            ? Math.min(0.088, Number((ro2Cond + 0.0011).toFixed(3)))
            : ro2Cond;

          // Scaling/fouling (ΔP) lags behind permeate conductivity breakthrough
          const isPermeateWarning = ro1Cond >= 0.042;
          const nextRo1Dp = isPermeateWarning
            ? Math.min(2.4, Number((ro1Dp + 0.02).toFixed(2)))
            : ro1Dp;
          const nextRo2Dp = isPermeateWarning
            ? Math.min(2.3, Number((ro2Dp + 0.018).toFixed(2)))
            : ro2Dp;

          // Dispatch exactly 1 message to the chat with a 4-second delay once ANY RO-01 parameter actually begins drifting
          const isDriftWarning = nextRo1Cond >= 0.033 || nextRo1Dp >= 1.45;
          if (isDriftWarning && !triggeredCasesRef.current.has(2)) {
            triggeredCasesRef.current.add(2);
            if (onSimulateEvent) {
              setTimeout(() => {
                onSimulateEvent('Drift detected for UPW-RO-01 and UPW-RO-02 (Upstream T-1012 feed excursion)');
              }, 4000);
            }
          }

          return {
            ...prev,
            'T-1012-COND': { ...prev['T-1012-COND'], currentVal: nextTCond },
            'T-1012-PH': { ...prev['T-1012-PH'], currentVal: nextTPh },
            'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: nextRo1Cond },
            'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: nextRo2Cond },
            'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: nextRo1Dp },
            'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: nextRo2Dp },
          };
        });
      } else if (activeDriftCase === 3) {
        // Case 3: Realistic Intake MMF Collapse Sequence
        // Phase 1: Raw particulate breakthrough fills BOTH intake buffer tanks T-1011 & T-1012 first
        // Phase 2: Silt & colloidal suspended solids arrive at RO skids -> spacer fouling (ΔP) triggers first!
        // Phase 3: Salt rejection collapses as membranes become overwhelmed
        setVars(prev => {
          const t12Cond = prev['T-1012-COND']?.currentVal ?? 1.2;
          const t12Ph = prev['T-1012-PH']?.currentVal ?? 6.8;
          const t11Cond = prev['T-1011-COND']?.currentVal ?? 1.2;
          const t11Ph = prev['T-1011-PH']?.currentVal ?? 6.8;
          const ro1Cond = prev['UPW-RO-01-COND']?.currentVal ?? 0.03;
          const ro1Dp = prev['UPW-RO-01-DP']?.currentVal ?? 1.4;
          const ro2Cond = prev['UPW-RO-02-COND']?.currentVal ?? 0.03;
          const ro2Dp = prev['UPW-RO-02-DP']?.currentVal ?? 1.4;

          // Both buffer tanks absorb the raw turbidity first
          const nextT12Cond = Math.min(6.8, Number((t12Cond + 0.12).toFixed(2)));
          const nextT12Ph = Math.max(5.0, Number((t12Ph - 0.04).toFixed(2)));
          const nextT11Cond = Math.min(6.2, Number((t11Cond + 0.11).toFixed(2)));
          const nextT11Ph = Math.max(5.2, Number((t11Ph - 0.035).toFixed(2)));

          // Particulate slurry reaches membranes once tanks exceed 1.8 µS/cm
          const hasIntakeSilt = t12Cond >= 1.8 || t11Cond >= 1.8;

          // Colloidal fouling (ΔP) rises first
          const nextRo1Dp = hasIntakeSilt
            ? Math.min(2.7, Number((ro1Dp + 0.025).toFixed(2)))
            : ro1Dp;
          const nextRo2Dp = hasIntakeSilt
            ? Math.min(2.6, Number((ro2Dp + 0.022).toFixed(2)))
            : ro2Dp;

          // Permeate salt passage follows closely
          const isFoulingActive = ro1Dp >= 1.6;
          const nextRo1Cond = isFoulingActive
            ? Math.min(0.092, Number((ro1Cond + 0.0012).toFixed(3)))
            : ro1Cond;
          const nextRo2Cond = isFoulingActive
            ? Math.min(0.089, Number((ro2Cond + 0.0011).toFixed(3)))
            : ro2Cond;

          // Dispatch exactly 1 message to the chat with a 4-second delay once intake or RO drift warning begins
          const isDriftWarning = nextT12Cond >= 1.8 || nextT11Cond >= 1.8 || nextRo1Dp >= 1.45 || nextRo1Cond >= 0.033;
          if (isDriftWarning && !triggeredCasesRef.current.has(3)) {
            triggeredCasesRef.current.add(3);
            if (onSimulateEvent) {
              setTimeout(() => {
                onSimulateEvent('Drift detected for UPW-RO-01, UPW-RO-02 and intake tanks T-1011/T-1012 (MMF breakthrough)');
              }, 4000);
            }
          }

          return {
            ...prev,
            'T-1012-COND': { ...prev['T-1012-COND'], currentVal: nextT12Cond },
            'T-1012-PH': { ...prev['T-1012-PH'], currentVal: nextT12Ph },
            'T-1011-COND': { ...prev['T-1011-COND'], currentVal: nextT11Cond },
            'T-1011-PH': { ...prev['T-1011-PH'], currentVal: nextT11Ph },
            'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: nextRo1Dp },
            'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: nextRo2Dp },
            'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: nextRo1Cond },
            'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: nextRo2Cond },
          };
        });
      }

      // 2. Append new reading with subtle micro-jitter into rolling sparkline history
      setTelemetryHistory(prev => {
        const next: Record<string, number[]> = { ...prev };
        const upwKeys = [
          'UPW-RO-01-COND', 'UPW-RO-01-DP',
          'UPW-RO-02-COND', 'UPW-RO-02-DP',
          'T-1012-COND', 'T-1012-PH',
          'T-1011-COND', 'T-1011-PH'
        ];
        upwKeys.forEach(k => {
          const v = vars[k];
          if (!v) return;
          // Sensor micro-jitter
          const jitterAmp = v.step ? v.step * 0.15 : 0.001;
          const jitter = (Math.random() - 0.5) * jitterAmp;
          const liveVal = Math.max(v.min, Math.min(v.max, Number((v.currentVal + jitter).toFixed(3))));
          const existing = next[k] || [];
          next[k] = [...existing.slice(-23), liveVal];
        });
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [vars, activeDriftCase]);

  const isAlarm = (v: SimVariable): boolean => {
    if (v.alarmCondition === '>') return v.currentVal > v.alarmThreshold;
    if (v.alarmCondition === '<') return v.currentVal < v.alarmThreshold;
    if (v.alarmCondition === '<=') return v.currentVal <= v.alarmThreshold;
    return false;
  };

  const handleSliderChange = (id: string, value: number) => {
    setVars(prev => ({
      ...prev,
      [id]: { ...prev[id], currentVal: value },
    }));
  };

  const resetAllToNormal = () => {
    setVars(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], currentVal: next[k].normalVal };
      });
      return next;
    });
  };

  // Load UPW Scenario Presets
  const loadUpwScenario = (caseNum: 1 | 2 | 3) => {
    setSelectedScenario(caseNum);
    setActiveTab('upw_drift');
    
    if (caseNum === 1) {
      // Case 1: Local RO-01 Probe Drift / O-Ring Leak (Flat DP, Sister RO-02 and Tanks normal)
      setVars(prev => ({
        ...prev,
        'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: 0.09 },
        'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: 1.4 },
        'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: 0.03 },
        'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: 1.4 },
        'T-1012-COND': { ...prev['T-1012-COND'], currentVal: 1.2 },
        'T-1012-PH': { ...prev['T-1012-PH'], currentVal: 6.8 },
        'T-1011-COND': { ...prev['T-1011-COND'], currentVal: 1.2 },
        'T-1011-PH': { ...prev['T-1011-PH'], currentVal: 6.8 },
      }));
      if (onSimulateEvent) {
        onSimulateEvent(
          '💧 UPW SCADA ADVISORY: Quality drift detected on UPW-RO-01 (Permeate Conductivity = 0.09 µS/cm > 0.06 µS/cm limit). Differential Pressure is nominal at 1.4 bar. Investigate root cause by inspecting sister unit UPW-RO-02 and upstream Pre-Treated Tanks T-1011 and T-1012.'
        );
      }
    } else if (caseNum === 2) {
      // Case 2: Common Upstream Feed Contamination (T-1012 feeding both RO units simultaneously)
      setVars(prev => ({
        ...prev,
        'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: 0.09 },
        'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: 2.4 },
        'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: 0.08 },
        'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: 2.3 },
        'T-1012-COND': { ...prev['T-1012-COND'], currentVal: 7.8 },
        'T-1012-PH': { ...prev['T-1012-PH'], currentVal: 4.8 },
        'T-1011-COND': { ...prev['T-1011-COND'], currentVal: 1.1 },
        'T-1011-PH': { ...prev['T-1011-PH'], currentVal: 6.8 },
      }));
      if (onSimulateEvent) {
        onSimulateEvent(
          '🚨 UPW SCADA WARNING: Common-mode drift across both UPW-RO-01 (0.09 µS/cm, 2.4 bar) and UPW-RO-02 (0.08 µS/cm, 2.3 bar). Upstream buffer T-1012 is supplying contaminated feed (7.8 µS/cm, 4.8 pH). Initiate OCAP to switch supply to standby tank T-1011.'
        );
      }
    } else if (caseNum === 3) {
      // Case 3: Intake Multi-Media Filter (MMF) breakthrough -> Silt & colloidal fouling across all 4 assets!
      setVars(prev => ({
        ...prev,
        'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: 0.092 },
        'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: 2.7 },
        'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: 0.089 },
        'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: 2.6 },
        'T-1012-COND': { ...prev['T-1012-COND'], currentVal: 6.8 },
        'T-1012-PH': { ...prev['T-1012-PH'], currentVal: 5.0 },
        'T-1011-COND': { ...prev['T-1011-COND'], currentVal: 6.2 },
        'T-1011-PH': { ...prev['T-1011-PH'], currentVal: 5.2 },
      }));
      if (onSimulateEvent) {
        onSimulateEvent(
          '🚨 CRITICAL UPW SCADA ALARM: Plant-wide Multi-Media Filter Bank (MMF-01/02/03) underdrain collapse! Silt & particulate breakthrough has contaminated both storage tanks T-1011 and T-1012 (Cond > 6.0 µS/cm). Severe colloidal spacer fouling (ΔP > 2.6 bar) and salt passage detected across both RO-01 and RO-02 skids. Immediate raw water intake shutdown and emergency backwash required.'
        );
      }
    }
  };

  // Adjust 3 cleanroom process tools to alarm positions, sync Neo4j alarms, and dispatch RCA warning to Agent
  const triggerThreeToolCascadeAndRca = async () => {
    setActiveTab('hvac_chiller');
    setVars(prev => ({
      ...prev,
      'TOOL-LITHO-01': { ...prev['TOOL-LITHO-01'], currentVal: prev['TOOL-LITHO-01']?.alarmVal ?? 22.2 },
      'TOOL-CMP-01': { ...prev['TOOL-CMP-01'], currentVal: prev['TOOL-CMP-01']?.alarmVal ?? 12.0 },
      'TOOL-CMP-02': { ...prev['TOOL-CMP-02'], currentVal: prev['TOOL-CMP-02']?.alarmVal ?? 27.5 },
      'MCC-01': { ...prev['MCC-01'], currentVal: prev['MCC-01']?.alarmVal ?? 5.8 },
      'CHW-P-05': { ...prev['CHW-P-05'], currentVal: prev['CHW-P-05']?.alarmVal ?? 0 },
      'CHW-HDR-01': { ...prev['CHW-HDR-01'], currentVal: prev['CHW-HDR-01']?.alarmVal ?? 1.8 },
      'CHW-HX-01': { ...prev['CHW-HX-01'], currentVal: prev['CHW-HX-01']?.alarmVal ?? 24.5 },
      'CHW-AHU-01': { ...prev['CHW-AHU-01'], currentVal: prev['CHW-AHU-01']?.alarmVal ?? 23.8 },
    }));

    try {
      await fetch('/api/neo4j/alarms/create', { method: 'POST' });
    } catch (err) {
      console.warn('Failed to sync alarms with Neo4j:', err);
    }

    if (onSimulateEvent) {
      onSimulateEvent(
        '🚨 SCADA TELEMETRY WARNING: Active alarms detected across 3 cleanroom process tools: TOOL-LITHO-01 (Laser Cavity Temp Alarm), TOOL-CMP-01 (Platen Cooling Flow Low), and TOOL-CMP-02 (Carrier Head Cooling Failure). Perform Root Cause Analysis (RCA) across active plant alarms and trace their upstream causal topology to identify the root cause asset.'
      );
    }
  };

  const totalAlarmCount = Object.values(vars).filter(isAlarm).length;

  // Intelligent SPC drift calculation (linear slope over last N ticks, velocity, and time-to-breach projection)
  const calculateDriftMetrics = (id: string, item: SimVariable, history: number[]) => {
    if (history.length < 3) {
      return { velocity: 0, isDrifting: false, ttbSeconds: null, projectedX: 0, projectedY: 0 };
    }
    const n = Math.min(history.length, 8);
    const recent = history.slice(-n);
    const firstVal = recent[0];
    const lastVal = recent[recent.length - 1];
    const delta = lastVal - firstVal;
    // velocity per sample tick (ticks run at 1200ms)
    const velocityPerTick = delta / (n - 1);
    const velocityPerSec = velocityPerTick / 1.2;

    // Drifting is active if steady rise towards trip limit while still unbreached
    let isDrifting = false;
    let ttbSeconds: number | null = null;

    if (item.alarmCondition === '>') {
      // Sensitive SPC slope catch: triggers yellow as soon as slope is positive (> 0.0003) and 3% above nominal
      if (velocityPerTick > 0.0003 && lastVal < item.alarmThreshold && lastVal >= item.normalVal * 1.03) {
        isDrifting = true;
        const distanceToAlarm = item.alarmThreshold - lastVal;
        const ticksLeft = distanceToAlarm / Math.max(velocityPerTick, 0.0001);
        ttbSeconds = Math.max(2, Math.round(ticksLeft * 1.2));
      }
    } else if (item.alarmCondition === '<') {
      if (velocityPerTick < -0.002 && lastVal > item.alarmThreshold && lastVal <= item.normalVal * 0.98) {
        isDrifting = true;
        const distanceToAlarm = lastVal - item.alarmThreshold;
        const ticksLeft = distanceToAlarm / Math.max(Math.abs(velocityPerTick), 0.0001);
        ttbSeconds = Math.max(2, Math.round(ticksLeft * 1.2));
      }
    }

    return {
      velocity: velocityPerSec,
      isDrifting,
      ttbSeconds,
    };
  };

  // Mini live telemetry sparkline graph card with 3-State Detection, Projected Forecast Cone & Velocity Pill
  const renderLiveTelemetryMiniCard = (id: string, label?: string) => {
    const item = vars[id];
    if (!item) return null;
    const history = telemetryHistory[id] || [item.currentVal];
    const latestVal = history[history.length - 1] ?? item.currentVal;
    const alarmed = isAlarm({ ...item, currentVal: latestVal });

    // Calculate SPC early drift metrics
    const { velocity, isDrifting, ttbSeconds } = calculateDriftMetrics(id, item, history);
    const isAmberDrift = !alarmed && isDrifting;

    // Dynamic adaptive range for high-resolution visual waves
    const svgWidth = 240;
    const svgHeight = 46;
    const paddingY = 6;
    
    // Scale focused on practical drift bounds rather than absolute full sensor limit
    const minVal = item.min;
    const effectiveMax = id.includes('COND') && item.max > 0.15 ? 0.11 : item.max;
    const range = Math.max(effectiveMax - minVal, 0.001);

    const pointsArray = history.map((val, idx) => {
      const x = (idx / (Math.max(history.length - 1, 1))) * (svgWidth - (isAmberDrift ? 45 : 0));
      const clampedVal = Math.max(minVal, Math.min(effectiveMax, val));
      const normalizedY = (clampedVal - minVal) / range;
      const y = (svgHeight - paddingY) - normalizedY * (svgHeight - paddingY * 2);
      return { x, y };
    });

    const points = pointsArray.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Threshold line Y
    const thresholdClamped = Math.max(minVal, Math.min(effectiveMax, item.alarmThreshold));
    const thresholdNorm = (thresholdClamped - minVal) / range;
    const thresholdY = (svgHeight - paddingY) - thresholdNorm * (svgHeight - paddingY * 2);

    // Predictive forecast trajectory endpoint
    const lastPoint = pointsArray[pointsArray.length - 1] || { x: 0, y: svgHeight / 2 };
    let forecastX = svgWidth - 4;
    let forecastY = thresholdY;
    if (isAmberDrift) {
      forecastX = Math.min(svgWidth - 2, lastPoint.x + 40);
      forecastY = thresholdY; // Projects directly towards the breach line
    }

    const decimals = item.step < 0.1 ? (item.step < 0.01 ? 3 : 2) : (item.step < 1 ? 1 : 0);

    return (
      <div 
        key={`mini-card-${id}`}
        className={`rounded-xl border p-2.5 transition-all duration-300 shadow-2xs relative overflow-hidden ${
          alarmed 
            ? 'bg-rose-50/95 border-rose-400 ring-2 ring-rose-500/40 text-rose-950 shadow-rose-200/50' 
            : isAmberDrift
            ? 'bg-amber-50/95 border-amber-400 ring-2 ring-amber-400/50 text-amber-950 shadow-amber-200/60 animate-pulse'
            : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
        }`}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-1.5 gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              alarmed 
                ? 'bg-rose-600 animate-ping' 
                : isAmberDrift 
                ? 'bg-amber-500 animate-bounce' 
                : 'bg-emerald-500 animate-pulse'
            }`} />
            <span className="text-[11px] font-bold text-slate-800 truncate">
              {label || item.variableName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Live Drift Velocity Indicator Chip */}
            {isAmberDrift && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 flex items-center gap-0.5 border border-amber-300 animate-pulse">
                <TrendingUp className="w-2.5 h-2.5 text-amber-800" />
                <span>+{Math.abs(velocity).toFixed(item.step < 0.01 ? 4 : 3)}/s</span>
              </span>
            )}
            
            <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
              alarmed 
                ? 'bg-rose-600 text-white' 
                : isAmberDrift 
                ? 'bg-amber-600 text-white font-extrabold'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {latestVal.toFixed(decimals)} {item.unit}
            </span>
          </div>
        </div>

        {/* Status banner on active drift */}
        {isAmberDrift && (
          <div className="flex items-center justify-between text-[9px] font-mono font-bold px-2 py-0.5 mb-1.5 bg-amber-100 text-amber-900 rounded-md border border-amber-300/80">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-700" />
              <span>EARLY SPC DRIFT DETECTED</span>
            </span>
            <span>TTB: ~{ttbSeconds}s</span>
          </div>
        )}

        {/* SVG Sparkline Graph with Forecast Cone */}
        <div className="relative w-full h-[46px] bg-slate-950/5 rounded-lg border border-slate-200/60 overflow-hidden">
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full preserve-3d"
            preserveAspectRatio="none"
          >
            {/* Threshold dashed line */}
            <line 
              x1="0" 
              y1={thresholdY} 
              x2={svgWidth} 
              y2={thresholdY} 
              stroke={alarmed ? '#e11d48' : isAmberDrift ? '#f59e0b' : '#cbd5e1'} 
              strokeWidth={isAmberDrift || alarmed ? '1.5' : '1'} 
              strokeDasharray={isAmberDrift ? '4 2' : '3 3'} 
            />

            {/* Threshold Label inside graph */}
            <text 
              x={svgWidth - 4} 
              y={Math.max(thresholdY - 2, 8)} 
              textAnchor="end" 
              fontSize="8" 
              fontFamily="monospace"
              fill={alarmed ? '#e11d48' : isAmberDrift ? '#d97706' : '#94a3b8'}
              fontWeight="bold"
            >
              LIMIT: {item.alarmThreshold}
            </text>

            {/* Area gradient under curve */}
            <defs>
              <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={alarmed ? '#f43f5e' : isAmberDrift ? '#f59e0b' : '#06b6d4'} stopOpacity="0.4" />
                <stop offset="100%" stopColor={alarmed ? '#f43f5e' : isAmberDrift ? '#f59e0b' : '#06b6d4'} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon 
              points={`0,${svgHeight} ${points} ${pointsArray[pointsArray.length - 1]?.x || svgWidth},${svgHeight}`} 
              fill={`url(#grad-${id})`} 
            />

            {/* Historical Polyline line */}
            <polyline
              fill="none"
              stroke={alarmed ? '#e11d48' : isAmberDrift ? '#d97706' : '#0891b2'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Projected Forecast Trajectory Line (Dotted Amber Arrow) */}
            {isAmberDrift && (
              <g>
                {/* Projected Dashed Trajectory Line */}
                <line 
                  x1={lastPoint.x} 
                  y1={lastPoint.y} 
                  x2={forecastX} 
                  y2={forecastY} 
                  stroke="#d97706" 
                  strokeWidth="2" 
                  strokeDasharray="4 3" 
                  strokeLinecap="round"
                />
                {/* Arrowhead / Prediction Marker */}
                <circle 
                  cx={forecastX} 
                  cy={forecastY} 
                  r="3.5" 
                  fill="#b45309" 
                  stroke="#fef3c7"
                  strokeWidth="1.5"
                  className="animate-ping"
                />
                <circle 
                  cx={forecastX} 
                  cy={forecastY} 
                  r="2.5" 
                  fill="#b45309" 
                />
              </g>
            )}

            {/* Current point pulse */}
            {lastPoint && (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="3.5"
                fill={alarmed ? '#be123c' : isAmberDrift ? '#d97706' : '#0e7490'}
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  // Render variable control slider with crisp SCADA styling
  const renderVarSlider = (id: string) => {
    const item = vars[id];
    if (!item) return null;
    const alarmed = isAlarm(item);

    return (
      <div 
        key={item.id}
        id={`sim-var-${item.id}`}
        className={`p-3.5 rounded-xl border transition-all duration-200 ${
          alarmed 
            ? 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs ring-1 ring-rose-400/40' 
            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800 shadow-2xs'
        }`}
      >
        {/* Node header with wrap-safe badges */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-200/80 shrink-0">
                {item.assetId}
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate" title={item.nodeName}>
                {item.nodeName}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-slate-400">param:</span>
              <span className="font-semibold text-slate-700">{item.variableName}</span>
            </div>
          </div>

          {/* Telemetry live readout badge */}
          <div className="shrink-0">
            <div 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-2xs transition-colors ${
                alarmed 
                  ? 'bg-rose-600 text-white animate-pulse' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}
            >
              {alarmed ? (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
              )}
              <span className="tracking-tight">
                {item.currentVal.toFixed(item.step < 0.1 ? (item.step < 0.01 ? 3 : 2) : (item.step < 1 ? 1 : 0))} {item.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Industrial Slider */}
        <div className="space-y-1.5 my-2">
          <div className="relative flex items-center">
            <input
              id={`slider-${item.id}`}
              type="range"
              min={item.min}
              max={item.max}
              step={item.step}
              value={item.currentVal}
              onChange={(e) => handleSliderChange(item.id, parseFloat(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all ${
                alarmed 
                  ? 'accent-rose-600 bg-rose-200' 
                  : 'accent-indigo-600 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-0.5">
            <span>{item.min} {item.unit}</span>
            <span className="text-slate-500 font-medium">Set: {item.currentVal}</span>
            <span>{item.max} {item.unit}</span>
          </div>
        </div>

        {/* Threshold specs & quick action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] gap-2">
          <div className="space-y-0.5 min-w-0 flex-1 text-[10px]">
            <div className="text-slate-600 truncate">
              <span className="text-emerald-700 font-bold">Norm:</span> {item.normalDesc}
            </div>
            <div className="text-slate-600 truncate">
              <span className="text-rose-600 font-bold">Trip:</span> {item.alarmDesc}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              id={`btn-normal-${item.id}`}
              onClick={() => handleSliderChange(item.id, item.normalVal)}
              className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-colors cursor-pointer"
              title="Set to Normal Value"
            >
              Normal
            </button>
            <button
              id={`btn-alarm-${item.id}`}
              onClick={() => handleSliderChange(item.id, item.alarmVal)}
              className="px-2 py-1 text-[10px] font-semibold bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-md border border-rose-200 transition-colors cursor-pointer"
              title="Set to Trip Value"
            >
              Trip
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="event-simulator-container" className="relative w-full h-full flex flex-col bg-slate-100/70 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      
      {/* Top SCADA Control Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shadow-2xs gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-700 flex items-center justify-center shadow-2xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Live SCADA Telemetry & Fault Injection Simulator
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1.5 ${
                totalAlarmCount > 0 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${totalAlarmCount > 0 ? 'bg-rose-600' : 'bg-emerald-500'}`} />
                {totalAlarmCount} {totalAlarmCount === 1 ? 'Alarm' : 'Alarms'} Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive process simulator with ISA-18.2 alarm rationalization and physical root cause cascades
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Domain View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('hvac_chiller')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'hvac_chiller'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Chiller / HVAC Loop
            </button>
            <button
              onClick={() => setActiveTab('upw_drift')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upw_drift'
                  ? 'bg-white text-cyan-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              UPW Membrane & Tanks
            </button>
          </div>

          <button
            id="btn-toggle-handbook"
            onClick={() => setShowHandbook(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showHandbook 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Scenario Handbook</span>
            {showHandbook ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            id="btn-reset-all"
            onClick={resetAllToNormal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Normal</span>
          </button>
          
          {activeTab === 'hvac_chiller' && (
            <button
              id="btn-simulate-three-tool-cascade"
              onClick={triggerThreeToolCascadeAndRca}
              disabled={isRunning}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                isRunning 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/20 active:scale-95'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Trigger Multi-Tool Cascade (RCA)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* --- SCENARIO HANDBOOK DRAWER --- */}
        {showHandbook && (
          <div id="scenario-handbook-panel" className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-800 mb-4 gap-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Engineering Scenario Handbook: UPW Drift & Fault Topology</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/30 text-indigo-200 rounded-md border border-indigo-400/30">
                      Symmetric 2-Variable Telemetry
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Physical failure mechanisms, sister-unit correlation, and automated OCAP isolation paths
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadUpwScenario(1)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    selectedScenario === 1 
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-xs' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Case 1: Local RO-02
                </button>
                <button
                  onClick={() => loadUpwScenario(2)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    selectedScenario === 2 
                      ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-xs' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Case 2: Common T-1012
                </button>
                <button
                  onClick={() => loadUpwScenario(3)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    selectedScenario === 3 
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-xs' 
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Case 3: Intake MMF Breakdown
                </button>
              </div>
            </div>

            {/* Scenario Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
              
              {/* CASE 1 */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                selectedScenario === 1 
                  ? 'bg-cyan-950/40 border-cyan-400/60 ring-1 ring-cyan-400/40' 
                  : 'bg-slate-950/60 border-slate-800 opacity-85 hover:opacity-100'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      CASE 1
                    </span>
                    <span className="text-[11px] text-cyan-300 font-semibold">Local Unit Failure</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1.5">
                    Sensor Drift / O-Ring Leak on UPW-RO-01
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    <strong className="text-cyan-200">Mechanism:</strong> Local probe calibration drift or permeate interconnector O-ring leak on <code className="text-cyan-300 font-mono">UPW-RO-01</code>. Normal <code className="text-white font-mono">ΔP = 1.4 bar</code> confirms zero membrane fouling. Sister train <code className="text-indigo-300 font-mono">UPW-RO-02</code> and upstream tanks remain pristine.
                  </p>

                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[10px] font-mono mb-3">
                    <div className="flex justify-between border-b border-slate-800 pb-1 font-bold text-slate-400">
                      <span>Asset</span>
                      <span>Conductivity</span>
                      <span>ΔP / pH</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>UPW-RO-01 (Primary):</span>
                      <span>0.09 µS/cm ⚠️</span>
                      <span className="text-emerald-400">1.4 bar ✅</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>UPW-RO-02 (Sister):</span>
                      <span>0.03 µS/cm ✅</span>
                      <span>1.4 bar ✅</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>T-1012 (Standby):</span>
                      <span>1.2 µS/cm ✅</span>
                      <span>6.8 pH ✅</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>T-1011 (Duty):</span>
                      <span>1.2 µS/cm ✅</span>
                      <span>6.8 pH ✅</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Action: Recalibrate probe / check O-ring</span>
                  <button
                    onClick={() => loadUpwScenario(1)}
                    className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Load Case 1</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* CASE 2 */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                selectedScenario === 2 
                  ? 'bg-rose-950/40 border-rose-400/60 ring-1 ring-rose-400/40' 
                  : 'bg-slate-950/60 border-slate-800 opacity-85 hover:opacity-100'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-400/30">
                      CASE 2
                    </span>
                    <span className="text-[11px] text-rose-300 font-semibold">Common-Mode Feed</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1.5">
                    Upstream Active Tank T-1012 Contamination
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    <strong className="text-rose-200">Mechanism:</strong> Active tank <code className="text-rose-300 font-mono">T-1012</code> supplies the common transfer pump header <code className="text-rose-300 font-mono">S-111</code>. Cation resin exhaustion causes hardness & acid breakthrough. Both <code className="text-rose-300 font-mono">UPW-RO-01</code> and <code className="text-rose-300 font-mono">UPW-RO-02</code> degrade symmetrically with high conductivity and elevated ΔP (fouling).
                  </p>

                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[10px] font-mono mb-3">
                    <div className="flex justify-between border-b border-slate-800 pb-1 font-bold text-slate-400">
                      <span>Asset</span>
                      <span>Conductivity</span>
                      <span>ΔP / pH</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>UPW-RO-01 (Primary):</span>
                      <span>0.09 µS/cm ⚠️</span>
                      <span>2.4 bar ⚠️</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>UPW-RO-02 (Sister):</span>
                      <span>0.08 µS/cm ⚠️</span>
                      <span>2.3 bar ⚠️</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>T-1012 (Active):</span>
                      <span>7.8 µS/cm ❌</span>
                      <span>4.8 pH ❌</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>T-1011 (Standby):</span>
                      <span>1.1 µS/cm ✅</span>
                      <span>6.8 pH ✅</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">OCAP: Switch pump suction to Tank T-1011</span>
                  <button
                    onClick={() => loadUpwScenario(2)}
                    className="text-[11px] font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Load Case 2</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* CASE 3 */}
              <div className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                selectedScenario === 3 
                  ? 'bg-amber-950/40 border-amber-400/60 ring-1 ring-amber-400/40' 
                  : 'bg-slate-950/60 border-slate-800 opacity-85 hover:opacity-100'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      CASE 3
                    </span>
                    <span className="text-[11px] text-amber-300 font-semibold">Plant-Wide Multi-Media Filter (MMF) Rupture</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1.5">
                    Total Pretreatment Collapse (All 4 Assets Red)
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    <strong className="text-amber-200">Mechanism:</strong> Raw intake Multi-Media Filter Bank <code className="text-amber-300 font-mono">MMF-01/02/03</code> suffered underdrain mesh rupture. High turbidity silt & particulates penetrated the entire pretreatment train, contaminating <code className="text-rose-300 font-mono">T-1011 & T-1012</code> and causing severe colloidal fouling (<code className="text-rose-300 font-mono">ΔP &gt; 2.6 bar</code>) across both <code className="text-rose-300 font-mono">UPW-RO-01 &amp; RO-02</code>.
                  </p>

                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[10px] font-mono mb-3">
                    <div className="flex justify-between border-b border-slate-800 pb-1 font-bold text-slate-400">
                      <span>Asset</span>
                      <span>Conductivity</span>
                      <span>ΔP / pH</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>UPW-RO-01 (Primary):</span>
                      <span>0.09 µS/cm ⚠️</span>
                      <span>2.7 bar ❌</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>UPW-RO-02 (Sister):</span>
                      <span>0.09 µS/cm ⚠️</span>
                      <span>2.6 bar ❌</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>T-1012 (Storage B):</span>
                      <span>6.8 µS/cm ❌</span>
                      <span>5.0 pH ❌</span>
                    </div>
                    <div className="flex justify-between text-rose-400 font-bold">
                      <span>T-1011 (Storage A):</span>
                      <span>6.2 µS/cm ❌</span>
                      <span>5.2 pH ❌</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">OCAP: Emergency Intake Trip &amp; MMF Media Flush</span>
                  <button
                    onClick={() => loadUpwScenario(3)}
                    className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Load Case 3</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- VIEW TAB 1: CHILLER / HVAC / PROCESS TOOLS CASCADE --- */}
        {activeTab === 'hvac_chiller' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            
            {/* COLUMN 1: Electrical */}
            <div id="card-electrical" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Process Electrical
                      </h3>
                      <p className="text-[11px] text-slate-500">Motor Control Center & Power Bus</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    1 Asset
                  </span>
                </div>

                <div className="space-y-3">
                  {renderVarSlider('MCC-01')}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Primary ground fault @ 10:00:00 triggers pump breaker trip.</span>
              </div>
            </div>

            {/* COLUMN 2: Chiller */}
            <div id="card-chiller" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg border border-blue-500/20">
                      <Flame className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Chiller Primary Loop
                      </h3>
                      <p className="text-[11px] text-slate-500">Pumps, headers & heat exchangers</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    3 Assets
                  </span>
                </div>

                <div className="space-y-3">
                  {renderVarSlider('CHW-P-05')}
                  {renderVarSlider('CHW-HDR-01')}
                  {renderVarSlider('CHW-HX-01')}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Pump de-energization causes header pressure collapse.</span>
              </div>
            </div>

            {/* COLUMN 3: HVAC */}
            <div id="card-hvac" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-teal-500/10 text-teal-600 rounded-lg border border-teal-500/20">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Cleanroom HVAC
                      </h3>
                      <p className="text-[11px] text-slate-500">Air handling & thermal stability</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    1 Asset
                  </span>
                </div>

                <div className="space-y-3">
                  {renderVarSlider('CHW-AHU-01')}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Loss of CHW flow leads to cleanroom air thermal drift.</span>
              </div>
            </div>

            {/* COLUMN 4: Process Tools */}
            <div id="card-process-tools" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-lg border border-purple-500/20">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Process Tools (Bay)
                      </h3>
                      <p className="text-[11px] text-slate-500">Litho laser cavity & CMP cooling</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                    3 Assets
                  </span>
                </div>

                <div className="space-y-3">
                  {renderVarSlider('TOOL-LITHO-01')}
                  {renderVarSlider('TOOL-CMP-01')}
                  {renderVarSlider('TOOL-CMP-02')}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span>Thermal interlocks trip tools to safeguard wafer yield.</span>
              </div>
            </div>

          </div>
        )}

        {/* --- VIEW TAB 2: UPW REVERSE OSMOSIS & PRE-TREATMENT DRIFT --- */}
        {activeTab === 'upw_drift' && (
          <div className="space-y-4">
            {/* 3 Live Telemetry Drift Kickstart Buttons */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-950 border border-cyan-800 rounded-lg text-[11px] font-mono font-bold text-cyan-300">
                  <span className={`w-2 h-2 rounded-full ${activeDriftCase ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                  {activeDriftCase ? `DRIFT ACTIVE: CASE ${activeDriftCase}` : 'STATUS: NOMINAL (1.2s cadence)'}
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Select a button below to kick-start real-time sensor drift:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Button 1 */}
                <button
                  type="button"
                  onClick={() => {
                    triggeredCasesRef.current.delete(1);
                    setActiveDriftCase(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    activeDriftCase === 1
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm ring-2 ring-cyan-400/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-cyan-200 border-slate-700 hover:border-cyan-500/50'
                  }`}
                >
                  <span>▶ Case 1: RO-01 Probe Drift</span>
                </button>

                {/* Button 2 */}
                <button
                  type="button"
                  onClick={() => {
                    triggeredCasesRef.current.delete(2);
                    setActiveDriftCase(2);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    activeDriftCase === 2
                      ? 'bg-rose-600 border-rose-400 text-white shadow-sm ring-2 ring-rose-400/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-rose-200 border-slate-700 hover:border-rose-500/50'
                  }`}
                >
                  <span>▶ Case 2: Feed Contamination</span>
                </button>

                {/* Button 3 */}
                <button
                  type="button"
                  onClick={() => {
                    triggeredCasesRef.current.delete(3);
                    setActiveDriftCase(3);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                    activeDriftCase === 3
                      ? 'bg-amber-600 border-amber-400 text-white shadow-sm ring-2 ring-amber-400/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-200 border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  <span>▶ Case 3: Intake MMF Breakdown</span>
                </button>

                {/* Reset Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggeredCasesRef.current.clear();
                    setActiveDriftCase(null);
                    setVars(prev => ({
                      ...prev,
                      'UPW-RO-01-COND': { ...prev['UPW-RO-01-COND'], currentVal: 0.03 },
                      'UPW-RO-01-DP': { ...prev['UPW-RO-01-DP'], currentVal: 1.4 },
                      'UPW-RO-02-COND': { ...prev['UPW-RO-02-COND'], currentVal: 0.03 },
                      'UPW-RO-02-DP': { ...prev['UPW-RO-02-DP'], currentVal: 1.4 },
                      'T-1012-COND': { ...prev['T-1012-COND'], currentVal: 1.2 },
                      'T-1012-PH': { ...prev['T-1012-PH'], currentVal: 6.8 },
                      'T-1011-COND': { ...prev['T-1011-COND'], currentVal: 1.2 },
                      'T-1011-PH': { ...prev['T-1011-PH'], currentVal: 6.8 },
                    }));
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-all flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Baseline</span>
                </button>
              </div>
            </div>

            {/* Sister Skid Delta Comparator & Intelligent SPC Divergence Header */}
            {(() => {
              const ro1Cond = vars['UPW-RO-01-COND']?.currentVal ?? 0.03;
              const ro2Cond = vars['UPW-RO-02-COND']?.currentVal ?? 0.03;
              const delta = Math.abs(ro1Cond - ro2Cond);
              const isDivergent = delta >= 0.015;
              const isSynchronizedAlarm = (vars['UPW-RO-01-COND']?.currentVal > 0.06) && (vars['UPW-RO-02-COND']?.currentVal > 0.06);

              return (
                <div className={`rounded-xl px-4 py-2.5 border transition-all flex flex-wrap items-center justify-between gap-3 text-xs ${
                  isDivergent
                    ? 'bg-amber-500/10 border-amber-400 text-amber-950 ring-1 ring-amber-400/40 shadow-xs'
                    : isSynchronizedAlarm
                    ? 'bg-rose-500/10 border-rose-400 text-rose-950 ring-1 ring-rose-400/40 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1 rounded-md font-mono text-[10px] font-extrabold flex items-center gap-1 ${
                      isDivergent 
                        ? 'bg-amber-500 text-slate-950 animate-pulse' 
                        : isSynchronizedAlarm 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Activity className="w-3.5 h-3.5" />
                      <span>SISTER COMPARATOR</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        Δ(RO-01 vs RO-02):{' '}
                      </span>
                      <span className={`font-mono font-bold ${isDivergent ? 'text-amber-700' : isSynchronizedAlarm ? 'text-rose-700' : 'text-slate-700'}`}>
                        {delta.toFixed(3)} µS/cm
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDivergent ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200/90 text-amber-950 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-800" />
                        <span>ASYMMETRIC SISTER DIVERGENCE (Local RO-01 Probe / O-Ring Anomaly)</span>
                      </span>
                    ) : isSynchronizedAlarm ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-200/90 text-rose-950 border border-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-800" />
                        <span>SYNCHRONIZED DEGRADATION (Upstream Common-Mode Header Event)</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Skids in Hydraulic Equilibrium (&lt; 0.010 µS/cm delta)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            
            {/* COLUMN 1: UPW-RO-01 */}
            <div className="flex flex-col gap-3">
              {/* Mini Graph 1 (Top) */}
              {renderLiveTelemetryMiniCard('UPW-RO-01-COND', 'RO-01 Permeate Cond')}
              {/* Mini Graph 2 (Middle) */}
              {renderLiveTelemetryMiniCard('UPW-RO-01-DP', 'RO-01 Differential Press')}

              {/* Sliders Card (Bottom) */}
              <div id="card-ro-01" className="bg-white border border-cyan-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-cyan-500/10 text-cyan-600 rounded-lg border border-cyan-500/20">
                        <Droplets className="w-4 h-4 text-cyan-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          RO Train 01 (Primary)
                        </h3>
                        <p className="text-[11px] text-slate-500">Polyamide separation skid</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded-md border border-cyan-200">
                      2 Params
                    </span>
                  </div>

                  <div className="space-y-3">
                    {renderVarSlider('UPW-RO-01-COND')}
                    {renderVarSlider('UPW-RO-01-DP')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Normal ΔP with high conductivity implies probe decalibration.</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: UPW-RO-02 */}
            <div className="flex flex-col gap-3">
              {/* Mini Graph 1 (Top) */}
              {renderLiveTelemetryMiniCard('UPW-RO-02-COND', 'RO-02 Permeate Cond')}
              {/* Mini Graph 2 (Middle) */}
              {renderLiveTelemetryMiniCard('UPW-RO-02-DP', 'RO-02 Differential Press')}

              {/* Sliders Card (Bottom) */}
              <div id="card-ro-02" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg border border-indigo-500/20">
                        <Droplets className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          RO Train 02 (Sister)
                        </h3>
                        <p className="text-[11px] text-slate-500">Parallel control benchmark</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                      2 Params
                    </span>
                  </div>

                  <div className="space-y-3">
                    {renderVarSlider('UPW-RO-02-COND')}
                    {renderVarSlider('UPW-RO-02-DP')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Sister unit nominal state mathematically rules out common feed.</span>
                </div>
              </div>
            </div>

            {/* COLUMN 3: Tank T-1012 */}
            <div className="flex flex-col gap-3">
              {/* Mini Graph 1 (Top) */}
              {renderLiveTelemetryMiniCard('T-1012-COND', 'T-1012 Feed Cond')}
              {/* Mini Graph 2 (Middle) */}
              {renderLiveTelemetryMiniCard('T-1012-PH', 'T-1012 Feed pH')}

              {/* Sliders Card (Bottom) */}
              <div id="card-tank-1012" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg border border-amber-500/20">
                        <Layers className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Pre-Treated Tank 1012
                        </h3>
                        <p className="text-[11px] text-slate-500">Duty / Standby storage buffer</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                      2 Params
                    </span>
                  </div>

                  <div className="space-y-3">
                    {renderVarSlider('T-1012-COND')}
                    {renderVarSlider('T-1012-PH')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Conductivity and pH indicate cation breakthrough from skid.</span>
                </div>
              </div>
            </div>

            {/* COLUMN 4: Tank T-1011 */}
            <div className="flex flex-col gap-3">
              {/* Mini Graph 1 (Top) */}
              {renderLiveTelemetryMiniCard('T-1011-COND', 'T-1011 Feed Cond')}
              {/* Mini Graph 2 (Middle) */}
              {renderLiveTelemetryMiniCard('T-1011-PH', 'T-1011 Feed pH')}

              {/* Sliders Card (Bottom) */}
              <div id="card-tank-1011" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
                        <Layers className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Pre-Treated Tank 1011
                        </h3>
                        <p className="text-[11px] text-slate-500">Train A / Duty backup tank</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                      2 Params
                    </span>
                  </div>

                  <div className="space-y-3">
                    {renderVarSlider('T-1011-COND')}
                    {renderVarSlider('T-1011-PH')}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>Clean standby source ready for immediate automated OCAP rerouting.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  );
};
