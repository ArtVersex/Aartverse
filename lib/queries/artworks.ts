import "server-only";
import { query, queryOne } from "@/lib/db";
import type {
  ArtworkColorRow,
  ArtworkDetail,
  ArtworkListItem,
  PagedResult,
} from "@/lib/types";
import { parseColorAnalysis } from "@/lib/utils";

export type Availability = "in_stock" | "sold" | "all";

export type ArtworkSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "title_asc"
  /** Only meaningful together with `filters.colors`. Ranks by the combined
   *  share the selected color families make up of each piece (their
   *  `family`-scope proportions summed), strongest first. Pages fall back
   *  to "newest" when there's no active color filter to rank against. */
  | "color_match";

/** One selected color-family filter: match artworks where this family
 *  makes up at least `minProportion` percent (0-100) of the piece,
 *  according to its `artwork_colors` (`color_scope = 'family'`) row. */
export interface ColorFilterValue {
  family: string;
  minProportion: number;
}

export interface ArtworkFilters {
  /** Matches artworks.category (the plain text field) — this is the field
   *  actually populated/maintained today, so filtering goes through it
   *  rather than category_id. */
  category?: string;
  categoryId?: string;
  artistId?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
  availability?: Availability;
  collectionName?: string;
  /** Matches against subcategory with LIKE, since a single artwork can
   *  carry several comma-separated subcategory values (e.g.
   *  "Abstract, Portrait") — there's no normalized table to join against. */
  subcategory?: string;
  /** One or more color families an artwork must contain (each with its own
   *  minimum proportion threshold) — see ColorFilterValue. All of them must
   *  match (AND), not just one. */
  colors?: ColorFilterValue[];
  /** Free-text search across title / artist_name / category / subcategory. */
  search?: string;
  /** Restrict to artworks flagged impactful = 1. Every artwork-browsing
   *  surface on the site uses this (catalogue, category pages, search) —
   *  the one deliberate exception is a single artist's own page, which
   *  shows all of that artist's work (see `prioritizeImpactful` below
   *  instead, on that query). */
  impactfulOnly?: boolean;
}

const SORT_TO_ORDER_BY: Record<ArtworkSort, string> = {
  newest: "w.created_at DESC, w.artwork_id DESC",
  price_asc: "(w.price IS NULL), w.price ASC",
  price_desc: "(w.price IS NULL), w.price DESC",
  title_asc: "w.title ASC",
  color_match:
    "(color_match_proportion IS NULL), color_match_proportion DESC, w.created_at DESC",
};

/**
 * Builds the shared SELECT list used by every artwork read. When
 * `colorFamilies` is given, it also computes how much of those color
 * families (combined) show up in each artwork — hex + a summed proportion
 * — so results can be ranked and labeled by match strength when one or
 * more colors are selected in the discovery filter.
 */
function buildListSelect(colorFamilies?: string[]): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  let colorMatchColumns = "NULL AS color_match_hex, NULL AS color_match_proportion";

  if (colorFamilies && colorFamilies.length > 0) {
    const placeholders = colorFamilies.map(() => "?").join(",");
    colorMatchColumns = `
      (
        -- 'family' rows carry the precomputed match percentage but no hex of
        -- their own (see lib/queries/colors.ts) — the swatch color for the
        -- match badge comes from this artwork's own 'dominant' rows in the
        -- strongest selected family instead, so it's real, artwork-specific
        -- color, not a generic stand-in. Null here just means the badge
        -- shows text only.
        SELECT c.hex FROM artwork_colors c
        WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'dominant' AND c.color_family IN (${placeholders})
        ORDER BY c.proportion DESC, c.rank_number ASC LIMIT 1
      ) AS color_match_hex,
      (
        -- Combined share of the piece made up by every selected family —
        -- when only one color is selected this is just that family's own
        -- proportion, same as before. artwork_colors.proportion is stored as
        -- either a 0-1 fraction or a 0-100 percentage depending on how a
        -- given import ran, and that can't be told apart from a single
        -- value in isolation (a legitimate percentage-scale share can itself
        -- be under 1, e.g. 0.77%) — so the scale is decided once per artwork
        -- from the sum of ALL of its family rows together (which should add
        -- up to ~100 or ~1 as a whole), then applied to the selected-family
        -- sum below. This keeps the value this query returns already
        -- normalized to a 0-100 percentage, matching formatColorProportion's
        -- expectation (see lib/utils.ts).
        SELECT
          CASE
            WHEN (
              SELECT SUM(c2.proportion) FROM artwork_colors c2
              WHERE c2.artwork_id = w.artwork_id AND c2.color_scope = 'family'
            ) <= 1.5
            THEN SUM(c.proportion) * 100
            ELSE SUM(c.proportion)
          END
        FROM artwork_colors c
        WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'family' AND c.color_family IN (${placeholders})
      ) AS color_match_proportion
    `;
    params.push(...colorFamilies, ...colorFamilies);
  }

  const sql = `
    SELECT
      w.*,
      a.slug AS artist_slug,
      (
        SELECT c.hex FROM artwork_colors c
        WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'dominant'
        ORDER BY c.rank_number ASC LIMIT 1
      ) AS dominant_color_hex,
      ${colorMatchColumns}
    FROM artworks w
    LEFT JOIN artists a ON a.artist_id = w.artist_id
  `;

  return { sql, params };
}

