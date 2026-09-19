import { z } from "zod";
import type { CareerEntryInput } from "@/lib/queries/artistCareerEntries";

/** Kept in sync with lib/auth/password.ts#isPasswordStrongEnough. */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: "Password must contain at least one letter and one number.",
  });

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(255),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** 10-digit Indian mobile number, no country code/spaces -- e.g. "9876543210". */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

const indianMobileField = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || INDIAN_MOBILE_REGEX.test(v), {
    message: "Enter a valid 10-digit Indian mobile number.",
  });

export const artistProfileSchema = z.object({
  // Now authored as rich text (components/RichTextEditor.tsx) -- raised
  // from 4000 since HTML markup adds overhead well beyond the visible
  // text length, matching the artwork rich-text fields in
  // lib/validation/artwork.ts.
  artistStatement: z.string().trim().max(8000).optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  mediums: z.string().trim().max(1000).optional().nullable(),
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: "Website must start with http:// or https://",
    }),
  instagram: z.string().trim().max(255).optional().nullable(),
  phone: indianMobileField,
  whatsapp: indianMobileField,
  // --- optional professional-profile fields (see
  // scripts/migrate.mjs#extendArtistsTableProfessional). Every one of these
  // is genuinely optional -- never required to register, submit artwork, or
  // save this form -- so validation here is limited to a generous length
  // cap, never a "this is required" rule. Also rich text, same as
  // artistStatement above.
  bio: z.string().trim().max(20_000).optional().nullable(),
  professionalExperience: z.string().trim().max(20_000).optional().nullable(),
  additionalNotes: z.string().trim().max(4000).optional().nullable(),
  // Raw JSON-encoded array from components/artist/SocialLinksFields.tsx's
  // hidden input -- re-parsed and re-encoded via
  // lib/utils.ts#parseSocialLinks/encodeSocialLinks in the action rather
  // than shape-validated here, so a stray malformed entry never blocks
  // saving the rest of the form.
  socialLinks: z.string().trim().max(10_000).optional().nullable(),
});

/**
 * Raw, unvalidated string values for <ProfileForm>'s plain text fields --
 * location, website, instagram, phone, whatsapp. Echoed back in
 * ProfileFormState whenever a submission fails, so the form can restore
 * exactly what the artist typed, mirroring extractArtworkFormValues in
 * lib/validation/artwork.ts (see that function's doc comment for why this
 * is needed: React resets a form's own uncontrolled fields after any
 * action call that doesn't throw, not only a failed one).
 *
 * phone/whatsapp are read here exactly as typed (spaces and all) rather
 * than through app/artist/profile/actions.ts's own digitsOnly() cleanup --
 * the goal is to restore what the artist actually typed, not the sanitized
 * value the schema validates.
 */
export function extractProfileFormValues(formData: FormData): Record<string, string> {
  const pick = (name: string): string => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    location: pick("location"),
    website: pick("website"),
    instagram: pick("instagram"),
    phone: pick("phone"),
    whatsapp: pick("whatsapp"),
    additionalNotes: pick("additionalNotes"),
  };
}

/**
 * Reads and defensively sanitizes one JSON-encoded career-entries list field
 * (one of exhibitions/education/awards/residencies/publications/
 * institutionalCollections -- see components/artist/CareerEntriesFields.tsx)
 * from FormData. Never throws and never blocks the save: input that's
 * missing, malformed, or not the expected shape simply becomes an empty
 * list, and an entry with a blank title is dropped. Deliberately NOT run
 * through the same zod safeParse as the rest of the profile form -- a
 * structural problem in one optional repeatable list must never prevent
 * saving everything else the artist typed, per the "optional fields never
 * block" rule this whole feature was built under.
 */
export function parseCareerEntriesField(formData: FormData, name: string): CareerEntryInput[] {
  const raw = formData.get(name);
  if (typeof raw !== "string" || !raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

  return parsed
    .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
    .map((v) => ({
      subtype: clean(v.subtype),
      title: clean(v.title) ?? "",
      organization: clean(v.organization),
      location: clean(v.location),
      yearLabel: clean(v.yearLabel),
      description: clean(v.description),
      url: clean(v.url),
    }))
    .filter((v) => v.title !== "")
    .slice(0, 100);
}

// Artwork submission/edit validation lives in lib/validation/artwork.ts --
// split out once that schema grew to cover the full form (essentials,
// descriptions, optional curatorial write-ups). Re-exported here so
// existing `from "@/lib/validation/auth"` imports keep working rather than
// needing to be hunted down and changed everywhere at once.
export { artworkSchema, artworkAdminFieldsSchema } from "./artwork";
export type { ArtworkInput, ArtworkAdminFieldsInput } from "./artwork";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
