"use client";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Newspaper } from "lucide-react";
import type { Dossier, NewsItem } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { Card } from "./Panels";

const LABEL: Record<NewsItem["label"], string> = { bullish: "text-up", bearish: "text-down", neutral: "text-mute" };

function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function SentimentCard({ d }: { d: Dossier }) {
  const s = d.newsStats;
  const total = Math.max(1, s.count);
  // Daily headline counts by tone over the last 30 days (bullish up, bearish down).
  const days = useMemo(() => {
    const out: { day: string; bull: number; bear: number; neutral: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const items = d.news.filter((n) => new Date(n.published).toISOString().slice(0, 10) === key);
      out.push({
        day: key.slice(5),
        bull: items.filter((n) => n.label === "bullish").length,
        bear: -items.filter((n) => n.label === "bearish").length,
        neutral: items.filter((n) => n.label === "neutral").length,
      });
    }
    return out;
  }, [d.news]);
  const topics = Object.entries(s.topics).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const mood = s.avg > 0.12 ? ["Positive", "text-up"] : s.avg < -0.12 ? ["Negative", "text-down"] : ["Mixed", "text-ink"];

  return (
    <Card title="News sentiment" right={<span className="chip text-mute">{s.count} headlines · 30d</span>}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className={clsx("text-2xl font-semibold", mood[1])}>{mood[0]}</div>
          <div className="num text-xs text-mute">weighted score {s.avg >= 0 ? "+" : ""}{s.avg.toFixed(2)}</div>
        </div>
        <div className="num flex gap-3 text-right text-xs">
          <div><div className="font-semibold text-up">{s.bullish}</div><div className="text-mute">bullish</div></div>
          <div><div className="font-semibold text-ink/80">{s.neutral}</div><div className="text-mute">neutral</div></div>
          <div><div className="font-semibold text-down">{s.bearish}</div><div className="text-mute">bearish</div></div>
        </div>
      </div>
      <div className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${s.bullish} bullish, ${s.neutral} neutral, ${s.bearish} bearish`}>
        <div className="bg-up" style={{ width: `${(s.bullish / total) * 100}%` }} />
        <div className="bg-line/20" style={{ width: `${(s.neutral / total) * 100}%` }} />
        <div className="bg-down" style={{ width: `${(s.bearish / total) * 100}%` }} />
      </div>
      <div className="mt-4 h-[90px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} barCategoryGap={1} stackOffset="sign">
            <XAxis dataKey="day" hide />
            <YAxis hide />
            <ReferenceLine y={0} stroke="rgb(var(--line) / 0.15)" />
            <Tooltip
              cursor={{ fill: "rgb(var(--line) / 0.05)" }}
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="card px-2.5 py-1.5 text-xs">
                    <div className="font-semibold">{payload[0].payload.day}</div>
                    <div className="num text-up">{payload[0].payload.bull} bullish</div>
                    <div className="num text-mute">{payload[0].payload.neutral} neutral</div>
                    <div className="num text-down">{-payload[0].payload.bear} bearish</div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="bull" stackId="s" fill="rgb(var(--up))" radius={[3, 3, 0, 0]} />
            <Bar dataKey="bear" stackId="s" fill="rgb(var(--down))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-mute"><span>30 days ago</span><span><span className="text-up">bullish</span> / <span className="text-down">bearish</span> headlines per day</span><span>today</span></div>
      {topics.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topics.map(([t, n]) => (
            <span key={t} className="chip text-ink/80">{t} <span className="num text-mute">{n}</span></span>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function NewsFeed({ d }: { d: Dossier }) {
  const [filter, setFilter] = useState<"all" | NewsItem["label"]>("all");
  const [topic, setTopic] = useState<string | null>(null);
  const [limit, setLimit] = useState(15);
  const items = d.news.filter((n) => (filter === "all" || n.label === filter) && (!topic || n.topics.includes(topic)));
  const topics = Object.keys(d.newsStats.topics);

  return (
    <Card
      title={<span className="flex items-center gap-2"><Newspaper size={13} /> News · Google News + Yahoo</span>}
      right={
        <div className="flex gap-1">
          {(["all", "bullish", "bearish", "neutral"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={clsx("tab capitalize", filter === f && "tab-on")}>{f}</button>
          ))}
        </div>
      }
    >
      {topics.length > 0 && (
        <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button key={t} onClick={() => setTopic(topic === t ? null : t)} className={clsx("chip transition-colors", topic === t ? "!border-ink/40 !text-ink" : "hover:text-ink")}>{t}</button>
          ))}
        </div>
      )}
      <ul className="divide-y hairline">
        {items.slice(0, limit).map((n) => (
          <li key={n.id} className="hairline">
            <a href={n.url} target="_blank" rel="noreferrer" className="group flex gap-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                loading="lazy"
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(n.origin === "yahoo" ? domain(n.url) : n.source.toLowerCase().replace(/[^a-z0-9.]/g, "") + (n.source.includes(".") ? "" : ".com"))}&sz=64`}
                className="mt-0.5 h-5 w-5 shrink-0 rounded bg-line/10"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] leading-snug text-ink/90 group-hover:text-ink group-hover:underline group-hover:decoration-line/30 group-hover:underline-offset-2">{n.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute">
                  <span className="font-medium text-ink/70">{n.source}</span>
                  <span>·</span>
                  <span>{timeAgo(n.published)}</span>
                  {n.topics.slice(0, 2).map((t) => <span key={t} className="chip !py-0 text-[10px]">{t}</span>)}
                </div>
              </div>
              <span className={clsx("h-fit shrink-0 whitespace-nowrap text-[11px] font-medium capitalize", LABEL[n.label])}>{n.label === "bullish" ? "▲ " : n.label === "bearish" ? "▼ " : ""}{n.label}</span>
            </a>
          </li>
        ))}
      </ul>
      {items.length === 0 && <div className="py-8 text-center text-sm text-mute">No headlines match.</div>}
      {items.length > limit && (
        <button onClick={() => setLimit((l) => l + 20)} className="btn-ghost mt-2 w-full">Show more ({items.length - limit})</button>
      )}
    </Card>
  );
}
