import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { permissionsForUser } from "@/modules/identity/service";

const catalogLinks = [
  ["atolls", "Atolls"],
  ["islands", "Islands"],
  ["resorts", "Resorts"],
  ["rooms", "Room types"],
  ["dining", "Dining"],
  ["transfers", "Transfers"],
  ["amenities", "Amenities"],
  ["audiences", "Audiences"],
  ["experience-categories", "Experience categories"],
  ["experiences", "Experiences"],
] as const;

const contentLinks = [
  ["categories", "Categories"],
  ["tags", "Tags"],
  ["authors", "Authors"],
  ["articles", "Articles"],
  ["faqs", "FAQs"],
  ["collections", "Collections"],
  ["homepage", "Homepage"],
  ["blocks", "Blocks"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  const catalog = permissions.includes("catalog.read") || permissions.includes("catalog.write");
  const content = permissions.includes("content.read") || permissions.includes("content.write");
  const media = permissions.includes("media.read") || permissions.includes("media.write");
  const enquiries =
    permissions.includes("enquiry.read.assigned") || permissions.includes("enquiry.read.all");
  const operations = permissions.includes("report.read");
  const quotes =
    permissions.includes("quote.read") ||
    permissions.includes("quote.write") ||
    permissions.includes("quote.approve");
  return (
    <div className="grid gap-8">
      <nav aria-label="Staff" className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/admin" className="font-semibold text-lagoon-ink">
          Staff
        </Link>
        {catalog
          ? catalogLinks.map(([section, label]) => (
              <Link key={section} href={`/admin/catalog/${section}`} className="text-lagoon-ink">
                {label}
              </Link>
            ))
          : null}
        {content
          ? contentLinks.map(([section, label]) => (
              <Link key={section} href={`/admin/content/${section}`} className="text-lagoon-ink">
                {label}
              </Link>
            ))
          : null}
        {enquiries ? (
          <Link href="/admin/enquiries" className="text-lagoon-ink">
            Enquiries
          </Link>
        ) : null}
        {quotes ? (
          <Link href="/admin/quotes" className="text-lagoon-ink">
            Quotes
          </Link>
        ) : null}
        {permissions.includes("review.moderate") || permissions.includes("review.publish") ? (
          <Link href="/admin/reviews" className="text-lagoon-ink">
            Reviews
          </Link>
        ) : null}
        {permissions.includes("newsletter.read") || permissions.includes("newsletter.write") ? (
          <Link href="/admin/newsletter" className="text-lagoon-ink">
            Newsletter
          </Link>
        ) : null}
        {operations ? (
          <Link href="/admin/reports" className="text-lagoon-ink">
            Reports
          </Link>
        ) : null}
        {operations ? (
          <Link href="/admin/enquiries/report" className="text-lagoon-ink">
            Enquiry operations
          </Link>
        ) : null}
        {media ? (
          <Link href="/admin/media" className="text-lagoon-ink">
            Media
          </Link>
        ) : null}
        {content ? (
          <Link href="/admin/redirects" className="text-lagoon-ink">
            Redirects
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  );
}
