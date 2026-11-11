import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIKR — AI stock research",
  description: "Type any ticker. Prices, filings, news and an AI analyst's full research note in seconds.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#07090e", width: "device-width", initialScale: 1 };

// Runs before paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("tikr-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
