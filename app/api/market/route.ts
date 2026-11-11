import { NextResponse } from "next/server";
import { settle } from "@/lib/http";
import { getChart } from "@/lib/yahoo";

const TAPE: [string, string][] = [
  ["^GSPC", "S&P 500"], ["^IXIC", "Nasdaq"], ["^DJI", "Dow"], ["^RUT", "Russell 2K"], ["^VIX", "VIX"],
  ["^TNX", "10Y Yield"], ["DX-Y.NYB", "Dollar"], ["GC=F", "Gold"], ["CL=F", "Crude"], ["BTC-USD", "Bitcoin"], ["ETH-USD", "Ether"],
];

export async function GET() {
  const rows = await Promise.all(
    TAPE.map(async ([s, label]) => {
      const c = await settle(getChart(s, "5d", "1d"));
      if (!c) return null;
      return { symbol: s, label, price: c.quote.price, changePct: c.quote.changePct, spark: c.candles.map((x) => x.close) };
    }),
  );
  return NextResponse.json({ rows: rows.filter(Boolean) }, { headers: { "Cache-Control": "public, max-age=60" } });
}
