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
  featured: number | null; // tinyint 0/1
  active: number | null; // tinyint 0/1
  created_at: string | null;
  updated_at: string | null;
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
