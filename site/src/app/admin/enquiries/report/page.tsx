import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CrmError, operationsReport } from "@/modules/crm/service";

export default async function EnquiryOperationsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  let report;
  try {
    report = await operationsReport(session.user.id);
  } catch (error) {
    if (error instanceof CrmError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return (
    <section className="grid max-w-[65ch] gap-6">
      <p>
        <Link href="/admin/enquiries" className="font-semibold text-lagoon-ink">
          Enquiry queue
        </Link>
      </p>
      <h1>Enquiry operations</h1>
      <p>
        {report.targetMinutes
          ? `Internal first-response target: ${report.targetMinutes} business minutes.`
          : "No internal first-response target is active."}
      </p>
      <dl className="grid gap-3">
        <div>
          <dt className="font-semibold">Unassigned open enquiries</dt>
          <dd>{report.unassigned}</dd>
        </div>
        <div>
          <dt className="font-semibold">Waiting inside the target</dt>
          <dd>{report.waiting}</dd>
        </div>
        <div>
          <dt className="font-semibold">Waiting past the target</dt>
          <dd>{report.waitingPast}</dd>
        </div>
        <div>
          <dt className="font-semibold">Answered inside the target</dt>
          <dd>{report.answeredInside}</dd>
        </div>
        <div>
          <dt className="font-semibold">Answered past the target</dt>
          <dd>{report.answeredPast}</dd>
        </div>
        <div>
          <dt className="font-semibold">Oldest open enquiry</dt>
          <dd>
            {report.oldestOpenMinutes === null
              ? "No open enquiry"
              : `${report.oldestOpenMinutes} business minutes`}
          </dd>
        </div>
        {report.counts.map((item) => (
          <div key={item.status}>
            <dt className="font-semibold">{item.label}</dt>
            <dd>{item.count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
