"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/app/(auth)/reset-password/actions";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Resetting…" : "Reset password"}
    </button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <p className="callout-banner">
        Your password has been reset.{" "}
        <Link href="/login" className="link-underline text-ink">
          Sign in
        </Link>{" "}
        with your new password.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="field-label" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.password && <p className="field-error">{state.fieldErrors.password}</p>}
      </div>

      <div>
        <label className="field-label" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="field-error">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      {state.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
