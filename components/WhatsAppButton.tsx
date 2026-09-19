import { GENERAL_WHATSAPP_MESSAGE, buildWhatsAppLink } from "@/lib/constants";
import WhatsAppIcon from "@/components/WhatsAppIcon";

/** Site-wide floating contact button — the standard bottom-right WhatsApp
 *  affordance seen across most retail/marketplace sites. Plain anchor tag,
 *  no client JS required. */
export default function WhatsAppButton() {
  return (
    <a
      href={buildWhatsAppLink(GENERAL_WHATSAPP_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Aartverse on WhatsApp"
      // Smaller and tucked in tighter on phones: at the full 56px/24px-inset
      // desktop size this circle sat directly on top of the primary "Save
      // profile" / "Submit artwork" buttons (both sticky, full-width on
      // mobile -- see components/artist/ProfileForm.tsx and ArtworkForm.tsx)
      // and could overlap the home hero's CTA row too, on shorter phones.
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
    >
      <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
    </a>
  );
}
