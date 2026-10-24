import Link from "next/link";
import { headers } from "next/headers";

const links = [
  { href: "/account", label: "Account" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/saved", label: "Saved" },
  { href: "/account/enquiries", label: "Enquiries" },
  { href: "/account/messages", label: "Messages" },
  { href: "/account/preferences", label: "Preferences" },
  { href: "/account/consent", label: "Consent" },
  { href: "/account/privacy", label: "Privacy" },
];

function current(path: string, href: string): boolean {
  if (href === "/account") return path === "/account";
  return path === href || path.startsWith(`${href}/`);
}

export async function AccountNav() {
  const path = (await headers()).get("x-pathname") ?? "";
  return (
    <nav aria-label="Account sections" className="flex flex-wrap gap-2 lg:grid lg:content-start">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={current(path, link.href) ? "page" : undefined}
          className="inline-flex min-h-11 items-center rounded-xl px-3.5 font-semibold text-lagoon-ink dark:text-cyan-400 aria-[current=page]:bg-white dark:aria-[current=page]:bg-white/10 aria-[current=page]:shadow-xs dark:aria-[current=page]:text-white aria-[current=page]:underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
