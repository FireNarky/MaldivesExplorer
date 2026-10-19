import Link from "next/link";
import { JsonLd } from "@/components/discovery/json-ld";
import { breadcrumbData, type Crumb } from "@/lib/seo/structured";

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-x-2 gap-y-1 text-base text-ink">
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex gap-2">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href && index < items.length - 1 ? (
                <Link href={item.href} className="text-lagoon-ink">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={index === items.length - 1 ? "page" : undefined}>
                  {item.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbData(items)} />
    </>
  );
}
