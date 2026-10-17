import Link from "next/link";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { currentNoticeVersion } from "@/modules/newsletter/service";

export async function SiteFooter() {
  const noticeVersion = await currentNoticeVersion().catch(() => "2026-10-10");
  return (
    <footer className="surface-inverse bg-ocean text-sand">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-8 lg:px-8">
        <p className="font-display text-xl text-sand">Maldives Explorer</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/destinations" className="text-base text-sand">
            Destinations
          </Link>
          <Link href="/experiences" className="text-base text-sand">
            Experiences
          </Link>
          <Link href="/guides" className="text-base text-sand">
            Guides
          </Link>
          <Link href="/offers" className="text-base text-sand">
            Offers
          </Link>
          <Link href="/collections" className="text-base text-sand">
            Collections
          </Link>
          <Link href="/faq" className="text-base text-sand">
            Questions
          </Link>
          <Link href="/search" className="text-base text-sand">
            Search
          </Link>
          <Link href="/wishlist" className="text-base text-sand">
            Saved
          </Link>
          <Link href="/compare" className="text-base text-sand">
            Compare
          </Link>
          <Link href="/recently-viewed" className="text-base text-sand">
            Recently viewed
          </Link>
          <Link href="/plan" className="text-base text-sand">
            Plan a trip
          </Link>
          <Link href="/account" className="text-base text-sand">
            Account
          </Link>
          <Link href="/reviews" className="text-base text-sand">
            Testimonials
          </Link>
          <Link href="/newsletter" className="text-base text-sand">
            Newsletter
          </Link>
        </nav>
        <SubscribeForm
          idPrefix="footer"
          noticeVersion={noticeVersion}
          returnPath="/newsletter"
          showTopics={false}
        />
      </div>
    </footer>
  );
}
