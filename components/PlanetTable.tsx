import React from "react";
import type { PlanetPosition, HouseData } from "../lib/uedpEngine";

interface Props {
  planets: PlanetPosition[];
  houses: HouseData[];
  ascendantSign: string;
  ascendantDegree: number;
  ayanamsa: number;
  ayanamsaName?: string;
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#e2e8f0", Mars: "#ef4444",
  Mercury: "#6ee7b7", Jupiter: "#f59e0b", Venus: "#f9a8d4",
  Saturn: "#94a3b8", Rahu: "#c084fc", Ketu: "#fb923c"
};

const DIGNITY: Record<string, Record<string, string>> = {
  Sun: { Leo: "Own", Aries: "Exalted", Libra: "Debilitated", Aquarius: "Enemy" },
  Moon: { Cancer: "Own", Taurus: "Exalted", Scorpio: "Debilitated" },
  Mars: { Aries: "Own", Scorpio: "Own", Capricorn: "Exalted", Cancer: "Debilitated" },
  Mercury: { Gemini: "Own", Virgo: "Own+Exalted", Pisces: "Debilitated" },
  Jupiter: { Sagittarius: "Own", Pisces: "Own", Cancer: "Exalted", Capricorn: "Debilitated" },
  Venus: { Taurus: "Own", Libra: "Own", Pisces: "Exalted", Virgo: "Debilitated" },
  Saturn: { Capricorn: "Own", Aquarius: "Own", Libra: "Exalted", Aries: "Debilitated" },
};

function getDignity(planet: string, sign: string): { label: string; color: string } {
  const d = DIGNITY[planet]?.[sign];
  if (!d) return { label: "—", color: "rgba(232,228,217,0.4)" };
  if (d.includes("Exalted")) return { label: "Exalted", color: "#4ade80" };
  if (d.includes("Own")) return { label: "Own Sign", color: "#fbbf24" };
  if (d.includes("Debilitated")) return { label: "Debilitated", color: "#f87171" };
  return { label: d, color: "#8197f8" };
}

export default function PlanetTable({ planets, houses, ascendantSign, ascendantDegree, ayanamsa, ayanamsaName }: Props) {
  return (
    <div className="space-y-4">
      {/* Ascendant info */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="text-3xl">⬆</div>
        <div>
          <p className="text-xs font-display tracking-widest text-cosmos-400 mb-0.5">ASCENDANT (LAGNA)</p>
          <p className="font-display text-xl text-gold-300">{ascendantSign} {ascendantDegree.toFixed(2)}°</p>
          <p className="text-xs font-mono text-cosmos-400">{ayanamsaName || "Lahiri"} Ayanamsa: {ayanamsa.toFixed(4)}°</p>
        </div>
      </div>

      {/* Planet table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-display text-sm tracking-widest text-gold-400">PLANETARY POSITIONS (SIDEREAL)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cosmos-800">
                {["Planet", "Symbol", "Sign", "°", "House", "Nakshatra", "Pada", "Dignity", "Speed"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-display tracking-wider text-cosmos-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planets.map(p => {
                const dignity = p.dignity
                  ? (() => {
                      const d = p.dignity!;
                      if (d === "exalted")      return { label: "Exalted",      color: "#4ade80" };
                      if (d === "moolatrikona") return { label: "Moolatrikona", color: "#fbbf24" };
                      if (d === "own")          return { label: "Own Sign",     color: "#fbbf24" };
                      if (d === "debilitated")  return { label: "Debilitated",  color: "#f87171" };
                      if (d === "friend")       return { label: "Friend",       color: "#8197f8" };
                      if (d === "enemy")        return { label: "Enemy",        color: "#f97316" };
                      return { label: d.charAt(0).toUpperCase() + d.slice(1), color: "rgba(232,228,217,0.4)" };
                    })()
                  : getDignity(p.name, p.signName);
                const color = PLANET_COLORS[p.name] || "#e8e4d9";
                return (
                  <tr key={p.name} className="border-b border-cosmos-900/50 hover:bg-cosmos-900/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-display tracking-wide" style={{ color }}>{p.name}</span>
                      {p.isRetrograde && <span className="ml-1 text-xs text-gold-400 font-mono">(R)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xl" style={{ color }}>{p.symbol}</td>
                    <td className="px-3 py-2.5 text-sm font-body text-e8e4d9/80">{p.signName}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-cosmos-300">{p.degree.toFixed(2)}°</td>
                    <td className="px-3 py-2.5">
                      <span className="w-7 h-7 inline-flex items-center justify-center border border-cosmos-700 rounded text-xs font-mono text-cosmos-300">
                        {p.house}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-body text-cosmos-300">{p.nakshatra}</td>
                    <td className="px-3 py-2.5 text-xs font-mono text-cosmos-400">{p.nakshatraPada}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono" style={{ color: dignity.color }}>{dignity.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono text-cosmos-400">
                      {Math.abs(p.speed).toFixed(3)}°/d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* House lords table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="font-display text-sm tracking-widest text-gold-400">HOUSE LORDS (WHOLE SIGN)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cosmos-800">
                {["House", "Sign", "Lord", "Symbol", "Significance"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-display tracking-wider text-cosmos-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {houses.map(h => {
                const sigs: Record<number, string> = {
                  1: "Self, Personality, Health",
                  2: "Wealth, Family, Speech",
                  3: "Siblings, Courage, Communication",
                  4: "Mother, Home, Happiness",
                  5: "Children, Intelligence, Romance",
                  6: "Enemies, Debts, Illness",
                  7: "Marriage, Partnerships",
                  8: "Death, Transformation, Hidden",
                  9: "Fortune, Father, Dharma",
                  10: "Career, Status, Authority",
                  11: "Gains, Friends, Aspirations",
                  12: "Losses, Spirituality, Foreign",
                };
                return (
                  <tr key={h.house} className="border-b border-cosmos-900/50 hover:bg-cosmos-900/30">
                    <td className="px-3 py-2 text-sm font-mono text-cosmos-300">{h.house}</td>
                    <td className="px-3 py-2 text-sm font-body text-e8e4d9/80">{h.signName}</td>
                    <td className="px-3 py-2 text-sm font-display tracking-wide text-gold-300">{h.lord}</td>
                    <td className="px-3 py-2 text-lg"
                      style={{ color: PLANET_COLORS[h.lord] || "#e8e4d9" }}>{h.lordSymbol}</td>
                    <td className="px-3 py-2 text-xs font-body text-cosmos-400">{sigs[h.house]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}