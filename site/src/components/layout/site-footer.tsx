import Link from "next/link";
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
      { href: "/plan", label: "Plan a trip" },
      { href: "/search", label: "Search" },
      { href: "/wishlist", label: "Saved" },
      { href: "/compare", label: "Compare" },
      { href: "/recently-viewed", label: "Recently viewed" },
    ],
  },
  {
    title: "About & Team",
    links: [
      { href: "/board", label: "Team Board" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/faq", label: "Questions" },
      { href: "/reviews", label: "Testimonials" },
      { href: "/newsletter", label: "Newsletter" },
      { href: "/account", label: "Your account" },
    ],
  },
] as const;

export async function SiteFooter() {
  const noticeVersion = await currentNoticeVersion().catch(() => "2026-10-10");
  return (
    <footer className="surface-inverse mt-8 bg-ocean pb-20 text-sand lg:pb-0">
      <div className="mx-auto grid w-full max-w-[90rem] gap-10 px-4 py-12 lg:grid-cols-12 lg:px-8 lg:py-16">
        <div className="grid content-start gap-4 lg:col-span-5">
          <p className="font-display text-2xl text-sand">Maldives Explorer</p>
          <p className="max-w-[40ch] text-sand">
            Plan your Maldives stay with a travel team that replies with a clear, written quote.
          </p>
          <div className="max-w-md rounded-lg bg-white p-4 text-ink">
            <h2 className="mb-3 font-sans text-base font-semibold text-ocean">Newsletter</h2>
            <SubscribeForm
              idPrefix="footer"
              noticeVersion={noticeVersion}
              returnPath="/newsletter"
              showTopics={false}
            />
          </div>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
          {columns.map((column) => (
            <div key={column.title} className="grid content-start gap-3">
              <h2 className="font-sans text-base font-semibold text-sand">{column.title}</h2>
              <ul className="grid gap-1">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-8 items-center text-base text-sand underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-sand/20">
        <p className="mx-auto w-full max-w-[90rem] px-4 py-4 text-sm text-sand lg:px-8">
          © {new Date().getFullYear()} Maldives Explorer
        </p>
      </div>
    </footer>
  );
}
