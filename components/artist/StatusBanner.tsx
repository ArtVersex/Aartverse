"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  resendVerificationAction,
  type ResendVerificationState,
} from "@/app/(auth)/verify-email/actions";
import type { UserRow } from "@/lib/types";

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="link-underline">
      {pending ? "Sending…" : "Resend verification email"}
    </button>
  );
}

export default function StatusBanner({
  status,
  emailVerified,
}: {
  status: UserRow["status"];
  emailVerified: boolean;
}) {
  const [state, formAction] = useActionState<ResendVerificationState, FormData>(
    resendVerificationAction,
    {}
  );

  return (
    <div className="mb-8 space-y-3">
      {status === "pending" && (
        <div className="callout-banner border-amber-700/40 bg-amber-50">
          <p className="font-medium">Your artist account is currently under review.</p>
          <p className="mt-1 text-muted">
            You can start uploading and submitting your artworks right away while we complete
            the approval process. Nothing here is blocked while you wait.
          </p>
        </div>
      )}

      {status === "suspended" && (
        <div className="callout-banner border-red-800/40 bg-red-50">
          <p className="font-medium">Your artist account is suspended.</p>
          <p className="mt-1 text-muted">
            Your profile and existing artworks are preserved, but new submissions and edits are
            paused. Contact us if you believe this is a mistake.
          </p>
        </div>
      )}

      {!emailVerified && (
        <div className="callout-banner flex flex-wrap items-center justify-between gap-2">
          <span>Please verify your email address.</span>
          {state.sent ? (
            <span className="text-muted">Check your inbox for a new link.</span>
          ) : (
            <form action={formAction}>
              <ResendButton />
            </form>
          )}
          {state.error && <span className="w-full text-red-700">{state.error}</span>}
        </div>
      )}
    </div>
  );
}
