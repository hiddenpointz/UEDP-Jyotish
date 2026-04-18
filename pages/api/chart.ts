/**
 * pages/api/chart.ts — UEDP v5 Chart API Route
 * G S Ramesh Kumar — Universal Emergence Dynamics Protocol v5
 *
 * Handles POST /api/chart
 *   Body: { birth: BirthData, style?: ChartStyle }
 *   Returns: { chart, projection, debug }
 *
 * Root cause of previous crash:
 *   "Cannot read properties of undefined (reading 'ayanamsa')"
 *   → req.body.birth was undefined because:
 *     a) body was not parsed (missing Content-Type or bodyParser config)
 *     b) birth fields were missing / wrong types
 *     c) no validation before passing to generateFullChart()
 *
 * This file fixes all of that:
 *   ✓ Validates req.method
 *   ✓ Validates req.body exists and is an object
 *   ✓ Validates and coerces every BirthData field with safe defaults
 *   ✓ Wraps generateFullChart in try/catch with descriptive errors
 *   ✓ Never lets undefined reach the engine
 */

import type { NextApiRequest, NextApiResponse } from "next";
import type { BirthData, ChartData, PlanetData } from "../../lib/uedpEngine";
import { generateFullChart, RASHIS, RASHI_EN, GLYPH } from "../../lib/uedpEngine";

