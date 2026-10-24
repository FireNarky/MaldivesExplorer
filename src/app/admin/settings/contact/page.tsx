import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { auth } from "@/auth";
import { userHasPermission } from "@/modules/identity/service";
import { getContactSettings } from "@/modules/contact/service";
import { ContactSettingsForm } from "./contact-settings-form";

export const metadata: Metadata = {
  title: "Chat & Contact Channel Settings · Staff Admin",
};

export default async function ContactSettingsAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) {
    redirect("/login");
  }
  if (!(await userHasPermission(session.user.id, "setting.manage"))) {
    redirect("/admin");
  }

  const settings = await getContactSettings();

  return (
    <div className="grid gap-8 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border-subtle bg-white dark:bg-white/5 text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-lagoon-ink">
            Admin Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-medium text-ink dark:text-white">
            Chat &amp; Contact Channel Settings
          </h1>
        </div>
      </div>

      <p className="text-sm text-muted -mt-4">
        Configure the live messaging channels (WhatsApp, Messenger, Telegram) displayed on the
        floating chat widget and public contact page.
      </p>

      <ContactSettingsForm initialSettings={settings} />
    </div>
  );
}
