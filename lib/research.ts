// Builds the full research "dossier" for a ticker by fanning out to every
// free source in parallel, then scoring the result.
import { cached, settle } from "./http";
import { computeTechnicals } from "./indicators";
import { getNews, newsStats } from "./news";
import { getFilings, getFundamentals, lookupCik } from "./sec";
import { getChart, getPeerSymbols, normalizeSymbol, search } from "./yahoo";
import type { Dossier, Fundamentals, Peer, Scores, Technicals } from "./types";

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
/** Map x linearly from [a,b] onto [0,100]. */
const lin = (x: number, a: number, b: number) => clamp(((x - a) / (b - a)) * 100);
const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

function score(t: Technicals, f: Fundamentals | null, sentimentAvg: number): Scores {
  const r = t.returns;
  const momentum = avg([
    r["1M"] != null ? lin(r["1M"], -0.15, 0.15) : null,
    r["3M"] != null ? lin(r["3M"], -0.25, 0.25) : null,
    r["6M"] != null ? lin(r["6M"], -0.35, 0.35) : null,
    r["1Y"] != null ? lin(r["1Y"], -0.5, 0.5) : null,
    t.rsi14 != null ? 100 - Math.abs(t.rsi14 - 60) * 2.5 : null,
  ]) ?? 50;

  const trendBits: number[] = [];
  const bull = t.signals.filter((s) => s.bias === "bullish").length;
  const bear = t.signals.filter((s) => s.bias === "bearish").length;
  if (bull + bear) trendBits.push((bull / (bull + bear)) * 100);
  trendBits.push(t.trend === "uptrend" ? 85 : t.trend === "downtrend" ? 15 : 50);
  const trend = avg(trendBits) ?? 50;

  let value: number | null = null, quality: number | null = null, growth: number | null = null;
  if (f) {
    const q = f.ratios;
    value = avg([
      q.pe != null ? lin(-q.pe, -60, -8) : f.ttm.netIncome != null && f.ttm.netIncome < 0 ? 15 : null,
      q.ps != null ? lin(-q.ps, -20, -1) : null,
      q.fcfYield != null ? lin(q.fcfYield, -0.02, 0.08) : null,
      q.pb != null ? lin(-q.pb, -25, -1) : null,
    ]);
    quality = avg([
      q.grossMargin != null ? lin(q.grossMargin, 0.1, 0.75) : null,
      q.operatingMargin != null ? lin(q.operatingMargin, -0.1, 0.35) : null,
      q.netMargin != null ? lin(q.netMargin, -0.1, 0.3) : null,
      q.roe != null ? lin(q.roe, -0.05, 0.35) : null,
      q.debtToEquity != null ? lin(-q.debtToEquity, -3, 0) : null,
      q.currentRatio != null ? lin(q.currentRatio, 0.6, 2.2) : null,
    ]);
    growth = avg([
      q.revenueGrowth != null ? lin(q.revenueGrowth, -0.1, 0.3) : null,
      q.revenueCagr3y != null ? lin(q.revenueCagr3y, -0.05, 0.25) : null,
      q.epsGrowth != null ? lin(q.epsGrowth, -0.3, 0.4) : null,
    ]);
  }
  const sentiment = clamp(50 + sentimentAvg * 120);
  const risk = avg([
    t.volatility1y != null ? lin(-t.volatility1y, -0.8, -0.15) : null,
    t.maxDrawdown1y != null ? lin(t.maxDrawdown1y, -0.6, -0.05) : null,
    t.beta != null ? lin(-Math.abs(t.beta), -2.2, -0.6) : null,
  ]) ?? 50;

  const parts: [number | null, number][] = [
    [momentum, 0.16], [trend, 0.14], [value, 0.16], [quality, 0.18], [growth, 0.16], [sentiment, 0.1], [risk, 0.1],
  ];
  let s = 0, w = 0;
  for (const [v, wt] of parts) if (v != null) { s += v * wt; w += wt; }
  const R = (x: number | null) => (x == null ? null : Math.round(x));
  return {
    overall: Math.round(s / w),
    momentum: Math.round(momentum),
    trend: Math.round(trend),
    value: R(value),
    quality: R(quality),
    growth: R(growth),
    sentiment: Math.round(sentiment),
    risk: Math.round(risk),
  };
}

async function peers(symbol: string): Promise<Peer[]> {
  const syms = (await settle(getPeerSymbols(symbol))) ?? [];
  const list: (Peer | null)[] = await Promise.all(
    syms.slice(0, 6).map(async (s) => {
      const c = await settle(getChart(s, "1y", "1d"));
      if (!c) return null;
      const first = c.candles[0]?.close;
      return {
        symbol: s,
        name: c.quote.name,
        price: c.quote.price,
        changePct: c.quote.changePct,
        ret1y: first ? c.quote.price / first - 1 : null,
      };
    }),
  );
  return list.filter((x): x is Peer => !!x);
}

export async function buildDossier(rawSymbol: string): Promise<Dossier> {
  const symbol = normalizeSymbol(rawSymbol);
  return cached(`dossier:${symbol}`, 3 * 60_000, async () => {
    const warnings: string[] = [];
    // Price history is the one thing we can't do without.
    const [chart, bench, info, cik] = await Promise.all([
      getChart(symbol, "5y", "1d"),
      settle(getChart("SPY", "2y", "1d")),
      settle(search(symbol, 3, 0)),
      settle(lookupCik(symbol)),
    ]);
    const { quote, candles } = chart;
    const hit = info?.hits.find((h) => h.symbol.toUpperCase() === symbol) ?? info?.hits[0];

    const [news, fundamentals, filings, peerList] = await Promise.all([
      settle(getNews(symbol, quote.name)),
      cik && quote.instrumentType === "EQUITY" ? settle(getFundamentals(cik, quote.price)) : Promise.resolve(null),
      cik ? settle(getFilings(cik)) : Promise.resolve(null),
      peers(symbol),
    ]);
    if (!cik && quote.instrumentType === "EQUITY") warnings.push("No SEC filer found for this ticker (non-US listing?) — fundamentals unavailable.");
    if (cik && !fundamentals && quote.instrumentType === "EQUITY") warnings.push("SEC fundamentals could not be loaded right now.");
    if (!news) warnings.push("News feeds were unavailable.");

    const technicals = computeTechnicals(candles, bench?.candles ?? null);
    const stats = newsStats(news ?? []);
    return {
      symbol,
      generatedAt: Date.now(),
      quote,
      profile: { sector: hit?.sector, industry: hit?.industry ?? filings?.sic, longName: quote.name },
      candles,
      technicals,
      fundamentals,
      filings: filings?.filings ?? [],
      news: news ?? [],
      newsStats: stats,
      peers: peerList,
      scores: score(technicals, fundamentals, stats.avg),
      warnings,
    };
  });
}
