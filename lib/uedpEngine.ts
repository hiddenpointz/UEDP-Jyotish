// ============================================================
// UEDP V4 ENGINE — G.S. Ramesh Kumar Protocol
// Fused with Surya Siddhanta & Swiss Ephemeris approximations
// ============================================================

export interface BirthData {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  second: number;
  latitude: number;
  longitude: number;
  timezone: number; // offset in hours e.g. +5.5
  name: string;
  gender: "male" | "female" | "other";
}

export interface PlanetPosition {
  name: string;
  symbol: string;
  longitude: number; // 0–360
  sign: number; // 0–11
  signName: string;
  degree: number; // within sign
  house: number; // 1–12
  isRetrograde: boolean;
  speed: number; // degrees/day
  nakshatra: string;
  nakshatraPada: number;
}

export interface UEDPState {
  label: string;
  value: number;
  delta: number;
  direction: -1 | 0 | 1;
}

export interface UEDPMetrics {
  states: UEDPState[];
  iseq: number; // Instability sequence
  omega: number; // Coherence field Ω
  psi: number; // Base amplitude
  lambda: number; // Decay constant
  omegaCritical: number; // 1/e ≈ 0.368
  isStable: boolean;
  metp: number; // Minimum Effort Transition Path
  reversals: number;
}

export interface HouseData {
  house: number;
  sign: number;
  signName: string;
  degree: number;
  lord: string;
  lordSymbol: string;
}

export interface HoroscopeData {
  planets: PlanetPosition[];
  houses: HouseData[];
  ascendant: number;
  ascendantSign: string;
  ascendantDegree: number;
  julianDay: number;
  localSiderealTime: number;
  ayanamsa: number;
  uedp: UEDPMetrics;
}

export interface Prediction {
  domain: string;
  icon: string;
  period: string;
  startDate: string;
  endDate: string;
  intensity: "high" | "medium" | "low" | "critical";
  omegaAtPeriod: number;
  summary: string;
  details: string[];
  planetaryTriggers: string[];
  karmaNote?: string;
}

export interface Dosha {
  name: string;
  present: boolean;
  severity: "severe" | "moderate" | "mild" | "none";
  planets: string[];
  houses: number[];
  effects: string[];
  isLatent: boolean;
  source: string; // e.g. Surya Siddhanta / Atharva Veda
}

export interface Parihara {
  dosha: string;
  remedy: string;
  ritual: string;
  mantra: string;
  deity: string;
  daan: string;
  timing: string;
  karmaBarrier?: string; // why it may not work
  karmaOverride?: string; // how to overcome karma
  source: string;
}

// ============================================================
// CONSTANTS
// ============================================================
const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const SIGN_LORDS: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter"
};

const SIGN_LORD_SYMBOLS: Record<string, string> = {
  Mars: "♂", Venus: "♀", Mercury: "☿", Moon: "☽", Sun: "☉",
  Jupiter: "♃", Saturn: "♄", Rahu: "☊", Ketu: "☋"
};

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mars: "♂", Mercury: "☿", Jupiter: "♃",
  Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋"
};

const E = Math.E;
const OMEGA_CRITICAL = 1 / E; // ≈ 0.3679

// ============================================================
// STEP 1: Julian Day Number (from Surya Siddhanta approach)
// ============================================================
export function toJulianDay(data: BirthData): number {
  const { day, month, year, hour, minute, second, timezone } = data;
  const utHours = hour + minute / 60 + second / 3600 - timezone;
  let Y = year;
  let M = month;
  const D = day;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5 + utHours / 24;
}

// ============================================================
// STEP 2: Ayanamsa (Lahiri — standard Vedic)
// ============================================================
export function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000
  return 23.85 + 0.013972 * (jd - 2415020.5) / 365.25;
  // Simplified Lahiri; precise formula:
  // return 23.452294 + 0.0130125 * T + 0.00000164 * T * T;
}

// ============================================================
// STEP 3: Kepler's Equation (UEDP embedded iteration tracker)
// ============================================================
export function solveKepler(M: number, e: number): { E: number; iseqKepler: number } {
  let Eval = M;
  let iseqKepler = 0;
  const iterations: number[] = [Eval];
  for (let i = 0; i < 50; i++) {
    const Enew = M + e * Math.sin(Eval);
    iseqKepler += Math.abs(Enew - Eval);
    Eval = Enew;
    iterations.push(Eval);
    if (Math.abs(Enew - iterations[i]) < 1e-10) break;
  }
  return { E: Eval, iseqKepler };
}

// ============================================================
// STEP 4: Planet Positions (Keplerian approximations for 9 Vedic grahas)
// Uses mean orbital elements referred to J2000.0
// ============================================================
interface OrbitalElements {
  L0: number; // mean longitude deg
  Ldot: number; // deg/day
  e: number; // eccentricity
  a: number; // semi-major axis AU
  i: number; // inclination
  omega: number; // argument of perihelion
  Omega: number; // longitude of ascending node
}

