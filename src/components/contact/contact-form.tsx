"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Gift,
  Mail,
  MessageSquare,
  Palmtree,
  Phone,
  Plane,
  Sailboat,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { submitContactEnquiryAction, ContactEnquiryState } from "@/modules/contact/actions";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/chat/social-icons";

const initialState: ContactEnquiryState = {
  success: false,
};

const TOPICS = [
  {
    id: "Resort Booking",
    title: "Resort Villa Booking",
    desc: "Overwater pool villas, private islands & curated escapes",
    icon: Palmtree,
  },
  {
    id: "Multi-Island Itinerary",
    title: "Multi-Island Itinerary",
    desc: "Seamless island-hopping across distinct atolls & transfers",
    icon: Sailboat,
  },
  {
    id: "Honeymoon & Special Occasion",
    title: "Honeymoon & Celebration",
    desc: "Sandbank dinners, undersea dining & milestone trips",
    icon: Gift,
  },
  {
    id: "Seaplane & Transfers",
    title: "Seaplane & VIP Transfers",
    desc: "Charter flights, Twin Otter coordination & speedboat timing",
    icon: Plane,
  },
  {
    id: "Private Island Buyout",
    title: "Private Island Buyout",
    desc: "Exclusive full-island buyouts for families & delegations",
    icon: ShieldCheck,
  },
  {
    id: "General Question",
    title: "Bespoke Concierge Advisory",
    desc: "Seasonality advice, atoll comparisons & custom quote requests",
    icon: Compass,
  },
] as const;

const PARTY_OPTIONS = [
  "Couples (2 travelers)",
  "Family with Children",
  "Small Group (3–6)",
  "Private Delegation (6+)",
  "Solo Traveler",
];

const STYLE_TAGS = [
  "Overwater Villa with Slide",
  "World-Class House Reef",
  "Private Pool & Sandbank",
  "Undersea Restaurant",
  "Barefoot Eco-Sanctuary",
  "All-Inclusive Dine-Around",
  "Dedicated Butler (Aris Meeha)",
  "Whale Shark & Manta Corridor",
];

