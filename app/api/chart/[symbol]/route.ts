import { NextResponse } from "next/server";
import { getChart } from "@/lib/yahoo";

// Intraday / custom ranges for the price chart.
const ALLOWED: Record<string, string> = { "1d": "5m", "5d": "15m", "1mo": "1h", "6mo": "1d", "1y": "1d", "5y": "1wk", max: "1mo" };

export async function GET(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const range = new URL(req.url).searchParams.get("range") ?? "1d";
  const interval = ALLOWED[range];
  if (!interval) return NextResponse.json({ error: "bad range" }, { status: 400 });
  try {
    const c = await getChart(symbol, range, interval);
    return NextResponse.json(c);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