const ORBITAL_ELEMENTS: Record<string, OrbitalElements> = {
  Sun: { L0: 280.46646, Ldot: 0.9856474, e: 0.016708634, a: 1.0, i: 0.00005, omega: 102.93735, Omega: 0 },
  Moon: { L0: 218.3165, Ldot: 13.1763966, e: 0.0549, a: 0.00257, i: 5.1454, omega: 318.51, Omega: 125.0445 },
  Mars: { L0: 355.433, Ldot: 0.5240207, e: 0.0934, a: 1.524, i: 1.850, omega: 286.502, Omega: 49.558 },
  Mercury: { L0: 252.251, Ldot: 4.0923344, e: 0.2056, a: 0.387, i: 7.005, omega: 29.124, Omega: 48.331 },
  Jupiter: { L0: 34.396, Ldot: 0.0830853, e: 0.0489, a: 5.203, i: 1.303, omega: 273.867, Omega: 100.464 },
  Venus: { L0: 181.979, Ldot: 1.6021302, e: 0.0068, a: 0.723, i: 3.395, omega: 54.884, Omega: 76.680 },
  Saturn: { L0: 50.077, Ldot: 0.0334442, e: 0.0565, a: 9.537, i: 2.485, omega: 339.392, Omega: 113.665 },
};

function getPlanetTropicalLongitude(planet: string, jd: number): { lon: number; speed: number; retrograde: boolean } {
  const d = jd - 2451545.0; // days from J2000
  const el = ORBITAL_ELEMENTS[planet];
  if (!el) return { lon: 0, speed: 0, retrograde: false };

  const L = (el.L0 + el.Ldot * d) % 360;
  const M_mean = (L - el.omega + 360) % 360;
  const M_rad = (M_mean * Math.PI) / 180;
  const { E } = solveKepler(M_rad, el.e);
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + el.e) * Math.sin(E / 2),
    Math.sqrt(1 - el.e) * Math.cos(E / 2)
  );
  const nu_deg = ((nu * 180) / Math.PI + 360) % 360;
  const lon = (nu_deg + el.omega) % 360;

  // Speed approximation
  const speed = el.Ldot * (1 - el.e * Math.cos(E));
  const retrograde = speed < 0;

  return { lon, speed, retrograde };
}

// Rahu/Ketu: mean nodes (simplified)
function getRahuLongitude(jd: number): number {
  const d = jd - 2451545.0;
  return (125.0445 - 0.052954 * d + 360) % 360;
}

// ============================================================
// STEP 5: Local Sidereal Time + Ascendant
// ============================================================
function getGST(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const GST = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T;
  return ((GST % 360) + 360) % 360;
}

function getLST(jd: number, longitude: number): number {
  return (getGST(jd) + longitude) % 360;
}

function getAscendant(lst_deg: number, latitude: number): number {
  const epsilon = 23.4392911; // Earth axial tilt
  const eps_rad = (epsilon * Math.PI) / 180;
  const lst_rad = (lst_deg * Math.PI) / 180;
  const lat_rad = (latitude * Math.PI) / 180;
  const asc_rad = Math.atan2(
    Math.cos(lst_rad),
    -(Math.sin(lst_rad) * Math.cos(eps_rad) + Math.tan(lat_rad) * Math.sin(eps_rad))
  );
  return ((asc_rad * 180) / Math.PI + 360) % 360;
}

// ============================================================
// STEP 6: Sidereal Conversion + Nakshatra
// ============================================================
function toSidereal(tropLon: number, ayanamsa: number): number {
  return ((tropLon - ayanamsa) % 360 + 360) % 360;
}

function getNakshatra(lon: number): { nakshatra: string; pada: number } {
  const idx = Math.floor((lon / 360) * 27);
  const pada = Math.floor(((lon % (360 / 27)) / (360 / 27 / 4))) + 1;
  return { nakshatra: NAKSHATRAS[idx % 27], pada: Math.min(pada, 4) };
}

// ============================================================
// STEP 7: House System (Whole Sign — standard Vedic)
// ============================================================
function getHouses(ascSidereal: number): HouseData[] {
  const ascSign = Math.floor(ascSidereal / 30);
  return Array.from({ length: 12 }, (_, i) => {
    const sign = (ascSign + i) % 12;
    const lord = SIGN_LORDS[SIGNS[sign]];
    return {
      house: i + 1,
      sign,
      signName: SIGNS[sign],
      degree: ascSidereal % 30,
      lord,
      lordSymbol: SIGN_LORD_SYMBOLS[lord] || "?",
    };
  });
}

function getPlanetHouse(planetSign: number, ascSign: number): number {
  return ((planetSign - ascSign + 12) % 12) + 1;
}

