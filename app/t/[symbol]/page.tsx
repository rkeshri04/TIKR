import Dashboard from "@/components/Dashboard";
import { normalizeSymbol } from "@/lib/yahoo";

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return { title: `${normalizeSymbol(symbol)} · TIKR research` };
}

export default async function Page({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <Dashboard symbol={normalizeSymbol(symbol)} />;
}
