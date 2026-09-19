"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseArtworkForm, zodFieldErrors, extractArtworkFormValues } from "@/lib/validation/artwork";
import {
  requireActiveArtistForMutation,
  ArtistSuspendedError,
} from "@/lib/auth/session";
import {
  createArtwork,
  updateOwnedArtwork,
  deleteOwnedArtwork,
  submitOwnedArtwork,
  getOwnedArtwork,
} from "@/lib/queries/artworkMutations";
import { getArtistById } from "@/lib/queries/artists";
import { randomUUID } from "node:crypto";
import { saveArtworkImage, deleteManagedImage, UploadValidationError } from "@/lib/uploads";
import type { ColorAnalysisResult } from "@/lib/color-analysis";
import { stripImageVersion } from "@/lib/utils";

export interface ArtworkFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Optional, and never set by this file's own actions today (they redirect
   *  or return {} on success) -- present so this same state shape also
   *  covers app/admin/artworks/actions.ts's updateArtworkAsAdminAction,
   *  which reuses this exact <ArtworkForm> component (see
   *  components/artist/ArtworkForm.tsx) and DOES set it, to show a "Saved"
   *  confirmation on the admin review screen. */
  success?: boolean;
  /** Raw submitted values for the form's plain fields (title/price/year/
   *  place/shortDescription), echoed back on every non-redirect return so
   *  <ArtworkForm> can restore exactly what the artist typed after a failed
   *  submission -- see extractArtworkFormValues' doc comment in
   *  lib/validation/artwork.ts for why this is necessary at all (React 19
   *  resets a form's own uncontrolled fields after any action call that
   *  doesn't throw, success or not). */
  values?: Record<string, string>;
}

export async function createArtworkAction(
  _prevState: ArtworkFormState,
  formData: FormData
): Promise<ArtworkFormState> {
  let user;
  try {
    user = await requireActiveArtistForMutation();
  } catch (err) {
    if (err instanceof ArtistSuspendedError) {
      return { error: err.message, values: extractArtworkFormValues(formData) };
    }
    throw err;
  }

  const parsed = parseArtworkForm(formData);
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error), values: extractArtworkFormValues(formData) };
  }

  // A submission with no photo at all isn't reviewable — catch it here
  // with a clear message rather than silently creating an imageless entry.
  const imageFile = formData.get("image");
  const hasImage = imageFile instanceof File && imageFile.size > 0;
  if (!hasImage) {
    return {
      fieldErrors: { image: "Please add a photo of the artwork." },
      values: extractArtworkFormValues(formData),
    };
  }

  // Generated up front (rather than left to createArtwork()'s own
  // default) so the feature image can be uploaded under a stable,
  // artwork-scoped path — artworks/<artworkId>.webp — before the row
  // exists, and the same ID is then passed through to createArtwork().
  const artworkId = randomUUID();

  let imageUrl: string | null = null;
  // Automatic — the artist never enters colors manually. A failed
  // analysis (see lib/uploads.ts) just leaves this null; it never blocks
  // artwork creation.
  let colorAnalysis: ColorAnalysisResult | null = null;
  try {
    const saved = await saveArtworkImage(imageFile as File, artworkId);
    imageUrl = saved.url;
    colorAnalysis = saved.colorAnalysis;
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return { fieldErrors: { image: err.message }, values: extractArtworkFormValues(formData) };
    }
    // A misconfigured/unreachable remote image host must never silently
    // abort the whole save with no visible error -- surface it instead
    // of letting it bubble up past this action.
    console.error(
      `[artworks] failed to save artwork image for artwork ${artworkId}:`,
      err instanceof Error ? err.message : err
    );
    return {
      fieldErrors: { image: "We couldn't save that image right now (upload failed). Please try again." },
      values: extractArtworkFormValues(formData),
    };
  }

  // Snapshot the artist's current display name onto the artwork row —
  // read all over the public site (SEO title, structured data, cards,
  // search) and previously left NULL forever for portal-created artworks
  // since nothing wrote it. One extra lookup, only at creation time.
  const artist = await getArtistById(user.artist_id as string);

  await createArtwork(
    user.artist_id as string,
    {
      title: parsed.data.title,
      artistName: artist?.name ?? null,
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
      techniqueHighlight: parsed.data.techniqueHighlight,
      historicalContext: parsed.data.historicalContext,
      symbolism: parsed.data.symbolism,
      compositionAnalysis: parsed.data.compositionAnalysis,
      culturalSignificance: parsed.data.culturalSignificance,
      featureImageUrl: imageUrl,
    },
    // Straight to "approved" -- the artist's own submission goes live on
    // Aartverse.com immediately, no admin review step in between. Admin's
    // remaining artwork-level tools are curatorial (the "impactful" flag,
    // see components/admin/ImpactfulToggle.tsx) and, for the rare
    // submission that turns out not to be genuine, outright removal (see
    // deleteArtworkAsAdminAction) -- not a gate every new piece must first
    // pass through. "draft" still exists as a status (any artwork created
    // before this change, or a future save-without-submitting path, can
    // still use it), it's just never the outcome of this action anymore.
    "approved",
    colorAnalysis,
    artworkId
  );

  revalidatePath("/artist/artworks");
  revalidatePath("/admin/artworks");
  redirect(`/artist/artworks/${artworkId}/edit?submitted=1`);
}