// ============================================================
// UEDP V4 CORE — Compute Instability & Coherence
// ============================================================
export function computeUEDP(states: UEDPState[], alpha = 0.5, beta = 0.3, gamma = 0.2): UEDPMetrics {
  const deltas = states.map(s => s.delta);
  const directions = states.map(s => s.direction);

  let reversals = 0;
  for (let i = 1; i < directions.length; i++) {
    if (directions[i] !== 0 && directions[i - 1] !== 0 && directions[i] !== directions[i - 1]) {
      reversals++;
    }
  }

  const sumMagnitude = deltas.reduce((acc, d) => acc + Math.abs(d), 0);
  let dirChange = 0;
  for (let i = 1; i < directions.length; i++) {
    dirChange += Math.abs(directions[i] - directions[i - 1]);
  }

  const iseq = alpha * sumMagnitude + beta * dirChange + gamma * reversals;
  const psi = 1.0;
  const lambda = 0.5;
  const omega = psi * Math.exp(-lambda * iseq);
  const isStable = omega >= OMEGA_CRITICAL;

  let metp = 0;
  for (let i = 0; i < states.length; i++) {
    const localOmega = psi * Math.exp(-lambda * Math.abs(deltas[i]));
    metp += (1 / (localOmega + 1e-9)) * Math.abs(deltas[i]);
  }

  return {
    states, iseq, omega, psi, lambda, omegaCritical: OMEGA_CRITICAL,
    isStable, metp, reversals,
  };
}

// Build UEDP states from chart pipeline steps
function buildChartUEDPStates(
  jd: number, lst: number, ascTrop: number, ascSid: number,
  planets: PlanetPosition[], ayanamsa: number
): UEDPState[] {
  const raw = [
    { label: "Julian Day", value: jd % 1000 },
    { label: "Local Sidereal Time", value: lst },
    { label: "Ascendant (Tropical)", value: ascTrop },
    { label: "Ayanamsa", value: ayanamsa },
    { label: "Ascendant (Sidereal)", value: ascSid },
    ...planets.map(p => ({ label: p.name, value: p.longitude })),
  ];

  return raw.map((item, i) => {
    const prev = i === 0 ? item.value : raw[i - 1].value;
    const delta = item.value - prev;
    const direction: -1 | 0 | 1 = delta > 0.001 ? 1 : delta < -0.001 ? -1 : 0;
    return { label: item.label, value: item.value, delta, direction };
  });
}

// ============================================================
// MAIN: Compute Full Horoscope
// ============================================================
export function computeHoroscope(birth: BirthData): HoroscopeData {
  const jd = toJulianDay(birth);
  const ayanamsa = getLahiriAyanamsa(jd);
  const lst = getLST(jd, birth.longitude);
  const ascTrop = getAscendant(lst, birth.latitude);
  const ascSid = toSidereal(ascTrop, ayanamsa);
  const ascSign = Math.floor(ascSid / 30);

  const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const planets: PlanetPosition[] = planetNames.map(name => {
    const { lon: tropLon, speed, retrograde } = getPlanetTropicalLongitude(name, jd);
    const sidLon = toSidereal(tropLon, ayanamsa);
    const sign = Math.floor(sidLon / 30);
    const { nakshatra, pada } = getNakshatra(sidLon);
    return {
      name, symbol: PLANET_SYMBOLS[name] || name,
      longitude: sidLon, sign, signName: SIGNS[sign],
      degree: sidLon % 30,
      house: getPlanetHouse(sign, ascSign),
      isRetrograde: retrograde, speed,
      nakshatra, nakshatraPada: pada,
    };
  });

  // Add Rahu/Ketu
  const rahuLon = toSidereal(getRahuLongitude(jd), ayanamsa);
  const ketuLon = (rahuLon + 180) % 360;
  planets.push({
    name: "Rahu", symbol: "☊", longitude: rahuLon, sign: Math.floor(rahuLon / 30),
    signName: SIGNS[Math.floor(rahuLon / 30)], degree: rahuLon % 30,
    house: getPlanetHouse(Math.floor(rahuLon / 30), ascSign),
    isRetrograde: true, speed: -0.053,
    ...getNakshatra(rahuLon), nakshatraPada: getNakshatra(rahuLon).pada
  });
  planets.push({
    name: "Ketu", symbol: "☋", longitude: ketuLon, sign: Math.floor(ketuLon / 30),
    signName: SIGNS[Math.floor(ketuLon / 30)], degree: ketuLon % 30,
    house: getPlanetHouse(Math.floor(ketuLon / 30), ascSign),
    isRetrograde: true, speed: -0.053,
    ...getNakshatra(ketuLon), nakshatraPada: getNakshatra(ketuLon).pada
  });

  const houses = getHouses(ascSid);
  const uedpStates = buildChartUEDPStates(jd, lst, ascTrop, ascSid, planets, ayanamsa);
  const uedp = computeUEDP(uedpStates);

  return {
    planets, houses,
    ascendant: ascSid,
    ascendantSign: SIGNS[ascSign],
    ascendantDegree: ascSid % 30,
    julianDay: jd,
    localSiderealTime: lst,
    ayanamsa,
    uedp,
  };
}