// ═══════════════════════════════════════════════════════════════════════════
// CHART PROJECTION LAYER — inlined from lib/chartProjection.ts
// G S Ramesh Kumar — UEDP v5
// Transforms ChartData → South / North / East Indian chart cell arrays.
// No astrology recomputation — all values read from engine output as-is.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * chartProjection.ts — UEDP v5 Chart Projection Layer
 * G S Ramesh Kumar — Universal Emergence Dynamics Protocol v5
 *
 * ─────────────────────────────────────────────────────────────────
 * PURPOSE
 *   Transforms the frozen ChartData from uedpEngine.ts into the
 *   three classical Indian chart display formats:
 *     • South Indian  — fixed-sign grid, 4×4, lagna marked
 *     • North Indian  — rotating-house diamond, lagna at top
 *     • East Indian   — rashi grid + nakshatra band + bhava overlay
 *
 * CRITICAL RULES (enforced by this file's design)
 *   1. NO astrology recomputation here. Every planet position,
 *      house number, dignity, and degree comes from ChartData as-is.
 *   2. Ascendant is the ONLY anchor. All cell/house positioning is
 *      derived from chart.lagna.rashi (never recalculated).
 *   3. Projection functions are pure transforms:
 *      input = ChartData  →  output = render-ready cell arrays.
 *   4. Debug trace is built-in: every planet carries a PlanetTrace
 *      showing exactly how its cell assignment was derived.
 *
 * MENTAL MODEL
 *   uedpEngine.ts = GPS coordinates (truth, frozen)
 *        ↓
 *   chartProjection.ts = map style (South / North / East)
 *        ↓
 *   uedpInterpreter / buildPredictions = meaning of location
 *        ↓
 *   UI components = display
 * ─────────────────────────────────────────────────────────────────
 */
// getChartAnchor — returns the lagna index from ChartData.

// ═══════════════════════════════════════════
// TYPES — Projection layer
// ═══════════════════════════════════════════

export type ChartStyle = "south" | "north" | "east";

/**
 * One planet's assignment to a cell in a chart grid.
 * Carries full trace so any shift can be diagnosed step by step.
 */
export interface PlanetTrace {
  planet: string;
  symbol: string;
  // Step 1 — raw engine output (never changes)
  longitude:  number;         // absolute sidereal longitude from engine
  rashiName:  string;         // Sanskrit rashi from engine
  house:      number;         // house 1-12 from engine (frozen)
  dignity:    string;
  retrograde: boolean;
  degInSign:  number;
  // Step 2 — which grid cell this planet is placed in
  cellIndex:  number;         // 0-based index into the cell array for this chart style
  cellLabel:  string;         // human-readable: "H2", "Mesha", "Cell 4", etc.
  // Step 3 — projection method used (traceability)
  projectionRule: string;     // e.g. "South: fixed rashi index = 2"
}

/**
 * One cell in any chart grid.
 * In South: a rashi (sign). In North: a house. In East: a bhava band.
 */
export interface ChartCell {
  cellIndex: number;
  // South Indian: the rashi fixed to this cell
  rashiName?:    string;
  rashiNameEn?:  string;
  rashiIndex?:   number;   // 0-11
  // North Indian: the house number rotating in this cell
  houseNumber?:  number;   // 1-12
  // East Indian: both rashi and nakshatra band
  nakshatraName?:string;
  nakshatraLord?:string;
  // Common
  isAscendant:   boolean;  // lagna cell
  planets:       PlanetTrace[];
  uedpScore?:    number;   // Layer 2 — UEDP Ω for this cell's rashi (read-only from engine)
}

/** Complete projection ready for UI rendering */
export interface ChartProjection {
  style:        ChartStyle;
  anchorRashi:  string;    // always chart.lagna.rashi — the single anchor
  anchorIndex:  number;    // 0-11 index of lagna in RASHIS[]
  ascendantDeg: number;    // chart.lagna.degInSign
  cells:        ChartCell[];
  planetTraces: PlanetTrace[];
  // Diagnostics
  debugSummary: string;
}

// ═══════════════════════════════════════════
// ANCHOR — single source of truth
// ═══════════════════════════════════════════

/**
 * This is the ONLY function allowed to determine cell rotation.
 * All three projection functions call this, nothing else.
 */
export function getChartAnchor(chart: ChartData): {
  rashiName:    string;
  rashiIndex:   number;
  degInSign:    number;
  rashiLord:    string;
} {
  const rashiName  = chart.lagna.rashi;
  const rashiIndex = RASHIS.indexOf(rashiName);
  return {
    rashiName,
    rashiIndex: rashiIndex >= 0 ? rashiIndex : 0,
    degInSign:  chart.lagna.degInSign,
    rashiLord:  chart.lagna.rashiLord,
  };
}

// ═══════════════════════════════════════════
// PLANET TRACE BUILDER
// Extracts engine output into PlanetTrace without any recomputation
// ═══════════════════════════════════════════

function buildTrace(
  pname: string,
  p: PlanetData,
  cellIndex: number,
  cellLabel: string,
  projectionRule: string,
): PlanetTrace {
  return {
    planet:    pname,
    symbol:    GLYPH[pname] || pname.slice(0, 2),
    // Step 1 — direct from engine (read-only)
    longitude:  p.degree,
    rashiName:  p.rashi,
    house:      p.house,
    dignity:    p.dignity,
    retrograde: p.retrograde,
    degInSign:  p.degInSign,
    // Step 2 — cell assignment by projection
    cellIndex,
    cellLabel,
    // Step 3 — rule used
    projectionRule,
  };
}

// ═══════════════════════════════════════════
// SOUTH INDIAN CHART PROJECTION
//
// Rules (Surya Siddhanta + traditional South Indian format):
//   • 4×4 grid = 16 cells; centre 4 are blank (title area)
//   • Signs (rashis) are FIXED to cells — Mesha always top-right group
//   • Lagna cell is determined by which fixed cell holds chart.lagna.rashi
//   • Planets are placed into cells by their RASHI (not house number)
//   • House numbers rotate: H1 = lagna cell, H2 = next anticlockwise, etc.
//
// South Indian fixed cell → rashi mapping (traditional order):
//   Row 0: Meena(0) Mesha(1) Vrishabha(2) Mithuna(3)
//   Row 1: Kumbha(4)  [C]      [C]        Karka(7)
//   Row 2: Makara(8)  [C]      [C]        Simha(11)
//   Row 3: Dhanu(12) Vrishchika(13) Tula(14) Kanya(15) ← visual indices
//
// In RASHIS[] order: Mesha=0…Meena=11
// Cell positions for each rashi index:
//   Mesha=1, Vrishabha=2, Mithuna=3, Karka=7, Simha=11, Kanya=15,
//   Tula=14, Vrishchika=13, Dhanu=12, Makara=8, Kumbha=4, Meena=0
// ═══════════════════════════════════════════

// Maps RASHIS index (0=Mesha…11=Meena) → South Indian 4×4 cell position (0-based, 0=top-left)
const SOUTH_RASHI_TO_CELL: Record<number, number> = {
  0:  1,  // Mesha      → row0 col1
  1:  2,  // Vrishabha  → row0 col2
  2:  3,  // Mithuna    → row0 col3
  3:  7,  // Karka      → row1 col3
  4:  11, // Simha      → row2 col3
  5:  15, // Kanya      → row3 col3
  6:  14, // Tula       → row3 col2
  7:  13, // Vrishchika → row3 col1
  8:  12, // Dhanu      → row3 col0
  9:  8,  // Makara     → row2 col0
  10: 4,  // Kumbha     → row1 col0
  11: 0,  // Meena      → row0 col0
};

// Reverse map: cell position → rashi index
const SOUTH_CELL_TO_RASHI: Record<number, number> = {};
for (const [ri, ci] of Object.entries(SOUTH_RASHI_TO_CELL)) {
  SOUTH_CELL_TO_RASHI[ci] = Number(ri);
}

// Which of the 16 cells are blank (centre 4)
const SOUTH_BLANK_CELLS = new Set([5, 6, 9, 10]);

export function projectSouthIndian(chart: ChartData): ChartProjection {
  const anchor = getChartAnchor(chart);

  // Build 16 cells (12 rashi + 4 blank centre)
  const cells: ChartCell[] = Array.from({ length: 16 }, (_, ci) => {
    const ri = SOUTH_CELL_TO_RASHI[ci];
    const isBlank = SOUTH_BLANK_CELLS.has(ci);
    if (isBlank) {
      return { cellIndex: ci, isAscendant: false, planets: [] };
    }
    const rName  = RASHIS[ri];
    const rNameEn = RASHI_EN[ri] || rName;
    const isAsc  = ri === anchor.rashiIndex;
    return {
      cellIndex:   ci,
      rashiName:   rName,
      rashiNameEn: rNameEn,
      rashiIndex:  ri,
      // house number = how far this rashi is from lagna rashi (anticlockwise)
      houseNumber: ((ri - anchor.rashiIndex + 12) % 12) + 1,
      isAscendant: isAsc,
      planets:     [],
    };
  });

  // Place planets — by their rashi (read from engine, no recomputation)
  const traces: PlanetTrace[] = [];
  for (const [pname, p] of Object.entries(chart.planets)) {
    const ri  = RASHIS.indexOf(p.rashi);
    const ci  = ri >= 0 ? SOUTH_RASHI_TO_CELL[ri] : 1;
    const cell = cells[ci];
    const trace = buildTrace(
      pname, p, ci,
      `${p.rashi} → cell ${ci}`,
      `South: planet rashi ${p.rashi} (index ${ri}) → fixed cell ${ci}`,
    );
    traces.push(trace);
    if (cell) cell.planets.push(trace);
  }

  // Attach UEDP scores to cells (read-only from engine — Layer 2)
  attachUEDPScores(cells, chart, "rashi");

  const debugSummary = buildDebugSummary("south", anchor, traces);
  return { style:"south", anchorRashi:anchor.rashiName, anchorIndex:anchor.rashiIndex,
           ascendantDeg:anchor.degInSign, cells, planetTraces:traces, debugSummary };
}

// ═══════════════════════════════════════════
// NORTH INDIAN CHART PROJECTION
//
// Rules (traditional North Indian diamond format):
//   • 12 triangular sections arranged as a diamond
//   • H1 (Lagna) is ALWAYS at the top-centre
//   • Houses rotate clockwise from lagna
//   • Rashi names rotate: lagna rashi in H1, next in H2, etc.
//   • Display order of 12 cells (diamond positions, clockwise from top):
//     0=H1(top), 1=H2(top-right), 2=H3(right), 3=H4(bottom-right),
//     4=H5(bottom), 5=H6(bottom-left), 6=H7(left), 7=H8(top-left),
//     8=H9(inner-top-right), 9=H10(inner-top-left),
//     10=H11(inner-bottom-left), 11=H12(inner-bottom-right)
//     Note: exact visual arrangement varies by regional tradition;
//     we use the most common 12-cell clockwise labelling.
//
// Planets are placed by their HOUSE NUMBER from the engine (frozen).
// ═══════════════════════════════════════════

export function projectNorthIndian(chart: ChartData): ChartProjection {
  const anchor = getChartAnchor(chart);

  // Build 12 cells — H1 to H12, each offset from lagna
  const cells: ChartCell[] = Array.from({ length: 12 }, (_, i) => {
    const houseNum   = i + 1; // H1…H12
    const rashiIndex = (anchor.rashiIndex + i) % 12;
    const rName      = RASHIS[rashiIndex];
    const rNameEn    = RASHI_EN[rashiIndex] || rName;
    return {
      cellIndex:   i,
      rashiName:   rName,
      rashiNameEn: rNameEn,
      rashiIndex,
      houseNumber: houseNum,
      isAscendant: houseNum === 1,
      planets:     [],
    };
  });

  // Place planets by house number from engine (read-only — no recalculation)
  const traces: PlanetTrace[] = [];
  for (const [pname, p] of Object.entries(chart.planets)) {
    const houseNum = p.house; // from engine — frozen
    const ci = houseNum - 1; // cell index 0-based
    const cell = cells[ci];
    const trace = buildTrace(
      pname, p, ci,
      `H${houseNum}`,
      `North: planet.house=${houseNum} from engine → cell ${ci} (H${houseNum})`,
    );
    traces.push(trace);
    if (cell) cell.planets.push(trace);
  }

  attachUEDPScores(cells, chart, "house");

  const debugSummary = buildDebugSummary("north", anchor, traces);
  return { style:"north", anchorRashi:anchor.rashiName, anchorIndex:anchor.rashiIndex,
           ascendantDeg:anchor.degInSign, cells, planetTraces:traces, debugSummary };
}

// ═══════════════════════════════════════════
// EAST INDIAN CHART PROJECTION
//
// Rules (Bengal / Orissa tradition):
//   • Rashi grid: 3×4 rectangular layout (not square like South)
//   • Nakshatra band: Moon nakshatra highlighted within cell
//   • Bhava overlay: house cusp degree shown in corner
//   • Lagna cell: marked with triangle or "La" indicator
//   • Planets placed by rashi (same as South Indian)
//
// Structured format (not vague nakshatraOverlay:true):
//   rashiGrid   — which rashi cell each planet is in
//   nakshatraBand — the nakshatra within that cell (engine data)
//   bhavaOverlay  — the house cusp degree for that cell
//
// Cell layout (3 rows × 4 cols, left to right, top to bottom):
//   Row 0: Mesha   Vrishabha  Mithuna  Karka
//   Row 1: Meena   [lagna]            Simha    ← lagna floats
//   Row 2: Kumbha  Makara     Dhanu    Vrishchika  Tula  Kanya
//   (simplified — actual East Indian is 4 rows of 3)
//
// We use a 4×3 grid (12 cells) in standard East Indian cell order:
//   Cell 0=Mesha, 1=Vrishabha, 2=Mithuna,
//   Cell 3=Karka,  4=Simha,    5=Kanya,
//   Cell 6=Tula,   7=Vrishchika,8=Dhanu,
//   Cell 9=Makara, 10=Kumbha,  11=Meena
// ═══════════════════════════════════════════

// East Indian cell order (rashi index 0-11 → cell position)
// Identical to rashi order: Mesha=0 → cell 0, Vrishabha=1 → cell 1, etc.
// (East Indian uses sequential rashi ordering, unlike South's fixed positions)

export function projectEastIndian(chart: ChartData): ChartProjection {
  const anchor = getChartAnchor(chart);

  // Moon nakshatra from engine — for nakshatra band
  const moonPlanet = chart.planets.Moon;
  const moonNakshatra = moonPlanet?.nakshatra || "";
  const moonNakshatraLord = moonPlanet?.nakshatraLord || "";

  // Build 12 cells in sequential rashi order
  const cells: ChartCell[] = Array.from({ length: 12 }, (_, ri) => {
    const rName   = RASHIS[ri];
    const rNameEn = RASHI_EN[ri] || rName;
    const isAsc   = ri === anchor.rashiIndex;

    // Bhava overlay: house cusp degree = lagna degree + (ri - lagnaIdx)*30
    // This is display-only, not used for house assignment
    const bhavaCuspDeg = (anchor.degInSign + ((ri - anchor.rashiIndex + 12) % 12) * 30) % 360;

    // Nakshatra band: highlight if Moon's nakshatra falls in this rashi
    // Each rashi spans 30°; 9 nakshatras are partially/fully in each rashi
    // We mark the cell where Moon is placed (Moon's rashi = moon planet rashi)
    const isMoonCell = moonPlanet?.rashi === rName;

    return {
      cellIndex:     ri,
      rashiName:     rName,
      rashiNameEn:   rNameEn,
      rashiIndex:    ri,
      houseNumber:   ((ri - anchor.rashiIndex + 12) % 12) + 1,
      isAscendant:   isAsc,
      // Nakshatra band — only populated in moon's rashi cell
      nakshatraName: isMoonCell ? moonNakshatra : undefined,
      nakshatraLord: isMoonCell ? moonNakshatraLord : undefined,
      planets:       [],
      // Bhava overlay stored as uedpScore slot — visual only, NOT house reassignment
      uedpScore:     Math.round(bhavaCuspDeg * 100) / 100,
    };
  });

  // Place planets by rashi (same rule as South — pure rashi placement)
  const traces: PlanetTrace[] = [];
  for (const [pname, p] of Object.entries(chart.planets)) {
    const ri  = RASHIS.indexOf(p.rashi);
    const ci  = ri >= 0 ? ri : 0; // East Indian: cell index = rashi index
    const cell = cells[ci];
    const trace = buildTrace(
      pname, p, ci,
      `${p.rashi} (H${p.house})`,
      `East: planet rashi ${p.rashi} (index ${ri}) → cell ${ci}; house=${p.house} from engine (display only)`,
    );
    traces.push(trace);
    if (cell) cell.planets.push(trace);
  }

  attachUEDPScores(cells, chart, "rashi");

  const debugSummary = buildDebugSummary("east", anchor, traces);
  return { style:"east", anchorRashi:anchor.rashiName, anchorIndex:anchor.rashiIndex,
           ascendantDeg:anchor.degInSign, cells, planetTraces:traces, debugSummary };
}

// ═══════════════════════════════════════════
// UEDP SCORE ATTACHMENT (Layer 2 read-only)
// Attaches uedp.domainOmega to cells for display
// Does NOT change any cell's rashi, house, or planet assignment
// ═══════════════════════════════════════════

function attachUEDPScores(
  cells: ChartCell[],
  chart: ChartData,
  mode: "rashi" | "house",
): void {
  // uedp.domainOmega gives per-domain scores; we map them to cells
  // by the house signification of each cell
  const domainHouseMap: Record<number, string> = {
    1:"health", 2:"wealth", 5:"children", 7:"marriage",
    9:"spiritual", 10:"career", 11:"wealth", 12:"spiritual",
  };
  for (const cell of cells) {
    const h = cell.houseNumber || 1;
    const domKey = domainHouseMap[h];
    if (domKey && cell.uedpScore === undefined) {
      // UEDPCore does not have domainOmega — use chart.uedp.omega safely
      cell.uedpScore = chart.uedp?.omega ?? 0;
    }
  }
         
}

// ═══════════════════════════════════════════
// DEBUG TRACE SYSTEM
// "Single source debug system" — shows exactly how each planet
// moves from engine output to final cell
// ═══════════════════════════════════════════

export interface PlanetDebugEntry {
  planet:    string;
  step1_engine: {
    longitude:  number;
    rashi:      string;
    house:      number;
    degInSign:  number;
    dignity:    string;
    retrograde: boolean;
  };
  step2_cellAssignment: {
    cellIndex:  number;
    cellLabel:  string;
  };
  step3_projectionRule: string;
  step4_display: {
    symbol:    string;
    label:     string;  // e.g. "♀ 12°47′ R" for Venus retrograde at 12°47′
    colorHint: string;  // dignity-based color hint for UI
  };
  consistent: boolean; // true if house from engine matches cell's house
  warning?:   string;  // set if any inconsistency detected
}

export interface ChartDebugReport {
  style:       ChartStyle;
  anchorRashi: string;
  anchorIndex: number;
  ascendantDeg:number;
  planets:     PlanetDebugEntry[];
  warnings:    string[];
  allConsistent: boolean;
}

const DIGNITY_COLORS: Record<string, string> = {
  exalted:      "#f5c842",
  moolatrikona: "#e0a030",
  own:          "#d4a017",
  friend:       "#90c060",
  neutral:      "#c8a878",
  enemy:        "#e08030",
  debilitated:  "#e05050",
};

/**
 * buildDebugReport — generates a full step-by-step trace for every planet.
 * Call this when Venus (or any planet) appears in an unexpected cell.
 * The four steps map exactly to the mental model GPS → Map → Meaning → Display.
 */
export function buildDebugReport(
  projection: ChartProjection,
  chart: ChartData,
): ChartDebugReport {
  const warnings: string[] = [];
  const planets: PlanetDebugEntry[] = [];

  for (const trace of projection.planetTraces) {
    const enginePlanet = chart.planets[trace.planet];
    if (!enginePlanet) continue;

    // Step 4 display label
    const deg  = Math.floor(trace.degInSign);
    const min  = Math.round((trace.degInSign - deg) * 60);
    const label = `${trace.symbol} ${deg}\xb0${String(min).padStart(2,"0")}\u2032${trace.retrograde?" \u211e":""}`;

    // Consistency check: does the cell's house match engine's house?
    const cell = projection.cells[trace.cellIndex];
    const cellHouse = cell?.houseNumber;
    const engineHouse = trace.house;
    const consistent = cellHouse === undefined || cellHouse === engineHouse;

    let warning: string | undefined;
    if (!consistent) {
      warning = `HOUSE MISMATCH: engine says H${engineHouse}, cell shows H${cellHouse}. This should never happen — check projection logic.`;
      warnings.push(`${trace.planet}: ${warning}`);
    }

    planets.push({
      planet: trace.planet,
      step1_engine: {
        longitude:  trace.longitude,
        rashi:      trace.rashiName,
        house:      trace.house,
        degInSign:  trace.degInSign,
        dignity:    trace.dignity,
        retrograde: trace.retrograde,
      },
      step2_cellAssignment: {
        cellIndex: trace.cellIndex,
        cellLabel: trace.cellLabel,
      },
      step3_projectionRule: trace.projectionRule,
      step4_display: {
        symbol:    trace.symbol,
        label,
        colorHint: DIGNITY_COLORS[trace.dignity] || DIGNITY_COLORS.neutral,
      },
      consistent,
      warning,
    });
  }

  return {
    style:        projection.style,
    anchorRashi:  projection.anchorRashi,
    anchorIndex:  projection.anchorIndex,
    ascendantDeg: projection.ascendantDeg,
    planets,
    warnings,
    allConsistent: warnings.length === 0,
  };
}

/** Compact debug summary string embedded in ChartProjection.debugSummary */
export function buildDebugSummary(
  style: ChartStyle,
  anchor: {rashiName:string;rashiIndex:number;degInSign:number},
  traces: PlanetTrace[],
): string {
  const lines = [
    `[${style.toUpperCase()}] Anchor: ${anchor.rashiName} (idx=${anchor.rashiIndex}) @ ${anchor.degInSign.toFixed(2)}\xb0`,
    ...traces.map(t =>
      `  ${t.planet.padEnd(8)} lon=${t.longitude.toFixed(4)}\xb0 rashi=${t.rashiName} H${t.house} \u2192 cell${t.cellIndex}(${t.cellLabel}) [${t.projectionRule}]`
    ),
  ];
  return lines.join("\n");
}

// ═══════════════════════════════════════════
// MAIN PROJECTION DISPATCHER
// ═══════════════════════════════════════════

/**
 * projectChart — single entry point for all chart styles.
 * Call this from your UI components instead of calling the
 * individual functions directly.
 *
 * Example:
 *   // const chart = generateFullChart(birth); // done in pages/api/chart.ts
 *   const southChart = projectChart(chart, "south");
 *   const debugReport = buildDebugReport(southChart, chart);
 */
export function projectChart(chart: ChartData, style: ChartStyle): ChartProjection {
  switch (style) {
    case "south": return projectSouthIndian(chart);
    case "north": return projectNorthIndian(chart);
    case "east":  return projectEastIndian(chart);
    default:      return projectSouthIndian(chart);
  }
}

/**
 * projectAllStyles — returns all three projections at once.
 * Useful for a tabbed chart view where all three are pre-computed.
 * All three share the same frozen ChartData — no recomputation.
 */
export function projectAllStyles(chart: ChartData): Record<ChartStyle, ChartProjection> {
  return {
    south: projectSouthIndian(chart),
    north: projectNorthIndian(chart),
    east:  projectEastIndian(chart),
  };
}

// ═══════════════════════════════════════════
// CONVENIENCE HELPERS for UI components
// ═══════════════════════════════════════════

/**
 * getPlanetsInCell — returns all planets for a given cell index.
 * Use in chart grid rendering to avoid filtering in the UI.
 */
export function getPlanetsInCell(projection: ChartProjection, cellIndex: number): PlanetTrace[] {
  return projection.cells[cellIndex]?.planets ?? [];
}

/**
 * getLagnaCell — returns the cell that contains the ascendant.
 * This will always exist and always be the same cell across all renders
 * because it is derived from chart.lagna.rashi, which is frozen.
 */
export function getLagnaCell(projection: ChartProjection): ChartCell | undefined {
  return projection.cells.find(c => c.isAscendant);
}

/**
 * formatPlanetLabel — produces a display string for a planet in a cell.
 * Example output: "♀ 12°47′ R" (Venus at 12°47′, retrograde)
 */
export function formatPlanetLabel(trace: PlanetTrace, verbose = false): string {
  const deg = Math.floor(trace.degInSign);
  const min = Math.round((trace.degInSign - deg) * 60);
  const retroStr = trace.retrograde ? " \u211e" : "";
  if (verbose) {
    return `${trace.symbol} ${trace.planet} ${deg}\xb0${String(min).padStart(2,"0")}\u2032${retroStr} (${trace.dignity})`;
  }
  return `${trace.symbol} ${deg}\xb0${String(min).padStart(2,"0")}\u2032${retroStr}`;
}

/**
 * dignityColor — returns a CSS color string for a planet's dignity.
 * Same palette as the debug report.
 */
export function dignityColor(dignity: string): string {
  return DIGNITY_COLORS[dignity] || DIGNITY_COLORS.neutral;
}

/**
 * isBlankCell — returns true if the cell is a centre blank (South Indian only).
 */
export function isBlankCell(projection: ChartProjection, cellIndex: number): boolean {
  if (projection.style !== "south") return false;
  return SOUTH_BLANK_CELLS.has(cellIndex);
}

// ═══════════════════════════════════════════════════════════════════════════
// API HANDLER — POST /api/chart
// ═══════════════════════════════════════════════════════════════════════════

// ─── Response shapes ────────────────────────────────────────────────────────

// Frontend accesses chart fields directly on the response (setChart(data))
// so we spread ChartData at top level and attach projection/debug as extras.
type SuccessResponse = ChartData & {
  projection: ChartProjection;
  debug:      ChartDebugReport;
};

interface ErrorResponse {
  error:   string;
  detail?: string;
}

// ─── Input validation ────────────────────────────────────────────────────────

/**
 * Validates and coerces the raw body.birth into a safe BirthData object.
 * Every field has a safe default so generateFullChart() can NEVER receive
 * undefined/NaN — which was the direct cause of the Vercel crash.
 */
function parseBirthData(raw: unknown): { data: BirthData; warnings: string[] } {
  const warnings: string[] = [];

  if (!raw || typeof raw !== "object") {
    // Body might be empty; parseBirthData will use safe defaults for all fields
    return { data: {
      name: "Unknown", day: 1, month: 1, year: 1970,
      hour: 0, minute: 0, second: 0,
      latitude: 13.0827, longitude: 80.2707, timezone: 5.5,
      gender: "other" as const, place: "", ayanamsa: "lahiri",
    }, warnings: ["Empty body received — using all defaults"] };
  }

  const r = raw as Record<string, unknown>;

  // Helper: coerce to number, falling back to a default; logs a warning if used
  const num = (key: string, fallback: number, min?: number, max?: number): number => {
    const v = Number(r[key]);
    if (r[key] === undefined || r[key] === null || r[key] === "" || isNaN(v)) {
      warnings.push(`birth.${key} missing or invalid — using default ${fallback}`);
      return fallback;
    }
    if (min !== undefined && v < min) {
      warnings.push(`birth.${key}=${v} below minimum ${min} — clamped`);
      return min;
    }
    if (max !== undefined && v > max) {
      warnings.push(`birth.${key}=${v} above maximum ${max} — clamped`);
      return max;
    }
    return v;
  };

  const str = (key: string, fallback: string): string => {
    if (r[key] === undefined || r[key] === null || r[key] === "") {
      return fallback;
    }
    return String(r[key]);
  };

  const data: BirthData = {
    name:      str("name", "Unknown"),
    day:       num("day",       1,   1,  31),
    month:     num("month",     1,   1,  12),
    year:      num("year",   1970, 1900, 2100),
    hour:      num("hour",      0,   0,  23),
    minute:    num("minute",    0,   0,  59),
    second:    num("second",    0,   0,  59),
    latitude:  num("latitude",  13.0827, -90,   90),
    longitude: num("longitude", 80.2707, -180, 180),
    timezone:  num("timezone",  5.5,     -12,   14),
    gender:    (["male", "female", "other"].includes(String(r["gender"] ?? ""))
                  ? r["gender"] as "male" | "female" | "other"
                  : "other"),
    place:     str("place", ""),
    ayanamsa:  str("ayanamsa", "lahiri"),
  };

  return { data, warnings };
}

function parseStyle(raw: unknown): ChartStyle {
  if (raw === "north" || raw === "east") return raw;
  return "south"; // safe default
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
) {
  // ── 1. Method guard ────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // ── 2. Body guard ─────────────────────────────────────────────────────────
  // Next.js built-in bodyParser handles JSON automatically for API routes.
  // If body is still a string (e.g. raw mode), attempt to parse it.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error:  "Invalid JSON in request body.",
        detail: "Ensure Content-Type: application/json header is set.",
      });
    }
  }

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      error:  "Request body is empty or not an object.",
      detail: "POST a JSON body: { birth: { name, day, month, year, hour, minute, second, latitude, longitude, timezone } }",
    });
  }

  // ── 3. Parse + validate birth ─────────────────────────────────────────────
  let birthData: BirthData;
  let inputWarnings: string[] = [];

  // Frontend sends birth directly as the body (not wrapped in {birth:...})
  // Also support wrapped format {birth:..., style:...} for API clients
  const bodyObj = body as Record<string, unknown>;
  const birthRaw = (bodyObj.birth && typeof bodyObj.birth === "object")
    ? bodyObj.birth          // wrapped: { birth: {...}, style: "south" }
    : body;                  // direct:  { name, day, month, ... }

  try {
    const parsed = parseBirthData(birthRaw);
    birthData     = parsed.data;
    inputWarnings = parsed.warnings;
  } catch (validationErr) {
    return res.status(400).json({
      error:  "Invalid birth data.",
      detail: validationErr instanceof Error ? validationErr.message : String(validationErr),
    });
  }

  const style = parseStyle(bodyObj.style);

  // ── 4. Generate chart ─────────────────────────────────────────────────────
  let chart: ChartData;
  try {
    chart = generateFullChart(birthData);
  } catch (engineErr) {
    console.error("API /api/chart — generateFullChart error:", engineErr);
    return res.status(500).json({
      error:  "Chart computation failed.",
      detail: engineErr instanceof Error ? engineErr.message : String(engineErr),
    });
  }

  // Sanity-check the engine output before projecting
  if (!chart || !chart.lagna || !chart.planets) {
    console.error("API /api/chart — generateFullChart returned incomplete data", chart);
    return res.status(500).json({
      error:  "Chart engine returned incomplete data.",
      detail: "lagna or planets missing from chart output.",
    });
  }

  // ── 5. Project chart ──────────────────────────────────────────────────────
  let projection: ChartProjection;
  try {
    projection = projectChart(chart, style);
  } catch (projErr) {
    console.error("API /api/chart — projectChart error:", projErr);
    return res.status(500).json({
      error:  "Chart projection failed.",
      detail: projErr instanceof Error ? projErr.message : String(projErr),
    });
  }

  // ── 6. Debug report ───────────────────────────────────────────────────────
  let debug: ChartDebugReport;
  try {
    debug = buildDebugReport(projection, chart);
  } catch (debugErr) {
    // Debug failure is non-fatal — return chart + projection without it
    console.warn("API /api/chart — buildDebugReport error (non-fatal):", debugErr);
    debug = {
      style,
      anchorRashi:   chart.lagna.rashi,
      anchorIndex:   0,
      ascendantDeg:  chart.lagna.degInSign,
      planets:       [],
      warnings:      ["Debug report generation failed — chart data is valid."],
      allConsistent: false,
    };
  }

  // ── 7. Return ─────────────────────────────────────────────────────────────
  if (inputWarnings.length > 0) {
    console.warn("API /api/chart — input warnings:", inputWarnings);
  }

  // Return chart fields at top level so frontend can do setChart(data) directly.
  // projection and debug are attached as extra fields for components that need them.
  return res.status(200).json({
    ...chart,
    projection,
    debug,
  } as any);
}