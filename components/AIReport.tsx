"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Copy, Globe, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import type { Dossier } from "@/lib/types";
import { fmtNum } from "@/lib/format";

type Ev = { t: "status"; m: string } | { t: "source"; title: string; url: string } | { t: "text"; d: string } | { t: "done"; engine: string } | { t: "error"; m: string };

async function readStream(res: Response, on: (e: Ev) => void) {
  if (!res.body) throw new Error("No stream");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) on(JSON.parse(line));
    }
  }
}

type Verdict = { rating: string; confidence: number; fairValueLow: number; fairValueHigh: number; horizon: string; oneLiner: string };

function splitVerdict(md: string): { body: string; verdict: Verdict | null } {
  const m = md.match(/```json\s*([\s\S]*?)```\s*$/);
  if (m) {
    try {
      return { body: md.slice(0, m.index).trim(), verdict: JSON.parse(m[1]) };
    } catch {
      /* fallthrough */
    }
  }
  // Hide a partially streamed json block.
  const open = md.lastIndexOf("```json");
  return { body: open >= 0 ? md.slice(0, open) : md, verdict: null };
}

const RATING_TONE = (r: string) => (/buy|accumulate/i.test(r) ? "text-up" : /sell|reduce/i.test(r) ? "text-down" : "text-ink");
const RATING_GLYPH = (r: string) => (/buy|accumulate/i.test(r) ? "▲" : /sell|reduce/i.test(r) ? "▼" : "■");

const md = (s: string) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
    {s}
  </ReactMarkdown>
);

