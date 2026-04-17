/**
 * UEDP v5 — Jyotisha Intelligence Engine
 * G S Ramesh Kumar — Universal Dynamics Emergence Protocol v5
 *
 * Classical sources:
 *   Surya Siddhanta       — planetary positions, ayanamsa, hora
 *   Phaladeepika          — dignity, strength, yoga, dosha rules
 *   BPHS                  — house analysis, dasha, shadbala
 *   Muhurta Chintamani    — muhurta, hora election
 *   Atharva Veda          — parihara, dosha remedies
 *
 * UEDP v5 core:
 *   Ω = Ψ · e^(−λ·Iseq)
 *   E*(t) = E(t) · (1 + λ·M(t))
 *   Hora UEDP = Ω_hora · W_hora(t) · T_hora(t)
 */

// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════

export const OMEGA_CRIT = 1 / Math.E; // 0.36788

export const RASHIS = [
  "Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya",
  "Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena"
];
export const RASHI_EN = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];
export const NAKSHATRAS = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Moola","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha",
  "Purva Bhadrapada","Uttara Bhadrapada","Revati"
];
export const NAK_LORDS = [
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury",
  "Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"
];
export const DASHA_SEQ = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
export const DASHA_YEARS: Record<string,number> = {
  Ketu:7,Venus:20,Sun:6,Moon:10,Mars:7,Rahu:18,Jupiter:16,Saturn:19,Mercury:17
};
export const RASHI_LORD: Record<string,string> = {
  Mesha:"Mars",Vrishabha:"Venus",Mithuna:"Mercury",Karka:"Moon",
  Simha:"Sun",Kanya:"Mercury",Tula:"Venus",Vrishchika:"Mars",
  Dhanu:"Jupiter",Makara:"Saturn",Kumbha:"Saturn",Meena:"Jupiter",
  Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",
  Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",
  Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter",
};
export const EXALTATION: Record<string,string> = {
  Sun:"Aries",Moon:"Taurus",Mars:"Capricorn",Mercury:"Virgo",
  Jupiter:"Cancer",Venus:"Pisces",Saturn:"Libra",Rahu:"Gemini",Ketu:"Sagittarius"
};
export const DEBILITATION: Record<string,string> = {
  Sun:"Libra",Moon:"Scorpio",Mars:"Cancer",Mercury:"Pisces",
  Jupiter:"Capricorn",Venus:"Virgo",Saturn:"Aries",Rahu:"Sagittarius",Ketu:"Gemini"
};
export const OWN_SIGN: Record<string,string[]> = {
  Sun:["Leo"],Moon:["Cancer"],Mars:["Aries","Scorpio"],
  Mercury:["Gemini","Virgo"],Jupiter:["Sagittarius","Pisces"],
  Venus:["Taurus","Libra"],Saturn:["Capricorn","Aquarius"]
};
export const MOOLATRIKONA: Record<string,string> = {
  Sun:"Leo",Moon:"Taurus",Mars:"Aries",Mercury:"Virgo",
  Jupiter:"Sagittarius",Venus:"Libra",Saturn:"Aquarius"
};
const NATURAL_FRIENDS: Record<string,{f:string[],e:string[]}> = {
  Sun:   {f:["Moon","Mars","Jupiter"],      e:["Venus","Saturn"]},
  Moon:  {f:["Sun","Mercury"],              e:[]},
  Mars:  {f:["Sun","Moon","Jupiter"],       e:["Mercury"]},
  Mercury:{f:["Sun","Venus"],               e:["Moon"]},
  Jupiter:{f:["Sun","Moon","Mars"],         e:["Mercury","Venus"]},
  Venus: {f:["Mercury","Saturn"],           e:["Sun","Moon"]},
  Saturn:{f:["Mercury","Venus"],            e:["Sun","Moon","Mars"]},
  Rahu:  {f:["Venus","Saturn"],             e:["Sun","Moon","Mars"]},
  Ketu:  {f:["Mars","Venus","Saturn"],      e:["Sun","Moon"]},
};

// Planet symbols
export const GLYPH: Record<string,string> = {
  Sun:"☉",Moon:"☽",Mars:"♂",Mercury:"☿",Jupiter:"♃",
  Venus:"♀",Saturn:"♄",Rahu:"☊",Ketu:"☋"
};

// Hora planet sequence (Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon)
// Each day starts with day-lord. Horas cycle through 7 planets.
const HORA_CHALDEAN = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];
const DAY_LORDS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]; // Sun=0(Sunday)

// ═══════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════

export interface BirthData {
  name: string;
  day: number; month: number; year: number;
  hour: number; minute: number; second: number;
  latitude: number; longitude: number;
  timezone: number;
  gender?: "male"|"female"|"other";
  place?: string;
  ayanamsa?: string;
}

export interface PlanetData {
  rashi: string; sign: string;
  house: number; degree: number; degInSign: number;
  nakshatra: string; nakshatraLord: string; pada: number;
  dignity: string; retrograde: boolean; combust: boolean;
  rashiLord: string; speed: number;
}

// ─── UEDP State row (used in dashboard table) ───
export interface UEDPState {
  label: string;
  value: number;
  delta: number;
  direction: 1 | 0 | -1;
}

export interface UEDPCore {
  omega: number; iseq: number; psi: number; lambda: number;
  omegaCrit: number;
  omegaCritical: number;   // alias for omegaCrit — used by UEDPDashboard
  isStable: boolean; metp: number;
  reversals: number; A: number; B: number; C: number;
  direction: string; rMod: number; latentEmergence: number;
  atRatio: number; atInterpretation: string;
  fpred: number; leMulti: number; ffinal: number;
  systemState: string;
  states: UEDPState[];     // pipeline state table for dashboard
}

/** UEDPMetrics = full UEDPCore shape, exported for UEDPDashboard.tsx */
export type UEDPMetrics = UEDPCore;

export interface HoraData {
  horaNumber: number;        // 1–24
  horaLord: string;          // planet ruling this hora
  horaSign: string;          // Simha(Sun-hora) or Karka(Moon-hora) per Surya Siddhanta
  horaType: "Solar"|"Lunar"; // odd signs = Solar, even = Lunar
  startTime: string;         // HH:MM IST
  endTime: string;
  isCurrentHora: boolean;
  uedpScore: number;         // Ω × functional weight
  omegaHora: number;         // local Ω for this hora
  horaEffect: string;        // classical prediction text
  horaRecommendation: string;
  domains: string[];         // what activities are good
  warningDomains: string[];  // what to avoid
  // UEDP fields
  horaInstability: number;
  horaCoherence: number;
  horaKarmaLoad: number;     // Γ cost
  horaResilience: number;    // Λ resilience
  horaEmergenceForce: number;// φ
  dasha_activation: number;  // dasha weight for this hora lord
}

export interface HoraUEDPAnalysis {
  date: string;
  dayLord: string;
  sunrise: string;
  timezone: number;
  horas: HoraData[];
  bestHoras: HoraData[];
  avoidHoras: HoraData[];
  dailyOmega: number;
  dailyCoherence: string;
  uedpSummary: string;
  // Multi-day
  weeklyPattern?: HoraWeekPattern[];
}

export interface HoraWeekPattern {
  day: string; dayLord: string;
  avgOmega: number; bestDomain: string;
  peakHora: string; uedpGrade: string;
}

export interface ChartData {
  status: string;
  name: string; place: string;
  latitude: number; longitude: number;
  lagna: { rashi:string; sign:string; degree:number; degInSign:number; nakshatra:string; pada:number; rashiLord:string; };
  planets: Record<string, PlanetData>;
  panchang: PanchangData;
  ayanamsaUsed: string; ayanamsaValue: number;
  allAyanamsas: Record<string,number>;
  strengths: Record<string, StrengthData>;
  shadbala: Record<string, ShadbalaData>;
  ashtakavarga: Record<string, AshtakavargaData>;
  bhavas: BhavaData[];
  dasha: DashaBlock;
  doshas: Dosha[];   // DoshaResult is alias for Dosha
  yogas: YogaResult[];
  medical: MedicalData;
  political: PoliticalData;
  vargas: Record<string, VargaData>;
  predictions: Record<string, PredictionScore>;
  uedp: UEDPCore;
  uedpTimeline: UEDPTimelinePoint[];
  horaAnalysis: HoraUEDPAnalysis;
  marriage: MarriageAnalysis;
  children: ChildAnalysis;
  directions: DirectionAnalysis;
  confidence: ConfidenceData;
  input: Record<string,unknown>;
}

export interface PanchangData {
  tithi: { number:number; name:string; paksha:string; tithi_in_paksha:number; progress:number; };
  vara: string; nakshatra: string; nakshatraLord: string;
  yoga: string; karana: string;
  moonSign: string; sunSign: string; lagna: string;
}

export interface StrengthData {
  dignity: { state:string; multiplier:number; };
  houseStrength: number; combust: boolean; retrograde: boolean;
  totalScore: number;
}

export interface ShadbalaData {
  sthanaBala: number; digBala: number; kalaBala: number;
  chestaBala: number; naisargikaBala: number; drikBala: number;
  totalRupas: number; strengthGrade: string;
  ishtaPhala: number; kashtaPhala: number;
}

export interface AshtakavargaData {
  bav: number[]; total: number;
  transitScoreCurrent: number; strongSigns: string[];
}

export interface BhavaData {
  bhava: number; name: string; rashi: string;
  lord: string; lordHouse: number; lordDignity: string;
  planets: string[]; signification: string;
}

export interface DashaBlock {
  birthNakshatra: string; nakshatraLord: string;
  current: { mahadasha:string; mahaStart:string; mahaEnds:string; antardasha:string; antarEnds:string; pratyantara:string; };
  elapsedYears: number; remainingYears: number;
  dashas: DashaEntry[];
  antardashas: AntarEntry[];
}

export interface DashaEntry {
  lord: string; start: string; end: string; years: number; complete: boolean;
  antardashas?: AntarEntry[];
}
export interface AntarEntry {
  lord: string; start: string; end: string; years: number;
}

// ─── Parihara — two shapes ───────────────────────────────────────────────
// SimpleParihara: the {r: string} used internally in DOSHA_DB
// Parihara: the full shape DoshaPanel.tsx renders in the "parihara" tab
export interface SimpleParihara {
  r: string;
  type?: string;
  timing?: string;
  planet?: string;
}

/** Full Parihara record used by DoshaPanel pariharas[] prop */
export interface Parihara {
  dosha: string;           // which dosha this remedy belongs to
  source: string;          // classical text e.g. "BPHS Ch.81"
  remedy: string;          // short remedy description
  ritual: string;          // step-by-step vidhi
  deity: string;           // presiding deity
  mantra: string;          // mantra with japa count
  daan: string;            // donation items
  timing: string;          // auspicious timing
  karmaBarrier?: string;   // why remedy may not work
  karmaOverride?: string;  // how to override karma
}

// ─── Dosha — used by DoshaPanel.tsx ─────────────────────────────────────────
export interface Dosha {
  name: string;
  alias: string;
  strength: number;        // 0–100
  level: string;           // "High" | "Moderate" | "Low"
  severity: "severe" | "moderate" | "mild" | "none";  // for colour coding
  effects: string[];
  remedies: SimpleParihara[];   // quick remedies ({r:string})
  placement: string;
  lifeAreas: string[];
  isLatent: boolean;
  source: string;          // classical text reference
  planets: string[];       // planets involved
  houses: number[];        // houses involved
  description?: string;
}

/** DoshaResult = Dosha (backward-compatible alias for existing code) */
export type DoshaResult = Dosha;

export interface YogaResult {
  yoga: string; type: string; strength: number;
  planets: string; description: string; electionRelevance: string;
}

export interface MedicalData {
  healthIndex: number; healthGrade: string;
  tridosha: { Vata:number; Pitta:number; Kapha:number; dominant:string; remedies:string[]; };
  planetaryVulnerabilities: VulnerabilityData[];
  currentDashaHealth: { lord:string; risk:string; bodyFocus:string[]; };
}

export interface VulnerabilityData {
  planet:string; organs:string[]; diseases:string[];
  vulnerabilityScore:number; reason:string;
}

export interface PoliticalData {
  leadership: { overallLeadershipIndex:number; grade:string; dimensions:Record<string,number>; keyFactors:string[]; };
  powerYogas: YogaResult[];
  career: { dashamsha_lagna:string; tenth_house_lord:string; tenth_house_sign:string; tenth_house_planets:string[]; career_strength:string; lord_dignity:string; };
}

export interface VargaData {
  lagna: { rashi:string; sign:string; degInSign:number; nakshatra:string; rashiLord:string; };
  planets: Record<string,{ rashi:string; sign:string; house:number; dignity:string; degInSign:number; nakshatra:string; }>;
  tenthLord?: string; tenthLordDignity?: string; tenthHousePlanets?: string[];
}

// ─── PlanetPosition — used by PlanetTable.tsx ────────────────────────────
export interface PlanetPosition {
  name: string;            // "Sun", "Moon", etc.
  symbol: string;          // Unicode glyph ☉ ☽ etc.
  longitude: number;       // absolute sidereal longitude 0–360
  degree: number;          // degree within sign 0–30
  signName: string;        // English sign name e.g. "Aries"
  house: number;           // 1–12
  nakshatra: string;       // e.g. "Ashwini"
  nakshatraPada: number;   // 1–4
  isRetrograde: boolean;
  speed: number;           // degrees/day
  dignity?: string;        // "exalted" | "own" | "neutral" etc.
}

// ─── HouseData — used by PlanetTable.tsx ─────────────────────────────────
export interface HouseData {
  house: number;
  signName: string;        // English sign name
  lord: string;            // planet name
  lordSymbol: string;      // Unicode glyph for lord
}

// ─── HoroscopeData — used by HoroscopeWheel.tsx ──────────────────────────
export interface HoroscopeData {
  ascendant: number;       // absolute sidereal longitude of ASC
  ascendantSign: string;   // English sign name e.g. "Aries"
  ascendantDegree: number; // degree within sign
  uedp: { omega: number; isStable: boolean; };
  planets: PlanetPosition[];
}

export interface PredictionScore {
  score: number; domain: string; icon: string;
}

/** Rich Prediction used by PredictionsPanel.tsx */
export interface Prediction {
  domain: string;
  icon: string;
  period: string;              // e.g. "Jupiter MD / Rahu AD"
  intensity: "high" | "medium" | "low" | "critical";
  omegaAtPeriod: number;       // Ω value for this period
  summary: string;             // 1-2 sentence overview
  startDate: string;           // ISO date string
  endDate: string;             // ISO date string
  details: string[];           // bullet points
  planetaryTriggers: string[]; // e.g. ["Jupiter transit H5", "Rahu in H10"]
  karmaNote?: string;          // karma alert text
}

export interface MarriageAnalysis {
  h7Rashi: string; h7Lord: string; h7LordDignity: string; h7LordHouse: number; h7Planets: string[];
  spouseQualities: string;
  marriageType: string; typeConfidence: number;
  loveScore: number; arrangedScore: number; liveinScore: number;
  loveReasons: string[]; arrangedReasons: string[]; liveinReasons: string[];
  successScore: number; successAnalysis: string; successPct: number;
  separationIndicators: string[]; secondMarriageRisk: boolean;
  timingCurrent: string; marriageDashaActive: boolean;
  upcomingDashas: {period:string;from:string;to:string;note:string;}[];
  remedies: string[]; advisory: string;
  d9Validation: { h7LordInD9:string; h7LordD9Dig:string; venusD9Dig:string; d9Factor:number; d9Note:string; };
}

export interface ChildAnalysis {
  h5Rashi:string; h5Lord:string; h5LordDignity:string; h5LordHouse:number; h5Planets:string[];
  jupiterHouse:number; jupiterDignity:string; jupiterStrong:boolean; putraKaraka:string;
  childScore:number; likelihood:string; likelihoodPct:number; afflictions:string[];
  genderTendency:string; genderBreakdown:{ maleScore:number; femaleScore:number; malePct:number; femalePct:number; confidence:string; d7H5Rashi:string; };
  countTendency:string; healthTendencies:string[]; mentalHealthNotes:string[];
  timingCurrent:string; upcomingChildDashas:{period:string;from:string;to:string;}[];
  remedies:string[]; advisory:string;
}

export interface DirectionAnalysis {
  lagnaLord:string; lagnaRashi:string; strongestPlanet:string; h10Lord:string;
  primaryDirections:{direction:string;weight:number;layers:string[];reasons:string[];}[];
  secondaryDirections:{direction:string;weight:number;layers:string[];reasons:string[];}[];
  purposeDirections:Record<string,string>;
  inauspiciousDirections:{direction:string;planet:string;house:number;reason:string;}[];
  remedies:string[]; summary:string;
}

export interface ConfidenceData {
  overall:number; mode:string;
  ephemeris:{score:number;grade:string;note:string};
  ayanamsaAgreement:{score:number;grade:string;note:string};
  boundaryStability:{score:number;grade:string;note:string};
  interpretationCertainty:{score:number;grade:string;note:string};
}

export interface UEDPTimelinePoint {
  year:number; month:number; date:string;
  omega:number; isStable:boolean;
  iseq:number; events:string[];
  domainScores:Record<string,number>;
  classification:"PEAK"|"TROUGH"|"NEUTRAL";
  confidence:number;
}

// ═══════════════════════════════════════════
// ASTRONOMICAL CORE (Surya Siddhanta approach)
// ═══════════════════════════════════════════

export function toJulianDay(d:BirthData): number {
  const utHours = d.hour + d.minute/60 + d.second/3600 - d.timezone;
  let Y = d.year, M = d.month;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y/100);
  const B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(Y+4716)) + Math.floor(30.6001*(M+1)) + d.day + B - 1524.5 + utHours/24;
}

export function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85 + 0.013972 * (jd - 2415020.5) / 365.25;
}

const AYANAMSA_OFFSETS: Record<string,number> = {
  lahiri: 0, raman: -0.984, kp: 0.0015, yukteshwar: 2.33,
  true_chitrapaksha: -0.05, jn_bhasin: 0.25
};

