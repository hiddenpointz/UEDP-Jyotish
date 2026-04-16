import type { NextApiRequest, NextApiResponse } from "next";
import {
  generateFullChart,
  type BirthData,
} from "../../lib/uedpEngine";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const birth: BirthData = req.body;

    if (
      !birth ||
      birth.year == null ||
      birth.month == null ||
      birth.day == null ||
      birth.latitude == null ||
      birth.longitude == null
    ) {
      return res.status(400).json({ error: "Invalid birth data: missing required fields" });
    }

    const chart = generateFullChart(birth);
    return res.status(200).json(chart);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}