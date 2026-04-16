import React, { useState } from "react";
import type { Prediction } from "../lib/uedpEngine";
import { OMEGA_CRIT } from "../lib/uedpEngine";

interface Props {
  predictions: Prediction[];
}

const intensityClass = {
  high: "intensity-high",
  medium: "intensity-medium",
  low: "intensity-low",
  critical: "intensity-critical",
};

const intensityLabel = {
  high: "HIGH IMPACT",
  medium: "MODERATE",
  low: "MILD",
  critical: "CRITICAL",
};

export default function PredictionsPanel({ predictions }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const domains = ["All", ...Array.from(new Set(predictions.map(p => p.domain)))];

  const filtered = filter === "All" ? predictions : predictions.filter(p => p.domain === filter);

  return (
    <div className="space-y-4">
      {/* Domain filter */}
      <div className="flex flex-wrap gap-2">
        {domains.map(d => (
          <button key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1 text-xs font-display tracking-wide rounded-full border transition-all
              ${filter === d ? "tab-active" : "border-cosmos-700 text-cosmos-400 hover:border-cosmos-500"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Predictions grid */}
      <div className="grid gap-4">
        {filtered.map(pred => (
          <div key={pred.domain}
            className={`glass-card overflow-hidden transition-all duration-300 cursor-pointer
              ${selected === pred.domain ? "ring-1 ring-gold-400/50" : "hover:border-cosmos-600"}`}
            onClick={() => setSelected(selected === pred.domain ? null : pred.domain)}>

            {/* Header */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{pred.icon}</span>
                <div>
                  <h3 className="font-display text-sm tracking-wide text-gold-300">{pred.domain}</h3>
                  <p className="text-xs text-cosmos-400 font-mono mt-0.5">Period: {pred.period}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`planet-badge text-xs ${intensityClass[pred.intensity]}`}>
                  {intensityLabel[pred.intensity]}
                </span>
                <span className="text-xs font-mono text-cosmos-500">
                  Ω {pred.omegaAtPeriod.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Omega bar */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cosmos-500 w-16">Ω level</span>
                <div className="flex-1 h-1.5 bg-cosmos-900 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(pred.omegaAtPeriod * 100, 100)}%`,
                      background: pred.omegaAtPeriod >= OMEGA_CRIT ? "#4ade80" : "#f87171"
                    }} />
                </div>
                <span className="text-xs font-mono text-cosmos-500 w-8">
                  {Math.round(pred.omegaAtPeriod * 100)}%
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="px-4 pb-3">
              <p className="text-sm font-body text-e8e4d9/80 leading-relaxed">{pred.summary}</p>
            </div>

            {/* Expanded details */}
            {selected === pred.domain && (
              <div className="border-t border-cosmos-800 p-4 space-y-4 fade-in-up">
                {/* Timeline */}
                <div>
                  <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">TIMING WINDOW</p>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono text-xs text-jade-400">{pred.startDate}</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-jade-400 to-gold-400" />
                    <span className="font-mono text-xs text-gold-400">{pred.endDate}</span>
                  </div>
                </div>

                {/* Details */}
                <div>
                  <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">PREDICTIONS</p>
                  <ul className="space-y-1">
                    {pred.details.map((d, i) => (
                      <li key={i} className="text-sm font-body flex gap-2">
                        <span className="text-gold-400 mt-0.5">◆</span>
                        <span className="text-e8e4d9/70">{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Planetary triggers */}
                <div>
                  <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">PLANETARY TRIGGERS</p>
                  <div className="flex flex-wrap gap-2">
                    {pred.planetaryTriggers.map(t => (
                      <span key={t} className="px-2 py-0.5 text-xs font-mono bg-cosmos-900 border border-cosmos-700 rounded text-cosmos-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Karma note */}
                {pred.karmaNote && (
                  <div className="bg-red-900/20 border border-crimson-400/30 rounded-lg p-3">
                    <p className="text-xs font-display tracking-widest text-crimson-400 mb-1">KARMA ALERT</p>
                    <p className="text-sm font-body text-crimson-300">{pred.karmaNote}</p>
                  </div>
                )}

                {/* UEDP formula note */}
                <div className="bg-cosmos-950/80 rounded-lg p-3 border border-cosmos-800">
                  <p className="text-xs font-mono text-cosmos-500">
                    UEDP: Ω = {pred.omegaAtPeriod.toFixed(3)} | Period coherence{" "}
                    {pred.omegaAtPeriod >= OMEGA_CRIT ? "≥ 1/e → STABLE" : "< 1/e → CAUTION"}
                  </p>
                </div>
              </div>
            )}

            {/* Expand toggle */}
            <div className="px-4 pb-3 text-right">
              <span className="text-xs text-cosmos-500 font-mono">
                {selected === pred.domain ? "▲ less" : "▼ expand"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}