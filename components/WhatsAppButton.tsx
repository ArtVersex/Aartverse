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
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
