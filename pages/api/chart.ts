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
import type { BirthData, ChartData }             from "../../lib/uedpEngine";
import type { ChartStyle, ChartProjection }       from "../../lib/chartProjection";
import { generateFullChart }                      from "../../lib/uedpEngine";
import { projectChart, buildDebugReport }         from "../../lib/chartProjection";

// ─── Response shapes ────────────────────────────────────────────────────────

interface SuccessResponse {
  chart:      ChartData;
  projection: ChartProjection;
  debug:      ReturnType<typeof buildDebugReport>;
}

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
    throw new Error("Request body must contain a 'birth' object.");
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

  try {
    const parsed = parseBirthData((body as Record<string, unknown>).birth);
    birthData     = parsed.data;
    inputWarnings = parsed.warnings;
  } catch (validationErr) {
    return res.status(400).json({
      error:  "Invalid birth data.",
      detail: validationErr instanceof Error ? validationErr.message : String(validationErr),
    });
  }

  const style = parseStyle((body as Record<string, unknown>).style);

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
  let debug: ReturnType<typeof buildDebugReport>;
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

  return res.status(200).json({ chart, projection, debug });
}