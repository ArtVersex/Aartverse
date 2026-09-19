"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  deleteArtworkAsAdmin,
  setArtworkFeatureRank,
  updateArtworkAdminFields,
  updateArtworkAsAdmin,
} from "@/lib/queries/artworkMutations";
import { getArtworkById } from "@/lib/queries/artworks";
import {
  artworkAdminFieldsSchema,
  parseArtworkForm,
  zodFieldErrors,
  extractArtworkFormValues,
} from "@/lib/validation/artwork";
import { saveArtworkImage, deleteManagedImage, UploadValidationError } from "@/lib/uploads";
import type { ColorAnalysisResult } from "@/lib/color-analysis";

/**
 * Removes an artwork outright, regardless of which artist submitted it --
 * admin's tool for the rare submission that turns out not to be a genuine,
 * accurate piece from that artist (there's no "reject and keep the row"
 * step anymore, see lib/queries/artworkMutations.ts's doc comment on
 * AdminArtworkFieldsInput for why). Fetches the row first purely to clean
 * up its image file afterward -- same "fetch, delete, then clean up the
 * file only once the row is confirmed gone" pattern as the artist's own
 * deleteArtworkAction (see app/artist/artworks/actions.ts). Always
 * redirects back to the list, same as that action -- harmless when called
 * from a list row (already on that page) and necessary when called from
 * the now-deleted artwork's own detail page.
 */
export async function deleteArtworkAsAdminAction(artworkId: string): Promise<void> {
  await requireAdmin();
  const existing = await getArtworkById(artworkId, { requireApproved: false });
  const deleted = await deleteArtworkAsAdmin(artworkId);
  if (deleted && existing) {
    await deleteManagedImage(existing.feature_image_url);
  }
  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
  redirect("/admin/artworks");
}

/**
 * Instant, no-form toggle for the admin artworks list
 * (components/admin/ImpactfulToggle.tsx) and the detail/review page --
 * called directly from a client component via useTransition, not through
 * useActionState, since a single boolean flip doesn't need form-style
 * pending/error state of its own.
 */
export async function toggleImpactfulAction(artworkId: string, next: boolean): Promise<void> {
  await requireAdmin();
  await updateArtworkAdminFields(artworkId, { impactful: next });
  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
}

/**
 * Instant, no-form save for components/admin/FeatureRankInput.tsx -- same
 * shape as toggleImpactfulAction above, just carrying a number (or null to
 * clear) instead of a boolean. Also revalidates "/" directly since the home
 * page's featured rail (getFeaturedArtworks) reads this value straight from
 * the database and isn't worth waiting out its own ISR window for during
 * testing.
 */
export async function setFeatureRankAction(artworkId: string, rank: number | null): Promise<void> {
  await requireAdmin();
  await setArtworkFeatureRank(artworkId, rank);
  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
  revalidatePath("/");
}

export interface AdminFieldsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
}

/**
 * Reads components/admin/ArtworkAdminFieldsForm.tsx's submission.
 *
 * "impactful" is intentionally never read here -- that field has its own
 * dedicated control (ImpactfulToggle, via toggleImpactfulAction above) and
 * the admin-fields form never includes an input for it, so
 * updateArtworkAdminFields is never asked to touch that column from this
 * path -- see the form's own comment for why.
 *
 * inStock is an always-present hidden "1"/"0" string (the form's checkbox
 * carries no name of its own -- same pattern as CategoryFields' subcategory
 * field), so it's read as a real, always-defined boolean rather than
 * through the "checkbox present = true" trick that can't tell "unchecked"
 * apart from "not part of this form at all".
 *
 * partOfCollection/collectionName used to be read here too, but that
 * question now belongs to the artist's own form (see
 * components/artist/CollectionFields.tsx, wired through
 * updateArtworkAsAdminAction below for admin's "edit artist's submission"
 * case) -- one save path per field, not two with different save timing.
 */
