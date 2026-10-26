import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Compass, Plane, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { PlannerForm } from "@/components/planner/planner-form";
import { ErrorState } from "@/components/ui/error-state";
import { auth } from "@/auth";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { noteConsentEvent } from "@/modules/analytics/service";
import { plannerCatalog } from "@/modules/enquiries/service";
import { listSavedItems } from "@/modules/wishlist/service";

export const metadata: Metadata = publicMetadata({
  title: "Plan Your Maldives Stay · Bespoke Itinerary Builder",
  description:
    "Craft your Maldives trip plan with our travel team and receive a tailored written quote.",
  path: "/plan",
});

const plannerPerks = [
  {
    icon: Clock,
    title: "Written Quotation",
    desc: "Itemized USD proposals prepared by our travel team.",
  },
  {
    icon: ShieldCheck,
    title: "Zero Obligation",
    desc: "Nothing is charged or booked until you review and sign your custom quote.",
  },
  {
    icon: Plane,
    title: "Transfer Coordination",
    desc: "Seaplane and speedboat options matched to your itinerary.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tailored Options",
    desc: "Recommendations matched to your travel dates, party size, and interests.",
  },
];

export default async function PlanPage() {
  try {
    const [catalog, session] = await Promise.all([plannerCatalog(), auth().catch(() => null)]);
    const saved = session?.user?.id ? await listSavedItems(session.user.id).catch(() => []) : [];
    await noteConsentEvent("planner_started", { path: "/plan" });

    return (
      <div className="mx-auto max-w-4xl space-y-10 py-2 sm:py-6 animate-in fade-in duration-500">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Plan my trip" }]} />

        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-gradient-to-br from-[#083b4c]/95 via-[#083b4c] to-[#062936] dark:from-[#061d28] dark:via-[#082633] dark:to-[#041219] p-6 sm:p-10 text-white shadow-2">
          <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#2bbcd0_1.5px,transparent_1.5px)] [background-size:24px_24px]" />
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-lagoon/20 blur-3xl" />

          <div className="relative max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md border border-white/20">
              <Compass size={13} className="text-coral" />
              Resident Concierge Service
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-white leading-snug">
              Bespoke Maldives Trip Planner
            </h1>
            <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
              Tell us your desired travel dates, island style, and companion preferences. Our travel
              team will review your requirements and prepare a written quote covering accommodation,
              transfers, and inclusions.
            </p>
          </div>
        </div>

        {/* Planner Reassurance Badges */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {plannerPerks.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-4 shadow-1 transition-all hover:-translate-y-1 hover:border-ocean/40 dark:hover:border-cyan-400/40"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 mb-2.5">
                <p.icon size={17} strokeWidth={1.75} />
              </span>
              <p className="font-display text-xs font-semibold text-ocean mb-0.5">{p.title}</p>
              <p className="text-[11px] text-muted leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Planner Multi-step Form Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-white dark:bg-white/5 dark:border-white/10 p-6 sm:p-10 shadow-2 backdrop-blur-xl">
          <PlannerForm
            noticeVersion={catalog.noticeVersion}
            draftTtlDays={catalog.draftTtlDays}
            tripTypes={catalog.tripTypes}
            resorts={catalog.resorts}
            experiences={catalog.experiences}
            savedResortIds={saved.flatMap((item) =>
              item.entityType === "RESORT" ? [item.entityId] : [],
            )}
            savedExperienceIds={saved.flatMap((item) =>
              item.entityType === "EXPERIENCE" ? [item.entityId] : [],
            )}
            savedOfferIds={saved.flatMap((item) =>
              item.entityType === "OFFER" ? [item.entityId] : [],
            )}
            accountEmail={session?.user?.email ?? null}
          />
        </div>
      </div>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "The planner could not be loaded.");
    return (
      <ErrorState title="Plan my trip">
        <p>The planner could not be loaded.</p>
        <Link href="/resorts" className="text-lagoon-ink">
          Resorts
        </Link>
      </ErrorState>
    );
  }
}
