import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/patterns/page-header";
import { publicMetadata } from "@/lib/seo/metadata";
import { currentNoticeVersion } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Privacy Notice",
  description:
    "How Maldives Explorer handles enquiry details, optional accounts, device-stored shortlists, opt-in analytics, and privacy requests.",
  path: "/privacy",
});

const crumbs = [{ name: "Home", href: "/" }, { name: "Privacy Notice" }];

export default async function PrivacyPage() {
  const noticeVersion = await currentNoticeVersion().catch(() => "2026-10-10");

  return (
    <article className="mx-auto grid max-w-4xl gap-8">
      <PageHeader
        crumbs={crumbs}
        title="Privacy Notice"
        lede={`Notice version ${noticeVersion}. This page describes how the Maldives Explorer platform handles information across browsing, trip planning, enquiries, and optional accounts.`}
      />

      <div className="grid gap-6 rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-10 shadow-1 text-sm sm:text-base text-ink dark:text-slate-200 leading-relaxed">
        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            1. Enquiry and Trip-Planning Information
          </h2>
          <p>
            When you submit a trip plan through the{" "}
            <Link
              href="/plan"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Trip Planner
            </Link>{" "}
            or an enquiry through the{" "}
            <Link
              href="/contact"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Contact
            </Link>{" "}
            page, the platform records the details you provide, such as your name, email address,
            optional telephone number and country code, travel dates or flexibility notes, and any
            accessibility or travel requirements you enter. The Trip Planner also records adult
            count, child ages, budget range in USD, and selected resorts, offers, or experiences.
            The Contact page does not ask for party size.
          </p>
          <p>
            Your agreement to be contacted about your enquiry is recorded together with the notice
            version ({noticeVersion}) shown when you submitted it. It is separate from newsletter or
            marketing consent.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            2. Device Storage for Drafts, Saved Items, and Comparisons
          </h2>
          <p>
            You can browse the catalog, save items to your shortlist, compare up to three resorts,
            and draft a trip plan without creating an account. Before you sign in or submit a plan,
            your shortlist, comparison list, recently viewed resorts, and in-progress trip planner
            draft are stored locally in your browser on your device.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            3. Optional Accounts and Authentication
          </h2>
          <p>
            Creating an account is optional for browsing and submitting an enquiry, and is used to
            view linked enquiries, messages, and sent quotations in the customer portal. Account
            records store your name, email address, a password hash (when password sign-in is used)
            or a one-time sign-in token hash, and session records.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            4. Search Analytics and Newsletter
          </h2>
          <p>
            Non-essential search and product analytics remain off unless you explicitly select{" "}
            <strong>Allow search analytics</strong>. Newsletter subscriptions use a separate,
            explicit consent action on the newsletter form and are independent of any trip enquiry.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            5. Third-Party Messaging Links
          </h2>
          <p>
            Where external messaging links (such as WhatsApp, Facebook Messenger, or Telegram) are
            shown and you choose to open them, your use of those services is governed by the
            provider&apos;s own terms and privacy policy.
          </p>
        </section>

        <section className="grid gap-2">
          <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
            6. Account Privacy Requests
          </h2>
          <p>
            Signed-in account holders can submit a data-export request or an account-deletion
            request from{" "}
            <Link
              href="/account/privacy"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Account Privacy
            </Link>
            . Submitting a request records it for review; a deletion request does not immediately
            close the account.
          </p>
          <p>
            See also our{" "}
            <Link
              href="/terms"
              className="font-semibold text-lagoon-ink dark:text-cyan-400 underline"
            >
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
