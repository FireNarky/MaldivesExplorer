import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { EnquiryWorkspace } from "@/components/crm/enquiry-workspace";
import { FieldError } from "@/components/ui/field-error";
import { CrmError, readEnquiry } from "@/modules/crm/service";

type Context = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { reference } = await params;
  return { title: reference };
}

export default async function EnquiryDetailPage({ params, searchParams }: Context) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const { reference } = await params;
  const query = await searchParams;
  let detail;
  try {
    detail = await readEnquiry(session.user.id, reference);
  } catch (error) {
    if (error instanceof CrmError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return (
    <article className="grid gap-6">
      <p>
        <Link href="/admin/enquiries" className="font-semibold text-lagoon-ink">
          Enquiry queue
        </Link>
      </p>
      <h1>{detail.reference}</h1>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p>Saved.</p> : null}
      <dl className="grid max-w-[65ch] gap-3">
        <div>
          <dt className="font-semibold">Customer</dt>
          <dd>
            {detail.customerName} · {detail.customerEmail}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Received</dt>
          <dd>{detail.createdLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold">Travel</dt>
          <dd>{detail.travel}</dd>
        </div>
        {detail.flexibility ? (
          <div>
            <dt className="font-semibold">Flexibility</dt>
            <dd>{detail.flexibility}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Party</dt>
          <dd>
            {detail.adultCount} adults, {detail.childCount} children
          </dd>
        </div>
        {detail.travelers.length > 0 ? (
          <div>
            <dt className="font-semibold">Travelers</dt>
            <dd>{detail.travelers.join(", ")}</dd>
          </div>
        ) : null}
        {detail.budget ? (
          <div>
            <dt className="font-semibold">Budget</dt>
            <dd>{detail.budget}</dd>
          </div>
        ) : null}
        <div>
          <dt className="font-semibold">Requirements</dt>
          <dd>{detail.requirements ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">Accessibility</dt>
          <dd>{detail.accessibilityNeeds ?? "Not added"}</dd>
        </div>
        <div>
          <dt className="font-semibold">First response</dt>
          <dd>
            {detail.targetMinutes
              ? `Internal target ${detail.targetMinutes} business minutes. ${detail.slaLabel}.`
              : detail.slaLabel}
            {detail.firstResponseLabel ? ` Recorded ${detail.firstResponseLabel}.` : ""}
          </dd>
        </div>
      </dl>
      <EnquiryWorkspace detail={detail} />
    </article>
  );
}
