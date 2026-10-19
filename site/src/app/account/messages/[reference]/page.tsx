import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendMessageForm } from "@/modules/customers/actions";
import { readOwnThread } from "@/modules/customers/records";

type Context = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Messages ${reference}`,
    robots: { index: false, follow: false },
  };
}

export default async function MessageThreadPage({
  params,
  searchParams,
}: Context & { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const session = await auth().catch(() => null);
  const { reference } = await params;
  const thread = await readOwnThread(session?.user?.id || "", reference);
  if (!thread) notFound();
  const query = await searchParams;
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Messages for {thread.reference}</h1>
      {query.sent ? <p role="status">Message sent.</p> : null}
      {query.error ? <FieldError>{query.error}</FieldError> : null}
      {thread.entries.length === 0 ? <p>No message on this plan.</p> : null}
      <ol className="grid gap-4">
        {thread.entries.map((entry) => (
          <li key={entry.id} className="grid gap-1">
            <p className="font-semibold">{entry.from}</p>
            <p>{entry.body}</p>
          </li>
        ))}
      </ol>
      <form action={sendMessageForm} className="grid gap-3">
        <input type="hidden" name="reference" value={thread.reference} />
        <Label htmlFor="body">Message</Label>
        <Textarea id="body" name="body" required maxLength={2000} />
        <Button type="submit">Send message</Button>
      </form>
    </section>
  );
}