export default function AIReport({ d, llm }: { d: Dossier; llm: boolean }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [engine, setEngine] = useState("");
  const [err, setErr] = useState("");
  const abort = useRef<AbortController | null>(null);
  const cacheKey = `tikr-report:${d.symbol}`;

  const run = useCallback(async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setText(""); setStatus([]); setSources([]); setErr(""); setState("running");
    let acc = "";
    try {
      const res = await fetch(`/api/analyze/${encodeURIComponent(d.symbol)}`, { method: "POST", signal: ctrl.signal });
      await readStream(res, (e) => {
        if (e.t === "text") { acc += e.d; setText(acc); }
        else if (e.t === "status") setStatus((s) => [...s, e.m]);
        else if (e.t === "source") setSources((s) => (s.some((x) => x.url === e.url) ? s : [...s, { title: e.title, url: e.url }]));
        else if (e.t === "done") { setEngine(e.engine); setState("done"); }
        else if (e.t === "error") { setErr(e.m); setState("error"); }
      });
      setState((s) => (s === "running" ? "done" : s));
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ text: acc, at: Date.now() })); } catch {}
    } catch (e) {
      if ((e as Error).name !== "AbortError") { setErr((e as Error).message); setState("error"); }
    }
  }, [d.symbol, cacheKey]);

  // Restore a report from this tab session, otherwise auto-run.
  useEffect(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (c && Date.now() - c.at < 30 * 60_000 && c.text) { setText(c.text); setState("done"); setEngine("cached"); return; }
    } catch {}
    run();
    return () => abort.current?.abort();
  }, [cacheKey, run]);

  const { body, verdict } = splitVerdict(text);
  const price = d.quote.price;
  const upside = verdict ? ((verdict.fairValueLow + verdict.fairValueHigh) / 2 / price - 1) * 100 : null;

  return (
    <section className="card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 hairline">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-md border bg-raised text-ink hairline">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Research Note</div>
            <div className="text-[11px] text-mute">
              {state === "running" ? "Analyst is working…" : engine ? `by ${engine}` : llm ? "Claude + live web research" : "Built-in quant analyst"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost h-8 !px-3 text-xs" onClick={() => navigator.clipboard.writeText(text)} disabled={!text}><Copy size={13} /> Copy</button>
          <button className="btn-ghost h-8 !px-3 text-xs" onClick={run} disabled={state === "running"}>
            {state === "running" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Regenerate
          </button>
        </div>
      </div>

      {verdict && (
        <div className="grid gap-3 border-b px-5 py-4 hairline sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <div className="rounded-md border bg-raised px-4 py-2 text-center hairline">
            <div className="eyebrow">Rating</div>
            <div className={clsx("text-lg font-semibold", RATING_TONE(verdict.rating))}><span className="mr-1.5 text-xs">{RATING_GLYPH(verdict.rating)}</span>{verdict.rating}</div>
          </div>
          <div className="text-sm text-ink/85">{verdict.oneLiner}</div>
          <div className="num flex gap-5 text-right text-xs text-mute">
            <div>Fair value ({verdict.horizon})<div className="text-sm font-semibold text-ink">{fmtNum(verdict.fairValueLow)}–{fmtNum(verdict.fairValueHigh)}</div></div>
            {upside != null && <div>Implied<div className={clsx("text-sm font-semibold", upside >= 0 ? "text-up" : "text-down")}>{upside >= 0 ? "+" : ""}{upside.toFixed(1)}%</div></div>}
            <div>Confidence<div className="text-sm font-semibold text-ink">{verdict.confidence}%</div></div>
          </div>
        </div>
      )}

      <div className="px-5 py-5">
        {(state === "running" || status.length > 0) && (
          <div className="mb-4 space-y-1">
            {status.slice(-4).map((s, i, arr) => (
              <div key={i} className={clsx("flex items-center gap-2 text-xs", i === arr.length - 1 && state === "running" ? "text-ink/80" : "text-mute")}>
                {s.startsWith("Searching") ? <Globe size={12} /> : <Bot size={12} />}
                <span className="truncate">{s}</span>
                {i === arr.length - 1 && state === "running" && !text && <Loader2 size={12} className="animate-spin" />}
              </div>
            ))}
          </div>
        )}
        {!text && state === "running" && (
          <div className="space-y-3">
            {[90, 75, 82, 60, 88, 70].map((w, i) => <div key={i} className="skeleton h-3.5" style={{ width: `${w}%` }} />)}
          </div>
        )}
        {body && <div className={clsx("prose-tikr", state === "running" && "caret")}>{md(body)}</div>}
        {state === "error" && (
          <div className="mt-3 rounded-md border border-down/40 bg-raised px-4 py-3 text-sm text-ink">
            {err || "Something went wrong."} <button onClick={run} className="ml-2 underline">Retry</button>
          </div>
        )}
        {sources.length > 0 && (
          <div className="mt-6 border-t pt-4 hairline">
            <div className="eyebrow mb-2">Web sources consulted</div>
            <div className="flex flex-wrap gap-1.5">
              {sources.slice(0, 16).map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="chip max-w-[260px] text-mute hover:text-ink">
                  <Globe size={11} className="shrink-0" /><span className="truncate">{s.title || s.url}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        <p className="mt-6 text-[11px] text-mute">For research and education only — not investment advice. AI output can be wrong; verify against filings.</p>
      </div>
    </section>
  );
}

type Msg = { role: "user" | "assistant"; content: string };

export function AskAI({ d, llm }: { d: Dossier; llm: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const name = d.quote.name.split(" ")[0];
  const suggestions = [
    `What drove ${d.symbol}'s move over the last month?`,
    `How does ${name}'s valuation compare to peers?`,
    `What are the biggest risks for ${name} next 12 months?`,
    `Summarize the latest earnings in 5 bullets`,
  ];

  useEffect(() => {
    setMsgs([]);
  }, [d.symbol]);
  useEffect(() => {
    // Scroll the chat pane only (never the page) as answers stream in.
    const el = end.current?.parentElement;
    if (el && msgs.length) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs;
    setMsgs([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    setQ(""); setBusy(true); setStatus("Thinking…");
    let acc = "";
    try {
      const res = await fetch(`/api/ask/${encodeURIComponent(d.symbol)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      await readStream(res, (e) => {
        if (e.t === "text") {
          acc += e.d;
          setStatus("");
          setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]);
        } else if (e.t === "status") setStatus(e.m);
        else if (e.t === "error") setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: `⚠️ ${e.m}` }]);
      });
    } catch (e) {
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false); setStatus("");
    }
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="card-title flex items-center gap-2"><Bot size={14} className="text-mute" /> Ask the analyst</h3>
        {!llm && <span className="chip">Requires API key</span>}
      </div>
      {msgs.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)} className="rounded-md border px-3 py-2.5 text-left text-[13px] text-ink/85 transition-colors hairline hover:bg-raised">{s}</button>
          ))}
        </div>
      )}
      <div className="max-h-[480px] space-y-4 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={clsx("max-w-[92%] rounded-lg px-4 py-2.5", m.role === "user" ? "bg-raised text-sm" : "border hairline")}>
              {m.role === "user" ? m.content : m.content ? <div className="prose-tikr !text-[13.5px]">{md(m.content)}</div> : (
                <span className="flex items-center gap-2 text-xs text-mute"><Loader2 size={12} className="animate-spin" /> {status || "Thinking…"}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Ask anything about ${d.symbol}…`}
          className="field h-10 min-w-0 flex-1 px-3 text-sm placeholder:text-mute"
        />
        <button className="btn-primary h-10 !px-3" disabled={busy || !q.trim()} aria-label="Send"><Send size={15} /></button>
      </form>
    </section>
  );
}
