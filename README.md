# TIKR — AI stock research terminal

Type any ticker and TIKR builds a full research dossier in a few seconds. It pulls prices, SEC filings and every recent headline, computes technicals and a quant scorecard, and then an AI analyst writes a research note you can question further.

All data sources are free and need no keys. The AI layer is optional: without a key, a built-in rules-based analyst writes the note.

## What you get

| Panel | Source | Notes |
|---|---|---|
| Live quote & market tape | Yahoo Finance `v8/chart` | Indices, VIX, 10Y, dollar, gold, crude, BTC/ETH |
| Interactive chart | Yahoo Finance | 1D → MAX, line or candles, volume, SMA 50/200, Bollinger, OHLC crosshair |
| Fundamentals & ratios | **SEC EDGAR XBRL** (`companyfacts`) | TTM revenue, margins, EPS, FCF, balance sheet, P/E, P/S, P/B, FCF yield, ROE, growth, 8-year history charts |
| SEC filings | EDGAR `submissions` | 10-K / 10-Q / 8-K / proxy, plus insider Form 4s |
| News intelligence | **Google News RSS → JSON** + Yahoo | 4 targeted queries fanned out in parallel, de-duplicated, capped per day for 30-day coverage, finance-lexicon sentiment, topic tags |
| Technicals | computed locally | RSI, MACD, Bollinger %B, ATR, volatility, max drawdown, beta vs SPY, support/resistance, signal list |
| TIKR Score | computed locally | 0–100 composite from momentum, trend, value, quality, growth, sentiment and safety |
| Related tickers | Yahoo recommendations | 1-year return comparison |
| **AI research note** | Claude + live web search | Verdict, fair-value range, bull/bear case, catalysts, risks; streamed with the sources it consulted |
| **Ask the analyst** | Claude | Follow-up Q&A grounded in the dossier |

It works with US and global equities, ETFs, indices, crypto, futures and FX: anything with a Yahoo Finance symbol (`AAPL`, `BRK-B`, `RELIANCE.NS`, `7203.T`, `BTC-USD`, `^GSPC`). SEC fundamentals are available for US filers only.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add ANTHROPIC_API_KEY, SEC_USER_AGENT
npm run dev                  # http://localhost:3000
```

Production: `npm run build && npm start`.

### Configuration (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Enables the Claude analyst note and Q&A. Without it, TIKR uses the built-in quant analyst. |
| `TIKR_MODEL` | `claude-opus-5-5` | Model used for research |
| `TIKR_EFFORT` | `high` | `low` / `medium` / `high` / `xhigh` / `max`. Lower is faster and cheaper. |
| `TIKR_WEB_SEARCH` | `1` | Lets Claude run up to 6 web searches per note (3 per question). Set to `0` to turn this off. |
| `SEC_USER_AGENT` | generic | The SEC asks automated clients to identify themselves. Set it to `"YourApp your@email.com"`. |

If you're behind an HTTP proxy, Node's built-in `fetch` ignores `HTTPS_PROXY` unless you start it with `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).

## How it works

```
browser ──► /api/dossier/:symbol ──► lib/research.ts
                                      ├─ yahoo.ts    chart (5y daily), search, peers
                                      ├─ sec.ts      CIK lookup, XBRL facts → TTM + ratios, filings
                                      ├─ news.ts     Google News RSS ×4 + Yahoo → dedupe → sentiment
                                      ├─ indicators.ts  RSI/MACD/BB/ATR/vol/beta/returns
                                      └─ scores      7-factor composite
browser ──► /api/analyze/:symbol (NDJSON stream) ──► lib/llm.ts
                                      └─ Claude (adaptive thinking, web search, refusal fallback)
```

- **No paid market-data API.** Yahoo's public chart and search endpoints need no key or crumb. Fundamentals come straight from SEC XBRL filings. TTM figures are computed as FY + latest YTD − prior-year YTD, and share classes are summed (e.g. GOOGL + GOOG).
- **Caching.** An in-memory TTL cache with in-flight de-duplication sits in front of every upstream call: quotes for 60s, news for 5 minutes, SEC facts for 6 hours, the ticker map for 24 hours.
- **Streaming.** The report streams to the browser as NDJSON events (`status`, `source`, `text`, `done`, `error`). Web searches Claude runs show up live, with links to their sources.
- **Graceful degradation.** Every source is optional except price history. If the LLM call fails, the page falls back to the quant note.

## Project layout

```
app/                 Next.js App Router pages + API routes
  api/dossier|analyze|ask|chart|market|search
  t/[symbol]/        ticker dashboard
components/          UI (chart, panels, AI report, news, search, theme)
lib/                 data sources, indicators, scoring, LLM
```

Built with Next.js 15, React 19, Tailwind, TradingView Lightweight Charts, Recharts and the Anthropic SDK. It has dark and light themes, a watchlist and recent tickers (stored in your browser), and `⌘K` opens search.

> For research and education only. Not investment advice. Quotes may be delayed. Google News RSS is intended for personal, non-commercial use, so check each source's terms before deploying publicly.
