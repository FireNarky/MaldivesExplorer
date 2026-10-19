import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/discovery/breadcrumbs";
import { FaqList } from "@/components/discovery/faq-list";
import { JsonLd } from "@/components/discovery/json-ld";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { logError } from "@/lib/observability/log";
import { publicMetadata } from "@/lib/seo/metadata";
import { faqPageData } from "@/lib/seo/structured";
import { listGlobalFaqs } from "@/modules/discovery";

export const metadata: Metadata = publicMetadata({
  title: "Questions",
  description: "Published questions.",
  path: "/faq",
});

export default async function FaqPage() {
  try {
    const faqs = await listGlobalFaqs();
    return (
      <section className="grid max-w-[65ch] gap-6">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Questions" }]} />
        {faqs.length > 0 ? <JsonLd data={faqPageData(faqs)} /> : null}
        <h1>Questions</h1>
        {faqs.length === 0 ? (
          <EmptyState title="Questions">
            <p>No question is published.</p>
          </EmptyState>
        ) : (
          <FaqList items={faqs} heading={null} />
        )}
      </section>
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : "Questions could not be loaded.");
    return (
      <ErrorState title="Questions">
        <p>Questions could not be loaded.</p>
      </ErrorState>
    );
  }
}
