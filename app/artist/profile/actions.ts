"use server";

import { revalidatePath } from "next/cache";
import {
  artistProfileSchema,
  extractProfileFormValues,
  parseCareerEntriesField,
} from "@/lib/validation/auth";
import { requireActiveArtistForMutation, ArtistSuspendedError } from "@/lib/auth/session";
import { updateArtistProfile } from "@/lib/queries/artistAccounts";
import { getArtistById } from "@/lib/queries/artists";
import { replaceCareerEntries } from "@/lib/queries/artistCareerEntries";
import { saveArtistProfileImage, deleteManagedImage, UploadValidationError } from "@/lib/uploads";
import { encodeSocialLinks, parseSocialLinks, stripImageVersion } from "@/lib/utils";

export interface ProfileFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Raw submitted values for the form's plain text fields, echoed back on
   *  every non-success return -- see extractProfileFormValues in
   *  lib/validation/auth.ts. */
  values?: Record<string, string>;
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  let user;
  try {
    user = await requireActiveArtistForMutation();
  } catch (err) {
    if (err instanceof ArtistSuspendedError) {
      return { error: err.message, values: extractProfileFormValues(formData) };
    }
    throw err;
  }

  // Digits only: strips whatever the artist typed around the number
  // (spaces, dashes, a pasted "+91") before validating against the plain
  // 10-digit format stored in the DB.
  const digitsOnly = (value: FormDataEntryValue | null): string | null => {
    if (typeof value !== "string") return null;
    const cleaned = value.replace(/\D/g, "");
    return cleaned ? cleaned : null;
  };

  const phone = digitsOnly(formData.get("phone"));
  // "WhatsApp same as phone" checkbox: when checked, whatsapp always
  // mirrors phone (even if the artist leaves the separate field blank/
  // hidden) -- this is the common case and keeps the form simple.
  const whatsappSameAsPhone = formData.get("whatsappSameAsPhone") === "on";
  const whatsapp = whatsappSameAsPhone ? phone : digitsOnly(formData.get("whatsapp"));

  const parsed = artistProfileSchema.safeParse({
    artistStatement: formData.get("artistStatement") || null,
    location: formData.get("location") || null,
    mediums: formData.get("mediums") || null,
    website: formData.get("website") || null,
    instagram: formData.get("instagram") || null,
    phone,
    whatsapp,
    bio: formData.get("bio") || null,
    professionalExperience: formData.get("professionalExperience") || null,
    additionalNotes: formData.get("additionalNotes") || null,
    socialLinks: formData.get("socialLinks") || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? "form";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors, values: extractProfileFormValues(formData) };
  }

  const artistId = user.artist_id as string;
  // Needed so a replaced profile/cover photo can delete the OLD file
  // afterward instead of leaving it behind forever (see deleteManagedImage
  // in lib/uploads.ts) -- read before any upload so we still have the
  // pre-update URLs to compare against.
  const currentArtist = await getArtistById(artistId);

  const updates: Parameters<typeof updateArtistProfile>[1] = {
    artist_statement: parsed.data.artistStatement,
    location: parsed.data.location,
    mediums: parsed.data.mediums,
    website: parsed.data.website,
    instagram: parsed.data.instagram,
    phone: parsed.data.phone,
    whatsapp: parsed.data.whatsapp,
    bio: parsed.data.bio,
    professional_experience: parsed.data.professionalExperience,
    additional_notes: parsed.data.additionalNotes,
    // Re-parsed and re-encoded (rather than stored as submitted) so a
    // stray malformed entry from the hidden input is quietly dropped
    // instead of ever reaching the database -- see
    // lib/utils.ts#parseSocialLinks/encodeSocialLinks.
    social_links: encodeSocialLinks(parseSocialLinks(parsed.data.socialLinks)),
  };

  const profileImage = formData.get("profileImage");
  if (profileImage instanceof File && profileImage.size > 0) {
    try {
      updates.profile_image_url = await saveArtistProfileImage(profileImage, artistId, "profile");
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return {
          fieldErrors: { profileImage: err.message },
          values: extractProfileFormValues(formData),
        };
      }
      // A misconfigured/unreachable remote image host (bad FTP creds,
      // wrong directory, network issue) must never silently swallow the
      // whole profile save -- surface it as a visible field error instead
      // of letting it bubble up and abort the action before
      // updateArtistProfile() below ever runs (which would otherwise look
      // like "nothing happened" with no error and no DB change).
      console.error(
        `[profile] failed to save profile photo for artist ${artistId}:`,
        err instanceof Error ? err.message : err
      );
      return {
        fieldErrors: {
          profileImage: "We couldn't save that image right now (upload failed). Please try again.",
        },
        values: extractProfileFormValues(formData),
      };
    }
  }

  const coverImage = formData.get("coverImage");
  if (coverImage instanceof File && coverImage.size > 0) {
    try {
      updates.cover_image_url = await saveArtistProfileImage(coverImage, artistId, "cover");
    } catch (err) {
      if (err instanceof UploadValidationError) {
        return {
          fieldErrors: { coverImage: err.message },
          values: extractProfileFormValues(formData),
        };
      }
      console.error(
        `[profile] failed to save cover photo for artist ${artistId}:`,
        err instanceof Error ? err.message : err
      );
      return {
        fieldErrors: {
          coverImage: "We couldn't save that image right now (upload failed). Please try again.",
        },
        values: extractProfileFormValues(formData),
      };
    }
  }

  await updateArtistProfile(artistId, updates);

  // Every repeatable career-history list saves alongside the rest of this
  // form in one submit -- see replaceCareerEntries' doc comment for why
  // this one call covers all six kinds atomically. Parsed defensively (see
  // parseCareerEntriesField): a malformed entry in any one list is simply
  // dropped, never a reason to fail this whole save.
  await replaceCareerEntries(artistId, {
    exhibition: parseCareerEntriesField(formData, "exhibitions"),
    education: parseCareerEntriesField(formData, "education"),
    award: parseCareerEntriesField(formData, "awards"),
    residency: parseCareerEntriesField(formData, "residencies"),
    publication: parseCareerEntriesField(formData, "publications"),
    collection: parseCareerEntriesField(formData, "institutionalCollections"),
  });

  // Only remove the OLD files once the new URLs are safely saved, and only
  // when a new file actually replaced them.
  if (
    updates.profile_image_url !== undefined &&
    stripImageVersion(updates.profile_image_url) !== stripImageVersion(currentArtist?.profile_image_url)
  ) {
    await deleteManagedImage(currentArtist?.profile_image_url);
  }
  if (
    updates.cover_image_url !== undefined &&
    stripImageVersion(updates.cover_image_url) !== stripImageVersion(currentArtist?.cover_image_url)
  ) {
    await deleteManagedImage(currentArtist?.cover_image_url);
  }

  revalidatePath("/artist/dashboard");
  revalidatePath("/artist/profile");
  // The public artist page is ISR-cached for 5 minutes (see
  // `revalidate = 300` in app/artists/[slug]/page.tsx) and this action was
  // never busting that specific cache -- so a save could take up to 5
  // minutes to show up on the artist's live public page even though the
  // database write itself happened immediately.
  if (currentArtist?.slug) {
    revalidatePath(`/artists/${currentArtist.slug}`);
  }

  return { success: true };
}
