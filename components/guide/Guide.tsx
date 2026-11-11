"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Info, Lightbulb } from "lucide-react";
import Header from "../Header";
import {
  ChartMock,
  FundamentalsMock,
  HeaderMock,
  NewsMock,
  PricedInMock,
  ReportMock,
  RsiMock,
  ScoreMock,
  SearchMock,
  TripwireMock,
} from "./Illustrations";

const TOC: [string, string][] = [
  ["start", "Start here"],
  ["search", "1. Find a stock"],
  ["header", "2. Read the price"],
  ["chart", "3. Use the chart"],
  ["score", "4. TIKR Score"],
  ["technicals", "5. Technicals"],
  ["priced-in", "6. What's priced in"],
  ["tripwires", "7. Thesis tripwires"],
  ["ai", "8. AI research note"],
  ["news", "9. News & sentiment"],
  ["financials", "10. Financials & filings"],
  ["extras", "11. Handy extras"],
  ["glossary", "Glossary"],
];

function Section({ id, step, title, lead, children }: { id: string; step?: string; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 border-t py-12 first:border-t-0 first:pt-0 hairline">
      {step && <div className="eyebrow mb-2">{step}</div>}
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mute">{lead}</p>
      <div className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-2 space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-white">{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

function Tip({ children, kind = "tip" }: { children: React.ReactNode; kind?: "tip" | "note" }) {
  return (
    <div className={clsx("my-5 flex gap-3 rounded-md border border-l-2 bg-panel p-4 text-[14px] hairline", kind === "tip" ? "border-l-accent" : "border-l-warn")}>
      {kind === "tip" ? <Lightbulb size={16} className="mt-0.5 shrink-0 text-accent" /> : <Info size={16} className="mt-0.5 shrink-0 text-warn" />}
      <div>{children}</div>
    </div>
  );
}

function Plain({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border bg-raised px-4 py-3 text-[14px] hairline">
      <span className="font-semibold">In plain words: </span>
      {children}
    </div>
  );
}

const K = ({ children }: { children: React.ReactNode }) => (
  <kbd className="rounded border bg-raised px-1.5 py-0.5 font-sans text-[12px] hairline">{children}</kbd>
);

export default function Guide() {
  const [active, setActive] = useState("start");

  // Highlight the section currently on screen in the table of contents.
  useEffect(() => {
    const els = TOC.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6">
        <div className="py-12 sm:py-16">
          <div className="eyebrow mb-3">Guide</div>
          <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">How to use TIKR</h1>
          <p className="mt-3 max-w-2xl text-lg text-mute">
            A simple walkthrough of every tool, in everyday language. No finance background needed. It takes about 10 minutes to read.
          </p>
        </div>

        {/* Mobile table of contents */}
        <nav className="-mx-4 mb-8 flex gap-1.5 overflow-x-auto px-4 pb-2 lg:hidden">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip whitespace-nowrap !px-2.5 !py-1">{label}</a>
          ))}
        </nav>

        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <aside className="hidden lg:block">
            <nav className="sticky top-[118px] space-y-0.5 border-l hairline">
              {TOC.map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={clsx(
                    "-ml-px block border-l py-1.5 pl-4 text-[13px] transition-colors",
                    active === id ? "border-accent font-medium text-ink" : "border-transparent text-mute hover:text-ink",
                  )}
                >
                  {label}
                </a>
              ))}
            </nav>
          </aside>

          <main className="min-w-0">
            <Section id="start" title="Start here" lead="TIKR looks up a stock for you and puts everything you'd want to know on one page.">
              <p>
                When you open a stock, TIKR gathers its price history, the official reports the company files with the U.S. government (the SEC),
                and hundreds of recent news headlines. It does the math for you and then explains what it found.
              </p>
              <p className="mt-3">You don&apos;t need to use every tool. A good first visit looks like this:</p>
              <Steps
                items={[
                  <>Search for a company you know.</>,
                  <>Look at the <b>chart</b> to see where the price has been.</>,
                  <>Read the <b>AI research note</b> for the big picture.</>,
                  <>Open <b>What&apos;s priced in</b> to see what the price is betting on, then decide whether you agree.</>,
                ]}
              />
              <Tip kind="note">TIKR is for learning and research. It does not tell you what to buy or sell, and its numbers and AI writing can be wrong.</Tip>
            </Section>

            <Section id="search" step="Step 1" title="Find a stock" lead="Type a company's name or its ticker (the short code it trades under, like AAPL for Apple).">
              <SearchMock />
              <Steps
                items={[
                  <>Click the search box and start typing, for example <i>apple</i> or <i>AAPL</i>.</>,
                  <>Pick the right company from the list and press <K>Enter</K>, or click it. The top match is highlighted.</>,
                  <>Shortcut: press <K>⌘</K> <K>K</K> (Mac) or <K>Ctrl</K> <K>K</K> (Windows), or just <K>/</K>, to jump to search from anywhere.</>,
                ]}
              />
              <Tip>
                It works for more than U.S. stocks: funds (SPY), indexes (^GSPC for the S&amp;P 500), crypto (BTC-USD) and foreign stocks (RELIANCE.NS for India, 7203.T for Japan).
              </Tip>
            </Section>

            <Section id="header" step="Step 2" title="Read the price" lead="The top of each stock page shows the most important facts at a glance.">
              <HeaderMock />
              <Steps
                items={[
                  <>The <b>star</b> adds the stock to your watchlist, so it shows on the home page next time.</>,
                  <>
                    The <b>price</b> and how much it moved since yesterday&apos;s close. <span className="text-up">▲ Green</span> means up and{" "}
                    <span className="text-down">▼ red</span> means down. The arrow is always there, so you can tell even if colors are hard to see.
                  </>,
                ]}
              />
              <p className="mt-4">Below the header there&apos;s a menu (Overview, Priced in, AI analysis, Financials, News) that jumps straight to each part of the page.</p>
            </Section>

            <Section id="chart" step="Step 3" title="Use the chart" lead="The chart shows how the price has moved over time.">
              <ChartMock />
              <Steps
                items={[
                  <>Choose a <b>time range</b>: from one day (1D) all the way to the company&apos;s full history (MAX).</>,
                  <>
                    Turn on the <b>average lines</b>. <b>SMA 50</b> is the average price over the last 50 trading days (about 2½ months); <b>SMA 200</b> covers about 10 months.
                    They smooth out the daily noise. Switch <b>Line</b> to <b>Candles</b> for a more detailed view.
                  </>,
                  <>Move your mouse over the chart to see the exact numbers for any day: Open, High, Low, Close and Volume (how many shares traded).</>,
                ]}
              />
              <Plain>
                When the price is above its 200-day line, it has generally been heading up. When it&apos;s below, it has generally been heading down. Neither
                tells you what happens next.
              </Plain>
              <p>
                Under the chart, <b>Performance</b> shows how much the price changed over a week, a month, this year (YTD) and up to five years. The{" "}
                <b>Key statistics</b> panel lists facts like company size and profit. The glossary at the bottom explains each one.
              </p>
            </Section>

            <Section id="score" step="Step 4" title="TIKR Score" lead="A quick 0–100 summary built from seven simple checks.">
              <ScoreMock />
              <Steps
                items={[
                  <>The <b>overall score</b>. Roughly: 70+ strong, 45–70 mixed, under 45 weak.</>,
                  <>The <b>pieces</b> behind it. A longer bar is a better reading for that piece.</>,
                ]}
              />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  ["Momentum", "Has the price been rising lately?"],
                  ["Trend", "Are the average lines pointing up?"],
                  ["Value", "Is the price low compared with its profits and cash?"],
                  ["Quality", "Does it keep a good share of each sale as profit, without too much debt?"],
                  ["Growth", "Are sales and profits getting bigger?"],
                  ["Sentiment", "Is recent news mostly good or bad?"],
                  ["Safety", "How calm is the price? Higher means smaller swings."],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border bg-panel p-3 text-[14px] hairline"><b className="font-medium">{k}</b><div className="text-mute">{v}</div></div>
                ))}
              </div>
              <Tip>A score is a starting point for questions, not an answer. A low Value score on a fast-growing company can be perfectly normal.</Tip>
            </Section>

            <Section id="technicals" step="Step 5" title="Technicals" lead="Signals that come from the price chart alone. Traders use them to judge short-term mood.">
              <RsiMock />
              <p>
                Next to the dial is a list of <b>signals</b>, each with an arrow: <span className="text-up">↗</span> leans positive,{" "}
                <span className="text-down">↘</span> leans negative, — is neutral. You&apos;ll also see the <b>52-week range</b>: a bar from the lowest to the highest price of
                the past year, with a marker showing where the price sits today.
              </p>
              <Plain>Technicals describe the past few weeks of price moves. They say nothing about whether the business itself is good.</Plain>
            </Section>

            <Section
              id="priced-in"
              step="Step 6 · TIKR's signature tool"
              title="What's priced in"
              lead="Every stock price is secretly a forecast. This tool tells you what that forecast is, in one sentence."
            >
              <Plain>
                When you buy a stock, you&apos;re buying a share of all the cash the company will make in the future. So a high price means buyers expect a lot of
                future cash. TIKR works backwards from today&apos;s price to find out <i>how fast the company would need to grow</i> for the price to make sense. Then
                it compares that with how fast the company has <i>actually</i> grown.
              </Plain>
              <PricedInMock />
              <Steps
                items={[
                  <>
                    <b>Read the sentence.</b> If the price needs 11.7% a year but the company has only managed 7.9%, the market is expecting it to do better than
                    it ever has. The label in the corner sums this up: <i>Undemanding</i>, <i>In line with history</i>, <i>Demanding</i> or <i>Heroic</i>.
                  </>,
                  <>
                    <b>Look at the lines.</b> If the dashed orange line climbs much faster than the gray history, the price is asking a lot.
                  </>,
                  <>
                    <b>Set your own view.</b> Drag the sliders to how fast <i>you</i> think the company will grow. The buttons give quick starting points: its{" "}
                    <i>Track record</i>, what the <i>Market</i> assumes, or a cautious <i>Bear case</i>.
                  </>,
                  <>
                    <b>See your fair value</b>: what the stock would be worth if you&apos;re right, and how far that is above (<span className="text-up">▲ upside</span>) or
                    below (<span className="text-down">▼ downside</span>) today&apos;s price.
                  </>,
                ]}
              />
              <Tip>
                Leave the <b>discount rate</b> slider alone unless you know what it does. TIKR already sets it from today&apos;s interest rates and how jumpy the
                stock is. Raising it makes future cash count for less.
              </Tip>
              <Tip kind="note">
                This tool doesn&apos;t work for banks, insurance companies, real-estate trusts, or companies that are currently losing cash. TIKR tells you when that&apos;s the case instead of showing a misleading number.
              </Tip>
            </Section>

            <Section
              id="tripwires"
              step="Step 7"
              title="Thesis tripwires"
              lead="Write down what you believe, and TIKR keeps checking whether reality still agrees with you."
            >
              <Plain>
                A <i>thesis</i> is simply your reason for liking (or disliking) a stock, such as &quot;sales will grow 12% a year.&quot; Most people forget what they
                believed and hold on too long when things change. Tripwires remember for you.
              </Plain>
              <TripwireMock />
              <Steps
                items={[
                  <>
                    In <b>What&apos;s priced in</b>, set your sliders and click <b>Save as my thesis</b>. Optionally add a short note on why, and a{" "}
                    <b>reconsider price</b>. If your fair value is above the price it&apos;s saved as <b>▲ Bullish</b>, and if below, as <b>▼ Bearish</b>.
                  </>,
                  <>
                    Every time you open the stock, TIKR re-checks your beliefs against the newest reports, price and news. A{" "}
                    <span className="text-up">✓ tick</span> means it&apos;s fine, a <span className="text-warn">⚠ triangle</span> means it needs a look, and a{" "}
                    <span className="text-down">⊘ circle</span> means a tripwire was hit.
                  </>,
                ]}
              />
              <p className="mt-4">
                The checks ask simple questions: Is the company growing as fast as you assumed? Is it still turning sales into cash? Is there still room between the price and your
                value? Has the news turned? Has the company filed a new report since you decided?
              </p>
              <Tip>
                The home page shows a <b>Your theses</b> table with every saved belief, problems first, so you can check everything in one look. Theses are
                saved in this browser only.
              </Tip>
            </Section>

            <Section id="ai" step="Step 8" title="AI research note & Ask the analyst" lead="An AI analyst reads everything TIKR collected and writes you a report.">
              <ReportMock />
              <Steps
                items={[
                  <>
                    The note starts with a <b>rating</b> (Buy, Hold, Sell and so on), a <b>fair-value range</b> and a one-line reason. Below it are sections like the
                    bull case (reasons it could go up), the bear case (reasons it could go down), catalysts (upcoming events) and key risks.
                  </>,
                  <>
                    <b>Ask the analyst</b>: type any question in plain English, such as &quot;Why did it drop last month?&quot; or &quot;How does it compare with
                    Microsoft?&quot;, or click one of the suggested questions.
                  </>,
                ]}
              />
              <p className="mt-4">
                When the AI searches the web while writing, you&apos;ll see what it&apos;s looking up, and the links it used appear at the bottom. Click{" "}
                <b>Regenerate</b> for a fresh note, or <b>Copy</b> to save it.
              </p>
              <Tip kind="note">
                The AI is switched on by whoever runs this TIKR site. They choose an Anthropic API key or the Claude Code app installed on their computer, using the{" "}
                <code className="rounded bg-raised px-1 font-mono text-[12.5px]">TIKR_AI_PROVIDER</code> setting. The panel header shows which one is in use. With neither, you get a simpler note from TIKR&apos;s
                built-in rules. Either way, treat it as a smart summary to check, not as advice.
              </Tip>
            </Section>

            <Section id="news" step="Step 9" title="News & sentiment" lead="Hundreds of recent headlines about the company, sorted and labeled for you.">
              <NewsMock />
              <Steps
                items={[
                  <>
                    The <b>mood</b> of the news over the past month: Positive, Mixed or Negative. The bars show how many good and bad headlines appeared each day.
                  </>,
                  <>
                    Each headline gets a label: <span className="text-up">▲ Bullish</span> (sounds good for the stock), <span className="text-down">▼ Bearish</span>{" "}
                    (sounds bad) or neutral. Use the filters and topic buttons (Earnings, Analysts, Legal…) to narrow the list. Click any headline to read the full story.
                  </>,
                ]}
              />
              <Plain>The labels come from the words in each headline, so they&apos;re a quick guide, not a judgment of the full article.</Plain>
            </Section>

            <Section id="financials" step="Step 10" title="Financials & SEC filings" lead="The company's own numbers, straight from its official government reports.">
              <FundamentalsMock />
              <Steps
                items={[
                  <>
                    Switch between three views. <b>Income</b> shows sales, profit and leftover cash each year. <b>Margins</b> shows how many cents of each sales dollar
                    become profit. <b>EPS</b> shows profit per share. Click <b>View as table</b> for exact numbers.
                  </>,
                ]}
              />
              <p className="mt-4">
                The <b>SEC filings</b> panel lists the company&apos;s recent official reports. <b>Reports</b> include the 10-K (yearly report), 10-Q (quarterly report)
                and 8-K (big news, like a new CEO or a deal). <b>Insider</b> lists Form 4s: trades by the company&apos;s own executives. Click any one to open the
                original document.
              </p>
            </Section>

            <Section id="extras" step="Step 11" title="Handy extras" lead="Small things that make TIKR faster to use every day.">
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Market tape", "The scrolling strip at the top shows the big indexes, interest rates, gold, oil and bitcoin. Click any one to open it. Hover to pause."],
                  ["Watchlist & recent", "Starred stocks and the ones you viewed recently appear on the home page."],
                  ["Light or dark", "Use the sun or moon button in the top-right corner. TIKR remembers your choice."],
                  ["Related tickers", "Companies people often look at alongside this one, with their 1-year returns side by side."],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-md border bg-panel p-3.5 text-[14px] hairline"><b className="font-medium">{k}</b><div className="mt-0.5 text-mute">{v}</div></div>
                ))}
              </div>
            </Section>

            <Section id="glossary" title="Glossary" lead="Common terms you'll see in TIKR, explained simply.">
              <dl className="divide-y rounded-lg border bg-panel hairline">
                {[
                  ["Ticker", "The short code a stock trades under, like AAPL for Apple."],
                  ["Market cap", "What the whole company is worth at today's price: the share price times the number of shares."],
                  ["Revenue", "All the money customers paid the company. Also called sales."],
                  ["Net income", "Profit left after paying every cost and tax."],
                  ["Free cash flow (FCF)", "Cash the business actually brings in after paying for buildings, equipment and other investments. Many investors watch this most closely."],
                  ["Margin", "The share of each sales dollar the company keeps as profit. A 25% margin means 25 cents of every dollar."],
                  ["P/E ratio", "Price divided by yearly profit per share. A P/E of 30 means you're paying $30 for every $1 of yearly profit."],
                  ["EPS", "Earnings per share: profit divided by the number of shares."],
                  ["TTM", "Trailing twelve months: the most recent full year of results."],
                  ["CAGR", "Average yearly growth over several years, as if it grew smoothly."],
                  ["Beta", "How much the stock tends to move compared with the overall market. 1.0 is the same; 2.0 is twice as jumpy."],
                  ["Volatility", "How much the price swings around. Higher means bumpier."],
                  ["Drawdown", "The biggest fall from a high point to a later low."],
                  ["Fair value", "An estimate of what a stock is worth, based on a set of assumptions. Change the assumptions and it changes."],
                  ["Discount rate", "How much less a dollar received in the future is worth than a dollar today. Higher rates make future cash count for less."],
                  ["Bullish / Bearish", "Expecting the price to go up / expecting it to go down."],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-1 px-4 py-3 hairline sm:grid-cols-[200px_1fr]">
                    <dt className="text-[14px] font-medium">{k}</dt>
                    <dd className="text-[14px] text-mute">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <div className="text-lg font-semibold">Ready to try it?</div>
                <div className="text-sm text-mute">Open a company you know and follow the steps above.</div>
              </div>
              <div className="flex gap-2">
                <Link href="/t/AAPL" className="btn-primary">Try it with Apple <ArrowRight size={14} /></Link>
                <Link href="/" className="btn-ghost">Back home</Link>
              </div>
            </div>
            <p className="mt-6 text-xs text-mute">For research and education only. Not investment advice.</p>
          </main>
        </div>
      </div>
    </div>
  );
}
