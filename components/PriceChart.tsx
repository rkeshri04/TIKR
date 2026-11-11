"use client";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import type { Candle } from "@/lib/types";
import { sma } from "@/lib/indicators";
import { fmtNum } from "@/lib/format";
import { cssColor, useThemeKey } from "./theme";

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;
type Range = (typeof RANGES)[number];
const REMOTE: Partial<Record<Range, string>> = { "1D": "1d", "5D": "5d", "1M": "1mo", MAX: "max" };

function tzOffsetSec(tz: string, at: number) {
  // Lightweight-charts renders UTC; shift intraday bars to exchange-local time.
  try {
    const d = new Date(at * 1000);
    const local = new Date(d.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return (local.getTime() - utc.getTime()) / 1000;
  } catch {
    return 0;
  }
}

export default function PriceChart({ symbol, daily, timezone, previousClose }: { symbol: string; daily: Candle[]; timezone: string; previousClose: number }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const theme = useThemeKey();
  const [range, setRange] = useState<Range>("1Y");
  const [style, setStyle] = useState<"candles" | "area">("area");
  const [ov, setOv] = useState({ sma50: true, sma200: true, bb: false });
  const [remote, setRemote] = useState<Record<string, Candle[]>>({});
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<Candle | null>(null);

  useEffect(() => {
    setRemote({});
  }, [symbol]);

  useEffect(() => {
    const r = REMOTE[range];
    if (!r || remote[range]) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${r}`)
      .then((x) => x.json())
      .then((j) => alive && j.candles && setRemote((m) => ({ ...m, [range]: j.candles })))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [range, symbol, remote]);

  const intraday = range === "1D" || range === "5D" || range === "1M";

  const data = useMemo(() => {
    let bars: Candle[];
    if (REMOTE[range]) bars = remote[range] ?? [];
    else {
      const last = daily.at(-1)?.time ?? 0;
      const from =
        range === "6M" ? last - 182 * 86400 :
        range === "1Y" ? last - 365 * 86400 :
        range === "YTD" ? Date.UTC(new Date(last * 1000).getUTCFullYear(), 0, 1) / 1000 : 0;
      bars = daily.filter((c) => c.time >= from);
    }
    const off = intraday && bars.length ? tzOffsetSec(timezone, bars[0].time) : 0;
    return bars.map((c) => ({ ...c, time: c.time + off }));
  }, [range, remote, daily, intraday, timezone]);

  // Overlays come from full daily history so they're defined from the left edge.
  const overlays = useMemo(() => {
    if (intraday || range === "MAX") return null;
    const closes = daily.map((c) => c.close);
    const s50 = sma(closes, 50), s200 = sma(closes, 200), s20 = sma(closes, 20);
    const start = data[0]?.time ?? 0;
    const pick = (arr: (number | null)[]) =>
      daily.map((c, i) => ({ time: c.time as UTCTimestamp, value: arr[i] })).filter((p) => p.value != null && p.time >= start) as { time: UTCTimestamp; value: number }[];
    const bbU: { time: UTCTimestamp; value: number }[] = [], bbL: typeof bbU = [];
    for (let i = 19; i < daily.length; i++) {
      if (daily[i].time < start) continue;
      const w = closes.slice(i - 19, i + 1), m = s20[i]!;
      const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / 19);
      bbU.push({ time: daily[i].time as UTCTimestamp, value: m + 2 * sd });
      bbL.push({ time: daily[i].time as UTCTimestamp, value: m - 2 * sd });
    }
    return { s50: pick(s50), s200: pick(s200), bbU, bbL };
  }, [daily, data, intraday, range]);

  const first = data[0]?.close, lastBar = data.at(-1);
  // 1D change is vs. the previous close, matching the quote header.
  const ref = range === "1D" ? previousClose || data[0]?.open : first;
  const chg = lastBar && ref ? lastBar.close / ref - 1 : 0;
  const isUp = chg >= 0;

  useEffect(() => {
    if (!el.current || data.length === 0) return;
    const ink = cssColor("--mute");
    const grid = cssColor("--line", 0.05);
    const up = cssColor("--up"), down = cssColor("--down");
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: ink, fontFamily: "JetBrains Mono, ui-monospace, monospace", fontSize: 11, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderVisible: false, timeVisible: intraday, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Magnet, vertLine: { color: cssColor("--mute", 0.4), labelBackgroundColor: cssColor("--panel") }, horzLine: { color: cssColor("--mute", 0.4), labelBackgroundColor: cssColor("--panel") } },
      handleScale: { axisPressedMouseMove: true },
    });
    chartRef.current = chart;
    const t = (x: number) => x as UTCTimestamp;

    if (style === "candles") {
      const s = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, borderVisible: false, wickUpColor: up, wickDownColor: down, priceLineVisible: false });
      s.setData(data.map((c) => ({ time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
    } else {
      const col = isUp ? up : down;
      const s = chart.addSeries(AreaSeries, {
        lineColor: col, lineWidth: 2, topColor: isUp ? cssColor("--up", 0.28) : cssColor("--down", 0.28), bottomColor: "rgba(0,0,0,0)", priceLineVisible: false,
        crosshairMarkerRadius: 4, crosshairMarkerBorderColor: cssColor("--panel"), crosshairMarkerBorderWidth: 2,
      });
      s.setData(data.map((c) => ({ time: t(c.time), value: c.close })));
      if (range === "1D" && ref) s.createPriceLine({ price: ref, color: cssColor("--mute", 0.6), lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "prev close" });
    }
    const vol = chart.addSeries(HistogramSeries, { priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    vol.setData(data.map((c) => ({ time: t(c.time), value: c.volume, color: c.close >= c.open ? cssColor("--up", 0.3) : cssColor("--down", 0.3) })));

    if (overlays) {
      const line = { lineWidth: 2 as const, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
      if (ov.sma50) chart.addSeries(LineSeries, { ...line, color: cssColor("--s2") }).setData(overlays.s50);
      if (ov.sma200) chart.addSeries(LineSeries, { ...line, color: cssColor("--s1") }).setData(overlays.s200);
      if (ov.bb) {
        const bb = { ...line, lineWidth: 1 as const, lineStyle: 2, color: cssColor("--mute", 0.7) };
        chart.addSeries(LineSeries, bb).setData(overlays.bbU);
        chart.addSeries(LineSeries, bb).setData(overlays.bbL);
      }
    }
    chart.timeScale().fitContent();
    const byTime = new Map(data.map((c) => [c.time, c]));
    chart.subscribeCrosshairMove((p) => setHover(p.time ? byTime.get(p.time as number) ?? null : null));
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, style, ov, overlays, theme, intraday, isUp, range, ref]);

  const shown = hover ?? lastBar;
  const fmtTime = (s: number) =>
    new Date(s * 1000).toLocaleString("en-US", intraday ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" } : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setRange(r)} className={clsx("tab", range === r && "tab-on")}>{r}</button>
          ))}
          <span className={clsx("num ml-2 text-xs font-semibold", isUp ? "text-up" : "text-down")}>
            {chg >= 0 ? "+" : ""}{(chg * 100).toFixed(2)}% <span className="font-normal text-mute">{range}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!intraday && range !== "MAX" && (
            <>
              <Toggle on={ov.sma50} onClick={() => setOv((o) => ({ ...o, sma50: !o.sma50 }))} swatch="rgb(var(--s2))">SMA 50</Toggle>
              <Toggle on={ov.sma200} onClick={() => setOv((o) => ({ ...o, sma200: !o.sma200 }))} swatch="rgb(var(--s1))">SMA 200</Toggle>
              <Toggle on={ov.bb} onClick={() => setOv((o) => ({ ...o, bb: !o.bb }))} swatch="rgb(var(--mute))" dashed>Bollinger</Toggle>
              <span className="mx-1 h-4 w-px bg-line/10" />
            </>
          )}
          <button onClick={() => setStyle("area")} className={clsx("tab", style === "area" && "tab-on")}>Line</button>
          <button onClick={() => setStyle("candles")} className={clsx("tab", style === "candles" && "tab-on")}>Candles</button>
        </div>
      </div>
      <div className="num mt-3 flex min-h-[18px] flex-wrap gap-x-4 gap-y-1 text-[11px] text-mute">
        {shown && (
          <>
            <span className="text-ink/80">{fmtTime(shown.time)}</span>
            <span>O <b className="font-medium text-ink/90">{fmtNum(shown.open)}</b></span>
            <span>H <b className="font-medium text-ink/90">{fmtNum(shown.high)}</b></span>
            <span>L <b className="font-medium text-ink/90">{fmtNum(shown.low)}</b></span>
            <span>C <b className="font-medium text-ink/90">{fmtNum(shown.close)}</b></span>
            <span>Vol <b className="font-medium text-ink/90">{shown.volume.toLocaleString("en-US")}</b></span>
          </>
        )}
      </div>
      <div className="relative mt-2 h-[340px] sm:h-[420px]">
        <div ref={el} className="absolute inset-0" />
        {(loading || data.length === 0) && (
          <div className="absolute inset-0 grid place-items-center text-sm text-mute">{loading ? <div className="skeleton h-full w-full" /> : "No data for this range"}</div>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, swatch, dashed, children }: { on: boolean; onClick: () => void; swatch: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={clsx("tab flex items-center gap-1.5", on && "tab-on")} aria-pressed={on}>
      <span className="inline-block h-0.5 w-3 rounded" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${swatch} 0 3px, transparent 3px 5px)` : swatch, opacity: on ? 1 : 0.4 }} />
      {children}
    </button>
  );
}