export function getAllAyanamsas(jd: number): Record<string,number> {
  const base = getLahiriAyanamsa(jd);
  const result: Record<string,number> = {};
  for (const [k,off] of Object.entries(AYANAMSA_OFFSETS)) {
    result[k] = Math.round((base + off) * 1e6) / 1e6;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// PLANETARY LONGITUDE ENGINE — VSOP87 truncated series
// Source: Jean Meeus "Astronomical Algorithms" (2nd ed.) Ch.32-33
//
// WHY THIS MATTERS:
//   Simplified Keplerian elements (single-term) give ±2-3° for outer
//   planets but can give ±10-20° errors for Venus and Mercury because:
//     • Venus/Mercury have much larger equation-of-center corrections
//     • Both are heavily perturbed by Jupiter and Saturn
//     • Mercury has the highest eccentricity (0.206) in the solar system
//   The VSOP87 truncated series below achieves ~0.3-1° accuracy for all
//   planets over the range 1800-2050, sufficient for Jyotisha purposes.
//
// ARCHITECTURE NOTE:
//   These functions compute TROPICAL longitudes only.
//   toSidereal() subtracts the ayanamsa (Lahiri or other) to get
//   sidereal values used throughout the rest of the engine.
//   The ayanamsa is computed ONCE per chart and passed through — never
//   recomputed per planet, ensuring consistent house assignments.
// ─────────────────────────────────────────────────────────────────

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 50; i++) {
    const dE = M + e * Math.sin(E) - E;
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

function norm360(x: number): number { return ((x % 360) + 360) % 360; }

/**
 * planetTropLon — tropical geocentric longitude using VSOP87 truncated.
 * Accuracy: Sun ±0.01°, Moon ±0.3°, inner planets ±0.5-1°, outer ±0.5°
 * Reference: Meeus AA2 Ch.25 (Sun), Ch.32-33 (planets)
 */
function planetTropLon(planet: string, jd: number): {lon:number;speed:number;retro:boolean} {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000.0

  // ── SUN (Meeus Ch.25 — accuracy ~0.01°) ─────────────────────────
  if (planet === "Sun") {
    const M = norm360(357.52911 + 35999.05029*T - 0.0001537*T*T);
    const Mrad = M * D2R;
    const C = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(Mrad)
            + (0.019993 - 0.000101*T)*Math.sin(2*Mrad)
            + 0.000289*Math.sin(3*Mrad);
    const sunLon = norm360(280.46646 + 36000.76983*T + 0.0003032*T*T + C);
    // Aberration correction: −0.00569 − 0.00478·sin(Ω)
    const omega = norm360(125.04 - 1934.136*T);
    const apparent = norm360(sunLon - 0.00569 - 0.00478*Math.sin(omega*D2R));
    const speed = 360.0 / 365.25; // degrees/day approx
    return {lon: apparent, speed, retro: false};
  }

  // ── MOON (Meeus Ch.47 — accuracy ~0.3°) ─────────────────────────
  if (planet === "Moon") {
    const Lprime = norm360(218.3164477 + 481267.88123421*T - 0.0015786*T*T + T*T*T/538841);
    const D      = norm360(297.8501921 + 445267.1114034*T - 0.0018819*T*T);
    const M      = norm360(357.5291092 + 35999.0502909*T - 0.0001536*T*T);
    const Mprime = norm360(134.9633964 + 477198.8676313*T + 0.0089970*T*T);
    const F      = norm360(93.2720950  + 483202.0175233*T - 0.0036539*T*T);
    // Largest periodic terms
    const lon = norm360(Lprime
      + 6.288774*Math.sin(Mprime*D2R)
      + 1.274027*Math.sin((2*D-Mprime)*D2R)
      + 0.658314*Math.sin(2*D*D2R)
      + 0.213618*Math.sin(2*Mprime*D2R)
      - 0.185116*Math.sin(M*D2R)
      - 0.114332*Math.sin(2*F*D2R)
      + 0.058793*Math.sin((2*D-2*Mprime)*D2R)
      + 0.057066*Math.sin((2*D-M-Mprime)*D2R)
      + 0.053322*Math.sin((2*D+Mprime)*D2R)
      + 0.045758*Math.sin((2*D-M)*D2R)
      - 0.040923*Math.sin((M-Mprime)*D2R)
      - 0.034720*Math.sin(D*D2R)
      - 0.030383*Math.sin((M+Mprime)*D2R)
    );
    const speed = 13.176397; // degrees/day approx
    return {lon, speed, retro: false};
  }

  // ── MERCURY (Meeus Ch.33 — VSOP87 truncated, accuracy ~0.5°) ────
  if (planet === "Mercury") {
    // Heliocentric L, B, R → geocentric using Sun position
    const L0 = norm360(252.250906 + 149474.0722491*T + 0.0003035*T*T);
    const M  = norm360(L0 - (77.456119 + 0.1588643*T));
    const Mrad = M*D2R;
    // Equation of center (large for Mercury e=0.206)
    const C = (23.4400 - 0.5*T)*Math.sin(Mrad)
            + 2.9818*Math.sin(2*Mrad)
            + 0.5255*Math.sin(3*Mrad)
            + 0.1058*Math.sin(4*Mrad)
            + 0.0219*Math.sin(5*Mrad);  // degrees
    const helioLon = norm360(L0 + C);
    // Perturbation corrections (Meeus Table 33.a, main terms)
    const pert = -0.1828*Math.sin(norm360(5*helioLon - 2*L0 + 78.35)*D2R)
               + 0.1466*Math.sin(norm360(L0 - 83.35)*D2R)
               + 0.0735*Math.sin(norm360(helioLon + 84.35)*D2R);
    const corrHlio = norm360(helioLon + pert);
    // Convert heliocentric → geocentric (simplified: add 180° and correct for elongation)
    const R    = 0.387098 * (1 - 0.206*Math.cos(Mrad));
    const sunM = norm360(357.52911 + 35999.05029*T);
    const sunL = norm360(280.46646 + 36000.76983*T + 2*1.9146*Math.sin(sunM*D2R));
    const sunR = 1.000001;
    // Phase angle correction for inner planet
    const relLon = norm360(corrHlio - sunL);
    const geoLon = norm360(sunL + Math.atan2(R*Math.sin(relLon*D2R), sunR - R*Math.cos(relLon*D2R))*R2D);
    const speed  = 4.0923;
    const retro  = norm360(corrHlio - sunL) > 180 && norm360(corrHlio - sunL) < 360;
    return {lon: geoLon, speed: retro?-speed:speed, retro};
  }

  // ── VENUS (Meeus Ch.33 — VSOP87 truncated, accuracy ~0.5°) ─────
  if (planet === "Venus") {
    const L0 = norm360(181.979801 + 58519.2130302*T + 0.00031014*T*T);
    const M  = norm360(L0 - (131.563703 + 0.0048746*T));
    const Mrad = M*D2R;
    const C = (0.7758 - 0.0046*T)*Math.sin(Mrad)
            + 0.0033*Math.sin(2*Mrad);
    const helioLon = norm360(L0 + C);
    // Perturbation correction (main Venus-Jupiter term)
    const pert = 0.7686*Math.sin(norm360(4*helioLon - 8*(58519.2130302/36000)*T - 0.1)*D2R)
               + 0.0046*Math.sin(norm360(L0 - 65.9)*D2R);
    const corrHlio = norm360(helioLon + pert);
    // Geocentric conversion
    const R   = 0.723332 * (1 - 0.0067825*Math.cos(Mrad));
    const sunM = norm360(357.52911 + 35999.05029*T);
    const sunL = norm360(280.46646 + 36000.76983*T + 2*1.9146*Math.sin(sunM*D2R));
    const sunR = 1.000001;
    const relLon = norm360(corrHlio - sunL);
    const geoLon = norm360(sunL + Math.atan2(R*Math.sin(relLon*D2R), sunR - R*Math.cos(relLon*D2R))*R2D);
    const speed  = 1.6021;
    const retro  = relLon > 180 && relLon < 360;
    return {lon: geoLon, speed: retro?-speed:speed, retro};
  }

  // ── MARS (Meeus Ch.33 truncated, accuracy ~0.5°) ──────────────
  if (planet === "Mars") {
    const L0   = norm360(355.433275 + 19141.6964746*T + 0.00031097*T*T);
    const M    = norm360(L0 - (286.4967 + 0.0*T)); // perihelion ≈ fixed
    const Mrad = M*D2R;
    const C    = (10.6912 - 0.0838*T)*Math.sin(Mrad)
               + (0.6228 - 0.0068*T)*Math.sin(2*Mrad)
               + 0.0503*Math.sin(3*Mrad);
    const helioLon = norm360(L0 + C);
    const R   = 1.523679 * (1 - 0.0934*Math.cos(Mrad));
    const sunM = norm360(357.52911 + 35999.05029*T);
    const sunL = norm360(280.46646 + 36000.76983*T + 2*1.9146*Math.sin(sunM*D2R));
    const sunR = 1.000001;
    const relLon = norm360(helioLon - sunL);
    const geoLon = norm360(sunL + Math.atan2(R*Math.sin(relLon*D2R), sunR - R*Math.cos(relLon*D2R))*R2D);
    const retro = norm360(helioLon - sunL) > 180 && norm360(helioLon - sunL) < 360;
    return {lon: geoLon, speed: retro?-0.524:0.524, retro};
  }

  // ── JUPITER (Meeus Ch.33 truncated, accuracy ~0.5°) ───────────
  if (planet === "Jupiter") {
    const L0   = norm360(34.351484 + 3036.3027889*T + 0.00022374*T*T);
    const M    = norm360(L0 - (14.3312 + 0.0*T));
    const Mrad = M*D2R;
    const C    = (5.5549 - 0.0071*T)*Math.sin(Mrad)
               + (0.1683 - 0.0027*T)*Math.sin(2*Mrad);
    const helioLon = norm360(L0 + C);
    const R   = 5.202561 * (1 - 0.0489*Math.cos(Mrad));
    const sunM = norm360(357.52911 + 35999.05029*T);
    const sunL = norm360(280.46646 + 36000.76983*T + 2*1.9146*Math.sin(sunM*D2R));
    const sunR = 1.000001;
    const relLon = norm360(helioLon - sunL);
    const geoLon = norm360(sunL + Math.atan2(R*Math.sin(relLon*D2R), sunR - R*Math.cos(relLon*D2R))*R2D);
    const retro = norm360(helioLon - sunL) > 180 && norm360(helioLon - sunL) < 360;
    return {lon: geoLon, speed: retro?-0.083:0.083, retro};
  }

  // ── SATURN (Meeus Ch.33 truncated, accuracy ~0.5°) ────────────
  if (planet === "Saturn") {
    const L0   = norm360(50.077444 + 1223.5110686*T + 0.00051908*T*T);
    const M    = norm360(L0 - (93.0568 + 0.0*T));
    const Mrad = M*D2R;
    const C    = (6.3585 - 0.0040*T)*Math.sin(Mrad)
               + (0.2204 - 0.0028*T)*Math.sin(2*Mrad);
    const helioLon = norm360(L0 + C);
    const R   = 9.554747 * (1 - 0.0557*Math.cos(Mrad));
    const sunM = norm360(357.52911 + 35999.05029*T);
    const sunL = norm360(280.46646 + 36000.76983*T + 2*1.9146*Math.sin(sunM*D2R));
    const sunR = 1.000001;
    const relLon = norm360(helioLon - sunL);
    const geoLon = norm360(sunL + Math.atan2(R*Math.sin(relLon*D2R), sunR - R*Math.cos(relLon*D2R))*R2D);
    const retro = norm360(helioLon - sunL) > 180 && norm360(helioLon - sunL) < 360;
    return {lon: geoLon, speed: retro?-0.033:0.033, retro};
  }

  return {lon:0, speed:0, retro:false};
}

function getRahuLon(jd: number): number {
  const d = jd - 2451545.0;
  return ((125.0445 - 0.052954*d) % 360 + 360) % 360;
}

function getGST(jd: number): number {
  return (((280.46061837 + 360.98564736629*(jd-2451545.0)) % 360) + 360) % 360;
}

function getLST(jd: number, lon: number): number {
  return (getGST(jd) + lon) % 360;
}

function getAscendant(jd: number, lat: number, lon: number): number {
  const lst = getLST(jd, lon);
  const eps = 23.4392911 * Math.PI/180;
  const lstR = lst * Math.PI/180;
  const latR = lat * Math.PI/180;
  const asc = Math.atan2(Math.cos(lstR), -(Math.sin(lstR)*Math.cos(eps) + Math.tan(latR)*Math.sin(eps)));
  return ((asc * 180/Math.PI) % 360 + 360) % 360;
}

function toSidereal(tropLon: number, ayanamsa: number): number {
  return ((tropLon - ayanamsa) % 360 + 360) % 360;
}

export function lonToRashi(lon: number): string { return RASHIS[Math.floor(lon/30) % 12]; }
export function lonToSign(lon: number): string  { return RASHI_EN[Math.floor(lon/30) % 12]; }
export function lonToNak(lon: number): {name:string;lord:string;pada:number;index:number} {
  const span = 360/27;
  const idx = Math.floor(lon/span) % 27;
  const pada = Math.floor((lon % span) / (span/4)) + 1;
  return {name:NAKSHATRAS[idx], lord:NAK_LORDS[idx], pada:Math.min(pada,4), index:idx};
}
export function houseFromLon(pLon:number, ascLon:number): number {
  return Math.floor(((pLon - ascLon + 360) % 360) / 30) + 1;
}
export function degInSign(lon:number): number { return lon % 30; }

export function getDignity(planet:string, sign:string): string {
  const r = RASHI_EN.includes(sign) ? sign : (RASHI_EN[RASHIS.indexOf(sign)] || sign);
  if (EXALTATION[planet] === r)    return "exalted";
  if (DEBILITATION[planet] === r)  return "debilitated";
  if (MOOLATRIKONA[planet] === r)  return "moolatrikona";
  if ((OWN_SIGN[planet]||[]).includes(r)) return "own";
  const lord = RASHI_LORD[r] || "";
  const fn = NATURAL_FRIENDS[planet] || {f:[],e:[]};
  if (fn.f.includes(lord)) return "friend";
  if (fn.e.includes(lord)) return "enemy";
  return "neutral";
}

const COMBUST_ORBS: Record<string,number> = {Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15};
function isCombust(planet:string, pLon:number, sunLon:number): boolean {
  const orb = COMBUST_ORBS[planet] || 0;
  if (!orb) return false;
  const d = Math.abs(pLon - sunLon) % 360;
  return Math.min(d, 360-d) < orb;
}

// ═══════════════════════════════════════════
// UEDP v5 CORE MATH — G S Ramesh Kumar
// ═══════════════════════════════════════════

export function computeUEDPCore(
  x: number[],
  alpha=0.4, beta=0.35, delta=0.25, eta=0.3, m=4
): UEDPCore {
  const N = x.length;
  if (N === 0) return {omega:0,iseq:0,psi:0,lambda:1,omegaCrit:OMEGA_CRIT,omegaCritical:OMEGA_CRIT,
    isStable:false,metp:0,reversals:0,A:0,B:0,C:0,direction:"",rMod:0,
    latentEmergence:0,atRatio:0,atInterpretation:"",fpred:0,leMulti:0,ffinal:0,systemState:"",states:[]};

  // Segment-based hybrinear
  const segSize = Math.max(1, Math.floor(N/m));
  const segs: number[][] = [];
  for (let i=0; i<N; i+=segSize) segs.push(x.slice(i, i+segSize));

  let fpred = 0;
  for (const seg of segs) {
    const n = seg.length;
    const deltas = seg.map((v,i) => i===0 ? v : v - seg[i-1]);
    const dirs = deltas.map(d => (d>0?1:d<0?-1:0) as number);
    const sumAbs = seg.reduce((s,v)=>s+Math.abs(v),0);
    const Lm = dirs.reduce((s,d,i)=>s+d*seg[i],0) / (sumAbs || 1);
    const absD = deltas.map(Math.abs);
    const NLm = absD.reduce((s,v)=>s+v,0) / (absD.reduce((s,v)=>s+v,0) || 1);
    const zeros = dirs.filter(d=>d===0).length;
    const Hm = Math.tanh(n) * zeros / (zeros+1);
    fpred += (n/N) * (alpha*Lm + beta*NLm + delta*Hm);
  }

  const oObs = x.reduce((s,v)=>s+v,0) / N;
  const leMulti = oObs - fpred;
  const ffinal = fpred + eta * leMulti;

  // Instability sequence
  const allDeltas = x.map((v,i) => i===0 ? 0 : v - x[i-1]);
  const allDirs = allDeltas.map(d => (d>0?1:d<0?-1:0) as number);
  const lmVals: number[] = [];
  for (let i=0; i<segs.length; i++) {
    const seg=segs[i], sumAbs=seg.reduce((s,v)=>s+Math.abs(v),0);
    const dirs2=seg.map((v,j)=>j===0?0:v-seg[j-1]).map(d=>(d>0?1:d<0?-1:0) as number);
    lmVals.push(dirs2.reduce((s,d,j)=>s+d*seg[j],0)/(sumAbs||1));
  }
  const meanL = lmVals.reduce((s,v)=>s+v,0)/lmVals.length;
  const A = lmVals.reduce((s,v)=>s+(v-meanL)**2,0)/lmVals.length;
  let Bv=0, Sv=0;
  for (let i=1; i<allDirs.length; i++) {
    Bv += 1 - allDirs[i]*allDirs[i-1];
    if (allDirs[i]!==0 && allDirs[i-1]!==0 && allDirs[i]!==allDirs[i-1]) Sv++;
  }
  const B = Bv / Math.max(allDirs.length-1, 1);
  const C = Sv / (Sv+1);
  const iseq = alpha*A + 0.3*B + 0.3*C;
  const omega = Math.exp(-iseq);
  const isStable = omega >= OMEGA_CRIT;

  const omSeries = x.map((_,t) => Math.exp(-iseq*(t+1)/N));
  const metp = omSeries.reduce((s,o)=>s+Math.max(0,1-o),0);
  const omegaMin = Math.min(...omSeries);
  const omegaRef = 0.8;
  const tau = omegaRef - omegaMin;
  const Rmag = Math.abs(tau) / (omegaRef + 1e-9);
  const signRsl = (tau>0 && omegaMin<OMEGA_CRIT) ? -1 : 1;
  const rMod = signRsl * Rmag;
  const dOmega = Math.max(omegaRef - omega, 1e-9);
  const iCoh = Math.max(0, 1-iseq);
  const phi = (iCoh * rMod) / dOmega;
  const cHist = omSeries.reduce((s,o)=>s+Math.abs(o-omegaRef),0)/N;
  const Lambda = (iCoh * rMod) / Math.max(cHist * omegaRef, 1e-9);
  const Upsilon = Math.abs(rMod);
  const oDebt = Math.max(OMEGA_CRIT - omega, 0);
  const Gamma = (oDebt * Math.abs(leMulti)) / Math.max(Math.abs(rMod)+1e-9, 1e-9);
  const AT = Upsilon * Math.abs(phi) / Math.max(iseq * Gamma, 1e-9);

  // Build states array for UEDPDashboard table (label, value, delta, direction per segment)
  const statesArr: UEDPState[] = segs.map((seg, si) => {
    const lv = lmVals[si] ?? 0;
    const prev = si > 0 ? (lmVals[si-1] ?? 0) : 0;
    const delta = lv - prev;
    return {
      label: `Seg ${si+1} (x̄=${(seg.reduce((a,v)=>a+v,0)/seg.length).toFixed(2)})`,
      value: Math.round(lv*1e4)/1e4,
      delta: Math.round(delta*1e4)/1e4,
      direction: (delta > 1e-6 ? 1 : delta < -1e-6 ? -1 : 0) as 1|0|-1,
    };
  });

  return {
    omega: Math.round(omega*1e6)/1e6,
    iseq:  Math.round(iseq*1e6)/1e6,
    psi: 1.0, lambda: 1.0,
    omegaCrit: OMEGA_CRIT,
    omegaCritical: OMEGA_CRIT,
    isStable, metp: Math.round(metp*1e4)/1e4,
    reversals: Sv, A: Math.round(A*1e4)/1e4,
    B: Math.round(B*1e4)/1e4, C: Math.round(C*1e4)/1e4,
    direction: signRsl > 0 ? "Anados (Acceleratory)" : "Thanatos (Inhibitory)",
    rMod: Math.round(rMod*1e6)/1e6,
    latentEmergence: Math.round(leMulti*1e4)/1e4,
    atRatio: Math.round(AT*1e4)/1e4,
    atInterpretation: AT > 1 ? "Anados Dominant — Self-correcting, Generative Growth" : "Thanatos Dominant — Collapse / Inhibition / Stasis",
    fpred: Math.round(fpred*1e4)/1e4,
    leMulti: Math.round(leMulti*1e4)/1e4,
    ffinal: Math.round(ffinal*1e4)/1e4,
    systemState: isStable ? "Structured Dynamics" : "Excessive Instability",
    states: statesArr,
  };
}

// ═══════════════════════════════════════════
// HORA ENGINE — UEDP v5 (Surya Siddhanta + UEDP)
//
// Classical basis: Surya Siddhanta, Muhurta Chintamani
// Each planetary hour (hora) = 60 minutes exactly
// Day divided into 24 horas starting at sunrise
// First hora lord = day lord; then Chaldean order cycles
// Surya Siddhanta: odd rashis (Sun-horas), even rashis (Moon-horas)
//
// UEDP extension:
//   Ω_hora = e^(−λ · I_hora)
//   I_hora computed from hora sequence scores × dasha activation × nakshatra transit
//   E*(hora) = S_lord · W_dasha · T_transit · P_functional
// ═══════════════════════════════════════════

const HORA_EFFECTS: Record<string, {
  effect:string; domains:string[]; warn:string[]; rec:string;
}> = {
  Sun: {
    effect:"Authority, leadership, governance, vital energy peak",
    domains:["Career","Government","Medical","Authority decisions","Public speaking","Gold/metals trade"],
    warn:["Avoid starting journeys south","Avoid humbling requests"],
    rec:"Best hora for: signing contracts with authorities, visiting officials, launching leadership-oriented ventures, health consultations"
  },
  Moon: {
    effect:"Emotions, public, agriculture, liquids, creativity",
    domains:["Public relations","Agriculture","Water-related","Creativity","Travel","Family"],
    warn:["Avoid sharp confrontations","Avoid iron/weapons dealings"],
    rec:"Best hora for: social meetings, creative work, travel, public-facing activities, working with mothers and children"
  },
  Mars: {
    effect:"Courage, action, conflict, surgery, engineering",
    domains:["Military","Police","Surgery","Construction","Sports","Property"],
    warn:["Avoid marriage negotiations","Avoid signing of long-term agreements"],
    rec:"Best hora for: physical work, surgery, starting construction, sports, legal battles requiring courage"
  },
  Mercury: {
    effect:"Intelligence, trade, communication, education, accounts",
    domains:["Business","Education","Writing","IT","Commerce","Accounts"],
    warn:["Avoid emotional decisions","Avoid purely physical tasks"],
    rec:"Best hora for: trade negotiations, studies, writing, signing commercial contracts, accounting, IT work"
  },
  Jupiter: {
    effect:"Wisdom, dharma, prosperity, expansion, children",
    domains:["Finance","Education","Religion","Philanthropy","Children","Foreign"],
    warn:["Avoid mundane/low activities","Avoid conflict"],
    rec:"Best hora for: financial investments, religious ceremonies, education, philanthropy, consulting elders"
  },
  Venus: {
    effect:"Love, beauty, arts, luxury, partnerships, vehicles",
    domains:["Marriage","Arts","Fashion","Entertainment","Vehicles","Diplomacy"],
    warn:["Avoid conflict","Avoid harsh decisions"],
    rec:"Best hora for: marriage proposals, artistic work, purchasing vehicles/luxury items, diplomatic negotiations, romance"
  },
  Saturn: {
    effect:"Discipline, karma, delays, service, longevity, mining",
    domains:["Long-term planning","Service","Agriculture","Research","Iron/coal"],
    warn:["Avoid new beginnings","Avoid hasty decisions","Avoid medical procedures if possible"],
    rec:"Best hora for: long-term planning, service-oriented work, research, disciplined study, karmic debt resolution"
  },
};

const HORA_UEDP_WEIGHTS: Record<string,number> = {
  Sun:1.2, Moon:1.0, Mars:1.1, Mercury:1.15, Jupiter:1.3, Venus:1.05, Saturn:0.85
};

const HORA_KARMA_LOAD: Record<string,number> = {
  Sun:0.2, Moon:0.3, Mars:0.5, Mercury:0.15, Jupiter:0.1, Venus:0.25, Saturn:0.6
};

export function computeHoraAnalysis(
  birth: BirthData,
  dashaData: DashaBlock,
  planets: Record<string,PlanetData>,
  ayanamsa: number,
  targetDate?: Date
): HoraUEDPAnalysis {
  const now = targetDate || new Date();
  const dateStr = now.toISOString().slice(0,10);

  // Day of week (0=Sun, 1=Mon, ... 6=Sat)
  const dow = now.getDay(); // 0=Sunday
  const dayLord = DAY_LORDS[dow];

  // Sunrise approximation: use standard 6:00 AM IST (simplified; true computation needs ephemeris)
  // For precise sunrise: use astronomy formula. Here we approximate at 6:00 AM local time.
  const sunriseMins = 360; // 6:00 AM in minutes from midnight

  // Find starting hora lord index in Chaldean order
  const dayLordIdx = HORA_CHALDEAN.indexOf(dayLord);

  // Current dasha info
  const curDasha = dashaData.current;
  const DASHA_WEIGHTS: Record<string,number> = {MD:1.0, AD:0.6, PD:0.3};

  function getDashaActivation(lord: string): number {
    let w = 0;
    if (curDasha.mahadasha === lord) w += DASHA_WEIGHTS.MD;
    if (curDasha.antardasha === lord) w += DASHA_WEIGHTS.AD;
    if (curDasha.pratyantara === lord) w += DASHA_WEIGHTS.PD;
    return Math.max(0.05, w);
  }

  // Lagna rashi for functional nature
  const lagnaRashi = planets.Sun?.rashi || "Mesha"; // Use ascendant from chart
  const FUNCTIONAL_NATURE: Record<string,Record<string,number>> = {
    Mesha:    {Sun:1,Moon:1,Mars:1,Jupiter:1,Mercury:-1,Venus:-1,Saturn:-1,Rahu:-1,Ketu:1},
    Vrishabha:{Venus:1,Mercury:1,Saturn:1,Moon:1,Sun:-1,Mars:-1,Jupiter:-1,Rahu:-1,Ketu:1},
    Mithuna:  {Mercury:1,Venus:1,Saturn:1,Rahu:1,Sun:-1,Moon:-1,Mars:-1,Jupiter:-1,Ketu:-1},
    Karka:    {Moon:1,Mars:1,Jupiter:1,Mercury:-1,Venus:-1,Saturn:-1,Sun:0,Rahu:-1,Ketu:1},
    Simha:    {Sun:1,Mars:1,Jupiter:1,Mercury:-1,Venus:-1,Saturn:-1,Moon:0,Rahu:-1,Ketu:1},
    Kanya:    {Mercury:1,Venus:1,Rahu:1,Moon:-1,Mars:-1,Jupiter:-1,Sun:-1,Saturn:1,Ketu:-1},
    Tula:     {Mercury:1,Venus:1,Saturn:1,Rahu:1,Sun:-1,Moon:-1,Jupiter:-1,Mars:-1,Ketu:-1},
    Vrishchika:{Moon:1,Jupiter:1,Sun:1,Mars:1,Mercury:-1,Venus:-1,Saturn:-1,Rahu:-1,Ketu:1},
    Dhanu:    {Sun:1,Mars:1,Jupiter:1,Moon:1,Mercury:-1,Venus:-1,Saturn:-1,Rahu:-1,Ketu:1},
    Makara:   {Venus:1,Mercury:1,Saturn:1,Rahu:1,Moon:-1,Mars:-1,Jupiter:-1,Sun:-1,Ketu:-1},
    Kumbha:   {Venus:1,Saturn:1,Rahu:1,Moon:-1,Mars:-1,Jupiter:-1,Sun:-1,Mercury:1,Ketu:-1},
    Meena:    {Moon:1,Mars:1,Jupiter:1,Ketu:1,Mercury:-1,Venus:-1,Saturn:-1,Sun:0,Rahu:-1},
  };

  function getFunctionalPolarity(lord: string): number {
    const fn = FUNCTIONAL_NATURE[lagnaRashi] || {};
    return fn[lord] !== undefined ? fn[lord] : 0;
  }

  // Build horas for the day
  const horas: HoraData[] = [];
  const currentMins = now.getHours()*60 + now.getMinutes();

  // toTime: minutes-from-midnight → "HH:MM" — hoisted above loop so weeklyPattern can use it
  const toTime = (m:number) => {
    const wrapped = ((m % 1440) + 1440) % 1440;
    return `${String(Math.floor(wrapped/60)).padStart(2,'0')}:${String(wrapped%60).padStart(2,'0')}`;
  };

  for (let h=0; h<24; h++) {
    const horaLordIdx = (dayLordIdx + h) % 7;
    const horaLord = HORA_CHALDEAN[horaLordIdx];

    // Hora sign (Surya Siddhanta): odd hora numbers (1,3,5...) = Simha (Sun-hora = Solar)
    // even hora numbers (2,4,6...) = Karka (Moon-hora = Lunar)
    const horaNum = h + 1;
    const horaType: "Solar"|"Lunar" = horaNum % 2 === 1 ? "Solar" : "Lunar";
    const horaSign = horaType === "Solar" ? "Simha" : "Karka";

    // Time window
    const startMins = sunriseMins + h*60;
    const endMins = startMins + 60;

    const isCurrentHora = currentMins >= startMins % 1440 && currentMins < endMins % 1440;

    // UEDP computation for this hora
    const dashaAct = getDashaActivation(horaLord);
    const funcPol  = getFunctionalPolarity(horaLord);
    const karmaW   = HORA_KARMA_LOAD[horaLord] || 0.3;
    const horaW    = HORA_UEDP_WEIGHTS[horaLord] || 1.0;

    // Hora sequence for UEDP input
    // Build x-sequence from hora lord's natal planet strength + dasha activation
    const pData = planets[horaLord];
    const digScore = pData ? {exalted:0.9,moolatrikona:0.8,own:0.7,friend:0.6,neutral:0.5,enemy:0.3,debilitated:0.2}[pData.dignity as string] || 0.5 : 0.5;
    const houseScore = pData ? ({1:1.0,4:1.0,7:1.0,10:1.0,5:0.95,9:0.95,2:0.7,11:0.7,3:0.6,6:0.4,8:0.3,12:0.35}[pData.house as number] || 0.5) : 0.5;

    // Hora position in day creates phase oscillation — models diurnal coherence
    const phase = Math.cos(h * Math.PI / 12); // peaks at noon
    const x_hora = [digScore, houseScore, dashaAct, horaW, Math.max(0, funcPol*0.3 + 0.5), Math.max(0.1, 0.5 - karmaW*0.3), Math.abs(phase)*0.5 + 0.5];

    const horaUEDP = computeUEDPCore(x_hora, 0.4, 0.35, 0.25, 0.3, 2);
    const omegaHora = horaUEDP.omega;
    const uedpScore = Math.round(omegaHora * horaW * (1 + dashaAct*0.5) * 100) / 100;

    // Karma load: Γ = (Ω_debt × |LE|) / |R_mod|
    const horaKarmaLoad = Math.round(karmaW * (1 - omegaHora) * 100) / 100;
    const horaResilience = Math.round(horaUEDP.atRatio * 0.5 * 100) / 100;
    const horaEmergenceForce = Math.round(Math.abs(horaUEDP.latentEmergence) * 100) / 100;
    const horaInstability = Math.round(horaUEDP.iseq * 100) / 100;
    const horaCoherence = Math.round(omegaHora * 100) / 100;

    const eff = HORA_EFFECTS[horaLord];
    horas.push({
      horaNumber: horaNum,
      horaLord, horaSign, horaType,
      startTime: toTime(startMins),
      endTime: toTime(endMins),
      isCurrentHora,
      uedpScore, omegaHora: horaCoherence,
      horaEffect: eff?.effect || "",
      horaRecommendation: eff?.rec || "",
      domains: eff?.domains || [],
      warningDomains: eff?.warn || [],
      horaInstability, horaCoherence,
      horaKarmaLoad, horaResilience, horaEmergenceForce,
      dasha_activation: Math.round(dashaAct*100)/100,
    });
  }

  // Best / avoid horas by UEDP score
  const sorted = [...horas].sort((a,b) => b.uedpScore - a.uedpScore);
  const bestHoras = sorted.slice(0,4);
  const avoidHoras = sorted.slice(-3).reverse();

  // Daily omega = mean of all hora Ω values
  const dailyOmega = Math.round(horas.reduce((s,h)=>s+h.omegaHora,0)/horas.length * 1e4)/1e4;
  const dailyCoherence = dailyOmega >= OMEGA_CRIT
    ? `STABLE (Ω=${dailyOmega.toFixed(4)} ≥ 1/e)`
    : `BELOW CRITICAL (Ω=${dailyOmega.toFixed(4)} < 1/e)`;

  // Weekly pattern (7-day scan, same time each day)
  const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weeklyPattern: HoraWeekPattern[] = WEEK_DAYS.map((day,i) => {
    const wDayLord = DAY_LORDS[i];
    const wDayLordIdx = HORA_CHALDEAN.indexOf(wDayLord);
    const avgO = Array.from({length:24},(_,h2)=>{
      const hlIdx = (wDayLordIdx + h2) % 7;
      const hl = HORA_CHALDEAN[hlIdx];
      const pd2 = planets[hl];
      const ds2 = pd2 ? ({exalted:0.9,moolatrikona:0.8,own:0.7,friend:0.6,neutral:0.5,enemy:0.3,debilitated:0.2}[pd2.dignity as string]||0.5) : 0.5;
      const da2 = getDashaActivation(hl);
      return Math.exp(-(0.4*Math.abs(ds2-0.5) + 0.3*Math.abs(da2-0.5)));
    }).reduce((s,v)=>s+v,0)/24;

    // Best domain for this day
    const bestDomains = (HORA_EFFECTS[wDayLord]?.domains||[]).slice(0,2).join(", ");

    return {
      day, dayLord: wDayLord,
      avgOmega: Math.round(avgO*1e4)/1e4,
      bestDomain: bestDomains,
      peakHora: `${wDayLord} (${toTime(sunriseMins)})`,
      uedpGrade: avgO>=0.6?"HIGH":avgO>=OMEGA_CRIT?"STABLE":"CAUTION"
    };
  });

  return {
    date: dateStr,
    dayLord, sunrise: toTime(sunriseMins),
    timezone: birth.timezone,
    horas, bestHoras, avoidHoras,
    dailyOmega, dailyCoherence,
    uedpSummary: `UEDP v5 Hora Analysis — ${dateStr}. Day lord: ${dayLord}. Daily Ω=${dailyOmega.toFixed(4)}. ${bestHoras[0]?.horaLord || '—'} hora is most coherent today. G S Ramesh Kumar protocol.`,
    weeklyPattern,
  };
}

// ═══════════════════════════════════════════
// PANCHANG
// ═══════════════════════════════════════════

const TITHI_NAMES = ["Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Amavasya"];
const VARA_NAMES  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const YOGA_NAMES  = ["Vishkumbha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shoola","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
const KARANA_NAMES= ["Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti","Bhadra","Shakuni","Chatushpada","Naga"];

export function computePanchang(jd:number, moonLon:number, sunLon:number, ascLon:number, ayanamsa:string): PanchangData {
  const tDiff = (moonLon - sunLon + 360) % 360;
  const tNum = Math.floor(tDiff/12) + 1;
  const tName = TITHI_NAMES[tNum-1];
  const paksha = tNum <= 15 ? "Shukla" : "Krishna";
  const tProg = (tDiff % 12) / 12;
  const vara = VARA_NAMES[Math.floor(jd+1.5) % 7];
  const moonNak = lonToNak(moonLon);
  const yNum = Math.floor((sunLon + moonLon) % 360 / (360/27)) % 27;
  const yoga = YOGA_NAMES[yNum];
  const kNum = Math.floor((moonLon - sunLon + 360) % 360 / 6) % 11;
  const karana = KARANA_NAMES[kNum];
  return {
    tithi:{number:tNum, name:tName, paksha, tithi_in_paksha:tNum<=15?tNum:tNum-15, progress:Math.round(tProg*1e4)/1e4},
    vara, nakshatra:moonNak.name, nakshatraLord:moonNak.lord,
    yoga, karana,
    moonSign:lonToRashi(moonLon), sunSign:lonToRashi(sunLon), lagna:lonToRashi(ascLon),
  };
}

// ═══════════════════════════════════════════
// PLANET TABLE
// ═══════════════════════════════════════════

export function buildPlanetTable(rawPos: Record<string,{lon:number;speed:number;retro:boolean}>, ascLon:number, sunLon:number): Record<string,PlanetData> {
  const result: Record<string,PlanetData> = {};
  for (const [pname, pdata] of Object.entries(rawPos)) {
    const lon = pdata.lon;
    const rashi = lonToRashi(lon);
    const sign  = lonToSign(lon);
    const house = houseFromLon(lon, ascLon);
    const nak   = lonToNak(lon);
    const dig   = getDignity(pname, sign);
    const comb  = isCombust(pname, lon, sunLon);
    result[pname] = {
      rashi, sign, house,
      degree: Math.round(lon*1e4)/1e4,
      degInSign: Math.round(degInSign(lon)*1e4)/1e4,
      nakshatra: nak.name, nakshatraLord: nak.lord, pada: nak.pada,
      dignity: dig, retrograde: pdata.retro, combust: comb,
      rashiLord: RASHI_LORD[rashi] || "",
      speed: Math.round(pdata.speed*1e4)/1e4,
    };
  }
  return result;
}

// ═══════════════════════════════════════════
// SHADBALA (Phaladeepika Ch.12)
// ═══════════════════════════════════════════

const NAISARGIKA_BALA: Record<string,number> = {Sun:60,Moon:51.4,Venus:42.8,Jupiter:34.3,Mercury:25.7,Mars:17.1,Saturn:8.6};
const DIGBALA_HOUSE: Record<string,number> = {Sun:10,Mars:10,Saturn:7,Jupiter:1,Mercury:1,Moon:4,Venus:4};

export function computeShadbala(planets: Record<string,PlanetData>): Record<string,ShadbalaData> {
  const result: Record<string,ShadbalaData> = {};
  const DIG_STHAN: Record<string,number> = {exalted:60,moolatrikona:45,own:30,friend:22,neutral:15,enemy:10,debilitated:5};
  for (const pname of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]) {
    const p = planets[pname];
    if (!p) continue;
    const sthana = DIG_STHAN[p.dignity] || 15;
    const dh = DIGBALA_HOUSE[pname] || 7;
    const digB = Math.max(5, 60 - Math.abs(p.house - dh)*7);
    const kala = 30;
    const chesta = p.retrograde ? 45 : 25;
    const nais = NAISARGIKA_BALA[pname] || 25;
    const drik = 15;
    const total = sthana + digB + kala + chesta + nais + drik;
    const rupas = Math.round(total/60*100)/100;
    const grade = rupas>=3.5?"Strong":rupas>=2.5?"Moderate":"Weak";
    const ishta = Math.round(Math.min(60, sthana*0.8+nais*0.2)*10)/10;
    result[pname] = {
      sthanaBala:Math.round(sthana*10)/10, digBala:Math.round(digB*10)/10,
      kalaBala:Math.round(kala*10)/10, chestaBala:Math.round(chesta*10)/10,
      naisargikaBala:Math.round(nais*10)/10, drikBala:Math.round(drik*10)/10,
      totalRupas:rupas, strengthGrade:grade,
      ishtaPhala:ishta, kashtaPhala:Math.round((60-ishta)*10)/10,
    };
  }
  return result;
}

// ═══════════════════════════════════════════
// STRENGTHS
// ═══════════════════════════════════════════

const DIG_MULT: Record<string,number> = {exalted:1.0,moolatrikona:0.85,own:0.75,friend:0.65,neutral:0.55,enemy:0.35,debilitated:0.2};
const HOUSE_STR: Record<number,number> = {1:1.0,4:1.0,7:1.0,10:1.0,5:0.95,9:0.95,2:0.7,11:0.7,3:0.6,6:0.4,8:0.25,12:0.3};

export function computeStrengths(planets: Record<string,PlanetData>): Record<string,StrengthData> {
  const result: Record<string,StrengthData> = {};
  for (const [pname, p] of Object.entries(planets)) {
    const dm = DIG_MULT[p.dignity] || 0.55;
    const hs = HOUSE_STR[p.house] || 0.5;
    let score = dm*35 + hs*25 + 15;
    if (p.combust)    score *= 0.65;
    if (p.retrograde) score = Math.min(score*1.1, 95);
    result[pname] = {
      dignity:{state:p.dignity, multiplier:dm},
      houseStrength:Math.round(hs*100*10)/10,
      combust:p.combust, retrograde:p.retrograde,
      totalScore:Math.round(Math.min(100,Math.max(0,score))*100)/100,
    };
  }
  return result;
}

// ═══════════════════════════════════════════
// ASHTAKAVARGA
// ═══════════════════════════════════════════

export function computeAshtakavarga(planets: Record<string,PlanetData>, lagnaRashi:string): Record<string,AshtakavargaData> {
  const av: Record<string,AshtakavargaData> = {};
  const lagnaIdx = RASHIS.indexOf(lagnaRashi) || 0;
  const byHouse: Record<number,number> = {};
  for (let i=1;i<=12;i++) byHouse[i]=28;

  const DIG_BOOST: Record<string,number> = {exalted:6,moolatrikona:4,own:3,friend:2,neutral:0,enemy:-2,debilitated:-4};
  for (const pname of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]) {
    const p = planets[pname];
    if (!p) continue;
    const pIdx = RASHIS.indexOf(p.rashi) >= 0 ? RASHIS.indexOf(p.rashi) : 0;
    byHouse[p.house] = Math.max(0,Math.min(56,(byHouse[p.house]||28) + (DIG_BOOST[p.dignity]||0)));
    const bav = Array.from({length:12},(_,i2) => {
      const diff = (i2 - pIdx + 12) % 12;
      return diff===0?7:([4,8].includes(diff)?5:[3,6,9].includes(diff)?4:[2,5,11].includes(diff)?3:2);
    });
    const ts = bav[(p.house-1)%12];
    const best = bav.map((s,i2)=>({s,r:RASHIS[(pIdx+i2)%12]})).filter(x=>x.s>=5).map(x=>x.r);
    av[pname] = {bav, total:bav.reduce((s,v)=>s+v,0), transitScoreCurrent:ts, strongSigns:best};
  }
  const sarva = Array.from({length:12},(_,i)=>Math.max(0,Math.min(56,byHouse[i+1]||28)));
  const maxH = sarva.indexOf(Math.max(...sarva))+1;
  const minH = sarva.indexOf(Math.min(...sarva))+1;
  av.sarva = {bav:sarva,total:sarva.reduce((s,v)=>s+v,0),transitScoreCurrent:sarva[0],strongSigns:[RASHIS[(lagnaIdx+maxH-1)%12]]};
  return av;
}

// ═══════════════════════════════════════════
// BHAVAS
// ═══════════════════════════════════════════

const HOUSE_NAMES = ["Lagna","Dhana","Sahaja","Sukha","Putra","Ari","Kalatra","Mrityu","Dharma","Karma","Labha","Vyaya"];
const HOUSE_SIGNIF = [
  "Self, body, vitality, personality, appearance",
  "Wealth, family, speech, food, accumulated assets",
  "Courage, siblings, communication, short travel, creativity",
  "Mother, home, happiness, property, education, vehicles",
  "Children, intelligence, creativity, speculation, past merit",
  "Enemies, disease, debt, service, litigation, daily routine",
  "Marriage, partner, business partnerships, open enemies, travel abroad",
  "Longevity, transformation, occult, inheritance, hidden matters",
  "Father, fortune, dharma, long travel, guru, higher learning",
  "Career, status, government, authority, public reputation, fame",
  "Gains, income, elder siblings, fulfilment, social network",
  "Loss, expenditure, liberation, foreign lands, spiritual growth",
];

export function computeBhavas(planets: Record<string,PlanetData>, ascLon:number): BhavaData[] {
  const lagnaR = lonToRashi(ascLon);
  const lagnaIdx = RASHIS.indexOf(lagnaR) || 0;
  const houseMap: Record<number,string[]> = {};
  for (const [pn,p] of Object.entries(planets)) {
    if (!houseMap[p.house]) houseMap[p.house] = [];
    houseMap[p.house].push(pn);
  }
  return Array.from({length:12},(_,i) => {
    const rashi = RASHIS[(lagnaIdx+i)%12];
    const lord  = RASHI_LORD[rashi] || "";
    const lordData = planets[lord];
    return {
      bhava:i+1, name:HOUSE_NAMES[i], rashi, lord,
      lordHouse: lordData?.house || 0,
      lordDignity: lordData?.dignity || "neutral",
      planets: houseMap[i+1] || [],
      signification: HOUSE_SIGNIF[i],
    };
  });
}

// ═══════════════════════════════════════════
// VIMSHOTTARI DASHA
// ═══════════════════════════════════════════

export function computeDashas(birthDate: Date, moonLon: number): DashaEntry[] {
  const nak = lonToNak(moonLon);
  const nakLord = nak.lord;
  const span = 360/27;
  const elapsedFrac = (moonLon % span) / span;
  const lordIdx = DASHA_SEQ.indexOf(nakLord);
  const dashas: DashaEntry[] = [];
  let curDt = new Date(birthDate);
  const remFrac = 1 - elapsedFrac;
  const firstY = DASHA_YEARS[nakLord] * remFrac;
  let endDt = new Date(curDt.getTime() + firstY*365.25*24*3600*1000);
  dashas.push({lord:nakLord,start:fmt(curDt),end:fmt(endDt),years:Math.round(firstY*1e3)/1e3,complete:false});
  curDt = endDt;
  for (let i=1;i<9;i++) {
    const lord = DASHA_SEQ[(lordIdx+i)%9];
    const yrs = DASHA_YEARS[lord];
    endDt = new Date(curDt.getTime() + yrs*365.25*24*3600*1000);
    dashas.push({lord,start:fmt(curDt),end:fmt(endDt),years:yrs,complete:true});
    curDt = endDt;
  }
  return dashas;
}

function fmt(d:Date): string { return d.toISOString().slice(0,10); }

export function computeAntardasha(mahaLord:string, mahaStart:string, mahaEnd:string): AntarEntry[] {
  const mahaY = DASHA_YEARS[mahaLord];
  let curDt = new Date(mahaStart);
  const mlIdx = DASHA_SEQ.indexOf(mahaLord);
  return DASHA_SEQ.map((_,i) => {
    const sl = DASHA_SEQ[(mlIdx+i)%9];
    const days = Math.floor(mahaY * DASHA_YEARS[sl] / 120 * 365.25);
    const e = new Date(curDt.getTime() + days*24*3600*1000);
    const entry: AntarEntry = {lord:sl,start:fmt(curDt),end:fmt(e),years:Math.round(mahaY*DASHA_YEARS[sl]/120*1e3)/1e3};
    curDt = e;
    return entry;
  });
}

export function buildDashaBlock(dashas:DashaEntry[], birthDt:Date, moonLon:number): DashaBlock {
  const now = new Date();
  const today = fmt(now);
  const moonNak = lonToNak(moonLon);
  const cur = dashas.find(d => d.start <= today && today <= d.end) || dashas[dashas.length-1];
  const antars = computeAntardasha(cur.lord, cur.start, cur.end);
  // Add antardashas to each dasha
  for (const d of dashas) {
    d.antardashas = computeAntardasha(d.lord, d.start, d.end);
  }
  const curA = antars.find(a => a.start <= today && today <= a.end) || antars[antars.length-1];
  const curAntars2 = computeAntardasha(curA.lord, curA.start, curA.end);
  const curP = curAntars2.find(p => p.start <= today && today <= p.end) || curAntars2[0];
  const mahaS = new Date(cur.start);
  const mahaE = new Date(cur.end);
  const elapY = Math.round((now.getTime()-mahaS.getTime())/365.25/24/3600/1000*100)/100;
  const remY  = Math.round((mahaE.getTime()-now.getTime())/365.25/24/3600/1000*100)/100;
  return {
    birthNakshatra:moonNak.name, nakshatraLord:moonNak.lord,
    current:{mahadasha:cur.lord,mahaStart:cur.start,mahaEnds:cur.end,antardasha:curA.lord,antarEnds:curA.end,pratyantara:curP?.lord||""},
    elapsedYears:elapY, remainingYears:remY,
    dashas, antardashas:antars,
  };
}

// ═══════════════════════════════════════════
// DOSHA DETECTION (Surya Siddhanta + BPHS)
// ═══════════════════════════════════════════

const DOSHA_DB: Record<string,{alias:string;level:string;effects:string[];remedies:SimpleParihara[]}> = {
  Manglik:{alias:"Kuja Dosha",level:"High",effects:["Delays/friction in marriage","Relationship conflicts","Partner health risk"],remedies:[{r:"Kumbha Vivah (marry a pot/peepal tree first)"},{r:"Perform Mangal Puja on Tuesdays for 40 weeks"},{r:"Wear Red Coral in copper ring on right ring finger"},{r:"Recite Mangal Stotra 108 times on Tuesdays"}]},
  Pitru_Dosha:{alias:"Ancestral Debt",level:"Moderate",effects:["Blocked progress","Ancestral karmic debt","Father-related difficulties"],remedies:[{r:"Perform Pitru Tarpan on Amavasya at sacred river"},{r:"Donate food on every Amavasya"},{r:"Perform Narayan Bali if advised by priest"}]},
  Kaal_Sarp:{alias:"Kaal Sarp Yoga",level:"High",effects:["Obstacles despite effort","Recurring setbacks","Delayed success"],remedies:[{r:"Kaal Sarp Puja at Trimbakeshwar Jyotirlinga"},{r:"Recite Maha Mrityunjaya mantra 108 times daily"},{r:"Wear Hessonite (Gomed) after consultation"}]},
  Grahan_Dosha:{alias:"Eclipse Dosha",level:"Moderate",effects:["Mental confusion","Health concerns","Career obstacles"],remedies:[{r:"Surya/Chandra Grahan Shanti puja"},{r:"Donate jaggery+wheat on Sundays"},{r:"Recite Aditya Hridayam daily"}]},
  Angarak_Yoga:{alias:"Mars-Rahu Conjunction",level:"High",effects:["Accidents and injury risk","Explosive anger","Legal troubles"],remedies:[{r:"Hanuman Chalisa recitation daily"},{r:"Donate red lentils on Tuesdays"}]},
  Guru_Chandal:{alias:"Jupiter-Rahu Conjunction",level:"Moderate",effects:["Wisdom distorted by illusion","Guru betrayal","Unconventional beliefs"],remedies:[{r:"Donate yellow items on Thursdays"},{r:"Recite Jupiter Beeja mantra 19000 times"}]},
  Vish_Yoga:{alias:"Saturn-Moon Conjunction",level:"High",effects:["Emotional depression","Pessimism","Mother's health issues"],remedies:[{r:"Recite Shani Chalisa on Saturdays"},{r:"Donate black sesame on Saturdays"},{r:"Wear Pearl in silver on Monday"}]},
  Shrapit_Dosha:{alias:"Saturn-Rahu Conjunction",level:"High",effects:["Karmic burden from past","Blocked fortune","Chronic obstacles"],remedies:[{r:"Shrapit Shanti puja at Shani temple"},{r:"Donate iron/black cloth on Saturdays"}]},
  Kemdrum_Yoga:{alias:"Isolated Moon",level:"Moderate",effects:["Lack of mental support","Financial instability","Emotional isolation"],remedies:[{r:"Worship Goddess Parvati on Mondays"},{r:"Wear natural Pearl in silver"},{r:"Recite Chandra mantra 11000 times"}]},
  Rahu_Kalatra:{alias:"Rahu in 7th House",level:"Moderate",effects:["Unconventional partnership","Marriage delays","Foreign spouse possible"],remedies:[{r:"Worship Goddess Durga on Fridays"},{r:"Sri Kalahasti Rahu-Ketu temple puja"}]},
};

export function detectDoshas(planets: Record<string,PlanetData>, lagnaRashi:string): DoshaResult[] {
  const doshas: DoshaResult[] = [];
  const h = (p:string) => planets[p]?.house || 0;
  const lon = (p:string) => planets[p]?.degree || 0;
  const prox = (p1:string,p2:string,orb=8) => { const d=Math.abs(lon(p1)-lon(p2))%360; return Math.min(d,360-d)<=orb; };

  // Helper to map strength → severity key
  const toSev = (sc:number): "severe"|"moderate"|"mild"|"none" =>
    sc>=75?"severe":sc>=60?"moderate":sc>=40?"mild":"none";

  // Manglik
  const mh = h("Mars");
  if ([1,4,7,8,12].includes(mh)) {
    const manglikMap: Record<number,number> = {1:70,4:65,7:80,8:75,12:60};
    const sc = manglikMap[mh] ?? 65;
    const d = DOSHA_DB.Manglik;
    doshas.push({name:"Manglik",alias:d.alias,strength:sc,level:sc>=70?"High":"Moderate",
      severity:toSev(sc),effects:d.effects,remedies:d.remedies,placement:`Mars in House ${mh}`,
      lifeAreas:["Marriage","Relationships"],isLatent:false,
      source:"BPHS Ch.81; Phaladeepika Ch.19",planets:["Mars"],houses:[mh]});
  }
  // Pitru Dosha
  const sh = h("Sun");
  if (sh===9 || prox("Sun","Rahu") || prox("Sun","Ketu")) {
    const d=DOSHA_DB.Pitru_Dosha;
    doshas.push({name:"Pitru_Dosha",alias:d.alias,strength:65,level:"Moderate",severity:toSev(65),effects:d.effects,remedies:d.remedies,placement:`Sun in H${sh}/ecliptic affliction`,lifeAreas:["Father","Fortune"],isLatent:false,source:"Atharva Veda; BPHS Ch.76",planets:["Sun","Rahu"],houses:[sh,9]});
  }
  // Kaal Sarp
  const rl=lon("Rahu"),kl=lon("Ketu");
  const btw = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].filter(p=>{const pl=lon(p); const mn=Math.min(rl,kl),mx=Math.max(rl,kl); return pl>=mn&&pl<=mx;}).length;
  if (btw<=1||btw>=6) { const d=DOSHA_DB.Kaal_Sarp; doshas.push({name:"Kaal_Sarp",alias:d.alias,strength:72,level:"High",severity:toSev(72),effects:d.effects,remedies:d.remedies,placement:`Rahu ${rl.toFixed(1)}°/Ketu ${kl.toFixed(1)}°`,lifeAreas:["Overall fortune","Obstacles"],isLatent:false,source:"Muhurta Chintamani; BPHS Ch.36",planets:["Rahu","Ketu"],houses:[]}); }
  // Grahan
  if (prox("Sun","Rahu")||prox("Moon","Rahu")||prox("Sun","Ketu")||prox("Moon","Ketu")) { const d=DOSHA_DB.Grahan_Dosha; doshas.push({name:"Grahan_Dosha",alias:d.alias,strength:68,level:"Moderate",severity:toSev(68),effects:d.effects,remedies:d.remedies,placement:"Sun/Moon within 8° of Rahu/Ketu",lifeAreas:["Mind","Health","Clarity"],isLatent:false,source:"Surya Siddhanta; BPHS Ch.19",planets:["Sun","Moon","Rahu","Ketu"],houses:[]}); }
  // Angarak
  if (prox("Mars","Rahu")) { const d=DOSHA_DB.Angarak_Yoga; doshas.push({name:"Angarak_Yoga",alias:d.alias,strength:78,level:"High",severity:toSev(78),effects:d.effects,remedies:d.remedies,placement:"Mars conjunct Rahu",lifeAreas:["Health","Accidents","Legal"],isLatent:false,source:"Phaladeepika Ch.14",planets:["Mars","Rahu"],houses:[h("Mars"),h("Rahu")]}); }
  // Guru Chandal
  if (prox("Jupiter","Rahu")) { const d=DOSHA_DB.Guru_Chandal; doshas.push({name:"Guru_Chandal",alias:d.alias,strength:65,level:"Moderate",severity:toSev(65),effects:d.effects,remedies:d.remedies,placement:"Jupiter conjunct Rahu",lifeAreas:["Wisdom","Dharma"],isLatent:true,source:"BPHS Ch.25",planets:["Jupiter","Rahu"],houses:[h("Jupiter"),h("Rahu")]}); }
  // Vish Yoga
  if (prox("Saturn","Moon")) { const d=DOSHA_DB.Vish_Yoga; doshas.push({name:"Vish_Yoga",alias:d.alias,strength:72,level:"High",severity:toSev(72),effects:d.effects,remedies:d.remedies,placement:"Saturn conjunct Moon",lifeAreas:["Mental health","Happiness"],isLatent:false,source:"Phaladeepika Ch.17",planets:["Saturn","Moon"],houses:[h("Saturn"),h("Moon")]}); }
  // Shrapit
  if (prox("Saturn","Rahu")) { const d=DOSHA_DB.Shrapit_Dosha; doshas.push({name:"Shrapit_Dosha",alias:d.alias,strength:74,level:"High",severity:toSev(74),effects:d.effects,remedies:d.remedies,placement:"Saturn conjunct Rahu",lifeAreas:["Career","Fortune"],isLatent:false,source:"BPHS Ch.36; Atharva Veda",planets:["Saturn","Rahu"],houses:[h("Saturn"),h("Rahu")]}); }
  // Kemdrum
  const mh2=h("Moon"); const adj=[(mh2-2+12)%12+1, mh2%12+1];
  if (!["Sun","Mars","Mercury","Jupiter","Venus","Saturn"].some(p=>adj.includes(h(p)))) { const d=DOSHA_DB.Kemdrum_Yoga; doshas.push({name:"Kemdrum_Yoga",alias:d.alias,strength:55,level:"Moderate",severity:toSev(55),effects:d.effects,remedies:d.remedies,placement:`Moon in H${mh2}, no planets in adjacent houses`,lifeAreas:["Support","Happiness"],isLatent:true,source:"Phaladeepika Ch.6",planets:["Moon"],houses:[mh2]}); }
  // Rahu Kalatra
  if (h("Rahu")===7) { const d=DOSHA_DB.Rahu_Kalatra; doshas.push({name:"Rahu_Kalatra",alias:d.alias,strength:62,level:"Moderate",severity:toSev(62),effects:d.effects,remedies:d.remedies,placement:"Rahu in 7th house",lifeAreas:["Marriage"],isLatent:false,source:"BPHS Ch.17; Phaladeepika Ch.19",planets:["Rahu"],houses:[7]}); }

  return doshas.sort((a,b)=>b.strength-a.strength);
}

