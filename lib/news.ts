// Google News RSS -> JSON. Several targeted queries are fanned out in
// parallel (ticker, company name, earnings, analysts) and merged, which gives
// far better coverage than a single query. Yahoo's search news is merged in.
import { XMLParser } from "fast-xml-parser";
import { cached, fetchText, settle } from "./http";
import { scoreHeadline } from "./sentiment";
import { search } from "./yahoo";
import type { NewsItem } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function textOf(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as any)["#text"]);
  return "";
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export async function googleNews(query: string, when = "30d"): Promise<NewsItem[]> {
  const q = `${query} when:${when}`;
  return cached(`gnews:${q}`, 5 * 60_000, async () => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchText(url);
    const doc = parser.parse(xml);
    let items = doc?.rss?.channel?.item ?? [];
    if (!Array.isArray(items)) items = [items];
    return items.map((it: any): NewsItem => {
      const source = textOf(it.source) || "Google News";
      let title = decodeEntities(textOf(it.title));
      // Google appends " - Publisher" to titles; strip it.
      if (title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
      const s = scoreHeadline(title);
      return {
        id: hash(title.toLowerCase()),
        title,
        url: textOf(it.link),
        source,
        published: Date.parse(textOf(it.pubDate)) || Date.now(),
        sentiment: s.score,
        label: s.label,
        topics: s.topics,
        origin: "google",
      };
    });
  });
}

/** Normalize a title for fuzzy de-duplication across outlets. */
function key(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 3).slice(0, 8).join(" ");
}

export function cleanCompanyName(name: string) {
  return name
    .replace(/,?\s+(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|holdings?|group|sa|ag|nv|se|class [a-c])\.?$/gi, "")
    .replace(/,?\s+(inc|corp|ltd|plc)\.?$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getNews(symbol: string, companyName: string): Promise<NewsItem[]> {
  const name = cleanCompanyName(companyName);
  const base = symbol.split(/[.=\-^]/)[0] || symbol;
  const queries = [
    `"${base}" stock`,
    `"${name}"`,
    `"${name}" earnings OR guidance OR revenue`,
    `"${name}" analyst OR upgrade OR downgrade OR "price target"`,
  ];
  const [yahoo, ...lists] = await Promise.all([
    settle(search(symbol, 1, 12)),
    ...queries.map((q, i) => settle(googleNews(q, i === 0 ? "7d" : "30d"))),
  ]);

  const merged: NewsItem[] = [];
  const seen = new Set<string>();
  const push = (n: NewsItem) => {
    const k = key(n.title);
    if (!k || seen.has(k)) return;
    seen.add(k);
    merged.push(n);
  };
  for (const n of yahoo?.news ?? []) {
    const s = scoreHeadline(n.title);
    push({
      id: n.uuid,
      title: n.title,
      url: n.link,
      source: n.publisher,
      published: n.providerPublishTime * 1000,
      sentiment: s.score,
      label: s.label,
      topics: s.topics,
      origin: "yahoo",
    });
  }
  for (const l of lists) for (const n of l ?? []) push(n);

  // Light relevance filter: keep items mentioning the ticker or a name token.
  const tokens = [base.toLowerCase(), ...name.toLowerCase().split(" ").filter((w) => w.length > 2).slice(0, 2)];
  const relevant = merged.filter((n) => tokens.some((t) => n.title.toLowerCase().includes(t)));
  const out = (relevant.length >= 8 ? relevant : merged).sort((a, b) => b.published - a.published);
  // Cap items per day so a busy news day can't crowd out the rest of the month.
  const perDay = new Map<string, number>();
  const spread = out.filter((n) => {
    const day = new Date(n.published).toISOString().slice(0, 10);
    const c = perDay.get(day) ?? 0;
    perDay.set(day, c + 1);
    return c < 14;
  });
  return spread.slice(0, 120);
}

export function newsStats(news: NewsItem[]) {
  const now = Date.now();
  let wsum = 0, w = 0;
  const topics: Record<string, number> = {};
  let bullish = 0, bearish = 0, neutral = 0;
  for (const n of news) {
    // Recency-weighted: half-life of ~7 days.
    const age = (now - n.published) / 86400000;
    const weight = Math.pow(0.5, Math.max(0, age) / 7);
    wsum += n.sentiment * weight;
    w += weight;
    if (n.label === "bullish") bullish++;
    else if (n.label === "bearish") bearish++;
    else neutral++;
    for (const t of n.topics) topics[t] = (topics[t] ?? 0) + 1;
  }
  return { count: news.length, avg: w ? Math.round((wsum / w) * 100) / 100 : 0, bullish, bearish, neutral, topics };
}