/** The plain select, with no color-match ranking — used by every read that
 *  isn't the color-filterable catalogue itself (details, "more by this
 *  artist", related, featured, etc). */
const BASE_LIST_SELECT = buildListSelect().sql;

/** Builds a shared WHERE clause + params for both the list and count queries. */
function buildWhere(filters: ArtworkFilters): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.category) {
    clauses.push("w.category = ?");
    params.push(filters.category);
  }
  if (filters.categoryId) {
    clauses.push("w.category_id = ?");
    params.push(filters.categoryId);
  }
  if (filters.artistId) {
    clauses.push("w.artist_id = ?");
    params.push(filters.artistId);
  }
  if (filters.minPrice !== undefined) {
    clauses.push("w.price >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    clauses.push("w.price <= ?");
    params.push(filters.maxPrice);
  }
  if (filters.year !== undefined) {
    clauses.push("w.year = ?");
    params.push(filters.year);
  }
  if (filters.availability === "in_stock") {
    clauses.push("w.in_stock = 1");
  } else if (filters.availability === "sold") {
    clauses.push("w.in_stock = 0");
  }
  if (filters.collectionName) {
    clauses.push("w.part_of_collection = 1 AND w.collection_name = ?");
    params.push(filters.collectionName);
  }
  if (filters.subcategory) {
    // subcategory can hold several comma-separated values on one artwork
    // (e.g. "Abstract, Portrait") — LIKE keeps this working without a
    // normalized lookup table.
    clauses.push("w.subcategory LIKE ?");
    params.push(`%${filters.subcategory}%`);
  }
  for (const { family, minProportion } of filters.colors ?? []) {
    // Every selected color must match (AND, not OR) — each with its own
    // minimum share of the piece.
    clauses.push(
      "EXISTS (SELECT 1 FROM artwork_colors c WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'family' AND c.color_family = ? AND c.proportion >= ?)"
    );
    params.push(family, minProportion);
  }
  if (filters.search) {
    const like = `%${filters.search}%`;
    clauses.push(
      "(w.title LIKE ? OR w.artist_name LIKE ? OR w.category LIKE ? OR w.subcategory LIKE ? OR w.collection_name LIKE ?)"
    );
    params.push(like, like, like, like, like);
  }
  if (filters.impactfulOnly) {
    clauses.push("w.impactful = 1");
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export async function getArtworks(options: {
  filters?: ArtworkFilters;
  sort?: ArtworkSort;
  page?: number;
  pageSize?: number;
  /** Don't restrict to impactful = 1, but still list impactful artworks
   *  first, then everything else (ties broken by the normal sort). Used
   *  only by a single artist's own page, which is the one place that
   *  should show all of that artist's work rather than just the
   *  impactful-flagged pieces. */
  prioritizeImpactful?: boolean;
}): Promise<PagedResult<ArtworkListItem>> {
  const filters = options.filters ?? {};
  const hasColors = (filters.colors?.length ?? 0) > 0;
  const sort: ArtworkSort =
    options.sort === "color_match" && !hasColors ? "newest" : options.sort ?? "newest";
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, options.pageSize ?? 24));
  const offset = (page - 1) * pageSize;

  const { sql: whereSql, params: whereParams } = buildWhere(filters);
  const { sql: selectSql, params: selectParams } = buildListSelect(
    filters.colors?.map((c) => c.family)
  );
  const baseOrderBy = SORT_TO_ORDER_BY[sort] ?? SORT_TO_ORDER_BY.newest;
  const orderBy = options.prioritizeImpactful
    ? `(w.impactful = 1) DESC, ${baseOrderBy}`
    : baseOrderBy;

  const [items, totalRow] = await Promise.all([
    query<ArtworkListItem>(
      `${selectSql} ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...selectParams, ...whereParams, pageSize, offset]
    ),
    queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total FROM artworks w ${whereSql}`,
      whereParams
    ),
  ]);

  const total = totalRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return { items, page, pageSize, total, totalPages };
}