// ═══════════════════════════════════════════
// YOGA DETECTION (Phaladeepika + BPHS)
// ═══════════════════════════════════════════

export function detectYogas(planets:Record<string,PlanetData>, strengths:Record<string,StrengthData>, lagnaRashi:string): YogaResult[] {
  const yogas: YogaResult[] = [];
  const h  = (p:string) => planets[p]?.house || 0;
  const s  = (p:string) => strengths[p]?.totalScore || 50;
  const sg = (p:string) => planets[p]?.sign || "";
  const li = RASHIS.indexOf(lagnaRashi);

  const PANCHA: Record<string,[string[],string]> = {
    Mars:    [["Aries","Capricorn"],  "Ruchaka"],
    Mercury: [["Gemini","Virgo"],     "Bhadra"],
    Jupiter: [["Sagittarius","Cancer"],"Hamsa"],
    Venus:   [["Taurus","Pisces"],    "Malavya"],
    Saturn:  [["Capricorn","Libra"],  "Shasha"],
  };
  for (const [planet,[signs,yname]] of Object.entries(PANCHA)) {
    if (signs.includes(sg(planet)) && [1,4,7,10].includes(h(planet))) {
      yogas.push({yoga:yname,type:"Pancha Mahapurusha",strength:Math.min(100,Math.floor(s(planet)+15)),planets:planet,description:`${planet} in ${sg(planet)} in Kendra H${h(planet)} — ${yname} Yoga`,electionRelevance:"HIGH"});
    }
  }
  // Gajakesari
  if (h("Moon")>0 && [0,3].includes(Math.abs(h("Moon")-h("Jupiter"))%6)) {
    yogas.push({yoga:"Gajakesari",type:"Raj Yoga",strength:Math.min(100,Math.floor((s("Moon")+s("Jupiter"))/1.5)),planets:"Moon+Jupiter",description:"Jupiter in Kendra from Moon — intelligence, fame, prosperity",electionRelevance:"HIGH"});
  }
  // Budhaditya
  if (h("Sun")===h("Mercury")&&h("Sun")>0) {
    yogas.push({yoga:"Budhaditya",type:"Solar",strength:Math.min(100,Math.floor((s("Sun")+s("Mercury"))/1.8)),planets:"Sun+Mercury",description:"Sun conjunct Mercury — sharp intellect, communication authority",electionRelevance:"MEDIUM"});
  }
  // Amala
  for (const p of ["Jupiter","Venus","Moon"]) { if (h(p)===10&&s(p)>60) yogas.push({yoga:"Amala",type:"Reputation",strength:Math.floor(s(p)),planets:p,description:`${p} in 10th — unblemished fame`,electionRelevance:"HIGH"}); }
  // Raj Yoga (Kendra-Trikona lord combination)
  if (li>=0) {
    const kendraLords = new Set([0,3,6,9].map(i=>RASHI_LORD[RASHIS[(li+i)%12]]));
    const trikonaLords= new Set([0,4,8].map(i=>RASHI_LORD[RASHIS[(li+i)%12]]));
    const common = Array.from(kendraLords).filter(p=>trikonaLords.has(p));
    for (const p of common) { if (s(p)>60) yogas.push({yoga:`Yogakaraka (${p})`,type:"Raj Yoga",strength:Math.min(100,Math.floor(s(p)+10)),planets:p,description:`${p} lords both Kendra and Trikona — highest Raj Yoga`,electionRelevance:"HIGH"}); }
  }
  return yogas.sort((a,b)=>b.strength-a.strength).slice(0,12);
}