// ============================================================
// UEDP TIMELINE — Omega trajectory over years
// ============================================================
export function computeOmegaTimeline(birth: BirthData, fromYear: number, toYear: number) {
  const timeline: { year: number; month: number; date: string; omega: number; isStable: boolean; events: string[] }[] = [];

  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const testBirth = { ...birth, year, month, day: 15, hour: 12, minute: 0, second: 0 };
      const jd = toJulianDay(testBirth);
      const ayanamsa = getLahiriAyanamsa(jd);
      const lst = getLST(jd, birth.longitude);
      const ascTrop = getAscendant(lst, birth.latitude);
      const ascSid = toSidereal(ascTrop, ayanamsa);
      const ascSign = Math.floor(ascSid / 30);

      const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
      const planets = planetNames.map(name => {
        const { lon: tropLon, speed, retrograde } = getPlanetTropicalLongitude(name, jd);
        const sidLon = toSidereal(tropLon, ayanamsa);
        return { name, longitude: sidLon, sign: Math.floor(sidLon / 30), speed, retrograde };
      });

      const states = planets.map((p, i) => {
        const prev = i === 0 ? p.longitude : planets[i - 1].longitude;
        const delta = p.longitude - prev;
        return {
          label: p.name, value: p.longitude, delta,
          direction: (delta > 0 ? 1 : delta < 0 ? -1 : 0) as -1 | 0 | 1
        };
      });

      const { omega } = computeUEDP(states);
      const events: string[] = [];

      // Mark significant transits
      const sun = planets.find(p => p.name === "Sun");
      const saturn = planets.find(p => p.name === "Saturn");
      const jupiter = planets.find(p => p.name === "Jupiter");
      if (saturn && saturn.retrograde) events.push("Saturn Retrograde");
      if (jupiter && jupiter.retrograde) events.push("Jupiter Retrograde");
      if (sun && sun.sign === ascSign) events.push("Solar Return");

      timeline.push({ year, month, date: `${year}-${String(month).padStart(2, "0")}`, omega, isStable: omega >= OMEGA_CRITICAL, events });
    }
  }
  return timeline;
}

