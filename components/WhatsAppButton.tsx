"use client";

import { GENERAL_WHATSAPP_MESSAGE, buildWhatsAppLink } from "@/lib/constants";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useDraggableFloatingButton } from "@/lib/hooks/useDraggableFloatingButton";

const STORAGE_KEY = "aartverse:whatsapp-button-position";

/**
 * Site-wide floating contact button -- the standard bottom-right WhatsApp
 * affordance, draggable so a viewer can move it out of the way of page
 * content or other fixed controls (e.g. the sticky "Save profile"/"Submit
 * artwork" buttons on the artist forms, or components/GeneralInquiryButton.tsx
 * sitting just above it). The drag/persist/clamp behavior itself now lives
 * in lib/hooks/useDraggableFloatingButton.ts, shared with
 * GeneralInquiryButton -- see that hook's doc comment for the full
 * reasoning (this component used to carry all of that logic directly).
 *
 * Still a genuine <a> the whole time: a plain tap/click (movement under the
 * hook's drag threshold) still navigates to WhatsApp exactly as before;
 * only an actual drag suppresses the navigation.
 *
 * `draggable={false}` matters here specifically: a link (or image) is
 * natively draggable in every major browser by default, and that native
 * HTML5 drag gesture competes with the hook's own pointer-event-based
 * dragging the moment the browser decides a mousedown+move is "starting a
 * drag" rather than a click -- without this, the pointer events this hook
 * relies on can stop firing mid-drag (this is exactly why the plain
 * <button> in GeneralInquiryButton.tsx could already be dragged
 * reliably while this <a> couldn't, before this was added).
 */
export default function WhatsAppButton() {
  const { ref, style, handlers } = useDraggableFloatingButton<HTMLAnchorElement>(STORAGE_KEY);

  return (
    <a
      ref={ref}
      href={buildWhatsAppLink(GENERAL_WHATSAPP_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      aria-label="Chat with Aartverse on WhatsApp. Press and drag to move this button."
      {...handlers}
      style={style}
      // Smaller and tucked in tighter on phones: at the full 56px/24px-inset
      // desktop size this circle sat directly on top of the primary "Save
      // profile" / "Submit artwork" buttons (both sticky, full-width on
      // mobile -- see components/artist/ProfileForm.tsx and ArtworkForm.tsx)
      // and could overlap the home hero's CTA row too, on shorter phones.
      // touch-none: without it, a touch-drag also scrolls the page
      // underneath the button instead of moving it.
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
    </a>
  );
}
