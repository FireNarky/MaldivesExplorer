import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/patterns/page-header";
import { publicMetadata } from "@/lib/seo/metadata";
import { currentNoticeVersion } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Terms of Service",
  description:
    "Platform usage terms for browsing Maldives Explorer, submitting travel enquiries, and receiving consultant-prepared written quotations.",
  path: "/terms",
});

const crumbs = [{ name: "Home", href: "/" }, { name: "Terms of Service" }];

export default async function TermsPage() {
  const noticeVersion = await currentNoticeVersion().catch(() => "2026-10-10");

  return (
    <article className="mx-auto grid max-w-4xl gap-8">
      <PageHeader
        crumbs={crumbs}
        title="Terms of Service"
        lede={`Notice version ${noticeVersion}. These terms describe how browsing, trip planning, enquiries, and written quotations operate on Maldives Explorer.`}
      />

      <div className="grid gap-6 rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-10 shadow-1 text-sm sm:text-base text-ink dark:text-slate-200 leading-relaxed">
        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            1. Editorial Discovery and Trip Planning
          </h2>
          <p>
            Maldives Explorer provides editorial information on Maldivian atolls, islands, resorts,
            room categories, dining venues, experiences, promotional offers, and travel guides.
            Published descriptions, transfer durations, and seasonal notes are provided for trip
            planning and remain subject to verification at the time a written quotation is prepared.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            2. Enquiries Are Not Confirmed Bookings
          </h2>
          <p>
            Submitting a trip plan via the{" "}
            <Link
              href="/plan"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Trip Planner
            </Link>{" "}
            or an enquiry via the{" "}
            <Link
              href="/contact"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Contact
            </Link>{" "}
            page records a request for our travel team to review. An enquiry submission does not
            create a reservation, hold room or transfer inventory, or charge any payment.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            3. Price on Request and Written Quotations
          </h2>
          <p>
            Public resort and offer listings display <strong>Price on request</strong> rather than
            public tariffs. When our team prepares a quotation for your enquiry, pricing is issued
            as an itemized written quote in USD, together with the quote version&apos;s validity
            window.
          </p>
          <p>
            This platform does not process online card or wire payments and does not issue instant
            automated supplier confirmations.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            4. Supplier Terms and Availability
          </h2>
          <p>
            Accommodation, sea or air transfers, and marine excursions are operated by third-party
            resorts and transport providers. Availability and supplier-specific terms and conditions
            are provided as part of the written quotation and booking process.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">5. Accounts</h2>
          <p>
            If you create an account, please keep your sign-in credentials confidential and provide
            accurate contact and travel details in your enquiries.
          </p>
          <p>
            See also our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Privacy Notice
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
