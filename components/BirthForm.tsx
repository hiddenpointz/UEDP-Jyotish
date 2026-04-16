import React, { useState } from "react";
import type { BirthData } from "../lib/uedpEngine";

interface Props {
  onSubmit: (data: BirthData) => void;
  loading: boolean;
}

const TIMEZONES = [
  { label: "IST (India) UTC+5:30", value: 5.5 },
  { label: "UTC+0:00 (London)", value: 0 },
  { label: "UTC+5:00 (Pakistan)", value: 5 },
  { label: "UTC+6:00 (Bangladesh)", value: 6 },
  { label: "UTC+8:00 (Singapore)", value: 8 },
  { label: "UTC-5:00 (New York EST)", value: -5 },
  { label: "UTC-8:00 (Los Angeles PST)", value: -8 },
  { label: "UTC+1:00 (Paris CET)", value: 1 },
  { label: "UTC+3:00 (Dubai)", value: 3 },
  { label: "UTC+4:00 (Mauritius)", value: 4 },
  { label: "UTC+7:00 (Bangkok)", value: 7 },
];

export default function BirthForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<BirthData>({
    name: "",
    day: 14,
    month: 4,
    year: 1969,
    hour: 10,
    minute: 30,
    second: 0,
    latitude: 13.0827,
    longitude: 80.2707,
    timezone: 5.5,
    gender: "male",
    place: "Chennai",
    ayanamsa: "lahiri",
  });

  const set = (k: keyof BirthData, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const field = "w-full px-3 py-2 text-sm font-mono";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Gender */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">NATIVE NAME</label>
          <input className={field} type="text" placeholder="Full Name"
            value={form.name} onChange={e => set("name", e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">GENDER</label>
          <select className={field} value={form.gender} onChange={e => set("gender", e.target.value as any)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">BIRTH DATE</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <input className={field} type="number" placeholder="Day (1-31)"
              min={1} max={31} value={form.day}
              onChange={e => set("day", parseInt(e.target.value))} required />
          </div>
          <div>
            <select className={field} value={form.month} onChange={e => set("month", parseInt(e.target.value))}>
              {["January","February","March","April","May","June","July","August","September","October","November","December"]
                .map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <input className={field} type="number" placeholder="Year"
              min={1900} max={2050} value={form.year}
              onChange={e => set("year", parseInt(e.target.value))} required />
          </div>
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">BIRTH TIME (LOCAL)</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <input className={field} type="number" placeholder="Hour (0-23)"
              min={0} max={23} value={form.hour}
              onChange={e => set("hour", parseInt(e.target.value))} required />
          </div>
          <div>
            <input className={field} type="number" placeholder="Minute (0-59)"
              min={0} max={59} value={form.minute}
              onChange={e => set("minute", parseInt(e.target.value))} required />
          </div>
          <div>
            <input className={field} type="number" placeholder="Second (0-59)"
              min={0} max={59} value={form.second}
              onChange={e => set("second", parseInt(e.target.value))} />
          </div>
        </div>
        <p className="text-xs text-cosmos-400 mt-1 font-body italic">
          ⚠️ Accuracy of Ascendant (Lagna) depends on precise birth time. Each 4 minutes changes degree by ~1°.
        </p>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">BIRTH LOCATION</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input className={field} type="number" step="0.0001" placeholder="Latitude (e.g. 13.0827)"
              value={form.latitude} onChange={e => set("latitude", parseFloat(e.target.value))} required />
            <p className="text-xs text-cosmos-400 mt-1">Latitude (N positive)</p>
          </div>
          <div>
            <input className={field} type="number" step="0.0001" placeholder="Longitude (e.g. 80.2707)"
              value={form.longitude} onChange={e => set("longitude", parseFloat(e.target.value))} required />
            <p className="text-xs text-cosmos-400 mt-1">Longitude (E positive)</p>
          </div>
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">TIME ZONE</label>
        <select className={field} value={form.timezone}
          onChange={e => set("timezone", parseFloat(e.target.value))}>
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Place */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">BIRTH PLACE (NAME)</label>
        <input className={field} type="text" placeholder="e.g. Chennai, India"
          value={form.place || ""} onChange={e => set("place", e.target.value)} />
      </div>

      {/* Ayanamsa */}
      <div>
        <label className="block text-xs font-display tracking-widest text-gold-400 mb-1">AYANAMSA SYSTEM</label>
        <select className={field} value={form.ayanamsa || "lahiri"}
          onChange={e => set("ayanamsa", e.target.value)}>
          <option value="lahiri">Lahiri (IAU) — Default</option>
          <option value="raman">B.V. Raman</option>
          <option value="kp">KP (Krishnamurti)</option>
          <option value="yukteshwar">Yukteshwar</option>
          <option value="true_chitrapaksha">True Chitra Paksha</option>
          <option value="jn_bhasin">J.N. Bhasin</option>
        </select>
      </div>


      <div>
        <p className="text-xs font-display tracking-widest text-cosmos-400 mb-2">QUICK LOCATION PRESETS</p>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Chennai", lat: 13.0827, lon: 80.2707, tz: 5.5 },
            { name: "Mumbai", lat: 19.0760, lon: 72.8777, tz: 5.5 },
            { name: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 },
            { name: "Bengaluru", lat: 12.9716, lon: 77.5946, tz: 5.5 },
            { name: "Kolkata", lat: 22.5726, lon: 88.3639, tz: 5.5 },
          ].map(city => (
            <button key={city.name} type="button"
              onClick={() => setForm(f => ({ ...f, latitude: city.lat, longitude: city.lon, timezone: city.tz, place: city.name }))}
              className="px-3 py-1 text-xs font-mono border border-cosmos-700 rounded-full hover:border-gold-400 hover:text-gold-400 transition-all">
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading}
        className="w-full py-4 font-display tracking-widest text-sm uppercase
          bg-gradient-to-r from-cosmos-800 via-cosmos-700 to-cosmos-800
          border border-gold-500/40 rounded-xl hover:border-gold-400 hover:glow-gold
          transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
          text-gold-300 hover:text-gold-200">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            Computing UEDP Horoscope...
          </span>
        ) : "⟳ Compute UEDP V4 Horoscope"}
      </button>
    </form>
  );
}