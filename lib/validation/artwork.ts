import { z } from "zod";

/**
 * Artwork submission/edit validation, split out of lib/validation/auth.ts
 * (which otherwise only holds auth-flow schemas) now that this list has
 * grown to cover the full submission form -- essentials, the short/long
 * descriptions, and the optional curatorial write-ups an artist or an
 * Aartverse admin can add.
 *
 * `category` is required and steered by a fixed dropdown in the UI (see
 * components/artist/CategoryFields.tsx, built from the same
 * lib/constants/mediums.ts categories used for an artist's own mediums),
 * but is deliberately validated here as "any non-empty string" rather than
 * a strict enum. A strict enum would reject a perfectly valid *unchanged*
 * save of an older artwork whose category was free-typed before this
 * dropdown existed -- the UI preserves that legacy value as a selectable
 * option instead of silently discarding it, and the validator has to allow
 * it back through. Steering new choices toward a fixed list belongs in the
 * UI, not a hard server-side constraint -- the same lesson as the
 * `mediums` CHECK-constraint incident (see AUTH_SETUP.md): validate shape
 * at this layer, don't force a vocabulary the data doesn't uniformly have
 * yet.
 */

/** Rich-text fields are saved as sanitized HTML produced by
 *  components/RichTextEditor.tsx (Tiptap) -- generous max lengths since
 *  markup adds overhead well beyond the visible text length. */
function richTextField(max: number) {
  return z.string().trim().max(max).optional().nullable();
}

export const artworkSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required.").max(255),
    category: z.string().trim().min(1, "Please choose a category.").max(120),
    subcategory: z.string().trim().max(255).optional().nullable(),
    price: z.coerce.number().positive().max(100_000_000).optional().nullable(),
    year: z.coerce
      .number()
      .int()
      .min(1000)
      .max(new Date().getFullYear() + 1)
      .optional()
      .nullable(),
    // Composed client-side from two plain number inputs (Width/Height) --
    // see components/artist/DimensionFields.tsx and lib/dimensions.ts --
    // into this same free-text shape ("24"x24""), so no format is enforced
    // here beyond a length cap.
    dimensions: z.string().trim().max(120).optional().nullable(),
    place: z.string().trim().max(255).optional().nullable(),
    // Always-present hidden "1"/"0" + text, from
    // components/artist/CollectionFields.tsx (same pattern as
    // CategoryFields' subcategory field). Whether collectionName is
    // actually required depends on partOfCollection, enforced below since
    // it's a cross-field rule zod can't express as a plain per-field check.
    partOfCollection: z.coerce.boolean().optional(),
    collectionName: z.string().trim().max(255).optional().nullable(),
    shortDescription: z.string().trim().max(500).optional().nullable(),
    description: richTextField(20_000),
    // Optional curatorial write-ups -- an artist can add depth here, and so
    // can an Aartverse admin from the review screen (see
    // app/admin/artworks/[artwork_id]/page.tsx). Never required: most
    // artists won't write gallery-style analysis of their own piece, and
    // that's fine -- the team can add it later before a piece goes live.
    techniqueHighlight: richTextField(10_000),
    historicalContext: richTextField(10_000),
    symbolism: richTextField(10_000),
    compositionAnalysis: richTextField(10_000),
    culturalSignificance: richTextField(10_000),
  })
  .superRefine((data, ctx) => {
    if (data.partOfCollection && !data.collectionName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["collectionName"],
        message: "Please choose or name a collection.",
      });
    }
  });

export type ArtworkInput = z.infer<typeof artworkSchema>;

/**
 * Reads a submitted <ArtworkForm> (components/artist/ArtworkForm.tsx) --
 * shared between the artist's own create/update actions
 * (app/artist/artworks/actions.ts) and the admin "edit artist's submission"
 * action (app/admin/artworks/actions.ts), since both post the exact same
 * field set through the exact same form component. Keeping this in one
 * place means the two callers can never quietly drift out of sync on which
 * fields are read or how empty values are normalized.
 */
export function parseArtworkForm(formData: FormData) {
  return artworkSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") || null,
    subcategory: formData.get("subcategory") || null,
    price: formData.get("price") || null,
    year: formData.get("year") || null,
    dimensions: formData.get("dimensions") || null,
    place: formData.get("place") || null,
    partOfCollection: formData.get("partOfCollection") === "1",
    collectionName: formData.get("collectionName") || null,
    shortDescription: formData.get("shortDescription") || null,
    description: formData.get("description") || null,
    techniqueHighlight: formData.get("techniqueHighlight") || null,
    historicalContext: formData.get("historicalContext") || null,
    symbolism: formData.get("symbolism") || null,
    compositionAnalysis: formData.get("compositionAnalysis") || null,
    culturalSignificance: formData.get("culturalSignificance") || null,
  });
}

/** Flattens a ZodError into "first message per field" -- the shape every
 *  form on this site keys its inline field errors by. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Raw, unvalidated string values for the handful of plain (non-composite)
 * fields on <ArtworkForm> -- title, price, year, place, shortDescription.
 * Echoed back in ArtworkFormState/ArtworkCoreFieldsFormState whenever a
 * submission fails, so the form can restore exactly what the artist typed.
 *
 * Why this exists at all: React resets a form's own uncontrolled fields
 * after ANY action call that doesn't throw -- including one that returns
 * fieldErrors, not just a successful one -- so a plain `defaultValue` input
 * loses whatever was typed the moment validation fails. ArtworkForm keeps
 * these particular fields fully controlled and reseeds them from this
 * echoed-back data instead of trusting the DOM to still hold them. The
 * other, more complex fields (category/subcategory, dimensions, the
 * collection picker, every rich-text field) are already implemented as
 * controlled inputs backed by their own component state, so they were
 * never affected by this and don't need to go through here.
 */
export function extractArtworkFormValues(formData: FormData): Record<string, string> {
  const pick = (name: string): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: pick("title"),
    price: pick("price"),
    year: pick("year"),
    place: pick("place"),
    shortDescription: pick("shortDescription"),
  };
}

/**
 * Admin-only fields: how a piece actually gets listed for sale. Per the
 * AartVerse workflow (artists submit, the team decides what's worth
 * selling and lists it), these are deliberately NOT on the artist's own
 * form at all -- see components/admin/ArtworkAdminFieldsForm.tsx.
 */
export const artworkAdminFieldsSchema = z.object({
  inStock: z.coerce.boolean().optional(),
  impactful: z.coerce.boolean().optional(),
  certificateNumber: z.string().trim().max(255).optional().nullable(),
  techniqueHighlight: richTextField(10_000),
  historicalContext: richTextField(10_000),
  symbolism: richTextField(10_000),
  compositionAnalysis: richTextField(10_000),
  culturalSignificance: richTextField(10_000),
});

export type ArtworkAdminFieldsInput = z.infer<typeof artworkAdminFieldsSchema>;
