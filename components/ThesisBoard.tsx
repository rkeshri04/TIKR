"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Check, CircleSlash, Loader2 } from "lucide-react";
import type { Dossier } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";
import { evaluate, stanceOf, useTheses, type Status } from "./thesis";
import { STATUS_COPY } from "./PricedIn";

const ICON: Record<Status, React.ReactNode> = {
  ok: <Check size={14} className="text-up" />,
  watch: <AlertTriangle size={14} className="text-warn" />,
  broken: <CircleSlash size={14} className="text-down" />,
};

/** Re-checks every saved thesis against fresh data, worst first. */
export default function ThesisBoard() {
  const theses = useTheses();
  const symbols = Object.keys(theses).slice(0, 12);
  const [data, setData] = useState<Record<string, Dossier | null>>({});

  useEffect(() => {
    let alive = true;
    for (const s of symbols) {
      if (s in data) continue;
      fetch(`/api/dossier/${encodeURIComponent(s)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && setData((m) => ({ ...m, [s]: j })))
        .catch(() => alive && setData((m) => ({ ...m, [s]: null })));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  if (!symbols.length) return null;
  const rank: Record<Status, number> = { broken: 0, watch: 1, ok: 2 };
  const rows = symbols
    .map((s) => {
      const t = theses[s], d = data[s];
      const ev = d ? evaluate(t, d) : null;
      return { s, t, d, ev };
    })
    .sort((a, b) => (a.ev ? rank[a.ev.overall] : 3) - (b.ev ? rank[b.ev.overall] : 3));

  return (
    <section className="card mt-14 overflow-hidden text-left">
      <div className="flex items-center justify-between border-b px-5 py-4 hairline">
        <div>
          <div className="card-title">Your theses</div>
          <div className="text-xs text-mute">Each belief you saved, re-checked against today&apos;s filings, price and news.</div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="num w-full text-left text-[13px]">
          <thead className="text-xs text-mute">
            <tr className="border-b hairline">
              <th className="px-5 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Saved at</th>
              <th className="px-3 py-2 text-right font-medium">Now</th>
              <th className="px-3 py-2 text-right font-medium">Your value</th>
              <th className="px-5 py-2 font-medium">First issue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, t, d, ev }) => {
              const first = ev?.checks.find((c) => c.status === "broken") ?? ev?.checks.find((c) => c.status === "watch");
              const chg = d ? d.quote.price / t.price - 1 : null;
              return (
                <tr key={s} className="border-b transition-colors hairline last:border-0 hover:bg-raised">
                  <td className="px-5 py-3"><Link href={`/t/${encodeURIComponent(s)}#priced-in`} className="font-semibold hover:underline">{s}</Link><div className="max-w-[160px] truncate text-[11px] text-mute">{stanceOf(t) === "bull" ? "▲ Bullish" : "▼ Bearish"} · {t.name}</div></td>
                  <td className="px-3 py-3">{ev ? <span className="flex items-center gap-1.5 whitespace-nowrap">{ICON[ev.overall]} {STATUS_COPY[ev.overall]}</span> : <Loader2 size={14} className="animate-spin text-mute" />}</td>
                  <td className="px-3 py-3 text-right">{fmtNum(t.price)}</td>
                  <td className="px-3 py-3 text-right">
                    {d ? fmtNum(d.quote.price) : "—"}
                    {chg != null && <div className={clsx("text-[11px]", chg >= 0 ? "text-up" : "text-down")}>{chg >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(chg), 1)}</div>}
                  </td>
                  <td className="px-3 py-3 text-right">{fmtNum(ev?.fairNow ?? t.fairValue)}</td>
                  <td className="max-w-[320px] px-5 py-3 text-xs text-mute">{first ? <><span className="font-medium text-ink/85">{first.label}.</span> {first.detail}</> : ev ? "All checks passing." : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
