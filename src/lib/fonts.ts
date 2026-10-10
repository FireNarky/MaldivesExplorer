import { Fraunces, Source_Sans_3 } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: true,
});

export const sans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  adjustFontFallback: true,
});
