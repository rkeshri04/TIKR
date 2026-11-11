import type { Candle, Technicals } from "./types";

export function sma(v: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= n) s -= v[i - n];
    if (i >= n - 1) out[i] = s / n;
  }
  return out;
}

export function ema(v: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  if (v.length < n) return out;
  const k = 2 / (n + 1);
  let e = v.slice(0, n).reduce((a, b) => a + b, 0) / n;
  out[n - 1] = e;
  for (let i = n; i < v.length; i++) {
    e = v[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

export function rsi(v: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null);
  if (v.length <= n) return out;
  let g = 0, l = 0;
  for (let i = 1; i <= n; i++) {
    const d = v[i] - v[i - 1];
    if (d > 0) g += d;
    else l -= d;
  }
  g /= n;
  l /= n;
  out[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  }
  return out;
}

export function macd(v: number[]) {
  const e12 = ema(v, 12), e26 = ema(v, 26);
  const line = v.map((_, i) => (e12[i] != null && e26[i] != null ? e12[i]! - e26[i]! : null));
  const start = line.findIndex((x) => x != null);
  const sig: (number | null)[] = new Array(v.length).fill(null);
  if (start >= 0) {
    const sub = ema(line.slice(start) as number[], 9);
    sub.forEach((x, i) => (sig[start + i] = x));
  }
  const hist = line.map((x, i) => (x != null && sig[i] != null ? x - sig[i]! : null));
  return { line, sig, hist };
}

function stdev(a: number[]) {
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1));
}

function logReturns(c: number[]) {
  const r: number[] = [];
  for (let i = 1; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1]));
  return r;
}

const last = <T,>(a: T[]) => a[a.length - 1];

/** Daily-return beta of `a` vs `b`, aligned on timestamps (last ~1y). */
export function beta(a: Candle[], b: Candle[]): number | null {
  const bm = new Map(b.map((x) => [Math.floor(x.time / 86400), x.close]));
  const pairs: [number, number][] = [];
  for (const x of a.slice(-260)) {
    const y = bm.get(Math.floor(x.time / 86400));
    if (y != null) pairs.push([x.close, y]);
  }
  if (pairs.length < 60) return null;
  const ra: number[] = [], rb: number[] = [];
  for (let i = 1; i < pairs.length; i++) {
    ra.push(pairs[i][0] / pairs[i - 1][0] - 1);
    rb.push(pairs[i][1] / pairs[i - 1][1] - 1);
  }
  const ma = ra.reduce((s, v) => s + v, 0) / ra.length;
  const mb = rb.reduce((s, v) => s + v, 0) / rb.length;
  let cov = 0, vb = 0;
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - ma) * (rb[i] - mb);
    vb += (rb[i] - mb) ** 2;
  }
  return vb ? cov / vb : null;
}

