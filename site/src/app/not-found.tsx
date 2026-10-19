import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid max-w-[65ch] gap-4">
      <h1>Page not found</h1>
      <p>This address is not part of the application foundation.</p>
      <Link href="/" className="w-fit text-base font-semibold text-lagoon-ink underline">
        Back to Maldives Explorer
      </Link>
    </section>
  );
}
