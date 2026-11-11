// Finance-tuned lexicon sentiment for headlines. Fast, deterministic and free,
// used for the news feed badges and for the score even when no LLM is set up.

const POS: Record<string, number> = {
  beat: 2, beats: 2, tops: 2, topped: 2, surpass: 2, surpasses: 2, record: 1.5, soar: 2.5, soars: 2.5, soared: 2.5,
  surge: 2.5, surges: 2.5, surged: 2.5, jump: 2, jumps: 2, jumped: 2, rally: 2, rallies: 2, rallied: 2, gain: 1, gains: 1,
  rise: 1, rises: 1, rising: 1, climbs: 1.5, climb: 1.5, upgrade: 2.5, upgraded: 2.5, upgrades: 2.5, outperform: 2,
  overweight: 1.5, buy: 1, bullish: 2, strong: 1, strength: 1, growth: 1, grows: 1, growing: 1, profit: 1, profitable: 1.5,
  raise: 1.5, raises: 1.5, raised: 1.5, boost: 1.5, boosts: 1.5, expands: 1, expansion: 1, wins: 1.5, win: 1, won: 1.5,
  approval: 2, approved: 2, approves: 2, partnership: 1, deal: 0.5, breakthrough: 2, launch: 0.5, launches: 0.5,
  dividend: 0.5, buyback: 1.5, repurchase: 1.2, optimistic: 1.5, upbeat: 1.5, accelerate: 1.2, accelerates: 1.2,
  momentum: 1, highs: 1.5, "all-time": 1, outperforms: 2, exceeds: 2, exceeded: 2, recovery: 1, rebound: 1.5, rebounds: 1.5,
  top: 0.5, best: 1, bargain: 1, undervalued: 1.5, opportunity: 1, positive: 1,
};
const NEG: Record<string, number> = {
  miss: 2, misses: 2, missed: 2, fall: 1.5, falls: 1.5, fell: 1.5, drop: 1.5, drops: 1.5, dropped: 1.5, plunge: 2.5,
  plunges: 2.5, plunged: 2.5, sink: 2, sinks: 2, sank: 2, tumble: 2.5, tumbles: 2.5, tumbled: 2.5, slump: 2, slumps: 2,
  crash: 3, crashes: 3, downgrade: 2.5, downgraded: 2.5, downgrades: 2.5, underperform: 2, underweight: 1.5, sell: 1,
  bearish: 2, weak: 1.5, weakness: 1.5, loss: 1.5, losses: 1.5, cut: 1.2, cuts: 1.2, slash: 2, slashes: 2, lawsuit: 2,
  sued: 2, sues: 2, probe: 2, investigation: 2, fraud: 3, recall: 2, recalls: 2, layoffs: 1.5, layoff: 1.5, warns: 2,
  warning: 2, warn: 2, risk: 0.7, risks: 0.7, concern: 1, concerns: 1, fears: 1.5, fear: 1.5, decline: 1.5, declines: 1.5,
  declined: 1.5, lower: 0.8, lowers: 1.2, lowered: 1.2, halt: 2, halted: 2, bankruptcy: 3, default: 2, delay: 1.2,
  delays: 1.2, delayed: 1.2, fine: 1, fined: 2, antitrust: 1.5, ban: 1.5, banned: 1.5, tariff: 1, tariffs: 1, selloff: 2,
  "sell-off": 2, volatile: 0.8, slowdown: 1.5, slows: 1.2, disappointing: 2, disappoints: 2, overvalued: 1.5, bubble: 1.5,
  negative: 1, worst: 1.5, lows: 1.5, struggle: 1.5, struggles: 1.5, resign: 1, resigns: 1.2, exodus: 1.5,
};
const NEGATORS = new Set(["not", "no", "never", "without", "fails", "fail", "failed"]);

const TOPICS: [string, RegExp][] = [
  ["Earnings", /\b(earnings|eps|quarter|q[1-4]|results|revenue|guidance|outlook)\b/i],
  ["Analysts", /\b(analyst|upgrade|downgrade|price target|rating|overweight|underweight|outperform)\b/i],
  ["Product", /\b(launch|product|unveil|release|model|chip|iphone|platform|feature)\b/i],
  ["Legal/Reg", /\b(lawsuit|sue|probe|investigation|sec|ftc|doj|antitrust|regulat|fine|court|ban)\b/i],
  ["M&A", /\b(acquire|acquisition|merger|buyout|takeover|deal to buy|stake)\b/i],
  ["Macro", /\b(fed|inflation|rates?|tariff|economy|recession|cpi|jobs report|treasury)\b/i],
  ["Leadership", /\b(ceo|cfo|executive|resign|appoint|board|founder)\b/i],
  ["AI", /\b(ai|artificial intelligence|genai|llm|gpu|data center)\b/i],
  ["Capital", /\b(dividend|buyback|repurchase|offering|debt|bond|split)\b/i],
];

export function scoreHeadline(text: string): { score: number; label: "bullish" | "bearish" | "neutral"; topics: string[] } {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-]/g, " ").split(/\s+/).filter(Boolean);
  let s = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const negated = NEGATORS.has(words[i - 1] ?? "") || NEGATORS.has(words[i - 2] ?? "");
    const v = (POS[w] ?? 0) - (NEG[w] ?? 0);
    s += negated ? -v * 0.8 : v;
  }
  if (/price target (raised|increase|hike)/i.test(text)) s += 2;
  if (/price target (cut|lowered|reduce)/i.test(text)) s -= 2;
  const score = Math.max(-1, Math.min(1, Math.tanh(s / 3)));
  const label = score > 0.15 ? "bullish" : score < -0.15 ? "bearish" : "neutral";
  const topics = TOPICS.filter(([, re]) => re.test(text)).map(([t]) => t);
  return { score: Math.round(score * 100) / 100, label, topics };
}
