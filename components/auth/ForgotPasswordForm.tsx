"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/app/(auth)/forgot-password/actions";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  if (state.submitted) {
    return (
      <p className="callout-banner">
        If an account exists for that email, a password reset link is on its way. It expires in
        1 hour and can only be used once.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
