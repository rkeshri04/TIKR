export default function Sparkline({ data, w = 64, h = 22, up }: { data: number[]; w?: number; h?: number; up?: boolean }) {
  if (data.length < 2) return <svg width={w} height={h} />;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(" ");
  const isUp = up ?? data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline points={pts} fill="none" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" className={isUp ? "stroke-up" : "stroke-down"} />
    </svg>
  );
}
