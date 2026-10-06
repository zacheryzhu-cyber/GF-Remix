import React from 'react';

export interface EnPiIndicator {
  id: string;
  name: string;
  metric: string;
  unit: string;
  currentValue: number;
  baselineValue: number;
  targetValue: number;
  status: 'Better than Target' | 'On Target' | 'Needs Attention';
  trendDirection: 'down' | 'up';
  isLowerBetter: boolean;
  variancePercent: number;
  description: string;
  standard: string;
}

export const SpeedometerGauge: React.FC<{ indicator: EnPiIndicator }> = ({ indicator }) => {
  const { currentValue, baselineValue, targetValue, isLowerBetter, unit } = indicator;

  const rawMin = Math.min(currentValue, baselineValue, targetValue);
  const rawMax = Math.max(currentValue, baselineValue, targetValue);
  const span = rawMax - rawMin || 1;

  // Scale ranges
  const minVal = Number(Math.max(0, rawMin - span * 0.4).toFixed(2));
  const maxVal = Number((rawMax + span * 0.4).toFixed(2));
  const range = maxVal - minVal || 1;

  const valToAngle = (v: number) => {
    const clamped = Math.min(Math.max(v, minVal), maxVal);
    return ((clamped - minVal) / range) * 180;
  };

  const needleAngle = valToAngle(currentValue);
  const targetAngle = valToAngle(targetValue);
  const baselineAngle = valToAngle(baselineValue);

  const cx = 120;
  const cy = 112;
  const r = 74;
  const strokeWidth = 14;

  const getCoordinatesForAngle = (angleDeg: number, radius = r) => {
    const clampedAngle = Math.max(0, Math.min(180, angleDeg));
    const rad = (180 - clampedAngle) * (Math.PI / 180);
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const describeArc = (startAngle: number, endAngle: number, radius = r) => {
    const start = getCoordinatesForAngle(startAngle, radius);
    const end = getCoordinatesForAngle(endAngle, radius);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  // 3 performance zones along the 180-degree speedometer arc
  let zone1End = targetAngle;
  let zone2End = baselineAngle;
  let zone1Color = '#10b981'; // Green
  let zone2Color = '#f59e0b'; // Amber
  let zone3Color = '#ef4444'; // Red

  if (!isLowerBetter) {
    // For metrics where higher is better (e.g. FEI Fan Energy Index)
    zone1End = baselineAngle;
    zone2End = targetAngle;
    zone1Color = '#ef4444'; // Red
    zone2Color = '#f59e0b'; // Amber
    zone3Color = '#10b981'; // Green
  }

  // Ensure zone angles are ordered properly
  const split1 = Math.max(2, Math.min(178, Math.min(zone1End, zone2End)));
  const split2 = Math.max(split1 + 2, Math.min(178, Math.max(zone1End, zone2End)));

  // Target pointer positions
  const targetInner = getCoordinatesForAngle(targetAngle, r - strokeWidth / 2 - 4);
  const targetOuter = getCoordinatesForAngle(targetAngle, r + strokeWidth / 2 + 5);
  const targetPointer = getCoordinatesForAngle(targetAngle, r + strokeWidth / 2 + 1);
  const targetPointerL = getCoordinatesForAngle(targetAngle - 4, r + strokeWidth / 2 + 8);
  const targetPointerR = getCoordinatesForAngle(targetAngle + 4, r + strokeWidth / 2 + 8);
  const targetLabelPos = getCoordinatesForAngle(targetAngle, r + strokeWidth / 2 + 19);

  // Baseline tick positions
  const baselineInner = getCoordinatesForAngle(baselineAngle, r - strokeWidth / 2 - 3);
  const baselineOuter = getCoordinatesForAngle(baselineAngle, r + strokeWidth / 2 + 3);

  // Needle geometry
  const needleTip = getCoordinatesForAngle(needleAngle, r - 8);
  const needleBaseLeft = getCoordinatesForAngle(needleAngle - 90, 6);
  const needleBaseRight = getCoordinatesForAngle(needleAngle + 90, 6);

  // Scale ticks (5 divisions across 180 degrees)
  const ticks = [0, 45, 90, 135, 180];

  return (
    <div className="flex flex-col items-center justify-center select-none w-full">
      <div className="relative w-full max-w-[240px]">
        <svg viewBox="0 0 240 148" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`target-shadow-${indicator.id}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0284c7" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Background Outer Ring Track */}
          <path
            d={describeArc(0, 180, r)}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth + 4}
            strokeLinecap="round"
          />

          {/* Zone 1 Arc (e.g. Optimal) */}
          <path
            d={describeArc(0, split1, r)}
            fill="none"
            stroke={zone1Color}
            strokeWidth={strokeWidth}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />

          {/* Zone 2 Arc (e.g. Warning / Approaching Baseline) */}
          <path
            d={describeArc(split1, split2, r)}
            fill="none"
            stroke={zone2Color}
            strokeWidth={strokeWidth}
            strokeOpacity={0.9}
          />

          {/* Zone 3 Arc (e.g. Critical / Over Baseline) */}
          <path
            d={describeArc(split2, 180, r)}
            fill="none"
            stroke={zone3Color}
            strokeWidth={strokeWidth}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />

          {/* Scale Radial Tick Marks */}
          {ticks.map(deg => {
            const inner = getCoordinatesForAngle(deg, r - strokeWidth / 2 - 2);
            const outer = getCoordinatesForAngle(deg, r + strokeWidth / 2 + 2);
            return (
              <line
                key={deg}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#ffffff"
                strokeWidth={1.5}
                strokeOpacity={0.8}
              />
            );
          })}

          {/* Baseline Reference Line (dashed slate) */}
          <line
            x1={baselineInner.x}
            y1={baselineInner.y}
            x2={baselineOuter.x}
            y2={baselineOuter.y}
            stroke="#334155"
            strokeWidth="2.5"
            strokeDasharray="2,2"
            strokeLinecap="round"
          />

          {/* Target Reference Line on Arc (Solid Sky Blue) */}
          <line
            x1={targetInner.x}
            y1={targetInner.y}
            x2={targetOuter.x}
            y2={targetOuter.y}
            stroke="#0284c7"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Target Pointer Triangle on Dial Edge */}
          <polygon
            points={`${targetPointer.x},${targetPointer.y} ${targetPointerL.x},${targetPointerL.y} ${targetPointerR.x},${targetPointerR.y}`}
            fill="#0284c7"
            stroke="#ffffff"
            strokeWidth="1"
            filter={`url(#target-shadow-${indicator.id})`}
          />

          {/* On-Chart Target Value Tag */}
          <g transform={`translate(${targetLabelPos.x}, ${targetLabelPos.y})`}>
            <rect
              x="-24"
              y="-8"
              width="48"
              height="15"
              rx="3"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1"
            />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              className="text-[9px] font-mono font-black fill-white pointer-events-none"
            >
              T:{targetValue}
            </text>
          </g>

          {/* Scale Limit Labels at 0° and 180° */}
          <text
            x={cx - r - 2}
            y={cy + 13}
            textAnchor="middle"
            className="text-[9px] font-mono font-semibold fill-slate-400"
          >
            {minVal}
          </text>
          <text
            x={cx + r + 2}
            y={cy + 13}
            textAnchor="middle"
            className="text-[9px] font-mono font-semibold fill-slate-400"
          >
            {maxVal}
          </text>

          {/* Needle Pointer */}
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleBaseLeft.x},${needleBaseLeft.y} ${needleBaseRight.x},${needleBaseRight.y}`}
            fill="#0f172a"
          />
          <circle cx={cx} cy={cy} r="7" fill="#0f172a" />
          <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
        </svg>

        {/* Speedometer Center Value Display */}
        <div className="text-center -mt-3.5 space-y-0.5">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {currentValue}
            </span>
            <span className="text-xs text-slate-500 font-semibold">{unit}</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono font-medium">
            <span className="text-sky-700 font-bold">
              Target: {targetValue}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Base: {baselineValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
