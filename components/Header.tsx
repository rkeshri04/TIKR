"use client";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import Logo from "./Logo";
import MarketTape from "./MarketTape";
import SearchBox from "./SearchBox";
import ThemeToggle from "./ThemeToggle";

export default function Header({ search = true }: { search?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-bg hairline">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Logo />
        <div className="mx-auto w-full max-w-xl">{search && <SearchBox />}</div>
        <Link href="/guide" className="btn-ghost h-9 !px-3 text-[13px]" aria-label="How to use TIKR">
          <BookOpen size={15} /> <span className="hidden sm:inline">Guide</span>
        </Link>
        <ThemeToggle />
      </div>
      <MarketTape />
    </header>
  );
}
