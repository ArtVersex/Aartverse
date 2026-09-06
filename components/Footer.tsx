import Link from "next/link";
import {
  ARTIST_REGISTRATION_FORM_URL,
  ART_SUBMISSION_FORM_URL,
  WHATSAPP_DISPLAY_NUMBER,
  buildWhatsAppLink,
  GENERAL_WHATSAPP_MESSAGE,
} from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="container-gallery flex flex-col gap-10 py-16 sm:flex-row sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="" aria-hidden className="h-7 w-7" />
            <p className="font-display text-2xl">Aartverse</p>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            A contemporary art marketplace connecting collectors with original
            work and the artists behind it.
          </p>
          <a
            href={buildWhatsAppLink(GENERAL_WHATSAPP_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-muted hover:text-ink"
          >
            WhatsApp: {WHATSAPP_DISPLAY_NUMBER}
          </a>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="eyebrow mb-1">Explore</p>
          <Link href="/artworks" className="text-muted hover:text-ink">
            Artworks
          </Link>
          <Link href="/artists" className="text-muted hover:text-ink">
            Artists
          </Link>
          <Link href="/week-best" className="text-muted hover:text-ink">
            Week Best Collection
          </Link>
          <Link href="/about" className="text-muted hover:text-ink">
            About &amp; services
          </Link>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <p className="eyebrow mb-1">For artists</p>
          <a
            href={ARTIST_REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-ink"
          >
            Register as an artist
          </a>
          <a
            href={ART_SUBMISSION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-ink"
          >
            Submit an artwork
          </a>
        </div>
      </div>
      <div className="container-gallery flex items-center justify-between border-t border-line py-6 text-xs text-muted">
        <p>© {new Date().getFullYear()} Aartverse. All rights reserved.</p>
      </div>
    </footer>
  );
}
