import localFont from "next/font/local";
import { Jost } from "next/font/google";

// Thari Ventures brand type: Cormorant Garamond (headlines, self-hosted) + Jost (interface/body).
export const display = localFont({
  src: [
    { path: "./fonts-files/cormorant-normal-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts-files/cormorant-normal-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts-files/cormorant-normal-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts-files/cormorant-normal-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts-files/cormorant-italic-400.woff2", weight: "400", style: "italic" },
    { path: "./fonts-files/cormorant-italic-500.woff2", weight: "500", style: "italic" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Iowan Old Style", "Palatino", "Georgia", "serif"],
});

export const sans = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  adjustFontFallback: true,
});
