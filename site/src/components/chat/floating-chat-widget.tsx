"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, X, ChevronRight, Sparkles } from "lucide-react";
import { WhatsAppIcon, MessengerIcon, TelegramIcon } from "./social-icons";
import {
  ContactSettings,
  formatWhatsAppUrl,
  formatMessengerUrl,
  formatTelegramUrl,
} from "@/modules/contact/types";

export function FloatingChatWidget({ settings }: { settings: ContactSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const hasAnyChannel =
    settings.whatsappEnabled || settings.messengerEnabled || settings.telegramEnabled;

  if (!hasAnyChannel) {
    return null;
  }

  const whatsappUrl = formatWhatsAppUrl(settings.whatsappNumber, settings.whatsappMessage);
  const messengerUrl = formatMessengerUrl(settings.messengerUsername);
  const telegramUrl = formatTelegramUrl(settings.telegramUsername);

  return (
    <div ref={widgetRef} className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* Expanded Chat Drawer / Card */}
      {isOpen ? (
        <div
          role="dialog"
          aria-label="Island Concierge Direct Chat"
          className="mb-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-subtle/80 bg-white dark:bg-[#071318] dark:border-white/15 shadow-3 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#083b4c] to-[#0a4a5c] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                  Concierge Desk Online
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close concierge chat"
                className="rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <h3 className="mt-1 font-display text-lg font-medium text-white">
              Instant Maldives Concierge
            </h3>
            <p className="mt-0.5 text-xs text-slate-200">
              Direct answers on villa rates, seaplane transfers &amp; availability.
            </p>
          </div>

          {/* Channel Actions */}
          <div className="p-3 grid gap-2">
            {/* WhatsApp */}
            {settings.whatsappEnabled ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                    <WhatsAppIcon className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                      WhatsApp
                    </div>
                    <div className="text-[11px] text-muted">
                      {settings.whatsappNumber || "Instant specialist reply"}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : null}

            {/* Messenger */}
            {settings.messengerEnabled ? (
              <a
                href={messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/20 p-3 hover:bg-blue-100/60 dark:hover:bg-blue-950/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#0084ff] text-white shadow-sm">
                    <MessengerIcon className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-950 dark:text-blue-300">
                      Messenger
                    </div>
                    <div className="text-[11px] text-muted">
                      @{settings.messengerUsername || "maldivesexplorer"}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : null}

            {/* Telegram */}
            {settings.telegramEnabled ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-50/60 dark:bg-sky-950/20 p-3 hover:bg-sky-100/60 dark:hover:bg-sky-950/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#229ed9] text-white shadow-sm">
                    <TelegramIcon className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-sky-950 dark:text-sky-300">
                      Telegram
                    </div>
                    <div className="text-[11px] text-muted">
                      @{settings.telegramUsername || "maldivesexplorer"}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted group-hover:translate-x-0.5 transition-transform" />
              </a>
            ) : null}
          </div>

          {/* Footer Action */}
          <div className="border-t border-border-subtle/80 bg-sand/60 dark:bg-white/5 p-2.5 text-center">
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon-ink dark:text-cyan-400 hover:underline"
            >
              <Sparkles size={13} />
              Full Contact &amp; Written Enquiries &rarr;
            </Link>
          </div>
        </div>
      ) : null}

      {/* Floating Speed-Dial Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close messaging options" : "Chat with island concierge"}
        className="group relative flex size-13 items-center justify-center rounded-full bg-gradient-to-tr from-[#083b4c] via-[#006c7c] to-[#009fb7] text-white shadow-3 hover:scale-105 active:scale-95 transition-all duration-200 ring-2 ring-white/30 dark:ring-white/10"
      >
        {/* Pulsing online status ring */}
        <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex size-3.5 rounded-full border-2 border-white dark:border-[#071318] bg-emerald-500"></span>
        </span>

        {isOpen ? (
          <X size={24} className="transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <MessageSquare size={24} className="transition-transform group-hover:scale-110 duration-200" />
        )}
      </button>
    </div>
  );
}
