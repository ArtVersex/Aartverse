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

/**
 * Build a wa.me deep link to an arbitrary person's own WhatsApp number --
 * unlike buildWhatsAppLink() above, which always targets our fixed business
 * number, this is for admin-facing "contact this artist directly" links
 * (see app/admin/artists/page.tsx). `phone` is the raw 10-digit Indian
 * mobile number as stored in artists.phone/artists.whatsapp (see
 * INDIAN_MOBILE_REGEX in lib/validation/auth.ts) -- no "+91", no spaces.
 */
export function buildPersonalWhatsAppLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/91${digits}${query}`;
}

/** Build a tel: link for an artist's own number, same raw-digit convention
 *  as buildPersonalWhatsAppLink() above. */
export function buildTelLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+91${digits}`;
}

export function buildEnquiryMessage(artworkTitle: string, artworkId: string): string {
  return `Hi Aartverse, I'm interested in "${artworkTitle}" (Artwork ID: ${artworkId}). Could you share more details?`;
}

export function buildHomeVisitMessage(artworkTitle: string, artworkId: string): string {
  return `Hi Aartverse, I'd like to check availability for a home visit to view "${artworkTitle}" (Artwork ID: ${artworkId}) before purchasing.`;
}

export const GENERAL_WHATSAPP_MESSAGE =
  "Hi Aartverse, I have a question about an artwork on your site.";

/** Home-visit service pricing — charged per artwork the customer wants to
 *  see in person, not a flat per-artist/per-visit fee. See
 *  app/about/page.tsx for the full explanation shown to customers. Kept
 *  here so every place that mentions the fee (the about page, the
 *  artwork-page CTA) stays in sync. */
export const HOME_VISIT_FEE_INR = 1000;

/** Fixed options for the Customized Artwork page's "What would you like us
 *  to create?" dropdown (see app/custom-order/page.tsx). This is a
 *  subject/style taxonomy for a commission request, deliberately separate
 *  from the site's live artwork categories (lib/queries/categories.ts),
 *  which track existing inventory rather than what a customer might want
 *  made. Order matters -- shown in exactly this sequence, with "Other /
 *  Something Specific" last as the catch-all. */
export const CUSTOM_ORDER_TYPES = [
  "Portrait",
  "Pet Portrait",
  "Family / Couple Portrait",
  "Cartoon / Illustration",
  "Painting from a Photo",
  "Landscape / Nature",
  "Religious / Spiritual Art",
  "Traditional / Cultural Art",
  "Abstract Art",
  "Resin Art",
  "Home / Interior Artwork",
  "Custom Gift",
  "Other / Something Specific",
] as const;
