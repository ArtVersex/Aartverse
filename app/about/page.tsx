import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  ARTIST_REGISTRATION_FORM_URL,
  ART_SUBMISSION_FORM_URL,
  GENERAL_WHATSAPP_MESSAGE,
  HOME_VISIT_FEE_INR,
  HOME_VISIT_MAX_ARTWORKS_PER_ARTIST,
  WHATSAPP_DISPLAY_NUMBER,
  buildWhatsAppLink,
} from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "About & services",
  description:
    "What Aartverse is, how to buy or view an artwork, our home-visit service and pricing, and the digital certificate of authenticity that comes with every piece.",
};

export default function AboutPage() {
  const generalWhatsApp = buildWhatsAppLink(GENERAL_WHATSAPP_MESSAGE);

  return (
    <div className="container-gallery py-16">
      <div className="mb-16 max-w-2xl border-b border-line pb-12">
        <p className="eyebrow">About Aartverse</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">
          Art that speaks to the soul
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Aartverse is a contemporary art marketplace built to put original,
          hand-made work in front of people who&apos;ll actually live with it —
          not stock photography, not prints, not mass production. Every
          piece in the catalogue is a real artwork from a real artist, with
          its own story, dimensions, and certificate. This page covers how
          the site works, what we charge for (and why), and what you get
          when you buy.
        </p>
      </div>

      <section className="mb-20 max-w-3xl">
        <SectionHeading eyebrow="How it works" title="Browsing & discovery" />
        <div className="space-y-5 text-muted">
          <p>
            Every artwork can be explored by category, artist, price, year,
            availability, and collection from the{" "}
            <Link href="/artworks" className="link-underline text-ink">
              artworks catalogue
            </Link>
            . Because color is often the first thing that draws someone to a
            piece, the catalogue also includes an advanced color filter that
            matches and ranks artworks by how much of a given color family —
            white, gray, blue, and so on — actually appears in them, using
            the same palette breakdown shown on each artwork&apos;s own page.
          </p>
          <p>
            The{" "}
            <Link href="/week-best" className="link-underline text-ink">
              Week Best Collection
            </Link>{" "}
            is our editorial pick of the week — a curated, hand-ordered set
            of pieces, separate from any artist&apos;s own series or collection.
          </p>
        </div>
      </section>

      <section className="mb-20 max-w-3xl">
        <SectionHeading eyebrow="Buying" title="Purchasing an artwork" />
        <div className="space-y-5 text-muted">
          <p>
            We don&apos;t run a checkout — every purchase starts as a
            conversation. Every artwork page has a &quot;Chat on WhatsApp&quot; button
            that opens a message pre-filled with the piece you&apos;re asking
            about, so we can confirm availability, answer questions about
            the work, and arrange payment and delivery directly.
          </p>
          <a
            href={generalWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Message us on WhatsApp
          </a>
          <p className="text-sm">
            Or reach us directly at {WHATSAPP_DISPLAY_NUMBER}.
          </p>
        </div>
      </section>

      <section id="home-visits" className="mb-20 max-w-3xl scroll-mt-24">
        <SectionHeading eyebrow="In person" title="Home visits" />
        <div className="space-y-5 text-muted">
          <p>
            For a considered purchase, we understand photos aren&apos;t always
            enough — you may want to see a piece in your own space, in your
            own light, before deciding. Select artworks can be brought to
            you for a home visit ahead of purchase.
          </p>
          <p>
            A flat visit charge applies, and it&apos;s kept deliberately small —
            enough to filter out casual or hoax requests, not to make money
            on the visit itself. It&apos;s fully adjusted against the final
            purchase price if you go ahead with buying.
          </p>
        </div>

        <dl className="mt-8 grid gap-6 border border-line p-6 sm:grid-cols-2">
          <div>
            <dt className="eyebrow text-[11px] text-muted">One artist, one visit</dt>
            <dd className="mt-2 text-2xl font-display">
              {formatPrice(HOME_VISIT_FEE_INR)}
            </dd>
            <dd className="mt-1 text-sm text-muted">
              Flat fee, covers up to {HOME_VISIT_MAX_ARTWORKS_PER_ARTIST}{" "}
              artworks from that artist — even if you&apos;d like to see just one,
              the charge is the same flat amount.
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-[11px] text-muted">Multiple artists, one visit</dt>
            <dd className="mt-2 text-2xl font-display">
              {formatPrice(HOME_VISIT_FEE_INR)} per artist
            </dd>
            <dd className="mt-1 text-sm text-muted">
              Want to compare work from two or three different artists in
              one sitting? The same {formatPrice(HOME_VISIT_FEE_INR)} /{" "}
              {HOME_VISIT_MAX_ARTWORKS_PER_ARTIST}-artwork allowance applies
              per artist, not per visit.
            </dd>
          </div>
        </dl>

        <p className="mt-6 text-sm text-muted">
          To arrange one, open any artwork you&apos;re interested in and use the
          &quot;Ask about a home visit&quot; link, or{" "}
          <a href={generalWhatsApp} target="_blank" rel="noopener noreferrer" className="link-underline text-ink">
            message us on WhatsApp
          </a>{" "}
          directly.
        </p>
      </section>

      <section className="mb-20 max-w-3xl">
        <SectionHeading eyebrow="Authenticity" title="Digital certificate of authenticity" />
        <div className="space-y-5 text-muted">
          <p>
            Every artwork sold through Aartverse comes with a digital
            certificate of authenticity — the artwork&apos;s title, artist, and
            certificate number (shown as &quot;Certificate no.&quot; on each artwork&apos;s
            page), paired with the artist&apos;s own signature, confirming the
            piece is original, hand-made work by that artist rather than a
            reproduction.
          </p>
        </div>
      </section>

      <section className="border border-line p-8 sm:p-12">
        <SectionHeading eyebrow="For artists" title="Show your work here" />
        <p className="max-w-2xl text-muted">
          If you&apos;re an artist and would like your work on Aartverse, register
          yourself and submit pieces through the forms below — every
          submission is reviewed before it&apos;s added to the catalogue.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href={ARTIST_REGISTRATION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink px-6 py-3 text-sm uppercase tracking-widest2 text-canvas transition-opacity hover:opacity-90"
          >
            Register as an artist
          </a>
          <a
            href={ART_SUBMISSION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-ink px-6 py-3 text-sm uppercase tracking-widest2 text-ink transition-opacity hover:opacity-70"
          >
            Submit an artwork
          </a>
        </div>
      </section>
    </div>
  );
}
