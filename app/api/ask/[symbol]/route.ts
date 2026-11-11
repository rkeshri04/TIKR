import { buildDossier } from "@/lib/research";
import { streamAnswer } from "@/lib/llm";
import { ndjson } from "@/lib/ndjson";

export const maxDuration = 180;

export async function POST(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { question?: string; history?: { role: "user" | "assistant"; content: string }[] };
  const question = String(body.question ?? "").slice(0, 1000).trim();
  if (!question) return new Response("question required", { status: 400 });
  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  return ndjson(async (emit) => {
    const d = await buildDossier(symbol);
    await streamAnswer(d, question, history, emit);
  });
}
