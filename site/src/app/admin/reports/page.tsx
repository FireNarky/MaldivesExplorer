import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AnalyticsError, operationalReport } from "@/modules/analytics/service";
import { statusLabel, type SubscriptionStatusName } from "@/modules/newsletter/rules";

function subscriberLabel(status: string): string {
  if (
    status === "PENDING" ||
    status === "CONFIRMED" ||
    status === "UNSUBSCRIBED" ||
    status === "SUPPRESSED"
  ) {
    return statusLabel(status as SubscriptionStatusName);
  }
  return status;
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  let report;
  try {
    report = await operationalReport(session.user.id);
  } catch (error) {
    if (error instanceof AnalyticsError && error.status === 404) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Operational reports</h1>
      <p>
        <Link href="/admin/reports/analytics" className="font-semibold text-lagoon-ink">
          Analytics
        </Link>
      </p>
      <p>
        <Link href="/admin/enquiries/report" className="font-semibold text-lagoon-ink">
          Enquiry operations
        </Link>
      </p>
      <dl className="grid gap-4">
        <div>
          <dt className="font-semibold">Lead response</dt>
          <dd>{report.response ?? "Not available"}</dd>
          <dd className="text-sm text-muted">{report.responseFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Quote send</dt>
          <dd>{report.send ?? "Not available"}</dd>
          <dd className="text-sm text-muted">{report.sendFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Quote acceptance</dt>
          <dd>{report.acceptance ?? "Not available"}</dd>
          <dd className="text-sm text-muted">{report.acceptanceFormula}</dd>
        </div>
        {report.quotes.map((item) => (
          <div key={item.label}>
            <dt className="font-semibold">{item.label} versions</dt>
            <dd>{item.count}</dd>
          </div>
        ))}
        <div>
          <dt className="font-semibold">Published guides</dt>
          <dd>{report.guides}</dd>
        </div>
        <div>
          <dt className="font-semibold">Stale guides</dt>
          <dd>{report.staleGuides}</dd>
          <dd className="text-sm text-muted">{report.staleFormula}</dd>
        </div>
        {report.subscribers.map((item) => (
          <div key={item.label}>
            <dt className="font-semibold">{subscriberLabel(item.label)}</dt>
            <dd>{item.count}</dd>
          </div>
        ))}
        <div>
          <dt className="font-semibold">Subscriber formula</dt>
          <dd className="text-sm text-muted">{report.subscriberFormula}</dd>
        </div>
        <div>
          <dt className="font-semibold">Failed jobs</dt>
          <dd>{report.failedJobs}</dd>
          <dd className="text-sm text-muted">{report.failedFormula}</dd>
        </div>
      </dl>
    </section>
  );
}
