import Link from "next/link";

/**
 * Premium refresh (2026-09-14): a two-column layout on desktop (a dark
 * brand panel alongside the form) instead of just a centered box floating
 * on the plain canvas -- the same dark-ink-plus-accent-glow treatment used
 * for the home page hero glow and the Week Best dark band, so the auth
 * flow doesn't feel like a bare utility screen bolted onto the site. Purely
 * decorative/static (no data dependency), so it's safe to share across
 * every page under (auth)/ -- login, register, forgot/reset password,
 * verify-email. Collapses to just the centered card on mobile/tablet,
 * same as before.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[70vh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:flex lg:flex-col lg:justify-between lg:p-16 lg:text-canvas">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 20% 20%, rgba(154,91,63,0.28), transparent 60%)",
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" aria-hidden className="h-8 w-8" />
          <span className="font-display text-2xl">AartVerse</span>
        </Link>
        <div className="relative z-10 max-w-sm">
          <p className="font-display text-3xl leading-snug">
            &ldquo;Original art, straight from the artist&apos;s studio.&rdquo;
          </p>
          <p className="eyebrow mt-6 text-canvas/60">A contemporary art marketplace</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-md border border-line bg-canvas p-8 shadow-soft sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
