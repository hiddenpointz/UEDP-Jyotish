import type { NextApiRequest, NextApiResponse } from "next";
import { generateFullChart, type BirthData } from "../../lib/uedpEngine";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = req.body as BirthData;
    const required = ["day","month","year","hour","minute","latitude","longitude","timezone"];
    for (const f of required) {
      if (body[f as keyof BirthData] === undefined) return res.status(400).json({ error: `Missing: ${f}` });
    }
    const chart = generateFullChart(body);
    res.status(200).json(chart);
  } catch (e: unknown) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
}