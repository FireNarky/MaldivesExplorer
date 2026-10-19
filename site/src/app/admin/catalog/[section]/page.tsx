import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { permissionsForUser } from "@/modules/identity/service";
import {
  catalogRows,
  catalogSectionSingular,
  catalogSectionTitles,
  knownCatalogSection,
} from "@/modules/admin/screen";

export default async function CatalogListPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!knownCatalogSection(section)) notFound();
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  const permissions = await permissionsForUser(session.user.id);
  if (!permissions.includes("catalog.read") && !permissions.includes("catalog.write")) notFound();
  const rows = await catalogRows(section);
  const title = catalogSectionTitles[section] ?? "Catalog";
  return (
    <section className="grid max-w-[65ch] gap-4">
      <h1>{title}</h1>
      {permissions.includes("catalog.write") ? (
        <Link href={`/admin/catalog/${section}/new`} className="font-semibold text-lagoon-ink">
          Add {catalogSectionSingular[section]}
        </Link>
      ) : null}
      {rows.length === 0 ? <p>No records yet.</p> : null}
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={`/admin/catalog/${section}/${row.id}`} className="text-lagoon-ink">
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
