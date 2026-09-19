import Link from "next/link";
import {
  ARTIST_REGISTRATION_FORM_URL,
  ART_SUBMISSION_FORM_URL,
  WHATSAPP_DISPLAY_NUMBER,
  buildWhatsAppLink,
  GENERAL_WHATSAPP_MESSAGE,
} from "@/lib/constants";
import WhatsAppIcon from "@/components/WhatsAppIcon";

/**
 * Premium refresh (2026-09-14): moved to a dark ink band, matching the
 * treatment already used for the Week Best sections on the home page and
 * the Week Best collection hero -- this bookends the mostly-light site with
 * the same dark accent it already uses for "this is a highlight" moments,
 * rather than introducing a new color language just for the footer. Same
 * links/data as before; only the presentation changed.
 */
export default function Footer() {
  return (
    <footer className="mt-32 bg-ink text-canvas">
      <div className="container-gallery grid gap-12 py-16 sm:grid-cols-2 sm:py-20 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" aria-hidden className="h-8 w-8" />
            <p className="font-display text-2xl">Aartverse</p>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-canvas/60">
            A contemporary art marketplace connecting collectors with original
            work and the artists behind it.
          </p>
          <a
            href={buildWhatsAppLink(GENERAL_WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm text-canvas/80 transition-colors hover:text-canvas"
          >
            <WhatsAppIcon className="h-4 w-4 text-[#25D366]" />
            {WHATSAPP_DISPLAY_NUMBER}
          </a>
        </div>

        <div className="flex flex-col gap-3.5 text-sm">
          <p className="eyebrow mb-1 text-canvas/50">Explore</p>
          <Link href="/artworks" className="text-canvas/75 transition-colors hover:text-accent">
            Artworks
          </Link>
          <Link href="/artists" className="text-canvas/75 transition-colors hover:text-accent">
            Artists
          </Link>
          <Link href="/categories" className="text-canvas/75 transition-colors hover:text-accent">
            Categories
          </Link>
          <Link href="/week-best" className="text-canvas/75 transition-colors hover:text-accent">
            Week Best Collection
          </Link>
        </div>

        <div className="flex flex-col gap-3.5 text-sm">
          <p className="eyebrow mb-1 text-canvas/50">Aartverse</p>
          <Link href="/about" className="text-canvas/75 transition-colors hover:text-accent">
            About &amp; services
          </Link>
          <Link href="/search" className="text-canvas/75 transition-colors hover:text-accent">
            Search
          </Link>
          <a href="/about#home-visits" className="text-canvas/75 transition-colors hover:text-accent">
            Home visits
          </a>
        </div>

        <div className="flex flex-col gap-3.5 text-sm">
          <p className="eyebrow mb-1 text-canvas/50">For artists</p>
          <a
            href={ARTIST_REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-canvas/75 transition-colors hover:text-accent"
          >
            Register as an artist
          </a>
          <a
            href={ART_SUBMISSION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-canvas/75 transition-colors hover:text-accent"
          >
            Submit an artwork
          </a>
        </div>
      </div>
      <div className="container-gallery flex flex-col gap-3 border-t border-canvas/15 py-6 text-xs text-canvas/50 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Aartverse. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="transition-colors hover:text-canvas">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-canvas">
            Terms &amp; Conditions
          </Link>
          <p>Original, verified work: every piece certified.</p>
        </div>
      </div>
    </footer>
  );
}
