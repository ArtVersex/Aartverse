"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

interface NavLink {
  href: string;
  label: string;
}

/**
 * The header's hamburger trigger + slide-out drawer, split into its own
 * small "use client" island so components/Header.tsx itself can stay an
 * async server component (it needs getSessionUser()) -- same pattern as
 * SignOutButton/ImpactfulToggle/ArtistRowActions elsewhere in this app:
 * only the interactive sliver is client-side, everything around it is
 * plain server-rendered HTML.
 *
 * Deliberately real React state rather than the checkbox+peer CSS trick
 * used for the header's search reveal (see Header.tsx) or ReadMore: a
 * <Link> click inside this drawer does a client-side route transition, not
 * a full page reload, and Header lives in the root layout so it is never
 * remounted between pages -- a pure-CSS checkbox would stay checked (and
 * the drawer would stay open, with its backdrop still covering the page)
 * after navigating. The usePathname() effect below closes it on every
 * route change to avoid exactly that.
 *
 * BUG FIX (2026-09-14): the backdrop + drawer are rendered through a portal
 * straight into `document.body`, NOT inline where this component sits in
 * the tree. Header.tsx's <header> has `backdrop-blur-md`, and per the CSS
 * spec, `backdrop-filter` (like `filter`/`transform`/`will-change`) turns
 * the element carrying it into the *containing block* for any
 * `position: fixed` descendant. Without the portal, this drawer's
 * `fixed inset-y-0 right-0` and its backdrop's `fixed inset-0` were
 * resolving against <header>'s own ~90px height instead of the viewport --
 * squashing the whole drawer into the header bar's height instead of
 * covering the screen, with everything below that sliver spilling out and
 * overlapping the page underneath it. Portaling to `document.body` (a
 * plain, unfiltered element) escapes that trap entirely.
 */
export default function HeaderMobileMenu({
  navLinks,
  isSignedIn,
  dashboardHref,
}: {
  navLinks: NavLink[];
  isSignedIn: boolean;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portals need a real DOM to render into, which only exists client-side;
  // this flips true right after the first client render.
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const overlay = (
    <>
      {/* Backdrop -- always mounted (not conditionally rendered) so opacity
          transitions both ways instead of just popping in/out. */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal={open}
        aria-label="Site navigation"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xs transform flex-col bg-canvas shadow-elevated transition-transform duration-300 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <span className="font-display text-xl">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center text-2xl leading-none text-ink/60 hover:text-ink"
          >
            ×
          </button>
        </div>

        <nav aria-label="Mobile" className="flex flex-1 flex-col overflow-y-auto px-6 py-2">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="drawer-link">
              {link.label}
              <span aria-hidden className="text-muted">
                →
              </span>
            </Link>
          ))}
        </nav>

        <form action="/search" method="get" className="border-t border-line px-6 py-5">
          <label htmlFor="mobile-search" className="eyebrow mb-2 block text-[11px] text-muted">
            Search
          </label>
          <input
            id="mobile-search"
            type="search"
            name="q"
            placeholder="Artworks, artists, categories…"
            className="w-full border-b border-line bg-transparent py-2 text-base"
          />
        </form>

        <div className="border-t border-line px-6 py-5">
          {isSignedIn ? (
            <div className="flex flex-col gap-3">
              <Link href={dashboardHref} className="btn-secondary justify-center" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <SignOutButton className="btn-secondary justify-center" />
            </div>
          ) : (
            <Link href="/login" className="btn-primary w-full justify-center" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-10 w-10 items-center justify-center text-ink md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </>
  );
}
