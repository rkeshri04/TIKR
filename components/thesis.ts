"use client";
import { useEffect, useState } from "react";
import { enterpriseValue } from "@/lib/dcf";
import type { Dossier } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/format";

// A thesis is the user's own view of a stock, frozen at the moment they
// saved it, so the app can later tell them when reality stops agreeing.
export type Thesis = {
  symbol: string;
  name: string;
  savedAt: number;
  price: number;
  g1: number;
  g2: number;
  r: number;
  gT: number;
  fairValue: number;
  note: string;
  floor: number | null; // "reconsider" price line: below it for bulls, above it for bears
  stance?: "bull" | "bear"; // bull if your value was above the price when saved
  revGrowth: number | null; // facts at save time, for drift checks
  fcfMargin: number | null;
  sentiment: number;
  implied: number | null;
};

const KEY = "tikr-theses", EVT = "tikr-theses";

function readAll(): Record<string, Thesis> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function writeAll(v: Record<string, Thesis>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
export const saveThesis = (t: Thesis) => writeAll({ ...readAll(), [t.symbol]: t });
export const deleteThesis = (symbol: string) => {
  const all = readAll();
  delete all[symbol];
  writeAll(all);
};

export function useTheses() {
  const [v, setV] = useState<Record<string, Thesis>>({});
  useEffect(() => {
    const f = () => setV(readAll());
    f();
    window.addEventListener(EVT, f);
    window.addEventListener("storage", f);
    return () => {
      window.removeEventListener(EVT, f);
      window.removeEventListener("storage", f);
    };
  }, []);
  return v;
}

/** Per-share fair value for a set of assumptions, using the dossier's latest cash flow and balance sheet. */
export function fairValue(d: Dossier, a: { g1: number; g2: number; r: number; gT: number }): number | null {
  const e = d.expectations;
  if (!e || !(e.fcf0 > 0) || !e.shares) return null;
  const ev = enterpriseValue({ fcf0: e.fcf0, ...a });
  if (!Number.isFinite(ev)) return null;
  return (ev - e.netDebt) / e.shares;
}

export type Status = "ok" | "watch" | "broken";
export const stanceOf = (t: Thesis) => t.stance ?? (t.fairValue >= t.price ? "bull" : "bear");
export type Check = { label: string; detail: string; status: Status };

export function evaluate(t: Thesis, d: Dossier): { checks: Check[]; overall: Status; fairNow: number | null } {
  const checks: Check[] = [];
  const price = d.quote.price;
  const f = d.fundamentals;
  const fairNow = fairValue(d, t) ?? t.fairValue;
  const bull = stanceOf(t) === "bull";

  // 1. Is the business growing as fast as you assumed?
  const rg = f?.ratios.revenueGrowth;
  if (rg != null) {
    // Bulls need growth at least as fast as assumed; bears need it no faster.
    const miss = bull ? t.g1 - rg : rg - t.g1;
    const st: Status = miss <= 0.02 ? "ok" : miss <= 0.07 ? "watch" : "broken";
    checks.push({
      label: bull ? "Growth is keeping pace" : "Growth isn't beating your view",
      detail: `Latest revenue growth ${fmtPct(rg, 1, true)} vs. your ${fmtPct(t.g1, 1)} assumption for years 1–5.`,
      status: st,
    });
  }
  // 2. Is cash conversion holding up?
  const m = d.expectations?.fcfMargin;
  if (m != null && t.fcfMargin != null) {
    const drop = m - t.fcfMargin;
    const against = bull ? -drop : drop;
    const st: Status = against <= 0.02 ? "ok" : against <= 0.05 ? "watch" : "broken";
    checks.push({
      label: bull ? "Cash conversion holding" : "Cash conversion not improving",
      detail: `Free-cash-flow margin ${fmtPct(m)} vs. ${fmtPct(t.fcfMargin)} when you saved (${drop >= 0 ? "+" : ""}${(drop * 100).toFixed(1)} pts).`,
      status: st,
    });
  }
  // 3. Is there still upside versus your own value?
  if (fairNow) {
    const prem = price / fairNow - 1;
    if (bull) {
      checks.push({
        label: "Upside to your value",
        detail:
          prem <= 0
            ? `Price ${fmtNum(price)} is ${fmtPct(-prem, 0)} below your value of ${fmtNum(fairNow)}.`
            : `Price ${fmtNum(price)} is ${fmtPct(prem, 0)} above your value of ${fmtNum(fairNow)} — the upside you modeled is used up.`,
        status: prem <= 0 ? "ok" : prem <= 0.1 ? "watch" : "broken",
      });
    } else {
      checks.push({
        label: "Still overvalued vs. your value",
        detail:
          prem >= 0
            ? `Price ${fmtNum(price)} is ${fmtPct(prem, 0)} above your value of ${fmtNum(fairNow)}.`
            : `Price ${fmtNum(price)} has fallen ${fmtPct(-prem, 0)} below your value of ${fmtNum(fairNow)} — the overvaluation you saw is gone.`,
        status: prem >= 0.1 ? "ok" : prem >= 0 ? "watch" : "broken",
      });
    }
  }
  // 4. Is the market now assuming more than you do?
  const imp = d.expectations?.implied;
  if (imp != null) {
    const yours = (t.g1 + t.g2) / 2;
    const gap = bull ? imp - yours : yours - imp;
    const st: Status = gap <= 0.01 ? "ok" : gap <= 0.04 ? "watch" : "broken";
    checks.push({
      label: bull ? "Market isn't out-running you" : "Market still assumes more than you",
      detail: `The price now implies ${fmtPct(imp, 1)}/yr growth vs. your ${fmtPct(yours, 1)} average${t.implied != null ? ` (was ${fmtPct(t.implied, 1)} when saved)` : ""}.`,
      status: st,
    });
  }
  // 5. Has the news turned?
  const s = d.newsStats.avg;
  const shift = bull ? t.sentiment - s : s - t.sentiment; // movement against your view
  checks.push({
    label: bull ? "News flow not deteriorating" : "News flow not turning positive",
    detail: `Weighted headline tone ${s >= 0 ? "+" : ""}${s.toFixed(2)} vs. ${t.sentiment >= 0 ? "+" : ""}${t.sentiment.toFixed(2)} when saved.`,
    status: shift <= 0.1 ? "ok" : shift <= 0.25 ? "watch" : "broken",
  });
  // 6. Your own price line.
  if (t.floor) {
    const room = bull ? price / t.floor - 1 : t.floor / price - 1;
    checks.push({
      label: bull ? "Above your reconsider price" : "Below your reconsider price",
      detail: `Price ${fmtNum(price)} vs. your line at ${fmtNum(t.floor)}.`,
      status: room > 0.05 ? "ok" : room > 0 ? "watch" : "broken",
    });
  }
  // 7. New primary-source information since you decided.
  const fresh = d.filings.filter((x) => /^(10-K|10-Q|8-K|20-F|6-K)$/.test(x.form) && Date.parse(x.filed) > t.savedAt);
  if (fresh.length) {
    checks.push({
      label: "New filings since you saved",
      detail: `${fresh.length} new: ${fresh.slice(0, 3).map((x) => `${x.form} (${x.filed})`).join(", ")}. Re-read before acting.`,
      status: "watch",
    });
  }
  const overall: Status = checks.some((c) => c.status === "broken") ? "broken" : checks.some((c) => c.status === "watch") ? "watch" : "ok";
  return { checks, overall, fairNow };
}
