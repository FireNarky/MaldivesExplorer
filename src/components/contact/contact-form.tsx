"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { submitContactEnquiryAction, ContactEnquiryState } from "@/modules/contact/actions";
import { Button } from "@/components/ui/button";

const initialState: ContactEnquiryState = {
  success: false,
};

function createKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function ContactForm({ noticeVersion = "2026-10-10" }: { noticeVersion?: string }) {
  const [state, formAction, isPending] = useActionState(submitContactEnquiryAction, initialState);
  const [dismissedReference, setDismissedReference] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState("Resort Booking");
  const [dates, setDates] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createKey());

  const showSuccess =
    state.success && Boolean(state.reference) && state.reference !== dismissedReference;
  const visibleError = clientError ?? state.error ?? null;

  if (showSuccess && state.reference) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-8 sm:p-10 text-center shadow-2 animate-in zoom-in-95 duration-300">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold text-emerald-950 dark:text-emerald-200">
          Enquiry Received
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-light">
          Your travel request has been recorded. Our travel team will review your requirements and
          reply with written options.
        </p>

        <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-white dark:bg-[#0c1b22] px-5 py-3 shadow-sm">
          <span className="text-xs uppercase tracking-wider text-muted font-bold">
            Your Reference:
          </span>
          <span className="font-mono text-base font-bold text-ocean dark:text-cyan-400">
            {state.reference}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="conversion" className="rounded-full px-6">
            <Link href="/resorts">
              Browse Featured Resorts
              <ArrowRight size={16} />
            </Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDismissedReference(state.reference ?? null);
              setName("");
              setEmail("");
              setPhone("");
              setTopic("Resort Booking");
              setDates("");
              setMessage("");
              setConsent(false);
              setClientError(null);
              setIdempotencyKey(createKey());
            }}
            className="rounded-full px-6"
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-10 shadow-2">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mist dark:bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-300">
          <Sparkles size={13} />
          Bespoke Travel Inquiry
        </span>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl text-ocean dark:text-cyan-200 font-medium">
          Send Us an Enquiry
        </h2>
        <p className="mt-1 text-sm text-muted">
          Share your travel requirements and our team will prepare a written quotation.
        </p>
      </div>

      {visibleError ? (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-50/60 dark:bg-rose-950/20 p-4 text-sm text-rose-800 dark:text-rose-300"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{visibleError}</span>
        </div>
      ) : null}

      <form
        action={formAction}
        noValidate
        onSubmit={(event) => {
          if (!consent) {
            event.preventDefault();
            setClientError("Consent is required before your enquiry can be sent.");
            return;
          }
          setClientError(null);
        }}
        className="grid gap-5"
      >
        <input type="hidden" name="noticeVersion" value={noticeVersion} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

        {/* Anti-spam honeypot */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Full Name */}
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-name"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Full Name <span className="text-coral">*</span>
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your full name"
              className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          {/* Email Address */}
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-email"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Email Address <span className="text-coral">*</span>
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="traveler@example.com"
              className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {/* Phone / WhatsApp */}
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-phone"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Phone / WhatsApp
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional phone number"
              className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>

          {/* Topic */}
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-topic"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Enquiry Topic
            </label>
            <select
              id="contact-topic"
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-[#071318] px-4 text-base text-ink dark:text-white focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            >
              <option value="Resort Booking">Resort Villa Booking</option>
              <option value="Multi-Island Itinerary">Multi-Island Itinerary</option>
              <option value="Private Island Buyout">Private Island Buyout</option>
              <option value="Seaplane & Transfers">Seaplane Transfers</option>
              <option value="Honeymoon & Special Occasion">Honeymoon &amp; Special Occasion</option>
              <option value="General Question">General Concierge Question</option>
            </select>
          </div>

          {/* Travel Dates */}
          <div className="grid gap-1.5">
            <label
              htmlFor="contact-dates"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              Target Month / Dates
            </label>
            <input
              id="contact-dates"
              name="dates"
              type="text"
              value={dates}
              onChange={(event) => setDates(event.target.value)}
              placeholder="e.g. November 2026 (7 nights)"
              className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 px-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
            />
          </div>
        </div>

        {/* Message */}
        <div className="grid gap-1.5">
          <label
            htmlFor="contact-message"
            className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
          >
            Travel Requirements &amp; Notes <span className="text-coral">*</span>
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us about your preferred stay, villa style, dining preferences, or transfer questions..."
            className="w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 p-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
          />
        </div>

        {/* Consent Checkbox */}
        <label className="flex items-start gap-3 text-xs leading-relaxed cursor-pointer select-none text-muted dark:text-slate-300 pt-1">
          <input
            id="contact-consent"
            type="checkbox"
            name="consent"
            value="yes"
            required
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (event.target.checked) setClientError(null);
            }}
            className="size-5 min-w-5 rounded cursor-pointer accent-lagoon text-ocean focus:ring-2 focus:ring-lagoon/40 mt-0.5"
          />
          <span>
            I agree that Maldives Explorer may contact me to respond to this enquiry. Notice version{" "}
            {noticeVersion}. See the{" "}
            <Link href="/privacy" className="font-semibold text-lagoon-ink underline">
              Privacy Notice
            </Link>
            .
          </span>
        </label>

        {/* Submit */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="conversion"
            disabled={isPending}
            className="min-h-12 rounded-full px-8 text-base shadow-2 w-full sm:w-auto"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending Enquiry...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={18} />
                Submit Enquiry
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
