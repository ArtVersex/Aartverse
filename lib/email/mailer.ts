import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Hostinger SMTP transporter. Credentials come exclusively from
 * environment variables (never hard-code, never expose to the client).
 *
 * SMTP_SECURE=true + port 465 uses implicit TLS; SMTP_SECURE=false + port
 * 587 would use STARTTLS — nodemailer picks the right handshake from
 * `secure`, so keep SMTP_PORT and SMTP_SECURE consistent in .env.
 */
function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}" for outgoing email.`
    );
  }
  return value;
}

const globalForMail = globalThis as unknown as { aartverseMailer?: Transporter };

function createTransport(): Transporter {
  return nodemailer.createTransport({
    host: readRequiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT ?? "465"),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: {
      user: readRequiredEnv("SMTP_USER"),
      pass: readRequiredEnv("SMTP_PASSWORD"),
    },
  });
}

function getTransport(): Transporter {
  if (!globalForMail.aartverseMailer) {
    globalForMail.aartverseMailer = createTransport();
  }
  return globalForMail.aartverseMailer;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends one transactional email. Never logs credentials or full message
 * bodies containing secrets (tokens are only ever embedded as one-time
 * links, and this function itself never logs `html`/`text`).
 */
export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<void> {
  const from = readRequiredEnv("FROM_EMAIL");
  const transport = getTransport();
  try {
    await transport.sendMail({ from: `AartVerse <${from}>`, to, subject, html, text });
  } catch (err) {
    // Intentionally log only metadata, never the message body or SMTP auth.
    console.error(`[email] failed to send "${subject}" to recipient:`, (err as Error).message);
    throw new Error("Failed to send email. Please try again shortly.");
  }
}
