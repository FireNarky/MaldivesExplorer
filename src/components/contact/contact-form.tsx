"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Send,
  User,
} from "lucide-react";
import { submitContactEnquiryAction, ContactEnquiryState } from "@/modules/contact/actions";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/chat/social-icons";

const initialState: ContactEnquiryState = {
  success: false,
};

const TOPICS = [
  "Resort Booking",
  "Multi-Island Itinerary",
  "Honeymoon & Celebration",
  "Private Buyout",
  "General Enquiry",
] as const;

export function ContactForm({
  noticeVersion = "2026-10-10",
  whatsappNumber,
  whatsappMessage,
}: {
  noticeVersion?: string;
  whatsappNumber?: string;
  whatsappMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(submitContactEnquiryAction, initialState);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState<string>("Resort Booking");
  const [dates, setDates] = useState("");
  const [userNotes, setUserNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  });

  const visibleError = clientError || state.error;

  if (state.success) {
    return (
      <div className="rounded-3xl border border-border-subtle bg-white dark:bg-white/5 p-8 sm:p-12 text-center shadow-1 space-y-5 animate-in fade-in duration-300">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-2xl sm:text-3xl text-ocean dark:text-cyan-200">
            Enquiry Received
          </h2>
          <p className="text-sm text-muted dark:text-slate-300 max-w-md mx-auto">
            Thank you, <strong className="font-semibold text-ink dark:text-white">{name || "Traveler"}</strong>. Our Maldivian specialists are preparing your tailored proposal.
          </p>
        </div>

        {state.reference ? (
          <div className="inline-flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-sand/40 dark:bg-white/5 px-6 py-3">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">Reference Code</span>
            <span className="font-mono text-lg font-bold text-ocean dark:text-cyan-300 tracking-wider">
              {state.reference}
            </span>
          </div>
        ) : null}

        <p className="text-xs text-muted dark:text-slate-400 flex items-center justify-center gap-1.5 pt-2">
          <Clock size={13} /> Written response delivered to {email} within 2 business hours.
        </p>

        <div className="pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.location.reload()}
            className="rounded-full px-6 text-xs font-semibold"
          >
            Submit Another Request
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] p-6 sm:p-10 shadow-1">
      <div className="space-y-1.5 mb-8">
        <h2 className="font-display text-2xl sm:text-3xl text-ocean dark:text-cyan-200 font-medium">
          Send a Travel Enquiry
        </h2>
        <p className="text-sm text-muted dark:text-slate-400 font-light">
          Tell us about your envisioned Maldives getaway. We will craft a bespoke itinerary and itemized quote.
        </p>
      </div>

      <form
        action={(formData) => {
          if (!consent) {
            setClientError("Consent is required before your enquiry can be sent.");
            return;
          }
          setClientError(null);
          formAction(formData);
        }}
        className="space-y-6"
      >
        <input type="hidden" name="noticeVersion" value={noticeVersion} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="topic" value={topic} />

        {/* Honeypot anti-spam field */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website-field">Leave empty</label>
          <input type="text" id="website-field" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {visibleError ? (
          <div
            role="alert"
            className="rounded-2xl border border-coral/30 bg-coral/10 p-4 text-xs font-medium text-coral flex items-center gap-2.5 animate-in fade-in"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{visibleError}</span>
          </div>
        ) : null}

        {/* Clean Topic Pills */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted dark:text-slate-300 block">
            Enquiry Topic
          </label>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((item) => {
              const isSelected = topic === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTopic(item)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-ocean text-white dark:bg-cyan-400 dark:text-[#071318] shadow-sm font-semibold"
                      : "border border-border-subtle bg-sand/30 dark:bg-white/5 text-ink dark:text-slate-300 hover:border-ocean/40"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name and Email */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="contact-name" className="text-xs font-semibold text-ink dark:text-slate-200">
              Full Name <span className="text-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Victoria Sterling"
                className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-sand/20 dark:bg-white/5 pl-9 pr-3.5 text-sm text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lagoon/20"
              />
              <User size={15} className="absolute left-3 top-3 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="contact-email" className="text-xs font-semibold text-ink dark:text-slate-200">
              Email Address <span className="text-coral">*</span>
            </label>
            <div className="relative">
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="victoria@example.com"
                className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-sand/20 dark:bg-white/5 pl-9 pr-3.5 text-sm text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lagoon/20"
              />
              <Mail size={15} className="absolute left-3 top-3 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Phone and Dates */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label htmlFor="contact-phone" className="text-xs font-semibold text-ink dark:text-slate-200">
              Phone / WhatsApp
            </label>
            <div className="relative">
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-sand/20 dark:bg-white/5 pl-9 pr-3.5 text-sm text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lagoon/20"
              />
              <Phone size={15} className="absolute left-3 top-3 text-muted pointer-events-none" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="contact-dates" className="text-xs font-semibold text-ink dark:text-slate-200">
              Target Month / Dates
            </label>
            <div className="relative">
              <input
                id="contact-dates"
                name="dates"
                type="text"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="e.g. November 2026 (7 nights)"
                className="min-h-11 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-sand/20 dark:bg-white/5 pl-9 pr-3.5 text-sm text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lagoon/20"
              />
              <Calendar size={15} className="absolute left-3 top-3 text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Message / Requirements */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="contact-user-notes" className="text-xs font-semibold text-ink dark:text-slate-200">
              Travel Requirements &amp; Notes <span className="text-coral">*</span>
            </label>
            <span className="text-[11px] text-muted">Party size, resort preferences, special wishes</span>
          </div>
          <textarea
            id="contact-user-notes"
            name="message"
            required
            rows={4}
            value={userNotes}
            onChange={(e) => setUserNotes(e.target.value)}
            placeholder="Tell us what you have in mind — e.g. preferred resorts (Soneva Jani, Waldorf Astoria), overwater villa vs beach pool, transfer preferences, dietary requirements, or celebrations..."
            className="w-full rounded-xl border border-border-subtle dark:border-white/15 bg-sand/20 dark:bg-white/5 p-3.5 text-sm text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-lagoon/20 leading-relaxed"
          />
        </div>

        {/* Consent Checkbox */}
        <div className="pt-1">
          <label className="flex cursor-pointer items-start gap-3 select-none">
            <input
              type="checkbox"
              name="consent"
              value="yes"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (e.target.checked) setClientError(null);
              }}
              className="mt-0.5 size-6 min-w-6 shrink-0 rounded-md border border-border-subtle text-lagoon focus:ring-2 focus:ring-lagoon/30 cursor-pointer"
            />
            <span className="text-xs leading-relaxed text-muted dark:text-slate-300">
              I agree to the processing of my contact information to receive tailored quotations in accordance with the{" "}
              <Link href="/privacy" className="text-ocean dark:text-cyan-400 underline font-medium hover:text-lagoon">
                Privacy Policy
              </Link>
              . You may opt out at any time.
            </span>
          </label>
        </div>

        {/* Submit Button & Optional WhatsApp */}
        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            variant="conversion"
            disabled={pending}
            className="min-h-12 w-full rounded-full py-3 text-sm font-semibold shadow-sm transition-all"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <Clock className="animate-spin" size={16} />
                Routing your enquiry...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={15} />
                Send Travel Enquiry
              </span>
            )}
          </Button>

          {whatsappNumber ? (
            <div className="text-center text-xs text-muted">
              Prefer instant chat?{" "}
              <a
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}${
                  whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
                }`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline"
              >
                <WhatsAppIcon className="size-3.5 inline" /> Message on WhatsApp
              </a>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  );
}
