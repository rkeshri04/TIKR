"use client";
import { useEffect, useState } from "react";

// Per-browser conveniences: watchlist and recently viewed tickers.
export type Item = { symbol: string; name: string };
const WKEY = "tikr-watchlist", RKEY = "tikr-recent", EVT = "tikr-lists";

function read(key: string): Item[] {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function write(key: string, v: Item[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

export function toggleWatch(it: Item) {
  const l = read(WKEY);
  write(WKEY, l.some((x) => x.symbol === it.symbol) ? l.filter((x) => x.symbol !== it.symbol) : [it, ...l].slice(0, 30));
}
export function pushRecent(it: Item) {
  write(RKEY, [it, ...read(RKEY).filter((x) => x.symbol !== it.symbol)].slice(0, 8));
}

function useList(key: string) {
  const [v, setV] = useState<Item[]>([]);
  useEffect(() => {
    const f = () => setV(read(key));
    f();
    window.addEventListener(EVT, f);
    window.addEventListener("storage", f);
    return () => {
      window.removeEventListener(EVT, f);
      window.removeEventListener("storage", f);
    };
  }, [key]);
  return v;
}
export const useWatchlist = () => useList(WKEY);
export const useRecent = () => useList(RKEY);
