"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, Star } from "lucide-react";
import type { Dossier } from "@/lib/types";
import { currencySymbol, fmtNum } from "@/lib/format";
import PriceChart from "./PriceChart";
import Fundamentals from "./Fundamentals";
import NewsFeed, { SentimentCard } from "./NewsFeed";
import AIReport, { AskAI, type AiInfo } from "./AIReport";
import { FilingsCard, KeyStats, PeersCard, Returns, ScoreCard, TechnicalsCard } from "./Panels";
import Header from "./Header";
import PricedIn, { ThesisCard } from "./PricedIn";
import { toggleWatch, useWatchlist, pushRecent } from "./watchlist";

type Payload = Dossier & { llm: boolean; ai?: AiInfo };

const SECTIONS = [
  ["overview", "Overview"],
  ["priced-in", "Priced in"],
  ["analysis", "AI analysis"],
  ["financials", "Financials"],
  ["news", "News"],
] as const;

export default function Dashboard({ symbol }: { symbol: string }) {
  const [d, setD] = useState<Payload | null>(null);
  const [err, setErr] = useState("");
  const watch = useWatchlist();

  useEffect(() => {
    let alive = true;
    setD(null);
    setErr("");
    fetch(`/api/dossier/${encodeURIComponent(symbol)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!alive) return;
        if (!r.ok) setErr(j.error || "Failed to load");
        else {
          setD(j);
          pushRecent({ symbol: j.symbol, name: j.quote.name });
          document.title = `${j.symbol} ${fmtNum(j.quote.price)} · TIKR`;
        }
      })
      .catch((e) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [symbol]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">
        {err ? (
          <div className="mx-auto mt-24 max-w-md text-center">
            <AlertTriangle className="mx-auto text-mute" size={32} />
            <h1 className="mt-4 text-xl font-semibold">{err}</h1>
            <p className="mt-2 text-sm text-mute">Check the symbol (e.g. AAPL, BRK-B, SHOP.TO, 7203.T, BTC-USD) or search by company name.</p>
            <Link href="/" className="btn-ghost mt-6"><ArrowLeft size={14} /> Back home</Link>
          </div>
        ) : !d ? (
          <Skeleton symbol={symbol} />
        ) : (
          <>
            <Hero d={d} starred={watch.some((w) => w.symbol === d.symbol)} />
            <nav className="sticky top-[93px] z-30 -mx-4 mb-5 mt-4 flex gap-1 overflow-x-auto border-b bg-bg px-4 py-2 hairline sm:-mx-6 sm:px-6">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="tab whitespace-nowrap">{label}</a>
              ))}
            </nav>
            {d.warnings.length > 0 && (
              <div className="mb-5 flex items-start gap-2 rounded-md border border-l-2 border-l-warn bg-panel px-4 py-3 text-sm text-ink/85 hairline">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
                <div>{d.warnings.join(" ")}</div>
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-8">
                <div id="overview" className="scroll-mt-28 space-y-5">
                  <PriceChart symbol={d.symbol} daily={d.candles} timezone={d.quote.timezone} previousClose={d.quote.previousClose} />
                  <Returns d={d} />
                </div>
                <div id="priced-in" className="scroll-mt-28">
                  <PricedIn d={d} />
                </div>
                <KeyStats d={d} />
                <div id="analysis" className="scroll-mt-28 space-y-5">
                  <AIReport d={d} llm={d.llm} ai={d.ai} />
                  <AskAI d={d} llm={d.llm} ai={d.ai} />
                </div>
                <div id="financials" className="scroll-mt-28">
                  <Fundamentals d={d} />
                </div>
                <div id="news" className="scroll-mt-28">
                  <NewsFeed d={d} />
                </div>
              </div>
              <aside className="space-y-5 lg:col-span-4">
                <ThesisCard d={d} />
                <ScoreCard d={d} />
                <TechnicalsCard d={d} />
                <SentimentCard d={d} />
                <PeersCard d={d} />
                <FilingsCard d={d} />
                <p className="px-1 text-[11px] leading-relaxed text-mute">
                  Data: Yahoo Finance (prices), SEC EDGAR (filings & XBRL financials), Google News RSS (headlines). Quotes may be delayed.
                  Generated {new Date(d.generatedAt).toLocaleTimeString()}.
                </p>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Hero({ d, starred }: { d: Payload; starred: boolean }) {
  const q = d.quote;
  const up = q.change >= 0;
  const cs = currencySymbol(q.currency);
  const t = new Date(q.marketTime);
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="num text-3xl font-semibold tracking-tight sm:text-4xl">{d.symbol}</h1>
          <button
            onClick={() => toggleWatch({ symbol: d.symbol, name: q.name })}
            className={clsx("grid h-8 w-8 place-items-center rounded-md border transition-colors hairline hover:bg-raised", starred ? "text-ink" : "text-mute hover:text-ink")}
            aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
            aria-pressed={starred}
          >
            <Star size={15} fill={starred ? "currentColor" : "none"} />
          </button>
          {q.exchange && <span className="chip text-mute">{q.exchange}</span>}
          {d.profile.sector && <span className="chip text-mute">{d.profile.sector}</span>}
          {d.profile.industry && <span className="chip hidden text-mute sm:inline-flex">{d.profile.industry}</span>}
        </div>
        <div className="mt-1 truncate text-mute">{q.name}</div>
      </div>
      <div className="text-right">
        <div className="num text-4xl font-semibold tracking-tight sm:text-5xl">
          <span className="mr-1 text-2xl font-normal text-mute">{cs.trim()}</span>
          {fmtNum(q.price, q.price < 1 ? 4 : 2)}
        </div>
        <div className={clsx("num mt-1 text-sm font-semibold", up ? "text-up" : "text-down")}>
          {up ? "▲" : "▼"} {fmtNum(Math.abs(q.change), Math.abs(q.change) < 1 ? 4 : 2)} ({up ? "+" : ""}{q.changePct.toFixed(2)}%)
          <span className="ml-2 font-normal text-mute">
            {t.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: q.timezone, timeZoneName: "short" })}
          </span>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ symbol }: { symbol: string }) {
  const steps = ["Pulling 5 years of price history", "Reading SEC filings & XBRL financials", "Scanning Google News & Yahoo headlines", "Computing technicals and scores"];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 900);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <div className="num text-4xl font-semibold">{symbol}</div>
          <div className="mt-2 text-sm text-mute">{steps[i]}…</div>
        </div>
        <div className="skeleton h-12 w-48" />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <div className="skeleton h-[480px] rounded-lg" />
          <div className="skeleton h-24 rounded-lg" />
          <div className="skeleton h-64 rounded-lg" />
        </div>
        <div className="space-y-5 lg:col-span-4">
          <div className="skeleton h-56 rounded-lg" />
          <div className="skeleton h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
