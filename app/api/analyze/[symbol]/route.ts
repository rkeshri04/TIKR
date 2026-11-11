import { buildDossier } from "@/lib/research";
import { streamReport } from "@/lib/llm";
import { ndjson } from "@/lib/ndjson";

export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  return ndjson(async (emit) => {
    emit({ t: "status", m: "Assembling dossier…" });
    const d = await buildDossier(symbol);
    await streamReport(d, emit, req.signal);
  });
}
