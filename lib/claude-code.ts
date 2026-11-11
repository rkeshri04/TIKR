// Runs the research analyst through the Claude Code CLI installed on this
// machine, so usage is billed to the Claude Code login (Pro/Max plan or
// whatever the CLI is signed in with) instead of an API key.
//
// The CLI is locked down for this job: it runs in an empty temp directory
// (no project files or CLAUDE.md), with no MCP servers, no slash commands,
// no saved session, and only the web tools available and pre-approved.
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { StreamEvent } from "./llm";

type Emit = (e: StreamEvent) => void;

export const CLAUDE_BIN = () => process.env.TIKR_CLAUDE_BIN || "claude";

let probe: Promise<string | null> | null = null;
/** Resolves to the CLI version string if `claude` is installed and runnable, else null. Cached. */
export function claudeCodeVersion(): Promise<string | null> {
  if (!probe) {
    probe = new Promise((resolve) => {
      let out = "";
      try {
        const p = spawn(CLAUDE_BIN(), ["--version"], { stdio: ["ignore", "pipe", "ignore"], shell: process.platform === "win32" });
        const t = setTimeout(() => { p.kill(); resolve(null); }, 8000);
        p.stdout.on("data", (b) => (out += b));
        p.on("error", () => { clearTimeout(t); resolve(null); });
        p.on("close", (code) => { clearTimeout(t); resolve(code === 0 && out.trim() ? out.trim().split("\n")[0] : null); });
      } catch {
        resolve(null);
      }
    });
    // Re-check later if it wasn't found (e.g. installed after the server started).
    probe.then((v) => { if (!v) setTimeout(() => (probe = null), 60_000); });
  }
  return probe;
}

/** Quote an argument for cmd.exe when we must use a shell on Windows. */
const winQuote = (a: string) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

export async function runClaudeCode(opts: {
  system: string;
  prompt: string;
  emit: Emit;
  maxSearches: number;
  web: boolean;
  signal?: AbortSignal;
}): Promise<void> {
  const { emit } = opts;
  const dir = await mkdtemp(path.join(tmpdir(), "tikr-cc-"));
  const sysFile = path.join(dir, "system.md");
  const searchRule =
    opts.web && opts.maxSearches > 0
      ? `\n\nYou may use the web tools at most ${opts.maxSearches} times in total. Do not narrate tool use; output only the final answer.`
      : "\n\nYou have no tools. Answer from the material provided.";
  await writeFile(sysFile, opts.system + searchRule, "utf8");

  const tools = opts.web && opts.maxSearches > 0 ? ["WebSearch", "WebFetch"] : [];
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--system-prompt-file", sysFile,
    "--tools", tools.length ? tools.join(",") : "",
    ...(tools.length ? ["--allowedTools", ...tools] : []),
    "--permission-mode", "dontAsk",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--disable-slash-commands",
  ];
  if (process.env.TIKR_CLAUDE_CODE_MODEL) args.push("--model", process.env.TIKR_CLAUDE_CODE_MODEL);
  if (process.env.TIKR_EFFORT) args.push("--effort", process.env.TIKR_EFFORT);

  // Make the CLI use its own login: an API key in our environment would
  // otherwise take precedence and bill the API instead of the plan.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.CLAUDECODE; // allow launching from inside a Claude Code session

  const win = process.platform === "win32";
  const child = spawn(win ? winQuote(CLAUDE_BIN()) : CLAUDE_BIN(), win ? args.map(winQuote) : args, {
    cwd: dir,
    env,
    stdio: ["pipe", "pipe", "pipe"],
    shell: win,
  });

  const timeoutMs = Number(process.env.TIKR_CLAUDE_CODE_TIMEOUT_MS) || 300_000;
  const timer = setTimeout(() => child.kill(), timeoutMs);
  const onAbort = () => child.kill();
  opts.signal?.addEventListener("abort", onAbort);

  let stderr = "";
  let result: { ok: boolean; text: string } | null = null;
  let buf = "";
  const seenSources = new Set<string>();

  const handle = (o: any) => {
    if (o.type === "stream_event") {
      const ev = o.event;
      if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta") emit({ t: "text", d: ev.delta.text });
      // Any text written before a tool call is preamble ("Let me search…"): drop it.
      else if (ev?.type === "content_block_start" && ev.content_block?.type === "tool_use") emit({ t: "reset" });
    } else if (o.type === "assistant") {
      for (const c of o.message?.content ?? []) {
        if (c?.type !== "tool_use") continue;
        if (c.name === "WebSearch" && c.input?.query) emit({ t: "status", m: `Searching the web: ${c.input.query}` });
        if (c.name === "WebFetch" && c.input?.url) emit({ t: "status", m: `Reading ${c.input.url}` });
      }
    } else if (o.type === "user") {
      // Web search results arrive as text containing a JSON "Links: [...]" list.
      for (const c of o.message?.content ?? []) {
        const text = typeof c?.content === "string" ? c.content : Array.isArray(c?.content) ? c.content.map((x: any) => x?.text ?? "").join("") : "";
        const m = text.match(/Links:\s*(\[[\s\S]*?\])\s*\n/);
        if (!m) continue;
        try {
          for (const l of (JSON.parse(m[1]) as { title?: string; url?: string }[]).slice(0, 5)) {
            if (l.url && !seenSources.has(l.url)) {
              seenSources.add(l.url);
              emit({ t: "source", title: l.title || l.url, url: l.url });
            }
          }
        } catch {
          /* not the format we expected; skip sources */
        }
      }
    } else if (o.type === "result") {
      result = { ok: o.subtype === "success" && !o.is_error, text: String(o.result ?? o.subtype ?? "") };
    }
  };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        handle(JSON.parse(line));
      } catch {
        /* non-JSON noise */
      }
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (s: string) => (stderr = (stderr + s).slice(-4000)));

  // The prompt (dossier) goes in on stdin: avoids command-line length limits.
  child.stdin.end(opts.prompt);

  const code: number | null = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  }).finally(() => {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }) as number | null;

  const r = result as { ok: boolean; text: string } | null;
  if (r?.ok) return;
  if (opts.signal?.aborted) return;
  const detail = r?.text || stderr.trim().split("\n").filter(Boolean).slice(-2).join(" ") || `exited with code ${code}`;
  const hint = /log ?in|auth|credential|api key|unauthor/i.test(detail) ? " Run `claude` once in a terminal and sign in." : "";
  throw new Error(`Claude Code failed: ${detail.slice(0, 300)}${hint}`);
}
