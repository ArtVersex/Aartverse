"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ArtworkFormState } from "@/app/artist/artworks/actions";
import type { ArtworkRow } from "@/lib/types";
import ImageFileInput from "@/components/ImageFileInput";
import CategoryFields from "@/components/artist/CategoryFields";
import DimensionFields from "@/components/artist/DimensionFields";
import CollectionFields from "@/components/artist/CollectionFields";
import RichTextEditor from "@/components/RichTextEditor";
import FormSection from "@/components/FormSection";

const initialState: ArtworkFormState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function ArtworkForm({
  action,
  artwork,
  submitLabel = "Save",
  showStorySection = true,
  existingCollections = [],
}: {
  action: (prevState: ArtworkFormState, formData: FormData) => Promise<ArtworkFormState>;
  artwork?: ArtworkRow;
  submitLabel?: string;
  /** False on the admin review screen's reuse of this form
   *  (app/admin/artworks/[artwork_id]/page.tsx) -- the Story fields
   *  (technique highlight, historical context, ...) already have their own
   *  editor there, in ArtworkAdminFieldsForm, so this form omits them
   *  entirely rather than offering a second, easily-out-of-sync way to
   *  save the exact same columns. Always true (the default) for the
   *  artist's own create/edit forms. */
  showStorySection?: boolean;
  /** This artist's own existing collection/series names, for
   *  CollectionFields' reuse-or-create picker -- see
   *  lib/queries/artworkMutations.ts#getArtistCollectionNames. Every server
   *  page that renders this form fetches and passes this in (using the
   *  artwork's own artist_id on the admin review screen, since there's no
   *  "current artist" there); defaults to [] only as a type-safety
   *  fallback. */
  existingCollections?: string[];
}) {
  const [state, formAction] = useActionState(action, initialState);

  // title/price/year/place/shortDescription are kept fully controlled
  // (rather than plain defaultValue inputs) because React resets a
  // <form>'s own uncontrolled fields after ANY action call that resolves
  // without throwing -- including one that just returns fieldErrors, not
  // only a successful save. A defaultValue input would lose whatever the
  // artist typed the instant validation failed. Category/subcategory,
  // dimensions, the collection picker and every rich-text field are
  // already controlled internally by their own components, so they were
  // never affected and don't need this treatment.
  const [title, setTitle] = useState(artwork?.title ?? "");
  const [price, setPrice] = useState(artwork?.price != null ? String(artwork.price) : "");
  const [year, setYear] = useState(artwork?.year != null ? String(artwork.year) : "");
  const [place, setPlace] = useState(artwork?.place ?? "");
  const [shortDescription, setShortDescription] = useState(artwork?.short_description ?? "");

  // Re-seed the controlled fields above from the just-submitted values the
  // action echoes back (extractArtworkFormValues, in
  // lib/validation/artwork.ts) whenever a new action result arrives. This
  // is React's documented "adjusting state when a value changes during
  // render" pattern rather than a useEffect, so the restored values are
  // already in place for this same render instead of flashing empty/stale
  // fields first. state.values is a fresh object on every action call, so
  // comparing it against the last-seen one (by reference) is enough to
  // detect "a new submission just came back" without an extra flag.
  const lastSyncedValues = useRef(state.values);
  if (state.values && state.values !== lastSyncedValues.current) {
    lastSyncedValues.current = state.values;
    setTitle(state.values.title ?? "");
    setPrice(state.values.price ?? "");
    setYear(state.values.year ?? "");
    setPlace(state.values.place ?? "");
    setShortDescription(state.values.shortDescription ?? "");
  }

  return (
    <form action={formAction} className="max-w-2xl space-y-6" noValidate>
      <FormSection title="Photo">
        <ImageFileInput
          name="image"
          label={artwork ? "Replace image" : "Artwork image"}
          existingUrl={artwork?.feature_image_url}
          aspect="square"
          required={!artwork?.feature_image_url}
          hint="JPG, PNG, or WEBP. This is what visitors see first."
          error={state.fieldErrors?.image}
        />
      </FormSection>

      <FormSection title="Essentials">
        <div>
          <label className="field-label" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={state.fieldErrors?.title ? "border-red-700" : undefined}
          />
          {state.fieldErrors?.title && <p className="field-error">{state.fieldErrors.title}</p>}
        </div>

        <CategoryFields
          defaultCategory={artwork?.category}
          defaultSubcategory={artwork?.subcategory}
          error={state.fieldErrors?.category}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="price">
              Price (INR)
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={state.fieldErrors?.price ? "border-red-700" : undefined}
            />
            {state.fieldErrors?.price && <p className="field-error">{state.fieldErrors.price}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="year">
              Year
            </label>
            <input
              id="year"
              name="year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={state.fieldErrors?.year ? "border-red-700" : undefined}
            />
            {state.fieldErrors?.year && <p className="field-error">{state.fieldErrors.year}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DimensionFields defaultDimensions={artwork?.dimensions} />
          <div>
            <label className="field-label" htmlFor="place">
              Place created
            </label>
            <input
              id="place"
              name="place"
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className={state.fieldErrors?.place ? "border-red-700" : undefined}
            />
            {state.fieldErrors?.place && <p className="field-error">{state.fieldErrors.place}</p>}
          </div>
        </div>

        <CollectionFields
          existingCollections={existingCollections}
          defaultPartOfCollection={Boolean(artwork?.part_of_collection)}
          defaultCollectionName={artwork?.collection_name}
          error={state.fieldErrors?.collectionName}
        />
      </FormSection>

      <FormSection title="Description">
        <div>
          <label className="field-label" htmlFor="shortDescription">
            Short description
          </label>
          <textarea
            id="shortDescription"
            name="shortDescription"
            rows={2}
            maxLength={500}
            placeholder="One or two sentences, shown alongside the price."
            className={`w-full border bg-transparent p-3 font-sans text-sm text-ink focus:outline-none focus:border-ink ${
              state.fieldErrors?.shortDescription ? "border-red-700" : "border-line"
            }`}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
          {state.fieldErrors?.shortDescription && (
            <p className="field-error">{state.fieldErrors.shortDescription}</p>
          )}
        </div>

        <div>
          <label className="field-label">Full description</label>
          <RichTextEditor
            name="description"
            defaultValue={artwork?.description}
            placeholder="Tell the story of this piece…"
          />
        </div>
      </FormSection>

      {showStorySection && (
        <FormSection
          title="Story"
          subtitle="optional, add depth for curators"
          defaultOpen={false}
        >
          <p className="-mt-1 font-sans text-xs text-muted">
            Entirely optional. Our team can also add or refine any of this before a piece goes live.
          </p>
          <div>
            <label className="field-label">Technique highlight</label>
            <RichTextEditor
              name="techniqueHighlight"
              defaultValue={artwork?.technique_highlight}
              placeholder="What's technically interesting about how this was made?"
              minHeight="5rem"
            />
          </div>
          <div>
            <label className="field-label">Historical context</label>
            <RichTextEditor
              name="historicalContext"
              defaultValue={artwork?.historical_context}
              placeholder="Where does this fit in a period, movement, or tradition?"
              minHeight="5rem"
            />
          </div>
          <div>
            <label className="field-label">Symbolism</label>
            <RichTextEditor
              name="symbolism"
              defaultValue={artwork?.symbolism}
              placeholder="What do the motifs, colors, or forms represent?"
              minHeight="5rem"
            />
          </div>
          <div>
            <label className="field-label">Composition analysis</label>
            <RichTextEditor
              name="compositionAnalysis"
              defaultValue={artwork?.composition_analysis}
              placeholder="How is the piece structured: balance, focal point, movement?"
              minHeight="5rem"
            />
          </div>
          <div>
            <label className="field-label">Cultural significance</label>
            <RichTextEditor
              name="culturalSignificance"
              defaultValue={artwork?.cultural_significance}
              placeholder="Why does this piece matter culturally?"
              minHeight="5rem"
            />
          </div>
        </FormSection>
      )}

      {state.success && <p className="callout-banner">Saved.</p>}
      {state.error && <p className="font-sans text-sm text-red-700">{state.error}</p>}

      {/* Sticky so the primary action stays reachable on a long scroll,
          especially on a phone -- a translucent, blurred backdrop keeps
          content scrolling underneath it legible rather than abruptly
          clipped. */}
      {/* pr-20 on mobile only: SubmitButton is full-width there, and without
          this clearance its right edge sits directly under the fixed
          WhatsApp button (components/WhatsAppButton.tsx) -- both are
          bottom-anchored, so that button would otherwise cover the corner
          of the one button on this page an artist actually needs to tap. */}
      <div className="sticky bottom-0 border-t border-line bg-canvas/95 py-4 pr-20 backdrop-blur sm:pr-0">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