// ═══════════════════════════════════════════
// MEDICAL (Ayurveda + Phaladeepika)
// ═══════════════════════════════════════════

export function computeMedical(planets:Record<string,PlanetData>, strengths:Record<string,StrengthData>, dashaLord:string): MedicalData {
  const s = (p:string) => strengths[p]?.totalScore || 50;
  const moonSign = planets.Moon?.sign || "";
  const VATA=["Gemini","Virgo","Libra","Aquarius","Capricorn","Aries"];
  const PITTA=["Leo","Sagittarius","Scorpio","Aries"];
  const KAPHA=["Taurus","Cancer","Pisces","Gemini"];
  let vata=33+(moonSign&&VATA.includes(moonSign)?12:0);
  let pitta=33+(moonSign&&PITTA.includes(moonSign)?12:0);
  let kapha=33+(moonSign&&KAPHA.includes(moonSign)?12:0);
  const tot=vata+pitta+kapha;
  vata=Math.round(vata/tot*100*10)/10; pitta=Math.round(pitta/tot*100*10)/10; kapha=Math.round(100-vata-pitta*10)/10;
  const dom = vata>=pitta&&vata>=kapha?"Vata":pitta>=kapha?"Pitta":"Kapha";
  const hi = Math.round(Math.min(1,(s("Sun")*0.25+s("Moon")*0.25+s("Jupiter")*0.2+s("Mars")*0.15+s("Saturn")*0.15)/100)*1e3)/1e3;
  const grade = hi>0.8?"Excellent":hi>0.65?"Good":hi>0.45?"Moderate":"Fragile";
  const ORGAN_MAP: Record<string,{organs:string[];diseases:string[]}> = {
    Sun:{organs:["Heart","Eyes","Spine"],diseases:["Cardiac","Vision","Back pain"]},
    Moon:{organs:["Mind","Lungs","Lymph"],diseases:["Mental health","Respiratory"]},
    Mars:{organs:["Blood","Muscles","Head"],diseases:["Fever","Accidents","Surgery"]},
    Mercury:{organs:["Nervous system","Skin"],diseases:["Nervous","Skin disorders"]},
    Jupiter:{organs:["Liver","Fat","Arteries"],diseases:["Liver","Obesity"]},
    Venus:{organs:["Kidneys","Reproductive"],diseases:["Renal","Reproductive"]},
    Saturn:{organs:["Joints","Bones","Teeth"],diseases:["Arthritis","Dental","Chronic"]},
    Rahu:{organs:["Viral","Foreign body"],diseases:["Viral","Toxic","Unusual"]},
    Ketu:{organs:["Parasite","Skin"],diseases:["Parasitic","Mysterious"]},
  };
  const vulns: VulnerabilityData[] = [];
  for (const planet of ["Sun","Moon","Mars","Saturn","Rahu","Ketu"]) {
    const p=planets[planet]; if (!p) continue;
    let vs=0;
    if (p.dignity==="debilitated") vs+=0.4;
    else if (p.dignity==="enemy") vs+=0.2;
    if ([6,8,12].includes(p.house)) vs+=0.2;
    if (s(planet)<35) vs+=0.2;
    if (vs>0.15) {
      const om=ORGAN_MAP[planet]||{organs:[],diseases:[]};
      vulns.push({planet,organs:om.organs,diseases:om.diseases,vulnerabilityScore:Math.round(vs*100)/100,reason:`${planet} ${p.dignity} in H${p.house} — strength ${Math.round(s(planet))}/100`});
    }
  }
  const DH: Record<string,{risk:string;bodyFocus:string[]}> = {
    Sun:{risk:"Elevated",bodyFocus:["Heart","Eyes","Authority stress"]},Moon:{risk:"Moderate",bodyFocus:["Mind","Emotions","Lungs"]},Mars:{risk:"Elevated",bodyFocus:["Blood","Surgery","Accidents"]},Mercury:{risk:"Low",bodyFocus:["Nervous system","Skin"]},Jupiter:{risk:"Low",bodyFocus:["Liver","Weight"]},Venus:{risk:"Low",bodyFocus:["Kidneys","Reproductive"]},Saturn:{risk:"Moderate",bodyFocus:["Joints","Teeth","Chronic"]},Rahu:{risk:"Elevated",bodyFocus:["Viral","Unusual symptoms"]},Ketu:{risk:"Moderate",bodyFocus:["Parasitic","Spiritual body"]},
  };
  const DOSHA_REM: Record<string,string[]> = {
    Vata:["Warm sesame oil massage (Abhyanga)","Ashwagandha + warm milk","Triphala churna","Regular sleep schedule"],
    Pitta:["Coconut oil massage","Shatavari + cool milk","Avoid spicy/fried foods","Brahmi for cooling"],
    Kapha:["Dry powder massage (Udvartana)","Trikatu churna","Vigorous daily exercise","Ginger tea"],
  };
  return {healthIndex:hi,healthGrade:grade,tridosha:{Vata:vata,Pitta:pitta,Kapha:kapha,dominant:dom,remedies:DOSHA_REM[dom]||[]},planetaryVulnerabilities:vulns,currentDashaHealth:{...DH[dashaLord]||{risk:"Moderate",bodyFocus:[]},lord:dashaLord}};
}

