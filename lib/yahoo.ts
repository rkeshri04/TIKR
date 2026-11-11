// Yahoo Finance public JSON endpoints that need no key and no session crumb:
//   v8/finance/chart          -> OHLCV history + live quote meta
//   v1/finance/search         -> ticker autocomplete + Yahoo news
//   v6/finance/recommendationsbysymbol -> "people also watch" peers
import { cached, fetchJson } from "./http";
import type { Candle, Quote, SearchHit } from "./types";

const HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];

async function yget<T>(path: string): Promise<T> {
  let err: unknown;
  for (const h of HOSTS) {
    try {
      return await fetchJson<T>(h + path, { retries: 1 });
    } catch (e) {
      err = e;
    }
  }
  throw err;
}

type ChartResp = {
  chart: {
    result:
      | {
          meta: Record<string, any>;
          timestamp?: number[];
          indicators: { quote: { open: (number | null)[]; high: (number | null)[]; low: (number | null)[]; close: (number | null)[]; volume: (number | null)[] }[]; adjclose?: { adjclose: (number | null)[] }[] };
        }[]
      | null;
    error: { code: string; description: string } | null;
  };
};

export type ChartData = { quote: Quote; candles: Candle[] };

export function normalizeSymbol(s: string) {
  return decodeURIComponent(s).trim().toUpperCase().replace(/[^A-Z0-9.^=\-]/g, "").slice(0, 20);
}

export async function getChart(symbol: string, range = "5y", interval = "1d"): Promise<ChartData> {
  const sym = normalizeSymbol(symbol);
  const ttl = interval.endsWith("m") ? 30_000 : 60_000;
  return cached(`chart:${sym}:${range}:${interval}`, ttl, async () => {
    const r = await yget<ChartResp>(
      `/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`,
    );
    const res = r.chart.result?.[0];
    if (!res) throw new Error(r.chart.error?.description || `No data for ${sym}`);
    const m = res.meta;
    const q = res.indicators.quote[0] ?? { open: [], high: [], low: [], close: [], volume: [] };
    const ts = res.timestamp ?? [];
    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ time: ts[i], open: o, high: h, low: l, close: c, volume: q.volume[i] ?? 0 });
    }
    const price: number = m.regularMarketPrice ?? candles.at(-1)?.close ?? 0;
    // For multi-day ranges chartPreviousClose is the close before the range
    // starts, so derive the daily previous close from the candles instead.
    let prev: number = m.previousClose ?? NaN;
    if (!Number.isFinite(prev)) {
      if (range === "1d") prev = m.chartPreviousClose;
      else if (candles.length >= 2) {
        const last = candles.at(-1)!;
        const sameDay = Math.abs(last.time - (m.regularMarketTime ?? 0)) < 86400;
        prev = sameDay ? candles.at(-2)!.close : last.close;
      } else prev = m.chartPreviousClose ?? price;
    }
    const quote: Quote = {
      symbol: m.symbol ?? sym,
      name: m.longName ?? m.shortName ?? sym,
      exchange: m.fullExchangeName ?? m.exchangeName ?? "",
      currency: m.currency ?? "USD",
      instrumentType: m.instrumentType ?? "EQUITY",
      price,
      previousClose: prev,
      change: price - prev,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      dayHigh: m.regularMarketDayHigh ?? null,
      dayLow: m.regularMarketDayLow ?? null,
      volume: m.regularMarketVolume ?? null,
      fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? null,
      marketTime: (m.regularMarketTime ?? 0) * 1000,
      timezone: m.exchangeTimezoneName ?? "America/New_York",
    };
    return { quote, candles };
  });
}

type SearchResp = {
  quotes?: { symbol: string; shortname?: string; longname?: string; exchDisp?: string; quoteType?: string; typeDisp?: string; sector?: string; industry?: string }[];
  news?: { uuid: string; title: string; publisher: string; link: string; providerPublishTime: number }[];
};

export async function search(q: string, quotesCount = 8, newsCount = 0) {
  const query = q.trim().slice(0, 60);
  return cached(`search:${query}:${quotesCount}:${newsCount}`, 5 * 60_000, async () => {
    const r = await yget<SearchResp>(
      `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${quotesCount}&newsCount=${newsCount}&enableFuzzyQuery=true&listsCount=0`,
    );
    const hits: SearchHit[] = (r.quotes ?? [])
      .filter((x) => x.symbol)
      .map((x) => ({
        symbol: x.symbol,
        name: x.longname ?? x.shortname ?? x.symbol,
        exchange: x.exchDisp ?? "",
        type: x.typeDisp ?? x.quoteType ?? "",
        sector: x.sector,
        industry: x.industry,
      }));
    return { hits, news: r.news ?? [] };
  });
}

export async function getPeerSymbols(symbol: string): Promise<string[]> {
  return cached(`peers:${symbol}`, 6 * 3600_000, async () => {
    const r = await yget<{ finance: { result: { recommendedSymbols: { symbol: string }[] }[] } }>(
      `/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`,
    );
    return (r.finance.result?.[0]?.recommendedSymbols ?? []).map((x) => x.symbol).slice(0, 6);
  });
}