// ============================================================
// DOSHA DETECTION — Surya Siddhanta + Atharva Veda
// ============================================================
export function detectDoshas(chart: HoroscopeData): Dosha[] {
  const doshas: Dosha[] = [];
  const { planets, houses } = chart;

  const getPlanet = (name: string) => planets.find(p => p.name === name);
  const sun = getPlanet("Sun");
  const moon = getPlanet("Moon");
  const mars = getPlanet("Mars");
  const mercury = getPlanet("Mercury");
  const venus = getPlanet("Venus");
  const saturn = getPlanet("Saturn");
  const rahu = getPlanet("Rahu");
  const ketu = getPlanet("Ketu");
  const jupiter = getPlanet("Jupiter");

  // 1. Mangal Dosha (Kuja Dosha) — Mars in 1, 4, 7, 8, 12
  if (mars && [1, 4, 7, 8, 12].includes(mars.house)) {
    const severity = [7, 8].includes(mars.house) ? "severe" : "moderate";
    doshas.push({
      name: "Mangal Dosha (Kuja Dosha)",
      present: true, severity,
      planets: ["Mars"],
      houses: [mars.house],
      effects: ["Marital disharmony", "Delayed marriage", "Partner health issues", "Aggressive temperament"],
      isLatent: mars.house === 1 && !!jupiter && jupiter.house === 1,
      source: "Surya Siddhanta — Mangala Sthana Niyama"
    });
  }

  // 2. Kaal Sarp Dosha — all planets between Rahu and Ketu
  if (rahu && ketu) {
    const rahuLon = rahu.longitude;
    const ketuLon = ketu.longitude;
    const mainPlanets = [sun, moon, mars, mercury, venus, saturn, jupiter].filter(Boolean) as PlanetPosition[];
    const allBetween = mainPlanets.every(p => {
      const lon = p.longitude;
      if (rahuLon < ketuLon) return lon >= rahuLon && lon <= ketuLon;
      return lon >= rahuLon || lon <= ketuLon;
    });
    if (allBetween) {
      doshas.push({
        name: "Kaal Sarp Dosha",
        present: true, severity: "severe",
        planets: ["Rahu", "Ketu"],
        houses: [rahu.house, ketu.house],
        effects: ["Obstacles in life progress", "Ancestral karma burden", "Sudden reversals", "Fear and anxiety"],
        isLatent: false,
        source: "Atharva Veda — Sarpa Sukta (AV 6.56)"
      });
    }
  }

  // 3. Pitra Dosha — Sun + Rahu or Sun in 9th afflicted
  if (sun && rahu && (sun.house === rahu.house || (sun.house === 9 && [mars, saturn].some(p => p?.house === 9)))) {
    doshas.push({
      name: "Pitra Dosha",
      present: true, severity: "moderate",
      planets: ["Sun", "Rahu"],
      houses: [sun.house],
      effects: ["Ancestral debt", "Career obstacles", "Father's health", "Government troubles"],
      isLatent: jupiter?.house === 9 || jupiter?.house === sun.house,
      source: "Atharva Veda — Pitru Tarpana Vidhi (AV 18.1)"
    });
  }

  // 4. Shani Sade Sati — Saturn in 12, 1, or 2 from Moon
  if (saturn && moon) {
    const diff = ((saturn.sign - moon.sign + 12) % 12);
    if ([0, 1, 11].includes(diff)) {
      doshas.push({
        name: "Shani Sade Sati",
        present: true, severity: diff === 0 ? "severe" : "moderate",
        planets: ["Saturn", "Moon"],
        houses: [saturn.house, moon.house],
        effects: ["Mental stress", "Career obstacles", "Financial pressure", "Health challenges"],
        isLatent: false,
        source: "Surya Siddhanta — Shani Gochara Phala"
      });
    }
  }

  // 5. Grahan Dosha — Sun or Moon with Rahu/Ketu
  [sun, moon].forEach(luminary => {
    if (!luminary) return;
    [rahu, ketu].forEach(node => {
      if (!node) return;
      if (luminary.house === node.house && Math.abs(luminary.degree - node.degree) < 15) {
        doshas.push({
          name: `Grahan Dosha (${luminary.name}-${node.name})`,
          present: true, severity: "moderate",
          planets: [luminary.name, node.name],
          houses: [luminary.house],
          effects: ["Intellect clouding", "Career setbacks", "Personality confusion", "Spiritual blocks"],
          isLatent: !!jupiter && Math.abs(jupiter.house - luminary.house) <= 1,
          source: "Surya Siddhanta — Rahu-Ketu Graha Dosha"
        });
      }
    });
  });

  // 6. Kemdrum Dosha — Moon alone (no planets in adjacent houses)
  if (moon) {
    const moonHouse = moon.house;
    const adjHouses = [(moonHouse % 12) + 1, ((moonHouse - 2 + 12) % 12) + 1];
    const otherPlanets = [sun, mars, mercury, venus, saturn, jupiter].filter(Boolean) as PlanetPosition[];
    const hasNeighbor = otherPlanets.some(p => adjHouses.includes(p.house) || p.house === moonHouse);
    if (!hasNeighbor) {
      doshas.push({
        name: "Kemdrum Dosha",
        present: true, severity: "mild",
        planets: ["Moon"],
        houses: [moonHouse],
        effects: ["Emotional isolation", "Financial instability", "Lack of support", "Mental agitation"],
        isLatent: true,
        source: "Atharva Veda — Chandra Shanti Vidhi"
      });
    }
  }

  return doshas;
}

