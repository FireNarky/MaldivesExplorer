import Link from "next/link";
import type { PublicLink } from "@/modules/discovery/types";

export function RelatedList({ title, items }: { title: string; items: PublicLink[] }) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2>{title}</h2>
      <ul className="grid gap-4">
        {items.map((item) => (
          <li key={`${item.href}-${item.id}`} className="grid gap-1">
            <Link href={item.href} className="text-lagoon-ink">
              {item.name}
            </Link>
            {item.summary ? <p>{item.summary}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
