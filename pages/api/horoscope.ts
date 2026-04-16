import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateFullChart,
  detectDoshas,
  computePariharas,
  buildPredictions,
  computeUEDPTimeline,
  type BirthData,
} from "../../lib/uedpEngine";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const birth: BirthData = req.body;

    // Validate required fields
    if (!birth || !birth.year || !birth.month || !birth.day) {
      return res.status(400).json({ error: "Invalid birth data" });
    }

    // Generate full chart (replaces old computeHoroscope)
    const chart = generateFullChart(birth);

    // Doshas are already computed inside generateFullChart,
    // but you can re-derive extras here if needed:
    const doshas = detectDoshas(chart.planets, chart.lagna.rashi);

    // Pariharas (replaces old generatePariharas)
    const pariharas = computePariharas(doshas);

    // Rich predictions (replaces old generatePredictions)
    const predictions = buildPredictions(
      chart.predictions,
      chart.dasha,
      chart.planets,
      chart.strengths,
      chart.uedp
    );

    // UEDP timeline (replaces old computeOmegaTimeline)
    const nowYear = new Date().getFullYear();
    const uedpTimeline = computeUEDPTimeline(
      birth,
      Math.max(birth.year, nowYear - 10),
      nowYear + 10
    );

    return res.status(200).json({
      ...chart,
      doshas,
      pariharas,
      richPredictions: predictions,
      uedpTimeline,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}