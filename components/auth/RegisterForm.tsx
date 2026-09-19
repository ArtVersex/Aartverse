"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type RegisterActionState } from "@/app/(auth)/register/actions";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

const initialState: RegisterActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export default function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5" noValidate>
        <div>
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input id="name" name="name" type="text" required autoComplete="name" />
          {state.fieldErrors?.name && (
            <p className="field-error">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          {state.fieldErrors?.email && (
            <p className="field-error">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          {state.fieldErrors?.password ? (
            <p className="field-error">{state.fieldErrors.password}</p>
          ) : (
            <p className="mt-1 font-sans text-xs text-muted">
              At least 8 characters, with a letter and a number.
            </p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="confirmPassword">
            Confirm password
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

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="font-sans text-xs uppercase tracking-widest2 text-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleSignInButton label="Continue with Google" />
    </div>
  );
}
