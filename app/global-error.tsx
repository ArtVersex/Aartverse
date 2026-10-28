"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort fallback for an error thrown by the root layout itself (very
 * rare -- app/error.tsx covers everything else). Next.js requires this file
 * to render its own <html>/<body>, so it can't rely on the app's normal
 * layout or Tailwind build -- kept intentionally plain and self-contained
 * with inline styles so it always renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error] unhandled error in root layout:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: "#1a1a1a",
          background: "#faf8f5",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8378" }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>We hit a snag</h1>
        <p style={{ maxWidth: "28rem", fontSize: "0.9rem", color: "#6b6456" }}>
          Something unexpected happened on our end. Please try again — if it
          keeps happening, let us know what you were doing just before it
          showed up.
        </p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid #1a1a1a",
              background: "transparent",
              padding: "0.75rem 1.25rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1a1a1a",
              textDecoration: "underline",
            }}
          >
            Back to Aartverse
          </Link>
        </div>
      </body>
    </html>
  );
}