export async function getArtworkById(
  artworkId: string
): Promise<ArtworkDetail | null> {
  const row = await queryOne<
    Omit<ArtworkDetail, "colors" | "parsed_color_analysis">
  >(
    `${BASE_LIST_SELECT} WHERE w.artwork_id = ? LIMIT 1`,
    [artworkId]
  );
  if (!row) return null;

  const colors = await query<ArtworkColorRow>(
    `SELECT * FROM artwork_colors WHERE artwork_id = ? ORDER BY color_scope ASC, rank_number ASC`,
    [artworkId]
  );

  return {
    ...row,
    colors,
    parsed_color_analysis: parseColorAnalysis(row.color_analysis),
  };
}

/** Other artworks by the same artist, excluding the one currently shown.
 *  Restricted to impactful = 1, like every other artwork-browsing rail —
 *  the "show everything" exception applies only to the artist's own full
 *  profile page (see `getArtworks({ prioritizeImpactful: true })`), not to
 *  this "More by this artist" teaser rail. */
export async function getMoreByArtist(
  artistId: string,
  excludeArtworkId: string,
  limit = 8
): Promise<ArtworkListItem[]> {
  return query<ArtworkListItem>(
    `${BASE_LIST_SELECT} WHERE w.artist_id = ? AND w.artwork_id != ? AND w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
    [artistId, excludeArtworkId, limit]
  );
}

/** Artworks in the same category, excluding the one currently shown. Matches
 *  on the plain `category` text field — see the note on ArtworkFilters.category.
 *  Restricted to impactful = 1, like every other artwork-browsing rail. */
export async function getRelatedArtworks(
  categoryId: string | null,
  category: string | null,
  excludeArtworkId: string,
  limit = 8
): Promise<ArtworkListItem[]> {
  if (category) {
    return query<ArtworkListItem>(
      `${BASE_LIST_SELECT} WHERE w.category = ? AND w.artwork_id != ? AND w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
      [category, excludeArtworkId, limit]
    );
  }
  if (categoryId) {
    return query<ArtworkListItem>(
      `${BASE_LIST_SELECT} WHERE w.category_id = ? AND w.artwork_id != ? AND w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
      [categoryId, excludeArtworkId, limit]
    );
  }
  return [];
}

/** Home page "featured" rail — artworks flagged impactful = 1. */
export async function getFeaturedArtworks(limit = 8): Promise<ArtworkListItem[]> {
  return query<ArtworkListItem>(
    `${BASE_LIST_SELECT} WHERE w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
    [limit]
  );
}

/** Home page "selected artworks" rail — a broader sample, still restricted
 *  to impactful = 1 like every other browsing surface. */
export async function getSelectedArtworks(limit = 12): Promise<ArtworkListItem[]> {
  return query<ArtworkListItem>(
    `${BASE_LIST_SELECT} WHERE w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function getOtherArtworksByArtists(
  artworkIds: string[],
  limit = 8
): Promise<ArtworkListItem[]> {
  if (artworkIds.length === 0) return getSelectedArtworks(limit);
  const placeholders = artworkIds.map(() => "?").join(",");
  return query<ArtworkListItem>(
    `${BASE_LIST_SELECT} WHERE w.artwork_id NOT IN (${placeholders}) AND w.impactful = 1 ORDER BY w.created_at DESC LIMIT ?`,
    [...artworkIds, limit]
  );
}

/** Distinct categories present in the artworks table, with counts. Matches
 *  the plain `category` text field (see the note on ArtworkFilters.category)
 *  rather than category_id. */
export async function getDistinctCategories(): Promise<
  Array<{ category: string; artwork_count: number }>
> {
  return query<{ category: string; artwork_count: number }>(
    `SELECT category, COUNT(*) AS artwork_count
     FROM artworks
     WHERE category IS NOT NULL AND category != ''
     GROUP BY category
     ORDER BY category ASC`
  );
}

/** Total artworks by a specific artist, regardless of category — used to
 *  label the "All" option in the artist page's category filter. */
export async function getArtworkCountForArtist(artistId: string): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM artworks WHERE artist_id = ?`,
    [artistId]
  );
  return row?.total ?? 0;
}

