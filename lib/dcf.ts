// "What's priced in?" — reverse discounted-cash-flow math.
// Pure functions shared by the server (dossier) and the browser (sliders).

export type DcfInputs = {
  fcf0: number; // trailing-12-month free cash flow
  g1: number; // annual FCF growth, years 1–5
  g2: number; // annual FCF growth, years 6–10
  r: number; // discount rate
  gT: number; // terminal growth after year 10
};

/** Enterprise value implied by a two-stage DCF plus a Gordon terminal value. */
export function enterpriseValue({ fcf0, g1, g2, r, gT }: DcfInputs): number {
  if (r <= gT) return Infinity;
  let f = fcf0, pv = 0;
  for (let t = 1; t <= 10; t++) {
    f *= 1 + (t <= 5 ? g1 : g2);
    pv += f / Math.pow(1 + r, t);
  }
  const tv = (f * (1 + gT)) / (r - gT);
  return pv + tv / Math.pow(1 + r, 10);
}

/** FCF path for the next 10 years (for charting). */
export function fcfPath(fcf0: number, g1: number, g2: number): number[] {
  const out: number[] = [];
  let f = fcf0;
  for (let t = 1; t <= 10; t++) {
    f *= 1 + (t <= 5 ? g1 : g2);
    out.push(f);
  }
  return out;
}

/** Solve for the constant 10-year FCF growth rate that justifies `targetEV`. */
export function impliedGrowth(targetEV: number, fcf0: number, r: number, gT: number): number | null {
  if (!(fcf0 > 0) || !(targetEV > 0)) return null;
  let lo = -0.5, hi = 1.5;
  const f = (g: number) => enterpriseValue({ fcf0, g1: g, g2: g, r, gT }) - targetEV;
  if (f(lo) > 0) return lo; // even shrinking 50%/yr justifies the price
  if (f(hi) < 0) return null; // needs >150%/yr: not meaningful
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function cagr(first: number, last: number, years: number): number | null {
  if (!(first > 0) || !(last > 0) || years <= 0) return null;
  return Math.pow(last / first, 1 / years) - 1;
}

export type Expectations = {
  supported: boolean;
  reason?: string;
  price: number;
  shares: number;
  marketCap: number;
  netDebt: number; // debt - cash
  ev: number;
  fcf0: number;
  fcfMargin: number | null;
  revenue: number | null;
  riskFree: number;
  beta: number;
  erp: number;
  r: number; // discount rate used
  gT: number;
  implied: number | null; // market-implied 10y FCF growth
  history: {
    fcfCagr: number | null;
    fcfYears: number;
    revCagr: number | null;
    revYears: number;
    fcfSeries: { year: number; value: number }[];
  };
  impliedFcf10: number | null; // FCF in year 10 under implied growth
  verdict: "undemanding" | "in line" | "demanding" | "heroic" | null;
  gap: number | null; // implied minus best available track record
};

export const ERP = 0.05; // equity risk premium assumption
export const TERMINAL = 0.025;

export function discountRate(riskFree: number, beta: number) {
  const b = Math.max(0.6, Math.min(2.0, Number.isFinite(beta) ? beta : 1));
  return Math.max(0.07, Math.min(0.14, riskFree + b * ERP));
}

export function verdictFor(gap: number | null): Expectations["verdict"] {
  if (gap == null) return null;
  if (gap <= -0.02) return "undemanding";
  if (gap <= 0.03) return "in line";
  if (gap <= 0.1) return "demanding";
  return "heroic";
}
