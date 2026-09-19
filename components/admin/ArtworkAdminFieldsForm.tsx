"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { AdminFieldsFormState } from "@/app/admin/artworks/actions";
import type { ArtworkRow } from "@/lib/types";
import RichTextEditor from "@/components/RichTextEditor";

const initialState: AdminFieldsFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : "Save listing details"}
    </button>
  );
}

/**
 * The fields an artist's own submission form never shows at all (per the
 * AartVerse workflow: the team decides what's worth selling and lists it)
 * -- in stock, certificate number -- plus the same optional curatorial
 * write-ups an artist may have already started, which an admin can add to
 * or refine from here. Lives on the admin-only artwork detail/review page
 * (app/admin/artworks/[artwork_id]/page.tsx).
 *
 * "Impactful" is deliberately NOT a field on this form even though it's
 * part of the same admin-only column set -- it has its own always-visible,
 * instant-save control (components/admin/ImpactfulToggle.tsx, rendered
 * alongside this form on the same detail page) so there's exactly one
 * control for it, not two with different save timing that could disagree.
 * app/admin/artworks/actions.ts's parser reads "impactful" as "leave
 * untouched" whenever it's absent from a submission for exactly this
 * reason.
 *
 * Collection membership (part_of_collection/collection_name) used to live
 * on this form too, but now belongs to the artist's own submission form
 * instead (see components/artist/CollectionFields.tsx) -- an admin still
 * corrects it, just via the "Edit artist's submission" section above this
 * one on the review page, which reuses that same artist-facing form.
 *
 * inStock uses the same "the visible checkbox carries no name, a hidden
 * input carries the real value" pattern as
 * components/artist/CategoryFields.tsx's subcategory field. A plain
 * unchecked <input type="checkbox"> simply omits itself from FormData,
 * which would make "this form doesn't control that field at all" and
 * "explicitly turning it off" indistinguishable on the server -- a hidden
 * input that's always present (an explicit "1"/"0") sidesteps that instead
 * of relying on checkbox presence/absence.
 */
export default function ArtworkAdminFieldsForm({
  artwork,
  action,
}: {
  artwork: ArtworkRow;
  action: (prevState: AdminFieldsFormState, formData: FormData) => Promise<AdminFieldsFormState>;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [inStock, setInStock] = useState(Boolean(artwork.in_stock));

  return (
    <form action={formAction} className="space-y-5 border border-line bg-white p-5 sm:p-6" noValidate>
      <p className="eyebrow">Listing details</p>
      {state.success && <p className="callout-banner">Saved.</p>}

      <div>
        <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-ink">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="h-4 w-4 shrink-0 border-line accent-ink"
          />
          In stock
        </label>
        <input type="hidden" name="inStock" value={inStock ? "1" : "0"} />
      </div>

      <div>
        <label className="field-label" htmlFor="certificateNumber">
          Certificate number
        </label>
        <input
          id="certificateNumber"
          name="certificateNumber"
          type="text"
          defaultValue={artwork.certificate_number ?? ""}
        />
      </div>

      <div className="space-y-4 border-t border-line pt-4">
        <p className="eyebrow">
          Curatorial write-up{" "}
          <span className="font-normal normal-case text-muted">(optional, shown to visitors)</span>
        </p>
        <div>
          <label className="field-label">Technique highlight</label>
          <RichTextEditor
            name="techniqueHighlight"
            defaultValue={artwork.technique_highlight}
            minHeight="5rem"
          />
        </div>
        <div>
          <label className="field-label">Historical context</label>
          <RichTextEditor
            name="historicalContext"
            defaultValue={artwork.historical_context}
            minHeight="5rem"
          />
        </div>
        <div>
          <label className="field-label">Symbolism</label>
          <RichTextEditor name="symbolism" defaultValue={artwork.symbolism} minHeight="5rem" />
        </div>
        <div>
          <label className="field-label">Composition analysis</label>
          <RichTextEditor
            name="compositionAnalysis"
            defaultValue={artwork.composition_analysis}
            minHeight="5rem"
          />
        </div>
        <div>
          <label className="field-label">Cultural significance</label>
          <RichTextEditor
            name="culturalSignificance"
            defaultValue={artwork.cultural_significance}
            minHeight="5rem"
          />
        </div>
      </div>

      {state.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
