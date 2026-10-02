"use client";

import { useEffect, useState } from "react";
import InquiryForm from "@/components/InquiryForm";
import { useDraggableFloatingButton } from "@/lib/hooks/useDraggableFloatingButton";

const STORAGE_KEY = "aartverse:inquiry-button-position";

/**
 * Floating "Ask us a question" button -- added ALONGSIDE (never replacing)
 * the WhatsApp button (components/WhatsAppButton.tsx), per the site
 * owner's choice. Icon-only, same circular size/shape as WhatsApp (not a
 * labeled pill -- that read as a second, different kind of control sitting
 * next to WhatsApp's icon; this way both buttons visually belong to the
 * same "floating contact options" family). Draggable the same way
 * WhatsApp is, via the shared lib/hooks/useDraggableFloatingButton.ts --
 * with two floating buttons stacked in the same corner, a visitor (or the
 * site owner) needs to be able to move either one out of the way, not just
 * WhatsApp.
 *
 * Opens a modal with the shared <InquiryForm type="general"> rather than
 * navigating anywhere -- this submits straight to the `inquiries` table
 * (see app/inquiries/actions.ts), unlike WhatsApp's external chat link, so
 * it's the one contact option that doesn't require leaving the site or
 * having WhatsApp installed.
 */
export default function GeneralInquiryButton() {
  const [open, setOpen] = useState(false);
  const { ref, style, handlers, consumeDragSuppressesClick } =
    useDraggableFloatingButton<HTMLButtonElement>(STORAGE_KEY);

  // Prevent the page behind the dialog from scrolling while it's open --
  // same treatment as HeaderMobileMenu's drawer.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Close on Escape, same as any modal dialog should.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => {
          // A real drag just ended -- don't also treat it as a tap that
          // should open the dialog (see the hook's own doc comment).
          if (consumeDragSuppressesClick()) return;
          setOpen(true);
        }}
        {...handlers}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Ask us a question. Press and drag to move this button."
        style={style}
        // Same size/shape language as WhatsAppButton -- stacked just above
        // its default corner so neither covers the other out of the box;
        // touch-none so a touch-drag moves the button instead of scrolling
        // the page underneath it.
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-accent text-canvas shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 sm:bottom-24 sm:right-6 sm:h-14 sm:w-14"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="h-6 w-6 sm:h-7 sm:w-7"
        >
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
        </svg>
      </button>

      {/* Always mounted so the fade/scale transitions both ways instead of
          popping in/out -- backdrop and panel share one wrapper so a click
          on the backdrop (not the panel) closes it. */}
      <div
        role="presentation"
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-end justify-center bg-ink/50 backdrop-blur-sm p-4 transition-opacity duration-300 sm:items-center ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <div
          role="dialog"
          aria-modal={open}
          aria-label="General enquiry"
          className={`w-full max-w-md border-t-4 border-accent bg-canvas p-6 shadow-elevated transition-all duration-300 sm:p-7 ${
            open ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-xl">Ask us a question</p>
              <p className="mt-1 text-xs text-muted">We typically reply within a few hours.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-2xl leading-none text-ink/50 transition-colors hover:text-ink"
            >
              ×
            </button>
          </div>
          <div className="mt-5">
            <InquiryForm type="general" onSuccess={() => setOpen(false)} />
          </div>
        </div>
      </div>
    </>
  );
}
