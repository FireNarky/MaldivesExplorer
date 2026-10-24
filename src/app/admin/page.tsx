import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare, FileText, Compass, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function AdminFoundationPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  return (
    <section className="grid max-w-4xl gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">
            Management Portal
          </span>
          <h1 className="text-3xl font-display text-ocean dark:text-cyan-200 mt-1">Staff Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            Logged in as <span className="font-semibold text-ink dark:text-white">{session.user.email}</span>
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="secondary" className="rounded-xl">
            <LogOut size={16} />
            Sign out
          </Button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Chat & Contact Settings Card */}
        <Link
          href="/admin/settings/contact"
          className="group rounded-2xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-5 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-lagoon hover:shadow-2"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 mb-3 group-hover:bg-lagoon group-hover:text-white transition-colors">
            <MessageSquare size={20} />
          </div>
          <h2 className="font-display text-base font-semibold text-ocean dark:text-cyan-200">
            Chat &amp; Contact Settings
          </h2>
          <p className="text-xs text-muted mt-1">
            Manage WhatsApp, Messenger &amp; Telegram channels, office hours, and phone numbers.
          </p>
        </Link>

        {/* Enquiries Card */}
        <Link
          href="/admin/enquiries"
          className="group rounded-2xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-5 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-lagoon hover:shadow-2"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 mb-3 group-hover:bg-lagoon group-hover:text-white transition-colors">
            <Compass size={20} />
          </div>
          <h2 className="font-display text-base font-semibold text-ocean dark:text-cyan-200">
            Guest Enquiries
          </h2>
          <p className="text-xs text-muted mt-1">
            Review custom trip submissions, qualification scores, and assign specialists.
          </p>
        </Link>

        {/* Catalog Card */}
        <Link
          href="/admin/catalog/resorts"
          className="group rounded-2xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-5 shadow-1 transition-all duration-200 hover:-translate-y-1 hover:border-lagoon hover:shadow-2"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300 mb-3 group-hover:bg-lagoon group-hover:text-white transition-colors">
            <FileText size={20} />
          </div>
          <h2 className="font-display text-base font-semibold text-ocean dark:text-cyan-200">
            Resorts &amp; Catalog
          </h2>
          <p className="text-xs text-muted mt-1">
            Manage atolls, islands, resort inventory, and luxury villas.
          </p>
        </Link>
      </div>
    </section>
  );
}
