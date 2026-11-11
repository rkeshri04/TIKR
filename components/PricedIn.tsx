"use client";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Bookmark, Check, CircleSlash, Info, Trash2, X } from "lucide-react";
import type { Dossier } from "@/lib/types";
import { fcfPath } from "@/lib/dcf";
import { fmtBig, fmtNum, fmtPct } from "@/lib/format";
import { Card } from "./Panels";
import { deleteThesis, evaluate, fairValue, saveThesis, stanceOf, useTheses, type Status } from "./thesis";

const VERDICT_COPY: Record<string, string> = {
  undemanding: "Undemanding",
  "in line": "In line with history",
  demanding: "Demanding",
  heroic: "Heroic",
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function Slider({ label, value, min, max, step, onChange, hint }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink/85">{label}</span>
        <span className="num font-medium text-ink">{pct(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[rgb(var(--accent))]"
        aria-label={label}
      />
      {hint && <div className="text-[11px] text-mute">{hint}</div>}
    </label>
  );
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">{label}</div>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded" style={{ background: p.color }} />
          <span className="text-mute">{p.name}</span>
          <span className="num ml-auto pl-3 font-medium">{fmtBig(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PricedIn({ d }: { d: Dossier }) {
  const e = d.expectations;
  const theses = useTheses();
  const saved = theses[d.symbol];
  const implied = e?.implied ?? null;
  // Same yardstick as the verdict: the more generous of FCF and revenue growth.
  const recBasis = !e ? null : e.history.fcfCagr != null && (e.history.revCagr == null || e.history.fcfCagr >= e.history.revCagr) ? "fcf" : e.history.revCagr != null ? "rev" : null;
  const record = !e || !recBasis ? null : recBasis === "fcf" ? e.history.fcfCagr : e.history.revCagr;
  const shortName = d.quote.name.replace(/^the\s+/i, "").split(/[ ,]/)[0];

  const defaults = useMemo(() => {
    const base = record != null ? Math.max(-0.05, Math.min(0.25, record)) : 0.05;
    return { g1: Math.round(base * 200) / 200, g2: Math.round(base * 100) / 200, r: e ? Math.round(e.r * 200) / 200 : 0.09, gT: e?.gT ?? 0.025 };
  }, [record, e]);
  const [a, setA] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [floor, setFloor] = useState("");

  // Start from the saved thesis if there is one, else from the track record.
  useEffect(() => {
    setA(saved ? { g1: saved.g1, g2: saved.g2, r: saved.r, gT: saved.gT } : defaults);
  }, [d.symbol, saved, defaults]);

  if (!e) return null;
  if (!e.supported) {
    return (
      <Card title="What's priced in">
        <div className="flex gap-3 text-sm text-ink/85">
          <Info size={16} className="mt-0.5 shrink-0 text-mute" />
          <p>{e.reason}</p>
        </div>
      </Card>
    );
  }

  const price = d.quote.price;
  const yours = fairValue(d, a);
  const upside = yours ? yours / price - 1 : null;
  const lastYear = e.history.fcfSeries.at(-1)?.year ?? new Date().getFullYear();

  // Chart: actual annual FCF, then forward paths.
  const impliedPath = implied != null ? fcfPath(e.fcf0, implied, implied) : [];
  const yourPath = fcfPath(e.fcf0, a.g1, a.g2);
  const rows = [
    ...e.history.fcfSeries.map((p, i, arr) => ({
      year: `FY${p.year}`,
      actual: p.value,
      // Connect forward lines to the last actual point.
      implied: i === arr.length - 1 ? e.fcf0 : null,
      yours: i === arr.length - 1 ? e.fcf0 : null,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({ year: `FY${lastYear + i + 1}`, actual: null, implied: impliedPath[i] ?? null, yours: yourPath[i] })),
  ];

  const presets: [string, typeof a][] = [
    ["Track record", defaults],
    ...(implied != null ? ([["Market-implied", { ...a, g1: implied, g2: implied }]] as [string, typeof a][]) : []),
    ["Bear case", { ...a, g1: Math.min(defaults.g1 / 2, 0.03), g2: Math.min(defaults.g2 / 2, 0.02) }],
  ];

  const doSave = () => {
    if (!yours) return;
    saveThesis({
      symbol: d.symbol,
      name: d.quote.name,
      savedAt: Date.now(),
      price,
      ...a,
      fairValue: yours,
      note: note.trim(),
      floor: floor ? Number(floor) || null : null,
      stance: yours >= price ? "bull" : "bear",
      revGrowth: d.fundamentals?.ratios.revenueGrowth ?? null,
      fcfMargin: e.fcfMargin,
      sentiment: d.newsStats.avg,
      implied,
    });
    setSaving(false);
  };

  return (
    <Card
      title="What's priced in"
      right={
        <div className="flex items-center gap-2">
          <a href="/guide#priced-in" className="text-[11px] text-mute underline decoration-line/30 underline-offset-2 hover:text-ink">How to read this</a>
          {e.verdict && <span className="chip text-ink">{VERDICT_COPY[e.verdict]}</span>}
        </div>
      }
    >
      {/* Headline: the price, translated into a forecast */}
      <p className="text-[17px] leading-snug text-ink">
        At <span className="num font-semibold">{fmtNum(price)}</span>, the market is pricing in{" "}
        {implied != null ? (
          <>
            <span className="num font-semibold">{pct(implied)}</span> annual free-cash-flow growth for the next 10 years
          </>
        ) : (
          <>growth above 150% a year — not a meaningful forecast</>
        )}
        {record != null && (
          <>
            . {shortName}&apos;s own track record is{" "}
            <span className="num font-semibold">{pct(record)}</span>
            {recBasis === "fcf" ? ` (${e.history.fcfYears}-yr FCF CAGR)` : ` (${e.history.revYears}-yr revenue CAGR)`}
          </>
        )}
        .
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile k="Market-implied growth" v={implied != null ? pct(implied) : "> 150%"} sub="10-yr FCF CAGR" />
        <Tile k="FCF track record" v={e.history.fcfCagr != null ? pct(e.history.fcfCagr) : "—"} sub={e.history.fcfYears ? `${e.history.fcfYears}-yr CAGR` : "not enough history"} />
        <Tile k="Revenue track record" v={e.history.revCagr != null ? pct(e.history.revCagr) : "—"} sub={e.history.revYears ? `${e.history.revYears}-yr CAGR` : "—"} />
        <Tile
          k="Implied FCF in year 10"
          v={fmtBig(e.impliedFcf10)}
          sub={e.impliedFcf10 ? `${(e.impliedFcf10 / e.fcf0).toFixed(1)}× today's ${fmtBig(e.fcf0)}` : undefined}
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="h-[250px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--line) / 0.06)" />
              <XAxis dataKey="year" stroke="rgb(var(--mute))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis stroke="rgb(var(--mute))" fontSize={11} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => fmtBig(v).replace(/\.\d+(?=[TBMK])/, "")} />
              <ReferenceLine x={`FY${lastYear}`} stroke="rgb(var(--line) / 0.25)" strokeDasharray="3 3" label={{ value: "today", position: "insideTopRight", fontSize: 10, fill: "rgb(var(--mute))" }} />
              <Tooltip content={<Tip />} />
              <Legend
                content={() => (
                  <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-mute">
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-ink/60" /> Actual FCF</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: "rgb(var(--s2))" }} /> What the price needs</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: "rgb(var(--s1))" }} /> Your view</span>
                  </div>
                )}
              />
              <Line dataKey="actual" name="Actual FCF" stroke="rgb(var(--ink) / 0.6)" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: "rgb(var(--ink) / 0.6)" }} connectNulls={false} isAnimationActive={false} />
              <Line dataKey="implied" name="What the price needs" stroke="rgb(var(--s2))" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Line dataKey="yours" name="Your view" stroke="rgb(var(--s1))" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3.5">
          <div className="eyebrow">Your view</div>
          <Slider label="FCF growth, years 1–5" value={a.g1} min={-0.15} max={0.5} step={0.005} onChange={(v) => setA({ ...a, g1: v })} />
          <Slider label="FCF growth, years 6–10" value={a.g2} min={-0.15} max={0.4} step={0.005} onChange={(v) => setA({ ...a, g2: v })} />
          <Slider label="Discount rate" value={a.r} min={0.06} max={0.16} step={0.0025} onChange={(v) => setA({ ...a, r: v })} />
          <Slider label="Terminal growth" value={a.gT} min={0} max={0.04} step={0.0025} onChange={(v) => setA({ ...a, gT: Math.min(v, a.r - 0.01) })} />
          <div className="flex flex-wrap gap-1">
            {presets.map(([label, p]) => (
              <button key={label} onClick={() => setA(p)} className="tab border hairline">{label}</button>
            ))}
          </div>
          <div className="rounded-md border bg-raised p-3 hairline">
            <div className="text-[11px] text-mute">Your fair value</div>
            <div className="num text-2xl font-semibold">{yours ? fmtNum(yours) : "—"}</div>
            {upside != null && (
              <div className={clsx("num text-xs font-medium", upside >= 0 ? "text-up" : "text-down")}>
                {upside >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(upside), 1)} {upside >= 0 ? "upside" : "downside"} vs. price
              </div>
            )}
          </div>
          {(() => {
            const rg = d.fundamentals?.ratios.revenueGrowth;
            if (rg == null || Math.abs(a.g1 - rg) < 0.07) return null;
            return (
              <div className="flex gap-2 rounded-md border border-l-2 border-l-warn p-2.5 text-[11px] leading-snug text-mute hairline">
                <AlertTriangle size={13} className="mt-px shrink-0 text-warn" />
                <span>
                  Reality check: your {pct(a.g1)} is {a.g1 > rg ? "well above" : "well below"} the latest reported revenue growth of{" "}
                  <span className="num text-ink">{fmtPct(rg, 1, true)}</span>. A tripwire will flag this from day one.
                </span>
              </div>
            );
          })()}
          {!saving ? (
            <button className="btn-primary w-full" onClick={() => setSaving(true)} disabled={!yours}>
              <Bookmark size={14} /> {saved ? "Update my thesis" : `Save as my ${yours && yours < price ? "bearish " : ""}thesis`}
            </button>
          ) : (
            <div className="space-y-2 rounded-md border p-3 hairline">
              <textarea
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                placeholder="Why do you believe this? (optional)"
                rows={2}
                className="field w-full resize-none px-2.5 py-2 text-[13px]"
              />
              <input
                value={floor}
                onChange={(ev) => setFloor(ev.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={`Reconsider if price ${yours && yours >= price ? "falls below" : "rises above"}… (optional)`}
                inputMode="decimal"
                className="field h-9 w-full px-2.5 text-[13px]"
              />
              <div className="flex gap-2">
                <button className="btn-primary flex-1" onClick={doSave}>Save thesis</button>
                <button className="btn-ghost" onClick={() => setSaving(false)} aria-label="Cancel"><X size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      <details className="mt-4 text-xs text-mute">
        <summary className="cursor-pointer select-none hover:text-ink">How this is calculated</summary>
        <div className="mt-2 space-y-1.5 leading-relaxed">
          <p>
            A reverse discounted-cash-flow model. We take today&apos;s enterprise value (market cap {fmtBig(e.marketCap)} {e.netDebt >= 0 ? "+" : "−"} net {e.netDebt >= 0 ? "debt" : "cash"} {fmtBig(Math.abs(e.netDebt))} = {fmtBig(e.ev)}) and solve for the constant 10-year growth in free cash flow
            (TTM {fmtBig(e.fcf0)}, from SEC filings) that makes discounted future cash flows equal that value, with {pct(e.gT)} growth after year 10.
          </p>
          <p>
            Discount rate {pct(e.r)} = live 10-year Treasury {pct(e.riskFree)} + beta {fmtNum(e.beta)} × {pct(e.erp)} equity risk premium (beta clamped to 0.6–2.0, rate to 7–14%).
            Track record compares against the higher of the company&apos;s FCF and revenue growth. Lumpy cash flow, buybacks and stock-based compensation aren&apos;t adjusted for. This is a lens, not a price target.
          </p>
        </div>
      </details>
    </Card>
  );
}

function Tile({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-bg/40 p-3 hairline">
      <div className="truncate text-[11px] text-mute">{k}</div>
      <div className="num mt-1 truncate text-[17px] font-semibold">{v}</div>
      {sub && <div className="truncate text-[11px] text-mute">{sub}</div>}
    </div>
  );
}

const ICON: Record<Status, React.ReactNode> = {
  ok: <Check size={14} className="text-up" aria-label="on track" />,
  watch: <AlertTriangle size={14} className="text-warn" aria-label="watch" />,
  broken: <CircleSlash size={14} className="text-down" aria-label="tripped" />,
};
export const STATUS_COPY: Record<Status, string> = { ok: "On track", watch: "Needs a look", broken: "Tripwire hit" };

export function ThesisCard({ d }: { d: Dossier }) {
  const theses = useTheses();
  const t = theses[d.symbol];
  if (!t) return null;
  const { checks, overall, fairNow } = evaluate(t, d);
  const since = d.quote.price / t.price - 1;
  return (
    <Card
      title="Thesis tripwires"
      right={
        <div className="flex items-center gap-2">
          <a href="/guide#tripwires" className="text-[11px] text-mute underline decoration-line/30 underline-offset-2 hover:text-ink">Help</a>
          <span className="chip">{stanceOf(t) === "bull" ? "▲ Bullish" : "▼ Bearish"}</span>
          <span className="chip text-ink">{ICON[overall]} {STATUS_COPY[overall]}</span>
          <button onClick={() => confirm(`Delete your ${d.symbol} thesis?`) && deleteThesis(d.symbol)} className="tab" aria-label="Delete thesis"><Trash2 size={13} /></button>
        </div>
      }
    >
      <div className="num mb-4 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border bg-bg/40 p-2.5 hairline"><div className="text-mute">Saved</div><div className="mt-0.5 text-sm font-medium">{new Date(t.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div></div>
        <div className="rounded-md border bg-bg/40 p-2.5 hairline"><div className="text-mute">Price since</div><div className={clsx("mt-0.5 text-sm font-medium", since >= 0 ? "text-up" : "text-down")}>{since >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(since), 1)}</div></div>
        <div className="rounded-md border bg-bg/40 p-2.5 hairline"><div className="text-mute">Your value now</div><div className="mt-0.5 text-sm font-medium">{fmtNum(fairNow)}</div></div>
      </div>
      {t.note && <p className="mb-3 border-l-2 pl-3 text-[13px] italic text-ink/80 hairline">“{t.note}”</p>}
      <ul className="divide-y hairline">
        {checks.map((c) => (
          <li key={c.label} className="flex gap-3 py-2.5 hairline">
            <span className="mt-0.5">{ICON[c.status]}</span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{c.label}</div>
              <div className="text-xs text-mute">{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-mute">Checks rerun against the latest filings, price and news every time you open this page. Saved in this browser only.</p>
    </Card>
  );
}
