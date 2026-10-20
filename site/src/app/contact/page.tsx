import type { Metadata } from "next";
import { MessageSquare, Phone, Mail, Clock, MapPin, Plane, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactForm } from "@/components/contact/contact-form";
import { WhatsAppIcon, MessengerIcon, TelegramIcon } from "@/components/chat/social-icons";
import { getContactSettings } from "@/modules/contact/service";
import {
  formatWhatsAppUrl,
  formatMessengerUrl,
  formatTelegramUrl,
} from "@/modules/contact/types";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Contact Island Concierge · WhatsApp, Messenger & Telegram",
  description:
    "Direct communication with resident Maldivian island specialists. Chat via WhatsApp, Messenger, Telegram, or submit a bespoke enquiry.",
  path: "/contact",
});

const crumbs = [{ name: "Home", href: "/" }, { name: "Contact" }];

export default async function ContactPage() {
  const settings = await getContactSettings();

  const whatsappUrl = formatWhatsAppUrl(settings.whatsappNumber, settings.whatsappMessage);
  const messengerUrl = formatMessengerUrl(settings.messengerUsername);
  const telegramUrl = formatTelegramUrl(settings.telegramUsername);

  return (
    <div className="grid gap-12 sm:gap-16">
      <PageHeader
        crumbs={crumbs}
        title="Contact Island Concierge"
        lede="Connect with our Maldivian travel team for immediate villa advice, seaplane transfer coordination, or a tailored private island quote."
      />

      {/* Direct Messaging & Live Chat Channels */}
      <section aria-labelledby="live-channels-heading" className="grid gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
            Immediate Messaging
          </p>
          <h2 id="live-channels-heading" className="text-2xl sm:text-3xl font-display text-ocean dark:text-cyan-200 mt-1">
            Chat Directly with Our Team
          </h2>
          <p className="text-sm text-muted mt-1">
            Fast replies from island concierges located in Malé and Velana International Airport.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* WhatsApp Card */}
          {settings.whatsappEnabled ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-50/70 to-emerald-100/30 dark:from-emerald-950/25 dark:to-emerald-950/10 p-6 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-2"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <WhatsAppIcon className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Available
                  </span>
                </div>
                <h3 className="font-display text-xl text-emerald-950 dark:text-emerald-200">
                  WhatsApp Direct
                </h3>
                <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                  Fastest channel for live villa rates, transfer schedules, and private resort queries.
                </p>
                <div className="mt-3 font-mono text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  {settings.whatsappNumber || "+960 799 1234"}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 group-hover:underline">
                <span>Start WhatsApp Chat</span>
                <ArrowUpRight size={15} />
              </div>
            </a>
          ) : null}

          {/* Facebook Messenger Card */}
          {settings.messengerEnabled ? (
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-50/70 to-blue-100/30 dark:from-blue-950/25 dark:to-blue-950/10 p-6 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-2"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#0084ff] text-white shadow-sm">
                    <MessengerIcon className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-blue-800 dark:text-blue-300">
                    <span className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    Available
                  </span>
                </div>
                <h3 className="font-display text-xl text-blue-950 dark:text-blue-200">
                  Facebook Messenger
                </h3>
                <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                  Connect via Facebook Messenger for itinerary dispatches and visual previews.
                </p>
                <div className="mt-3 font-mono text-sm font-semibold text-blue-900 dark:text-blue-300">
                  @{settings.messengerUsername || "maldivesexplorer"}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 group-hover:underline">
                <span>Chat on Messenger</span>
                <ArrowUpRight size={15} />
              </div>
            </a>
          ) : null}

          {/* Telegram Card */}
          {settings.telegramEnabled ? (
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-b from-sky-50/70 to-sky-100/30 dark:from-sky-950/25 dark:to-sky-950/10 p-6 shadow-1 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/50 hover:shadow-2"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[#229ed9] text-white shadow-sm">
                    <TelegramIcon className="size-6" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-900/50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-sky-800 dark:text-sky-300">
                    <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
                    Available
                  </span>
                </div>
                <h3 className="font-display text-xl text-sky-950 dark:text-sky-200">
                  Telegram Messenger
                </h3>
                <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                  Secure and instant messaging for travelers on the go across any device.
                </p>
                <div className="mt-3 font-mono text-sm font-semibold text-sky-900 dark:text-sky-300">
                  @{settings.telegramUsername || "maldivesexplorer"}
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 group-hover:underline">
                <span>Open in Telegram</span>
                <ArrowUpRight size={15} />
              </div>
            </a>
          ) : null}
        </div>
      </section>

      {/* Main Grid: Direct Office Desk & General Enquiry Form */}
      <div className="grid gap-10 lg:grid-cols-12 items-start">
        {/* Left Column: Island Operations & Direct Desk info */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1 space-y-6">
            <h3 className="font-display text-xl text-ocean dark:text-cyan-300">
              Operations &amp; Seaplane Desk
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Direct Telephone</div>
                  <a href={`tel:${settings.phone}`} className="text-sm font-semibold text-ink dark:text-white hover:text-lagoon-ink">
                    {settings.phone || "+960 332 4500"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Email Concierge</div>
                  <a href={`mailto:${settings.email}`} className="text-sm font-semibold text-ink dark:text-white hover:text-lagoon-ink">
                    {settings.email || "concierge@xplorer.itnvend.com"}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Concierge Desk Hours</div>
                  <div className="text-sm text-ink dark:text-white font-medium">
                    {settings.officeHours || "24/7 Island Concierge & Transfer Coordination"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                  <Plane size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Seaplane Airport Desk</div>
                  <div className="text-sm text-ink dark:text-white font-medium">
                    {settings.emergencyDesk || "Velana International Airport (VIA) · Seaplane Lounge Desk 4B"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">Head Office</div>
                  <div className="text-sm text-ink dark:text-white font-medium leading-relaxed">
                    {settings.address || "Waterfront Executive Building, Boduthakurufaanu Magu, Malé 20026, Maldives"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service Guarantee Card */}
          <div className="rounded-2xl border border-lagoon/20 bg-gradient-to-br from-mist/50 to-white dark:from-white/5 dark:to-transparent p-6 shadow-sm">
            <div className="flex items-center gap-2 text-ocean dark:text-cyan-300 font-semibold text-sm">
              <MessageSquare size={18} />
              <span>Written Quotes Within 4 Hours</span>
            </div>
            <p className="mt-2 text-xs text-muted leading-relaxed">
              We coordinate directly with resort general managers and marine logistics coordinators to verify villa availability, seasonal meal plan upgrades, and seaplane transfer connections.
            </p>
          </div>
        </div>

        {/* Right Column: General Enquiry Form */}
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
