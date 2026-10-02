"use server";

import { requireAdmin } from "@/lib/auth/session";
import { listArtistUsers } from "@/lib/queries/users";
import { sendArtistBroadcastEmail } from "@/lib/email/templates";

export interface BroadcastEmailState {
  error?: string;
  success?: boolean;
  sentCount?: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a free-form, admin-composed email to any mix of registered artists
 * (checked off by their user id) and manually typed addresses (for someone
 * not registered yet) -- app/admin/broadcast/page.tsx's "Email Artists"
 * screen. Any admin can use this, not just the super admin -- reaching out
 * to artists is a normal admin capability, same reasoning as
 * lib/queries/users.ts#listAdminEmails's own comment on inquiries.
 *
 * Always Bcc (see lib/email/templates.ts#sendArtistBroadcastEmail) so
 * selecting several artists never exposes their addresses to each other.
 */
export async function sendBroadcastEmailAction(
  _prevState: BroadcastEmailState,
  formData: FormData
): Promise<BroadcastEmailState> {
  // requireAdmin() is only for the auth check here -- the acting admin's
  // own email is deliberately never used as the sender/reply-to (see
  // lib/email/templates.ts#sendArtistBroadcastEmail), so artists never see
  // an admin's personal address.
  await requireAdmin();

  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const selectedIds = formData.getAll("artistIds").map(String);
  const extraEmailsRaw = String(formData.get("extraEmails") ?? "");

  if (!subject) {
    return { error: "Please enter a subject." };
  }
  if (!message) {
    return { error: "Please write a message." };
  }

  const artists = await listArtistUsers();
  const selectedEmails = artists.filter((a) => selectedIds.includes(a.id)).map((a) => a.email);

  const extraEmails = extraEmailsRaw
    .split(/[\n,]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  const invalidExtra = extraEmails.filter((e) => !EMAIL_REGEX.test(e));
  if (invalidExtra.length > 0) {
    return { error: `These don't look like valid email addresses: ${invalidExtra.join(", ")}` };
  }

  const recipients = Array.from(new Set([...selectedEmails, ...extraEmails]));
  if (recipients.length === 0) {
    return { error: "Select at least one artist, or enter an email address." };
  }

  try {
    await sendArtistBroadcastEmail({
      subject,
      message,
      recipients,
    });
  } catch (err) {
    console.error("[broadcast] failed to send:", (err as Error).message);
    return { error: "Something went wrong sending the email. Please try again." };
  }

  return { success: true, sentCount: recipients.length };
}
