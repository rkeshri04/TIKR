import Link from "next/link";

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c8cff" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#lg)" />
        <path d="M12 42l12-12 9 8 19-19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg">TIKR</span>
    </Link>
  );
}
