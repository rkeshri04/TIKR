"use client";
import { Moon, Sun } from "lucide-react";
import { useThemeKey } from "./theme";

export default function ThemeToggle() {
  const theme = useThemeKey();
  const flip = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("tikr-theme", next); } catch {}
  };
  return (
    <button onClick={flip} aria-label="Toggle theme" className="btn-ghost h-9 w-9 !p-0">
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