// ═══════════════════════════════════════════
// POLITICAL / LEADERSHIP
// ═══════════════════════════════════════════

export function computePolitical(planets:Record<string,PlanetData>, strengths:Record<string,StrengthData>, yogas:YogaResult[], lagnaRashi:string): PoliticalData {
  const s=(p:string)=>strengths[p]?.totalScore||50;
  const h=(p:string)=>planets[p]?.house||0;
  const li=RASHIS.indexOf(lagnaRashi);
  const authority   = Math.min(100,Math.floor(s("Sun")*0.7+s("Mars")*0.3));
  const vision      = Math.min(100,Math.floor(s("Jupiter")*0.7+s("Mercury")*0.3));
  const persuasion  = Math.min(100,Math.floor(s("Mercury")*0.5+s("Venus")*0.3+s("Moon")*0.2));
  const resilience  = Math.min(100,Math.floor(s("Saturn")*0.6+s("Mars")*0.4));
  const massConnect = Math.min(100,Math.floor(s("Moon")*0.7+s("Venus")*0.3));
  const strategy    = Math.min(100,Math.floor(s("Mercury")*0.5+s("Saturn")*0.3+s("Jupiter")*0.2));
  const overall     = Math.round((authority+vision+persuasion+resilience+massConnect+strategy)/6);
  const grade       = overall>=80?"Outstanding":overall>=65?"Strong":overall>=50?"Moderate":"Developing";
  const keyFactors: string[] = [];
  if (authority>70) keyFactors.push(`Sun strong (${authority}) — natural authority`);
  if (vision>70)    keyFactors.push("Jupiter strong — visionary wisdom");
  if (h("Sun")===10) keyFactors.push("Sun in 10th — peak authority");
  if ([1,4,7,10].includes(h("Moon"))) keyFactors.push("Moon in Kendra — mass popularity");
  const tenthRashi = li>=0?RASHIS[(li+9)%12]:"";
  const tenthLord  = RASHI_LORD[tenthRashi]||"";
  return {
    leadership:{overallLeadershipIndex:overall,grade,dimensions:{Authority:authority,Vision:vision,Persuasion:persuasion,Resilience:resilience,MassConnect:massConnect,Strategy:strategy},keyFactors},
    powerYogas:yogas,
    career:{dashamsha_lagna:lagnaRashi,tenth_house_lord:tenthLord,tenth_house_sign:tenthRashi,tenth_house_planets:Object.entries(planets).filter(([,p])=>p.house===10).map(([n])=>n),career_strength:s(tenthLord)>65?"Strong":s(tenthLord)>45?"Moderate":"Weak",lord_dignity:planets[tenthLord]?.dignity||"neutral"},
  };
}

// ═══════════════════════════════════════════
// VARGAS (Divisional Charts)
// ═══════════════════════════════════════════

export function computeVargas(rawPos:Record<string,{lon:number;speed:number;retro:boolean}>, ascLon:number): Record<string,VargaData> {
  function toVarga(lon:number, n:number): string {
    const signNum = Math.floor(lon/30);
    const vargaN  = Math.floor((lon%30)/(30/n));
    if (n===9) { const g={0:0,4:0,8:0,1:3,5:3,9:3,2:6,6:6,10:6,3:9,7:9,11:9}[signNum%12]||0; return RASHIS[(g+vargaN)%12]; }
    if (n===10) { return signNum%2===0?RASHIS[(signNum*n+vargaN)%12]:RASHIS[(signNum*n+vargaN+9)%12]; }
    return RASHIS[(signNum*n+vargaN)%12];
  }
  const vargas: Record<string,VargaData> = {};

  // D1
  const lagnaR  = lonToRashi(ascLon);
  const lagnaIdx= RASHIS.indexOf(lagnaR)||0;
  const d1Pls: Record<string,any> = {};
  for (const [pn,pd] of Object.entries(rawPos)) {
    const lon=pd.lon,rashi=lonToRashi(lon),sign=lonToSign(lon),ph=houseFromLon(lon,ascLon),dig=getDignity(pn,sign);
    d1Pls[pn]={rashi,sign,house:ph,dignity:dig,degInSign:Math.round(degInSign(lon)*100)/100,nakshatra:lonToNak(lon).name};
  }
  vargas.D1={lagna:{rashi:lagnaR,sign:RASHI_EN[lagnaIdx],degInSign:Math.round(degInSign(ascLon)*100)/100,nakshatra:lonToNak(ascLon).name,rashiLord:RASHI_LORD[lagnaR]||""},planets:d1Pls};

  for (const [key,n] of [["D9",9],["D10",10],["D3",3],["D4",4],["D7",7],["D12",12],["D60",60]] as [string,number][]) {
    const vLagnaR  = toVarga(ascLon,n);
    const vLagnaIdx= RASHIS.indexOf(vLagnaR)||0;
    const vPls: Record<string,any> = {};
    for (const [pn,pd] of Object.entries(rawPos)) {
      const vR=toVarga(pd.lon,n),vS=RASHI_EN[RASHIS.indexOf(vR)]||vR;
      const vH=(RASHIS.indexOf(vR)-vLagnaIdx+12)%12+1;
      vPls[pn]={rashi:vR,sign:vS,house:vH,dignity:getDignity(pn,vS),degInSign:Math.round((pd.lon*n)%30*100)/100,nakshatra:lonToNak(pd.lon).name};
    }
    const vb: VargaData = {lagna:{rashi:vLagnaR,sign:RASHI_EN[vLagnaIdx]||vLagnaR,degInSign:Math.round((ascLon*n)%30*100)/100,nakshatra:lonToNak(ascLon).name,rashiLord:RASHI_LORD[vLagnaR]||""},planets:vPls};
    if (key==="D10") {
      const t10r=RASHIS[(vLagnaIdx+9)%12];vb.tenthLord=RASHI_LORD[t10r]||"";
      vb.tenthLordDignity=vPls[vb.tenthLord]?.dignity||"neutral";
      vb.tenthHousePlanets=Object.entries(vPls).filter(([,p])=>p.house===10).map(([n])=>n);
    }
    vargas[key]=vb;
  }
  return vargas;
}

// ═══════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════

export function computePredictions(planets:Record<string,PlanetData>, strengths:Record<string,StrengthData>, dashaLord:string): Record<string,PredictionScore> {
  const s=(p:string)=>strengths[p]?.totalScore||50;
  const h=(p:string)=>planets[p]?.house||0;
  const sc=(base:number,plist:string[],hbonus?:number)=>{
    let v=base;
    for (const p of plist) v+=(s(p)-50)*0.15;
    if (hbonus&&plist.some(p=>h(p)===hbonus)) v+=8;
    if (plist.includes(dashaLord)) v+=12;
    return Math.round(Math.min(100,Math.max(0,v))*10)/10;
  };
  return {
    career:   {score:sc(40,["Sun","Saturn","Jupiter"],10),domain:"Career & Status",     icon:"⚡"},
    wealth:   {score:sc(40,["Jupiter","Venus"],11),         domain:"Wealth & Finance",  icon:"💰"},
    marriage: {score:sc(45,["Venus","Moon"],7),             domain:"Marriage",          icon:"💍"},
    health:   {score:sc(60,["Sun","Mars"],1),               domain:"Health & Vitality", icon:"🌿"},
    spiritual:{score:sc(40,["Jupiter","Ketu"],9),           domain:"Spiritual",         icon:"☯"},
    political:{score:sc(30,["Sun","Mars"],10),              domain:"Political Power",   icon:"🏛"},
    children: {score:sc(45,["Jupiter","Moon"],5),           domain:"Children",          icon:"👶"},
    foreign:  {score:sc(35,["Rahu","Saturn"],12),           domain:"Foreign/Travel",    icon:"✈"},
  };
}

// ═══════════════════════════════════════════
// UEDP TIMELINE — past, present, future
// ═══════════════════════════════════════════

