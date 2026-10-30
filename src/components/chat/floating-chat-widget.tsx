"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, X, ChevronRight, Mail } from "lucide-react";
import { WhatsAppIcon, MessengerIcon, TelegramIcon } from "./social-icons";
import { trapFocusKeydown } from "@/lib/a11y/focus-trap";
import {
  activeContactChannels,
  ContactSettings,
  formatWhatsAppUrl,
  formatMessengerUrl,
  formatTelegramUrl,
} from "@/modules/contact/types";

export function FloatingChatWidget({ settings }: { settings: ContactSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Close on Escape or click outside; restore focus to the toggle when closing via Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (panelRef.current) trapFocusKeydown(e, panelRef.current);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const active = activeContactChannels(settings);
  if (!active.hasMessaging) {
    return null;
  }

  const whatsappUrl = formatWhatsAppUrl(settings.whatsappNumber, settings.whatsappMessage);
  const messengerUrl = formatMessengerUrl(settings.messengerUsername);
  const telegramUrl = formatTelegramUrl(settings.telegramUsername);

  return (
    <div
      ref={widgetRef}
      className="fixed z-40 select-none bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 sm:right-6 lg:bottom-[calc(1.5rem+var(--me-compare-tray-h,0px))]"
    >
      {/* Expanded Chat Drawer / Card — non-modal popover (page remains usable). */}
      {isOpen ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          className="mb-3 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-subtle/80 bg-white dark:bg-[#071318] dark:border-white/15 shadow-3 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        >
          {/* Card Header */}
          <div className="bg-gradient-to-r from-[#083b4c] to-[#0a4a5c] p-4 text-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-200">
                Direct Messaging
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close concierge chat"
                className="inline-flex size-11 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p id={titleId} className="mt-1 font-display text-lg font-medium text-white">
              Maldives Explorer Team
            </p>
            <p className="mt-0.5 text-xs text-slate-200">
              Questions on resorts, transfers, and custom quotations.
            </p>
          </div>

          {/* Channel Actions */}
          <div className="p-3 grid gap-2">
            {/* WhatsApp */}
            {active.whatsapp ? (
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
                    <div className="text-[11px] text-muted">{settings.whatsappNumber}</div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted group-hover:translate-x-0.5 transition-transform"
                />
              </a>
            ) : null}

            {/* Messenger */}
            {active.messenger ? (
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
                      @{settings.messengerUsername.replace(/^@/, "")}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted group-hover:translate-x-0.5 transition-transform"
                />
              </a>
            ) : null}

            {/* Telegram */}
            {active.telegram ? (
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
                    <div className="text-xs font-bold text-sky-950 dark:text-sky-300">Telegram</div>
                    <div className="text-[11px] text-muted">
                      @{settings.telegramUsername.replace(/^@/, "")}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted group-hover:translate-x-0.5 transition-transform"
                />
              </a>
            ) : null}

            {/* Divider + Custom Quote Form Link */}
            <div className="mt-1 border-t border-border-subtle/80 dark:border-white/10 pt-2">
              <Link
                href="/contact"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-xl bg-mist/70 dark:bg-white/5 px-3 py-2.5 text-xs font-semibold text-ocean dark:text-cyan-300 hover:bg-mist dark:hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Mail size={14} className="text-coral" />
                  Send a Travel Enquiry
                </span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Toggle Button */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Chat with island concierge"
        className="group relative flex min-h-12 sm:min-h-13 items-center gap-2.5 rounded-full bg-gradient-to-r from-[#083b4c] to-[#0d5970] px-4 sm:px-5 text-white shadow-3 ring-2 ring-white/20 hover:scale-105 active:scale-95 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <MessageSquare size={19} className="text-cyan-200" />
        <span className="hidden sm:inline text-xs font-semibold tracking-wide">Concierge Chat</span>
      </button>
    </div>
  );
}
