/**
 * Site-wide constants that aren't part of the database — contact channels,
 * external forms, etc. Kept in one place so they're easy to update later.
 */

/** WhatsApp business number, digits only (country code + number, no + or spaces). */
export const WHATSAPP_NUMBER = "917982433408";
export const WHATSAPP_DISPLAY_NUMBER = "+91 79824 33408";

export const ARTIST_REGISTRATION_FORM_URL = "https://forms.gle/aMbo6X6TvyokvHoW6";
export const ART_SUBMISSION_FORM_URL = "https://forms.gle/9He5xGGhPAipDH5F6";

/** Build a wa.me deep link that opens a chat with a pre-filled message. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function buildEnquiryMessage(artworkTitle: string, artworkId: string): string {
  return `Hi Aartverse, I'm interested in "${artworkTitle}" (Artwork ID: ${artworkId}). Could you share more details?`;
}

export function buildHomeVisitMessage(artworkTitle: string, artworkId: string): string {
  return `Hi Aartverse, I'd like to check availability for a home visit to view "${artworkTitle}" (Artwork ID: ${artworkId}) before purchasing.`;
}

export const GENERAL_WHATSAPP_MESSAGE =
  "Hi Aartverse, I have a question about an artwork on your site.";

/** Home-visit service pricing — see app/about/page.tsx for the full
 *  explanation shown to customers. Kept here so every place that mentions
 *  the fee (the about page, the artwork-page CTA) stays in sync. */
export const HOME_VISIT_FEE_INR = 1000;
export const HOME_VISIT_MAX_ARTWORKS_PER_ARTIST = 3;
