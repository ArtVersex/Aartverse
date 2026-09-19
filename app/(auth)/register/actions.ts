"use server";

import { redirect } from "next/navigation";
import { registerSchema } from "@/lib/validation/auth";
import { getUserByEmail, createUser } from "@/lib/queries/users";
import { createArtistProfileForUser } from "@/lib/queries/artistAccounts";
import { hashPassword } from "@/lib/auth/password";
import { createVerificationToken } from "@/lib/queries/tokens";
import { sendVerificationEmail } from "@/lib/email/templates";
import { signIn } from "@/auth";

export interface RegisterActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
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

  const { name, email, password } = parsed.data;

  // Checked up front for a fast, specific field error. The DB UNIQUE
  // constraint on users.email is still the real guard against a race
  // between two simultaneous registrations for the same address.
  const existing = await getUserByEmail(email);
  if (existing) {
    return {
      fieldErrors: {
        email: "An account with this email already exists. Try signing in instead.",
      },
    };
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await createUser({
      name,
      email,
      passwordHash,
      role: "artist",
      status: "pending",
    });
  } catch (err) {
    // Most likely the UNIQUE(email) race mentioned above.
    console.error("[register] createUser failed:", (err as Error).message);
    return {
      fieldErrors: {
        email: "An account with this email already exists. Try signing in instead.",
      },
    };
  }

  await createArtistProfileForUser(user.id, user.name);

  // Split into two try/catches (rather than one shared block) so a
  // failure log always says exactly which step broke -- the DB insert
  // (createVerificationToken) or the outbound email (sendVerificationEmail)
  // -- instead of one ambiguous "failed to send verification email"
  // message that could mean either. Both are still non-fatal: the artist
  // can use the dashboard immediately either way and resend later.
  let rawToken: string | null = null;
  try {
    rawToken = await createVerificationToken(user.id);
  } catch (err) {
    console.error(
      `[register] createVerificationToken() failed for user ${user.id} (${user.email}) -- no verification_tokens row was created:`,
      err instanceof Error ? err.stack ?? err.message : err
    );
  }

  if (rawToken) {
    try {
      await sendVerificationEmail(user, rawToken);
    } catch (err) {
      console.error(
        `[register] sendVerificationEmail() failed for user ${user.id} (${user.email}) -- the verification_tokens row WAS created, but no email went out:`,
        err instanceof Error ? err.stack ?? err.message : err
      );
    }
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    console.error("[register] auto sign-in failed:", (err as Error).message);
    redirect("/login?registered=1");
  }

  redirect("/artist/dashboard");
}
