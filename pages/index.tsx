import React, { useState, useCallback } from "react";
import Head from "next/head";
import BirthForm from "../components/BirthForm";
import HoroscopeWheel from "../components/HoroscopeWheel";
import UEDPDashboard from "../components/UEDPDashboard";
import PredictionsPanel from "../components/PredictionsPanel";
import DoshaPanel from "../components/DoshaPanel";
import PlanetTable from "../components/PlanetTable";
import {
  computeHoroscope, computeOmegaTimeline, detectDoshas,
  generatePariharas, generatePredictions,
  type BirthData, type HoroscopeData, type Prediction,
  type Dosha, type Parihara,
} from "../lib/uedpEngine";

type Tab = "chart" | "uedp" | "planets" | "predictions" | "dosha";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chart", label: "Horoscope", icon: "🌐" },
  { id: "uedp", label: "UEDP V4", icon: "Ω" },
  { id: "planets", label: "Planets", icon: "🪐" },
  { id: "predictions", label: "Predictions", icon: "🔮" },
  { id: "dosha", label: "Dosha / Parihara", icon: "⚡" },
];

interface Result {
  chart: HoroscopeData;
  predictions: Prediction[];
  doshas: Dosha[];
  pariharas: Parihara[];
  timeline: ReturnType<typeof computeOmegaTimeline>;
  birth: BirthData;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [tab, setTab] = useState<Tab>("chart");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback((birth: BirthData) => {
    setLoading(true);
    setError(null);
    try {
      // All computation is client-side (pure math)
      const chart = computeHoroscope(birth);
      const doshas = detectDoshas(chart);
      const pariharas = generatePariharas(doshas, chart);
      const predictions = generatePredictions(birth, chart);
      const currentYear = new Date().getFullYear();
      const birthYear = birth.year;
      const timeline = computeOmegaTimeline(birth, Math.max(birthYear, currentYear - 10), currentYear + 15);
      setResult({ chart, predictions, doshas, pariharas, timeline, birth });
      setTab("chart");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <Head>
        <title>UEDP V4 Jyotish — Vedic Horoscope Engine</title>
        <meta name="description" content="UEDP Protocol V4 (G.S. Ramesh Kumar) applied to Vedic astrology: precise horoscope, dosha detection, karma-aware pariharas, and timeline predictions based on Surya Siddhanta & Atharva Veda." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        {/* Header */}
        <header className="relative border-b border-cosmos-900/60 bg-black/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl md:text-2xl text-gold-300 tracking-wider text-glow-gold">
                UEDP V4 · Jyotish
              </h1>
              <p className="text-xs font-mono text-cosmos-400 mt-0.5">
                Ω Coherence Field · Surya Siddhanta · Atharva Veda
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs font-mono text-cosmos-500">
              <span className="px-2 py-1 border border-cosmos-800 rounded">G.S. Ramesh Kumar Protocol</span>
              <span className="px-2 py-1 border border-cosmos-800 rounded">Lahiri Ayanamsa</span>
              <span className="px-2 py-1 border border-gold-500/30 text-gold-500 rounded">V4.0</span>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className={`grid gap-8 ${result ? "lg:grid-cols-[380px_1fr]" : "max-w-2xl mx-auto"}`}>

            {/* Left Panel — Birth Form */}
            <div className="space-y-4">
              {/* Protocol explanation card */}
              {!result && (
                <div className="glass-card p-5 space-y-3 fade-in-up">
                  <h2 className="font-display text-base tracking-wide text-gold-300">
                    UEDP V4 Horoscope Protocol
                  </h2>
                  <p className="text-sm font-body text-cosmos-300 leading-relaxed">
                    This engine applies <strong className="text-gold-300">G.S. Ramesh Kumar's UEDP Protocol Version 4</strong> to
                    each computational step of Vedic horoscope construction — from birth data to planetary placement.
                  </p>
                  <div className="space-y-2 text-xs font-mono text-cosmos-400">
                    {[
                      ["Ω = Ψ·e^(−λ·Iseq)", "Coherence field equation"],
                      ["Iseq = α·Σ|Δⱼ| + β·Σ|dⱼ−dⱼ₋₁| + γ·R", "Instability sequence"],
                      ["METP = Σ Ωⱼ⁻¹·|Δⱼ|", "Minimum effort transition path"],
                      ["Ω ≥ 1/e", "Stability threshold"],
                    ].map(([eq, label]) => (
                      <div key={eq} className="flex gap-2 items-start">
                        <span className="text-gold-400 mt-0.5">◆</span>
                        <div>
                          <span className="text-jade-400">{eq}</span>
                          <span className="text-cosmos-500 ml-2">— {label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-cosmos-800 space-y-1">
                    {[
                      "Planetary positions via Keplerian orbital mechanics",
                      "Lahiri Ayanamsa for tropical → sidereal conversion",
                      "Whole sign house system (standard Vedic)",
                      "Dosha detection per Surya Siddhanta & Atharva Veda",
                      "Karma-aware parihara with UEDP barrier analysis",
                    ].map(f => (
                      <p key={f} className="text-xs font-body text-cosmos-400 flex gap-2">
                        <span className="text-cosmos-600">✓</span>{f}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="glass-card p-5">
                <h2 className="font-display text-sm tracking-widest text-gold-400 mb-4">
                  BIRTH DATA INPUT
                </h2>
                <BirthForm onSubmit={handleSubmit} loading={loading} />
              </div>

              {error && (
                <div className="glass-card border border-crimson-400/40 p-4">
                  <p className="text-crimson-400 text-sm font-mono">Error: {error}</p>
                </div>
              )}

              {/* Result summary sidebar */}
              {result && (
                <div className="glass-card p-4 space-y-3 fade-in-up">
                  <h3 className="font-display text-xs tracking-widest text-cosmos-400">CHART SUMMARY</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Native</span>
                      <span className="text-gold-300">{result.birth.name || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Lagna</span>
                      <span className="text-gold-300">{result.chart.ascendantSign} {result.chart.ascendantDegree.toFixed(1)}°</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Ayanamsa</span>
                      <span className="text-cosmos-300">{result.chart.ayanamsa.toFixed(3)}°</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Julian Day</span>
                      <span className="text-cosmos-300">{result.chart.julianDay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Coherence Ω</span>
                      <span className={result.chart.uedp.isStable ? "text-jade-400" : "text-crimson-400"}>
                        {result.chart.uedp.omega.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Instability Iseq</span>
                      <span className="text-gold-400">{result.chart.uedp.iseq.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">System Status</span>
                      <span className={result.chart.uedp.isStable ? "text-jade-400" : "text-crimson-400"}>
                        {result.chart.uedp.isStable ? "STABLE" : "BELOW THRESHOLD"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-cosmos-500">Doshas</span>
                      <span className="text-crimson-400">{result.doshas.filter(d => d.present).length} detected</span>
                    </div>
                  </div>
                  {/* Planet quick view */}
                  <div className="pt-2 border-t border-cosmos-800">
                    <p className="text-xs font-display tracking-widest text-cosmos-500 mb-2">GRAHAS</p>
                    <div className="space-y-1">
                      {result.chart.planets.map(p => (
                        <div key={p.name} className="flex justify-between text-xs font-mono">
                          <span className="text-cosmos-400">{p.symbol} {p.name}</span>
                          <span className="text-cosmos-300">
                            {p.signName.slice(0, 3)} {p.degree.toFixed(1)}° H{p.house}
                            {p.isRetrograde ? " (R)" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel — Results */}
            {result && (
              <div className="space-y-4 fade-in-up">
                {/* Tab navigation */}
                <div className="flex flex-wrap gap-2">
                  {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className={`px-4 py-2 text-xs font-display tracking-wide border rounded-lg transition-all
                        ${tab === t.id ? "tab-active" : "border-cosmos-700 text-cosmos-400 hover:border-cosmos-500 hover:text-cosmos-200"}`}>
                      <span className="mr-1">{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="fade-in-up-delay-1">
                  {tab === "chart" && (
                    <div className="space-y-4">
                      <div className="glass-card p-4">
                        <h2 className="font-display text-sm tracking-widest text-gold-400 mb-4">
                          VEDIC BIRTH CHART — {result.birth.name?.toUpperCase() || "NATIVE"}
                        </h2>
                        <HoroscopeWheel chart={result.chart} />
                      </div>
                      {/* UEDP quick read */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Ω Coherence", value: result.chart.uedp.omega.toFixed(3), color: result.chart.uedp.isStable ? "#4ade80" : "#f87171" },
                          { label: "Instability", value: result.chart.uedp.iseq.toFixed(3), color: "#fbbf24" },
                          { label: "Reversals", value: result.chart.uedp.reversals.toString(), color: "#8197f8" },
                          { label: "METP", value: result.chart.uedp.metp.toFixed(2), color: "#f9a8d4" },
                        ].map(m => (
                          <div key={m.label} className="glass-card p-3 text-center">
                            <p className="text-xs font-display tracking-wide text-cosmos-500 mb-1">{m.label}</p>
                            <p className="text-xl font-mono font-bold" style={{ color: m.color }}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tab === "uedp" && (
                    <UEDPDashboard
                      uedp={result.chart.uedp}
                      timeline={result.timeline}
                    />
                  )}

                  {tab === "planets" && (
                    <PlanetTable
                      planets={result.chart.planets}
                      houses={result.chart.houses}
                      ascendantSign={result.chart.ascendantSign}
                      ascendantDegree={result.chart.ascendantDegree}
                      ayanamsa={result.chart.ayanamsa}
                    />
                  )}

                  {tab === "predictions" && (
                    <div className="space-y-4">
                      <div className="glass-card p-4">
                        <h2 className="font-display text-sm tracking-widest text-gold-400 mb-1">
                          UEDP V4 TIMELINE PREDICTIONS
                        </h2>
                        <p className="text-xs font-body text-cosmos-400">
                          Predictions derived from Saturn & Jupiter transit cycles mapped to UEDP coherence Ω projections.
                          Each period includes date ranges, planetary triggers, and Ω at that window.
                        </p>
                      </div>
                      <PredictionsPanel predictions={result.predictions} />
                    </div>
                  )}

                  {tab === "dosha" && (
                    <div className="space-y-4">
                      <div className="glass-card p-4">
                        <h2 className="font-display text-sm tracking-widest text-gold-400 mb-1">
                          DOSHA ANALYSIS & PARIHARA
                        </h2>
                        <p className="text-xs font-body text-cosmos-400">
                          Dosha detection per Surya Siddhanta. Pariharas sourced from Atharva Veda with UEDP karma-barrier
                          analysis — explaining <em>why a remedy may not work</em> and <em>how to override karma</em>.
                        </p>
                      </div>
                      <DoshaPanel doshas={result.doshas} pariharas={result.pariharas} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No result — feature cards */}
            {!result && (
              <div className="hidden lg:block" />
            )}
          </div>

          {/* Feature showcase when no result */}
          {!result && (
            <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto fade-in-up-delay-2">
              {[
                {
                  icon: "Ω",
                  title: "UEDP V4 Coherence Field",
                  desc: "Every step of chart construction is modeled as a UEDP state transition. The coherence field Ω tracks system stability through the entire computation pipeline.",
                  color: "#8197f8",
                },
                {
                  icon: "⚡",
                  title: "Dosha & Karma Analysis",
                  desc: "Mangal, Kaal Sarp, Pitra, Sade Sati, Grahan, and Kemdrum doshas detected. Each parihara includes UEDP-based karma barrier analysis — why it may not work and how to change it.",
                  color: "#f87171",
                },
                {
                  icon: "🔮",
                  title: "Timeline Predictions",
                  desc: "Date-specific predictions for business, politics, branding, marriage, children, and wealth — derived from Saturn/Jupiter transit windows mapped to Ω projections.",
                  color: "#fbbf24",
                },
              ].map(f => (
                <div key={f.title} className="glass-card p-5 space-y-3">
                  <div className="text-3xl font-display" style={{ color: f.color }}>{f.icon}</div>
                  <h3 className="font-display text-sm tracking-wide" style={{ color: f.color }}>{f.title}</h3>
                  <p className="text-sm font-body text-cosmos-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-cosmos-900/40 py-6 text-center">
          <p className="text-xs font-mono text-cosmos-600">
            UEDP Protocol V4 · G.S. Ramesh Kumar · Surya Siddhanta · Atharva Veda
          </p>
          <p className="text-xs font-body text-cosmos-700 mt-1">
            For research and study purposes. Consult a qualified Jyotisha for personal guidance.
          </p>
        </footer>
      </div>
    </>
  );
}
