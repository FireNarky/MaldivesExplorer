import type { Metadata } from "next";
import Link from "next/link";
import {
  MessageSquare,
  Phone,
  Mail,
  Clock,
  MapPin,
  Plane,
  ArrowUpRight,
  Compass,
} from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";
import { ContactForm } from "@/components/contact/contact-form";
import { WhatsAppIcon, MessengerIcon, TelegramIcon } from "@/components/chat/social-icons";
import { getContactSettings } from "@/modules/contact/service";
import {
  activeContactChannels,
  DEFAULT_CONTACT_SETTINGS,
  formatWhatsAppUrl,
  formatMessengerUrl,
  formatTelegramUrl,
} from "@/modules/contact/types";
import { currentNoticeVersion } from "@/modules/newsletter/service";
import { publicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = publicMetadata({
  title: "Contact & Travel Enquiries",
  description:
    "Send a travel enquiry to the Maldives Explorer team for resort guidance, transfer planning, or a tailored written quote.",
  path: "/contact",
});

const crumbs = [{ name: "Home", href: "/" }, { name: "Contact" }];

export default async function ContactPage() {
  const [settings, noticeVersion] = await Promise.all([
    getContactSettings().catch(() => DEFAULT_CONTACT_SETTINGS),
    currentNoticeVersion().catch(() => "2026-10-10"),
  ]);
  const active = activeContactChannels(settings);

  const whatsappUrl = formatWhatsAppUrl(settings.whatsappNumber, settings.whatsappMessage);
  const messengerUrl = formatMessengerUrl(settings.messengerUsername);
  const telegramUrl = formatTelegramUrl(settings.telegramUsername);

  return (
    <div className="grid gap-12 sm:gap-16">
      <PageHeader
        crumbs={crumbs}
        title="Contact & Travel Enquiries"
        lede="Share your travel questions or resort preferences with our team for transfer guidance and a tailored written quote."
      />

      {/* Direct Messaging & Live Chat Channels (rendered only when configured) */}
      {active.hasMessaging ? (
        <section aria-labelledby="live-channels-heading" className="grid gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-400">
              Direct Messaging
            </p>
            <h2
              id="live-channels-heading"
              className="text-2xl sm:text-3xl font-display text-ocean dark:text-cyan-200 mt-1"
            >
              Messaging Channels
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {active.whatsapp ? (
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
                  </div>
                  <h3 className="font-display text-xl text-emerald-950 dark:text-emerald-200">
                    WhatsApp
                  </h3>
                  <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                    Message our team on WhatsApp regarding resort options and transfer questions.
                  </p>
                  <div className="mt-3 font-mono text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                    {settings.whatsappNumber}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 group-hover:underline">
                  <span>Start WhatsApp Chat</span>
                  <ArrowUpRight size={15} />
                </div>
              </a>
            ) : null}

            {active.messenger ? (
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
                  </div>
                  <h3 className="font-display text-xl text-blue-950 dark:text-blue-200">
                    Facebook Messenger
                  </h3>
                  <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                    Connect via Facebook Messenger for itinerary questions.
                  </p>
                  <div className="mt-3 font-mono text-sm font-semibold text-blue-900 dark:text-blue-300">
                    @{settings.messengerUsername.replace(/^@/, "")}
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 group-hover:underline">
                  <span>Chat on Messenger</span>
                  <ArrowUpRight size={15} />
                </div>
              </a>
            ) : null}

            {active.telegram ? (
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
                  </div>
                  <h3 className="font-display text-xl text-sky-950 dark:text-sky-200">
                    Telegram Messenger
                  </h3>
                  <p className="text-xs text-muted dark:text-slate-300 mt-1 leading-relaxed">
                    Message our team on Telegram.
                  </p>
                  <div className="mt-3 font-mono text-sm font-semibold text-sky-900 dark:text-sky-300">
                    @{settings.telegramUsername.replace(/^@/, "")}
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
      ) : null}

      {/* Main Grid: Contact Details / Guidance & General Enquiry Form */}
      <div className="grid gap-10 lg:grid-cols-12 items-start">
        <div className="space-y-6 lg:col-span-5">
          {active.hasDirectDetails ? (
            <div className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1 space-y-6">
              <h2 className="font-display text-xl text-ocean dark:text-cyan-300">
                Contact Details
              </h2>

              <div className="space-y-4">
                {active.phone ? (
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                      <Phone size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Telephone
                      </div>
                      <a
                        href={`tel:${settings.phone}`}
                        className="text-sm font-semibold text-ink dark:text-white hover:text-lagoon-ink"
                      >
                        {settings.phone}
                      </a>
                    </div>
                  </div>
                ) : null}

                {active.email ? (
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Email
                      </div>
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-sm font-semibold text-ink dark:text-white hover:text-lagoon-ink"
                      >
                        {settings.email}
                      </a>
                    </div>
                  </div>
                ) : null}

                {active.officeHours ? (
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Hours
                      </div>
                      <div className="text-sm text-ink dark:text-white font-medium">
                        {settings.officeHours}
                      </div>
                    </div>
                  </div>
                ) : null}

                {active.emergencyDesk ? (
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                      <Plane size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Transfer Assistance
                      </div>
                      <div className="text-sm text-ink dark:text-white font-medium">
                        {settings.emergencyDesk}
                      </div>
                    </div>
                  </div>
                ) : null}

                {active.address ? (
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mist dark:bg-white/10 text-lagoon-ink dark:text-cyan-300">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted">
                        Address
                      </div>
                      <div className="text-sm text-ink dark:text-white font-medium leading-relaxed">
                        {settings.address}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-lagoon/20 bg-gradient-to-br from-mist/50 to-white dark:from-white/5 dark:to-transparent p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-ocean dark:text-cyan-300 font-semibold text-sm">
              <MessageSquare size={18} />
              <span>How Enquiries Work</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Submit your travel details using the enquiry form on this page, or use the structured
              trip planner to specify travel dates, party size, budget range, and preferred resorts.
              Our team reviews each request and prepares an itemized written quotation in USD.
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Submitting an enquiry does not create a confirmed reservation or charge.
            </p>
            <div className="pt-1">
              <Link
                href="/plan"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline"
              >
                <Compass size={14} />
                <span>Open the step-by-step Trip Planner &rarr;</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: General Enquiry Form */}
        <div className="lg:col-span-7">
          <ContactForm
            noticeVersion={noticeVersion}
            whatsappNumber={active.whatsapp ? settings.whatsappNumber : undefined}
            whatsappMessage={settings.whatsappMessage}
          />
        </div>
      </div>
    </div>
  );
}
