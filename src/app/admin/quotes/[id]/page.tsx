import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { FieldError } from "@/components/ui/field-error";
import { QuoteError, readQuote } from "@/modules/quotes/service";

type Context = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string; version?: string }>;
};

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return { title: "Quote" };
  try {
    const quote = await readQuote(session.user.id, id);
    return { title: quote.reference };
  } catch {
    return { title: "Quote" };
  }
}

export default async function QuoteDetailPage({ params, searchParams }: Context) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) notFound();
  const { id } = await params;
  const query = await searchParams;
  let quote;
  try {
    quote = await readQuote(session.user.id, id, query.version);
  } catch (error) {
    if (error instanceof QuoteError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
  return (
    <article className="grid gap-6">
      <p>
        <Link href="/admin/quotes" className="font-semibold text-lagoon-ink">
          Quotes
        </Link>
      </p>
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {query.notice ? <p>Saved.</p> : null}
      <QuoteBuilder quote={quote} />
    </article>
  );
}
