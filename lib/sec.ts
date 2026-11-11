// SEC EDGAR (free, official): ticker->CIK map, XBRL company facts for
// fundamentals, and the submissions feed for recent filings.
import { cached, fetchJson } from "./http";
import type { AnnualPoint, Filing, Fundamentals } from "./types";

const UA = () => process.env.SEC_USER_AGENT || "TIKR-research-app contact@example.com";

type TickerMap = Record<string, { cik: number; title: string }>;

async function tickerMap(): Promise<TickerMap> {
  return cached("sec:tickers", 24 * 3600_000, async () => {
    const raw = await fetchJson<Record<string, { cik_str: number; ticker: string; title: string }>>(
      "https://www.sec.gov/files/company_tickers.json",
      { ua: UA(), timeoutMs: 15000 },
    );
    const m: TickerMap = {};
    for (const v of Object.values(raw)) m[v.ticker.toUpperCase()] = { cik: v.cik_str, title: v.title };
    return m;
  });
}

export async function lookupCik(symbol: string): Promise<string | null> {
  const m = await tickerMap();
  // EDGAR uses dashes for share classes (BRK-B); Yahoo uses the same.
  const hit = m[symbol.toUpperCase()] ?? m[symbol.toUpperCase().replace(".", "-")];
  return hit ? String(hit.cik).padStart(10, "0") : null;
}

type Fact = { start?: string; end: string; val: number; fy?: number; fp?: string; form?: string; filed: string; frame?: string };
type Facts = { entityName: string; facts: Record<string, Record<string, { units: Record<string, Fact[]> }>> };

const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;

function series(facts: Facts, tags: string[], unitPref = ["USD", "USD/shares", "shares"]): Fact[] {
  // Pick the tag that has the most recent data (companies switch tags over time),
  // but merge older history from other tags.
  const all: Fact[][] = [];
  for (const ns of ["us-gaap", "ifrs-full"]) {
    const n = facts.facts[ns];
    if (!n) continue;
    for (const t of tags) {
      const f = n[t];
      if (!f) continue;
      const unit = unitPref.find((u) => f.units[u]) ?? Object.keys(f.units)[0];
      if (unit) all.push(f.units[unit]);
    }
  }
  if (!all.length) return [];
  all.sort((a, b) => (b.at(-1)?.end ?? "").localeCompare(a.at(-1)?.end ?? ""));
  const byKey = new Map<string, Fact>();
  for (const list of all) {
    for (const f of list) {
      const k = `${f.start ?? ""}|${f.end}`;
      const prev = byKey.get(k);
      // Prefer first (most recent tag), then latest filing.
      if (!prev) byKey.set(k, f);
    }
  }
  return [...byKey.values()].sort((a, b) => a.end.localeCompare(b.end) || a.filed.localeCompare(b.filed));
}

/** One value per fiscal year from ~12-month duration facts. */
function annual(fs: Fact[]): AnnualPoint[] {
  const byEnd = new Map<string, Fact>();
  for (const f of fs) {
    if (!f.start) continue;
    const d = days(f.start, f.end);
    if (d < 340 || d > 380) continue;
    const prev = byEnd.get(f.end);
    if (!prev || f.filed > prev.filed) byEnd.set(f.end, f);
  }
  return [...byEnd.values()]
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((f) => ({ year: Number(f.end.slice(0, 4)), end: f.end, value: f.val }))
    .slice(-8);
}

/** Trailing-twelve-months for a flow concept: FY + (latest YTD - prior-year YTD). */
function ttm(fs: Fact[]): number | null {
  const ann = annual(fs);
  const lastFY = ann.at(-1);
  if (!lastFY) return null;
  const withDur = fs.filter((f) => f.start && f.end > lastFY.end);
  if (!withDur.length) return lastFY.value;
  // Longest YTD period ending at the most recent date.
  const latestEnd = withDur.reduce((m, f) => (f.end > m ? f.end : m), "");
  const ytd = withDur.filter((f) => f.end === latestEnd).sort((a, b) => days(b.start!, b.end) - days(a.start!, a.end))[0];
  const d = days(ytd.start!, ytd.end);
  if (d > 340) return ytd.val; // it's itself annual
  const prior = fs.find(
    (f) => f.start && Math.abs(days(f.start, f.end) - d) < 12 && Math.abs(days(f.end, ytd.end) - 365) < 12,
  );
  if (!prior) return lastFY.value;
  return lastFY.value + ytd.val - prior.val;
}

