import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle2, Plane, ShieldCheck, Sparkles, Waves } from "lucide-react";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { FieldError } from "@/components/ui/field-error";
import { publicMetadata } from "@/lib/seo/metadata";
import { currentNoticeVersion } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "The Island Gazette Newsletter",
  description:
    "Subscribe to occasional dispatches on private island offers, seaplane transfer guides, and marine encounter seasons.",
  path: "/newsletter",
});

const perks = [
  {
    icon: Sparkles,
    title: "Unpublished Villa Privileges",
    desc: "Direct partner rates, complimentary half-board upgrades, and resort opening perks.",
  },
  {
    icon: Plane,
    title: "Seaplane Transfer Alerts",
    desc: "Seasonal schedule shifts, baggage guidance, and new seaplane lounge introductions.",
  },
  {
    icon: Waves,
    title: "Marine Gathering Forecasts",
    desc: "Hanifaru Bay manta congregations, South Ari whale shark seasons, and water clarity tips.",
  },
  {
    icon: ShieldCheck,
    title: "Discreet & Low-Frequency",
    desc: "Bi-weekly editorial dispatches only. One-click unsubscribe at any time. Zero spam.",
  },
];

const sampleDispatches = [
  {
    title: "Seaplane vs Speedboat: The Definitive Transfer Guide",
    tag: "Transfer Guide",
    readTime: "4 min read",
  },
  {
    title: "Hanifaru Bay 2026: The Ultimate Manta Ray Season Forecast",
    tag: "Marine Life",
    readTime: "6 min read",
  },
  {
    title: "Hidden Sandbanks of North Malé: Private Dining Coords",
    tag: "Curated Stays",
    readTime: "3 min read",
  },
];

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const noticeVersion = await currentNoticeVersion();

  return (
    <div className="mx-auto max-w-4xl space-y-12 py-4 sm:py-8">
      {/* Editorial Header */}
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-mist/60 dark:bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400 backdrop-blur">
          <Sparkles size={14} className="text-coral" />
          Maldives Explorer Editorial
        </span>
        <h1 className="text-3xl sm:text-5xl font-display font-medium text-ocean">
          The Private Island Gazette
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted font-light leading-relaxed">
          Occasional insider dispatches covering unpublished resort privileges, secret sandbank
          coordinates, seasonal seaplane transfer alerts, and marine biologist field notes.
        </p>
      </div>

      {/* Perks Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {perks.map((perk) => (
          <div
            key={perk.title}
            className="group rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-5 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/40 hover:shadow-2"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 mb-3 transition-colors group-hover:bg-ocean group-hover:text-white">
              <perk.icon size={18} strokeWidth={1.75} />
            </span>
            <h3 className="font-display text-base font-semibold text-ocean mb-1">{perk.title}</h3>
            <p className="text-xs text-ink leading-relaxed">{perk.desc}</p>
          </div>
        ))}
      </div>

      {/* Subscription Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 sm:p-10 shadow-2 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-lagoon/15 dark:bg-cyan-500/10 blur-3xl" />

        <div className="max-w-xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-display text-ocean">Join Discerning Island Travelers</h2>
            <p className="text-sm text-muted mt-1">
              Delivered straight to your personal inbox. Unsubscribe at any time.
            </p>
          </div>

          {query.error ? (
            <div className="rounded-xl border border-danger/20 bg-danger-surface p-3 text-sm text-danger animate-in fade-in">
              <FieldError>{query.error}</FieldError>
            </div>
          ) : null}

          {query.notice ? (
            <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success-surface p-3.5 text-sm font-medium text-success animate-in fade-in">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>
                You are now subscribed to The Private Island Gazette! Check your inbox for
                confirmation.
              </span>
            </div>
          ) : null}

          <div className="rounded-2xl bg-sand/60 dark:bg-white/5 p-4 sm:p-6 border border-border-subtle/80">
            <SubscribeForm
              idPrefix="newsletter"
              noticeVersion={noticeVersion}
              returnPath="/newsletter"
              showTopics
            />
          </div>
        </div>
      </div>

      {/* Recent Dispatches Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <BookOpen size={14} className="text-lagoon-ink dark:text-cyan-400" />
            Recent Gazette Dispatches
          </span>
          <Link
            href="/guides"
            className="text-xs font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline"
          >
            View All Guides &rarr;
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {sampleDispatches.map((item) => (
            <Link
              key={item.title}
              href="/guides"
              className="group rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-4 transition-all hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/40"
            >
              <div className="flex items-center justify-between text-[11px] text-muted mb-2">
                <span className="rounded-full bg-mist dark:bg-white/10 px-2 py-0.5 font-semibold text-lagoon-ink dark:text-cyan-300">
                  {item.tag}
                </span>
                <span>{item.readTime}</span>
              </div>
              <p className="text-sm font-semibold text-ocean group-hover:underline line-clamp-2">
                {item.title}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
