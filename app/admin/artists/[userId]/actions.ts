"use server";

import { revalidatePath } from "next/cache";
import {
  artistProfileSchema,
  extractProfileFormValues,
  parseCareerEntriesField,
} from "@/lib/validation/auth";
import { requireAdmin } from "@/lib/auth/session";
import { getUserById, updateUserName } from "@/lib/queries/users";
import { updateArtistProfile } from "@/lib/queries/artistAccounts";
import { getArtistById } from "@/lib/queries/artists";
import { replaceCareerEntries } from "@/lib/queries/artistCareerEntries";
import { saveArtistProfileImage, deleteManagedImage, UploadValidationError } from "@/lib/uploads";
import { encodeSocialLinks, parseSocialLinks, stripImageVersion } from "@/lib/utils";
import type { ProfileFormState } from "@/app/artist/profile/actions";

/**
 * Admin-side twin of app/artist/profile/actions.ts#updateProfileAction --
 * identical validation, identical fields (including the artist's name --
 * see lib/queries/users.ts#updateUserName), identical career-entries/image-
 * upload handling, but gated on requireAdmin() instead of
 * requireActiveArtistForMutation(), and operating on an explicit target
 * userId rather than the logged-in session's own account.
 *
 * Exists because artists can and do make mistakes in their own profile
 * (a typo, a wrong number, an outdated bio) that our team needs to be able
 * to fix directly from /admin/artists/[userId], without routing every small
 * correction back through the artist themselves. Reuses <ProfileForm>
 * itself (same "action as a prop" shape as ArtworkForm -- see that
 * component's own comment) rather than a second, easily-out-of-sync copy of
 * the form.
 *
 * Bound to a specific userId via .bind(null, userId) wherever it's handed
 * to <ProfileForm> (see app/admin/artists/[userId]/page.tsx) -- same
 * pattern as updateArtworkAsAdminAction in app/admin/artworks/actions.ts.
 */
export async function updateArtistProfileAsAdminAction(
  userId: string,
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  await requireAdmin();

  const target = await getUserById(userId);
  if (!target || target.role !== "artist" || !target.artist_id) {
    return { error: "That artist account could not be found." };
  }

  const digitsOnly = (value: FormDataEntryValue | null): string | null => {
    if (typeof value !== "string") return null;
    const cleaned = value.replace(/\D/g, "");
    return cleaned ? cleaned : null;
  };

  const phone = digitsOnly(formData.get("phone"));
  const whatsappSameAsPhone = formData.get("whatsappSameAsPhone") === "on";
  const whatsapp = whatsappSameAsPhone ? phone : digitsOnly(formData.get("whatsapp"));
  const nameRaw = formData.get("name");

  const parsed = artistProfileSchema.safeParse({
    name: typeof nameRaw === "string" ? nameRaw : "",
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

  const artistId = target.artist_id;
  // Needed so a replaced profile/cover photo can delete the OLD file
  // afterward -- same reasoning as the artist's own action.
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
      console.error(
        `[admin-artist-profile] failed to save profile photo for artist ${artistId}:`,
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
        `[admin-artist-profile] failed to save cover photo for artist ${artistId}:`,
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

  if (parsed.data.name !== target.name) {
    await updateUserName(target.id, parsed.data.name);
  }

  await updateArtistProfile(artistId, updates);

  await replaceCareerEntries(artistId, {
    exhibition: parseCareerEntriesField(formData, "exhibitions"),
    education: parseCareerEntriesField(formData, "education"),
    award: parseCareerEntriesField(formData, "awards"),
    residency: parseCareerEntriesField(formData, "residencies"),
    publication: parseCareerEntriesField(formData, "publications"),
    collection: parseCareerEntriesField(formData, "institutionalCollections"),
  });

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

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${userId}`);
  // Same public/artist-facing cache busting as the artist's own save, so an
  // admin's correction shows up immediately everywhere too.
  revalidatePath("/artist/dashboard");
  revalidatePath("/artist/profile");
  revalidatePath("/artists");
  revalidatePath("/");
  if (currentArtist?.slug) {
    revalidatePath(`/artists/${currentArtist.slug}`);
  }

  return { success: true };
}
