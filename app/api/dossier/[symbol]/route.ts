import { NextResponse } from "next/server";
import { buildDossier } from "@/lib/research";
import { hasLLM } from "@/lib/llm";

export const maxDuration = 60;

export async function GET(_req: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  try {
    const d = await buildDossier(symbol);
    return NextResponse.json({ ...d, llm: hasLLM() });
  } catch (e) {
    const msg = (e as Error).message || "Failed to load";
    const status = /no data|not found|404/i.test(msg) ? 404 : 502;
    return NextResponse.json({ error: status === 404 ? `Couldn't find ticker "${symbol}".` : msg }, { status });
  }
}
