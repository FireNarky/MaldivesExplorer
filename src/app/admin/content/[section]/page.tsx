import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { permissionsForUser } from "@/modules/identity/service";
import {
  contentRows,
  contentSectionSingular,
  contentSectionTitles,
  knownContentSection,
} from "@/modules/admin/screen";

export default async function ContentListPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!knownContentSection(section)) notFound();
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("content.read") && !permissions.includes("content.write")) notFound();
  const rows = await contentRows(section);
  const title = contentSectionTitles[section] ?? "Content";
  return (
    <section className="grid max-w-[65ch] gap-4">
      <h1>{title}</h1>
      {permissions.includes("content.write") ? (
        <Link href={`/admin/content/${section}/new`} className="font-semibold text-lagoon-ink">
          Add {contentSectionSingular[section]}
        </Link>
      ) : null}
      {rows.length === 0 ? <p>No records yet.</p> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/content/${section}/${row.id}`} className="text-lagoon-ink">
              {row.label}
            </Link>
            {row.status ? <span> · {row.status}</span> : null}
            {row.meta ? <span> · {row.meta}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
