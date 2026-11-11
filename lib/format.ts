export function fmtNum(n: number | null | undefined, d = 2) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtBig(n: number | null | undefined, prefix = "$") {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n), sign = n < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}${prefix}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}${prefix}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}${prefix}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}${prefix}${(a / 1e3).toFixed(1)}K`;
  return `${sign}${prefix}${a.toFixed(0)}`;
}

export function fmtPct(n: number | null | undefined, d = 1, signed = false) {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = n * 100;
  return `${signed && v > 0 ? "+" : ""}${v.toFixed(d)}%`;
}

export function fmtX(n: number | null | undefined, d = 1) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(d)}×`;
}

export function currencySymbol(c: string) {
  return ({ USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", CNY: "¥", HKD: "HK$", CAD: "C$", AUD: "A$", KRW: "₩", CHF: "CHF " } as Record<string, string>)[c] ?? `${c} `;
}

export function timeAgo(ms: number) {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
