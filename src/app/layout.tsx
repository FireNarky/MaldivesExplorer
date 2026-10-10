import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { display, sans } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Maldives Explorer",
    template: "%s · Maldives Explorer",
  },
  description: "Maldives Explorer application foundation.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 lg:px-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
