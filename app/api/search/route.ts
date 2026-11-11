import { NextResponse } from "next/server";
import { search } from "@/lib/yahoo";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ hits: [] });
  try {
    const { hits } = await search(q, 8, 0);
    return NextResponse.json({ hits }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (e) {
    return NextResponse.json({ hits: [], error: (e as Error).message }, { status: 502 });
  }
}
