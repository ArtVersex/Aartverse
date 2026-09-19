"use server";

import { forgotPasswordSchema } from "@/lib/validation/auth";
import { getUserByEmail } from "@/lib/queries/users";
import { createPasswordResetToken } from "@/lib/queries/tokens";
import { sendPasswordResetEmail } from "@/lib/email/templates";

export interface ForgotPasswordState {
  submitted?: boolean;
  error?: string;
}

/**
 * Always resolves to the same "submitted" outcome whether or not the
 * email belongs to an account — this is the standard mitigation against
 * account enumeration via a password-reset form.
 */
export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const user = await getUserByEmail(parsed.data.email);
  if (user && user.password_hash) {
    try {
      const rawToken = await createPasswordResetToken(user.id);
      await sendPasswordResetEmail(user, rawToken);
    } catch (err) {
      console.error("[forgot-password] send failed:", (err as Error).message);
    }
  }
  // Google-only accounts (no password_hash) silently get no email either —
  // same outward result, so this doesn't leak which kind of account it is.

  return { submitted: true };
}
