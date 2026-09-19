import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  ARTIST_REGISTRATION_FORM_URL,
  ART_SUBMISSION_FORM_URL,
  GENERAL_WHATSAPP_MESSAGE,
  HOME_VISIT_FEE_INR,
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
        <p className="eyebrow text-accent">About Aartverse</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">
          Art that speaks to the soul
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          Aartverse is a contemporary art marketplace built to put original,
          hand-made work in front of people who&apos;ll actually live with it.
          Not stock photography, not prints, not mass production. Every
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
            matches and ranks artworks by how much of a given color family
            (white, gray, blue, and so on) actually appears in them, using
            the same palette breakdown shown on each artwork&apos;s own page.
          </p>
          <p>
            The{" "}
            <Link href="/week-best" className="link-underline text-ink">
              Week Best Collection
            </Link>{" "}
            is our editorial pick of the week: a curated, hand-ordered set
            of pieces, separate from any artist&apos;s own series or collection.
          </p>
        </div>
      </section>

      <section className="mb-20 max-w-3xl">
        <SectionHeading eyebrow="Buying" title="Purchasing an artwork" />
        <div className="space-y-5 text-muted">
          <p>
            We don&apos;t run a checkout. Every purchase starts as a
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
            enough: you may want to see a piece in your own space, in your
            own light, before deciding. Select artworks can be brought to
            you for a home visit ahead of purchase.
          </p>
          <p>
            The visit charge is prepaid to confirm the appointment, and
            it&apos;s kept deliberately small, enough to filter out casual or
            hoax requests, not to make money on the visit itself. It&apos;s
            fully adjusted against the final purchase price if you go ahead
            with buying.
          </p>
        </div>

        <dl className="mt-8 border border-line bg-white p-6 shadow-soft sm:p-8">
          <dt className="eyebrow text-[11px] text-accent">Per artwork</dt>
          <dd className="mt-2 text-2xl font-display">
            {formatPrice(HOME_VISIT_FEE_INR)}{" "}
            <span className="text-base font-sans text-muted">per artwork</span>
          </dd>
          <dd className="mt-1 text-sm text-muted">
            Charged per piece you&apos;d like to see in person, whether it&apos;s
            from one artist or several -- so a visit to see three pieces is{" "}
            {formatPrice(HOME_VISIT_FEE_INR * 3)} in total. Prepaid to confirm
            the appointment, and adjusted against the purchase if you go
            ahead with buying.
          </dd>
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
            certificate of authenticity: the artwork&apos;s title, artist, and
            certificate number (shown as &quot;Certificate no.&quot; on each artwork&apos;s
            page), paired with the artist&apos;s own signature, confirming the
            piece is original, hand-made work by that artist rather than a
            reproduction.
          </p>
        </div>
      </section>

      <section
        className="relative overflow-hidden border border-line p-8 sm:p-12"
        style={{
          background:
            "radial-gradient(ellipse 90% 100% at 100% 0%, rgba(154,91,63,0.08), transparent 60%)",
        }}
      >
        <SectionHeading eyebrow="For artists" title="Show your work here" />
        <p className="max-w-2xl text-muted">
          If you&apos;re an artist and would like your work on Aartverse, register
          yourself through the form below. Once you&apos;re set up with your own
          dashboard, anything you publish goes live on Aartverse right away,
          no waiting on a review queue.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a href={ARTIST_REGISTRATION_FORM_URL} target="_blank" rel="noopener noreferrer" className="btn-accent">
            Register as an artist
          </a>
          <a
            href={ART_SUBMISSION_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Submit an artwork
          </a>
        </div>
      </section>
    </div>
  );
}
