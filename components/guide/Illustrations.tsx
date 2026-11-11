// Picture representations for the guide. These are simplified drawings of
// the real tools, built from the same design tokens so they match the app in
// both themes (and never go stale the way screenshots of live data would).
import clsx from "clsx";
import { AlertTriangle, Bookmark, Check, CircleSlash, CornerDownLeft, Search, Send, Sparkles, Star } from "lucide-react";

/** Numbered callout that matches the numbered steps in the text. */
export function Pin({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={clsx(
        "absolute z-10 grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white ring-2 ring-panel",
        className,
      )}
      aria-label={`Callout ${n}`}
    >
      {n}
    </span>
  );
}

export function Frame({ children, caption, className }: { children: React.ReactNode; caption: string; className?: string }) {
  return (
    <figure className="my-5">
      <div className={clsx("relative overflow-hidden rounded-lg border bg-bg p-4 hairline sm:p-6", className)}>{children}</div>
      <figcaption className="mt-2 text-xs text-mute">{caption}</figcaption>
    </figure>
  );
}

/* ---------- 1. Search ---------- */
export function SearchMock() {
  const rows = [
    ["AAPL", "Apple Inc.", "NASDAQ", "Equity"],
    ["AAPL.MX", "Apple Inc.", "Mexico", "Equity"],
    ["APLE", "Apple Hospitality REIT", "NYSE", "Equity"],
  ];
  return (
    <Frame caption="Type a company name or ticker, then press Enter or click a result.">
      <div className="relative mx-auto max-w-md">
        <div className="field flex h-11 items-center gap-3 px-3 !border-accent" style={{ boxShadow: "0 0 0 1px rgb(var(--accent))" }}>
          <Search size={16} className="text-mute" />
          <span className="text-sm">apple</span>
          <span className="h-4 w-px animate-pulse bg-ink" />
          <kbd className="ml-auto rounded border px-1.5 py-0.5 text-[10px] text-mute hairline">⌘K</kbd>
        </div>
        <Pin n={1} className="-left-2 -top-2" />
        <Pin n={3} className="-right-2 -top-2" />
        <div className="card relative mt-1 p-1">
          {rows.map((r, i) => (
            <div key={r[0]} className={clsx("flex items-center gap-3 rounded px-3 py-2 text-[13px]", i === 0 && "bg-raised")}>
              <span className="num w-16 font-semibold">{r[0]}</span>
              <span className="flex-1 truncate text-ink/80">{r[1]}</span>
              <span className="hidden text-[11px] text-mute sm:block">{r[2]}</span>
              <span className="chip">{r[3]}</span>
              {i === 0 && <CornerDownLeft size={13} className="text-mute" />}
            </div>
          ))}
          <Pin n={2} className="-left-2 top-2" />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 2. Header ---------- */
export function HeaderMock() {
  return (
    <Frame caption="The top of every stock page: the ticker, the company, and the live price.">
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="num text-3xl font-semibold">AAPL</span>
            <span className="relative grid h-7 w-7 place-items-center rounded-md border text-mute hairline">
              <Star size={13} />
              <Pin n={1} className="-right-3 -top-3" />
            </span>
            <span className="chip">NasdaqGS</span>
            <span className="chip">Technology</span>
          </div>
          <div className="mt-1 text-mute">Apple Inc.</div>
        </div>
        <div className="relative text-right">
          <div className="num text-4xl font-semibold"><span className="mr-1 text-xl font-normal text-mute">$</span>354.76</div>
          <div className="num mt-1 text-sm font-medium text-up">▲ 6.25 (+1.79%) <span className="font-normal text-mute">Nov 11, 1:09 PM</span></div>
          <Pin n={2} className="-left-6 bottom-0" />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 3. Price chart ---------- */
const PRICE = "M0,120 C30,110 40,128 70,112 S110,96 130,104 S170,80 200,86 S240,60 270,66 S320,40 350,46 S400,24 440,20";
const SMA50 = "M0,118 C60,114 100,104 150,98 S230,80 270,72 S350,52 440,34";
const SMA200 = "M0,130 C80,126 160,116 220,106 S340,86 440,70";

export function ChartMock() {
  return (
    <Frame caption="Pick a time range, switch between a simple line and candles, and turn the average lines on or off.">
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"].map((r) => (
            <span key={r} className={clsx("tab", r === "1Y" && "tab-on")}>{r}</span>
          ))}
          <span className="ml-auto flex gap-1">
            <span className="tab tab-on flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: "rgb(var(--s2))" }} />SMA 50</span>
            <span className="tab tab-on flex items-center gap-1.5"><span className="h-0.5 w-3 rounded" style={{ background: "rgb(var(--s1))" }} />SMA 200</span>
            <span className="tab tab-on">Line</span>
            <span className="tab">Candles</span>
          </span>
        </div>
        <Pin n={1} className="-left-5 top-1" />
        <Pin n={2} className="-right-5 top-1" />
        <svg viewBox="0 0 440 150" className="h-40 w-full" preserveAspectRatio="none" aria-hidden>
          {[30, 70, 110].map((y) => <line key={y} x1="0" x2="440" y1={y} y2={y} stroke="rgb(var(--line) / 0.07)" />)}
          <path d={`${PRICE} L440,150 L0,150 Z`} fill="rgb(var(--up) / 0.1)" />
          <path d={SMA200} fill="none" stroke="rgb(var(--s1))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={SMA50} fill="none" stroke="rgb(var(--s2))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={PRICE} fill="none" stroke="rgb(var(--up))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <line x1="270" x2="270" y1="0" y2="150" stroke="rgb(var(--mute) / 0.5)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        <Pin n={3} className="left-[61%] top-12" />
        <div className="num mt-1 flex gap-3 text-[11px] text-mute">
          <span>Sep 3</span><span>O 312.40</span><span>H 318.02</span><span>L 310.11</span><span>C 316.80</span>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 4. Score ---------- */
export function ScoreMock() {
  const rows: [string, number][] = [["Momentum", 81], ["Value", 34], ["Quality", 75], ["Safety", 90]];
  const R = 40, C = 2 * Math.PI * R;
  return (
    <Frame caption="One overall number, plus the pieces it is made of. Longer bars are better.">
      <div className="relative mx-auto flex max-w-md items-center gap-6">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-raised" />
            <circle cx="50" cy="50" r={R} fill="none" strokeWidth="7" className="stroke-accent" strokeDasharray={`${0.7 * C} ${C}`} />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><div className="num text-3xl font-semibold leading-none">70</div><div className="mt-1 text-[10px] text-mute">Favorable</div></div>
          </div>
          <Pin n={1} className="-left-1 -top-1" />
        </div>
        <div className="relative flex-1 space-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-xs"><span className="text-ink/80">{k}</span><span className="num">{v}</span></div>
              <div className="mt-1 h-1 rounded-sm bg-raised"><div className="h-full rounded-sm bg-accent" style={{ width: `${v}%` }} /></div>
            </div>
          ))}
          <Pin n={2} className="-left-6 top-0" />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 5. RSI gauge ---------- */
export function RsiMock({ value = 60 }: { value?: number }) {
  const ang = Math.PI * (1 - value / 100);
  const nx = 60 + 44 * Math.cos(ang), ny = 60 - 44 * Math.sin(ang);
  return (
    <Frame caption="The RSI dial: below 30 the stock has fallen hard and fast; above 70 it has risen hard and fast.">
      <div className="grid items-center gap-6 sm:grid-cols-[200px_1fr]">
        <div className="relative text-center">
          <svg viewBox="0 0 120 72" className="mx-auto w-[200px]" aria-hidden>
            <path d="M10 60 A50 50 0 0 1 40 14.2" fill="none" strokeWidth="6" className="stroke-line/25" />
            <path d="M41.5 13.6 A50 50 0 0 1 78.5 13.6" fill="none" strokeWidth="6" className="stroke-raised" />
            <path d="M80 14.2 A50 50 0 0 1 110 60" fill="none" strokeWidth="6" className="stroke-line/25" />
            <text x="27" y="10" fontSize="7" className="fill-mute">30</text>
            <text x="85" y="10" fontSize="7" className="fill-mute">70</text>
            <line x1="60" y1="60" x2={nx} y2={ny} strokeWidth="2" strokeLinecap="round" className="stroke-ink" />
            <circle cx="60" cy="60" r="3.5" className="fill-ink" />
          </svg>
          <div className="num -mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="grid gap-2 text-[13px]">
          <ZoneRow range="0 – 30" title="Oversold" body="Fell a lot, quickly. Sometimes bounces back." />
          <ZoneRow range="30 – 70" title="Normal zone" body="Nothing unusual is happening." />
          <ZoneRow range="70 – 100" title="Overbought" body="Rose a lot, quickly. Sometimes cools off." />
        </div>
      </div>
    </Frame>
  );
}
function ZoneRow({ range, title, body }: { range: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-md border bg-panel p-2.5 hairline">
      <span className="num w-16 shrink-0 text-mute">{range}</span>
      <span><b className="font-medium">{title}.</b> <span className="text-mute">{body}</span></span>
    </div>
  );
}

/* ---------- 6. What's priced in ---------- */
export function PricedInMock() {
  // Actual history (dots), then the two forward paths.
  const actual = [[0, 120], [30, 116], [60, 110], [90, 112], [120, 104]];
  return (
    <Frame caption="Gray dots are what the company actually earned. The dashed orange line is what today's price needs. The blue line is what you believe.">
      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <p className="mb-3 text-[15px] leading-snug">
            At <b className="num">354.76</b>, the market is pricing in <b className="num">11.7%</b> growth a year. Apple&apos;s own record is <b className="num">7.9%</b>.
          </p>
          <Pin n={1} className="-left-5 top-0" />
          <svg viewBox="0 0 300 140" className="h-40 w-full" aria-hidden>
            {[30, 70, 110].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgb(var(--line) / 0.07)" />)}
            <line x1="120" x2="120" y1="0" y2="140" stroke="rgb(var(--line) / 0.25)" strokeDasharray="3 3" />
            <text x="124" y="10" fontSize="8" className="fill-mute">today</text>
            <polyline points={actual.map((p) => p.join(",")).join(" ")} fill="none" stroke="rgb(var(--ink) / 0.6)" strokeWidth="2" />
            {actual.map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="rgb(var(--ink) / 0.6)" />)}
            <path d="M120,104 C180,96 240,60 300,14" fill="none" stroke="rgb(var(--s2))" strokeWidth="2" strokeDasharray="5 4" />
            <path d="M120,104 C180,98 240,84 300,70" fill="none" stroke="rgb(var(--s1))" strokeWidth="2" />
          </svg>
          <Pin n={2} className="right-1 top-14" />
          <div className="flex flex-wrap gap-4 text-[11px] text-mute">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-ink/60" />Actual</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: "rgb(var(--s2))" }} />What the price needs</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: "rgb(var(--s1))" }} />Your view</span>
          </div>
        </div>
        <div className="relative space-y-3">
          <div className="eyebrow">Your view</div>
          {[["Growth, years 1–5", 8, 45], ["Growth, years 6–10", 4, 30]].map(([l, v, w]) => (
            <div key={l as string}>
              <div className="flex justify-between text-xs"><span>{l}</span><span className="num">{v}.0%</span></div>
              <div className="relative mt-2 h-1 rounded bg-raised">
                <div className="h-full rounded bg-accent" style={{ width: `${w}%` }} />
                <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-bg" style={{ left: `${w}%` }} />
              </div>
            </div>
          ))}
          <Pin n={3} className="-left-5 top-7" />
          <div className="relative rounded-md border bg-raised p-3 hairline">
            <div className="text-[11px] text-mute">Your fair value</div>
            <div className="num text-xl font-semibold">229.59</div>
            <div className="num text-xs text-down">▼ 35.3% downside vs. price</div>
            <Pin n={4} className="-right-2 -top-2" />
          </div>
          <div className="btn-primary w-full !py-1.5 text-xs"><Bookmark size={13} /> Save as my thesis</div>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 7. Tripwires ---------- */
export function TripwireMock() {
  const rows: [React.ReactNode, string, string][] = [
    [<Check key="a" size={14} className="text-up" />, "Growth is keeping pace", "Revenue +15.1% vs. your 12% assumption."],
    [<AlertTriangle key="b" size={14} className="text-warn" />, "Upside to your value", "Price is 6% above your value of 335."],
    [<CircleSlash key="c" size={14} className="text-down" />, "Above your reconsider price", "Price 288 vs. your line at 300."],
  ];
  return (
    <Frame caption="Each saved belief becomes a check: a green tick is fine, a yellow triangle needs a look, a red circle means a tripwire was hit.">
      <div className="relative mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <span className="card-title">Thesis tripwires</span>
          <span className="flex gap-1.5"><span className="chip">▲ Bullish</span><span className="chip text-ink"><CircleSlash size={12} className="text-down" /> Tripwire hit</span></span>
        </div>
        <Pin n={1} className="-right-2 -top-3" />
        <ul className="divide-y rounded-md border bg-panel px-3 hairline">
          {rows.map(([icon, l, d]) => (
            <li key={l} className="flex gap-3 py-2.5 hairline">
              <span className="mt-0.5">{icon}</span>
              <div><div className="text-[13px] font-medium">{l}</div><div className="text-xs text-mute">{d}</div></div>
            </li>
          ))}
        </ul>
        <Pin n={2} className="-left-2 top-12" />
      </div>
    </Frame>
  );
}

/* ---------- 8. AI note ---------- */
export function ReportMock() {
  return (
    <Frame caption="The research note starts with a rating and a fair-value range, then explains the reasoning section by section.">
      <div className="relative mx-auto max-w-xl">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md border bg-raised hairline"><Sparkles size={14} /></span>
          <span className="text-sm font-semibold">AI Research Note</span>
        </div>
        <div className="relative mt-3 grid gap-3 rounded-md border bg-panel p-3 hairline sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="rounded-md border bg-raised px-3 py-1.5 text-center hairline">
            <div className="eyebrow">Rating</div>
            <div className="font-semibold text-up"><span className="mr-1 text-[10px]">▲</span>Buy</div>
          </div>
          <div className="text-[13px] text-ink/85">Strong cash flow and an uptrend; valuation already rich.</div>
          <div className="num text-right text-xs text-mute">Fair value<div className="text-sm font-semibold text-ink">338–427</div></div>
          <Pin n={1} className="-left-2 -top-2" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="text-[13px] font-semibold">Executive Summary</div>
          {[92, 80, 86, 60].map((w) => <div key={w} className="h-2.5 rounded bg-line/10" style={{ width: `${w}%` }} />)}
        </div>
        <div className="relative mt-5 flex gap-2">
          <div className="field flex h-9 flex-1 items-center px-3 text-[13px] text-mute">What are the biggest risks for Apple?</div>
          <span className="btn-primary !px-3"><Send size={14} /></span>
          <Pin n={2} className="-left-2 -top-2" />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 9. News ---------- */
export function NewsMock() {
  const bars = [2, 0, 3, -1, 1, 4, -2, 2, 5, -3, 3, 6, -1, 4];
  return (
    <Frame caption="Bars above the line are good-news headlines on that day; bars below are bad-news headlines.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative">
          <div className="text-xl font-semibold text-up">Positive</div>
          <div className="text-xs text-mute">34 bullish · 76 neutral · 10 bearish</div>
          <svg viewBox="0 0 140 60" className="mt-3 h-20 w-full" preserveAspectRatio="none" aria-hidden>
            <line x1="0" x2="140" y1="30" y2="30" stroke="rgb(var(--line) / 0.2)" />
            {bars.map((v, i) => (
              <rect key={i} x={i * 10 + 1} width="8" y={v >= 0 ? 30 - v * 4.5 : 30} height={Math.max(1, Math.abs(v) * 4.5)} rx="1.5" fill={v >= 0 ? "rgb(var(--up))" : "rgb(var(--down))"} />
            ))}
          </svg>
          <Pin n={1} className="-left-5 top-1" />
        </div>
        <div className="relative divide-y hairline">
          {[["China Renaissance upgrades Apple to ‘Buy’", "bullish"], ["iPhone wait times trending lower, UBS says", "bearish"], ["Apple to hold product event next week", "neutral"]].map(([t, l]) => (
            <div key={t} className="flex gap-3 py-2 hairline">
              <span className="flex-1 text-[13px]">{t}</span>
              <span className={clsx("whitespace-nowrap text-[11px] font-medium capitalize", l === "bullish" ? "text-up" : l === "bearish" ? "text-down" : "text-mute")}>
                {l === "bullish" ? "▲ " : l === "bearish" ? "▼ " : ""}{l}
              </span>
            </div>
          ))}
          <Pin n={2} className="-right-6 top-2" />
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 10. Fundamentals ---------- */
export function FundamentalsMock() {
  const years = [[2022, 62, 16, 18], [2023, 60, 15, 17], [2024, 62, 15, 17], [2025, 66, 18, 19], [2026, 76, 21, 22]];
  return (
    <Frame caption="Each group of bars is one year: money coming in (revenue), profit kept, and cash left over after investing.">
      <div className="relative">
        <div className="mb-2 flex justify-end gap-1">
          <span className="tab tab-on">Income</span><span className="tab">Margins</span><span className="tab">EPS</span>
        </div>
        <svg viewBox="0 0 300 110" className="h-40 w-full" aria-hidden>
          {[25, 55, 85].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgb(var(--line) / 0.07)" />)}
          {years.map(([y, a, b, c], i) => {
            const x = 18 + i * 58;
            return (
              <g key={y}>
                {[a, b, c].map((v, j) => (
                  <rect key={j} x={x + j * 12} y={100 - v * 1.15} width="10" height={v * 1.15} rx="2" fill={`rgb(var(--s${j + 1}))`} />
                ))}
                <text x={x + 17} y="109" fontSize="7" textAnchor="middle" className="fill-mute">{y}</text>
              </g>
            );
          })}
        </svg>
        <div className="mt-1 flex justify-center gap-4 text-[11px] text-mute">
          {["Revenue", "Net income", "Free cash flow"].map((l, i) => (
            <span key={l} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: `rgb(var(--s${i + 1}))` }} />{l}</span>
          ))}
        </div>
        <Pin n={1} className="-right-5 top-1" />
      </div>
    </Frame>
  );
}
