"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";
import Sparkline from "./Sparkline";

type Row = { symbol: string; label: string; price: number; changePct: number; spark: number[] };

export default function MarketTape() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market")
        .then((r) => r.json())
        .then((j) => alive && setRows(j.rows))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!rows) return <div className="h-11 border-b hairline" />;
  const items = [...rows, ...rows]; // duplicated for a seamless marquee loop
  return (
    <div className="group relative overflow-hidden border-b hairline bg-panel/40 backdrop-blur [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div className="flex w-max animate-marquee gap-8 py-2.5 pl-8 group-hover:[animation-play-state:paused]">
        {items.map((r, i) => (
          <Link key={i} href={`/t/${encodeURIComponent(r.symbol)}`} className="flex items-center gap-2.5 text-xs hover:opacity-80">
            <span className="font-semibold text-ink/90">{r.label}</span>
            <span className="num text-ink/70">{r.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={clsx("num font-medium", r.changePct >= 0 ? "text-up" : "text-down")}>
              {r.changePct >= 0 ? "▲" : "▼"} {Math.abs(r.changePct).toFixed(2)}%
            </span>
            <Sparkline data={r.spark} w={44} h={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}
