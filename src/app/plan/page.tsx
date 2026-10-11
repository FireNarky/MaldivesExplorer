import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { PlannerForm } from "@/components/planner/planner-form";
import { ErrorState } from "@/components/ui/error-state";
import { auth } from "@/auth";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { plannerCatalog } from "@/modules/enquiries/service";
import { listSavedItems } from "@/modules/wishlist/service";

export const metadata: Metadata = publicMetadata({
  title: "Plan a trip",
  description: "Send a trip plan for a consultant to review.",
  path: "/plan",
});

export default async function PlanPage() {
  try {
    const [catalog, session] = await Promise.all([plannerCatalog(), auth().catch(() => null)]);
    const saved = session?.user?.id ? await listSavedItems(session.user.id).catch(() => []) : [];
    return (
      <section className="grid gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Plan a trip" }]} />
        <h1>Plan a trip</h1>
        <p>A consultant reviews the plan. Nothing is booked from this form.</p>
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
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "The planner could not be loaded.");
    return (
      <ErrorState title="Plan a trip">
        <p>The planner could not be loaded.</p>
        <Link href="/resorts" className="text-lagoon-ink">
          Resorts
        </Link>
      </ErrorState>
    );
  }
}
