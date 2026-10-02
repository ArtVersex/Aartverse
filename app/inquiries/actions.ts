"use server";

import { createInquiry } from "@/lib/queries/inquiries";
import { getArtworkById } from "@/lib/queries/artworks";
import { getArtistById } from "@/lib/queries/artists";
import { sendNewInquiryAdminEmail } from "@/lib/email/templates";
import type { InquiryType } from "@/lib/types";

export interface InquiryFormState {
  error?: string;
  success?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The one shared entry point for every <InquiryForm> on the site -- a
 * per-artwork enquiry (alongside the existing WhatsApp CTA, see
 * components/PurchaseEnquiry.tsx), the general "Ask us a question" floating
 * button (components/GeneralInquiryButton.tsx), and the Customized Product
 * page (app/custom-order/page.tsx). No login required -- these are public,
 * anonymous visitor forms, same trust level as the existing WhatsApp
 * enquiry links they sit beside. Saves to the `inquiries` table first (see
 * lib/queries/inquiries.ts), THEN best-effort emails every admin -- so a
 * flaky SMTP send never loses the actual enquiry, which stays visible on
 * app/admin/inquiries either way.
 */
export async function submitInquiryAction(
  _prevState: InquiryFormState,
  formData: FormData
): Promise<InquiryFormState> {
  const typeRaw = str(formData.get("type"));
  if (typeRaw !== "artwork" && typeRaw !== "general" && typeRaw !== "custom") {
    return { error: "Something went wrong -- please reload the page and try again." };
  }
  const type = typeRaw as InquiryType;

  const name = str(formData.get("name"));
  const email = str(formData.get("email")).toLowerCase();
  const phone = str(formData.get("phone")) || null;
  const message = str(formData.get("message"));
  const artworkId = str(formData.get("artworkId")) || null;
  const categoryId = str(formData.get("categoryId")) || null;

  if (name.length < 2) {
    return { error: "Please enter your name." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (message.length < 5) {
    return { error: "Please add a few words about what you're looking for." };
  }

  // For context in the admin notification email only -- never trusted for
  // anything else, and a lookup failure (bad id, deleted artist, etc.) just
  // means the email omits that detail rather than failing the whole submit.
  // For an artwork enquiry specifically, the admin team needs to be able to
  // act on it fast: which piece, a link straight to it, and how to reach
  // the artist who made it (their public artist_name/artist_id already come
  // back on the artwork row itself; phone/whatsapp live on the separate
  // `artists` row, so that's a second lookup).
  let artworkTitle: string | null = null;
  let artistName: string | null = null;
  let artistPhone: string | null = null;
  let artistWhatsapp: string | null = null;
  if (type === "artwork" && artworkId) {
    try {
      const artwork = await getArtworkById(artworkId);
      artworkTitle = artwork?.title ?? null;
      artistName = artwork?.artist_name ?? null;
      if (artwork?.artist_id) {
        const artist = await getArtistById(artwork.artist_id);
        artistPhone = artist?.phone ?? null;
        artistWhatsapp = artist?.whatsapp ?? null;
      }
    } catch (err) {
      console.error("[inquiry] failed to load artwork/artist context for email:", (err as Error).message);
    }
  }

  await createInquiry({ type, name, email, phone, message, artworkId, categoryId });

  try {
    await sendNewInquiryAdminEmail({
      type,
      name,
      email,
      phone,
      message,
      artworkId,
      artworkTitle,
      artistName,
      artistPhone,
      artistWhatsapp,
    });
  } catch (err) {
    console.error("[inquiry] admin notification email failed:", (err as Error).message);
  }

  return { success: true };
}
