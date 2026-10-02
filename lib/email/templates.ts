import "server-only";
import { sendMail } from "@/lib/email/mailer";
import { listAdminEmails } from "@/lib/queries/users";
import { buildPersonalWhatsAppLink, buildTelLink } from "@/lib/constants";
import type { InquiryType, UserRow } from "@/lib/types";

function appUrl(): string {
  return process.env.APP_URL || process.env.AUTH_URL || "http://localhost:3000";
}

/** Shared branded wrapper so every transactional email looks like it came
 *  from AartVerse, echoing the site's canvas/ink/accent palette. */
function layout(bodyHtml: string): string {
  return `
  <div style="background:#faf8f5;padding:32px 16px;font-family:Georgia,'Playfair Display',serif;color:#171412;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e1da;padding:32px;">
      <p style="font-size:22px;letter-spacing:0.02em;margin:0 0 24px 0;">AartVerse</p>
      ${bodyHtml}
      <p style="margin-top:32px;padding-top:16px;border-top:1px solid #e6e1da;font-family:Arial,sans-serif;font-size:12px;color:#726b62;">
        AartVerse · Contemporary Art Marketplace
      </p>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;background:#171412;color:#faf8f5;padding:12px 24px;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;">${label}</a>
  </p>
  <p style="font-family:Arial,sans-serif;font-size:12px;color:#726b62;word-break:break-all;">${href}</p>`;
}

export async function sendVerificationEmail(
  user: Pick<UserRow, "email" | "name">,
  rawToken: string
): Promise<void> {
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Hi ${escapeHtml(user.name)},</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">
      Welcome to AartVerse. Please confirm this is your email address to finish setting up your artist account.
    </p>
    ${button(link, "Verify email address")}
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#726b62;">
      This link expires in 24 hours. You can already use your artist dashboard while this is pending.
    </p>
  `);
  await sendMail({
    to: user.email,
    subject: "Verify your email - AartVerse",
    html,
    text: `Hi ${user.name}, verify your AartVerse email address: ${link} (expires in 24 hours)`,
  });
}

export async function sendPasswordResetEmail(
  user: Pick<UserRow, "email" | "name">,
  rawToken: string
): Promise<void> {
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Hi ${escapeHtml(user.name)},</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">
      We received a request to reset your AartVerse password. If you didn't request this, you can safely ignore this email.
    </p>
    ${button(link, "Reset password")}
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#726b62;">
      This link expires in 1 hour and can only be used once.
    </p>
  `);
  await sendMail({
    to: user.email,
    subject: "Reset your password - AartVerse",
    html,
    text: `Reset your AartVerse password: ${link} (expires in 1 hour, single use)`,
  });
}

export async function sendArtistApprovedEmail(
  user: Pick<UserRow, "email" | "name">
): Promise<void> {
  const link = `${appUrl()}/artist/dashboard`;
  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Hi ${escapeHtml(user.name)},</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">
      Good news! Your AartVerse artist account has been approved. You can now submit artworks, and each one goes live on Aartverse.com as soon as you publish it.
    </p>
    ${button(link, "Go to your dashboard")}
  `);
  await sendMail({
    to: user.email,
    subject: "You're approved - welcome to AartVerse",
    html,
    text: `Hi ${user.name}, your AartVerse artist account has been approved: ${link}`,
  });
}

export async function sendArtistSuspendedEmail(
  user: Pick<UserRow, "email" | "name">
): Promise<void> {
  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">Hi ${escapeHtml(user.name)},</p>
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">
      Your AartVerse artist account has been temporarily suspended. Your profile and existing artworks are preserved,
      but new submissions and edits are paused. If you believe this is a mistake, please reply to this email.
    </p>
  `);
  await sendMail({
    to: user.email,
    subject: "Your AartVerse account status has changed",
    html,
    text: `Hi ${user.name}, your AartVerse artist account has been suspended. Your data is preserved. Contact us if you believe this is a mistake.`,
  });
}

