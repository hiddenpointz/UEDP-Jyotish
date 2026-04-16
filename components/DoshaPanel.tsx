import React, { useState } from "react";
import type { Dosha, Parihara } from "../lib/uedpEngine";

interface Props {
  doshas: Dosha[];
  pariharas: Parihara[];
}

const severityColor = {
  severe: "#f87171",
  moderate: "#fbbf24",
  mild: "#8197f8",
  none: "#4ade80",
};

const severityBg = {
  severe: "bg-red-900/20 border-crimson-400/40",
  moderate: "bg-yellow-900/20 border-gold-400/40",
  mild: "bg-indigo-900/20 border-cosmos-500/40",
  none: "bg-green-900/20 border-jade-400/40",
};

export default function DoshaPanel({ doshas, pariharas }: Props) {
  const [tab, setTab] = useState<"doshas" | "parihara">("doshas");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex gap-2">
        {(["doshas", "parihara"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-display tracking-widest border rounded-lg transition-all ${tab === t ? "tab-active" : "border-cosmos-700 text-cosmos-400"}`}>
            {t === "doshas" ? "⚡ DOSHA DETECTION" : "🙏 PARIHARA REMEDIES"}
          </button>
        ))}
      </div>

      {tab === "doshas" && (
        <div className="space-y-3">
          {doshas.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-jade-400 font-display text-sm tracking-wide">✓ No major doshas detected in this chart</p>
              <p className="text-cosmos-400 text-xs mt-1">Chart shows balanced planetary configuration</p>
            </div>
          ) : (
            doshas.map(d => (
              <div key={d.name}
                className={`glass-card border overflow-hidden cursor-pointer transition-all ${severityBg[d.severity]}`}
                onClick={() => setSelected(selected === d.name ? null : d.name)}>
                <div className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-sm" style={{ color: severityColor[d.severity] }}>
                        {d.name}
                      </h3>
                      {d.alias && d.alias !== d.name && (
                        <span className="text-xs font-mono text-cosmos-500">({d.alias})</span>
                      )}
                      {d.isLatent && (
                        <span className="text-xs px-2 py-0.5 border border-cosmos-600 rounded-full text-cosmos-400 font-mono">
                          LATENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-cosmos-400">{d.source}</p>
                    {d.placement && (
                      <p className="text-xs font-body text-cosmos-500 mt-0.5">{d.placement}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="planet-badge" style={{
                      color: severityColor[d.severity],
                      borderColor: severityColor[d.severity] + "60",
                      background: severityColor[d.severity] + "20"
                    }}>
                      {d.severity.toUpperCase()}
                    </span>
                    <div className="mt-1 text-xs font-mono text-cosmos-400">Strength: {d.strength}</div>
                    <div className="mt-1 flex gap-1 justify-end flex-wrap">
                      {(d.planets || []).map(p => (
                        <span key={p} className="text-xs font-mono text-cosmos-400">{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {selected === d.name && (
                  <div className="border-t border-cosmos-800 p-4 space-y-3 fade-in-up">
                    {d.description && (
                      <div className="bg-cosmos-900/40 rounded p-2 border border-cosmos-800">
                        <p className="text-xs font-body text-cosmos-300 leading-relaxed">{d.description}</p>
                      </div>
                    )}
                    {(d.houses || []).length > 0 && (
                      <div>
                        <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">HOUSES AFFECTED</p>
                        <div className="flex gap-2 flex-wrap">
                          {d.houses.map(h => (
                            <span key={h} className="w-7 h-7 flex items-center justify-center border border-cosmos-700 rounded text-xs font-mono text-cosmos-300">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(d.lifeAreas || []).length > 0 && (
                      <div>
                        <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">LIFE AREAS</p>
                        <div className="flex gap-2 flex-wrap">
                          {d.lifeAreas.map(la => (
                            <span key={la} className="px-2 py-0.5 text-xs font-mono bg-cosmos-900 border border-cosmos-700 rounded text-cosmos-300">{la}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">EFFECTS</p>
                      <ul className="space-y-1">
                        {(d.effects || []).map((e, i) => (
                          <li key={i} className="text-sm font-body flex gap-2">
                            <span style={{ color: severityColor[d.severity] }}>◆</span>
                            <span className="text-e8e4d9/70">{e}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {d.isLatent && (
                      <div className="bg-cosmos-900/60 rounded p-2 border border-cosmos-700">
                        <p className="text-xs font-mono text-cosmos-400">
                          ⚠ LATENT DOSHA: Dormant but may activate during specific dasha/transit periods. Monitor Rahu-Ketu cycles and Jupiter transits.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "parihara" && (
        <div className="space-y-4">
          {pariharas.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <p className="text-jade-400 font-display text-sm">No pariharas required</p>
            </div>
          ) : (
            pariharas.map(p => (
              <div key={p.dosha} className="glass-card overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-cosmos-950/80 to-transparent">
                  <h3 className="font-display text-sm text-gold-300 tracking-wide">{p.dosha}</h3>
                  <p className="text-xs font-mono text-cosmos-400 mt-0.5">{p.source}</p>
                </div>

                <div className="p-4 grid md:grid-cols-2 gap-4">
                  {/* Remedy */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-display tracking-widest text-gold-400 mb-1">REMEDY</p>
                      <p className="text-sm font-body text-e8e4d9/80">{p.remedy}</p>
                    </div>
                    <div>
                      <p className="text-xs font-display tracking-widest text-gold-400 mb-1">RITUAL (VIDHI)</p>
                      <p className="text-sm font-body text-e8e4d9/70 leading-relaxed">{p.ritual}</p>
                    </div>
                    <div>
                      <p className="text-xs font-display tracking-widest text-gold-400 mb-1">DEITY</p>
                      <p className="text-sm font-body text-cosmos-300">{p.deity}</p>
                    </div>
                  </div>

                  {/* Mantra + Daan + Timing */}
                  <div className="space-y-3">
                    <div className="bg-black/40 rounded-lg p-3 border border-cosmos-800">
                      <p className="text-xs font-display tracking-widest text-cosmos-400 mb-1">MANTRA</p>
                      <p className="text-sm font-body text-jade-300 leading-relaxed">{p.mantra}</p>
                    </div>
                    <div>
                      <p className="text-xs font-display tracking-widest text-gold-400 mb-1">DAAN (DONATION)</p>
                      <p className="text-sm font-body text-e8e4d9/70">{p.daan}</p>
                    </div>
                    <div>
                      <p className="text-xs font-display tracking-widest text-gold-400 mb-1">AUSPICIOUS TIMING</p>
                      <p className="text-sm font-mono text-cosmos-300 text-xs">{p.timing}</p>
                    </div>
                  </div>
                </div>

                {/* Karma Barrier */}
                {p.karmaBarrier && (
                  <div className="mx-4 mb-3 bg-red-900/20 border border-crimson-400/30 rounded-lg p-3">
                    <p className="text-xs font-display tracking-widest text-crimson-400 mb-2">
                      ⚠ WHY PARIHARA MAY NOT WORK — KARMA BARRIER
                    </p>
                    <p className="text-xs font-body text-crimson-300 leading-relaxed">{p.karmaBarrier}</p>
                  </div>
                )}

                {/* Karma Override */}
                {p.karmaOverride && (
                  <div className="mx-4 mb-4 bg-jade-400/10 border border-jade-400/30 rounded-lg p-3">
                    <p className="text-xs font-display tracking-widest text-jade-400 mb-2">
                      ✦ HOW TO OVERRIDE KARMA — DEEP CORRECTION
                    </p>
                    <p className="text-xs font-body text-jade-300 leading-relaxed">{p.karmaOverride}</p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* General Karma disclaimer */}
          <div className="glass-card-dark p-4 border border-cosmos-800">
            <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">ATHARVA VEDA PRINCIPLE ON KARMA & REMEDIES</p>
            <p className="text-xs font-body text-cosmos-400 leading-relaxed italic">
              "Na karma dosha nashyati bina karma-phalasya bhoktrithvam" — No dosha dissolves without experiencing its karmic fruit. Remedies (pariharas) act as karma-mitigation agents — they reduce the severity and timing of karma manifestation, but cannot eliminate karma that has already ripened (prarabdha karma). Only karma in seed form (sanchita) can be fully neutralized. The UEDP coherence metric Ω directly represents the karma field coherence — when Ω is below 1/e, the karma field is turbulent and remedies have reduced binding power.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}