import type { Metadata } from "next";
import Link from "next/link";
import SectionHeading from "@/components/SectionHeading";
import { WHATSAPP_DISPLAY_NUMBER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Aartverse collects, uses, and protects information from artists, buyers, and visitors.",
};

const LAST_UPDATED = "September 19, 2026";
const SUPPORT_EMAIL = "admin@aartverse.com";

export default function PrivacyPage() {
  return (
    <div className="container-gallery py-16">
      <div className="mb-16 max-w-2xl border-b border-line pb-12">
        <p className="eyebrow text-accent">Legal</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-6 text-lg leading-relaxed text-muted">
          This policy explains what information Aartverse collects from
          artists, buyers, and visitors to this site, how it&apos;s used, and
          the choices available. By using Aartverse, you agree to the
          practices described here.
        </p>
        <p className="mt-4 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
      </div>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Who we are" title="About this policy" />
        <div className="space-y-5 text-muted">
          <p>
            Aartverse (&quot;Aartverse&quot;, &quot;we&quot;, &quot;us&quot;)
            operates this website as a marketplace connecting artists with
            collectors. This policy covers the information collected through
            the site itself -- browsing the catalogue, registering as an
            artist, submitting artwork, and enquiring about a piece.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Collection" title="Information we collect" />
        <div className="space-y-6 text-muted">
          <div>
            <p className="font-medium text-ink">From artists</p>
            <p className="mt-2">
              Name, email address, phone and WhatsApp number, profile details
              (statement, location, mediums, website and social links),
              professional/career history if you choose to add it, and the
              images, descriptions, pricing, and other details of any artwork
              you submit. This is collected when you register, build your
              profile, or submit work through your artist dashboard.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">From buyers and visitors</p>
            <p className="mt-2">
              We don&apos;t run an account system or checkout for buyers.
              Information such as your name, phone number, or the details of
              what you&apos;re asking about is only collected when you choose
              to reach out -- for example, by starting a WhatsApp
              conversation about an artwork or a home visit. Like most
              websites, this site also receives standard technical
              information automatically from your browser (such as browser
              type and pages visited); we don&apos;t use this to identify you
              personally.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">Cookies</p>
            <p className="mt-2">
              Artists and admins who log in are kept signed in using a
              session cookie, which is necessary for the dashboard to work.
              We don&apos;t use cookies for advertising or to track you
              across other websites.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Purpose" title="How we use this information" />
        <div className="space-y-5 text-muted">
          <p>
            We use the information above to display artist profiles and
            artwork on the site, review and manage submissions, communicate
            with artists about their account or their work, respond to
            enquiries from prospective buyers, arrange home visits, and keep
            the site secure and working correctly.
          </p>
          <p>
            An artist&apos;s phone number and WhatsApp number are kept
            private and are never displayed on their public profile or
            artwork pages -- they&apos;re used internally only, to reach the
            artist directly when needed.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Boundaries" title="What we don't do" />
        <div className="space-y-5 text-muted">
          <p>
            We don&apos;t process payments or store payment details on this
            site -- every purchase is arranged directly between you and our
            team over WhatsApp or another channel you choose. We don&apos;t
            sell personal information to advertisers or other third parties,
            and we don&apos;t share an artist&apos;s or buyer&apos;s contact
            details beyond what&apos;s needed to complete a conversation or
            transaction they&apos;re already part of.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Storage" title="Retention & security" />
        <div className="space-y-5 text-muted">
          <p>
            We keep information for as long as it&apos;s needed for the
            purposes described in this policy -- for example, an artist&apos;s
            profile and artwork details for as long as their account is
            active. We take reasonable technical and organizational measures
            to protect the information we hold, though no method of storage
            or transmission over the internet is completely secure.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Your choices" title="Access, correction & removal" />
        <div className="space-y-5 text-muted">
          <p>
            Artists can update most of their own profile and artwork
            information directly from their dashboard at any time. For
            anything else -- correcting information, requesting a copy of
            what we hold, or asking us to remove your data -- contact us
            using the details below and we&apos;ll respond as soon as we
            can.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Eligibility" title="Children's privacy" />
        <div className="space-y-5 text-muted">
          <p>
            Aartverse is not directed at, and does not knowingly collect
            information from, anyone under the age of 18. If you believe a
            minor has provided us with personal information, please contact
            us and we&apos;ll remove it.
          </p>
        </div>
      </section>

      <section className="mb-16 max-w-3xl">
        <SectionHeading eyebrow="Updates" title="Changes to this policy" />
        <div className="space-y-5 text-muted">
          <p>
            We may update this policy from time to time as the site
            evolves. The &quot;Last updated&quot; date above reflects the
            most recent revision, and continued use of the site after a
            change means you accept the updated policy.
          </p>
        </div>
      </section>

      <section className="max-w-3xl border-t border-line pt-12">
        <SectionHeading eyebrow="Get in touch" title="Contact us" />
        <div className="space-y-2 text-muted">
          <p>Questions about this policy or your information? Reach us at:</p>
          <p className="text-ink">WhatsApp: {WHATSAPP_DISPLAY_NUMBER}</p>
          <p className="text-ink">Email: {SUPPORT_EMAIL}</p>
        </div>
        <p className="mt-8 text-sm text-muted">
          See also our{" "}
          <Link href="/terms" className="link-underline text-ink">
            Terms &amp; Conditions
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
