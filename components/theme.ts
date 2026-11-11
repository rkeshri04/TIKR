"use client";
import { useEffect, useState } from "react";

/** Read a "r g b" CSS custom property as an rgb()/rgba() string. */
export function cssColor(name: string, alpha = 1) {
  if (typeof window === "undefined") return "#888";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return alpha === 1 ? `rgb(${v.split(" ").join(",")})` : `rgba(${v.split(" ").join(",")},${alpha})`;
}

/** Re-renders consumers when the theme attribute flips. */
export function useThemeKey() {
  const [k, setK] = useState("dark");
  useEffect(() => {
    const read = () => setK(document.documentElement.dataset.theme ?? "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return k;
}