const BUDGET_TIERS = [
  "$1,500 – $3,000 / night",
  "$3,000 – $6,000 / night",
  "$6,000+ / night (Ultra-Luxe)",
  "Flexible / Best Partner Rate",
];

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

  // Form Field State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState<string>("Resort Booking");
  const [dates, setDates] = useState("");
  const [party, setParty] = useState("Couples (2 travelers)");
  const [selectedTags, setSelectedTags] = useState<string[]>(["Overwater Villa with Slide"]);
  const [budget, setBudget] = useState("Flexible / Best Partner Rate");
  const [preferredChannel, setPreferredChannel] = useState("Email Written Quote");
  const [userNotes, setUserNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const visibleError = clientError || state.error;

  // Build composite message containing enriched traveler selections
  const compositeMessage = [
    userNotes.trim() ? `Traveler Notes: ${userNotes.trim()}` : "",
    party ? `Travel Party: ${party}` : "",
    budget ? `Estimated Budget: ${budget}` : "",
    preferredChannel ? `Preferred Response Channel: ${preferredChannel}` : "",
    selectedTags.length > 0 ? `Preferred Villa & Island Styles: ${selectedTags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (state.success) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 dark:from-emerald-950/40 dark:via-[#071318] dark:to-emerald-950/20 p-8 sm:p-12 shadow-3 animate-in fade-in duration-500">
        <div className="mx-auto max-w-xl text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 ring-4 ring-emerald-500/20">
            <CheckCircle2 size={32} />
          </div>
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Enquiry Dispatched Successfully
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-emerald-950 dark:text-emerald-200">
            Your Island Journey Begins
          </h2>
          <p className="text-base text-ink/80 dark:text-slate-300 leading-relaxed font-light">
            Thank you, <strong className="font-semibold text-ocean dark:text-cyan-300">{name || "Traveler"}</strong>. Your enquiry has been routed directly to our Maldivian travel directors.
          </p>

          {state.reference ? (
            <div className="my-6 inline-flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-white/80 dark:bg-white/5 px-6 py-4 shadow-sm backdrop-blur">
              <span className="text-xs uppercase tracking-wider text-muted font-medium">Enquiry Reference Code</span>
              <span className="mt-1 font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tracking-wider">
                {state.reference}
              </span>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border-subtle/80 bg-white/60 dark:bg-white/5 p-4 text-xs text-muted dark:text-slate-400 space-y-1.5">
            <p className="flex items-center justify-center gap-1.5 font-medium text-ocean dark:text-cyan-300">
              <Clock size={14} /> Guaranteed Response Within 2 Business Hours
            </p>
            <p>
              An itemized written quotation with seaplane logistics will be delivered to <span className="font-semibold">{email}</span>.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Button asChild variant="conversion" className="rounded-full px-6 py-3 font-semibold shadow-md">
              <Link href="/resorts">Explore Curated Resorts &rarr;</Link>
            </Button>
            <Button asChild variant="secondary" className="rounded-full px-6 py-3">
              <Link href="/map">View 3D Archipelago Map</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border-subtle bg-white dark:bg-[#071318] dark:border-white/10 p-6 sm:p-10 lg:p-12 shadow-2">
      {/* Decorative Ocean Atmosphere Glow */}
      <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-lagoon/10 dark:bg-cyan-400/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-1/3 size-80 rounded-full bg-coral/10 dark:bg-coral/5 blur-3xl" />

      {/* Header Badge & Title */}
      <div className="relative mb-8 sm:mb-10 max-w-3xl space-y-2.5">
        <div className="inline-flex items-center gap-2 rounded-full bg-mist/80 dark:bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-lagoon-ink dark:text-cyan-300 shadow-sm border border-border-subtle/60">
          <MessageSquare size={14} aria-hidden="true" />
          <span>Bespoke Island Travel Concierge</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-ocean dark:text-cyan-200 font-medium tracking-tight">
          Craft Your Tailored Maldives Journey
        </h2>
        <p className="text-sm sm:text-base text-muted dark:text-slate-300 font-light leading-relaxed">
          Select your journey requirements below. Our resident specialists negotiate direct resort partner rates, coordinate scheduled seaplane transfers, and prepare a written quote.
        </p>
      </div>

      {visibleError ? (
        <div
          role="alert"
          className="mb-8 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/20 p-4 text-sm text-rose-800 dark:text-rose-300 animate-in fade-in"
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span className="font-medium">{visibleError}</span>
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
          if (!name.trim()) {
            event.preventDefault();
            setClientError("Please enter your full name.");
            return;
          }
          if (!email.trim() || !email.includes("@")) {
            event.preventDefault();
            setClientError("Please provide a valid email address for your quote.");
            return;
          }
          if (!userNotes.trim()) {
            event.preventDefault();
            setClientError("Please share a brief note about your travel plans or preferred stay.");
            return;
          }
          setClientError(null);
        }}
        className="relative grid gap-8"
      >
        <input type="hidden" name="noticeVersion" value={noticeVersion} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="topic" value={topic} />
        <input type="hidden" name="dates" value={dates} />
        <input type="hidden" name="message" value={compositeMessage} />

        {/* Anti-spam honeypot */}
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {/* Step 1: Select Journey Topic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
              <span>1. Select Travel Focus</span>
              <span className="text-coral">*</span>
            </label>
            <span className="text-xs text-muted">Tap to choose</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((item) => {
              const Icon = item.icon;
              const isSelected = topic === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTopic(item.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                    isSelected
                      ? "border-lagoon bg-lagoon/5 dark:bg-cyan-500/10 dark:border-cyan-400 shadow-sm ring-2 ring-lagoon/20"
                      : "border-border-subtle bg-white dark:bg-white/5 hover:border-ocean/40 dark:hover:border-cyan-400/40 hover:bg-mist/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl transition-colors ${
                        isSelected
                          ? "bg-ocean text-white dark:bg-cyan-400 dark:text-[#071318]"
                          : "bg-mist dark:bg-white/10 text-ocean dark:text-cyan-300 group-hover:bg-ocean group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} aria-hidden="true" />
                    </div>
                    <div
                      className={`size-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? "border-lagoon bg-lagoon text-white dark:border-cyan-400 dark:bg-cyan-400 dark:text-[#071318]"
                          : "border-border-subtle bg-white dark:bg-white/10"
                      }`}
                    >
                      {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ocean dark:text-cyan-200 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Traveler Details */}
        <div className="space-y-4 border-t border-border-subtle/80 dark:border-white/10 pt-6">
          <label className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white flex items-center gap-1.5">
            <span>2. Lead Traveler Information</span>
            <span className="text-coral">*</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Full Name */}
            <div className="grid gap-1.5">
              <label
                htmlFor="contact-name"
                className="text-xs font-semibold text-ocean dark:text-slate-200"
              >
                Full Name <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Victoria Sterling"
                  className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 pl-10 pr-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                />
                <User size={16} className="absolute left-3.5 top-3.5 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Email Address */}
            <div className="grid gap-1.5">
              <label
                htmlFor="contact-email"
                className="text-xs font-semibold text-ocean dark:text-slate-200"
              >
                Email Address (for quote delivery) <span className="text-coral">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="traveler@example.com"
                  className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 pl-10 pr-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Phone / WhatsApp */}
            <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="contact-phone"
                className="text-xs font-semibold text-ocean dark:text-slate-200"
              >
                Phone / WhatsApp (Optional)
              </label>
              <div className="relative">
                <input
                  id="contact-phone"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 pl-10 pr-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                />
                <Phone size={16} className="absolute left-3.5 top-3.5 text-muted pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Dates & Party Details */}
        <div className="space-y-4 border-t border-border-subtle/80 dark:border-white/10 pt-6">
          <label className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white">
            3. Travel Party &amp; Preferred Timing
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Target Dates */}
            <div className="grid gap-1.5">
              <label htmlFor="contact-dates" className="text-xs font-semibold text-ocean dark:text-slate-200">
                Target Month / Dates
              </label>
              <div className="relative">
                <input
                  id="contact-dates"
                  type="text"
                  value={dates}
                  onChange={(event) => setDates(event.target.value)}
                  placeholder="e.g. November 2026 (7 to 10 nights)"
                  className="min-h-12 w-full rounded-xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 pl-10 pr-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20"
                />
                <Calendar size={16} className="absolute left-3.5 top-3.5 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Travel Party Quick Chips */}
            <div className="grid gap-1.5">
              <span className="text-xs font-semibold text-ocean dark:text-slate-200">
                Travel Party
              </span>
              <div className="flex flex-wrap gap-2">
                {PARTY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setParty(opt)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      party === opt
                        ? "bg-ocean text-white dark:bg-cyan-400 dark:text-[#071318] shadow-sm"
                        : "border border-border-subtle bg-white dark:bg-white/5 text-ink dark:text-slate-300 hover:bg-mist dark:hover:bg-white/10"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preferred Island Styles / Vibe Chips */}
          <div className="pt-2">
            <span className="block text-xs font-semibold text-ocean dark:text-slate-200 mb-2">
              Preferred Villa Style &amp; Curated Inclusions (Select all that apply)
            </span>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-lagoon-ink text-white dark:bg-cyan-400 dark:text-[#071318] shadow-sm"
                        : "border border-border-subtle bg-sand/60 dark:bg-white/5 text-muted dark:text-slate-300 hover:border-ocean hover:text-ocean dark:hover:border-cyan-400 dark:hover:text-cyan-300"
                    }`}
                  >
                    {isSelected ? <Check size={12} strokeWidth={2.5} /> : null}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Range Guidance */}
          <div className="pt-2">
            <span className="block text-xs font-semibold text-ocean dark:text-slate-200 mb-2">
              Estimated Nightly Range
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BUDGET_TIERS.map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setBudget(tier)}
                  className={`rounded-xl p-2.5 text-center text-xs font-semibold transition-all ${
                    budget === tier
                      ? "border border-lagoon bg-lagoon/10 text-ocean dark:border-cyan-400 dark:bg-cyan-400/10 dark:text-cyan-200 ring-1 ring-lagoon/30"
                      : "border border-border-subtle bg-white dark:bg-white/5 text-muted dark:text-slate-300 hover:bg-mist dark:hover:bg-white/10"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Notes & Message */}
        <div className="space-y-3 border-t border-border-subtle/80 dark:border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <label
              htmlFor="contact-user-notes"
              className="text-xs font-bold uppercase tracking-wider text-ink dark:text-white"
            >
              4. Travel Requirements &amp; Notes <span className="text-coral">*</span>
            </label>
            <span className="text-xs text-muted">Overwater slides, dietary notes, anniversaries...</span>
          </div>
          <textarea
            id="contact-user-notes"
            required
            rows={4}
            value={userNotes}
            onChange={(event) => setUserNotes(event.target.value)}
            placeholder="Tell us what matters most for your stay — specific resorts you have in mind (e.g. Soneva Jani, Waldorf Astoria), dining preferences, dietary requirements, or transfer questions..."
            className="w-full rounded-2xl border border-border-subtle dark:border-white/15 bg-white dark:bg-white/5 p-4 text-base text-ink dark:text-white placeholder:text-muted focus:border-lagoon focus:outline-none focus:ring-2 focus:ring-lagoon/20 leading-relaxed"
          />
        </div>

        {/* Preferred Follow-up Channel */}
        <div className="rounded-2xl border border-border-subtle/80 bg-mist/40 dark:bg-white/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ocean dark:text-cyan-300 block">
              Preferred Consultation Format
            </span>
            <p className="text-xs text-muted dark:text-slate-300 mt-0.5">
              Choose how you would like our Maldivian travel directors to deliver your quote.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Email Written Quote", "WhatsApp Direct Advisory", "Phone Consultation"].map((channel) => (
              <button
                key={channel}
                type="button"
                onClick={() => setPreferredChannel(channel)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  preferredChannel === channel
                    ? "bg-ocean text-white dark:bg-cyan-400 dark:text-[#071318] shadow-sm"
                    : "border border-border-subtle bg-white dark:bg-white/10 text-muted dark:text-slate-300 hover:bg-mist"
                }`}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>

        {/* GDPR Consent Checkbox (Enforced 24px) */}
        <div className="rounded-2xl border border-border-subtle dark:border-white/10 p-4 sm:p-5 bg-sand/30 dark:bg-white/5">
          <label className="flex cursor-pointer items-start gap-3.5 select-none">
            <input
              type="checkbox"
              name="consent"
              value="yes"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (event.target.checked) setClientError(null);
              }}
              className="mt-0.5 size-6 min-w-6 shrink-0 rounded-lg border-2 border-border-subtle text-lagoon focus:ring-2 focus:ring-lagoon/30 cursor-pointer"
            />
            <span className="text-xs leading-relaxed text-ink/80 dark:text-slate-300">
              I agree to the processing of my contact details for the purpose of receiving custom resort quotations, transfer logistics, and travel guidance in accordance with the{" "}
              <Link href="/privacy" className="text-lagoon-ink dark:text-cyan-400 underline font-semibold hover:text-ocean">
                Privacy Policy
              </Link>
              . You may opt out at any time with zero hassle.
            </span>
          </label>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Direct resort partner rates · 100% verified sea transfers</span>
            </div>
            {whatsappNumber ? (
              <div className="text-xs text-muted">
                Need immediate response?{" "}
                <a
                  href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}${
                    whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ""
                  }`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline"
                >
                  <WhatsAppIcon className="size-3.5 inline" /> Chat on WhatsApp
                </a>
              </div>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="conversion"
            disabled={pending}
            className="min-h-12 w-full sm:w-auto rounded-full px-8 py-4 text-base font-semibold shadow-2 group transition-all hover:scale-105 active:scale-95"
          >
            {pending ? (
              <span className="flex items-center gap-2">
                <Clock className="animate-spin" size={18} />
                Routing your enquiry...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send size={18} className="transition-transform group-hover:translate-x-0.5" />
                Submit Bespoke Travel Enquiry
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
