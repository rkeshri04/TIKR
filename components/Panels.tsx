"use client";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, ExternalLink, FileText, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Dossier } from "@/lib/types";
import { fmtBig, fmtNum, fmtPct, fmtX } from "@/lib/format";

export function Card({ title, right, children, className }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("card p-4 sm:p-5 animate-fadeup", className)}>
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="card-title">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const tone = (v: number | null) => (v == null ? "text-mute" : v >= 65 ? "text-up" : v >= 45 ? "text-warn" : "text-down");
const barTone = (v: number) => (v >= 65 ? "bg-up" : v >= 45 ? "bg-warn" : "bg-down");

export function ScoreCard({ d }: { d: Dossier }) {
  const s = d.scores;
  const R = 52, C = 2 * Math.PI * R;
  const label = s.overall >= 72 ? "Strong" : s.overall >= 60 ? "Favorable" : s.overall >= 45 ? "Mixed" : s.overall >= 33 ? "Weak" : "Poor";
  const rows: [string, number | null, string][] = [
    ["Momentum", s.momentum, "Multi-horizon returns & RSI"],
    ["Trend", s.trend, "Moving-average structure & signals"],
    ["Value", s.value, "P/E, P/S, P/B, FCF yield"],
    ["Quality", s.quality, "Margins, ROE, leverage, liquidity"],
    ["Growth", s.growth, "Revenue & EPS growth"],
    ["Sentiment", s.sentiment, "Recency-weighted news tone"],
    ["Safety", s.risk, "Volatility, drawdown, beta"],
  ];
  return (
    <Card title="TIKR Score" right={<span className="chip text-mute">quant · 0–100</span>}>
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" className="stroke-line/10" />
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(s.overall / 100) * C} ${C}`}
              className={clsx("transition-all duration-700", s.overall >= 65 ? "stroke-up" : s.overall >= 45 ? "stroke-warn" : "stroke-down")}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="num text-4xl font-bold leading-none">{s.overall}</div>
              <div className={clsx("mt-1 text-[11px] font-semibold uppercase tracking-wider", tone(s.overall))}>{label}</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          {rows.map(([k, v, hint]) => (
            <div key={k} className="group" title={hint}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink/80">{k}</span>
                <span className={clsx("num font-semibold", tone(v))}>{v ?? "n/a"}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/10">
                {v != null && <div className={clsx("h-full rounded-full transition-all duration-700", barTone(v))} style={{ width: `${Math.max(3, v)}%` }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Stat({ k, v, sub, hint }: { k: string; v: React.ReactNode; sub?: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border p-3 hairline" title={hint}>
      <div className="truncate text-[11px] text-mute">{k}</div>
      <div className="num mt-1 truncate text-[15px] font-semibold">{v}</div>
      {sub && <div className="num mt-0.5 truncate text-[11px] text-mute">{sub}</div>}
    </div>
  );
}

export function KeyStats({ d }: { d: Dossier }) {
  const q = d.quote, t = d.technicals, f = d.fundamentals, r = f?.ratios;
  return (
    <Card title="Key statistics">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {f && <Stat k="Market cap" v={fmtBig(f.marketCap)} sub={`${fmtBig(f.sharesOutstanding, "")} shares`} />}
        {f && <Stat k="P/E (TTM)" v={fmtX(r?.pe)} sub={`EPS ${fmtNum(f.ttm.eps)}`} />}
        {f && <Stat k="P/S · P/B" v={`${fmtX(r?.ps)} · ${fmtX(r?.pb)}`} />}
        {f && <Stat k="FCF yield" v={fmtPct(r?.fcfYield)} sub={`FCF ${fmtBig(f.ttm.freeCashFlow)}`} />}
        {f && <Stat k="Revenue (TTM)" v={fmtBig(f.ttm.revenue)} sub={`${fmtPct(r?.revenueGrowth, 1, true)} YoY`} />}
        {f && <Stat k="Net income (TTM)" v={fmtBig(f.ttm.netIncome)} sub={`${fmtPct(r?.netMargin)} margin`} />}
        {f && <Stat k="ROE" v={fmtPct(r?.roe)} />}
        {f && <Stat k="Debt / equity" v={fmtNum(r?.debtToEquity)} sub={`Cash ${fmtBig(f.balance.cash)}`} />}
        <Stat k="Day range" v={`${fmtNum(q.dayLow)} – ${fmtNum(q.dayHigh)}`} />
        <Stat k="52-week range" v={`${fmtNum(q.fiftyTwoWeekLow)} – ${fmtNum(q.fiftyTwoWeekHigh)}`} />
        <Stat k="Volume" v={q.volume?.toLocaleString("en-US") ?? "—"} sub={t.relVolume ? `${fmtNum(t.relVolume)}× 50d avg` : undefined} />
        <Stat k="Beta (1y vs SPY)" v={fmtNum(t.beta)} />
        <Stat k="Volatility (1y)" v={fmtPct(t.volatility1y)} sub={`30d ${fmtPct(t.volatility30d)}`} hint="Annualized standard deviation of daily log returns" />
        <Stat k="Max drawdown (1y)" v={fmtPct(t.maxDrawdown1y)} />
        <Stat k="ATR (14)" v={fmtNum(t.atr14)} sub={fmtPct(t.atrPct)} />
        {!f && <Stat k="Trend" v={<span className="capitalize">{t.trend}</span>} />}
      </div>
    </Card>
  );
}

export function Returns({ d }: { d: Dossier }) {
  const entries = Object.entries(d.technicals.returns);
  return (
    <Card title="Performance">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {entries.map(([k, v]) => {
          const a = v == null ? 0 : Math.min(1, Math.abs(v) / 0.5);
          return (
            <div
              key={k}
              className="rounded-xl border p-2.5 text-center hairline"
              style={{ background: v == null ? undefined : `rgb(var(${v >= 0 ? "--up" : "--down"}) / ${0.05 + a * 0.25})` }}
            >
              <div className="text-[11px] text-mute">{k}</div>
              <div className={clsx("num mt-0.5 text-sm font-semibold", v == null ? "text-mute" : v >= 0 ? "text-up" : "text-down")}>{fmtPct(v, 1, true)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function TechnicalsCard({ d }: { d: Dossier }) {
  const t = d.technicals, q = d.quote;
  const rsi = t.rsi14 ?? 50;
  const lo = q.fiftyTwoWeekLow ?? Math.min(...d.candles.slice(-252).map((c) => c.low));
  const hi = q.fiftyTwoWeekHigh ?? Math.max(...d.candles.slice(-252).map((c) => c.high));
  const pos = hi > lo ? ((q.price - lo) / (hi - lo)) * 100 : 50;
  const bull = t.signals.filter((s) => s.bias === "bullish").length;
  const bear = t.signals.filter((s) => s.bias === "bearish").length;
  // RSI gauge: semicircle from 0..100
  const ang = Math.PI * (1 - rsi / 100);
  const nx = 60 + 44 * Math.cos(ang), ny = 60 - 44 * Math.sin(ang);
  return (
    <Card
      title="Technicals"
      right={<span className={clsx("chip capitalize", t.trend === "uptrend" ? "text-up" : t.trend === "downtrend" ? "text-down" : "text-warn")}>{t.trend}</span>}
    >
      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <div className="text-center">
          <svg viewBox="0 0 120 70" className="mx-auto w-[150px]" role="img" aria-label={`RSI ${rsi.toFixed(0)}`}>
            <path d="M10 60 A50 50 0 0 1 40 14.2" fill="none" strokeWidth="8" className="stroke-up/70" />
            <path d="M41.5 13.6 A50 50 0 0 1 78.5 13.6" fill="none" strokeWidth="8" className="stroke-line/15" />
            <path d="M80 14.2 A50 50 0 0 1 110 60" fill="none" strokeWidth="8" className="stroke-down/70" />
            <line x1="60" y1="60" x2={nx} y2={ny} strokeWidth="3" strokeLinecap="round" className="stroke-ink" />
            <circle cx="60" cy="60" r="5" className="fill-ink" />
          </svg>
          <div className="num -mt-1 text-2xl font-bold">{rsi.toFixed(0)}</div>
          <div className="text-[11px] text-mute">RSI (14) · {rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral zone"}</div>
          <div className="mt-3 flex justify-center gap-3 text-[11px]">
            <span className="text-up">{bull} bullish</span>
            <span className="text-down">{bear} bearish</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {t.signals.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-line/5">
              <span className="text-ink/80">{s.name}</span>
              <span className="flex items-center gap-1.5">
                <span className="num text-ink/90">{s.value}</span>
                {s.bias === "bullish" ? <ArrowUpRight size={14} className="text-up" aria-label="bullish" /> : s.bias === "bearish" ? <ArrowDownRight size={14} className="text-down" aria-label="bearish" /> : <Minus size={14} className="text-mute" aria-label="neutral" />}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-[11px] text-mute">
          <span>52w low <b className="num font-medium text-ink/80">{fmtNum(lo)}</b></span>
          <span>52w high <b className="num font-medium text-ink/80">{fmtNum(hi)}</b></span>
        </div>
        <div className="relative mt-1.5 h-2 rounded-full bg-gradient-to-r from-down/50 via-warn/40 to-up/50">
          <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-panel bg-ink shadow" style={{ left: `${Math.max(0, Math.min(100, pos))}%` }} />
        </div>
        <div className="num mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-mute">
          <div>Support<div className="text-[13px] font-semibold text-ink/90">{fmtNum(t.support)}</div></div>
          <div>SMA 50 / 200<div className="text-[13px] font-semibold text-ink/90">{fmtNum(t.sma50, 0)} / {fmtNum(t.sma200, 0)}</div></div>
          <div>Resistance<div className="text-[13px] font-semibold text-ink/90">{fmtNum(t.resistance)}</div></div>
        </div>
      </div>
    </Card>
  );
}

export function PeersCard({ d }: { d: Dossier }) {
  if (!d.peers.length) return null;
  const all = [{ symbol: d.symbol, name: d.quote.name, ret1y: d.technicals.returns["1Y"], changePct: d.quote.changePct, price: d.quote.price, self: true }, ...d.peers.map((p) => ({ ...p, self: false }))];
  const max = Math.max(0.01, ...all.map((p) => Math.abs(p.ret1y ?? 0)));
  return (
    <Card title="Related tickers · 1-year return">
      <div className="space-y-1">
        {all.map((p) => (
          <Link
            key={p.symbol}
            href={`/t/${encodeURIComponent(p.symbol)}`}
            className={clsx("grid grid-cols-[72px_1fr_64px] items-center gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-line/5", p.self && "bg-accent/10")}
            title={`${p.name} · ${fmtPct(p.ret1y, 1, true)} over 1 year · today ${p.changePct != null ? p.changePct.toFixed(2) + "%" : "—"}`}
          >
            <span className="num truncate font-semibold">{p.symbol}</span>
            <span className="relative h-5">
              <span className="absolute inset-y-0 left-1/2 w-px bg-line/15" />
              {p.ret1y != null && (
                <span
                  className={clsx("absolute top-1/2 h-3 -translate-y-1/2", p.ret1y >= 0 ? "rounded-r-[4px] bg-up/80" : "rounded-l-[4px] bg-down/80")}
                  style={{ [p.ret1y >= 0 ? "left" : "right"]: "50%", width: `${(Math.abs(p.ret1y) / max) * 50}%` } as React.CSSProperties}
                />
              )}
            </span>
            <span className={clsx("num text-right font-medium", (p.ret1y ?? 0) >= 0 ? "text-up" : "text-down")}>{fmtPct(p.ret1y, 0, true)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function FilingsCard({ d }: { d: Dossier }) {
  const [tab, setTab] = useState<"reports" | "insider">("reports");
  if (!d.filings.length) return null;
  const reports = d.filings.filter((f) => f.form !== "4");
  const insider = d.filings.filter((f) => f.form === "4");
  const list = tab === "reports" ? reports : insider;
  const color: Record<string, string> = { "10-K": "text-accent", "10-Q": "text-accent", "8-K": "text-warn", "4": "text-mute" };
  return (
    <Card
      title="SEC filings"
      right={
        <div className="flex items-center gap-1">
          <button onClick={() => setTab("reports")} className={clsx("tab", tab === "reports" && "tab-on")}>Reports {reports.length}</button>
          <button onClick={() => setTab("insider")} className={clsx("tab", tab === "insider" && "tab-on")}>Insider {insider.length}</button>
          <a className="tab flex items-center gap-1" href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${d.fundamentals?.cik ?? ""}&owner=include&count=40`} target="_blank" rel="noreferrer" aria-label="Open in EDGAR"><ExternalLink size={12} /></a>
        </div>
      }
    >
      <div className="max-h-[340px] space-y-0.5 overflow-y-auto pr-1">
        {list.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-line/5">
            <FileText size={15} className={clsx("shrink-0", color[f.form] ?? "text-mute")} />
            <span className="num w-14 shrink-0 text-xs font-semibold">{f.form}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink/80">{f.form === "4" ? "Insider transaction (Form 4)" : f.description === f.form ? FORM_LABEL[f.form] ?? f.form : f.description}</span>
            <span className="num shrink-0 text-[11px] text-mute">{f.filed}</span>
          </a>
        ))}
        {list.length === 0 && <div className="py-6 text-center text-sm text-mute">None in recent filings.</div>}
      </div>
    </Card>
  );
}

const FORM_LABEL: Record<string, string> = { "10-K": "Annual report", "10-Q": "Quarterly report", "8-K": "Material event / current report", "DEF 14A": "Proxy statement", "20-F": "Annual report (foreign)", "6-K": "Foreign issuer report" };
