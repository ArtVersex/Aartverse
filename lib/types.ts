/**
 * TypeScript mirrors of the existing MariaDB schema.
 *
 * IMPORTANT: these types describe the database exactly as it already
 * exists. Do not rename fields here to "prettier" names — keep them
 * matching the real columns so the query layer stays a thin, honest
 * mirror of the schema.
 */

/** Row shape of the `artworks` table. */
export interface ArtworkRow {
  artwork_id: string;
  title: string;
  artist_id: string | null;
  artist_name: string | null;
  category: string | null;
  category_id: string | null;
  subcategory: string | null;
  price: number | null;
  year: number | null;
  in_stock: number | null; // tinyint 0/1
  place: string | null;
  impactful: number | null; // tinyint 0/1
  /** Manual rank among featured (impactful) artworks for the home page rail
   *  -- lower is better (1 = the single best pick), NULL = not manually
   *  ranked (backfills the rest of the rail by recency). See
   *  lib/queries/artworks.ts#getFeaturedArtworks. */
  feature_rank: number | null;
  part_of_collection: number | null; // tinyint 0/1
  collection_name: string | null;
  certificate_number: string | null;
  dimensions: string | null;
  feature_image_url: string | null;
  short_description: string | null;
  description: string | null;
  technique_highlight: string | null;
  historical_context: string | null;
  symbolism: string | null;
  composition_analysis: string | null;
  cultural_significance: string | null;
  timestamp_create: string | null;
  color_analysis: string | null; // raw JSON text
  created_at: string | null;
  updated_at: string | null;
  // --- added for the artist self-serve submission workflow ---
  status: ArtworkStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/** Row shape of the `artists` table. */
export interface ArtistRow {
  artist_id: string;
  name: string;
  slug: string;
  artist_statement: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  mediums: string | null;
  website: string | null;
  instagram: string | null;
  /** Raw 10-digit Indian mobile number, no "+91"/spaces (see lib/validation/auth.ts). */
  phone: string | null;
  /** Same format as `phone`. May equal `phone` (artist chose "same as phone") or differ. */
  whatsapp: string | null;
  // --- optional professional-profile fields (never required for
  // registration/submission) -- see the "Professional profile" section of
  // components/artist/ProfileForm.tsx and the Artist Profile PDF builder.
  /** Longer-form biography -- distinct from `artist_statement` above, which
   *  is the short curatorial line shown on the public artist page. */
  bio: string | null;
  professional_experience: string | null;
  /** JSON array of {label, url} objects, e.g. Instagram/Behance/LinkedIn --
   *  encoded/decoded via lib/utils.ts#parseSocialLinks/encodeSocialLinks,
   *  same convention as the existing `mediums` comma-list <-> JSON column. */
  social_links: string | null;
  additional_notes: string | null;
  featured: number | null; // tinyint 0/1
  /** Manual priority among featured artists -- higher shows first, NULL =
   *  no manual priority (falls back to alphabetical order). See
   *  lib/queries/artists.ts#getFeaturedArtists. */
  featured_priority: number | null;
  active: number | null; // tinyint 0/1
  created_at: string | null;
  updated_at: string | null;
}

/** One repeatable career-history entry (exhibition, education, award,
 *  residency, publication, or institutional collection) -- row shape of the
 *  `artist_career_entries` table. Deliberately NOT the same concept as
 *  ArtworkRow.collection_name/part_of_collection, which is an unrelated,
 *  pre-existing per-artwork "collection/series" idea. */
export type ArtistCareerEntryKind =
  | "exhibition"
  | "education"
  | "award"
  | "residency"
  | "publication"
  | "collection";

export interface ArtistCareerEntryRow {
  id: string;
  artist_id: string;
  kind: ArtistCareerEntryKind;
  /** Free-form, kind-specific sub-distinction -- today only used for
   *  exhibitions ("solo" | "group"), left as a plain nullable string so a
   *  future kind can introduce its own subtypes without a schema change. */
  subtype: string | null;
  title: string;
  organization: string | null;
  location: string | null;
  /** Deliberately flexible free text ("2019", "2018-2020", "Ongoing") rather
   *  than a strict year integer -- career history doesn't always fit one. */
  year_label: string | null;
  description: string | null;
  url: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

/** One entry in an artist's `social_links` JSON column. */
export interface SocialLink {
  label: string;
  url: string;
}

/** Row shape of the `artwork_colors` table. */
export interface ArtworkColorRow {
  id: number;
  artwork_id: string;
  color_name: string | null;
  color_family: string | null;
  color_scope: "family" | "dominant" | string;
  hex: string | null;
  proportion: number | null;
  rank_number: number | null;
  rgb_r: number | null;
  rgb_g: number | null;
  rgb_b: number | null;
}

/** Row shape of the `week_best_collections` table. */
export interface WeekBestCollectionRow {
  week_best_collection_id: string;
  collection_name: string;
  artist_id: string | null;
  week_of: string | null;
  label: string | null;
  headline: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Row shape of the `week_best_collection_artworks` table. */
export interface WeekBestCollectionArtworkRow {
  week_best_collection_id: string;
  artwork_id: string;
  sort_order: number;
}

/**
 * The `categories` and `collections` tables are not fully specified by the
 * project brief, so query helpers for them treat rows as loosely-typed
 * records and read whichever of the common column names is actually
 * present (see lib/queries/categories.ts). This type documents that
 * intentional flexibility rather than guessing an exact shape.
 */
export type LooseRow = Record<string, unknown>;

/** Parsed shape we expect *inside* the `color_analysis` JSON column. */
export interface ColorAnalysis {
  palette_name?: string;
  mood?: string;
  dominant_colors?: Array<{
    name?: string;
    hex?: string;
    proportion?: number;
  }>;
  [key: string]: unknown;
}

/** Everything the artwork detail + card views need, already joined/parsed. */
export interface ArtworkListItem extends ArtworkRow {
  dominant_color_hex: string | null;
  /** Slug of the linked row in `artists`, if one exists — used to link a
   *  card to /artists/[slug]. Null for artworks whose artist_id doesn't
   *  (yet) match a row in `artists` (fallback artist records). */
  artist_slug: string | null;
  /** Only populated when a color-family filter is active: the hex + share
   *  (0-1) of that color family within this artwork, so results can be
   *  ranked and labeled by how strongly they match. */
  color_match_hex: string | null;
  color_match_proportion: number | null;
}

export interface ArtworkDetail extends ArtworkRow {
  colors: ArtworkColorRow[];
  parsed_color_analysis: ColorAnalysis | null;
  artist_slug: string | null;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* -------------------------------------------------------------------------
 * Auth / artist-onboarding tables (added alongside the auth system).
 * ---------------------------------------------------------------------- */

export type UserRole = "artist" | "admin";
export type UserStatus = "pending" | "active" | "suspended";

/** Row shape of the `users` table. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  role: UserRole;
  status: UserStatus;
  email_verified_at: string | null;
  image: string | null;
  artist_id: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape of the `accounts` table (OAuth provider links). */
export interface AccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  created_at: string;
}

export type ArtworkStatus = "draft" | "pending" | "approved" | "rejected";