function latestInstant(fs: Fact[]): { val: number; end: string } | null {
  const inst = fs.filter((f) => !f.start);
  const f = (inst.length ? inst : fs).at(-1);
  return f ? { val: f.val, end: f.end } : null;
}

const T = {
  revenue: ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax", "Revenue", "TotalRevenuesAndOtherIncome"],
  grossProfit: ["GrossProfit"],
  costOfRevenue: ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold", "CostOfSales"],
  operatingIncome: ["OperatingIncomeLoss", "ProfitLossFromOperatingActivities"],
  netIncome: ["NetIncomeLoss", "ProfitLossAttributableToOwnersOfParent", "ProfitLoss", "NetIncomeLossAvailableToCommonStockholdersBasic"],
  eps: ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted", "EarningsPerShareBasic", "DilutedEarningsLossPerShare", "BasicEarningsLossPerShare"],
  ocf: ["NetCashProvidedByUsedInOperatingActivities", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations", "CashFlowsFromUsedInOperatingActivities"],
  capex: ["PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"],
  rnd: ["ResearchAndDevelopmentExpense", "ResearchAndDevelopmentExpenseExcludingAcquiredInProcessCost"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents", "CashAndCashEquivalents"],
  ltDebt: ["LongTermDebt", "LongTermDebtNoncurrent", "LongTermDebtAndCapitalLeaseObligations", "NoncurrentPortionOfNoncurrentBorrowings"],
  stDebt: ["LongTermDebtCurrent", "ShortTermBorrowings", "CommercialPaper", "DebtCurrent", "CurrentPortionOfNoncurrentBorrowings"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest", "EquityAttributableToOwnersOfParent", "Equity"],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  curAssets: ["AssetsCurrent", "CurrentAssets"],
  curLiab: ["LiabilitiesCurrent", "CurrentLiabilities"],
};

export async function getFundamentals(cik: string, price: number): Promise<Fundamentals> {
  const facts = await cached(`sec:facts:${cik}`, 6 * 3600_000, () =>
    fetchJson<Facts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { ua: UA(), timeoutMs: 20000 }),
  );
  const s = Object.fromEntries(Object.entries(T).map(([k, tags]) => [k, series(facts, tags)])) as Record<keyof typeof T, Fact[]>;

  const dei = facts.facts.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  // Sum share classes reported on the latest date (e.g. GOOGL + GOOG).
  let sharesOut: number | null = null;
  if (dei.length) {
    const lastEnd = dei.reduce((m, f) => (f.end > m ? f.end : m), "");
    const lastFiled = dei.filter((f) => f.end === lastEnd).reduce((m, f) => (f.filed > m ? f.filed : m), "");
    sharesOut = dei.filter((f) => f.end === lastEnd && f.filed === lastFiled).reduce((a, f) => a + f.val, 0);
  } else {
    sharesOut = latestInstant(series(facts, ["WeightedAverageNumberOfDilutedSharesOutstanding"], ["shares"]))?.val ?? null;
  }

  const revenue = ttm(s.revenue);
  const cogs = ttm(s.costOfRevenue);
  const grossProfit = ttm(s.grossProfit) ?? (revenue != null && cogs != null ? revenue - cogs : null);
  const operatingIncome = ttm(s.operatingIncome);
  const netIncome = ttm(s.netIncome);
  const eps = ttm(s.eps);
  const ocf = ttm(s.ocf);
  const capex = ttm(s.capex);
  const rnd = ttm(s.rnd);
  const fcf = ocf != null ? ocf - (capex ?? 0) : null;

  const cash = latestInstant(s.cash);
  const lt = latestInstant(s.ltDebt);
  const st = latestInstant(s.stDebt);
  const eq = latestInstant(s.equity);
  const as = latestInstant(s.assets);
  const li = latestInstant(s.liabilities);
  const ca = latestInstant(s.curAssets);
  const cl = latestInstant(s.curLiab);
  const totalDebt = lt || st ? (lt?.val ?? 0) + (st && (!lt || st.end >= lt.end) ? st.val : 0) : null;

  const marketCap = sharesOut && price ? sharesOut * price : null;
  const div = (a: number | null | undefined, b: number | null | undefined) => (a != null && b ? a / b : null);

  const annRev = annual(s.revenue);
  const annEps = annual(s.eps);
  const annOcf = annual(s.ocf);
  const annCapex = annual(s.capex);
  const annFcf: AnnualPoint[] = annOcf.map((p) => ({
    ...p,
    value: p.value - (annCapex.find((c) => c.end === p.end)?.value ?? 0),
  }));
  const growth = (a: AnnualPoint[]) => (a.length >= 2 && a.at(-2)!.value ? (a.at(-1)!.value - a.at(-2)!.value) / Math.abs(a.at(-2)!.value) : null);
  const cagr3 = annRev.length >= 4 && annRev.at(-4)!.value > 0 ? Math.pow(annRev.at(-1)!.value / annRev.at(-4)!.value, 1 / 3) - 1 : null;

  return {
    cik,
    entityName: facts.entityName,
    currency: "USD",
    sharesOutstanding: sharesOut,
    marketCap,
    ttm: { revenue, grossProfit, operatingIncome, netIncome, eps, operatingCashFlow: ocf, capex, freeCashFlow: fcf, rnd },
    balance: {
      cash: cash?.val ?? null,
      totalDebt,
      equity: eq?.val ?? null,
      assets: as?.val ?? null,
      liabilities: li?.val ?? null,
      currentAssets: ca?.val ?? null,
      currentLiabilities: cl?.val ?? null,
      asOf: as?.end ?? eq?.end ?? null,
    },
    ratios: {
      pe: eps && eps > 0 ? price / eps : null,
      ps: div(marketCap, revenue),
      pb: eq && eq.val > 0 ? div(marketCap, eq.val) : null,
      fcfYield: div(fcf, marketCap),
      grossMargin: div(grossProfit, revenue),
      operatingMargin: div(operatingIncome, revenue),
      netMargin: div(netIncome, revenue),
      roe: eq && eq.val > 0 ? div(netIncome, eq.val) : null,
      debtToEquity: eq && eq.val > 0 ? div(totalDebt, eq.val) : null,
      currentRatio: div(ca?.val, cl?.val),
      revenueGrowth: growth(annRev),
      epsGrowth: growth(annEps),
      revenueCagr3y: cagr3,
    },
    annual: {
      revenue: annRev,
      netIncome: annual(s.netIncome),
      operatingIncome: annual(s.operatingIncome),
      freeCashFlow: annFcf,
      eps: annEps,
    },
  };
}

const FORM_DESC: Record<string, string> = {
  "10-K": "Annual report",
  "10-Q": "Quarterly report",
  "8-K": "Material event",
  "4": "Insider transaction",
  "DEF 14A": "Proxy statement",
  "S-1": "Registration",
  "13D": "Activist stake",
  "SC 13D": "Activist stake",
  "SC 13G": "Passive stake",
  "20-F": "Annual report (foreign)",
  "6-K": "Foreign issuer report",
};

export async function getFilings(cik: string): Promise<{ filings: Filing[]; sic?: string; fiscalYearEnd?: string }> {
  return cached(`sec:subs:${cik}`, 3600_000, async () => {
    const r = await fetchJson<any>(`https://data.sec.gov/submissions/CIK${cik}.json`, { ua: UA() });
    const rec = r.filings?.recent ?? {};
    const out: Filing[] = [];
    const n = rec.form?.length ?? 0;
    let reports = 0, insider = 0;
    for (let i = 0; i < n && (reports < 20 || insider < 15); i++) {
      const form: string = rec.form[i];
      if (!/^(10-K|10-Q|8-K|4|DEF 14A|S-1|SC 13[DG]|20-F|6-K)$/.test(form)) continue;
      if (form === "4" ? insider++ >= 15 : reports++ >= 20) continue;
      const acc = String(rec.accessionNumber[i]).replace(/-/g, "");
      const doc = rec.primaryDocument[i];
      out.push({
        form,
        filed: rec.filingDate[i],
        description: rec.primaryDocDescription?.[i] || FORM_DESC[form] || form,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${acc}/${doc}`,
      });
    }
    return { filings: out, sic: r.sicDescription, fiscalYearEnd: r.fiscalYearEnd };
  });
}
