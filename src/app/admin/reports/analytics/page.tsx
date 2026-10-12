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
      <p>Counts below use events stored with analytics consent, except the view share.</p>
      <dl className="grid gap-4">
        <div>
          <dt className="font-semibold">Consented view share</dt>
          <dd>{report.viewShare}</dd>
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
          <dd>{report.planner}</dd>
          <dd className="text-sm text-muted">{report.plannerFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Quote interest</dt>
          <dd>{report.quotesViewed}</dd>
          <dd className="text-sm text-muted">{report.quoteFormula}</dd>
        </div>
        {report.content.map((item) => (
          <div key={item.kind}>
            <dt className="font-semibold">{item.kind} views</dt>
            <dd>{item.count}</dd>
          </div>
        ))}
        <div>
          <dt className="font-semibold">Content formula</dt>
          <dd className="text-sm text-muted">{report.contentFormula}</dd>
        </div>
      </dl>
      <section className="grid gap-2">
        <h2>Search queries</h2>
        {report.queries.length === 0 ? <p>No consented searches are stored.</p> : null}
        <ul>
          {report.queries.map((query) => (
            <li key={query}>{query}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
