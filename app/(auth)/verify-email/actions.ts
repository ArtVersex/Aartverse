"use server";

import { requireArtist } from "@/lib/auth/session";
import { createVerificationToken } from "@/lib/queries/tokens";
import { sendVerificationEmail } from "@/lib/email/templates";

export interface ResendVerificationState {
  sent?: boolean;
  error?: string;
}

/**
 * Used from the artist dashboard for a signed-in artist who hasn't
 * verified their email yet. Requires a session — never accepts an email
 * address as input — so it can't be used to spam arbitrary addresses.
 * Signature matches React's useActionState (prevState, formData) even
 * though neither is used, so it can be wired straight to a <form action>.
 */
export async function resendVerificationAction(
  _prevState: ResendVerificationState,
  _formData: FormData
): Promise<ResendVerificationState> {
  const user = await requireArtist();
  if (user.email_verified_at) {
    return { sent: true };
  }
  let rawToken: string;
  try {
    rawToken = await createVerificationToken(user.id);
  } catch (err) {
    console.error(
      `[resend-verification] createVerificationToken() failed for user ${user.id} (${user.email}):`,
      err instanceof Error ? err.stack ?? err.message : err
    );
    return { error: "Could not send the verification email right now. Please try again shortly." };
  }

  try {
    await sendVerificationEmail(user, rawToken);
    return { sent: true };
  } catch (err) {
    console.error(
      `[resend-verification] sendVerificationEmail() failed for user ${user.id} (${user.email}) -- the token WAS created:`,
      err instanceof Error ? err.stack ?? err.message : err
    );
    return { error: "Could not send the verification email right now. Please try again shortly." };
  }
}
