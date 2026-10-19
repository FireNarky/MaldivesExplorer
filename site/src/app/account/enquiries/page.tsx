import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { publicMetadata } from "@/lib/seo/metadata";
import { listOwnEnquiries } from "@/modules/customers/records";

export const metadata: Metadata = publicMetadata({
  title: "Enquiries",
  description: "Trip plans on your account.",
  path: "/account/enquiries",
});

export default async function EnquiriesPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id || "";
  const enquiries = await listOwnEnquiries(userId);
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Enquiries</h1>
      {enquiries.length === 0 ? (
        <EmptyState title="Enquiries">
          <p>No trip plan is linked to this account.</p>
          <Link href="/plan" className="font-semibold text-lagoon-ink">
            Plan a trip
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {enquiries.map((enquiry) => (
            <li key={enquiry.reference} className="grid gap-1">
              <Link
                href={`/account/enquiries/${enquiry.reference}`}
                className="font-semibold text-lagoon-ink"
              >
                {enquiry.reference}
              </Link>
              <p>{enquiry.statusLabel}</p>
              {enquiry.travelStart && enquiry.travelEnd ? (
                <p>
                  {enquiry.travelStart} to {enquiry.travelEnd}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
