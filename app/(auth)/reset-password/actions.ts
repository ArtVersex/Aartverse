"use server";

import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumePasswordResetToken } from "@/lib/queries/tokens";
import { setUserPassword } from "@/lib/queries/users";
import { hashPassword } from "@/lib/auth/password";

export interface ResetPasswordState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return { error: "This link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await setUserPassword(userId, passwordHash);

  return { success: true };
}
