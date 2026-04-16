import React from "react";
import type { HoroscopeData } from "../lib/uedpEngine";

interface Props {
  chart: HoroscopeData;
}

const SIGNS = ["Ar","Ta","Ge","Ca","Le","Vi","Li","Sc","Sa","Cp","Aq","Pi"];
const SIGN_COLORS = [
  "#ef4444","#84cc16","#06b6d4","#f59e0b",
  "#f97316","#10b981","#a78bfa","#f43f5e",
  "#3b82f6","#6366f1","#0ea5e9","#8b5cf6"
];

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#e2e8f0", Mars: "#ef4444",
  Mercury: "#6ee7b7", Jupiter: "#f59e0b", Venus: "#f9a8d4",
  Saturn: "#94a3b8", Rahu: "#c084fc", Ketu: "#fb923c"
};

export default function HoroscopeWheel({ chart }: Props) {
  const cx = 250, cy = 250, R = 220, r_inner = 140, r_planets = 175;
  const ascSign = Math.floor(chart.ascendant / 30);

  // South Indian style — fixed grid, signs rotate
  // Using North Indian circular style here
  const houseAngle = (house: number) => {
    const base = -90 + (house - 1) * 30 - (ascSign * 30);
    return (base + 360) % 360;
  };

  const polarToXY = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 500 500" width="100%" style={{ maxWidth: 420 }}>
        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={R} fill="rgba(10,11,30,0.8)" stroke="rgba(251,191,36,0.3)" strokeWidth={1} />
        
        {/* Zodiac segments */}
        {Array.from({ length: 12 }, (_, i) => {
          const startAngle = (i * 30 - 90 - ascSign * 30 + 360) % 360;
          const endAngle = startAngle + 30;
          const s1 = polarToXY(startAngle, R);
          const s2 = polarToXY(startAngle, r_inner);
          const e1 = polarToXY(endAngle, R);
          const e2 = polarToXY(endAngle, r_inner);
          const signIdx = (ascSign + i) % 12;
          const midAngle = startAngle + 15;
          const labelPos = polarToXY(midAngle, (R + r_inner) / 2);

          return (
            <g key={i}>
              {/* Segment fill */}
              <path
                d={`M ${s2.x} ${s2.y} L ${s1.x} ${s1.y} A ${R} ${R} 0 0 1 ${e1.x} ${e1.y} L ${e2.x} ${e2.y} A ${r_inner} ${r_inner} 0 0 0 ${s2.x} ${s2.y}`}
                fill={`${SIGN_COLORS[signIdx]}18`}
                stroke="rgba(251,191,36,0.2)"
                strokeWidth={0.5}
              />
              {/* Divider lines */}
              <line x1={s2.x} y1={s2.y} x2={s1.x} y2={s1.y} stroke="rgba(251,191,36,0.25)" strokeWidth={0.7} />
              {/* Sign label */}
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill={SIGN_COLORS[signIdx]} fontFamily="Cinzel, serif" fontWeight={600}>
                {SIGNS[signIdx]}
              </text>
              {/* House number */}
              {(() => {
                const houseNum = i + 1;
                const innerPos = polarToXY(midAngle, r_inner - 20);
                return (
                  <text x={innerPos.x} y={innerPos.y} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill="rgba(99,112,241,0.6)" fontFamily="JetBrains Mono, monospace">
                    {houseNum}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Inner circle */}
        <circle cx={cx} cy={cy} r={r_inner} fill="rgba(10,11,30,0.9)" stroke="rgba(99,112,241,0.3)" strokeWidth={1} />

        {/* Cross lines for inner circle */}
        <line x1={cx - r_inner} y1={cy} x2={cx + r_inner} y2={cy} stroke="rgba(99,112,241,0.2)" strokeWidth={0.5} />
        <line x1={cx} y1={cy - r_inner} x2={cx} y2={cy + r_inner} stroke="rgba(99,112,241,0.2)" strokeWidth={0.5} />

        {/* Planets */}
        {chart.planets.map((planet, idx) => {
          // Position planet at its longitude on the wheel
          const angle = planet.longitude - ascSign * 30 - 90;
          const pos = polarToXY(angle, r_planets - (idx % 3) * 12);
          const color = PLANET_COLORS[planet.name] || "#e8e4d9";
          return (
            <g key={planet.name}>
              <circle cx={pos.x} cy={pos.y} r={10} fill={`${color}22`} stroke={color} strokeWidth={1} />
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill={color} fontFamily="serif">
                {planet.symbol}
              </text>
              {planet.isRetrograde && (
                <text x={pos.x + 8} y={pos.y - 8} fontSize={7} fill={color} opacity={0.7}>R</text>
              )}
            </g>
          );
        })}

        {/* Center — Ascendant info */}
        <text x={cx} y={cy - 18} textAnchor="middle" fontSize={11} fill="#fbbf24"
          fontFamily="Cinzel, serif" fontWeight={700}>
          {chart.ascendantSign}
        </text>
        <text x={cx} y={cy} textAnchor="middle" fontSize={9} fill="rgba(232,228,217,0.6)"
          fontFamily="Crimson Pro, serif">
          Lagna {chart.ascendantDegree.toFixed(1)}°
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize={8} fill="rgba(99,112,241,0.8)"
          fontFamily="JetBrains Mono, monospace">
          Ω {chart.uedp.omega.toFixed(3)}
        </text>

        {/* Ascendant marker */}
        {(() => {
          const angle = -90;
          const outer = polarToXY(angle, R + 8);
          const inner = polarToXY(angle, R - 5);
          return (
            <g>
              <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="#fbbf24" strokeWidth={2} />
              <text x={outer.x} y={outer.y - 8} textAnchor="middle" fontSize={9}
                fill="#fbbf24" fontFamily="Cinzel, serif" fontWeight={700}>ASC</text>
            </g>
          );
        })()}

        {/* Rotating outer ring ornament */}
        <circle cx={cx} cy={cy} r={R + 12} fill="none" stroke="rgba(251,191,36,0.1)" strokeWidth={1}
          strokeDasharray="3 6" className="ring-rotate" style={{ transformOrigin: `${cx}px ${cy}px` }} />
      </svg>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-2 justify-center">
        {chart.planets.map(p => (
          <span key={p.name} className="text-xs font-mono flex items-center gap-1"
            style={{ color: PLANET_COLORS[p.name] || "#e8e4d9" }}>
            {p.symbol} {p.name.slice(0, 3)} {p.degree.toFixed(1)}° {p.signName.slice(0, 3)}
            {p.isRetrograde && <span className="text-yellow-400">(R)</span>}
          </span>
        ))}
      </div>
    </div>
  );
}