// ============================================================
// PARIHARA ENGINE — Surya Siddhanta + Atharva Veda remedies
// with Karma barrier analysis
// ============================================================
export function generatePariharas(doshas: Dosha[], chart: HoroscopeData): Parihara[] {
  const { planets, uedp } = chart;
  const saturn = planets.find(p => p.name === "Saturn");
  const jupiter = planets.find(p => p.name === "Jupiter");

  const pariharas: Parihara[] = [];

  doshas.forEach(dosha => {
    if (!dosha.present) return;

    let karmaBarrier: string | undefined;
    let karmaOverride: string | undefined;

    // Assess karma barrier from UEDP metrics
    if (uedp.omega < uedp.omegaCritical) {
      karmaBarrier = `UEDP coherence Ω=${uedp.omega.toFixed(3)} is below critical threshold (1/e ≈ 0.368). System instability prevents parihara from anchoring in the karma field. External rituals alone cannot override high Iseq (${uedp.iseq.toFixed(2)}) caused by accumulated karmic reversals (R=${uedp.reversals}).`;
      karmaOverride = "Reduce systemic instability first: 40-day disciplined Saturn sadhana, structured daily routine (same wake time, meals, sleep), and Bhumi Puja. Only then attempt the specific dosha parihara. The UEDP METP (${uedp.metp.toFixed(2)}) shows karma path requires minimum effort investment through sattvic lifestyle before remedies activate.";
    } else if (!saturn || [6, 8, 12].includes(saturn.house)) {
      karmaBarrier = "Saturn (karma karaka) is debilitated in a dusthana house. This means past-life karmic debt is still accruing. Pariharas will be 40–60% effective until Saturn transit improves.";
      karmaOverride = "Perform Shani Tarpana at Shani temples every Saturday for 1 year first. Also donate black sesame, mustard oil to Shani shrines. Serve elderly and disabled persons consistently.";
    }

    switch (dosha.name) {
      case "Mangal Dosha (Kuja Dosha)":
        pariharas.push({
          dosha: dosha.name,
          remedy: "Worship Lord Hanuman and Subramanya Swami",
          ritual: "Kuja Graha Shanti Homa — performed on Tuesday in Bharani or Chitra nakshatra. Recite Mangala Ashtakam 108 times. Red coral (Moonga) in gold ring on ring finger.",
          mantra: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः (Om Kram Krim Kraum Sah Bhaumaya Namah) — 108 times daily",
          deity: "Lord Subramanya / Muruga, Hanuman",
          daan: "Red lentils (masoor dal), copper, red cloth, jaggery — donated on Tuesday",
          timing: "Tuesday, Chitra or Mrigashira nakshatra, Shukla Paksha (waxing moon)",
          karmaBarrier, karmaOverride,
          source: "Surya Siddhanta — Kuja Shanti Prakarana; Atharva Veda — Bhouma Sukta"
        });
        break;

      case "Kaal Sarp Dosha":
        pariharas.push({
          dosha: dosha.name,
          remedy: "Kaal Sarp Shanti Puja at Trimbakeshwar (Nashik) or Rameshwaram",
          ritual: "Full Kaal Sarp Shanti — 3-day ritual with silver Naga idol immersion in river. Sarpa Sukta Parayana (Atharva Veda 6.56) for 11 days. Install silver Naga pair in home puja. Feed milk and honey to snakes (live) at snake shrines.",
          mantra: "ॐ नागेभ्यो नमः (Om Nagabhyo Namah); Maha Mrityunjaya Mantra 10,008 times over 41 days",
          deity: "Lord Shiva (Nagabhushana), Subramanya, Adishesha",
          daan: "Silver Naga idol, milk, durva grass, white sesame — on Naga Panchami or Pournami",
          timing: "Naga Panchami, Pournami (full moon), during Ardra or Ashlesha nakshatra",
          karmaBarrier: karmaBarrier || "Kaal Sarp is a multi-lifetime ancestral karma. Single ritual may activate it but not dissolve it. Without genuine ancestral tarpana and lifestyle karma-karma (action + fruit surrender), the dosha reactivates every Rahu-Ketu transit cycle.",
          karmaOverride: karmaOverride || "Perform Narayana Nagabali (ancestral rite) at Trimbakeshwar. Additionally, do Tripindi Shraddha for 3 generations of ancestors. Only when ancestral debt is cleared can the serpent karma be lifted. UEDP equivalent: you must reduce Reversal Count (R) in your life sequence by creating new directional consistency.",
          source: "Atharva Veda — Sarpa Sukta AV 6.56; Naga Kalpa Tantra"
        });
        break;

      case "Pitra Dosha":
        pariharas.push({
          dosha: dosha.name,
          remedy: "Pitru Tarpana and Shradha Karma",
          ritual: "Pitru Paksha Shradha every year — 15-day ancestral ritual. Gaya Shraddha (pilgrimage to Gaya, Bihar). Brahmin bhojan on each Amavasya. Plant Peepal tree and water it daily for 1 year. Feed crows (pitru birds) on Amavasya.",
          mantra: "ॐ पितृभ्यः स्वधायिभ्यः स्वधा नमः (Om Pitribhyah Svadhaibhyah Svadha Namah) — daily at noon facing south",
          deity: "Lord Yama, Pitru Devatas, Lord Vishnu (as Pitru Tarpana receiver)",
          daan: "Black sesame, barley flour, water — daily facing south on Amavasya",
          timing: "Amavasya (new moon), Pitru Paksha (Bhadrapada-Ashwina month), Sunday",
          karmaBarrier, karmaOverride,
          source: "Atharva Veda — Pitru Tarpana Vidhi AV 18.1; Surya Siddhanta — Pitru Grahana"
        });
        break;

      case "Shani Sade Sati":
        pariharas.push({
          dosha: dosha.name,
          remedy: "Shani Shanti and Hanuman upasana",
          ritual: "Shani Trayodashi fast (13th day, Saturn weekday). Light sesame oil lamp at Shani shrine every Saturday. Recite Shani Stotra and Dasaratha Shani Stotra. Wear 7-mukhi Rudraksha. Read Shani Mahatmya on Saturdays.",
          mantra: "ॐ शं शनैश्चराय नमः (Om Sham Shanaishcharaya Namah) — 19,000 times in 40 days OR ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः",
          deity: "Lord Shani, Lord Hanuman (as Shani-remover), Lord Ayyappa",
          daan: "Black sesame, mustard oil, iron utensils, blue/black cloth, shoes to poor — on Saturday",
          timing: "Saturday, Shani Trayodashi, Pushya nakshatra",
          karmaBarrier: karmaBarrier || "Sade Sati is a cosmic karmic review period. Parihara reduces intensity but cannot eliminate it — it is meant to occur. Resistance increases suffering. The karma lesson of Saturn MUST be learned.",
          karmaOverride: karmaOverride || "Surrender is the supreme parihara for Sade Sati. Accept Saturn's lessons with discipline and patience. Serve elders, disabled people, and Shani bhaktas. The UEDP principle applies: reduce Iseq by accepting Saturn's structure rather than fighting it. Your Ω will rise naturally as you align with Saturn's teaching.",
          source: "Surya Siddhanta — Shani Gochara Phala; Skanda Purana — Shani Mahatmya"
        });
        break;

      default:
        pariharas.push({
          dosha: dosha.name,
          remedy: `Graha Shanti for ${dosha.planets.join(" and ")}`,
          ritual: `Perform Navagraha Homa with specific emphasis on ${dosha.planets.join(" and ")} graha. Consult a Vedic scholar for personalized ritual timing based on natal nakshatra.`,
          mantra: "ॐ नवग्रहाय नमः (Om Navaghrahaya Namah) — 1008 times",
          deity: "Navagraha — Nine Planetary Deities",
          daan: "Graha-specific items on their respective weekdays",
          timing: "Native's birth nakshatra day, Pournami (full moon)",
          karmaBarrier, karmaOverride,
          source: "Surya Siddhanta — Graha Shanti Prakarana"
        });
    }
  });

  return pariharas;
}

