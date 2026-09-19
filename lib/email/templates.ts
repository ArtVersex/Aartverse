import "server-only";
import { sendMail } from "@/lib/email/mailer";
import type { UserRow } from "@/lib/types";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
