export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type Quote = {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  instrumentType: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketTime: number;
  timezone: string;
};

export type SearchHit = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
  sector?: string;
  industry?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  published: number; // epoch ms
  sentiment: number; // -1..1
  label: "bullish" | "bearish" | "neutral";
  topics: string[];
  origin: "google" | "yahoo";
};

export type AnnualPoint = { year: number; end: string; value: number };

export type Fundamentals = {
  cik: string;
  entityName: string;
  fiscalYearEnd?: string;
  currency: string;
  sharesOutstanding: number | null;
  marketCap: number | null;
  ttm: {
    revenue: number | null;
    grossProfit: number | null;
    operatingIncome: number | null;
    netIncome: number | null;
    eps: number | null;
    operatingCashFlow: number | null;
    capex: number | null;
    freeCashFlow: number | null;
    rnd: number | null;
  };
  balance: {
    cash: number | null;
    totalDebt: number | null;
    equity: number | null;
    assets: number | null;
    liabilities: number | null;
    currentAssets: number | null;
    currentLiabilities: number | null;
    asOf: string | null;
  };
  ratios: {
    pe: number | null;
    ps: number | null;
    pb: number | null;
    fcfYield: number | null;
    grossMargin: number | null;
    operatingMargin: number | null;
    netMargin: number | null;
    roe: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    revenueGrowth: number | null;
    epsGrowth: number | null;
    revenueCagr3y: number | null;
  };
  annual: {
    revenue: AnnualPoint[];
    netIncome: AnnualPoint[];
    operatingIncome: AnnualPoint[];
    freeCashFlow: AnnualPoint[];
    eps: AnnualPoint[];
  };
};

export type Filing = { form: string; filed: string; description: string; url: string };

export type Technicals = {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  ema12: number | null;
  ema26: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  bbPctB: number | null;
  atr14: number | null;
  atrPct: number | null;
  volatility30d: number | null; // annualized
  volatility1y: number | null;
  maxDrawdown1y: number | null;
  beta: number | null;
  relVolume: number | null;
  support: number | null;
  resistance: number | null;
  returns: Record<string, number | null>; // 1W,1M,3M,6M,YTD,1Y,3Y,5Y
  signals: { name: string; value: string; bias: "bullish" | "bearish" | "neutral" }[];
  trend: "uptrend" | "downtrend" | "sideways";
};

export type Scores = {
  overall: number;
  momentum: number;
  trend: number;
  value: number | null;
  quality: number | null;
  growth: number | null;
  sentiment: number;
  risk: number; // higher = safer
};

export type Peer = { symbol: string; name: string; price: number | null; changePct: number | null; ret1y: number | null };

export type Dossier = {
  symbol: string;
  generatedAt: number;
  quote: Quote;
  profile: { sector?: string; industry?: string; longName: string };
  candles: Candle[]; // ~5y daily
  technicals: Technicals;
  fundamentals: Fundamentals | null;
  filings: Filing[];
  news: NewsItem[];
  newsStats: { count: number; avg: number; bullish: number; bearish: number; neutral: number; topics: Record<string, number> };
  peers: Peer[];
  scores: Scores;
  warnings: string[];
};