/** Distinct categories a specific artist has work in, with counts — used by
 *  the artist page's "browse by category" filter. Deliberately not scoped
 *  to impactful = 1: the artist page shows all of that artist's work by
 *  default, so these counts (and the filter built from them) should match
 *  what's actually on the page, not the impactful-only subset. */
export async function getDistinctCategoriesForArtist(
  artistId: string
): Promise<Array<{ category: string; artwork_count: number }>> {
  return query<{ category: string; artwork_count: number }>(
    `SELECT category, COUNT(*) AS artwork_count
     FROM artworks
     WHERE artist_id = ? AND category IS NOT NULL AND category != ''
     GROUP BY category
     ORDER BY category ASC`,
    [artistId]
  );
}

/** Distinct artist-series collections (artworks.collection_name) a specific
 *  artist has work in, with counts — used by the artist page's "browse by
 *  collection" filter. This is the artist's own collection/series concept
 *  (artworks.part_of_collection / collection_name), not an Aartverse Week
 *  Best editorial collection — see lib/queries/weekBest.ts for that. Not
 *  scoped to impactful = 1, for the same reason as
 *  getDistinctCategoriesForArtist above. */
export async function getDistinctCollectionNamesForArtist(
  artistId: string
): Promise<Array<{ collection_name: string; artwork_count: number }>> {
  return query<{ collection_name: string; artwork_count: number }>(
    `SELECT collection_name, COUNT(*) AS artwork_count
     FROM artworks
     WHERE artist_id = ?
       AND part_of_collection = 1
       AND collection_name IS NOT NULL
       AND collection_name != ''
     GROUP BY collection_name
     ORDER BY collection_name ASC`,
    [artistId]
  );
}

/** Distinct subcategory values, split out of the comma-separated field. */
export async function getDistinctSubcategories(): Promise<string[]> {
  const rows = await query<{ subcategory: string }>(
    `SELECT DISTINCT subcategory FROM artworks WHERE subcategory IS NOT NULL AND subcategory != ''`
  );
  const values = new Set<string>();
  for (const row of rows) {
    for (const part of row.subcategory.split(",")) {
      const trimmed = part.trim();
      if (trimmed) values.add(trimmed);
    }
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

/** Distinct years present in the artworks table, newest first — used to
 *  populate the year filter without hard-coding a range. */
export async function getDistinctYears(): Promise<number[]> {
  const rows = await query<{ year: number }>(
    `SELECT DISTINCT year FROM artworks WHERE year IS NOT NULL ORDER BY year DESC`
  );
  return rows.map((r) => r.year);
}

/** Distinct collection names for artworks that are part of a collection. */
export async function getDistinctCollectionNames(): Promise<string[]> {
  const rows = await query<{ collection_name: string }>(
    `SELECT DISTINCT collection_name FROM artworks
     WHERE part_of_collection = 1 AND collection_name IS NOT NULL AND collection_name != ''
     ORDER BY collection_name ASC`
  );
  return rows.map((r) => r.collection_name);
}

export async function getPriceBounds(): Promise<{ min: number; max: number } | null> {
  const row = await queryOne<{ min: number; max: number }>(
    `SELECT MIN(price) AS min, MAX(price) AS max FROM artworks WHERE price IS NOT NULL`
  );
  if (!row || row.min === null || row.max === null) return null;
  return row;
}

/** Lightweight id/updated_at list for building the sitemap — intentionally
 *  skips the joins/subselects used by the list views since a sitemap entry
 *  needs almost none of that data. */
export async function getAllArtworkIdsForSitemap(): Promise<
  Array<{ artwork_id: string; updated_at: string | null }>
> {
  return query<{ artwork_id: string; updated_at: string | null }>(
    `SELECT artwork_id, updated_at FROM artworks ORDER BY created_at DESC`
  );
}

export async function countArtworks(): Promise<number> {
  const row = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM artworks`
  );
  return row?.total ?? 0;
}
