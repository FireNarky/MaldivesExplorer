import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteQueueViewForm, saveQueueViewForm } from "@/modules/crm/actions";
import { CrmError, listQueue } from "@/modules/crm/service";
import { enquiryStatuses, parseQueueFilters, queuePath, statusLabel } from "@/modules/crm/rules";

const controlClass =
  "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink";

export default async function EnquiryQueuePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    assignment?: string;
    page?: string;
    error?: string;
    notice?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const query = await searchParams;
  const filters = parseQueueFilters(query);
  let queue;
  try {
    queue = await listQueue(session.user.id, filters);
  } catch (error) {
    if (error instanceof CrmError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  const start = queue.total === 0 ? 0 : (queue.page - 1) * queue.pageSize + 1;
  const end = Math.min(queue.page * queue.pageSize, queue.total);
  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.assignment !== "all") exportParams.set("assignment", filters.assignment);
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Enquiry queue</h1>
      {queue.targetMinutes ? (
        <p>Internal first-response target: {queue.targetMinutes} business minutes.</p>
      ) : (
        <p>No internal first-response target is active.</p>
      )}
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice === "view" ? <p>Queue view saved.</p> : null}
      <form method="get" className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="q">Search</Label>
          <Input id="q" name="q" defaultValue={filters.q} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" className={controlClass} defaultValue={filters.status}>
            <option value="">All statuses</option>
            {enquiryStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="assignment">Assignment</Label>
          <select
            id="assignment"
            name="assignment"
            className={controlClass}
            defaultValue={filters.assignment}
          >
            {queue.seesAll ? <option value="all">All assignments</option> : null}
            <option value="mine">Assigned to me</option>
            {queue.seesAll ? <option value="unassigned">Unassigned</option> : null}
          </select>
        </div>
        <Button type="submit">Apply</Button>
      </form>
      <form action={saveQueueViewForm} className="grid gap-4">
        <input type="hidden" name="q" value={filters.q} />
        <input type="hidden" name="status" value={filters.status} />
        <input type="hidden" name="assignment" value={filters.assignment} />
        <div className="grid gap-2">
          <Label htmlFor="view-name">Save this view</Label>
          <Input id="view-name" name="name" maxLength={40} required />
        </div>
        <Button type="submit" variant="secondary">
          Save view
        </Button>
      </form>
      {queue.views.length > 0 ? (
        <ul className="grid gap-2">
          {queue.views.map((view) => (
            <li key={view.name} className="flex flex-wrap items-center gap-3">
              <Link
                href={queuePath({
                  q: view.q,
                  status: view.status,
                  assignment: view.assignment,
                  page: 1,
                })}
                className="font-semibold text-lagoon-ink"
              >
                {view.name}
              </Link>
              <form action={deleteQueueViewForm}>
                <input type="hidden" name="name" value={view.name} />
                <input type="hidden" name="q" value={filters.q} />
                <input type="hidden" name="status" value={filters.status} />
                <input type="hidden" name="assignment" value={filters.assignment} />
                <Button type="submit" variant="tertiary">
                  Remove {view.name}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {queue.canExport ? (
        <p>
          <Link
            href={`/api/v1/admin/enquiries/export?${exportParams.toString()}`}
            className="font-semibold text-lagoon-ink"
          >
            Export
          </Link>
          . An export includes at most {queue.exportCap.toLocaleString("en-GB")} rows and is
          recorded in the audit log.
        </p>
      ) : null}
      {queue.canReport ? (
        <p>
          <Link href="/admin/enquiries/report" className="font-semibold text-lagoon-ink">
            Enquiry operations
          </Link>
        </p>
      ) : null}
      {queue.rows.length === 0 ? (
        <EmptyState title="No enquiries in this view">
          <p>Adjust the search or assignment filter.</p>
        </EmptyState>
      ) : (
        <>
          <p>
            Showing {start}–{end} of {queue.total}.
          </p>
          <ul className="grid gap-4">
            {queue.rows.map((row) => (
              <li
                key={row.id}
                className="grid gap-1 rounded-lg border border-border-subtle bg-white p-4"
              >
                <h2 className="text-xl">
                  <Link href={`/admin/enquiries/${row.reference}`} className="text-lagoon-ink">
                    {row.reference}
                  </Link>
                </h2>
                <p>
                  {row.statusLabel} · {row.assigneeName ?? "Unassigned"}
                </p>
                <p>{row.customerName}</p>
                <p>{row.slaLabel}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="flex flex-wrap gap-4">
        {queue.page > 1 ? (
          <Link
            href={queuePath({ ...filters, page: queue.page - 1 })}
            className="font-semibold text-lagoon-ink"
          >
            Previous
          </Link>
        ) : null}
        {end < queue.total ? (
          <Link
            href={queuePath({ ...filters, page: queue.page + 1 })}
            className="font-semibold text-lagoon-ink"
          >
            Next
          </Link>
        ) : null}
      </div>
    </section>
  );
}
