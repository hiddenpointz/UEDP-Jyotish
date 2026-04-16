import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { UEDPMetrics, UEDPTimelinePoint } from "../lib/uedpEngine";
import { OMEGA_CRIT } from "../lib/uedpEngine";

interface Props {
  uedp: UEDPMetrics;
  timeline?: UEDPTimelinePoint[];
}

export default function UEDPDashboard({ uedp, timeline }: Props) {
  const isStable = uedp.isStable;

  // Gauge arc
  const radius = 70;
  const circumference = Math.PI * radius; // half circle

  return (
    <div className="space-y-6">
      {/* Core Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Coherence Ω", value: uedp.omega.toFixed(4), sub: isStable ? "STABLE" : "CRITICAL", color: isStable ? "#4ade80" : "#f87171" },
          { label: "Instability Iseq", value: uedp.iseq.toFixed(4), sub: uedp.iseq < 1 ? "LOW" : "HIGH", color: uedp.iseq < 1 ? "#4ade80" : "#fbbf24" },
          { label: "Reversals (R)", value: uedp.reversals.toString(), sub: "Direction Flips", color: "#8197f8" },
          { label: "METP", value: uedp.metp.toFixed(2), sub: "Effort Path", color: "#fbbf24" },
        ].map(m => (
          <div key={m.label} className="glass-card p-3 text-center">
            <p className="text-xs font-display tracking-widest mb-1" style={{ color: "rgba(232,228,217,0.5)" }}>{m.label}</p>
            <p className="text-2xl font-mono font-bold" style={{ color: m.color }}>{m.value}</p>
            <p className="text-xs mt-1" style={{ color: m.color }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Omega Gauge */}
      <div className="glass-card p-6">
        <h3 className="font-display text-sm tracking-widest text-gold-400 mb-4">UEDP V4 — COHERENCE FIELD Ω</h3>
        <div className="flex items-center gap-8">
          {/* SVG Gauge */}
          <div className="relative flex-shrink-0">
            <svg width={160} height={100} viewBox="0 0 160 100">
              {/* Background arc */}
              <path d="M 10 90 A 70 70 0 0 1 150 90" fill="none" stroke="rgba(99,112,241,0.2)" strokeWidth={12} strokeLinecap="round" />
              {/* Critical threshold marker */}
              {(() => {
                const angle = Math.PI * (1 - uedp.omegaCritical);
                const x = 80 + 70 * Math.cos(Math.PI - angle);
                const y = 90 - 70 * Math.sin(Math.PI - angle);
                return <circle cx={x} cy={y} r={5} fill="#f59e0b" />;
              })()}
              {/* Omega fill arc */}
              <path d="M 10 90 A 70 70 0 0 1 150 90" fill="none"
                stroke={isStable ? "#4ade80" : "#f87171"}
                strokeWidth={12} strokeLinecap="round"
                strokeDasharray={`${circumference * uedp.omega} ${circumference}`}
                strokeDashoffset={0}
                style={{ transition: "stroke-dasharray 1s ease" }}
              />
              {/* Center value */}
              <text x={80} y={82} textAnchor="middle" fontSize={22} fontWeight={700}
                fontFamily="JetBrains Mono, monospace" fill={isStable ? "#4ade80" : "#f87171"}>
                {uedp.omega.toFixed(2)}
              </text>
              <text x={80} y={97} textAnchor="middle" fontSize={8}
                fontFamily="Cinzel, serif" fill="rgba(232,228,217,0.4)">OMEGA</text>
              {/* 1/e label */}
              <text x={80} y={35} textAnchor="middle" fontSize={8}
                fontFamily="JetBrains Mono" fill="#f59e0b">
                Critical: 1/e ≈ 0.368
              </text>
            </svg>
          </div>

          {/* Formula display */}
          <div className="flex-1 space-y-3">
            <div className="font-mono text-xs bg-black/40 rounded-lg p-3 border border-cosmos-800">
              <p className="text-cosmos-400 mb-1">UEDP V4 Core Equation:</p>
              <p className="text-gold-300">Ω = Ψ · e<sup>−λ·Iseq</sup></p>
              <p className="text-cosmos-400 mt-2">Where:</p>
              <p className="text-jade-400">Ψ = {uedp.psi.toFixed(2)} (base amplitude)</p>
              <p className="text-jade-400">λ = {uedp.lambda.toFixed(2)} (decay constant)</p>
              <p className="text-crimson-400">Iseq = {uedp.iseq.toFixed(4)}</p>
            </div>
            <div className={`rounded-lg p-2 border text-xs font-mono ${isStable ? "border-jade-400/30 bg-jade-400/10 text-jade-400" : "border-crimson-400/30 bg-crimson-400/10 text-crimson-400"}`}>
              {isStable
                ? `✓ Ω (${uedp.omega.toFixed(3)}) ≥ 1/e (${uedp.omegaCritical.toFixed(3)}) → STABLE SYSTEM`
                : `✗ Ω (${uedp.omega.toFixed(3)}) < 1/e (${uedp.omegaCritical.toFixed(3)}) → BELOW CRITICAL`}
            </div>
          </div>
        </div>
      </div>

      {/* State Sequence Table */}
      <div className="glass-card p-4">
        <h3 className="font-display text-sm tracking-widest text-gold-400 mb-3">UEDP STATE SEQUENCE — CHART PIPELINE</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-cosmos-800">
                <th className="text-left py-1 text-cosmos-400 font-display tracking-wider">STATE</th>
                <th className="text-right py-1 text-cosmos-400">VALUE</th>
                <th className="text-right py-1 text-cosmos-400">Δ</th>
                <th className="text-center py-1 text-cosmos-400">DIR</th>
                <th className="text-right py-1 text-cosmos-400">|Δ|</th>
              </tr>
            </thead>
            <tbody>
              {uedp.states.map((s, i) => (
                <tr key={i} className="border-b border-cosmos-900/50 hover:bg-cosmos-900/30">
                  <td className="py-1 text-e8e4d9">{s.label}</td>
                  <td className="text-right text-jade-400">{s.value.toFixed(2)}</td>
                  <td className={`text-right ${s.delta > 0 ? "text-jade-400" : s.delta < 0 ? "text-crimson-400" : "text-cosmos-400"}`}>
                    {s.delta.toFixed(2)}
                  </td>
                  <td className="text-center">
                    {s.direction === 1 ? <span className="text-jade-400">↑</span>
                      : s.direction === -1 ? <span className="text-crimson-400">↓</span>
                      : <span className="text-cosmos-400">→</span>}
                  </td>
                  <td className="text-right text-gold-400">{Math.abs(s.delta).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-4 text-xs font-mono text-cosmos-400">
          <span>α·Σ|Δ| = {(0.5 * uedp.states.reduce((a,s) => a + Math.abs(s.delta), 0)).toFixed(3)}</span>
          <span>β·ΣΔd = {(0.3 * uedp.reversals * 2).toFixed(3)}</span>
          <span>γ·R = {(0.2 * uedp.reversals).toFixed(3)}</span>
          <span className="text-gold-400">Iseq = {uedp.iseq.toFixed(4)}</span>
        </div>
      </div>

      {/* Timeline chart if provided */}
      {timeline && timeline.length > 0 && (
        <div className="glass-card p-4">
          <h3 className="font-display text-sm tracking-widest text-gold-400 mb-3">Ω COHERENCE TIMELINE</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline.filter((_, i) => i % 3 === 0)}>
              <defs>
                <linearGradient id="omegaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "rgba(232,228,217,0.4)", fontSize: 9 }} interval={11}
                tickFormatter={d => d.split("-")[0]} />
              <YAxis domain={[0, 1]} tick={{ fill: "rgba(232,228,217,0.4)", fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: "#0a0b1e", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8 }}
                labelStyle={{ color: "#fbbf24", fontFamily: "Cinzel, serif", fontSize: 10 }}
                itemStyle={{ color: "#4ade80", fontSize: 10 }}
                formatter={(v: number) => [v.toFixed(3), "Ω"]}
              />
              <ReferenceLine y={OMEGA_CRIT} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: "1/e", position: "right", fill: "#f59e0b", fontSize: 9 }} />
              <Area type="monotone" dataKey="omega" stroke="#4ade80" strokeWidth={1.5}
                fill="url(#omegaGrad)" dot={false} activeDot={{ r: 3, fill: "#4ade80" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}