// ============================================================
// TIMELINE PREDICTIONS — Date & Time specific
// ============================================================
export function generatePredictions(birth: BirthData, chart: HoroscopeData): Prediction[] {
  const birthYear = birth.year;
  const predictions: Prediction[] = [];
  const { planets, uedp } = chart;
  const ascSign = Math.floor(chart.ascendant / 30);

  // Saturn transit periods (approx 2.5 years per sign)
  const saturnTransitYear = (sign: number) => Math.round(birthYear + ((sign - ascSign + 12) % 12) * 2.5);

  // Jupiter transit periods (1 year per sign)
  const jupiterTransitYear = (sign: number) => Math.round(birthYear + ((sign - ascSign + 12) % 12));

  // Business prediction
  const businessStart = saturnTransitYear(10); // 10th house transit
  predictions.push({
    domain: "Business & Career",
    icon: "💼",
    period: `${businessStart}–${businessStart + 3}`,
    startDate: `${businessStart}-01-01`,
    endDate: `${businessStart + 3}-12-31`,
    intensity: uedp.omega > 0.5 ? "high" : "medium",
    omegaAtPeriod: Math.min(uedp.omega * 1.2, 0.95),
    summary: "Saturn's 10th house transit activates peak professional karma. UEDP Ω projects above critical threshold — decisions convert to structured outcomes.",
    details: [
      "Best period for business expansion and brand launch",
      "Authority and recognition peak — government contracts favorable",
      "Long-term partnerships formed now will sustain for decades",
      "Avoid impulsive decisions in Q2 of each year (Mars activation)"
    ],
    planetaryTriggers: ["Saturn in 10th", "Jupiter aspect on 10th lord", "Sun transit over Ascendant"],
  });

  // Politics / Public recognition
  const politicsYear = jupiterTransitYear(9); // 9th house transit
  predictions.push({
    domain: "Politics & Public Recognition",
    icon: "🏛️",
    period: `${politicsYear}–${politicsYear + 2}`,
    startDate: `${politicsYear}-06-01`,
    endDate: `${politicsYear + 2}-05-31`,
    intensity: planets.find(p => p.name === "Sun")?.house === 10 ? "high" : "medium",
    omegaAtPeriod: uedp.omega,
    summary: "Jupiter-9th house transit opens doors to public life, mentors, and institutional power. Sun's natal position determines depth of political emergence.",
    details: [
      "Elder mentors and institutional backing arrive",
      "Foreign connections and long-distance recognition",
      "Legal matters resolve favorably — court judgments positive",
      "Spiritual authority increases — people seek your guidance"
    ],
    planetaryTriggers: ["Jupiter in 9th", "Sun-Jupiter mutual aspect", "Ketu transit past 12th"],
  });

  // Branding / Media
  const brandYear = jupiterTransitYear(3); // 3rd house transit
  predictions.push({
    domain: "Branding & Media",
    icon: "📢",
    period: `${brandYear}–${brandYear + 1}`,
    startDate: `${brandYear}-03-01`,
    endDate: `${brandYear + 1}-09-30`,
    intensity: "medium",
    omegaAtPeriod: uedp.omega * 0.9,
    summary: "Mercury-ruled 3rd house activation through Jupiter transit enables communication, media presence, and brand voice to crystallize.",
    details: [
      "Digital media campaigns will achieve viral spread",
      "Writing, speaking, publishing opportunities appear",
      "Siblings and collaborators become key allies",
      "Short journeys bring unexpected breakthroughs"
    ],
    planetaryTriggers: ["Jupiter in 3rd", "Mercury-Venus conjunction", "Rahu in Gemini-adjacent"],
  });

  // Marriage
  const marriageYear = saturnTransitYear(7); // 7th house transit
  const venusHouse = planets.find(p => p.name === "Venus")?.house || 7;
  predictions.push({
    domain: "Marriage & Partnership",
    icon: "💍",
    period: `${marriageYear - 1}–${marriageYear + 2}`,
    startDate: `${marriageYear - 1}-01-01`,
    endDate: `${marriageYear + 2}-12-31`,
    intensity: [1, 7].includes(venusHouse) ? "high" : "medium",
    omegaAtPeriod: uedp.omega,
    summary: "Venus Dasha sub-period with 7th lord activation. Marriage timing confirmed by Saturn transit over 7th house. Nakshatra timing: Rohini or Uttara Phalguni nakshatras are auspicious.",
    details: [
      "Marriage most auspicious: Shukla Paksha, Venus hora, Thursday or Friday",
      "Partner likely from different background or city",
      "Avoid marriage during Rahu-Ketu transit of 7th house",
      "Second marriage/significant partnership possible if Venus in 8th"
    ],
    planetaryTriggers: ["Saturn in 7th", "Venus Dasha/Antardasha", "Jupiter aspect on 7th lord"],
  });

  // Children
  const childrenYear = jupiterTransitYear(5); // 5th house transit
  predictions.push({
    domain: "Children & Creativity",
    icon: "👶",
    period: `${childrenYear}–${childrenYear + 2}`,
    startDate: `${childrenYear}-01-01`,
    endDate: `${childrenYear + 2}-12-31`,
    intensity: planets.find(p => p.name === "Jupiter")?.house === 5 ? "high" : "medium",
    omegaAtPeriod: uedp.omega * 1.1,
    summary: "Jupiter's 5th house transit — Putra Bhava activation. This is the primary window for childbirth, adoption, or major creative/intellectual achievements.",
    details: [
      "Conception most favorable: Pushya nakshatra, Pournami",
      "First child likely in this period if unmarried or newly married",
      "Creative projects launched now will have long-term impact",
      "Spiritual children (disciples, students) also indicated"
    ],
    planetaryTriggers: ["Jupiter in 5th", "5th lord in Kendra", "Moon in 5th during transit"],
  });

  // Health / Afflictions
  const healthRiskYear = saturnTransitYear(6); // 6th house transit
  predictions.push({
    domain: "Health & Afflictions",
    icon: "🏥",
    period: `${healthRiskYear}–${healthRiskYear + 2}`,
    startDate: `${healthRiskYear}-01-01`,
    endDate: `${healthRiskYear + 2}-12-31`,
    intensity: uedp.omega < OMEGA_CRITICAL ? "critical" : "medium",
    omegaAtPeriod: uedp.omega * 0.7,
    summary: `UEDP flags this period: Ω drops toward critical threshold (1/e). Saturn's 6th house transit activates ancestral health karma. Watch ${planets.find(p => p.name === "Moon")?.signName || "emotional"} body zone.`,
    details: [
      "Digestive and chronic illness vulnerabilities peak",
      "Avoid surgeries during Rahu in 6th or 8th",
      "Mental health — meditation and pranayama are protective",
      "Enemies and litigation risks peak — maintain legal clarity"
    ],
    planetaryTriggers: ["Saturn in 6th", "Mars transit over natal Moon", "Rahu in 6th/8th"],
  });

  // Wealth emergence
  const wealthYear = saturnTransitYear(11); // 11th house transit
  predictions.push({
    domain: "Financial Emergence",
    icon: "💰",
    period: `${wealthYear}–${wealthYear + 3}`,
    startDate: `${wealthYear}-01-01`,
    endDate: `${wealthYear + 3}-12-31`,
    intensity: "high",
    omegaAtPeriod: Math.min(uedp.omega * 1.4, 0.98),
    summary: "Saturn's 11th house transit — peak Labha Bhava activation. UEDP Ω projected at maximum lifetime high. Wealth accumulation, network expansion, and legacy building phase.",
    details: [
      "Long-term investments made now compound for decades",
      "Elder siblings, friends, and community become wealth channels",
      "Social network becomes primary source of opportunity",
      "Passive income streams can be established permanently"
    ],
    planetaryTriggers: ["Saturn in 11th", "Jupiter in 11th/2nd/9th", "Venus Dasha activation"],
  });

  return predictions;
}
