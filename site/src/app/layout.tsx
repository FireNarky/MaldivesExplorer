import type { Metadata } from "next";
import { auth } from "@/auth";
import { AnalyticsConsent } from "@/components/discovery/analytics-consent";
import { LandingCapture } from "@/components/planner/landing-capture";
import { CompareTray } from "@/components/shortlist/compare-tray";
import { WishlistMerge } from "@/components/shortlist/device-sync";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { display, sans } from "@/lib/fonts";
import { siteOrigin } from "@/lib/seo/site";
import { promoteDuePublications } from "@/modules/publishing/service";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Maldives Explorer",
    template: "%s · Maldives Explorer",
  },
  description: "Maldives Explorer application foundation.",
  openGraph: {
    siteName: "Maldives Explorer",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await promoteDuePublications().catch(() => undefined);
  const session = await auth().catch(() => null);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 pb-28 lg:px-8">
          {children}
        </main>
        <CompareTray />
        <LandingCapture />
        <WishlistMerge signedIn={Boolean(session?.user?.id)} />
        <AnalyticsConsent />
        <SiteFooter />
      </body>
    </html>
  );
}
