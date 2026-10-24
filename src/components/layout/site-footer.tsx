import { FooterNav } from "@/components/layout/footer-nav";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { currentNoticeVersion } from "@/modules/newsletter/service";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/destinations", label: "Destinations" },
      { href: "/resorts", label: "Resorts" },
      { href: "/experiences", label: "Experiences" },
      { href: "/collections", label: "Collections" },
      { href: "/guides", label: "Guides" },
      { href: "/offers", label: "Offers" },
    ],
  },
  {
    title: "Plan",
    links: [
      { href: "/plan", label: "Plan my trip" },
      { href: "/search", label: "Search" },
      { href: "/wishlist", label: "Saved" },
      { href: "/compare", label: "Compare" },
      { href: "/recently-viewed", label: "Recently viewed" },
    ],
  },
  {
    title: "About & Community",
    links: [
      { href: "/contact", label: "Contact & Concierge" },
      { href: "/faq", label: "Questions & FAQ" },
      { href: "/reviews", label: "Testimonials" },
      { href: "/newsletter", label: "Newsletter" },
      { href: "/account", label: "Your account" },
      { href: "/privacy", label: "Privacy Notice" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
] as const;

export async function SiteFooter() {
  const noticeVersion = await currentNoticeVersion().catch(() => "2026-10-10");
  return (
    <footer className="surface-inverse mt-16 bg-[#083b4c] dark:bg-[#03090c] text-white dark:border-t dark:border-white/10 pb-20 lg:pb-0">
      <div className="mx-auto grid w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] gap-10 px-4 py-12 lg:grid-cols-12 lg:px-8 lg:py-16 2xl:px-12">
        <div className="grid content-start gap-4 lg:col-span-5">
          <p className="font-display text-2xl font-medium text-white tracking-tight">
            Maldives Explorer
          </p>
          <p className="max-w-[40ch] text-sm sm:text-base text-slate-200 leading-relaxed font-light">
            Plan your Maldives stay with a travel team that replies with a clear, written quote.
          </p>
          <div className="max-w-md rounded-2xl border border-white/20 bg-white/10 dark:bg-white/5 p-5 text-white backdrop-blur-md shadow-2">
            <h2 className="mb-1 font-display text-lg font-semibold text-white">Newsletter</h2>
            <p className="text-xs text-slate-300 mb-4">
              Occasional insider dispatches &amp; seaplane transfer alerts.
            </p>
            <SubscribeForm
              idPrefix="footer"
              noticeVersion={noticeVersion}
              returnPath="/newsletter"
              showTopics={false}
              inverted
            />
          </div>
        </div>
        <FooterNav columns={columns} />
      </div>
      <div className="border-t border-white/15">
        <p className="mx-auto w-full max-w-[90rem] 2xl:max-w-[105rem] 3xl:max-w-[115rem] px-4 py-4 text-xs sm:text-sm text-slate-300 lg:px-8 2xl:px-12">
          © {new Date().getFullYear()} Maldives Explorer
        </p>
      </div>
    </footer>
  );
}