export interface NewInquiryEmailInput {
  type: InquiryType;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  // --- only set for type 'artwork' (see
  // app/inquiries/actions.ts#submitInquiryAction) ---
  artworkId?: string | null;
  artworkTitle?: string | null;
  /** The artwork's artist's public display name. */
  artistName?: string | null;
  /** Raw 10-digit number from `artists.phone` -- see
   *  lib/validation/auth.ts's INDIAN_MOBILE_REGEX for the format. */
  artistPhone?: string | null;
  artistWhatsapp?: string | null;
}

const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  artwork: "Artwork enquiry",
  general: "General enquiry",
  custom: "Customized product enquiry",
};

/**
 * Notifies every current admin (lib/queries/users.ts#listAdminEmails) the
 * moment a visitor submits any of the three inquiry types -- see
 * app/inquiries/actions.ts#submitInquiryAction, the one place this is
 * called from. Sent once per admin rather than one email with everyone
 * CC'd, so a reply from one admin doesn't drag the rest of the team into
 * the thread. Best-effort: the inquiry itself is already saved to the
 * database before this runs (see submitInquiryAction), so a failed email
 * here never loses the enquiry -- it's still visible on
 * app/admin/inquiries.
 */
export async function sendNewInquiryAdminEmail(input: NewInquiryEmailInput): Promise<void> {
  const admins = await listAdminEmails();
  if (admins.length === 0) return;

  const label = INQUIRY_TYPE_LABEL[input.type];
  const artworkLink = input.artworkId ? `${appUrl()}/artworks/${input.artworkId}` : null;
  // WhatsApp falls back to phone when the artist never set a separate
  // WhatsApp number -- same convention as app/admin/artists/page.tsx's own
  // call/WhatsApp links.
  const artistWhatsappNumber = input.artistWhatsapp ?? input.artistPhone ?? null;

  const subject =
    input.type === "artwork" && input.artworkTitle
      ? `New artwork enquiry -- "${input.artworkTitle}"`
      : `New ${label.toLowerCase()} on AartVerse`;

  // For an artwork enquiry, the admin team needs to act fast: which piece,
  // a link straight to it, and how to reach the artist who made it --
  // without that, every artwork enquiry meant someone had to manually go
  // look the artist up before they could even forward the question along.
  const artworkContextHtml =
    input.type === "artwork"
      ? `
    <div style="margin:0 0 20px 0;padding:14px 16px;background:#faf8f5;border:1px solid #e6e1da;font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#171412;">
      ${
        input.artworkTitle
          ? `<p style="margin:0;"><strong>Artwork:</strong> ${escapeHtml(input.artworkTitle)}${
              artworkLink
                ? ` &mdash; <a href="${artworkLink}" style="color:#171412;">view listing</a>`
                : ""
            }</p>`
          : ""
      }
      ${input.artistName ? `<p style="margin:4px 0 0 0;"><strong>Artist:</strong> ${escapeHtml(input.artistName)}</p>` : ""}
      ${
        input.artistPhone || artistWhatsappNumber
          ? `<p style="margin:4px 0 0 0;"><strong>Reach the artist:</strong> ${[
              input.artistPhone
                ? `<a href="${buildTelLink(input.artistPhone)}" style="color:#171412;">Call</a>`
                : null,
              artistWhatsappNumber
                ? `<a href="${buildPersonalWhatsAppLink(artistWhatsappNumber)}" style="color:#171412;">WhatsApp</a>`
                : null,
            ]
              .filter(Boolean)
              .join(" &middot; ")}</p>`
          : ""
      }
    </div>`
      : "";

  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;">${label}</p>
    ${artworkContextHtml}
    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;">
      <strong>${escapeHtml(input.name)}</strong><br/>
      ${escapeHtml(input.email)}${input.phone ? ` &middot; ${escapeHtml(input.phone)}` : ""}
    </p>
    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
  `);

  const artworkContextText =
    input.type === "artwork"
      ? [
          input.artworkTitle ? `Artwork: ${input.artworkTitle}${artworkLink ? ` (${artworkLink})` : ""}` : null,
          input.artistName ? `Artist: ${input.artistName}` : null,
          input.artistPhone ? `Artist phone: ${input.artistPhone}` : null,
          artistWhatsappNumber ? `Artist WhatsApp: ${artistWhatsappNumber}` : null,
        ]
          .filter(Boolean)
          .join("\n") + "\n\n"
      : "";
  const text = `${label}\n\n${artworkContextText}${input.name} <${input.email}>${input.phone ? ` · ${input.phone}` : ""}\n\n${input.message}`;

  await Promise.all(
    admins.map((to) =>
      sendMail({ to, subject, html, text }).catch((err) => {
        console.error(`[inquiry-email] failed to notify ${to}:`, (err as Error).message);
      })
    )
  );
}

// Kept well under typical shared-hosting SMTP per-message recipient limits
// (Hostinger and similar providers commonly cap this around 50-100) -- a
// broadcast to more artists than this is split into several separate sends
// instead of one giant one, each still individually BCC'd so no chunk
// exposes anyone's address to another recipient in the same chunk.
const BROADCAST_BCC_CHUNK_SIZE = 40;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * The address artists see as "To" and "Reply-To" on a broadcast email --
 * deliberately a shared, generic admin inbox rather than whichever admin
 * happened to compose it, so no artist ever sees an admin's personal email
 * address. Configurable via ADMIN_CONTACT_EMAIL (comma-separated if more
 * than one address should appear -- nodemailer accepts a plain
 * comma-separated string for To/Reply-To, same as it does for Bcc as an
 * array), defaulting to admin@aartverse.com when that env var isn't set.
 * Kept separate from FROM_EMAIL (lib/email/mailer.ts's raw SMTP envelope
 * sender, dictated by what the Hostinger SMTP account is allowed to send
 * as) -- this one is purely what gets displayed to the recipient.
 *
 * Kept (rather than a Bcc-only send with no To/Reply-To at all) because an
 * email with no visible "To" recipient is a classic bulk-mail signature
 * that some spam filters weigh against deliverability -- this address is
 * what keeps a broadcast reading as a normal, legitimate email to the
 * recipient's inbox provider.
 */
function adminContactAddress(): string {
  return process.env.ADMIN_CONTACT_EMAIL?.trim() || "admin@aartverse.com";
}

export interface ArtistBroadcastEmailInput {
  subject: string;
  /** Plain text, as typed by the admin -- newlines are preserved in both
   *  the HTML (via white-space: pre-wrap) and plain-text versions. */
  message: string;
  /** Every recipient's address -- always sent via Bcc (never To/Cc), so
   *  recipients never see each other's email addresses. */
  recipients: string[];
}

/**
 * One-off broadcast email from an admin to any number of artists --
 * app/admin/broadcast/page.tsx's "Email Artists" screen. Free-form subject
 * and body (a submission reminder, a note about an authenticated listing,
 * an upcoming competition, or anything else an admin wants to say), never
 * templated beyond the shared branded wrapper every other email here uses.
 * Always Bcc, chunked (see BROADCAST_BCC_CHUNK_SIZE above) so a large
 * recipient list can't both expose addresses to each other or trip a
 * provider's per-message limit. "To" and "Reply-To" are always the shared
 * admin-contact address (see adminContactAddress() above), never the
 * composing admin's own email -- a reply from an artist lands in that
 * shared inbox rather than one admin's personal one.
 */
export async function sendArtistBroadcastEmail(input: ArtistBroadcastEmailInput): Promise<void> {
  const html = layout(`
    <p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</p>
  `);
  const text = input.message;
  const contact = adminContactAddress();

  const batches = chunk(input.recipients, BROADCAST_BCC_CHUNK_SIZE);
  for (const batch of batches) {
    await sendMail({
      to: contact,
      bcc: batch,
      replyTo: contact,
      subject: input.subject,
      html,
      text,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