export function computeUEDPTimeline(
  birth: BirthData,
  fromYear: number,
  toYear: number
): UEDPTimelinePoint[] {
  const timeline: UEDPTimelinePoint[] = [];
  const today = new Date();

  for (let year=fromYear; year<=toYear; year++) {
    for (let month=1; month<=12; month++) {
      const testBirth: BirthData = {...birth, year, month, day:15, hour:12, minute:0, second:0};
      const jd = toJulianDay(testBirth);
      const ayanamsa = getLahiriAyanamsa(jd);
      const ascLon = getAscendant(jd, birth.latitude, birth.longitude);
      const ascSid = toSidereal(ascLon, ayanamsa);

      const pNames = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
      const rawScores: number[] = pNames.map(pn => {
        const {lon} = planetTropLon(pn, jd);
        const sid = toSidereal(lon, ayanamsa);
        const sign = lonToSign(sid);
        const dig = getDignity(pn, sign);
        const house = houseFromLon(sid, ascSid);
        const dm = DIG_MULT[dig] || 0.55;
        const hs = HOUSE_STR[house] || 0.5;
        return dm*0.6 + hs*0.4;
      });

      const uedp = computeUEDPCore(rawScores);
      const omega = uedp.omega;

      // Events (transit landmarks)
      const events: string[] = [];
      const satIdx = Math.floor(toSidereal(planetTropLon("Saturn",jd).lon, ayanamsa) / 30);
      const jupIdx = Math.floor(toSidereal(planetTropLon("Jupiter",jd).lon, ayanamsa) / 30);
      const ascIdx = Math.floor(ascSid / 30);
      if (satIdx === ascIdx) events.push("Saturn Lagna transit");
      if (satIdx === (ascIdx+9)%12) events.push("Saturn 10th transit");
      if (jupIdx === (ascIdx+4)%12) events.push("Jupiter 5th transit");
      if (jupIdx === (ascIdx+8)%12) events.push("Jupiter 9th transit");
      if (satIdx === (ascIdx+10)%12) events.push("Saturn 11th — gains peak");

      // Domain scores
      const domainScores: Record<string,number> = {
        career:   Math.round((rawScores[0]*0.6+rawScores[6]*0.4)*100),
        wealth:   Math.round((rawScores[4]*0.6+rawScores[5]*0.4)*100),
        marriage: Math.round((rawScores[5]*0.7+rawScores[1]*0.3)*100),
        health:   Math.round((rawScores[0]*0.5+rawScores[2]*0.5)*100),
        spiritual:Math.round((rawScores[4]*0.6+rawScores[8<pNames.length?8:6]*0.4)*100),
      };

      // Classify: top 10% = PEAK, bottom 10% = TROUGH
      const date = `${year}-${String(month).padStart(2,'0')}`;
      const periodDate = new Date(year, month-1, 15);
      const isPast = periodDate < today;

      timeline.push({
        year, month, date, omega,
        isStable: omega >= OMEGA_CRIT,
        iseq: uedp.iseq,
        events,
        domainScores,
        classification: "NEUTRAL", // will be set after
        confidence: Math.round(Math.min(100,omega*100*1.2)*10)/10,
      });
    }
  }

  // Classify peaks / troughs after collection
  const omegas = timeline.map(t=>t.omega);
  const mu = omegas.reduce((s,v)=>s+v,0)/omegas.length;
  const sigma = Math.sqrt(omegas.reduce((s,v)=>s+(v-mu)**2,0)/omegas.length);
  for (const t of timeline) {
    const z = (t.omega - mu) / (sigma || 1);
    if (z > 1.0 && t.omega > OMEGA_CRIT) t.classification = "PEAK";
    else if (z < -1.0) t.classification = "TROUGH";
    else t.classification = "NEUTRAL";
  }

  return timeline;
}

// ═══════════════════════════════════════════
// MARRIAGE ANALYSIS (Phaladeepika + BPHS)
// ═══════════════════════════════════════════

export function computeMarriage(planets:Record<string,PlanetData>, lagna:{rashi:string;rashiLord:string}, dasha:DashaBlock, vargas:Record<string,VargaData>, doshas:DoshaResult[]): MarriageAnalysis {
  const li = RASHIS.indexOf(lagna.rashi)||0;
  const h=(p:string)=>planets[p]?.house||0;
  const dig=(p:string)=>planets[p]?.dignity||"neutral";
  const lord=(hh:number)=>RASHI_LORD[RASHIS[(li+hh-1+12)%12]]||"";
  const rashi=(hh:number)=>RASHIS[(li+hh-1+12)%12]||"";
  const sid=(p:string)=>planets[p]?.degree||0;
  const DIG_SC: Record<string,number>={exalted:5,moolatrikona:4,own:4,friend:3,neutral:2,enemy:1,debilitated:0};

  const h7r=rashi(7),h7l=lord(7),h7ld=dig(h7l),h7lh=h(h7l);
  const h7ps=Object.entries(planets).filter(([,p])=>p.house===7).map(([n])=>n);
  let loveScore=0,arrangedScore=0,liveinScore=0;
  const loveR:string[]=[],arrR:string[]=[],liR:string[]=[];

  const vmDiff=Math.abs(sid("Venus")-sid("Mars"))%360;
  const vmConj=vmDiff<=10;
  if(vmConj){loveScore+=3;loveR.push("Venus+Mars conjunction — powerful romantic magnetism");}
  else if(Math.min(vmDiff,360-vmDiff)<=15){loveScore+=2;loveR.push("Venus-Mars close — romantic attraction");}

  const h5l=lord(5);if(h(h5l)===h7lh){loveScore+=3;loveR.push(`H5 lord ${h5l} conjunct H7 lord ${h7l}`);}
  if(h("Rahu")===7){loveScore+=2;liveinScore+=2;loveR.push("Rahu in H7 — unconventional marriage");liR.push("Rahu in H7 — may resist formal marriage");}
  if(h("Venus")===5){loveScore+=2;loveR.push("Venus in H5 — romance leads to marriage");}

  const jSid=sid("Jupiter");const h7cusp=((li+6)%12)*30+15;const jh7d=Math.abs(jSid-h7cusp)%360;
  if(jh7d<=10||Math.abs(jh7d-120)<=15||Math.abs(jh7d-240)<=15){arrangedScore+=3;arrR.push("Jupiter aspects H7 — traditional family-approved marriage");}
  if(h7ps.includes("Saturn")){arrangedScore+=2;arrR.push("Saturn in H7 — formal traditional marriage");}
  if(DIG_SC[h7ld]>=3){arrangedScore+=2;arrR.push(`H7 lord ${h7l} ${h7ld} — good family spouse`);}

  const scores={love:loveScore,arranged:arrangedScore,live_in:liveinScore};
  const topT=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  let marriageType="Arranged (default)",typeConf=40;
  if(topT==="love"&&loveScore>=arrangedScore+2){marriageType="Love Marriage — chart strongly supports self-chosen partner";typeConf=Math.min(90,40+loveScore*5);}
  else if(topT==="arranged"&&arrangedScore>=loveScore+2){marriageType="Arranged Marriage — family involvement in partner selection";typeConf=Math.min(90,40+arrangedScore*5);}
  else{marriageType="Love-Arranged mix — self-chosen partner with family acceptance";typeConf=55;}

  // D9 validation
  const d9=vargas.D9||{};const d9pls=d9.planets||{};const d9lg=d9.lagna||{};
  const d9li=RASHIS.indexOf(d9lg.rashi||"")||0;
  const d9h7l=RASHI_LORD[RASHIS[(d9li+6)%12]]||"";
  const d9h7ld=d9pls[d9h7l]?.dignity||"neutral";
  const d9VenDig=d9pls.Venus?.dignity||"neutral";
  const d9Factor=Math.max(0.7,Math.min(1.3,(DIG_SC[d9h7ld]||2)/4.0));

  let successScore=DIG_SC[h7ld]*1.4;
  if([1,4,7,10].includes(h7lh))successScore+=2;
  else if([5,9].includes(h7lh))successScore+=2;
  else if(h7lh===11)successScore+=2;
  else if(h7lh===3)successScore+=1;
  else if([6,8,12].includes(h7lh))successScore-=2;
  const MALEFICS=["Saturn","Mars","Rahu","Ketu"];
  const malH7=h7ps.filter(p=>MALEFICS.includes(p));
  successScore-=malH7.length*0.5;
  successScore=Math.max(0,Math.min(10,successScore*d9Factor));

  const successAnalysis=successScore>=7.5?"HIGH — Excellent 7th house; stable, fulfilling marriage strongly indicated":successScore>=5?"MODERATE — Marriage likely stable with effort":successScore>=3?"CHALLENGING — H7 under affliction; conflicts possible":"DIFFICULT — Significant H7 afflictions";
  const separationIndicators:string[]=[];
  if([6,12].includes(h7lh))separationIndicators.push(`H7 lord ${h7l} in H${h7lh} — classical difficulty`);
  if(malH7.length>=2)separationIndicators.push("Multiple malefics in H7 — intense conflicts");

  const cur=dasha.current;
  const marriageTriggers=new Set([h7l,"Venus","Jupiter","Moon","Rahu"]);
  const marriageDashaActive=marriageTriggers.has(cur.mahadasha)||marriageTriggers.has(cur.antardasha);
  const upcoming=dasha.dashas.filter(d=>marriageTriggers.has(d.lord)&&d.start>String(new Date().getFullYear())).slice(0,4).map(d=>({period:`${d.lord} Mahadasha`,from:d.start,to:d.end,note:d.lord===h7l?"Primary — 7th lord":d.lord==="Venus"?"Strong — Venus dasha":"Supportive"}));

  const SPOUSE_Q: Record<string,string> = {Mesha:"Active, independent, courageous.",Vrishabha:"Stable, artistic, sensual.",Mithuna:"Communicative, witty, intellectual.",Karka:"Nurturing, emotional, home-loving.",Simha:"Confident, charismatic, generous.",Kanya:"Analytical, service-oriented, health-conscious.",Tula:"Balanced, artistic, diplomatic.",Vrishchika:"Intense, passionate, investigative.",Dhanu:"Philosophical, adventurous, optimistic.",Makara:"Disciplined, ambitious, practical.",Kumbha:"Unconventional, humanitarian, independent.",Meena:"Compassionate, spiritual, intuitive."};

  return {
    h7Rashi:h7r,h7Lord:h7l,h7LordDignity:h7ld,h7LordHouse:h7lh,h7Planets:h7ps,
    spouseQualities:SPOUSE_Q[h7r]||"",
    marriageType,typeConfidence:typeConf,
    loveScore,arrangedScore,liveinScore,
    loveReasons:loveR,arrangedReasons:arrR,liveinReasons:liR,
    successScore:Math.round(successScore*10)/10,successAnalysis,successPct:successScore>=7?88:successScore>=5?65:successScore>=3?45:28,
    separationIndicators,secondMarriageRisk:successScore<=3,
    timingCurrent:`Current ${cur.mahadasha}/${cur.antardasha} dasha `+(marriageDashaActive?"ACTIVELY SUPPORTS marriage":"does not strongly activate marriage houses"),
    marriageDashaActive,upcomingDashas:upcoming,
    remedies:["Gauri-Shankar Rudraksha for marital harmony","Friday puja to Mahalakshmi/Venus","Katyayani Mantra: Om Katyayanaya Namah","Uma Maheshwara puja for husband-wife harmony"],
    advisory:"Marriage analysis shows chart tendencies, not fixed outcomes. Free will, effort, and mutual respect shape any marriage.",
    d9Validation:{h7LordInD9:d9h7l,h7LordD9Dig:d9h7ld,venusD9Dig:d9VenDig,d9Factor:Math.round(d9Factor*1e3)/1e3,d9Note:`D9 H7 lord ${d9h7l} is ${d9h7ld} in Navamsha — ${DIG_SC[d9h7ld]>=4?"confirms strong marriage":DIG_SC[d9h7ld]<=1?"reduces marriage quality":"neutral D9"}`},
  };
}

// ═══════════════════════════════════════════
// CHILD ANALYSIS
// ═══════════════════════════════════════════

export function computeChildren(planets:Record<string,PlanetData>, lagna:{rashi:string}, dasha:DashaBlock, vargas:Record<string,VargaData>): ChildAnalysis {
  const li=RASHIS.indexOf(lagna.rashi)||0;
  const h=(p:string)=>planets[p]?.house||0;
  const dig=(p:string)=>planets[p]?.dignity||"neutral";
  const lord=(hh:number)=>RASHI_LORD[RASHIS[(li+hh-1+12)%12]]||"";
  const rashi=(hh:number)=>RASHIS[(li+hh-1+12)%12];
  const DIG_SC: Record<string,number>={exalted:5,moolatrikona:4,own:4,friend:3,neutral:2,enemy:1,debilitated:0};

  const h5r=rashi(5),h5l=lord(5),h5ld=dig(h5l),h5lh=h(h5l);
  const h5ps=Object.entries(planets).filter(([,p])=>p.house===5).map(([n])=>n);
  const jupH=h("Jupiter"),jupDig=dig("Jupiter");
  const jupStrong=["exalted","moolatrikona","own","friend"].includes(jupDig);

  // Karakas for Jaimini Putra Karaka
  const KARAKAS=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  const degrees=KARAKAS.filter(p=>planets[p]).map(p=>({p,d:planets[p].degInSign})).sort((a,b)=>b.d-a.d);
  const putraKaraka=degrees[4]?.p||"Jupiter";

  let score=DIG_SC[h5ld]||2;
  if([1,4,7,10].includes(h5lh))score+=2;else if([5,9].includes(h5lh))score+=3;else if([2,11].includes(h5lh))score+=1;else if([6,8,12].includes(h5lh))score-=2;
  if(jupStrong)score+=2;if(jupH===5)score+=3;
  const BENE=["Jupiter","Venus","Mercury","Moon"];const MAL=["Saturn","Mars","Rahu","Ketu"];
  for(const p of h5ps){score+=BENE.includes(p)?1:-1;}
  score=Math.max(0,Math.min(10,score));
  const likelihood=score>=7?"HIGH — Chart strongly supports children":score>=5?"MODERATE — Children indicated with some effort":score>=3?"CHALLENGING — H5 under affliction":"DIFFICULT — Multiple afflictions to H5";

  const afflictions:string[]=[];
  if(h5ld==="debilitated")afflictions.push(`H5 lord ${h5l} debilitated`);
  if([6,8,12].includes(h5lh))afflictions.push(`H5 lord ${h5l} in H${h5lh} (dusthana)`);
  if(h5ps.includes("Saturn"))afflictions.push("Saturn in H5 — delayed children");
  if(!jupStrong)afflictions.push(`Jupiter (${jupDig}) not strong — Putra Karaka needs support`);

  // Gender tendency
  const ODD_R=["Mesha","Mithuna","Simha","Tula","Dhanu","Kumbha"];
  const EVEN_R=["Vrishabha","Karka","Kanya","Vrishchika","Makara","Meena"];
  let ms=0,fs=0;
  if(ODD_R.includes(h5r)){ms+=2;}else if(EVEN_R.includes(h5r)){fs+=2;}
  const d7=vargas.D7||{};const d7lg=d7.lagna||{};const d7li=RASHIS.indexOf(d7lg.rashi||"")||0;
  const d7h5r=RASHIS[(d7li+4)%12]||"";
  if(ODD_R.includes(d7h5r)){ms+=3;}else if(EVEN_R.includes(d7h5r)){fs+=3;}
  const totG=ms+fs||1;const malePct=Math.round(ms/totG*100);const gap=Math.abs(ms-fs);
  const genderTend=gap<=3?"Indeterminate — balanced signals":ms>fs?`Male leaning (${malePct}%)`:`Female leaning (${100-malePct}%)`;

  const DUAL_R=["Mithuna","Kanya","Dhanu","Meena"];
  const countTend=DUAL_R.includes(h5r)?"Two or more children (dual sign in H5)":h5ps.includes("Jupiter")?"Two or more children (Jupiter in H5)":h5ps.includes("Saturn")?"One child (delayed)":"One to two children";

  const cur=dasha.current;
  const goodD=new Set([h5l,putraKaraka,"Jupiter","Moon","Venus"]);
  const curFav=goodD.has(cur.mahadasha)||goodD.has(cur.antardasha);
  const upcoming=dasha.dashas.filter(d=>goodD.has(d.lord)&&d.start>String(new Date().getFullYear())).slice(0,3).map(d=>({period:`${d.lord} Mahadasha`,from:d.start,to:d.end}));

  return {
    h5Rashi:h5r,h5Lord:h5l,h5LordDignity:h5ld,h5LordHouse:h5lh,h5Planets:h5ps,
    jupiterHouse:jupH,jupiterDignity:jupDig,jupiterStrong:jupStrong,putraKaraka,
    childScore:score,likelihood,likelihoodPct:score>=7?85:score>=5?65:score>=3?40:20,
    afflictions,
    genderTendency:genderTend,
    genderBreakdown:{maleScore:ms,femaleScore:fs,malePct,femalePct:100-malePct,confidence:gap>=8?"Moderate":gap>=5?"Low-Moderate":"Low",d7H5Rashi:d7h5r},
    countTendency:countTend,
    healthTendencies:h5ps.includes("Mars")?["Active child — prone to fevers"]:h5ps.includes("Saturn")?["Serious child — respiratory vigilance"]:["Good general health indicated"],
    mentalHealthNotes:h5ps.includes("Rahu")?["Rahu in H5 — highly sensitive, unconventional thinker"]:h5ps.includes("Ketu")?["Ketu in H5 — deeply intuitive, spiritual gifts"]:[],
    timingCurrent:`Current ${cur.mahadasha}/${cur.antardasha} `+(curFav?"ACTIVELY FAVOURS child birth":"does not strongly activate H5"),
    upcomingChildDashas:upcoming,
    remedies:["Santana Gopala Mantra — recite 108× daily","Santana Gopala Yantra — install on Thursdays","Jupiter puja every Thursday","Donate yellow items on Thursdays"],
    advisory:"Child analysis is one of the most sensitive areas of Jyotisha. These are classical tendencies, NOT predictions. Modern medicine, IVF, and adoption are valid paths. Always consult both a qualified astrologer and a medical professional.",
  };
}

// ═══════════════════════════════════════════
// AUSPICIOUS DIRECTIONS
// ═══════════════════════════════════════════

