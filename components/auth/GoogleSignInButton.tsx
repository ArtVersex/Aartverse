"use client";

import { signIn } from "next-auth/react";

export default function GoogleSignInButton({
  label = "Continue with Google",
  callbackUrl = "/artist/dashboard",
}: {
  label?: string;
  callbackUrl?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="btn-secondary w-full gap-2"
    >
      <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.7 5.2C9.1 39.6 15.9 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.6 5.4C41.7 35.4 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"
        />
      </svg>
      {label}
    </button>
  );
}
