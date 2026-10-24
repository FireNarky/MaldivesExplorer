"use client";

import { useActionState, useState } from "react";
import { Check, ExternalLink, Save, AlertCircle } from "lucide-react";
import { saveContactSettingsAction } from "@/modules/contact/actions";
import {
  ContactSettings,
  formatWhatsAppUrl,
  formatMessengerUrl,
  formatTelegramUrl,
} from "@/modules/contact/types";
import { WhatsAppIcon, MessengerIcon, TelegramIcon } from "@/components/chat/social-icons";
import { Button } from "@/components/ui/button";

export function ContactSettingsForm({ initialSettings }: { initialSettings: ContactSettings }) {
  const [state, formAction, isPending] = useActionState(saveContactSettingsAction, {
    success: false,
    message: "",
  });

  const [whatsappNumber, setWhatsappNumber] = useState(initialSettings.whatsappNumber);
  const [whatsappMessage, setWhatsappMessage] = useState(initialSettings.whatsappMessage);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialSettings.whatsappEnabled);

  const [messengerUsername, setMessengerUsername] = useState(initialSettings.messengerUsername);
  const [messengerEnabled, setMessengerEnabled] = useState(initialSettings.messengerEnabled);

  const [telegramUsername, setTelegramUsername] = useState(initialSettings.telegramUsername);
  const [telegramEnabled, setTelegramEnabled] = useState(initialSettings.telegramEnabled);

  const testWhatsAppUrl = formatWhatsAppUrl(whatsappNumber, whatsappMessage);
  const testMessengerUrl = formatMessengerUrl(messengerUsername);
  const testTelegramUrl = formatTelegramUrl(telegramUsername);

  return (
    <form action={formAction} className="grid gap-8">
      {state.message ? (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
            state.success
              ? "border border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          }`}
        >
          {state.success ? (
            <Check size={18} className="mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 text-rose-600" />
          )}
          <span>{state.message}</span>
        </div>
      ) : null}

      {/* 1. WhatsApp Configuration */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <WhatsAppIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-white">
                WhatsApp Channel
              </h2>
              <p className="text-xs text-muted">
                Visitors can tap to start an instant WhatsApp conversation with your concierge.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="whatsappEnabled"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              className="size-5 rounded cursor-pointer accent-emerald-600"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              {whatsappEnabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label
              htmlFor="whatsappNumber"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              WhatsApp Phone Number (with Country Code)
            </label>
            <input
              id="whatsappNumber"
              name="whatsappNumber"
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+44 7700 900123"
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[11px] text-muted">
              Enter the full international number with country code.
            </p>
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="whatsappMessage"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Default Pre-Filled Greeting Message
            </label>
            <input
              id="whatsappMessage"
              name="whatsappMessage"
              type="text"
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              placeholder="Hello Maldives Explorer..."
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[11px] text-muted">
              Pre-filled text in the traveler&apos;s WhatsApp composer.
            </p>
          </div>
        </div>

        {/* Live Test Link */}
        <div className="mt-5 rounded-2xl bg-sand/60 dark:bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted">Generated WhatsApp Link:</span>
          <a
            href={testWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
          >
            {testWhatsAppUrl}
            <ExternalLink size={13} />
          </a>
        </div>
      </section>

      {/* 2. Messenger Configuration */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#0084ff] text-white">
              <MessengerIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-white">
                Facebook Messenger
              </h2>
              <p className="text-xs text-muted">
                Direct chat with your Facebook Page or concierge handle via m.me.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="messengerEnabled"
              checked={messengerEnabled}
              onChange={(e) => setMessengerEnabled(e.target.checked)}
              className="size-5 rounded cursor-pointer accent-[#0084ff]"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              {messengerEnabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        <div className="grid gap-1.5 max-w-md">
          <label
            htmlFor="messengerUsername"
            className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
          >
            Facebook Page Username or m.me URL
          </label>
          <input
            id="messengerUsername"
            name="messengerUsername"
            type="text"
            value={messengerUsername}
            onChange={(e) => setMessengerUsername(e.target.value)}
            placeholder="maldivesexplorer"
            className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-[11px] text-muted">
            Enter your Facebook username (e.g. maldivesexplorer) or page ID.
          </p>
        </div>

        {/* Live Test Link */}
        <div className="mt-5 rounded-2xl bg-sand/60 dark:bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted">Generated Messenger Link:</span>
          <a
            href={testMessengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-blue-700 dark:text-blue-400 font-semibold hover:underline"
          >
            {testMessengerUrl}
            <ExternalLink size={13} />
          </a>
        </div>
      </section>

      {/* 3. Telegram Configuration */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[#229ed9] text-white">
              <TelegramIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink dark:text-white">
                Telegram Channel
              </h2>
              <p className="text-xs text-muted">
                Direct chat with your Telegram bot or concierge username via t.me.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="telegramEnabled"
              checked={telegramEnabled}
              onChange={(e) => setTelegramEnabled(e.target.checked)}
              className="size-5 rounded cursor-pointer accent-[#229ed9]"
            />
            <span className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
              {telegramEnabled ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        <div className="grid gap-1.5 max-w-md">
          <label
            htmlFor="telegramUsername"
            className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
          >
            Telegram Username or t.me Handle
          </label>
          <input
            id="telegramUsername"
            name="telegramUsername"
            type="text"
            value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)}
            placeholder="maldivesexplorer"
            className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <p className="text-[11px] text-muted">
            Enter your handle without @ (e.g. maldivesexplorer).
          </p>
        </div>

        {/* Live Test Link */}
        <div className="mt-5 rounded-2xl bg-sand/60 dark:bg-white/5 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-muted">Generated Telegram Link:</span>
          <a
            href={testTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-sky-700 dark:text-sky-400 font-semibold hover:underline"
          >
            {testTelegramUrl}
            <ExternalLink size={13} />
          </a>
        </div>
      </section>

      {/* 4. Direct Operations Desk Details */}
      <section className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-8 shadow-1">
        <div className="border-b border-border-subtle pb-4 mb-6">
          <h2 className="font-display text-lg font-semibold text-ink dark:text-white">
            Concierge Desk &amp; Operations Contacts
          </h2>
          <p className="text-xs text-muted">
            These details are displayed on the public /contact page and quote PDFs.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Primary Concierge Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={initialSettings.email}
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="phone"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Direct Telephone
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={initialSettings.phone}
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="officeHours"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Concierge Hours Notice
            </label>
            <input
              id="officeHours"
              name="officeHours"
              type="text"
              defaultValue={initialSettings.officeHours}
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          <div className="grid gap-1.5">
            <label
              htmlFor="emergencyDesk"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Airport Seaplane Desk
            </label>
            <input
              id="emergencyDesk"
              name="emergencyDesk"
              type="text"
              defaultValue={initialSettings.emergencyDesk}
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label
              htmlFor="address"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Physical Head Office Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              defaultValue={initialSettings.address}
              className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-sm text-ink dark:text-white focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="conversion"
          disabled={isPending}
          className="min-h-12 rounded-full px-8 text-base shadow-2 font-semibold"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving Settings...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save size={18} />
              Save All Settings
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
