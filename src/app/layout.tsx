import type { Metadata, Viewport } from "next";
import { auth } from "@/auth";
import { AnalyticsConsent } from "@/components/discovery/analytics-consent";
import { LandingCapture } from "@/components/planner/landing-capture";
import { CompareTray } from "@/components/shortlist/compare-tray";
import { WishlistMerge } from "@/components/shortlist/device-sync";
import { PaletteSwitcher } from "@/components/layout/palette-switcher";
import { ActionBar } from "@/components/layout/action-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { FloatingChatWidget } from "@/components/chat/floating-chat-widget";
import { getContactSettings } from "@/modules/contact/service";
import { DEFAULT_CONTACT_SETTINGS } from "@/modules/contact/types";
import { display, sans } from "@/lib/fonts";
import { siteOrigin } from "@/lib/seo/site";
import { promoteDuePublications } from "@/modules/publishing/service";
import "./globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Maldives Explorer · Curated Luxury Resorts & Islands",
    template: "%s · Maldives Explorer",
  },
  description: "Curated private island resorts, iconic overwater pool villas, and bespoke journeys across the Maldives.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    siteName: "Maldives Explorer",
    type: "website",
    title: "Maldives Explorer · Curated Luxury Resorts & Bespoke Island Journeys",
    description: "Discover hand-curated private islands, iconic overwater pool villas, and direct resort quotes across the Maldives.",
    url: "https://xplorer.itnvend.com",
    images: [
      {
        url: "/images/og-maldives.jpg",
        width: 1200,
        height: 630,
        alt: "Maldives Explorer Luxury Overwater Villa & Lagoon",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maldives Explorer · Curated Luxury Resorts",
    description: "Discover hand-curated private islands, iconic overwater pool villas, and bespoke journeys across the Maldives.",
    images: ["/images/og-maldives.jpg"],
  },
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await promoteDuePublications().catch(() => undefined);
  const session = await auth().catch(() => null);
  const contactSettings = await getContactSettings().catch(() => DEFAULT_CONTACT_SETTINGS);
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} overflow-x-hidden`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem("mdv-mode")||"system";var p=localStorage.getItem("mdv-palette")||"ocean";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark");r.setAttribute("data-theme","dark")}else{r.classList.remove("dark");r.removeAttribute("data-theme")}r.setAttribute("data-palette",p)}catch(e){}function setSbw(){try{var sw=window.innerWidth-document.documentElement.clientWidth;document.documentElement.style.setProperty("--sbw",(sw>0?sw:0)+"px")}catch(e){}}setSbw();window.addEventListener("resize",setSbw,{passive:true})})()`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased overflow-x-hidden">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main
          id="main"
          className="mx-auto w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] flex-1 px-4 py-8 pb-24 lg:px-8 lg:pb-12 2xl:px-12"
        >
          {children}
        </main>
        <CompareTray />
        <LandingCapture />
        <WishlistMerge signedIn={Boolean(session?.user?.id)} />
        <AnalyticsConsent />
        <SiteFooter />
        <FloatingChatWidget settings={contactSettings} />
        <ActionBar />
        <PaletteSwitcher />
      </body>
    </html>
  );
}
