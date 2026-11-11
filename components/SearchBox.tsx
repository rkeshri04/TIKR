"use client";
import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Hit = { symbol: string; name: string; exchange: string; type: string };

export default function SearchBox({ big = false, autoFocus = false }: { big?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K / "/" focuses search anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    const onClick = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const j = await r.json();
        setHits(j.hits ?? []);
        setSel(0);
        setOpen(true);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (sym: string) => {
    if (!sym) return;
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(`/t/${encodeURIComponent(sym.toUpperCase())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") {
      e.preventDefault();
      // If the typed text looks like a ticker and isn't the top hit, trust the user.
      const raw = q.trim().toUpperCase();
      const exact = hits.find((h) => h.symbol.toUpperCase() === raw);
      go(exact ? exact.symbol : open && hits[sel] ? hits[sel].symbol : raw);
    }
  };

  return (
    <div ref={box} className="relative w-full">
      <div
        className={clsx(
          "group flex items-center gap-3 rounded-2xl border bg-panel/80 backdrop-blur-xl transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/15 hairline",
          big ? "h-16 px-5" : "h-10 px-3",
        )}
      >
        <Search size={big ? 22 : 16} className={clsx("shrink-0 text-mute", loading && "animate-pulse text-accent")} />
        <input
          ref={input}
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={big ? "Search any ticker or company — AAPL, Nvidia, RELIANCE.NS, BTC-USD…" : "Search ticker or company"}
          className={clsx("w-full bg-transparent outline-none placeholder:text-mute/70", big ? "text-lg" : "text-sm")}
          spellCheck={false}
          autoComplete="off"
          aria-label="Search tickers"
        />
        <kbd className="hidden shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] text-mute hairline sm:block">⌘K</kbd>
      </div>
      {open && hits.length > 0 && (
        <div className="card absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden !bg-panel p-1.5 shadow-2xl animate-fadeup">
          {hits.map((h, i) => (
            <button
              key={h.symbol + i}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(h.symbol)}
              className={clsx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === sel && "bg-accent/10")}
            >
              <span className="num w-24 shrink-0 truncate text-sm font-semibold">{h.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink/80">{h.name}</span>
              <span className="hidden text-[11px] text-mute sm:block">{h.exchange}</span>
              <span className="chip text-mute">{h.type}</span>
              {i === sel && <CornerDownLeft size={14} className="text-mute" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