export function computeTechnicals(c: Candle[], bench: Candle[] | null): Technicals {
  const close = c.map((x) => x.close);
  const n = close.length;
  const price = last(close) ?? 0;
  const s20 = sma(close, 20), s50 = sma(close, 50), s200 = sma(close, 200);
  const e12 = ema(close, 12), e26 = ema(close, 26);
  const r = rsi(close);
  const m = macd(close);

  // Bollinger(20, 2)
  let bbU: number | null = null, bbL: number | null = null, pctB: number | null = null;
  if (n >= 20) {
    const w = close.slice(-20);
    const mid = last(s20)!;
    const sd = stdev(w);
    bbU = mid + 2 * sd;
    bbL = mid - 2 * sd;
    pctB = bbU !== bbL ? (price - bbL) / (bbU - bbL) : null;
  }
  // ATR(14)
  let atr: number | null = null;
  if (n > 15) {
    const trs: number[] = [];
    for (let i = n - 14; i < n; i++) {
      const pc = c[i - 1].close;
      trs.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - pc), Math.abs(c[i].low - pc)));
    }
    atr = trs.reduce((a, b) => a + b, 0) / trs.length;
  }
  const lr = logReturns(close);
  const vol30 = lr.length >= 30 ? stdev(lr.slice(-30)) * Math.sqrt(252) : null;
  const vol1y = lr.length >= 200 ? stdev(lr.slice(-252)) * Math.sqrt(252) : null;

  // Max drawdown over the last year
  let peak = -Infinity, mdd = 0;
  for (const p of close.slice(-252)) {
    peak = Math.max(peak, p);
    mdd = Math.min(mdd, p / peak - 1);
  }

  // Relative volume: today vs 50d average
  const vols = c.map((x) => x.volume);
  const avgVol = vols.length > 51 ? vols.slice(-51, -1).reduce((a, b) => a + b, 0) / 50 : null;
  const relVol = avgVol ? last(vols) / avgVol : null;

  // Support / resistance: nearest 3-month swing low/high around price
  const recent = c.slice(-66);
  const support = recent.length ? Math.min(...recent.map((x) => x.low)) : null;
  const resistance = recent.length ? Math.max(...recent.map((x) => x.high)) : null;

  const lastT = last(c)?.time ?? 0;
  const ret = (daysBack: number) => {
    const target = lastT - daysBack * 86400;
    let i = n - 1;
    while (i > 0 && c[i].time > target) i--;
    if (c[i].time > target + 5 * 86400) return null; // not enough history
    return price / c[i].close - 1;
  };
  const yStart = new Date(new Date(lastT * 1000).getUTCFullYear(), 0, 1).getTime() / 1000;
  const ytdIdx = c.findIndex((x) => x.time >= yStart);
  const returns: Record<string, number | null> = {
    "1W": ret(7),
    "1M": ret(30),
    "3M": ret(91),
    "6M": ret(182),
    YTD: ytdIdx > 0 ? price / c[ytdIdx - 1].close - 1 : null,
    "1Y": ret(365),
    "3Y": ret(365 * 3),
    "5Y": ret(365 * 5 - 5),
  };

  const S50 = last(s50), S200 = last(s200), R = last(r), MH = last(m.hist), ML = last(m.line), MS = last(m.sig);
  const signals: Technicals["signals"] = [];
  const add = (name: string, value: string, bias: "bullish" | "bearish" | "neutral") => signals.push({ name, value, bias });
  if (S50 != null && S200 != null) {
    const prev50 = s50[n - 11], prev200 = s200[n - 11];
    const crossedUp = prev50 != null && prev200 != null && prev50 < prev200 && S50 > S200;
    const crossedDown = prev50 != null && prev200 != null && prev50 > prev200 && S50 < S200;
    add(
      "50/200 DMA",
      crossedUp ? "Golden cross (recent)" : crossedDown ? "Death cross (recent)" : S50 > S200 ? "50 above 200" : "50 below 200",
      S50 > S200 ? "bullish" : "bearish",
    );
  }
  if (S200 != null) add("Price vs 200 DMA", `${((price / S200 - 1) * 100).toFixed(1)}%`, price > S200 ? "bullish" : "bearish");
  if (S50 != null) add("Price vs 50 DMA", `${((price / S50 - 1) * 100).toFixed(1)}%`, price > S50 ? "bullish" : "bearish");
  if (R != null) add("RSI (14)", `${R.toFixed(0)} ${R > 70 ? "· overbought" : R < 30 ? "· oversold" : ""}`.trim(), R > 70 ? "bearish" : R < 30 ? "bullish" : R > 50 ? "bullish" : "neutral");
  if (MH != null && ML != null && MS != null) add("MACD", MH > 0 ? "Above signal" : "Below signal", MH > 0 ? "bullish" : "bearish");
  if (pctB != null) add("Bollinger %B", pctB.toFixed(2), pctB > 1 ? "bearish" : pctB < 0 ? "bullish" : "neutral");
  if (relVol != null) add("Relative volume", `${relVol.toFixed(2)}×`, "neutral");
  const hi52 = Math.max(...close.slice(-252));
  add("From 52w high", `${((price / hi52 - 1) * 100).toFixed(1)}%`, price / hi52 > 0.95 ? "bullish" : price / hi52 < 0.75 ? "bearish" : "neutral");

  let trend: Technicals["trend"] = "sideways";
  if (S50 != null && S200 != null) {
    if (price > S50 && S50 > S200) trend = "uptrend";
    else if (price < S50 && S50 < S200) trend = "downtrend";
  }

  return {
    sma20: last(s20) ?? null,
    sma50: S50 ?? null,
    sma200: S200 ?? null,
    ema12: last(e12) ?? null,
    ema26: last(e26) ?? null,
    rsi14: R ?? null,
    macd: ML ?? null,
    macdSignal: MS ?? null,
    macdHist: MH ?? null,
    bbUpper: bbU,
    bbLower: bbL,
    bbPctB: pctB,
    atr14: atr,
    atrPct: atr && price ? atr / price : null,
    volatility30d: vol30,
    volatility1y: vol1y,
    maxDrawdown1y: mdd,
    beta: bench ? beta(c, bench) : null,
    relVolume: relVol,
    support,
    resistance,
    returns,
    signals,
    trend,
  };
}