function parseAdminFieldsForm(formData: FormData) {
  return artworkAdminFieldsSchema.safeParse({
    inStock: formData.get("inStock") === "1",
    certificateNumber: formData.get("certificateNumber") || null,
    techniqueHighlight: formData.get("techniqueHighlight") || null,
    historicalContext: formData.get("historicalContext") || null,
    symbolism: formData.get("symbolism") || null,
    compositionAnalysis: formData.get("compositionAnalysis") || null,
    culturalSignificance: formData.get("culturalSignificance") || null,
  });
}

export async function updateArtworkAdminFieldsAction(
  artworkId: string,
  _prevState: AdminFieldsFormState,
  formData: FormData
): Promise<AdminFieldsFormState> {
  await requireAdmin();

  const parsed = parseAdminFieldsForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await updateArtworkAdminFields(artworkId, parsed.data);
  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
  return { success: true };
}

export interface ArtworkCoreFieldsFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: boolean;
  /** See the matching field on ArtworkFormState (app/artist/artworks/actions.ts)
   *  -- same echo-back, needed for the same reason since this action feeds
   *  the same <ArtworkForm> component. */
  values?: Record<string, string>;
}

/**
 * Lets an admin correct or fill in an artist's own submitted fields
 * (title, category, price, dimensions, description, photo, ...) straight
 * from the review screen -- reuses the exact same <ArtworkForm> component
 * and parseArtworkForm() the artist's own create/edit actions use (see
 * app/artist/artworks/actions.ts), just bound to this action instead and
 * rendered with showStorySection={false} (see
 * app/admin/artworks/[artwork_id]/page.tsx) so its Story fields never
 * collide with ArtworkAdminFieldsForm's own curatorial editors just above.
 *
 * Deliberately never touches `status` -- fixing a typo shouldn't silently
 * move an artwork through the review queue.
 */
export async function updateArtworkAsAdminAction(
  artworkId: string,
  _prevState: ArtworkCoreFieldsFormState,
  formData: FormData
): Promise<ArtworkCoreFieldsFormState> {
  await requireAdmin();

  const existing = await getArtworkById(artworkId, { requireApproved: false });
  if (!existing) {
    return { error: "That artwork could not be found.", values: extractArtworkFormValues(formData) };
  }

  const parsed = parseArtworkForm(formData);
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error), values: extractArtworkFormValues(formData) };
  }

  // Same "no new file chosen = keep the existing image" convention as the
  // artist's own updateArtworkAction.
  let imageUrl: string | undefined;
  let colorAnalysis: ColorAnalysisResult | null | undefined;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const saved = await saveArtworkImage(imageFile, artworkId);
      imageUrl = saved.url;
      colorAnalysis = saved.colorAnalysis;
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return { fieldErrors: { image: err.message }, values: extractArtworkFormValues(formData) };
      }
      console.error(
        `[admin] failed to save artwork image for artwork ${artworkId}:`,
        err instanceof Error ? err.message : err
      );
      return {
        fieldErrors: { image: "We couldn't save that image right now (upload failed). Please try again." },
        values: extractArtworkFormValues(formData),
      };
    }
  }

  await updateArtworkAsAdmin(artworkId, {
    title: parsed.data.title,
    category: parsed.data.category,
    subcategory: parsed.data.subcategory,
    price: parsed.data.price,
    year: parsed.data.year,
    dimensions: parsed.data.dimensions,
    place: parsed.data.place,
    partOfCollection: parsed.data.partOfCollection,
    collectionName: parsed.data.collectionName,
    shortDescription: parsed.data.shortDescription,
    description: parsed.data.description,
    featureImageUrl: imageUrl,
    colorAnalysis,
    // technique_highlight/historicalContext/symbolism/compositionAnalysis/
    // culturalSignificance intentionally omitted -- see this action's own
    // doc comment above. parsed.data does carry them (parseArtworkForm is
    // shared with the artist form's full field set), they're just never
    // forwarded here so updateArtworkAsAdmin leaves those columns alone.
  });

  if (imageUrl !== undefined && imageUrl !== existing.feature_image_url) {
    await deleteManagedImage(existing.feature_image_url);
  }

  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
  return { success: true };
}