export async function updateArtworkAction(
  artworkId: string,
  _prevState: ArtworkFormState,
  formData: FormData
): Promise<ArtworkFormState> {
  let user;
  try {
    user = await requireActiveArtistForMutation();
  } catch (err) {
    if (err instanceof ArtistSuspendedError) {
      return { error: err.message, values: extractArtworkFormValues(formData) };
    }
    throw err;
  }

  // Ownership check: this artwork must belong to the calling artist.
  const owned = await getOwnedArtwork(artworkId, user.artist_id as string);
  if (!owned) {
    return { error: "That artwork could not be found.", values: extractArtworkFormValues(formData) };
  }

  const parsed = parseArtworkForm(formData);
  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error), values: extractArtworkFormValues(formData) };
  }

  // An artwork can only reach this form once it already has an image (see
  // createArtworkAction), so unlike create, no image chosen here just
  // means "keep the existing one" — never a hard requirement on its own.
  let imageUrl: string | undefined;
  // Left undefined when no new image was uploaded, so updateOwnedArtwork
  // leaves the existing color_analysis / artwork_colors data untouched.
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
      // A misconfigured/unreachable remote image host must never silently
      // abort the whole save with no visible error -- surface it instead
      // of letting it bubble up past this action.
      console.error(
        `[artworks] failed to save artwork image for artwork ${artworkId}:`,
        err instanceof Error ? err.message : err
      );
      return {
        fieldErrors: { image: "We couldn't save that image right now (upload failed). Please try again." },
        values: extractArtworkFormValues(formData),
      };
    }
  }

  await updateOwnedArtwork(artworkId, user.artist_id as string, {
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
    techniqueHighlight: parsed.data.techniqueHighlight,
    historicalContext: parsed.data.historicalContext,
    symbolism: parsed.data.symbolism,
    compositionAnalysis: parsed.data.compositionAnalysis,
    culturalSignificance: parsed.data.culturalSignificance,
    featureImageUrl: imageUrl,
    colorAnalysis,
  });

  // Clean up the replaced image only after the DB row is safely pointing
  // at the new one — if the update above had thrown, we'd keep both files
  // rather than risk deleting the one still referenced by the row.
  if (imageUrl !== undefined && stripImageVersion(imageUrl) !== stripImageVersion(owned.feature_image_url)) {
    await deleteManagedImage(owned.feature_image_url);
  }

  revalidatePath("/artist/artworks");
  revalidatePath(`/artist/artworks/${artworkId}/edit`);
  // A legacy-rejected artwork auto-republishes on edit (see
  // updateOwnedArtwork), which admin's list/detail views also reflect.
  revalidatePath("/admin/artworks");
  revalidatePath(`/admin/artworks/${artworkId}`);
  return {};
}

export async function deleteArtworkAction(artworkId: string): Promise<void> {
  const user = await requireActiveArtistForMutation();
  const owned = await getOwnedArtwork(artworkId, user.artist_id as string);
  const deleted = await deleteOwnedArtwork(artworkId, user.artist_id as string);
  // Only remove the image file once the row itself is confirmed gone —
  // and only the file this artwork actually owned.
  if (deleted && owned) {
    await deleteManagedImage(owned.feature_image_url);
  }
  revalidatePath("/artist/artworks");
  revalidatePath("/admin/artworks");
  redirect("/artist/artworks");
}

/** Manual "Publish"/"Resubmit" fallback for any artwork not already moved
 *  to "approved" by createArtworkAction/updateOwnedArtwork's auto-republish
 *  -- a leftover "draft" row from before this change, or a legacy rejected
 *  piece the artist wants live unchanged (without needing to edit something
 *  first just to trigger the auto-republish). See submitOwnedArtwork. */
export async function submitArtworkAction(artworkId: string): Promise<void> {
  const user = await requireActiveArtistForMutation();
  await submitOwnedArtwork(artworkId, user.artist_id as string);
  revalidatePath("/artist/artworks");
  revalidatePath(`/artist/artworks/${artworkId}/edit`);
  revalidatePath("/admin/artworks");
}
