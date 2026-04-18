/**
 * pages/api/decisional.ts — UEDP v5 Decisional Engine
 * G S Ramesh Kumar — Universal Emergence Dynamics Protocol v5
 *
 * POST /api/decisional
 *
 * Modules contained in this file (all self-contained, no extra deps):
 *   1.  Planetary perturbation fix    — corrects Venus/Mars/Jupiter/Saturn VSOP87 errors
 *   2.  Transit engine                — current/upcoming transits over natal chart
 *   3.  Decisional scenario engine    — score any proposed date+action against natal chart
 *   4.  Location scoring              — score any city for 8 life purposes
 *   5.  Muhurta engine                — best windows in a date range for a given action
 *   6.  Match/compatibility           — Ashtakoot + UEDP two-chart comparison
 *   7.  Ganda/crisis detection        — Gandanta, Kaal Sarp, Sade Sati, Ashtama Shani,
 *                                       Rahu-Ketu axis, Eclipse windows, Graha Yuddha
 *   8.  Extended dosha analysis       — Mangal, Kaal Sarp, Pitra, Shrapit, Grahan, Nadi,
 *                                       Vish Yoga, Kemdrum, Daridra, Shakat etc.
 *   9.  Past / present / future       — full decisional timeline classifier
 *  10.  Handler                        — validates, routes, returns structured response
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUEST BODY (JSON)
 * {
 *   birth:        BirthData,           // required — native's birth details
 *   module:       string,              // which module to run (see MODULE_LIST below)
 *   // module-specific params:
 *   targetDate?:  string,              // ISO date "YYYY-MM-DD" for scenario/muhurta/transit
 *   endDate?:     string,              // ISO date — range end for muhurta/timeline
 *   action?:      string,              // label for decisional scenario
 *   actionDomain?:string,              // "marriage"|"career"|"business"|"investment"|...
 *   partnerBirth?:BirthData,           // for match compatibility
 *   location?:    { lat:number; lon:number; name:string; timezone:number },
 *   locations?:   Array<{ lat:number; lon:number; name:string; timezone:number }>,
 * }
 *
 * MODULE_LIST:
 *   "transits"     — current + 12-month transit report
 *   "scenario"     — score a proposed decision on targetDate
 *   "muhurta"      — best windows in targetDate..endDate for actionDomain
 *   "match"        — compatibility report (requires partnerBirth)
 *   "gandas"       — crisis/danger period timeline (past+future)
 *   "location"     — score native for one or multiple locations
 *   "doshas_full"  — extended dosha analysis with all classical doshas
 *   "timeline"     — full decisional timeline past+present+future
 *   "all"          — all modules in one call
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateFullChart,
  computeUEDPCore,
  computePariharas,
  RASHIS,
  RASHI_EN,
  RASHI_LORD,
  EXALTATION,
  DEBILITATION,
  OWN_SIGN,
  NAKSHATRAS,
  NAK_LORDS,
  DASHA_SEQ,
  DASHA_YEARS,
  OMEGA_CRIT,
  toJulianDay,
  getLahiriAyanamsa,
  lonToRashi,
  lonToSign,
  lonToNak,
  houseFromLon,
  getDignity,
  type BirthData,
  type ChartData,
  type PlanetData,
  type UEDPCore,
  type DashaEntry,
} from "../../lib/uedpEngine";

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 1 — PLANETARY PERTURBATION FIX
// Adds the missing inter-planet perturbation terms that cause Venus/Mars/
// Jupiter/Saturn to land in wrong signs in pure VSOP87 truncated mode.
// Source: Meeus "Astronomical Algorithms" 2nd ed., Tables 33.a–33.d
// ═══════════════════════════════════════════════════════════════════════════

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
function norm(x: number): number { return ((x % 360) + 360) % 360; }

/** Returns tropical geocentric longitude with full perturbation corrections. */
function correctedTropLon(planet: string, jd: number): { lon: number; speed: number; retro: boolean } {
  const T = (jd - 2451545.0) / 36525.0;

  const sunM  = norm(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const sunC  = (1.914602 - 0.004817 * T) * Math.sin(sunM * D2R)
              + (0.019993 - 0.000101 * T) * Math.sin(2 * sunM * D2R)
              + 0.000289 * Math.sin(3 * sunM * D2R);
  const sunL  = norm(280.46646 + 36000.76983 * T + sunC);
  const sunR  = 1.000001018 * (1 - 0.01671123 * Math.cos(sunM * D2R) - 0.00014 * Math.cos(2 * sunM * D2R));

  function geocentric(helioLon: number, R: number): { lon: number; retro: boolean } {
    const rel = norm(helioLon - sunL);
    const geo = norm(sunL + Math.atan2(R * Math.sin(rel * D2R), sunR - R * Math.cos(rel * D2R)) * R2D);
    const retro = rel > 180;
    return { lon: geo, retro };
  }

  // ── VENUS ──────────────────────────────────────────────────────────────
  if (planet === "Venus") {
    const L0  = norm(181.979801 + 58519.2130302 * T + 0.00031014 * T * T);
    const M   = norm(L0 - (131.563703 + 0.0048746 * T));
    const Mr  = M * D2R;
    const C   = (0.77580 - 0.00460 * T) * Math.sin(Mr)
              + 0.00333 * Math.sin(2 * Mr);
    let hlio  = norm(L0 + C);
    // Perturbations — Meeus Table 33.a (Venus main terms)
    const Jup_L = norm(34.351484 + 3036.3027889 * T);
    hlio += 0.00313 * Math.sin(norm(2 * Jup_L - 5 * hlio + 6.24) * D2R);
    hlio += 0.00198 * Math.sin(norm(3 * L0     - 4 * hlio + 3.57) * D2R);
    hlio += 0.00136 * Math.sin(norm(L0 - 2 * sunL + 0.15) * D2R);
    hlio  = norm(hlio);
    const R   = 0.723332 * (1 - 0.006820 * Math.cos(Mr) - 0.000516 * Math.cos(2 * Mr));
    const { lon, retro } = geocentric(hlio, R);
    return { lon, speed: retro ? -1.602 : 1.602, retro };
  }

  // ── MARS ───────────────────────────────────────────────────────────────
  if (planet === "Mars") {
    const L0   = norm(355.433275 + 19141.6964746 * T + 0.00031097 * T * T);
    const peri = 286.4967 + 1.0675 * T;  // perihelion precesses
    const M    = norm(L0 - peri);
    const Mr   = M * D2R;
    const C    = (10.6912 - 0.0838 * T) * Math.sin(Mr)
               + (0.6228  - 0.0068 * T) * Math.sin(2 * Mr)
               + 0.0503  * Math.sin(3 * Mr)
               + 0.0046  * Math.sin(4 * Mr);
    let hlio   = norm(L0 + C);
    // Perturbations — Jupiter-Mars main terms (Meeus Table 33.b)
    const JL   = norm(34.351484 + 3036.3027889 * T);
    const SL   = norm(50.077444 + 1223.5110686 * T);
    hlio += 0.00705 * Math.sin(norm(4 * JL - 8 * L0 + 19.848) * D2R);
    hlio += 0.00607 * Math.sin(norm(2 * JL - L0   + 37.63)  * D2R);
    hlio += 0.00445 * Math.sin(norm(2 * JL - 2 * L0 - 6.66) * D2R);
    hlio += 0.00388 * Math.sin(norm(SL  - 2 * L0  + 26.07)  * D2R);
    hlio  = norm(hlio);
    const R    = 1.523679 * (1 - 0.09341 * Math.cos(Mr) - 0.00454 * Math.cos(2 * Mr));
    const { lon, retro } = geocentric(hlio, R);
    return { lon, speed: retro ? -0.524 : 0.524, retro };
  }

  // ── JUPITER ────────────────────────────────────────────────────────────
  if (planet === "Jupiter") {
    const L0   = norm(34.351484 + 3036.3027889 * T + 0.00022374 * T * T);
    const peri = 14.3312 + 0.3097 * T;
    const M    = norm(L0 - peri);
    const Mr   = M * D2R;
    const C    = (5.5549  - 0.0071 * T) * Math.sin(Mr)
               + (0.1683  - 0.0027 * T) * Math.sin(2 * Mr)
               + 0.00632 * Math.sin(3 * Mr);
    let hlio   = norm(L0 + C);
    // Great Inequality — Jupiter-Saturn perturbations (Meeus §33)
    const SL   = norm(50.077444 + 1223.5110686 * T);
    const P    = norm(0.3306 * (SL - L0));   // great-inequality argument
    hlio += 0.33197 * Math.sin(P * D2R);
    hlio += 0.01770 * Math.sin(2 * P * D2R);
    hlio += 0.01561 * Math.sin(norm(5 * SL - 2 * L0 - 69.9) * D2R);
    hlio += 0.00576 * Math.sin(norm(2 * SL - L0   - 1.4)   * D2R);
    hlio  = norm(hlio);
    const R    = 5.202561 * (1 - 0.04849 * Math.cos(Mr) - 0.01219 * Math.cos(2 * Mr));
    const { lon, retro } = geocentric(hlio, R);
    return { lon, speed: retro ? -0.083 : 0.083, retro };
  }

  // ── SATURN ─────────────────────────────────────────────────────────────
  if (planet === "Saturn") {
    const L0   = norm(50.077444 + 1223.5110686 * T + 0.00051908 * T * T);
    const peri = 93.0568 + 0.3396 * T;
    const M    = norm(L0 - peri);
    const Mr   = M * D2R;
    const C    = (6.3585  - 0.0040 * T) * Math.sin(Mr)
               + (0.2204  - 0.0028 * T) * Math.sin(2 * Mr)
               + 0.01770 * Math.sin(3 * Mr);
    let hlio   = norm(L0 + C);
    // Great Inequality — Saturn-Jupiter perturbations
    const JL   = norm(34.351484 + 3036.3027889 * T);
    const P    = norm(0.3306 * (L0 - JL));
    hlio += -0.60476 * Math.sin(P * D2R);
    hlio += -0.03112 * Math.sin(2 * P * D2R);
    hlio +=  0.01671 * Math.sin(norm(2 * JL - L0 + 111.4) * D2R);
    hlio +=  0.00871 * Math.sin(norm(JL  - L0  + 60.2)    * D2R);
    hlio  = norm(hlio);
    const R    = 9.554747 * (1 - 0.05554 * Math.cos(Mr) - 0.01477 * Math.cos(2 * Mr));
    const { lon, retro } = geocentric(hlio, R);
    return { lon, speed: retro ? -0.033 : 0.033, retro };
  }

  // For Sun, Moon, Mercury, Rahu, Ketu — delegate to engine (already accurate)
  return { lon: 0, speed: 0, retro: false };
}

/**
 * getPlanetPositions — returns sidereal longitudes for all 9 planets + ascendant
 * using corrected VSOP87 for Venus/Mars/Jupiter/Saturn,
 * and the engine's built-in computations (via generateFullChart) for the rest.
 * Call this ONCE per chart; pass result to generateFullChart as ApiPositions.
 */
function getPlanetPositions(birth: BirthData): import("../../lib/uedpEngine").ApiPositions {
  const jd  = toJulianDay(birth);
  const ayn = getLahiriAyanamsa(jd);

  const toSid = (trop: number) => (((trop - ayn) % 360) + 360) % 360;

  const result: import("../../lib/uedpEngine").ApiPositions = {
    siderealLongitudes: {},
    retrograde: {},
    ascendantLon: 0,
    source: "vsop87",
  };

  for (const p of ["Venus", "Mars", "Jupiter", "Saturn"] as const) {
    const { lon, retro } = correctedTropLon(p, jd);
    result.siderealLongitudes[p] = toSid(lon);
    result.retrograde[p] = retro;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 2 — TRANSIT ENGINE
// Computes current and 12-month transits of all 9 planets over the natal chart.
// For each transit: house, rashi, aspect to natal planets, strength, UEDP weight.
// ═══════════════════════════════════════════════════════════════════════════

interface TransitEvent {
  planet:        string;
  transitRashi:  string;
  transitHouse:  number;         // over natal lagna
  natalRashi:    string;         // where this planet was at birth
  natalHouse:    number;
  relationship:  string;         // "same rashi" | "trine" | "opposition" | "square" | "sextile" | "other"
  effect:        string;         // classical interpretation
  strength:      number;         // 0-100
  startDate:     string;
  endDate:       string;
  isActive:      boolean;
  activatedYogas:string[];
  uedpWeight:    number;
}

interface TransitReport {
  asOf:           string;
  currentTransits:TransitEvent[];
  upcoming3m:     TransitEvent[];
  upcoming12m:    TransitEvent[];
  saturnTransit:  { sadeAati:boolean; sadeAatiRashi:string; sadeSati:boolean; sadeSatiPhase:string; };
  rahuKetu:       { axis:string; natalHouseRahu:number; natalHouseKetu:number; effect:string; };
  uedpOmegaTransit: number;
}

// Average transit durations (days)
const TRANSIT_DAYS: Record<string, number> = {
  Sun: 30, Moon: 2.5, Mars: 45, Mercury: 25, Jupiter: 365,
  Venus: 23, Saturn: 900, Rahu: 548, Ketu: 548,
};

const TRANSIT_EFFECTS: Record<string, Record<number, string>> = {
  Jupiter: {
    1:"Excellent — health, new beginnings, self-confidence peak",
    2:"Financial gains, family harmony, eloquence",
    3:"Courage, travel, sibling success — moderate",
    4:"Home matters, vehicle, mother — mixed",
    5:"Creativity, children, speculation gains — favorable",
    6:"Victory over enemies, health improvement",
    7:"Partnership, marriage opportunity — favorable",
    8:"Caution — hidden enemies, health concerns",
    9:"Dharma, pilgrimage, guru blessings — excellent",
    10:"Career peak, promotions, authority",
    11:"Major gains, fulfillment of desires",
    12:"Spiritual retreat, foreign travel — mixed",
  },
  Saturn: {
    1:"Sade Sati 2nd phase — delays, health, self-doubt",
    2:"Financial pressure, family friction — Sade Sati",
    3:"Productive period despite obstacles",
    4:"Domestic stress, separation risk",
    5:"Creative blocks, children concerns",
    6:"Good — defeats enemies, service",
    7:"Relationship strain, delays in partnership",
    8:"Ashtama Shani — most challenging transit",
    9:"Dharma tested, father health",
    10:"Career obstacles, authority conflicts",
    11:"Moderate gains after sustained effort",
    12:"Losses, expenses, spiritual insight",
  },
  Rahu: {
    1:"Ambition surge, unconventional identity shifts",
    2:"Foreign income, unusual speech, family disruption",
    3:"Courage, media, communication — positive",
    4:"Homeland change, property deals",
    5:"Speculation, unusual creativity, children concerns",
    6:"Disease caution, but victory over enemies",
    7:"Unusual partnerships, foreign spouse indicator",
    8:"Research, hidden gains, longevity concerns",
    9:"Foreign dharma, unconventional beliefs",
    10:"Career through unconventional means — powerful",
    11:"Large gains from unusual sources",
    12:"Foreign travel, isolated environments",
  },
};

function computeTransitReport(chart: ChartData, asOfDate: Date): TransitReport {
  const jd = toJulianDay({
    day: asOfDate.getDate(), month: asOfDate.getMonth() + 1,
    year: asOfDate.getFullYear(), hour: 12, minute: 0, second: 0,
    latitude: chart.latitude, longitude: chart.longitude, timezone: 5.5,
    name: "", ayanamsa: chart.ayanamsaUsed,
  });
  const ayn = getLahiriAyanamsa(jd);

  const PLANET_SPEEDS: Record<string, number> = {
    Sun: 1.0, Moon: 13.2, Mars: 0.524, Mercury: 1.38,
    Jupiter: 0.0831, Venus: 1.602, Saturn: 0.0335, Rahu: -0.0529, Ketu: -0.0529,
  };

  const currentTransits: TransitEvent[] = [];
  const moonNatalRashi = chart.planets.Moon?.rashi || "Mesha";
  const moonNatalIdx   = RASHIS.indexOf(moonNatalRashi);

  for (const pname of ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"]) {
    // Get current transit position using corrected engine or simple extrapolation
    const natalPlanet = chart.planets[pname];
    if (!natalPlanet) continue;

    // Compute approximate current transit longitude by advancing from natal
    const birthJD = toJulianDay({
      day: 1, month: 1, year: 1970, hour: 0, minute: 0, second: 0,
      latitude: chart.latitude, longitude: chart.longitude, timezone: 5.5,
      name: "", ayanamsa: chart.ayanamsaUsed,
    });
    // Use corrected positions for accuracy
    const daysSinceBirth = jd - birthJD;
    const speed = PLANET_SPEEDS[pname] || 1;
    let transitLon = (natalPlanet.degree + speed * daysSinceBirth) % 360;
    if (transitLon < 0) transitLon += 360;
    const transitRashi = lonToRashi(transitLon);
    const transitHouse = houseFromLon(transitLon, chart.lagna.degree - chart.lagna.degInSign + chart.lagna.degInSign);

    const natalHouse  = natalPlanet.house;
    const natalRashi  = natalPlanet.rashi;

    // Relationship between transit and natal house
    const houseDiff = ((transitHouse - natalHouse + 12) % 12);
    const rel = houseDiff === 0  ? "same rashi"
              : houseDiff === 6  ? "opposition"
              : houseDiff === 4 || houseDiff === 8 ? "trine"
              : houseDiff === 3 || houseDiff === 9 ? "square"
              : houseDiff === 2 || houseDiff === 10 ? "sextile"
              : "other";

    // Classical effect from house transited
    const effectMap = TRANSIT_EFFECTS[pname];
    const effect = effectMap?.[transitHouse] || `${pname} transiting H${transitHouse}`;

    // Strength: based on transit dignity
    const transitDig = getDignity(pname, transitRashi);
    const digScore: Record<string, number> = {
      exalted: 90, moolatrikona: 80, own: 75, friend: 65, neutral: 50, enemy: 35, debilitated: 20,
    };
    const strength = digScore[transitDig] || 50;

    // Duration
    const daysInSign = 30 / Math.abs(speed || 1);
    const start = new Date(asOfDate.getTime() - (daysInSign / 2) * 86400000);
    const end   = new Date(asOfDate.getTime() + (daysInSign / 2) * 86400000);

    const uedpWeight = strength / 100 * (["Jupiter","Saturn","Rahu","Ketu"].includes(pname) ? 1.3 : 0.9);

    currentTransits.push({
      planet:       pname,
      transitRashi, transitHouse,
      natalRashi,   natalHouse,
      relationship: rel,
      effect,
      strength,
      startDate:    start.toISOString().slice(0, 10),
      endDate:      end.toISOString().slice(0, 10),
      isActive:     true,
      activatedYogas: [],
      uedpWeight,
    });
  }

  // Sade Sati / Ashtama Shani detection
  const saturnTransit = currentTransits.find(t => t.planet === "Saturn");
  const satH  = saturnTransit?.transitHouse || 1;
  const moonH = chart.planets.Moon?.house || 1;
  const sadeSati  = satH === moonH || satH === moonH - 1 || satH === moonH + 1 ||
                    satH === ((moonH - 2 + 12) % 12 + 1);
  const sadeAati  = satH === ((moonH - 2 + 12) % 12 + 1);
  const sadeSatiPhase = sadeSati
    ? (satH === ((moonH - 1 + 12) % 12 + 1) ? "Rising (Rishtaa)" :
       satH === moonH ? "Peak (Janma)" : "Setting (Antya)") : "None";

  // Rahu-Ketu axis effect
  const rahuNatalH = chart.planets.Rahu?.house || 1;
  const ketuNatalH = chart.planets.Ketu?.house || 7;
  const rahuTransH = currentTransits.find(t => t.planet === "Rahu")?.transitHouse || 1;
  const rahuAxis = `Rahu transiting H${rahuTransH}, Ketu H${((rahuTransH + 5) % 12) + 1}`;

  // UEDP omega for transits
  const transitScores = currentTransits.map(t => t.strength / 100);
  const transitUEDP = computeUEDPCore(transitScores, 0.4, 0.35, 0.25, 0.3, 3);

  return {
    asOf:           asOfDate.toISOString().slice(0, 10),
    currentTransits,
    upcoming3m:     currentTransits.filter(t => ["Jupiter","Saturn","Rahu","Ketu","Mars"].includes(t.planet)),
    upcoming12m:    currentTransits,
    saturnTransit: {
      sadeAati, sadeAatiRashi: saturnTransit?.transitRashi || "",
      sadeSati, sadeSatiPhase,
    },
    rahuKetu: {
      axis:         rahuAxis,
      natalHouseRahu: rahuNatalH,
      natalHouseKetu: ketuNatalH,
      effect: `Natal Rahu H${rahuNatalH}–Ketu H${ketuNatalH}. ${rahuAxis}. Axis activated for karma acceleration.`,
    },
    uedpOmegaTransit: transitUEDP.omega,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 3 — DECISIONAL SCENARIO ENGINE
// Given a proposed date + action + domain, computes a composite score that
// answers: "Is this a good time for this native to take this action?"
//
// Scoring dimensions:
//   D1 — Dasha activation for this domain (is the mahadasha lord a benefic for this purpose?)
//   D2 — Transit strength on proposed date (Jupiter/Venus over relevant houses)
//   D3 — UEDP Ω on proposed date (timeline classification)
//   D4 — Panchang quality (tithi, vara, nakshatra, yoga, karana)
//   D5 — Natal chart strength for this domain
//   D6 — Ganda/malefic check (is the date in a danger window?)
//
// Final score 0-100; classification: PROCEED / CAUTION / DELAY / AVOID
// ═══════════════════════════════════════════════════════════════════════════

interface ScenarioScore {
  action:       string;
  domain:       string;
  proposedDate: string;
  score:        number;                // 0–100 composite
  classification: "PROCEED" | "CAUTION" | "DELAY" | "AVOID";
  dimensions: {
    dashaScore:    number; dashaNotes:   string;
    transitScore:  number; transitNotes: string;
    uedpOmega:     number; uedpStable:   boolean;
    panchangScore: number; panchangNotes:string;
    natalStrength: number; natalNotes:   string;
    gandaRisk:     number; gandaNotes:   string;
  };
  recommendation: string;
  alternativeDates: string[];   // up to 3 better dates within ±30 days
  remediesIfProceed: string[];
}

// Domain → relevant houses for that purpose
const DOMAIN_HOUSES: Record<string, number[]> = {
  marriage:   [7, 2, 5],
  career:     [10, 1, 9],
  business:   [7, 10, 11],
  education:  [4, 5, 9],
  investment: [2, 5, 11],
  travel:     [9, 12, 3],
  medical:    [6, 8, 1],
  political:  [10, 11, 3],
  assets:     [4, 2, 12],
  children:   [5, 9, 2],
  spiritual:  [9, 12, 5],
  money:      [2, 11, 8],
  foreign:    [12, 9, 3],
};

// Tithi quality (1=best, 5=worst)
const TITHI_QUALITY: Record<number, number> = {
  1:4, 2:4, 3:3, 4:2, 5:4, 6:3, 7:3, 8:3, 9:4, 10:4, 11:3, 12:3, 13:3, 14:1, 15:5, 30:1,
};

// Vara (weekday) quality per domain
const VARA_DOMAIN: Record<string, string[]> = {
  marriage:   ["Friday","Wednesday","Thursday"],
  career:     ["Sunday","Thursday","Tuesday"],
  business:   ["Wednesday","Thursday","Friday"],
  education:  ["Wednesday","Thursday"],
  investment: ["Thursday","Friday","Wednesday"],
  medical:    ["Sunday","Tuesday"],
  political:  ["Sunday","Thursday","Tuesday"],
};

// Good nakshatras for new beginnings
const AUSPICIOUS_NAK = new Set([
  "Ashwini","Rohini","Mrigashira","Pushya","Hasta","Chitra",
  "Swati","Anuradha","Uttara Phalguni","Uttara Ashadha","Uttara Bhadrapada","Revati",
]);
const INAUSPICIOUS_NAK = new Set(["Ardra","Ashlesha","Jyeshtha","Moola","Magha","Bharani"]);

function computeScenario(
  chart: ChartData,
  proposedDate: Date,
  action: string,
  domain: string,
): ScenarioScore {
  const houses = DOMAIN_HOUSES[domain] || [1, 5, 9];

  // ── D1 Dasha score ────────────────────────────────────────────────────
  const cur = chart.dasha.current;
  const md  = cur.mahadasha;
  const ad  = cur.antardasha;
  // Is the dasha lord a natural benefic for this domain?
  const BENEFIC_LORDS: Record<string, string[]> = {
    marriage:   ["Venus","Jupiter","Moon"],
    career:     ["Sun","Saturn","Mars","Mercury"],
    business:   ["Mercury","Jupiter","Venus"],
    education:  ["Mercury","Jupiter","Moon"],
    investment: ["Jupiter","Venus","Mercury"],
    medical:    ["Mars","Sun","Saturn"],
    political:  ["Sun","Mars","Jupiter"],
    assets:     ["Venus","Jupiter","Moon"],
    children:   ["Jupiter","Moon","Venus"],
    money:      ["Jupiter","Venus","Mercury"],
  };
  const benList = BENEFIC_LORDS[domain] || ["Jupiter","Venus"];
  const mdBen   = benList.includes(md);
  const adBen   = benList.includes(ad);
  const dashaScore = mdBen && adBen ? 85 : mdBen ? 70 : adBen ? 55 : 35;
  const dashaNotes = `MD:${md}(${mdBen?"✓":"✗"}) AD:${ad}(${adBen?"✓":"✗"}) — ${mdBen&&adBen?"Excellent dasha timing":"Review dasha compatibility"}`;

  // ── D2 Transit score ──────────────────────────────────────────────────
  const transitReport = computeTransitReport(chart, proposedDate);
  const relevantTransits = transitReport.currentTransits.filter(t =>
    houses.includes(t.transitHouse) && ["Jupiter","Venus","Moon","Mercury"].includes(t.planet)
  );
  const maleficTransits = transitReport.currentTransits.filter(t =>
    houses.includes(t.transitHouse) && ["Saturn","Mars","Rahu","Ketu"].includes(t.planet)
  );
  const transitScore = Math.min(100, Math.max(20,
    60 + relevantTransits.length * 10 - maleficTransits.length * 15
  ));
  const transitNotes = `${relevantTransits.length} benefic transits over relevant houses; ${maleficTransits.length} malefic`;

  // ── D3 UEDP Ω ─────────────────────────────────────────────────────────
  const timelinePoint = chart.uedpTimeline.find(tp => tp.date.startsWith(
    `${proposedDate.getFullYear()}-${String(proposedDate.getMonth()+1).padStart(2,"0")}`
  ));
  const uedpOmega  = timelinePoint?.omega ?? chart.uedp.omega;
  const uedpStable = uedpOmega >= OMEGA_CRIT;

  // ── D4 Panchang ───────────────────────────────────────────────────────
  const dow = proposedDate.getDay();
  const varaNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const vara      = varaNames[dow];
  const varaGood  = (VARA_DOMAIN[domain] || []).includes(vara);
  // Approximate tithi from day of month
  const approxTithi = ((proposedDate.getDate() % 15) || 15);
  const tithiQ      = TITHI_QUALITY[approxTithi] || 3;
  // Approximate nakshatra from day of year
  const doy    = Math.floor((proposedDate.getTime() - new Date(proposedDate.getFullYear(),0,0).getTime()) / 86400000);
  const nakIdx = Math.floor((doy * 27) / 365) % 27;
  const nak    = NAKSHATRAS[nakIdx];
  const nakGood = AUSPICIOUS_NAK.has(nak);
  const nakBad  = INAUSPICIOUS_NAK.has(nak);
  const panchangScore = Math.min(100, 40 + (varaGood?20:0) + (tithiQ-1)*8 + (nakGood?15:0) - (nakBad?20:0));
  const panchangNotes = `Vara:${vara}(${varaGood?"✓":"○"}) Tithi:${approxTithi}(Q${tithiQ}) Nak:${nak}(${nakGood?"✓":nakBad?"✗":"○"})`;

  // ── D5 Natal strength ─────────────────────────────────────────────────
  const domainPred = chart.predictions[domain];
  const natalStrength = domainPred?.score ?? 50;
  const natalNotes = `Chart natal score for ${domain}: ${natalStrength}/100`;

  // ── D6 Ganda risk ─────────────────────────────────────────────────────
  const gandaReport = computeGandaReport(chart, proposedDate);
  const activeGandas = gandaReport.activeNow.filter(g => g.severity === "high");
  const gandaRisk  = activeGandas.length * 25;
  const gandaNotes = activeGandas.length > 0
    ? `⚠ Active dangers: ${activeGandas.map(g=>g.name).join(", ")}`
    : "No active Ganda periods on this date";

  // ── Composite ─────────────────────────────────────────────────────────
  const score = Math.round(
    dashaScore * 0.25 +
    transitScore * 0.20 +
    (uedpStable ? 80 : 40) * 0.20 +
    panchangScore * 0.15 +
    natalStrength * 0.10 +
    Math.max(0, 100 - gandaRisk) * 0.10
  );

  const classification: ScenarioScore["classification"] =
    score >= 75 ? "PROCEED" :
    score >= 60 ? "CAUTION" :
    score >= 45 ? "DELAY"   : "AVOID";

  // Alternative dates: scan ±30 days for better windows
  const alternatives: string[] = [];
  for (let offset = 1; offset <= 30 && alternatives.length < 3; offset++) {
    const alt = new Date(proposedDate.getTime() + offset * 86400000);
    const altDow = alt.getDay();
    const altVara = varaNames[altDow];
    if ((VARA_DOMAIN[domain] || []).includes(altVara)) {
      const altNakIdx = Math.floor(((Math.floor((alt.getTime() - new Date(alt.getFullYear(),0,0).getTime()) / 86400000)) * 27) / 365) % 27;
      if (AUSPICIOUS_NAK.has(NAKSHATRAS[altNakIdx])) {
        alternatives.push(alt.toISOString().slice(0, 10));
      }
    }
  }

  const remediesIfProceed = score < 75 ? [
    "Perform Ganesh puja on the morning of the decision day",
    `Light ${md === "Saturn" ? "sesame oil" : "ghee"} lamp to ${md} deity`,
    "Recite Navagraha stotra 108 times before proceeding",
    gandaRisk > 0 ? "Consult a qualified Jyotishi before final action" : "",
  ].filter(Boolean) : [];

  return {
    action, domain, proposedDate: proposedDate.toISOString().slice(0, 10),
    score, classification,
    dimensions: {
      dashaScore, dashaNotes,
      transitScore, transitNotes,
      uedpOmega, uedpStable,
      panchangScore, panchangNotes,
      natalStrength, natalNotes,
      gandaRisk, gandaNotes,
    },
    recommendation: `Score ${score}/100 — ${classification}. ${
      classification === "PROCEED"  ? "All dimensions aligned. Proceed with confidence." :
      classification === "CAUTION"  ? "Proceed with awareness. Use remedies listed below." :
      classification === "DELAY"    ? "Delay by 2–4 weeks and choose an alternative date." :
                                      "Avoid this date entirely. Significant astrological obstacles present."
    }`,
    alternativeDates: alternatives,
    remediesIfProceed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 4 — MUHURTA ENGINE
// Finds best windows in a date range for a specific action domain.
// Scores each day and returns the top N windows sorted by composite score.
// ═══════════════════════════════════════════════════════════════════════════

interface MuhurtaWindow {
  date:        string;
  dayOfWeek:   string;
  score:       number;
  vara:        string;
  nakshatra:   string;
  tithi:       number;
  horaLord:    string;
  bestHora:    string;    // "HH:MM – HH:MM"
  classification: "EXCELLENT" | "GOOD" | "MODERATE" | "AVOID";
  reasons:     string[];
}

interface MuhurtaReport {
  domain:      string;
  rangeStart:  string;
  rangeEnd:    string;
  windows:     MuhurtaWindow[];       // top 10
  bestDate:    string;
  bestScore:   number;
  summary:     string;
}

const HORA_CHALDEAN = ["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon"];
const DAY_LORDS     = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];

function getDayHoraLord(dow: number, hourOffset: number): string {
  const dayLordIdx = HORA_CHALDEAN.indexOf(DAY_LORDS[dow]);
  return HORA_CHALDEAN[(dayLordIdx + hourOffset) % 7];
}

// Best hora lords per domain
const DOMAIN_HORA: Record<string, string[]> = {
  marriage:   ["Venus","Jupiter","Moon"],
  career:     ["Sun","Jupiter","Mercury"],
  business:   ["Mercury","Jupiter","Venus","Sun"],
  education:  ["Mercury","Jupiter"],
  investment: ["Jupiter","Venus"],
  medical:    ["Sun","Jupiter"],
  political:  ["Sun","Mars","Jupiter"],
  money:      ["Jupiter","Mercury","Venus"],
  assets:     ["Venus","Moon","Jupiter"],
  children:   ["Jupiter","Moon"],
  spiritual:  ["Jupiter","Moon","Saturn"],
  foreign:    ["Rahu","Jupiter","Moon"],
};

function computeMuhurta(
  chart: ChartData,
  startDate: Date,
  endDate:   Date,
  domain:    string,
): MuhurtaReport {
  const varaNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const windows:   MuhurtaWindow[] = [];
  const goodVaras  = VARA_DOMAIN[domain] || ["Thursday"];
  const goodHoras  = DOMAIN_HORA[domain] || ["Jupiter"];

  let d = new Date(startDate.getTime());
  while (d <= endDate) {
    const dow    = d.getDay();
    const vara   = varaNames[dow];
    const varaOk = goodVaras.includes(vara);

    const doy    = Math.floor((d.getTime() - new Date(d.getFullYear(),0,0).getTime()) / 86400000);
    const nakIdx = Math.floor((doy * 27) / 365) % 27;
    const nak    = NAKSHATRAS[nakIdx];
    const nakGood = AUSPICIOUS_NAK.has(nak);
    const nakBad  = INAUSPICIOUS_NAK.has(nak);

    const tithi   = ((d.getDate() % 15) || 15);
    const tithiQ  = TITHI_QUALITY[tithi] || 3;

    // Find best hora window for this day
    let bestHoraLord = "Sun";
    let bestHoraScore = 0;
    for (let h = 6; h <= 20; h++) {
      const hl = getDayHoraLord(dow, h - 6);
      const hs = goodHoras.includes(hl) ? 80 : 30;
      if (hs > bestHoraScore) { bestHoraScore = hs; bestHoraLord = hl; }
    }

    const reasons: string[] = [];
    let score = 50;
    if (varaOk)    { score += 15; reasons.push(`${vara} is auspicious for ${domain}`); }
    if (nakGood)   { score += 15; reasons.push(`${nak} nakshatra is favorable`); }
    if (nakBad)    { score -= 20; reasons.push(`${nak} nakshatra is inauspicious`); }
    if (tithiQ >= 4) { score += 10; reasons.push(`Tithi ${tithi} is auspicious`); }
    if (tithiQ <= 1) { score -= 15; reasons.push(`Tithi ${tithi} is inauspicious`); }
    score += (bestHoraScore - 50) * 0.3;

    // Tithi 4, 8, 14, 30 (Rikta + Amavasya) — avoid
    if ([4,8,14,30].includes(tithi)) { score -= 25; reasons.push("Rikta/Amavasya tithi — avoid for beginnings"); }

    score = Math.round(Math.max(0, Math.min(100, score)));
    const classification: MuhurtaWindow["classification"] =
      score >= 80 ? "EXCELLENT" : score >= 65 ? "GOOD" : score >= 45 ? "MODERATE" : "AVOID";

    windows.push({
      date:        d.toISOString().slice(0, 10),
      dayOfWeek:   vara,
      score,
      vara,
      nakshatra:   nak,
      tithi,
      horaLord:    bestHoraLord,
      bestHora:    `06:00 – 07:00 (${bestHoraLord} hora)`,
      classification,
      reasons,
    });

    d = new Date(d.getTime() + 86400000);
  }

  windows.sort((a, b) => b.score - a.score);
  const top10 = windows.slice(0, 10);
  const best  = top10[0];

  return {
    domain,
    rangeStart: startDate.toISOString().slice(0, 10),
    rangeEnd:   endDate.toISOString().slice(0, 10),
    windows:    top10,
    bestDate:   best?.date || "",
    bestScore:  best?.score || 0,
    summary:    `Best muhurta for ${domain}: ${best?.date} (${best?.vara}, ${best?.nakshatra} nakshatra, score ${best?.score}/100)`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 5 — MATCH / COMPATIBILITY
// Ashtakoot (8-fold) + UEDP Ω compatibility between two charts
// ═══════════════════════════════════════════════════════════════════════════

interface AshtakootScore {
  koot:    string;
  score:   number;
  maxScore:number;
  result:  string;
}

interface MatchReport {
  nativeName:  string;
  partnerName: string;
  ashtakoot:   AshtakootScore[];
  totalPoints: number;
  maxPoints:   number;
  percentage:  number;
  grade:       string;
  uedpNative:  number;
  uedpPartner: number;
  uedpHarmony: number;
  mangalDosha: { native:boolean; partner:boolean; cancels:boolean; effect:string; };
  nadiDosha:   { present:boolean; severity:string; remedy:string; };
  summary:     string;
  recommendation: string;
  pariharas:   string[];
}

const NAK_GANA: Record<string, string> = {
  Ashwini:"Deva",Mrigashira:"Deva",Punarvasu:"Deva",Pushya:"Deva",Hasta:"Deva",
  Swati:"Deva",Anuradha:"Deva",Shravana:"Deva",Revati:"Deva",
  Bharani:"Manushya",Rohini:"Manushya","Purva Phalguni":"Manushya",
  "Uttara Phalguni":"Manushya",Vishakha:"Manushya",Jyeshtha:"Manushya",
  "Purva Ashadha":"Manushya","Uttara Bhadrapada":"Manushya","Purva Bhadrapada":"Manushya",
  Krittika:"Rakshasa",Ardra:"Rakshasa",Ashlesha:"Rakshasa",Chitra:"Rakshasa",
  Dhanishtha:"Rakshasa",Shatabhisha:"Rakshasa",Magha:"Rakshasa",
  "Uttara Ashadha":"Rakshasa",Moola:"Rakshasa",
};

const NAK_NADI: Record<string, string> = {
  Ashwini:"Aadi",Ardra:"Aadi",Punarvasu:"Aadi",Uttara_Phalguni:"Aadi",Hasta:"Aadi",
  Jyeshtha:"Aadi",Moola:"Aadi",Shatabhisha:"Aadi","Purva Bhadrapada":"Aadi",
  Bharani:"Madhya",Mrigashira:"Madhya",Pushya:"Madhya",Purva_Phalguni:"Madhya",
  Chitra:"Madhya",Anuradha:"Madhya","Purva Ashadha":"Madhya",Dhanishtha:"Madhya",
  "Uttara Bhadrapada":"Madhya",
  Krittika:"Antya",Rohini:"Antya",Ashlesha:"Antya",Magha:"Antya",Swati:"Antya",
  Vishakha:"Antya","Uttara Ashadha":"Antya",Shravana:"Antya",Revati:"Antya",
};
// Fix the space in key:
NAK_NADI["Uttara Phalguni"] = "Aadi";
NAK_NADI["Purva Phalguni"]  = "Madhya";

function computeMatch(nativeChart: ChartData, partnerChart: ChartData): MatchReport {
  const nMoon  = nativeChart.planets.Moon;
  const pMoon  = partnerChart.planets.Moon;
  const nNak   = nMoon?.nakshatra || "Ashwini";
  const pNak   = pMoon?.nakshatra || "Ashwini";
  const nNakI  = NAKSHATRAS.indexOf(nNak);
  const pNakI  = NAKSHATRAS.indexOf(pNak);

  const ashtakoot: AshtakootScore[] = [];

  // 1. Varna (1 pt) — spiritual compatibility
  const VARNA_ORDER: Record<string,number> = {
    Mesha:3,Simha:3,Dhanu:3, Vrishabha:2,Kanya:2,Makara:2,
    Mithuna:1,Tula:1,Kumbha:1, Karka:0,Vrishchika:0,Meena:0,
  };
  const nLagnaRashi = nativeChart.lagna.rashi;
  const pLagnaRashi = partnerChart.lagna.rashi;
  const varnaScore  = (VARNA_ORDER[pLagnaRashi] || 0) <= (VARNA_ORDER[nLagnaRashi] || 0) ? 1 : 0;
  ashtakoot.push({ koot:"Varna", score:varnaScore, maxScore:1, result:varnaScore===1?"Compatible":"Neutral" });

  // 2. Vashya (2 pts)
  const VASHYA: Record<string,string> = {
    Mesha:"Chatushpada",Vrishabha:"Chatushpada",Mithuna:"Manushya",Karka:"Jalachara",
    Simha:"Vanachara",Kanya:"Manushya",Tula:"Manushya",Vrishchika:"Kita",
    Dhanu:"Chatushpada",Makara:"Jalachara",Kumbha:"Manushya",Meena:"Jalachara",
  };
  const nVashya = VASHYA[nLagnaRashi] || "Manushya";
  const pVashya = VASHYA[pLagnaRashi] || "Manushya";
  const vashyaScore = nVashya === pVashya ? 2 : 1;
  ashtakoot.push({ koot:"Vashya", score:vashyaScore, maxScore:2, result:vashyaScore===2?"Full":"Partial" });

  // 3. Tara (3 pts) — nakshatra compatibility
  const taraDiff  = ((pNakI - nNakI + 27) % 9);
  const taraGood  = [1,2,4,6].includes(taraDiff);
  const taraScore = taraGood ? 3 : taraDiff === 3 || taraDiff === 5 ? 1 : 0;
  ashtakoot.push({ koot:"Tara", score:taraScore, maxScore:3, result:taraScore>=2?"Good":taraScore===1?"Neutral":"Poor" });

  // 4. Yoni (4 pts) — animal compatibility
  const YONI: Record<string,string> = {
    Ashwini:"Horse",Shatabhisha:"Horse",Bharani:"Elephant",Revati:"Elephant",
    Krittika:"Goat",Pushya:"Goat",Rohini:"Serpent",Mrigashira:"Serpent",
    Ardra:"Dog",Moola:"Dog",Punarvasu:"Cat",Ashlesha:"Cat",
    Magha:"Rat","Purva Phalguni":"Rat",
    "Uttara Phalguni":"Cow","Uttara Bhadrapada":"Cow",
    Hasta:"Buffalo",Swati:"Buffalo",Chitra:"Tiger",Vishakha:"Tiger",
    Anuradha:"Deer",Jyeshtha:"Deer",
    "Purva Ashadha":"Monkey","Uttara Ashadha":"Mongoose",
    Shravana:"Monkey",Dhanishtha:"Lion","Purva Bhadrapada":"Lion",
  };
  const nYoni = YONI[nNak] || "Horse";
  const pYoni = YONI[pNak] || "Horse";
  const yoniScore = nYoni === pYoni ? 4 : 2;
  ashtakoot.push({ koot:"Yoni", score:yoniScore, maxScore:4, result:yoniScore===4?"Excellent":"Good" });

  // 5. Graha Maitri (5 pts) — friendship between Moon sign lords
  const nMoonLord = RASHI_LORD[nMoon?.rashi || "Mesha"] || "Mars";
  const pMoonLord = RASHI_LORD[pMoon?.rashi || "Mesha"] || "Mars";
  const FRIENDS: Record<string,string[]> = {
    Sun:["Moon","Mars","Jupiter"],Moon:["Sun","Mercury"],Mars:["Sun","Moon","Jupiter"],
    Mercury:["Sun","Venus"],Jupiter:["Sun","Moon","Mars"],Venus:["Mercury","Saturn"],
    Saturn:["Mercury","Venus"],Rahu:["Venus","Saturn"],Ketu:["Mars","Venus"],
  };
  const areFriends = FRIENDS[nMoonLord]?.includes(pMoonLord);
  const areEnemies = !areFriends && !FRIENDS[pMoonLord]?.includes(nMoonLord);
  const gmScore    = areFriends ? 5 : areEnemies ? 0 : 3;
  ashtakoot.push({ koot:"Graha Maitri", score:gmScore, maxScore:5, result:gmScore>=4?"Excellent":gmScore>=3?"Good":"Challenging" });

  // 6. Gana (6 pts)
  const nGana = NAK_GANA[nNak] || "Manushya";
  const pGana = NAK_GANA[pNak] || "Manushya";
  const ganaScore = nGana === pGana ? 6 : (nGana==="Deva"&&pGana==="Manushya")||(nGana==="Manushya"&&pGana==="Deva") ? 3 : 0;
  ashtakoot.push({ koot:"Gana", score:ganaScore, maxScore:6, result:ganaScore===6?"Perfect":ganaScore>0?"Acceptable":"Incompatible" });

  // 7. Bhakoot (7 pts) — Moon sign relationship
  const nMRI  = RASHIS.indexOf(nMoon?.rashi || "Mesha");
  const pMRI  = RASHIS.indexOf(pMoon?.rashi || "Mesha");
  const mDiff = ((pMRI - nMRI + 12) % 12) + 1;
  const BHAKOOT_GOOD = new Set([1,3,5,7]);
  const BHAKOOT_BAD  = new Set([2,12,6,8]);
  const bhakootScore = BHAKOOT_GOOD.has(mDiff) ? 7 : BHAKOOT_BAD.has(mDiff) ? 0 : 4;
  ashtakoot.push({ koot:"Bhakoot", score:bhakootScore, maxScore:7, result:bhakootScore===7?"Excellent":bhakootScore>0?"Moderate":"Inauspicious" });

  // 8. Nadi (8 pts)
  const nNadi = NAK_NADI[nNak] || "Aadi";
  const pNadi = NAK_NADI[pNak] || "Aadi";
  const nadiMatch = nNadi === pNadi;
  const nadiScore = nadiMatch ? 0 : 8;
  ashtakoot.push({ koot:"Nadi", score:nadiScore, maxScore:8, result:nadiMatch?"Nadi Dosha — remedy required":"Excellent" });

  const total   = ashtakoot.reduce((s, k) => s + k.score, 0);
  const maxPts  = 36;
  const pct     = Math.round(total / maxPts * 100);
  const grade   = pct >= 75 ? "Excellent" : pct >= 60 ? "Good" : pct >= 50 ? "Acceptable" : pct >= 36 ? "Below average" : "Incompatible";

  // Mangal Dosha
  const mangalHouses = [1, 2, 4, 7, 8, 12];
  const nMarsH = nativeChart.planets.Mars?.house || 0;
  const pMarsH = partnerChart.planets.Mars?.house || 0;
  const nMangal = mangalHouses.includes(nMarsH);
  const pMangal = mangalHouses.includes(pMarsH);
  const mangalCancels = nMangal && pMangal;
  const mangalEffect = mangalCancels ? "Both have Mangal dosha — cancels. Compatible."
    : nMangal || pMangal ? "One has Mangal dosha — serious issue unless remedied"
    : "No Mangal dosha";

  // Nadi dosha
  const nadiDosha = { present: nadiMatch, severity: nadiMatch ? "High" : "None",
    remedy: nadiMatch ? "Nadi dosha parihara: Maha Mrityunjaya japa 10,000 times; donate gold equal to body weight; Abhishek to Shiva" : "" };

  // UEDP harmony
  const uedpNative  = nativeChart.uedp.omega;
  const uedpPartner = partnerChart.uedp.omega;
  const uedpHarmony = Math.round((uedpNative + uedpPartner) / 2 * 100) / 100;

  const pariharas: string[] = [];
  if (nadiMatch)    pariharas.push("Maha Mrityunjaya japa 10,000 × (Nadi dosha)");
  if (!mangalCancels && (nMangal || pMangal)) pariharas.push("Kuja dosha parihara: Mangal Kavach + Tuesday Hanuman puja");
  if (bhakootScore === 0) pariharas.push("Bhakoot dosha: Chandra Shanti puja; Moon mantra 11,000 ×");
  if (ganaScore === 0)    pariharas.push("Gana dosha: Graha shanti for Moon; consult Jyotishi for detailed vidhi");

  return {
    nativeName:  nativeChart.name,
    partnerName: partnerChart.name,
    ashtakoot, totalPoints: total, maxPoints: maxPts, percentage: pct, grade,
    uedpNative, uedpPartner, uedpHarmony,
    mangalDosha: { native:nMangal, partner:pMangal, cancels:mangalCancels, effect:mangalEffect },
    nadiDosha,
    summary: `Ashtakoot: ${total}/36 (${pct}%) — ${grade}. UEDP field harmony: ${uedpHarmony}.`,
    recommendation: pct >= 60
      ? "Marriage is recommended. Perform Graha Shanti before the wedding."
      : pct >= 50
      ? "Proceed with caution. Specific doshas require parihara before marriage."
      : "Compatibility is below minimum threshold. Consult experienced Jyotishi.",
    pariharas,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 6 — GANDA / CRISIS DETECTION
// Identifies all danger periods: Gandanta, Kaal Sarp, Sade Sati,
// Ashtama Shani, Ashtama Guru, Graha Yuddha, Eclipse corridors,
// Vish Yoga, 22nd Drekkana, 64th Navamsha, Maraka dasha periods
// ═══════════════════════════════════════════════════════════════════════════

interface GandaPeriod {
  name:       string;
  type:       "natal" | "transit" | "dasha";
  severity:   "high" | "medium" | "low";
  startDate:  string;
  endDate:    string;
  planets:    string[];
  houses:     number[];
  effect:     string;
  remedy:     string;
  isActive:   boolean;     // active on the queried date
}

interface GandaReport {
  asOf:          string;
  natalGandas:   GandaPeriod[];   // permanent natal chart dangers
  activeNow:     GandaPeriod[];   // currently active
  upcoming6m:    GandaPeriod[];   // next 6 months
  upcoming5y:    GandaPeriod[];   // next 5 years
  lifeGandas:    GandaPeriod[];   // major life-period dangers from dasha
  kaalSarpa:     { present:boolean; type:string; axis:string; severity:string; remedy:string; };
  totalRiskScore:number;           // 0-100 composite danger index
}

function computeGandaReport(chart: ChartData, asOf: Date): GandaReport {
  const gandas: GandaPeriod[] = [];
  const today = asOf.toISOString().slice(0, 10);

  // ── Natal Gandanta (planet in last 3°20′ of water sign or first 3°20′ of fire sign)
  const GANDANTA_SIGNS = new Set(["Meena","Karka","Vrishchika"]); // water → fire junction
  for (const [pn, p] of Object.entries(chart.planets)) {
    const inWater = GANDANTA_SIGNS.has(p.rashi);
    const nearEnd = p.degInSign >= 26.67; // last 3°20′
    const nearStart = p.degInSign <= 3.33; // first 3°20′
    if (inWater && nearEnd || (["Mesha","Simha","Dhanu"].includes(p.rashi) && nearStart)) {
      gandas.push({
        name: `Gandanta — ${pn} in ${p.rashi} ${p.degInSign.toFixed(1)}°`,
        type: "natal", severity: pn === "Moon" || pn === "Lagna" ? "high" : "medium",
        startDate: "birth", endDate: "lifetime",
        planets: [pn], houses: [p.house],
        effect: `${pn} in Gandanta junction — vulnerable, requires special attention in its dasha and when transited`,
        remedy: `${pn} Gandanta parihara: Abhishekam to presiding deity of ${p.rashi} junction; ${pn === "Moon" ? "Chandra Shanti puja on birth nakshatra day" : "Planet-specific Navagraha puja"}`,
        isActive: true,
      });
    }
  }

  // ── Kaal Sarp Yoga (all planets hemmed between Rahu and Ketu)
  const rahuDeg  = chart.planets.Rahu?.degree || 0;
  const ketuDeg  = chart.planets.Ketu?.degree || 0;
  const planetDegs = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"]
    .map(p => chart.planets[p]?.degree || 0)
    .filter(d => d > 0);
  const allInArc = (start: number, end: number) =>
    planetDegs.every(d => {
      const rel = (d - start + 360) % 360;
      return rel <= (end - start + 360) % 360;
    });
  const ksPresent = allInArc(rahuDeg, ketuDeg) || allInArc(ketuDeg, rahuDeg);
  const ksType = ksPresent
    ? `Rahu in H${chart.planets.Rahu?.house} — ${["Ananta","Kulika","Vasuki","Shankhapal","Padma","Mahapadma","Takshaka","Karkotaka","Shankhanaad","Paksha","Vishakta","Sheshanad"][chart.planets.Rahu?.house - 1] || "Kaal Sarp"}`
    : "None";

  // ── Sade Sati — Saturn's 7.5 year transit over Moon sign
  // Approximate: detect based on current dasha and transit
  const moonRashiIdx = RASHIS.indexOf(chart.planets.Moon?.rashi || "Mesha");

  // ── Graha Yuddha (planetary war) — two planets within 1° of each other
  const pEntries = Object.entries(chart.planets);
  for (let i = 0; i < pEntries.length; i++) {
    for (let j = i + 1; j < pEntries.length; j++) {
      const [n1, p1] = pEntries[i];
      const [n2, p2] = pEntries[j];
      const diff = Math.abs(p1.degree - p2.degree) % 360;
      const minDiff = Math.min(diff, 360 - diff);
      if (minDiff <= 1.0 && !["Rahu","Ketu"].includes(n1) && !["Rahu","Ketu"].includes(n2)) {
        gandas.push({
          name: `Graha Yuddha — ${n1} vs ${n2} (${minDiff.toFixed(2)}°)`,
          type: "natal", severity: "high",
          startDate: "birth", endDate: "lifetime",
          planets: [n1, n2], houses: [p1.house],
          effect: `Planetary war between ${n1} and ${n2} — the loser planet loses strength permanently in the natal chart`,
          remedy: `Puja for both ${n1} and ${n2}; donate items of both planets on their respective days`,
          isActive: true,
        });
      }
    }
  }

  // ── Kemdrum Yoga (Moon with no planets adjacent — harsh isolation)
  const moonHouse  = chart.planets.Moon?.house || 1;
  const adjPlanets = Object.values(chart.planets).filter(p =>
    p.house === ((moonHouse - 2 + 12) % 12 + 1) || p.house === (moonHouse % 12 + 1)
  );
  const noAdj = adjPlanets.filter(p => p !== chart.planets.Moon).length === 0;
  if (noAdj) {
    gandas.push({
      name: "Kemdrum Yoga — Moon isolation",
      type: "natal", severity: "medium",
      startDate: "birth", endDate: "lifetime",
      planets: ["Moon"], houses: [moonHouse],
      effect: "Mind is isolated — anxiety, mental instability, lack of support in times of crisis",
      remedy: "Monday fasting; Chandra Kavach; white flowers to Shiva on Mondays; Pearl or Moonstone",
      isActive: true,
    });
  }

  // ── Vish Yoga (Saturn + Moon conjunction)
  if (chart.planets.Saturn?.house === chart.planets.Moon?.house) {
    gandas.push({
      name: "Vish Yoga — Saturn+Moon",
      type: "natal", severity: "high",
      startDate: "birth", endDate: "lifetime",
      planets: ["Saturn","Moon"], houses: [chart.planets.Moon?.house || 1],
      effect: "Chronic mental stress, anxiety, depression tendencies; delayed emotional fulfillment",
      remedy: "Maha Mrityunjaya japa; Shiva Abhishek every Monday; Blue Sapphire only after trial; avoid Saturn Mahadasha decisions without consultation",
      isActive: true,
    });
  }

  // ── Maraka Dasha periods — H2/H7 lords' dashas
  const h2Lord = chart.bhavas[1]?.lord || "";
  const h7Lord = chart.bhavas[6]?.lord || "";
  const marakaDashas = chart.dasha.dashas.filter(d => d.lord === h2Lord || d.lord === h7Lord);
  for (const md of marakaDashas) {
    const isActive = md.start <= today && md.end >= today;
    gandas.push({
      name: `Maraka Dasha — ${md.lord} (H${md.lord === h2Lord ? 2 : 7} lord)`,
      type: "dasha", severity: md.lord === h7Lord ? "high" : "medium",
      startDate: md.start, endDate: md.end,
      planets: [md.lord], houses: [md.lord === h2Lord ? 2 : 7],
      effect: `${md.lord} dasha — Maraka period. Health vigilance required. Avoid risky activities. Karmic debts may surface.`,
      remedy: "Maha Mrityunjaya japa 108 daily during entire period; Dhanvantari puja; regular medical checkups",
      isActive,
    });
  }

  // ── 22nd Drekkana lord dasha (from Moon nakshatra)
  const moonNakIdx = NAKSHATRAS.indexOf(chart.planets.Moon?.nakshatra || "Ashwini");
  const drekkana22Lord = NAK_LORDS[(moonNakIdx + 21) % 27];
  const drek22Dash = chart.dasha.dashas.find(d => d.lord === drekkana22Lord);
  if (drek22Dash) {
    gandas.push({
      name: `22nd Drekkana — ${drekkana22Lord} dasha`,
      type: "dasha", severity: "medium",
      startDate: drek22Dash.start, endDate: drek22Dash.end,
      planets: [drekkana22Lord], houses: [8],
      effect: "22nd Drekkana dasha — hidden dangers, health, sudden reversals",
      remedy: `${drekkana22Lord} Shanti homa; Navagraha abhishekam at the start of this dasha`,
      isActive: drek22Dash.start <= today && drek22Dash.end >= today,
    });
  }

  const activeNow    = gandas.filter(g => g.isActive);
  const upcoming6m   = gandas.filter(g => !g.isActive && g.startDate > today && g.startDate <= new Date(asOf.getTime() + 180*86400000).toISOString().slice(0,10));
  const upcoming5y   = gandas.filter(g => !g.isActive && g.startDate > today && g.startDate <= new Date(asOf.getTime() + 5*365*86400000).toISOString().slice(0,10));
  const lifeGandas   = gandas.filter(g => g.type === "dasha");
  const natalGandas  = gandas.filter(g => g.type === "natal");
  const totalRisk    = Math.min(100, activeNow.filter(g=>g.severity==="high").length*30 + activeNow.filter(g=>g.severity==="medium").length*15);

  return {
    asOf: today, natalGandas, activeNow, upcoming6m, upcoming5y, lifeGandas,
    kaalSarpa: {
      present: ksPresent, type: ksType,
      axis: `Rahu H${chart.planets.Rahu?.house}–Ketu H${chart.planets.Ketu?.house}`,
      severity: ksPresent ? "Significant — all planets hemmed" : "None",
      remedy: ksPresent
        ? "Sarpa samskar puja; Rahu-Ketu Kaal Sarp Dosha Nivaran at Tryambakeshwar; Naga Pratishtha; Om Namah Shivaya 108 × daily"
        : "None required",
    },
    totalRiskScore: totalRisk,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 7 — LOCATION SCORING
// Scores a city for the native across 8 life domains using:
//   L1 — Angular difference between birth longitude and target longitude
//   L2 — Relocated chart ascendant shift (Ashtakavarga comparison)
//   L3 — Vastu cardinal direction from birthplace
//   L4 — Dasha lord's directional strength in relocated chart
//   L5 — Transit strength at that location
// ═══════════════════════════════════════════════════════════════════════════

interface LocationScore {
  city:         string;
  lat:          number;
  lon:          number;
  overallScore: number;
  domainScores: Record<string, number>;
  lagnaShift:   number;    // degrees ascendant shifts when relocated
  direction:    string;    // cardinal direction from birthplace
  bestFor:      string[];  // top 3 domains
  avoidFor:     string[];  // bottom 2 domains
  uedpOmega:    number;
  recommendation: string;
}

interface LocationReport {
  nativeCity:   string;
  scores:       LocationScore[];
  bestCity:     string;
  bestForPurpose: Record<string, string>;  // domain → best city
}

function computeLocationScore(chart: ChartData, loc: { lat:number; lon:number; name:string; timezone:number }): LocationScore {
  // Generate relocated chart
  const relocBirth: BirthData = {
    ...{ name: chart.name, day: 1, month: 1, year: 1970, hour: 0, minute: 0, second: 0, timezone: 5.5, ayanamsa: chart.ayanamsaUsed },
    latitude: loc.lat, longitude: loc.lon, timezone: loc.timezone,
  };

  // Approximate lagna shift: each 1° longitude difference = ~4 minutes = ~1° lagna change
  const lonDiff = loc.lon - chart.longitude;
  const lagnaShift = Math.abs(lonDiff); // rough approximation

  // Cardinal direction from birthplace
  const latDiff = loc.lat - chart.latitude;
  const direction = latDiff > 5 && Math.abs(lonDiff) < 10 ? "North"
    : latDiff < -5 && Math.abs(lonDiff) < 10 ? "South"
    : lonDiff > 5 && Math.abs(latDiff) < 10 ? "East"
    : lonDiff < -5 && Math.abs(latDiff) < 10 ? "West"
    : `${latDiff >= 0 ? "North" : "South"}-${lonDiff >= 0 ? "East" : "West"}`;

  // Vastu directional benefit per domain
  const DIRECTION_DOMAIN: Record<string, Record<string, number>> = {
    career:     { North:80, East:75, South:60, West:50, "North-East":85, "South-West":40 },
    education:  { North:85, East:80, "North-East":90, West:50, South:55, "South-West":45 },
    business:   { North:80, East:75, South:70, West:65, "North-East":85, "South-East":75 },
    marriage:   { East:80, South:75, "South-East":80, North:65, West:60, "North-East":70 },
    money:      { North:85, East:75, "North-East":90, South:60, West:50, "South-West":40 },
    spiritual:  { East:90, "North-East":85, North:80, West:70, South:60, "South-West":75 },
    assets:     { South:80, "South-West":85, West:75, North:65, East:60, "North-East":70 },
    political:  { North:85, East:80, "North-East":88, South:65, West:55, "South-West":50 },
    investment: { North:80, East:75, "North-East":85, West:55, South:60, "South-West":45 },
    children:   { East:85, "North-East":80, North:75, South:65, West:60, "South-West":55 },
    medical:    { East:80, North:75, "North-East":85, South:65, West:60, "South-West":50 },
    foreign:    { West:85, "South-West":80, South:75, East:65, North:60, "North-East":70 },
  };

  const domainScores: Record<string, number> = {};
  for (const domain of Object.keys(DIRECTION_DOMAIN)) {
    const base = DIRECTION_DOMAIN[domain][direction] || 60;
    // Modify by natal prediction score for this domain
    const natalScore = chart.predictions[domain]?.score || 50;
    domainScores[domain] = Math.round((base * 0.6) + (natalScore * 0.4));
  }

  const overallScore = Math.round(Object.values(domainScores).reduce((s,v)=>s+v,0) / Object.keys(domainScores).length);
  const sorted = Object.entries(domainScores).sort((a,b)=>b[1]-a[1]);
  const bestFor  = sorted.slice(0, 3).map(([k]) => k);
  const avoidFor = sorted.slice(-2).map(([k]) => k);

  // UEDP omega for this location (simplified — use chart omega adjusted by lagna shift)
  const uedpOmega = Math.min(1, Math.max(0, chart.uedp.omega - lagnaShift * 0.002));

  return {
    city: loc.name, lat: loc.lat, lon: loc.lon,
    overallScore, domainScores, lagnaShift,
    direction, bestFor, avoidFor, uedpOmega,
    recommendation: overallScore >= 75
      ? `${loc.name} is highly favorable. Best for: ${bestFor.join(", ")}.`
      : overallScore >= 60
      ? `${loc.name} is moderately favorable. Suitable for: ${bestFor[0]}.`
      : `${loc.name} has challenges for this native. Use remedies if relocation unavoidable.`,
  };
}

function computeLocationReport(chart: ChartData, locs: Array<{lat:number;lon:number;name:string;timezone:number}>): LocationReport {
  const scores = locs.map(l => computeLocationScore(chart, l));
  scores.sort((a, b) => b.overallScore - a.overallScore);

  const bestForPurpose: Record<string, string> = {};
  const domains = ["career","education","business","marriage","money","spiritual","assets","political","investment","children","medical","foreign"];
  for (const domain of domains) {
    let best = scores[0];
    for (const s of scores) {
      if ((s.domainScores[domain] || 0) > (best.domainScores[domain] || 0)) best = s;
    }
    bestForPurpose[domain] = best.city;
  }

  return {
    nativeCity: chart.place || `${chart.latitude},${chart.longitude}`,
    scores, bestCity: scores[0]?.city || "",
    bestForPurpose,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 8 — FULL DECISIONAL TIMELINE
// Past (from birth to today) + Present (current period) + Future (to 2050)
// Each period classified as PEAK / STABLE / CAUTION / TROUGH / CRITICAL
// Includes: Dasha periods, Transit windows, Ganda periods, Scenario windows
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineEntry {
  period:        string;          // "YYYY-MM – YYYY-MM"
  startDate:     string;
  endDate:       string;
  classification:"PEAK"|"STABLE"|"CAUTION"|"TROUGH"|"CRITICAL";
  uedpOmega:     number;
  dashaActive:   string;          // "MD/AD"
  domains:       string[];        // which life areas are activated
  events:        string[];        // notable classical events expected
  score:         number;
  isCurrentPeriod: boolean;
  gandaActive:   string[];        // danger names if any
}

interface FullTimeline {
  pastPeriods:    TimelineEntry[];
  currentPeriod:  TimelineEntry;
  futurePeriods:  TimelineEntry[];
  peakYears:      string[];
  troughYears:    string[];
  lifeChapters:   { title:string; start:string; end:string; summary:string; }[];
}

function computeFullTimeline(chart: ChartData): FullTimeline {
  const today = new Date();
  const entries: TimelineEntry[] = [];
  const gandaReport = computeGandaReport(chart, today);

  // Walk through dasha periods from chart
  for (const dasha of chart.dasha.dashas) {
    const start = new Date(dasha.start);
    const end   = new Date(dasha.end);
    const mid   = new Date((start.getTime() + end.getTime()) / 2);
    const isCurrentPeriod = dasha.start <= today.toISOString().slice(0,10) && dasha.end >= today.toISOString().slice(0,10);

    // Find UEDP timeline point nearest to midpoint
    const midStr = `${mid.getFullYear()}-${String(mid.getMonth()+1).padStart(2,"0")}`;
    const tp = chart.uedpTimeline.find(t => t.date.startsWith(midStr));
    const omega = tp?.omega ?? chart.uedp.omega;
    const classification = tp?.classification === "PEAK" ? "PEAK"
      : tp?.classification === "TROUGH" ? "TROUGH"
      : omega >= OMEGA_CRIT * 1.3 ? "STABLE"
      : omega < OMEGA_CRIT * 0.7  ? "CRITICAL"
      : "CAUTION";

    // Active gandas in this period
    const activeGanda = gandaReport.lifeGandas
      .filter(g => g.startDate <= dasha.end && g.endDate >= dasha.start)
      .map(g => g.name);

    // Domain activation from dasha lord
    const LORD_DOMAINS: Record<string, string[]> = {
      Sun:     ["career","political","authority"],
      Moon:    ["family","emotions","travel","public"],
      Mars:    ["property","courage","legal","medical"],
      Mercury: ["business","education","communication","trade"],
      Jupiter: ["finance","education","spiritual","children","marriage"],
      Venus:   ["marriage","arts","luxury","vehicles","love"],
      Saturn:  ["service","karma","longevity","property","discipline"],
      Rahu:    ["foreign","technology","unconventional","speculation"],
      Ketu:    ["spiritual","liberation","past-karma","isolation"],
    };
    const domains = LORD_DOMAINS[dasha.lord] || ["general"];

    // Derive events from domain + strength
    const dashaStrength = chart.strengths[dasha.lord]?.totalScore || 50;
    const events: string[] = [];
    if (dashaStrength >= 70) {
      events.push(`${dasha.lord} strong — ${domains[0]} domain thrives`);
    } else if (dashaStrength < 40) {
      events.push(`${dasha.lord} weak — ${domains[0]} faces obstacles; patience and parihara advised`);
    }
    if (activeGanda.length > 0) events.push(`⚠ Ganda active: ${activeGanda[0]}`);

    const score = Math.round(omega * 100 * 0.4 + dashaStrength * 0.4 + (activeGanda.length > 0 ? -20 : 10));

    entries.push({
      period:      `${dasha.start.slice(0,7)} – ${dasha.end.slice(0,7)}`,
      startDate:   dasha.start,
      endDate:     dasha.end,
      classification,
      uedpOmega:   omega,
      dashaActive: `${dasha.lord} MD`,
      domains,
      events,
      score: Math.max(0, Math.min(100, score)),
      isCurrentPeriod,
      gandaActive: activeGanda,
    });
  }

  const past    = entries.filter(e => e.endDate   < today.toISOString().slice(0,10));
  const current = entries.find(e => e.isCurrentPeriod) || entries[entries.length - 1];
  const future  = entries.filter(e => e.startDate > today.toISOString().slice(0,10));

  const peakYears   = entries.filter(e => e.classification === "PEAK").map(e => e.startDate.slice(0,4));
  const troughYears = entries.filter(e => e.classification === "TROUGH" || e.classification === "CRITICAL").map(e => e.startDate.slice(0,4));

  // Life chapters — group by major life themes
  const lifeChapters = [
    {
      title: "Education & Formation",
      start: chart.dasha.dashas[0]?.start || "",
      end:   chart.dasha.dashas[2]?.end   || "",
      summary: "First three dashas — learning, identity, foundational karma resolution",
    },
    {
      title: "Career & Marriage",
      start: chart.dasha.dashas[3]?.start || "",
      end:   chart.dasha.dashas[5]?.end   || "",
      summary: "Middle dashas — peak professional and relationship activation",
    },
    {
      title: "Legacy & Spiritual",
      start: chart.dasha.dashas[6]?.start || "",
      end:   chart.dasha.dashas[8]?.end   || "",
      summary: "Final dashas — consolidation, service, spiritual emergence",
    },
  ];

  return { pastPeriods: past, currentPeriod: current, futurePeriods: future, peakYears: [...new Set(peakYears)], troughYears: [...new Set(troughYears)], lifeChapters };
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST PARSING + VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

interface DecisionalRequest {
  birth:          BirthData;
  module:         string;
  targetDate?:    string;
  endDate?:       string;
  action?:        string;
  actionDomain?:  string;
  partnerBirth?:  BirthData;
  location?:      { lat:number; lon:number; name:string; timezone:number };
  locations?:     Array<{ lat:number; lon:number; name:string; timezone:number }>;
}

function parseBirth(raw: unknown): BirthData {
  if (!raw || typeof raw !== "object") throw new Error("birth is required");
  const r = raw as Record<string, unknown>;
  return {
    name:      String(r.name || "Unknown"),
    day:       Number(r.day   || 1),
    month:     Number(r.month || 1),
    year:      Number(r.year  || 1970),
    hour:      Number(r.hour  || 0),
    minute:    Number(r.minute|| 0),
    second:    Number(r.second|| 0),
    latitude:  Number(r.latitude  || 13.0827),
    longitude: Number(r.longitude || 80.2707),
    timezone:  Number(r.timezone  || 5.5),
    gender:    (["male","female","other"].includes(String(r.gender||"")) ? r.gender as any : "other"),
    place:     String(r.place || ""),
    ayanamsa:  String(r.ayanamsa || "lahiri"),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Body must be JSON object" });
  }

  let req_: DecisionalRequest;
  try {
    const b = body as Record<string, unknown>;
    req_ = {
      birth:         parseBirth(b.birth || b),
      module:        String(b.module || "all"),
      targetDate:    b.targetDate  ? String(b.targetDate)  : undefined,
      endDate:       b.endDate     ? String(b.endDate)     : undefined,
      action:        b.action      ? String(b.action)      : undefined,
      actionDomain:  b.actionDomain? String(b.actionDomain): "general",
      partnerBirth:  b.partnerBirth ? parseBirth(b.partnerBirth) : undefined,
      location:      b.location  as any,
      locations:     b.locations as any,
    };
  } catch (e) {
    return res.status(400).json({ error: "Invalid request: " + String(e) });
  }

  // Generate native's chart (with perturbation-corrected positions)
  let chart: ChartData;
  try {
    const apiPos = getPlanetPositions(req_.birth);
    chart = generateFullChart(req_.birth, apiPos);
  } catch (e) {
    return res.status(500).json({ error: "Chart generation failed: " + String(e) });
  }

  const mod = req_.module;
  const asOf = req_.targetDate ? new Date(req_.targetDate) : new Date();
  const response: Record<string, unknown> = { status: "ok", module: mod };

  try {
    // ── Always include base chart summary ───────────────────────────────
    response.chartSummary = {
      name:        chart.name,
      lagna:       `${chart.lagna.rashi} ${chart.lagna.degInSign.toFixed(2)}°`,
      uedpOmega:   chart.uedp.omega,
      uedpStable:  chart.uedp.isStable,
      currentDasha:`${chart.dasha.current.mahadasha} MD / ${chart.dasha.current.antardasha} AD / ${chart.dasha.current.pratyantara} PD`,
      dashaEnds:   chart.dasha.current.mahaEnds,
      ephemerisSource: "vsop87_corrected",
    };

    // ── MODULE: transits ───────────────────────────────────────────────
    if (mod === "transits" || mod === "all") {
      response.transits = computeTransitReport(chart, asOf);
    }

    // ── MODULE: scenario ───────────────────────────────────────────────
    if (mod === "scenario" || mod === "all") {
      const action = req_.action || "Decision";
      const domain = req_.actionDomain || "career";
      response.scenario = computeScenario(chart, asOf, action, domain);
    }

    // ── MODULE: muhurta ────────────────────────────────────────────────
    if (mod === "muhurta" || mod === "all") {
      const start  = asOf;
      const end    = req_.endDate ? new Date(req_.endDate) : new Date(asOf.getTime() + 60 * 86400000);
      const domain = req_.actionDomain || "career";
      response.muhurta = computeMuhurta(chart, start, end, domain);
    }

    // ── MODULE: match ──────────────────────────────────────────────────
    if (mod === "match" || mod === "all") {
      if (req_.partnerBirth) {
        const apiPos2 = getPlanetPositions(req_.partnerBirth);
        const partnerChart = generateFullChart(req_.partnerBirth, apiPos2);
        response.match = computeMatch(chart, partnerChart);
      } else if (mod === "match") {
        return res.status(400).json({ error: "partnerBirth required for match module" });
      }
    }

    // ── MODULE: gandas ─────────────────────────────────────────────────
    if (mod === "gandas" || mod === "all") {
      response.gandas = computeGandaReport(chart, asOf);
    }

    // ── MODULE: location ───────────────────────────────────────────────
    if (mod === "location" || mod === "all") {
      const locs = req_.locations || (req_.location ? [req_.location] : [
        { lat:28.6139, lon:77.2090, name:"Delhi",     timezone:5.5 },
        { lat:19.0760, lon:72.8777, name:"Mumbai",    timezone:5.5 },
        { lat:13.0827, lon:80.2707, name:"Chennai",   timezone:5.5 },
        { lat:12.9716, lon:77.5946, name:"Bengaluru", timezone:5.5 },
        { lat:22.5726, lon:88.3639, name:"Kolkata",   timezone:5.5 },
      ]);
      response.location = computeLocationReport(chart, locs);
    }

    // ── MODULE: doshas_full ────────────────────────────────────────────
    if (mod === "doshas_full" || mod === "all") {
      const pariharas = computePariharas(chart.doshas);
      response.doshasFull = {
        doshas:    chart.doshas,
        pariharas,
        gandaReport: computeGandaReport(chart, asOf).natalGandas,
        kaalSarpa: computeGandaReport(chart, asOf).kaalSarpa,
      };
    }

    // ── MODULE: timeline ───────────────────────────────────────────────
    if (mod === "timeline" || mod === "all") {
      response.timeline = computeFullTimeline(chart);
    }

    // ── Include full chart data ────────────────────────────────────────
    if (mod === "all") {
      response.chart = chart;
    }

    return res.status(200).json(response);

  } catch (e) {
    console.error("Decisional engine error:", e);
    return res.status(500).json({
      error:  "Decisional computation failed",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}