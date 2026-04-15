import type { NextApiRequest, NextApiResponse } from "next";
import {
  computeHoroscope, detectDoshas, generatePariharas,
  generatePredictions, computeOmegaTimeline,
  type BirthData,
} from "../../lib/uedpEngine";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const birth: BirthData = req.body;

    // Validate required fields
    const required = ["day", "month", "year", "hour", "minute", "latitude", "longitude", "timezone"];
    for (const field of required) {
      if (birth[field as keyof BirthData] === undefined) {
        return res.status(400).json({ error: `Missing field: ${field}` });
      }
    }

    const chart = computeHoroscope(birth);
    const doshas = detectDoshas(chart);
    const pariharas = generatePariharas(doshas, chart);
    const predictions = generatePredictions(birth, chart);
    const currentYear = new Date().getFullYear();
    const timeline = computeOmegaTimeline(
      birth,
      Math.max(birth.year, currentYear - 10),
      currentYear + 15
    );

    res.status(200).json({ chart, doshas, pariharas, predictions, timeline });
  } catch (err: unknown) {
    console.error("Horoscope API error:", err);
    res.status(500).json({ error: String(err) });
  }
}
