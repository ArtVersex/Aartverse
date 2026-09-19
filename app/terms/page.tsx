import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { HOME_VISIT_FEE_INR, WHATSAPP_DISPLAY_NUMBER } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that govern using Aartverse as an artist or a buyer, including our sales and refund policy.",
};

const LAST_UPDATED = "September 19, 2026";
const SUPPORT_EMAIL = "admin@aartverse.com";

export default function TermsPage() {
  return (
    <div className="container-gallery py-16">
      <div className="mb-16 max-w-2xl border-b border-line pb-12">
        <p className="eyebrow text-accent">Legal</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Terms &amp; Conditions</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          These terms govern your use of Aartverse, whether you&apos;re
          browsing the catalogue, registering as an artist, or buying a
          piece. By using this site, you agree to them.
        </p>
        <p className="mt-4 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      </div>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="The basics" title="About Aartverse" />
        <div className="space-y-5 text-muted">
          <p>
            Aartverse is a marketplace for original, hand-made artwork.
            Artists register and build a profile, then submit their work
            through their own dashboard. Aartverse may review, curate, or
            feature submissions at its discretion, and reserves the right to
            decline to list, or to remove, any submission that doesn&apos;t
            meet our standards.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="For artists" title="Registration & submissions" />
        <div className="space-y-5 text-muted">
          <p>
            By registering as an artist, you confirm that the information on
            your profile is accurate, and that every artwork you submit is
            your own original, hand-made work -- not a reproduction, print,
            or someone else&apos;s creation. You&apos;re responsible for
            keeping your artwork details (pricing, dimensions, availability,
            and description) accurate and up to date.
          </p>
          <p>
            You keep ownership of your artwork and the rights to it.
            Submitting a piece to Aartverse gives us permission to display
            it -- its images, description, and related details -- on this
            site and in our own promotion of the marketplace.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="For buyers" title="Browsing & purchasing" />
        <div className="space-y-5 text-muted">
          <p>
            Aartverse does not run an online checkout. Every purchase starts
            as a direct conversation, typically over WhatsApp, where
            availability, final price, payment, and delivery are confirmed
            between you and our team. Prices shown on the site are
            indicative and are confirmed at the time of purchase; artwork is
            offered subject to availability, which isn&apos;t guaranteed
            until confirmed by us.
          </p>
          <p>
            Every artwork sold through Aartverse comes with a digital
            certificate of authenticity confirming it&apos;s original,
            hand-made work by the credited artist.
          </p>
        </div>
      </section>

      <section id="home-visits" className="mb-16 max-w-3xl scroll-mt-24">
        <SectionHeading eyebrow="In person" title="Home visits" />
        <div className="space-y-5 text-muted">
          <p>
            Select artworks can be brought to you for a home visit ahead of
            purchase, subject to artist and team availability. The visit fee
            is {formatPrice(HOME_VISIT_FEE_INR)} per artwork, prepaid to
            confirm the appointment, and fully adjusted against the purchase
            price if you go ahead with buying that piece. See our{" "}
            <Link href="/about#home-visits" className="link-underline text-ink">
              About page
            </Link>{" "}
            for more detail.
          </p>
        </div>
      </section>

      <section id="refunds" className="mb-16 max-w-3xl scroll-mt-24">
        <SectionHeading eyebrow="Important" title="Sales & refunds" />
        <div className="space-y-5 text-muted">
          <p>
            Once a sale is confirmed and completed, it is final: we do not
            process refunds, returns, or exchanges on artwork purchased
            through Aartverse.
          </p>
          <p>
            We ask you to be certain before buying, and we try to make that
            straightforward. Every artwork page lists complete details --
            images, dimensions, materials, description, and price -- before
            you commit, and select pieces can also be viewed in person at a
            home visit ahead of purchase (see above). Because that
            information and that option are available upfront, we expect
            buyers to satisfy themselves fully before completing a purchase,
            and treat a confirmed sale as final on that basis.
          </p>
          <p className="text-sm">
            Nothing in this section limits any statutory right you may have
            under applicable consumer protection law that cannot be excluded
            by agreement.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Ownership" title="Intellectual property" />
        <div className="space-y-5 text-muted">
          <p>
            Artwork images and descriptions remain the property of the
            respective artist (or Aartverse, for original site content).
            Please don&apos;t copy, reproduce, or reuse content from this
            site without permission from the artist or Aartverse.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Fair use" title="Acceptable use" />
        <div className="space-y-5 text-muted">
          <p>
            Please use Aartverse only for its intended purpose: discovering,
            registering as, or buying from, real artists. Don&apos;t misuse
            the site -- for example, by scraping or bulk-copying its
            content, attempting to access accounts or data that aren&apos;t
            yours, or submitting work that isn&apos;t genuinely your own.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="The fine print" title="Liability" />
        <div className="space-y-5 text-muted">
          <p>
            Aartverse is provided on an &quot;as is&quot; basis. While we
            take reasonable care in how the site and marketplace operate, we
            aren&apos;t liable for indirect or consequential loss arising
            from your use of the site, to the fullest extent permitted by
            applicable law.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Updates" title="Changes to these terms" />
        <div className="space-y-5 text-muted">
          <p>
            We may update these terms from time to time as the site
            evolves. The &quot;Last updated&quot; date above reflects the
            most recent revision, and continued use of the site after a
            change means you accept the updated terms.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Legal" title="Governing law" />
        <div className="space-y-5 text-muted">
          <p>
            These terms are governed by the laws of India, and any disputes
            arising from them will be subject to the jurisdiction of the
            courts of India.
          </p>
        </div>
      </section>

      <section className="max-w-3xl border-t border-line pt-12">
        <SectionHeading eyebrow="Get in touch" title="Contact us" />
        <div className="space-y-2 text-muted">
          <p>Questions about these terms? Reach us at:</p>
          <p className="text-ink">WhatsApp: {WHATSAPP_DISPLAY_NUMBER}</p>
          <p className="text-ink">Email: {SUPPORT_EMAIL}</p>
        </div>
        <p className="mt-8 text-sm text-muted">
          See also our{" "}
          <Link href="/privacy" className="link-underline text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
