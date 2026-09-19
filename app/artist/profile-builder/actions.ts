"use server";

import { revalidatePath } from "next/cache";
import { requireActiveArtistForMutation, ArtistSuspendedError } from "@/lib/auth/session";
import { updateArtistProfile } from "@/lib/queries/artistAccounts";
import { replaceCareerEntries, type CareerEntryInput } from "@/lib/queries/artistCareerEntries";
import { plainTextToParagraphsHtml } from "@/lib/pdf/profileDraft";
import { encodeSocialLinks } from "@/lib/utils";
import type { SocialLink } from "@/lib/types";

export interface SaveProfileDraftInput {
  location: string;
  /** Omitted when the artist never touched this field in the builder, so
   *  the caller (ArtistProfileBuilder.tsx) can leave the artist's original
   *  saved HTML untouched instead of round-tripping it through plain text --
   *  see plainTextToParagraphsHtml's doc comment and htmlToPlainText in
   *  lib/pdf/profileDraft.ts for why that round trip is lossy (it drops
   *  bold/italic/headings/lists and can merge separate paragraphs). */
  bio?: string;
  artistStatement?: string;
  professionalExperience?: string;
  website: string;
  instagram: string;
  socialLinks: SocialLink[];
  education: CareerEntryInput[];
  exhibitions: CareerEntryInput[];
  awards: CareerEntryInput[];
  residencies: CareerEntryInput[];
  publications: CareerEntryInput[];
  institutionalCollections: CareerEntryInput[];
}

export interface SaveProfileDraftResult {
  success?: boolean;
  error?: string;
}

/**
 * Trims and caps a string to a generous max length -- lightweight
 * defensive sanitization rather than full form validation, since every
 * field this action touches is optional and this only ever runs for an
 * authenticated artist editing their own data. Never rejects a save
 * outright the way a public-facing form would -- consistent with this
 * whole feature's "optional fields never block" rule.
 */
function clamp(value: string, max: number): string | null {
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}

/**
 * The ONE path by which anything edited in the Artist Profile PDF builder
 * (app/artist/profile-builder) can reach the artist's real saved profile --
 * called only when the artist checks "Also save these changes to my Artist
 * Profile" on the Preview/Download step. Everything else the builder lets
 * an artist change is intentionally never persisted here:
 *
 *   - The artist name shown on the document -- a real name change has
 *     wider implications (slug, display everywhere) outside this
 *     feature's scope.
 *   - Which artworks were selected -- specific to one downloaded document,
 *     not a profile-level setting.
 *
 * Rich-text fields (bio/artist statement/professional experience) are
 * edited as plain text inside the builder (see lib/pdf/profileDraft.ts's
 * doc comment for why) and converted back to the same minimal
 * paragraph-per-blank-line HTML the rest of the app already stores for
 * these columns before being saved here -- but only when the artist
 * actually edited that field in the builder (input.bio etc. is undefined
 * otherwise). A field left untouched keeps its original HTML exactly as
 * saved, rather than being flattened to plain text and rebuilt, which
 * would silently drop any bold/italic/heading/list formatting and could
 * merge separate paragraphs into one -- see ArtistProfileBuilder.tsx's
 * handleSaveToProfile for where "touched vs. untouched" is decided.
 */
export async function saveProfileDraftAction(
  input: SaveProfileDraftInput
): Promise<SaveProfileDraftResult> {
  let user;
  try {
    user = await requireActiveArtistForMutation();
  } catch (err) {
    if (err instanceof ArtistSuspendedError) return { error: err.message };
    throw err;
  }

  const artistId = user.artist_id as string;

  await updateArtistProfile(artistId, {
    location: clamp(input.location, 255),
    website: clamp(input.website, 500),
    instagram: clamp(input.instagram, 255),
    social_links: encodeSocialLinks(input.socialLinks),
    ...(input.artistStatement !== undefined
      ? { artist_statement: plainTextToParagraphsHtml(input.artistStatement) }
      : {}),
    ...(input.bio !== undefined ? { bio: plainTextToParagraphsHtml(input.bio) } : {}),
    ...(input.professionalExperience !== undefined
      ? { professional_experience: plainTextToParagraphsHtml(input.professionalExperience) }
      : {}),
  });

  await replaceCareerEntries(artistId, {
    education: input.education,
    exhibition: input.exhibitions,
    award: input.awards,
    residency: input.residencies,
    publication: input.publications,
    collection: input.institutionalCollections,
  });

  revalidatePath("/artist/profile");
  revalidatePath("/artist/dashboard");
  revalidatePath("/artist/profile-builder");

  return { success: true };
}
