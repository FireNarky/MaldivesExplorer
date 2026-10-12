import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo/metadata";
import { confirmNewsletter, NewsletterError } from "@/modules/newsletter/service";

export const metadata: Metadata = publicMetadata({
  title: "Confirm newsletter",
  description: "Confirm a newsletter subscription.",
  path: "/newsletter/confirm",
});

export default async function ConfirmNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const query = await searchParams;
  let message = "This confirmation link is not valid.";
  if (query.token) {
    try {
      await confirmNewsletter(query.token);
      message = "Your subscription is confirmed.";
    } catch (error) {
      message = error instanceof NewsletterError ? error.message : message;
    }
  }
  return (
    <article className="grid max-w-[65ch] gap-6">
      <h1>Confirm newsletter</h1>
      <p>{message}</p>
    </article>
  );
}