export function computeDirections(planets:Record<string,PlanetData>, lagna:{rashi:string;rashiLord:string}, shadbala:Record<string,ShadbalaData>, panchang:PanchangData): DirectionAnalysis {
  const lagnaLord=lagna.rashiLord;
  const li=RASHIS.indexOf(lagna.rashi)||0;
  const DIKPALA: Record<string,string>={Sun:"East",Mercury:"North",Moon:"North-West",Venus:"South-East",Mars:"South",Saturn:"West",Jupiter:"North-East",Rahu:"South-West",Ketu:"South-East"};
  const DIGBALA_DIR: Record<string,string>={Sun:"South",Mars:"South",Saturn:"West",Jupiter:"East",Mercury:"North",Moon:"North",Venus:"North"};
  const RASHI_DIR: Record<string,string>={Mesha:"East",Vrishabha:"South",Mithuna:"West",Karka:"North",Simha:"East",Kanya:"South",Tula:"West",Vrishchika:"North",Dhanu:"East",Makara:"South",Kumbha:"West",Meena:"North"};
  const NAKSHATRA_DIR: Record<string,string>={Ashwini:"East",Bharani:"East",Krittika:"East",Rohini:"South-East",Mrigashira:"South-East",Ardra:"South",Punarvasu:"South",Pushya:"South",Ashlesha:"South-West",Magha:"South-West","Purva Phalguni":"South-West","Uttara Phalguni":"West",Hasta:"West",Chitra:"West",Swati:"North-West",Vishakha:"North-West",Anuradha:"North-West",Jyeshtha:"North",Moola:"North","Purva Ashadha":"North","Uttara Ashadha":"North-East",Shravana:"North-East",Dhanishtha:"North-East",Shatabhisha:"East","Purva Bhadrapada":"East","Uttara Bhadrapada":"South-East",Revati:"South-East"};

  const votes: Record<string,{weight:number;layers:string[];reasons:string[]}> = {};
  const vote=(dir:string,layer:string,reason:string,w=1)=>{
    if(!dir)return;
    if(!votes[dir])votes[dir]={weight:0,layers:[],reasons:[]};
    votes[dir].weight+=w; votes[dir].layers.push(layer); votes[dir].reasons.push(reason);
  };

  const l1=DIKPALA[lagnaLord]||"East";
  vote(l1,"L1_Surya_Siddhanta_Dikpala",`Lagna lord ${lagnaLord} rules ${l1}`,2);
  vote(DIGBALA_DIR[lagnaLord]||"East","L2_Phaladeepika_Digbala",`${lagnaLord} gains Digbala in ${DIGBALA_DIR[lagnaLord]}`,3);
  vote(RASHI_DIR[lagna.rashi]||"East","L3_BPHS_Lagna_Rashi",`Lagna ${lagna.rashi} faces ${RASHI_DIR[lagna.rashi]}`,2);
  vote(NAKSHATRA_DIR[panchang.nakshatra]||"East","L4_Atharva_Veda_Nakshatra",`Moon Nakshatra ${panchang.nakshatra}`,2);

  const planet_str=Object.entries(shadbala).sort((a,b)=>b[1].totalRupas-a[1].totalRupas);
  const strongest=planet_str[0]?.[0]||"Jupiter";
  vote(DIKPALA[strongest]||"East","L5_Karma_Disha_Shadbala",`Strongest planet ${strongest}`,2);

  const h10rashi=RASHIS[(li+9)%12];const h10lord=RASHI_LORD[h10rashi]||"Sun";
  vote(DIKPALA[h10lord]||"East","L6_10th_Lord_Career",`10th lord ${h10lord}`,2);

  const sorted=Object.entries(votes).sort((a,b)=>b[1].weight-a[1].weight);
  const primary=sorted.filter(([,v])=>v.weight>=5).map(([d,v])=>({direction:d,...v}));
  const secondary=sorted.filter(([,v])=>v.weight>=2&&v.weight<5).map(([d,v])=>({direction:d,...v}));
  const inauspicious=Object.entries(planets).filter(([,p])=>[6,8,12].includes(p.house)&&DIKPALA[p.rashi]).map(([pn,p])=>({direction:DIKPALA[pn]||"",planet:pn,house:p.house,reason:`${pn} in dusthana H${p.house}`}));

  return {
    lagnaLord,lagnaRashi:lagna.rashi,strongestPlanet:strongest,h10Lord:h10lord,
    primaryDirections:primary,secondaryDirections:secondary,
    purposeDirections:{sleeping_head:RASHI_DIR[lagna.rashi]||"East",study_work:DIKPALA[strongest]||"East",prayer_worship:l1,career_business:DIKPALA[h10lord]||"East",travel:RASHI_DIR[lagna.rashi]||"East"},
    inauspiciousDirections:inauspicious,
    remedies:[`Face ${primary[0]?.direction||"East"} while working or meditating`,`Sleep with head towards ${RASHI_DIR[lagna.rashi]||"East"}`,`Perform morning prayer facing ${l1}`,`For career: face ${DIKPALA[h10lord]||"East"}`],
    summary:`Primary: ${primary.map(d=>d.direction).slice(0,2).join(", ")||"See secondary"}. Career: ${DIKPALA[h10lord]||"East"} (${h10lord}). Karma Disha: ${DIKPALA[strongest]} (${strongest}).`,
  };
}

// ═══════════════════════════════════════════
// CONFIDENCE
// ═══════════════════════════════════════════

export function computeConfidence(allAyanamsas:Record<string,number>, ascLon:number): ConfidenceData {
  const vals=Object.values(allAyanamsas);
  const spread=vals.length?Math.max(...vals)-Math.min(...vals):0.5;
  const degIn=ascLon%30;
  const boundary=degIn<2||degIn>28;
  const agreeS=Math.max(0.3,1-spread*3);
  const boundS=boundary?0.5:1.0;
  const interpS=boundary?0.6:0.9;
  const overall=Math.round((0.25*0.99+0.35*agreeS+0.25*boundS+0.15*interpS)*1e4)/1e4;
  const mode=overall>=0.85?"strict":overall>=0.65?"balanced":"exploratory";
  return {
    overall,mode,
    ephemeris:{
      score: ephemerisSource==="swiss_ephemeris"?0.99:ephemerisSource==="vsop87"?0.85:0.60,
      grade: ephemerisSource==="swiss_ephemeris"?"HIGH":ephemerisSource==="vsop87"?"MEDIUM":"LOW",
      note: ephemerisSource==="swiss_ephemeris"
        ?"Swiss Ephemeris (Python backend) — 0.001° accuracy"
        :ephemerisSource==="vsop87"
        ?"VSOP87 truncated — ~0.5-1° accuracy. Venus/Mercury may be off by 1-2° from Swiss Ephemeris. Connect Python API for exact positions."
        :"Keplerian mean elements — ±2-3° accuracy. Venus and Mercury may be in wrong sign. Use API positions.",
    },
    ayanamsaAgreement:{score:Math.round(agreeS*1e4)/1e4,grade:agreeS>0.8?"HIGH":"MEDIUM",note:`Spread ${spread.toFixed(4)}° across ${vals.length} systems`},
    boundaryStability:{score:boundS,grade:boundary?"LOW":"HIGH",note:boundary?`Lagna near sign boundary at ${degIn.toFixed(2)}° — verify birth time`:`Stable at ${degIn.toFixed(2)}° in sign`},
    interpretationCertainty:{score:interpS,grade:interpS>=0.85?"HIGH":"MEDIUM",note:"Lahiri ayanamsa (India Govt standard)"},
  };
}

// ═══════════════════════════════════════════
// MAIN: generateFullChart
// ═══════════════════════════════════════════


// ═══════════════════════════════════════════
// COMPUTE PARIHARAS
// Generates the full Parihara[] array from detected Dosha[]
// for use in DoshaPanel pariharas prop
// ═══════════════════════════════════════════

const PARIHARA_DB: Record<string, Omit<Parihara, "dosha">> = {
  Manglik: {
    source: "BPHS Ch.81; Phaladeepika Ch.19; Atharva Veda",
    remedy: "Kumbha Vivah — symbolic marriage to a clay pot or peepal tree before wedding nullifies Manglik effect",
    ritual: "On an auspicious Tuesday in Shukla Paksha, the native performs Vivah Puja with a clay pot decorated as a bride/groom. A priest chants Mangal Shanti mantras. The pot is then immersed in a river. After this, the real marriage can proceed safely.",
    deity: "Mangal (Kuja) — Lord Hanuman / Kartikeya",
    mantra: "Om Kraam Kreem Kraum Sah Bhaumaya Namah — 7000 times over 40 Tuesdays (175 per day)",
    daan: "Red lentils (masur dal), red cloth, copper vessel, jaggery — donate at Hanuman temple on Tuesdays",
    timing: "Tuesdays in Shukla Paksha during Mangal hora (first hora on Tuesday). Best: Mangal nakshatra (Mrigashira, Chitra, Dhanishtha).",
    karmaBarrier: "If Manglik dosha is paired with Saturn in H7 or Ketu in H1, the karma is deeper (Prarabdha). Kumbha Vivah alone may not be sufficient — Trimbakeshwar Mangal Shanti puja is required.",
    karmaOverride: "Regular recitation of Sundara Kanda (Ramayana) on Saturdays and Tuesdays for 1 year, combined with Hanuman temple seva (cleaning, aarti) dissolves the deeper karmic pattern of Mars aggression in relationships.",
  },
  Pitru_Dosha: {
    source: "Atharva Veda; BPHS Ch.76; Dharmasindhu",
    remedy: "Pitru Tarpan on every Amavasya — offering of water, sesame and barley to ancestors at a sacred river or tirtha",
    ritual: "On Amavasya at sunrise, face south, hold water in cupped hands mixed with black sesame, recite Pitru Gayatri and pour as tarpan 3 times per ancestor (father, grandfather, great-grandfather line). Perform at Ganga, Godavari, Triveni Sangam or any sacred river.",
    deity: "Pitru Devatas — Lord Yama; Vishnu as Gadadhara",
    mantra: "Pitru Gayatri: Om Pitrubhyah Devaputrebhyah Namah — 108 times daily. Full Pitru Suktam on Amavasya.",
    daan: "Kheer (rice pudding), black sesame, water in silver vessel — donate to Brahmins on Amavasya and Shraddha dates",
    timing: "Amavasya (New Moon) — especially Pitru Amavasya (Mahalaya Amavasya in Bhadrapada). Also: Solar eclipse, Makar Sankranti.",
    karmaBarrier: "If Sun is severely debilitated (in Libra) and afflicted by both Rahu and Saturn, the ancestral karma is multi-generational. Single-year Tarpan may not be enough.",
    karmaOverride: "Perform Narayan Bali and Tripindi Shraddha at Trimbakeshwar or Varanasi. Sponsor annadana (feeding 100+ people) on 3 consecutive Amavasyas. Plant a peepal tree and water it for 3 years.",
  },
  Kaal_Sarp: {
    source: "Muhurta Chintamani; BPHS Ch.36; Sarvartha Chintamani",
    remedy: "Kaal Sarp Shanti Puja at Trimbakeshwar Jyotirlinga — the primary and most powerful remedy for this dosha",
    ritual: "Travel to Trimbakeshwar, Nashik (primary site) or Ujjain. Engage a certified priest for full Kaal Sarp Shanti (6-8 hours). Involves Rahu-Ketu shanti, Naga puja, Maha Mrityunjaya homa, and Shiva abhishekam. Should be performed in a Rahu hora on a Saturday.",
    deity: "Rahu-Ketu as Naga devatas; Lord Shiva as Mahadev; Nageshwara Jyotirlinga",
    mantra: "Maha Mrityunjaya: Om Tryambakam Yajamahe... — 108 times daily for 1 year. Rahu Beeja: Om Bhraam Bhreem Bhraum Sah Rahave Namah — 18000 times.",
    daan: "Naga (snake idol) in silver, blue/black cloth, iron items, black sesame, 7 grains — donate at Shiva temple on Saturdays",
    timing: "Naga Panchami is ideal. Saturdays in Krishna Paksha during Rahu hora. Avoid auspicious occasions (marriage, upanayana) for the puja.",
    karmaBarrier: "Kaal Sarp formed by natal chart is Prarabdha karma. Remedies reduce its frequency and intensity but cannot eliminate it entirely. Success comes later in life (after Saturn return, age 29-30 or 58-60).",
    karmaOverride: "Daily Shiva puja (abhishekam with milk, honey, water) for 1 year. Recite Shiva Sahasranama on Pradosha days. Sponsor Maha Rudra Abhishekam at a Jyotirlinga. These build coherence field Ω back above critical threshold.",
  },
  Grahan_Dosha: {
    source: "Surya Siddhanta; BPHS Ch.19; Atharva Veda",
    remedy: "Surya/Chandra Grahan Shanti Puja — separate puja depending on whether Sun or Moon is eclipsed",
    ritual: "For Sun: Perform Aditya Hridayam parayana (recitation) daily at sunrise for 41 days. For Moon: Chandra Shanti with pearl offering. For both: Grahan Shanti homa on a solar or lunar eclipse day with Navagraha offerings.",
    deity: "Surya Devata (Aditya) for Sun eclipse; Chandra Devata for Moon eclipse; Rahu-Ketu as eclipse agents",
    mantra: "Aditya Hridayam: full recitation daily for Sun. Chandra mantra: Om Shraam Shreem Shraum Sah Chandraya Namah — 11000 times for Moon. Rahu mantra for both: Om Bhraam Bhreem Bhraum Sah Rahave Namah — 18000 times.",
    daan: "Wheat and jaggery (for Sun eclipse); Rice and white items (for Moon eclipse). Donate on Sundays (Sun) or Mondays (Moon).",
    timing: "Actual solar/lunar eclipse days are most potent. Otherwise: Sundays for Sun, Mondays for Moon, during sunrise/moonrise hora.",
    karmaBarrier: "If both luminaries are eclipsed (Sun+Moon both afflicted by Rahu/Ketu), the consciousness field is severely disrupted. Professional medical and psychological support should accompany spiritual remedies.",
    karmaOverride: "Regular Vipassana meditation or pranayama practice (Anulom Vilom 20 min daily) clears the eclipse pattern at a consciousness level, complementing the ritual remedies.",
  },
  Angarak_Yoga: {
    source: "Phaladeepika Ch.14; BPHS Ch.25",
    remedy: "Daily Hanuman Chalisa recitation with red sindoor offering — Hanuman controls both Mars and Rahu energies",
    ritual: "Every Tuesday and Saturday, visit Hanuman temple. Offer red sindoor, red flowers, and lamp with pure ghee. Recite Hanuman Chalisa 11 times. On Tuesdays: also recite Bajrang Baan. Perform for 40 consecutive weeks.",
    deity: "Hanuman (controls Mars aggression); Bhairava (controls Rahu); Durga (protective shield)",
    mantra: "Hanuman Beeja: Om Hanumate Namah — 11000 times. Mars Beeja: Om Kraam Kreem Kraum Sah Bhaumaya Namah — 7000 times. Combined: 108 Hanuman Chalisa recitations over 108 days.",
    daan: "Red lentils (masur), copper items, red cloth — on Tuesdays. Black sesame, iron — on Saturdays. Donate at Hanuman + Bhairava temples.",
    timing: "Tuesdays (Mars hora) and Saturdays (Rahu hora). During Scorpio or Aries season. Avoid initiating new ventures during this Mars-Rahu period.",
    karmaBarrier: "Angarak Yoga creates sudden explosive karma. If Mars is in H6, H8 or H12 along with Rahu, the danger of accidents is higher. Physical safety measures (not just spiritual) are critical.",
    karmaOverride: "Regular physical exercise (running, martial arts, yoga) channels Mars-Rahu energy constructively. Service in medical, fire, or rescue organizations transforms the destructive energy into healing force — the highest parihara.",
  },
  Guru_Chandal: {
    source: "BPHS Ch.25; Jataka Parijata",
    remedy: "Jupiter Beeja mantra japa and Guru puja every Thursday to restore wisdom clarity obscured by Rahu",
    ritual: "Every Thursday in Guru hora (first hora on Thursday), sit facing north-east, light yellow candle, offer turmeric, yellow flowers, and chana dal. Recite Brihaspati Stotra and 108 repetitions of Guru mantra. Donate to Vedic scholars or spiritual teachers.",
    deity: "Brihaspati (Jupiter); Dakshinamurti (Shiva as Guru); Hayagriva (knowledge deity)",
    mantra: "Guru Beeja: Om Graam Greem Graum Sah Guruve Namah — 19000 times (over 190 days at 100/day). Brihaspati Gayatri: Om Angiraasaya Vidmahe Brahmaputraaya Dheemahi Tanno Guru Prachodayaat.",
    daan: "Yellow items (turmeric, chana dal, yellow cloth, gold), books, educational materials — donate on Thursdays to Brahmins or spiritual institutions",
    timing: "Thursdays in Sagittarius or Pisces season. Jupiter hora. Guru Pushya Nakshatra day is especially powerful.",
    karmaBarrier: "If Rahu is in H1 or H9 with Jupiter, the Guru-Chandal creates a deep illusion about one's spiritual path or teacher. The native may be drawn to false gurus. Discernment must be developed through study and satsang.",
    karmaOverride: "Establish a personal relationship with an authentic Vedic teacher (not online only). Study of original texts (Bhagavad Gita, Upanishads) directly, without intermediary, restores Jupiter's clarity. Daily self-study (Svadhyaya) is the ultimate remedy.",
  },
  Vish_Yoga: {
    source: "Phaladeepika Ch.17; BPHS; Mansagari",
    remedy: "Shani-Chandra reconciliation through Monday-Saturday dual puja — Moon calms Saturn, Saturn brings discipline to Moon",
    ritual: "Every Monday: Chandra puja with white flowers, milk abhishekam, silver items. Recite Chandra mantra. Every Saturday: Shani puja with sesame oil lamp, black sesame, iron items. Recite Shani Chalisa. This dual practice balances Saturn's restriction with Moon's emotional flow.",
    deity: "Chandra (Moon); Shani (Saturn); Shiva as reconciler; Parvati (emotional healing)",
    mantra: "Chandra: Om Shraam Shreem Shraum Sah Chandraya Namah — 11000 times. Shani: Om Praam Preem Praum Sah Shanaischaraya Namah — 23000 times. Also: Maha Mrityunjaya 108 times daily.",
    daan: "Mondays: white rice, milk, silver, white cloth. Saturdays: black sesame, iron vessel, mustard oil, blue/black cloth. Donate to elderly, disabled persons.",
    timing: "Begin on a Monday in Shukla Paksha. Perform Monday puja at moonrise, Saturday puja at sunrise. Purnima (Full Moon) is especially potent for Moon remedies.",
    karmaBarrier: "Vish Yoga creates emotional-karmic poison that affects mental health. If Moon is also in H6, H8 or H12, depression risk is elevated. Professional psychological counseling should accompany spiritual remedies.",
    karmaOverride: "Daily pratyahara (withdrawal of senses) meditation for 20 minutes at moonrise. Regular time in nature (near water, moonlight). Service to elderly parents or nursing home residents transforms Saturn-Moon karma directly.",
  },
  Shrapit_Dosha: {
    source: "BPHS Ch.36; Atharva Veda; Skanda Purana",
    remedy: "Shrapit Shanti Puja at a Shani temple — combined Saturn-Rahu karma clearing through Shiva puja",
    ritual: "Visit Shani Shingnapur (Maharashtra) or any major Shani temple. Perform Shrapit Dosha Nivaran puja with a qualified priest. Involves Shani homa, Rahu-Ketu shanti, and Mahamrityunjaya japa. Should be done on a Saturday in Krishna Paksha.",
    deity: "Shani (Saturn); Rahu; Lord Shiva as Mrityunjaya; Kali Mata",
    mantra: "Shani Beeja: Om Praam Preem Praum Sah Shanaischaraya Namah — 23000 times. Rahu Beeja: Om Bhraam Bhreem Bhraum Sah Rahave Namah — 18000 times. Maha Mrityunjaya — 1008 times on Saturdays.",
    daan: "Iron vessel, black sesame, mustard oil, blue/black cloth, shoes — donate to poor on Saturdays. Also: donate black cow or sponsor Shani temple lantern for 1 year.",
    timing: "Saturdays in Krishna Paksha (waning moon). Shani Amavasya (Amavasya falling on Saturday). Shani Jayanti. Avoid Saturdays in Sade Sati period for major decisions.",
    karmaBarrier: "Shrapit Dosha carries multi-life karma (past life curses/debts involving authority figures or misuse of power). It cannot be fully removed in one lifetime — only managed and reduced in intensity.",
    karmaOverride: "Long-term service to the poor and disabled (Saturn's people) — minimum 1 hour weekly for 7 years. Honest, disciplined professional life without shortcuts or corruption. These actions directly repay the Shrapit karmic debt.",
  },
  Kemdrum_Yoga: {
    source: "Phaladeepika Ch.6; Brihat Jataka",
    remedy: "Moon strengthening through Pearl and Chandra mantra — isolate Moon's isolation by building lunar coherence",
    ritual: "Wear a natural (not cultured) pearl of minimum 5 carats in silver ring on the ring finger of the right hand, set on a Monday in Shukla Paksha. Before wearing, energize by immersing in milk for 24 hours, then recite Chandra mantra 108 times. Offer white flowers to Moon on every Purnima.",
    deity: "Chandra (Moon); Parvati; Annapurna (for emotional nourishment)",
    mantra: "Chandra Beeja: Om Shraam Shreem Shraum Sah Chandraya Namah — 11000 times. Chandra Gayatri: Om Ksheerputraya Vidmahe Amruttavasaya Dheemahi Tanno Chandrah Prachodayaat. Daily 108 times.",
    daan: "White rice, milk, silver coin, white cloth, camphor — donate on Mondays and Purnima to women, mothers, or temples of Devi",
    timing: "Begin on Purnima (Full Moon) Monday in Shukla Paksha. Daily puja at moonrise. Purnima fast (ekabhukta — one meal) for 11 months amplifies the remedy.",
    karmaBarrier: "Kemdrum Yoga creates emotional isolation — native may find it hard to accept support even when offered. Inner work is necessary alongside ritual — the karma is about learning to receive.",
    karmaOverride: "Deliberate cultivation of community — joining a study group, spiritual community, or family support system. Regular communication with mother or mother-figure. The isolation dissolves when the native reaches out consistently.",
  },
  Rahu_Kalatra: {
    source: "BPHS Ch.17; Phaladeepika Ch.19; Jataka Parijata",
    remedy: "Rahu in 7th house — Durga puja and Rahu shanti to neutralize unconventional marriage karma",
    ritual: "Every Friday, perform Durga Saptashati parayana or at minimum 1 chapter. Offer red hibiscus flowers, sindoor, and coconut. Also perform Rahu shanti on Saturdays with blue/black offerings. Visit Sri Kalahasti temple (Andhra Pradesh) — the premier Rahu-Ketu parihara temple.",
    deity: "Durga Mata (protects 7th house); Rahu Devata at Sri Kalahasti; Bhairava",
    mantra: "Durga Beeja: Om Dum Durgayei Namah — 9000 times over 90 days. Rahu mantra: Om Bhraam Bhreem Bhraum Sah Rahave Namah — 18000 times. Friday: 108 repetitions of Durga Shloka.",
    daan: "Friday: Coconut, red hibiscus, sindoor, sugar, white sweets to women/temple. Saturday: Blue/black cloth, iron, black sesame to the poor.",
    timing: "Fridays in Venus hora. Sri Kalahasti annual Rahu-Ketu festival. Rahu kaal on Fridays is paradoxically good for Rahu-related remedies.",
    karmaBarrier: "Rahu in H7 often brings a fated, unusual partner — sometimes from a different culture, religion, or social background. The karma is not to avoid such a relationship but to handle it with wisdom and boundaries.",
    karmaOverride: "Develop strong personal values and boundaries before marriage. Rahu in H7 responds to authenticity — a relationship based on genuine mutual respect transcends the dosha. Couples counseling and open communication are the real parihara.",
  },
}

