import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import { CUSTOM_ORDER_TYPES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Customized Artwork",
  description:
    "Commission a customized piece from an Aartverse artist -- tell us what you have in mind and we'll get back to you.",
};

/**
 * Public "commission a custom piece" page -- reachable from the "Custom
 * Order" link in the main nav (see components/Header.tsx). The dropdown is
 * a fixed list of commission types (CUSTOM_ORDER_TYPES in lib/constants.ts)
 * -- what kind of piece someone might want made -- not the site's live
 * artwork categories, which describe existing inventory, not a request.
 */
export default function CustomOrderPage() {
  return (
    <div className="container-gallery max-w-2xl py-16">
      <p className="eyebrow mb-3">Commission a piece</p>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">Customized Artwork</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Looking for something made specifically for you -- a particular size, medium, subject, or
        color palette? Tell us what you have in mind and we&apos;ll match you with the right artist.
      </p>

      <div className="mt-10 border border-line bg-white p-6 sm:p-8">
        <InquiryForm type="custom" categories={CUSTOM_ORDER_TYPES.map((name) => ({ name }))} />
      </div>
    </div>
  );
}
