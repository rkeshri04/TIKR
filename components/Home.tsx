"use client";
import Link from "next/link";
import { BarChart3, Brain, FileSearch, Newspaper, Star, History, Gauge } from "lucide-react";
import Header from "./Header";
import SearchBox from "./SearchBox";
import { useRecent, useWatchlist } from "./watchlist";

const POPULAR = ["NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "META", "GOOGL", "AMD", "PLTR", "JPM", "BRK-B", "BTC-USD"];

const FEATURES = [
  { icon: Brain, title: "AI analyst note", body: "Claude reads the whole dossier, runs its own web searches, and writes a full research note with a verdict and fair-value range." },
  { icon: Newspaper, title: "News intelligence", body: "Multiple Google News queries + Yahoo headlines, de-duplicated, sentiment-scored and tagged by topic." },
  { icon: FileSearch, title: "SEC fundamentals", body: "Revenue, margins, cash flow, balance sheet and ratios straight from EDGAR XBRL filings — no paid API." },
  { icon: BarChart3, title: "Pro charting", body: "Intraday to max-history candles with volume, SMA 50/200 and Bollinger overlays." },
  { icon: Gauge, title: "Quant scorecard", body: "Momentum, trend, value, quality, growth, sentiment and safety rolled into one 0–100 score." },
];

function List({ title, icon: Icon, items }: { title: string; icon: typeof Star; items: { symbol: string; name: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="eyebrow mb-2 flex items-center gap-1.5"><Icon size={12} /> {title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Link key={i.symbol} href={`/t/${encodeURIComponent(i.symbol)}`} className="chip !px-2.5 !py-1.5 text-ink/85 transition-colors hover:!text-ink hover:bg-panel" title={i.name}>
            <span className="num font-semibold">{i.symbol}</span>
            <span className="max-w-[140px] truncate text-mute">{i.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const watch = useWatchlist();
  const recent = useRecent();
  return (
    <div className="min-h-screen">
      <Header search={false} />
      <main className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        <section className="relative z-20 pt-20 text-center sm:pt-28">
          <div className="eyebrow mb-5">Equity research platform</div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-[56px] sm:leading-[1.05]">
            Research any stock
            <br />
            <span className="text-mute">in seconds, not hours.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-mute sm:text-lg">
            Type a ticker. TIKR pulls prices, filings and every recent headline, crunches the numbers, then an AI analyst writes you a full research note.
          </p>
          <div className="relative z-30 mx-auto mt-10 max-w-2xl text-left">
            <SearchBox big autoFocus />
          </div>
          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
            {POPULAR.map((s) => (
              <Link key={s} href={`/t/${s}`} className="chip num !px-2.5 !py-1 transition-colors hover:bg-panel hover:!text-ink">{s}</Link>
            ))}
          </div>
        </section>

        {(watch.length > 0 || recent.length > 0) && (
          <section className="card mt-14 space-y-5 p-5 text-left">
            <List title="Watchlist" icon={Star} items={watch} />
            <List title="Recently viewed" icon={History} items={recent} />
          </section>
        )}

        <section className="mt-20 grid gap-px overflow-hidden rounded-lg border bg-line/10 hairline sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-panel p-6">
              <div className="grid h-9 w-9 place-items-center rounded-md border bg-raised text-ink hairline"><f.icon size={17} strokeWidth={1.75} /></div>
              <div className="mt-4 font-semibold">{f.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{f.body}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center bg-panel p-6">
            <div className="text-sm text-mute">Works with</div>
            <div className="mt-2 text-sm leading-relaxed text-ink/85">US & global equities, ETFs, indices, crypto, futures and FX — anything with a Yahoo Finance symbol.</div>
          </div>
        </section>
        <p className="mt-16 text-center text-xs text-mute">For research and education only. Not investment advice.</p>
      </main>
    </div>
  );
}
