import type { StreamEvent } from "./llm";

/** Turn an emitter-style producer into a streaming NDJSON Response. */
export function ndjson(run: (emit: (e: StreamEvent) => void) => Promise<void>) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const emit = (e: StreamEvent) => {
        try {
          ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          /* client went away */
        }
      };
      try {
        await run(emit);
      } catch (e) {
        console.error("[tikr] stream failed", e);
        const m = (e as { status?: number }).status === 401 ? "LLM authentication failed — check ANTHROPIC_API_KEY." : (e as Error).message || "Analysis failed";
        emit({ t: "error", m });
      } finally {
        try { ctrl.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
