import Link from "next/link";
import {
  HOME_VISIT_FEE_INR,
  WHATSAPP_DISPLAY_NUMBER,
  buildEnquiryMessage,
  buildHomeVisitMessage,
  buildWhatsAppLink,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import WhatsAppIcon from "@/components/WhatsAppIcon";

/** Purchase enquiry + home-visit CTA shown on every artwork detail page. */
export default function PurchaseEnquiry({
  artworkTitle,
  artworkId,
}: {
  artworkTitle: string;
  artworkId: string;
}) {
  const enquiryLink = buildWhatsAppLink(buildEnquiryMessage(artworkTitle, artworkId));
  const homeVisitLink = buildWhatsAppLink(buildHomeVisitMessage(artworkTitle, artworkId));

  return (
    <div className="mt-8 border border-line p-6">
      <p className="eyebrow mb-3">Interested in this piece?</p>
      <a
        href={enquiryLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#25D366] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        <WhatsAppIcon className="h-4 w-4" />
        Chat on WhatsApp
      </a>
      <p className="mt-3 text-xs text-muted">
        Or reach us directly at {WHATSAPP_DISPLAY_NUMBER}
      </p>

      <div className="mt-6 flex items-start gap-3 border-t border-line pt-6">
        <span className="text-xl leading-none" aria-hidden>
          🏠
        </span>
        <div>
          <p className="text-sm font-medium text-ink">Home visit available</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Select artworks can be viewed at your home before you decide — a
            flat {formatPrice(HOME_VISIT_FEE_INR)} covers up to 3 pieces from
            this artist, fully adjusted against the purchase if you go
            ahead. See{" "}
            <Link href="/about#home-visits" className="link-underline">
              how it works
            </Link>
            .
          </p>
          <a
            href={homeVisitLink}
            target="_blank"
            rel="noopener noreferrer"
            className="eyebrow link-underline mt-2 inline-block"
          >
            Ask about a home visit for this piece
          </a>
        </div>
      </div>
    </div>
  );
}
