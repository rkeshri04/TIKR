import Link from "next/link";

export default function Logo({ size = 24 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="12" className="fill-ink" />
        <path d="M14 42l11-11 8 7 17-17" fill="none" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" className="stroke-bg" />
      </svg>
      <span>TIKR</span>
    </Link>
  );
}