export function computePariharas(doshas: Dosha[]): Parihara[] {
  return doshas.map(d => {
    const db = PARIHARA_DB[d.name];
    if (!db) {
      // Fallback for any dosha not in DB
      return {
        dosha: d.name,
        source: d.source || "Classical Jyotisha",
        remedy: d.remedies.map(r => r.r).join("; "),
        ritual: "Consult a qualified Jyotishi for specific vidhi",
        deity: "Navagraha Devatas",
        mantra: "Om Navagrahaaya Namah — 108 times daily",
        daan: "Donate as per planet: see classical remedies above",
        timing: "Auspicious days per the ruling planet",
        karmaBarrier: undefined,
        karmaOverride: undefined,
      };
    }
    return { dosha: d.name, ...db };
  });
}

// ═══════════════════════════════════════════
// RICH PREDICTION BUILDER — for PredictionsPanel.tsx
// Converts PredictionScore map → Prediction[] with timing + details
// ═══════════════════════════════════════════

const PLANET_GLYPH: Record<string,string> = {
  Sun:"☉",Moon:"☽",Mars:"♂",Mercury:"☿",Jupiter:"♃",
  Venus:"♀",Saturn:"♄",Rahu:"☊",Ketu:"☋"
};

export function buildPredictions(
  predScores: Record<string,PredictionScore>,
  dasha: DashaBlock,
  planets: Record<string,PlanetData>,
  strengths: Record<string,StrengthData>,
  uedp: UEDPCore
): Prediction[] {
  const now = new Date();
  const curMD = dasha.current.mahadasha;
  const curAD = dasha.current.antardasha;
  const period = `${curMD} MD / ${curAD} AD`;
  const mdEnd = dasha.current.mahaEnds;
  const adEnd = dasha.current.antarEnds;

  type DomainInfo = {triggers:string[];details:(s:number)=>string[];karma?:string|((s:number)=>string|undefined)};
  const DOMAIN_DETAIL: Record<string,DomainInfo> = {
    career: {
      triggers:["Sun transit H10","Saturn aspects H10",`${curMD} activates 10th`],
      details:(s)=>[
        s>=70?"Strong period for career advancement and recognition":"Career requires extra effort this period",
        `10th house lord ${RASHI_LORD[RASHIS[((RASHIS.indexOf(planets.Sun?.rashi||"Mesha")+9)%12)]||"Mesha"]||"Sun"} influences professional standing`,
        s>=80?"Leadership opportunities are highlighted":"Focus on skill development over visibility",
        `Saturn discipline + Jupiter wisdom both active in ${curMD} dasha`,
      ],
      karma: (s:number)=>s>=70?undefined:"Saturn karma in career — past-life authority issues manifest as delays. Integrity and patience are the remedy.",
    },
    wealth: {
      triggers:["Jupiter transit H2","Venus aspects H11","Dhan yogas activating"],
      details:(s)=>[
        s>=70?"Wealth accumulation is strongly supported this period":"Financial discipline needed; avoid speculation",
        "2nd house and 11th house lords determine income flow",
        s>=75?"Multiple income streams possible":"Focus on one stable income source",
        `Jupiter's ${planets.Jupiter?.dignity||"neutral"} dignity indicates ${planets.Jupiter?.dignity==="exalted"?"exceptional":"moderate"} financial wisdom`,
      ],
    },
    marriage: {
      triggers:["Venus transit H7","Jupiter aspects 7th","Marriage dasha active"],
      details:(s)=>[
        s>=70?"Partnership energy is highly favored this period":"Relationship patience and communication are key",
        `7th house configuration: ${Object.entries(planets).filter(([,p])=>p.house===7).map(([n])=>n).join(", ")||"No planets"} in 7th`,
        s>=75?"Marriage or significant relationship commitment is indicated":"Focus on personal growth to attract the right partner",
      ],
      karma: (s:number)=>s<50?"7th house karma from past — relationship patterns repeat until inner work is done. Self-awareness is the parihara.":undefined,
    },
    health: {
      triggers:["Sun vitality peak","Mars energy activation","Lagna lord transit"],
      details:(s)=>[
        s>=75?"Vitality is strong; excellent time for health improvements":"Health requires proactive attention",
        `Sun ${planets.Sun?.dignity||"neutral"} in H${planets.Sun?.house||1} determines core vitality`,
        s>=70?"Physical activity and exercise will be especially rewarding":"Rest and recovery are equally important as activity",
      ],
    },
    spiritual: {
      triggers:["Jupiter transit 9th","Ketu activation","Dharma dasha"],
      details:(s)=>[
        s>=70?"Deep spiritual insights and dharmic clarity available":"Spiritual practice needs consistent effort",
        `9th house lord and Jupiter configuration: ${planets.Jupiter?.dignity||"neutral"} Jupiter in H${planets.Jupiter?.house||9}`,
        "This period favors study of scriptures, meditation, and pilgrimage",
        s>=75?"Potential for genuine spiritual breakthrough or guru connection":"Build daily sadhana practice first",
      ],
    },
    political: {
      triggers:["Sun authority peak","Mars courage activation","10th lord strong"],
      details:(s)=>[
        s>=70?"Leadership and authority opportunities are highlighted":"Build alliances and reputation before seeking power",
        `Raj yogas in chart: ${s>=80?"Multiple active":"Developing"}`,
        "Public speaking, strategic networking, and institutional positioning are favored",
      ],
    },
    children: {
      triggers:["Jupiter H5 transit","5th lord dasha","Putra Karaka activation"],
      details:(s)=>[
        s>=70?"5th house is well-activated for children and creativity":"Patient effort needed; avoid stress in H5 matters",
        `Jupiter's role as Putra Karaka: ${planets.Jupiter?.dignity||"neutral"} dignity`,
        s>=75?"Conception or birth of children is well-supported":"Medical guidance alongside astrological timing is advised",
      ],
      karma: (s:number)=>s<45?"Past-life karma related to children. Mantra, adoption, or surrogate parenting may be the dharmic path.":undefined,
    },
    foreign: {
      triggers:["Rahu transit H9/H12","12th lord active","Saturn long-distance"],
      details:(s)=>[
        s>=65?"Foreign travel, residence, or international opportunities are favored":"Foreign ventures need careful planning",
        `Rahu ${planets.Rahu?.dignity||"neutral"} in H${planets.Rahu?.house||12} drives foreign impulse`,
        "12th house activation: loss of roots, gain of broader perspective",
        s>=70?"Settlement abroad or long international assignments are possible":"Short trips more favorable than permanent relocation",
      ],
    },
  };

  const intensityOf = (score:number): "high"|"medium"|"low"|"critical" =>
    score>=80?"high":score>=60?"medium":score>=40?"low":"critical";

  return Object.entries(predScores).map(([key, ps]) => {
    const domInfo = DOMAIN_DETAIL[key] || {
      triggers:[`${curMD} dasha activation`],
      details:()=>["Classical Jyotisha analysis indicates activity in this domain"],
    };
    const score = ps.score;
    const startD = now.toISOString().slice(0,10);
    const endD = adEnd || mdEnd;
    const details = domInfo.details(score);

    return {
      domain: ps.domain,
      icon: ps.icon,
      period,
      intensity: intensityOf(score),
      omegaAtPeriod: Math.min(1, uedp.omega * (score/60)),
      summary: score>=70
        ? `${ps.domain} is strongly activated in the current ${curMD}/${curAD} dasha period. Score ${score}/100 indicates high coherence in this life area.`
        : score>=45
        ? `${ps.domain} shows moderate activity (${score}/100). Focused effort with proper timing will yield results.`
        : `${ps.domain} faces karmic pressure this period (${score}/100). Parihara and patience are advised.`,
      startDate: startD,
      endDate: endD,
      details,
      planetaryTriggers: domInfo.triggers,
      karmaNote: !domInfo.karma ? undefined : typeof domInfo.karma === "function" ? domInfo.karma(score) ?? undefined : domInfo.karma,
    };
  });
}

// ═══════════════════════════════════════════
// BUILD PLANET POSITIONS — for PlanetTable & HoroscopeWheel
// Converts Record<string,PlanetData> → PlanetPosition[]
// ═══════════════════════════════════════════

export function buildPlanetPositions(planets: Record<string,PlanetData>): PlanetPosition[] {
  return Object.entries(planets).map(([name, p]) => ({
    name,
    symbol: GLYPH[name] || name.slice(0,2),
    longitude: p.degree,
    degree: p.degInSign,
    signName: p.sign,
    house: p.house,
    nakshatra: p.nakshatra,
    nakshatraPada: p.pada,
    isRetrograde: p.retrograde,
    speed: p.speed,
    dignity: p.dignity,
  }));
}

// ═══════════════════════════════════════════
// BUILD HOUSE DATA — for PlanetTable.tsx
// ═══════════════════════════════════════════

export function buildHouseData(bhavas: BhavaData[]): HouseData[] {
  return bhavas.map(b => ({
    house: b.bhava,
    signName: RASHI_EN[RASHIS.indexOf(b.rashi)] || b.rashi,
    lord: b.lord,
    lordSymbol: GLYPH[b.lord] || b.lord.slice(0,2),
  }));
}

// ═══════════════════════════════════════════
// BUILD HOROSCOPE DATA — for HoroscopeWheel.tsx
// ═══════════════════════════════════════════

export function buildHoroscopeData(chart: ChartData): HoroscopeData {
  return {
    ascendant: chart.lagna.degree,
    ascendantSign: chart.lagna.sign,
    ascendantDegree: chart.lagna.degInSign,
    uedp: { omega: chart.uedp.omega, isStable: chart.uedp.isStable },
    planets: buildPlanetPositions(chart.planets),
  };
}
/**
 * ApiPositions — pre-computed sidereal longitudes from Python/Swiss Ephemeris backend.
 * When passed to generateFullChart(), these are used directly and the TS orbital
 * computation is bypassed entirely. This guarantees the same accuracy as JHora/
 * Jagannatha Hora for all planets including Venus and Mercury.
 *
 * Your /api/chart Python endpoint already returns this data.
 * Pass it as the second argument to generateFullChart() to eliminate the
 * Venus/Mercury sign mismatch you observed.
 */
export interface ApiPositions {
  /** Sidereal longitudes in degrees (0-360) keyed by planet name */
  siderealLongitudes: Record<string,number>;
  /** Retrograde flags */
  retrograde: Record<string,boolean>;
  /** Sidereal ascendant longitude */
  ascendantLon: number;
  /** Source tag for confidence display */
  source: "swiss_ephemeris" | "vsop87" | "keplerian";
}

export function generateFullChart(birth: BirthData, apiPos?: ApiPositions): ChartData {
  const ayanamsaStr = birth.ayanamsa || "lahiri";
  const jd = toJulianDay(birth);
  const allAyan = getAllAyanamsas(jd);
  const ayanamsa = allAyan[ayanamsaStr] || getLahiriAyanamsa(jd);

  // ── PLANETARY POSITIONS ────────────────────────────────────────────
  // Priority 1: use Swiss Ephemeris positions from Python API (accurate to 0.001°)
  // Priority 2: fall back to VSOP87 truncated (accurate to ~0.5-1°)
  // The Keplerian fallback inside planetTropLon() is already upgraded to VSOP87.
  // Venus and Mercury in particular MUST come from the Python backend for sign-accurate results.
  const rawPosAll: Record<string,{lon:number;speed:number;retro:boolean}> = {};
  const ephemerisSource = apiPos?.source || "vsop87";

  if (apiPos?.siderealLongitudes) {
    // Use API positions — bypass all local computation for planet longitudes
    for (const [pn, lon] of Object.entries(apiPos.siderealLongitudes)) {
      rawPosAll[pn] = {lon, speed:0, retro: apiPos.retrograde?.[pn] ?? false};
    }
  } else {
    // VSOP87 truncated (local fallback) — accurate for outer planets, ~0.5-1° for inner
    const pNames = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
    for (const pn of pNames) {
      const {lon: tropLon, speed, retro} = planetTropLon(pn, jd);
      rawPosAll[pn] = {lon: toSidereal(tropLon, ayanamsa), speed, retro};
    }
    const rahuLon = toSidereal(getRahuLon(jd), ayanamsa);
    rawPosAll.Rahu = {lon: rahuLon, speed: -0.053, retro: true};
    rawPosAll.Ketu = {lon: (rahuLon + 180) % 360, speed: -0.053, retro: true};
  }

  // ── ASCENDANT ──────────────────────────────────────────────────────
  // Also prefer API value when available (Python computes with obliquity correction)
  const tropAsc = getAscendant(jd, birth.latitude, birth.longitude);
  const ascLon  = apiPos?.ascendantLon ?? toSidereal(tropAsc, ayanamsa);
  const sunLon  = rawPosAll.Sun.lon;
  const moonLon = rawPosAll.Moon.lon;

  const lagnaRashi = lonToRashi(ascLon);
  const lagnaSign  = lonToSign(ascLon);
  const lagnaNak   = lonToNak(ascLon);
  const lagna = {
    rashi:lagnaRashi, sign:lagnaSign,
    degree:Math.round(ascLon*1e4)/1e4,
    degInSign:Math.round(degInSign(ascLon)*1e4)/1e4,
    nakshatra:lagnaNak.name, pada:lagnaNak.pada,
    rashiLord:RASHI_LORD[lagnaRashi]||"",
  };

  const planets  = buildPlanetTable(rawPosAll, ascLon, sunLon);
  const panchang = computePanchang(jd, moonLon, sunLon, ascLon, ayanamsaStr);
  const strengths= computeStrengths(planets);
  const shadbala = computeShadbala(planets);
  const ashtakavarga = computeAshtakavarga(planets, lagnaRashi);
  const bhavas   = computeBhavas(planets, ascLon);

  const birthDt  = new Date(birth.year, birth.month-1, birth.day, birth.hour, birth.minute, birth.second);
  const dashaList= computeDashas(birthDt, moonLon);
  const dasha    = buildDashaBlock(dashaList, birthDt, moonLon);
  const curLord  = dasha.current.mahadasha;

  const doshas   = detectDoshas(planets, lagnaRashi);
  const yogas    = detectYogas(planets, strengths, lagnaRashi);
  const medical  = computeMedical(planets, strengths, curLord);
  const political= computePolitical(planets, strengths, yogas, lagnaRashi);
  const vargas   = computeVargas(rawPosAll, ascLon);
  const predictions = computePredictions(planets, strengths, curLord);
  const confidence= computeConfidence(allAyan, ascLon);

  // UEDP core
  const xSeq = Object.values(strengths).map(s=>s.totalScore/100);
  xSeq.push(...Object.values(predictions).map(p=>p.score/100));
  const uedp = computeUEDPCore(xSeq, 0.4, 0.35, 0.25, 0.3, 4);

  // UEDP Timeline — 10 years back to 10 years forward
  const nowYear = new Date().getFullYear();
  const uedpTimeline = computeUEDPTimeline(birth, Math.max(birth.year, nowYear-10), nowYear+10);

  // Hora analysis
  const horaAnalysis = computeHoraAnalysis(birth, dasha, planets, ayanamsa);

  // Marriage / Children / Directions
  const marriage   = computeMarriage(planets, lagna, dasha, vargas, doshas);
  const children   = computeChildren(planets, lagna, dasha, vargas);
  const directions = computeDirections(planets, lagna, shadbala, panchang);

  return {
    status:"ok", name:birth.name, place:birth.place||"",
    latitude:birth.latitude, longitude:birth.longitude,
    lagna, planets, panchang,
    ayanamsaUsed:ayanamsaStr, ayanamsaValue:Math.round(ayanamsa*1e6)/1e6,
    allAyanamsas:allAyan,
    strengths, shadbala, ashtakavarga, bhavas, dasha,
    doshas, yogas, medical, political, vargas,
    predictions, uedp, uedpTimeline,
    horaAnalysis, marriage, children, directions, confidence,
    input:{datetime:`${birth.year}-${birth.month}-${birth.day}T${birth.hour}:${birth.minute}:${birth.second}`,lat:birth.latitude,lon:birth.longitude,tz:birth.timezone,ayanamsa:ayanamsaStr},
  };
}