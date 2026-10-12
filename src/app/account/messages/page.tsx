import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { publicMetadata } from "@/lib/seo/metadata";
import { listMessageThreads } from "@/modules/customers/records";

export const metadata: Metadata = publicMetadata({
  title: "Messages",
  description: "Messages on your trip plans.",
  path: "/account/messages",
});

export default async function MessagesPage() {
  const session = await auth().catch(() => null);
  const threads = await listMessageThreads(session?.user?.id || "");
  return (
    <section className="grid max-w-[65ch] gap-6">
      <h1>Messages</h1>
      {threads.length === 0 ? (
        <EmptyState title="Messages">
          <p>No trip plan is linked to this account.</p>
        </EmptyState>
      ) : (
        <ul className="grid gap-4">
          {threads.map((thread) => (
            <li key={thread.reference} className="grid gap-1">
              <Link
                href={`/account/messages/${thread.reference}`}
                className="font-semibold text-lagoon-ink"
              >
                {thread.reference}
              </Link>
              <p>{thread.preview}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
