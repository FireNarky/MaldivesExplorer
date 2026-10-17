import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AnalyticsError, analyticsReport } from "@/modules/analytics/service";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  let report;
  try {
    report = await analyticsReport(session.user.id);
  } catch (error) {
    if (error instanceof AnalyticsError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-6">
      <p>
        <Link href="/admin/reports" className="font-semibold text-lagoon-ink">
          Operational reports
        </Link>
      </p>
      <h1>Analytics</h1>
      <p>
        Counts below use events stored with analytics consent, except the view share. A missing
        measurement stays unavailable.
      </p>
      <dl className="grid gap-4">
        <div>
          <dt className="font-semibold">Consented view share</dt>
          <dd>{report.viewShare ?? "Not available"}</dd>
          <dd className="text-sm text-muted">{report.viewFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Search demand</dt>
          <dd>{report.searchDemand}</dd>
          <dd className="text-sm text-muted">{report.searchFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Empty searches</dt>
          <dd>{report.emptySearches}</dd>
          <dd className="text-sm text-muted">{report.emptyFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Shortlist use</dt>
          <dd>{report.shortlist}</dd>
          <dd className="text-sm text-muted">{report.shortlistFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Planner completion</dt>
          <dd>{report.planner ?? "Not available"}</dd>
          <dd className="text-sm text-muted">{report.plannerFormula}</dd>
        </div>
        {report.content.length === 0 ? (
          <div>
            <dt className="font-semibold">Content views</dt>
            <dd>No consented entity views with a kind are stored.</dd>
          </div>
        ) : (
          report.content.map((item) => (
            <div key={item.kind}>
              <dt className="font-semibold">{item.kind} views</dt>
              <dd>{item.count}</dd>
            </div>
          ))
        )}
        <div>
          <dt className="font-semibold">Content formula</dt>
          <dd className="text-sm text-muted">{report.contentFormula}</dd>
        </div>
      </dl>
    </section>
  );
}
