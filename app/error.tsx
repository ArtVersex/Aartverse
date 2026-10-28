"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Catches any uncaught error thrown while rendering, in an effect, or inside
 * a Server Action called from a route under this (root) layout, and shows a
 * friendly message instead of Next.js's generic "Application error: a
 * client-side exception has occurred" screen.
 *
 * This does NOT replace proper try/catch around specific operations (see
 * e.g. app/artist/artworks/actions.ts) -- those still return a precise,
 * actionable field error. This is the last-resort safety net for anything
 * that isn't (or can't be) caught that specifically, so a bug or a
 * transient issue (a flaky DB connection, an upload host hiccup) never
 * leaves someone staring at a blank/broken page with no way forward.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logged server-side in Vercel's function logs (digest ties this back
    // to the original server-side error if one was involved).
    console.error("[app/error] unhandled error:", error);
  }, [error]);

  return (
    <div className="container-gallery flex flex-col items-center justify-center gap-4 py-40 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-display text-4xl">We hit a snag</h1>
      <p className="max-w-md text-sm text-muted">
        Something unexpected happened on our end. Please try again — if it
        keeps happening, let us know what you were doing just before it
        showed up.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn-secondary">
          Try again
        </button>
        <Link href="/" className="eyebrow link-underline">
          Back to Aartverse
        </Link>
      </div>
    </div>
  );
}
