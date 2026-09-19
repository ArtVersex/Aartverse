import "server-only";
import { randomUUID } from "node:crypto";
import { pool, query, queryOne } from "@/lib/db";
import type { ArtworkRow, ArtworkStatus } from "@/lib/types";
import type { ColorAnalysisResult } from "@/lib/color-analysis";

/** mysql2's pool.query() for INSERT/UPDATE/DELETE returns a ResultSetHeader
 *  (affectedRows etc), not a row array — this reads that safely. */
async function execAffectingRows(
  sql: string,
  params: ReadonlyArray<unknown>
): Promise<number> {
  const [result] = await pool.query(sql, params as unknown[]);
  return (result as { affectedRows: number }).affectedRows;
}

export interface CreateArtworkInput {
  title: string;
  /** Denormalized snapshot of the artist's display name at the time of
   *  creation (see app/artist/artworks/actions.ts) — artworks.artist_name
   *  is read all over the public site (SEO title, structured data, cards,
   *  search) and previously stayed NULL for every artwork created through
   *  this portal since nothing wrote it. */
  artistName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | null;
  year?: number | null;
  dimensions?: string | null;
  place?: string | null;
  /** Whether this piece belongs to a collection/series, and its name if so
   *  -- previously admin-only (see AdminArtworkFieldsInput below), now
   *  asked of the artist directly on their own form (see
   *  components/artist/CollectionFields.tsx). */
  partOfCollection?: boolean;
  collectionName?: string | null;
  featureImageUrl?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  /** Optional curatorial write-ups — an artist can add these, and so can
   *  an Aartverse admin from the review screen. Stored as sanitized HTML
   *  from components/RichTextEditor.tsx. */
  techniqueHighlight?: string | null;
  historicalContext?: string | null;
  symbolism?: string | null;
  compositionAnalysis?: string | null;
  culturalSignificance?: string | null;
}

/**
 * Replaces every `artwork_colors` row for one artwork with the rows
 * derived from a fresh color analysis — two scopes, matching the existing
 * table's own convention (see lib/queries/colors.ts / lib/queries/artworks.ts):
 *   - 'dominant' rows: one per top-5 dominant color, each with its own
 *     hex/rgb and a proportion (0-100) of analyzed pixels.
 *   - 'family' rows: one per color family present anywhere in the image
 *     (aggregated across ALL clusters, not just the top 5), proportion
 *     only — no hex of their own, matching existing rows of this scope.
 *
 * Family names and hex values are stored lowercase to match the existing
 * data's convention (see lib/colorFamilies.ts, lib/utils.ts#rgbToHex) —
 * this is distinct from the Title-Case family names / uppercase hex used
 * in the `color_analysis` JSON blob itself, which follows the shape the
 * feature spec asked for.
 *
 * Scoped to a single artwork_id and run inside a transaction, so this
 * never touches any other artwork's rows and never leaves the table
 * half-updated. Only called when a fresh, validated analysis exists for
 * that artwork — never invoked (and so never destructive) when an update
 * didn't touch the image.
 */
export async function replaceArtworkColorRows(
  artworkId: string,
  analysis: ColorAnalysisResult
): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM artwork_colors WHERE artwork_id = ?`, [artworkId]);

    const rows: unknown[][] = [];

    for (const color of analysis.dominantColors) {
      rows.push([
        artworkId,
        color.name,
        color.family.toLowerCase(),
        "dominant",
        color.hex.toLowerCase(),
        color.proportion,
        color.rank,
        color.rgb[0],
        color.rgb[1],
        color.rgb[2],
      ]);
    }

    const familyEntries = Object.entries(analysis.colorFamilies);
    familyEntries.forEach(([family, proportion], index) => {
      rows.push([
        artworkId,
        null,
        family.toLowerCase(),
        "family",
        null,
        proportion,
        index + 1,
        null,
        null,
        null,
      ]);
    });

    if (rows.length > 0) {
      await conn.query(
        `INSERT INTO artwork_colors
           (artwork_id, color_name, color_family, color_scope, hex, proportion, rank_number, rgb_r, rgb_g, rgb_b)
         VALUES ?`,
        [rows]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Creates a new artwork owned by `artistId`. `artistId` must always be
 * derived server-side from the authenticated session — NEVER accept it
 * from the client/form — see lib/auth/session.ts's requireArtist().
 *
 * `colorAnalysis` is optional and additive: when a feature image was
 * uploaded and automatic color analysis succeeded, pass it here to store
 * both the raw JSON (in `artworks.color_analysis`) and the derived
 * `artwork_colors` rows in the same operation. Passing null/omitting it
 * (e.g. no image, or analysis failed) simply leaves both empty — it never
 * blocks artwork creation.
 */
export async function createArtwork(
  artistId: string,
  input: CreateArtworkInput,
  status: ArtworkStatus = "draft",
  colorAnalysis?: ColorAnalysisResult | null,
  // Callers that need to know the artwork's ID before the row exists (to
  // upload its feature image under a stable artworks/<artworkId>.webp path
  // — see lib/uploads.ts) generate this up front with randomUUID() and
  // pass it in; everyone else gets a fresh one for free.
  artworkId: string = randomUUID()
): Promise<string> {
  await query(
    `INSERT INTO artworks
       (artwork_id, title, artist_id, artist_name, category, subcategory, price, year,
        dimensions, place, feature_image_url, short_description, description,
        technique_highlight, historical_context, symbolism, composition_analysis, cultural_significance,
        in_stock, impactful, part_of_collection, collection_name, status, submitted_at, color_analysis)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)`,
    [
      artworkId,
      input.title,
      artistId,
      input.artistName ?? null,
      input.category ?? null,
      input.subcategory ?? null,
      input.price ?? null,
      input.year ?? null,
      input.dimensions ?? null,
      input.place ?? null,
      input.featureImageUrl ?? null,
      input.shortDescription ?? null,
      input.description ?? null,
      input.techniqueHighlight ?? null,
      input.historicalContext ?? null,
      input.symbolism ?? null,
      input.compositionAnalysis ?? null,
      input.culturalSignificance ?? null,
      input.partOfCollection ? 1 : 0,
      input.collectionName ?? null,
      status,
      status === "pending" ? new Date() : null,
      colorAnalysis ? JSON.stringify(colorAnalysis) : null,
    ]
  );

  if (colorAnalysis) {
    await replaceArtworkColorRows(artworkId, colorAnalysis);
  }

  return artworkId;
}

/** Fetches an artwork only if it belongs to the given artist — this is the
 *  central ownership check every artist-facing read/write route must use
 *  before doing anything with an artwork_id supplied by the client. */
export async function getOwnedArtwork(
  artworkId: string,
  artistId: string
): Promise<ArtworkRow | null> {
  return queryOne<ArtworkRow>(
    `SELECT * FROM artworks WHERE artwork_id = ? AND artist_id = ? LIMIT 1`,
    [artworkId, artistId]
  );
}

export async function listArtworksForArtist(
  artistId: string
): Promise<ArtworkRow[]> {
  return query<ArtworkRow>(
    `SELECT * FROM artworks WHERE artist_id = ? ORDER BY created_at DESC, artwork_id DESC`,
    [artistId]
  );
}

/** Distinct collection/series names this artist has used on ANY of their
 *  own artworks, regardless of review status -- lets a new submission
 *  reuse an existing name instead of accidentally creating a near-
 *  duplicate (see components/artist/CollectionFields.tsx). Deliberately
 *  not scoped to status = 'approved' like the similarly-named
 *  getDistinctCollectionNamesForArtist in lib/queries/artworks.ts (which
 *  drives the PUBLIC artist page's "browse by collection" filter) -- a
 *  series the artist is actively building is just as real to them while
 *  its pieces are still pending review. */
export async function getArtistCollectionNames(artistId: string): Promise<string[]> {
  const rows = await query<{ collection_name: string }>(
    `SELECT DISTINCT collection_name FROM artworks
     WHERE artist_id = ? AND part_of_collection = 1
       AND collection_name IS NOT NULL AND collection_name != ''
     ORDER BY collection_name ASC`,
    [artistId]
  );
  return rows.map((r) => r.collection_name);
}

export type UpdateArtworkInput = Partial<CreateArtworkInput> & {
  /** Undefined = image/analysis untouched by this update, leave existing
   *  color data as-is. Null = image was re-uploaded but analysis failed
   *  or found nothing usable — still clears stale color data for the old
   *  image rather than leaving it mismatched with the new one. A defined
   *  ColorAnalysisResult replaces both the JSON column and the
   *  artwork_colors rows for this artwork. */
  colorAnalysis?: ColorAnalysisResult | null;
};

/**
 * Updates an artwork, scoped to `artistId` in the WHERE clause so an
 * attempt to edit someone else's artwork_id is a no-op (0 rows affected)
 * rather than an error that could leak whether the id exists. A previously
 * rejected artwork auto-resubmits (straight back to 'pending', clearing the
 * old rejection_reason and stamping a fresh submitted_at) on edit, rather
 * than landing in an in-between 'draft' the artist would then have to
 * separately click "Submit" on again -- same reasoning as createArtwork
 * going straight to 'pending' now (see app/artist/artworks/actions.ts).
 * The manual "Submit" action (submitOwnedArtwork) still exists for
 * resubmitting a rejected piece *unchanged*, since no edit happens in that
 * case to trigger this.
 *
 * Deliberately does NOT accept `artistName` here — it's stamped once at
 * creation (see createArtwork) and never silently overwritten by an
 * artist's own edit, and it's simply never present in the artist-facing
 * form/action that calls this (see app/artist/artworks/actions.ts), so it
 * is always `undefined` here and filtered out below like any other
 * untouched field.
 */
export async function updateOwnedArtwork(
  artworkId: string,
  artistId: string,
  input: UpdateArtworkInput
): Promise<boolean> {
  const columnMap: Record<string, unknown> = {
    title: input.title,
    category: input.category,
    subcategory: input.subcategory,
    price: input.price,
    year: input.year,
    dimensions: input.dimensions,
    place: input.place,
    part_of_collection:
      input.partOfCollection === undefined ? undefined : input.partOfCollection ? 1 : 0,
    collection_name: input.collectionName,
    feature_image_url: input.featureImageUrl,
    short_description: input.shortDescription,
    description: input.description,
    technique_highlight: input.techniqueHighlight,
    historical_context: input.historicalContext,
    symbolism: input.symbolism,
    composition_analysis: input.compositionAnalysis,
    cultural_significance: input.culturalSignificance,
  };

  // colorAnalysis follows the same "undefined = don't touch" convention as
  // every other field above, but needs its own check since `undefined` is
  // also how "clear it" would look after JSON.stringify — so it's read
  // directly off `input`, not through columnMap's generic filter.
  const touchesColorAnalysis = "colorAnalysis" in input && input.colorAnalysis !== undefined;
  if (touchesColorAnalysis) {
    columnMap.color_analysis = input.colorAnalysis
      ? JSON.stringify(input.colorAnalysis)
      : null;
  }

  const keys = Object.keys(columnMap).filter(
    (k) => columnMap[k] !== undefined
  );
  if (keys.length === 0) return false;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => columnMap[k]);

  // Column order below is deliberate, not cosmetic: MySQL evaluates a
  // multi-column SET left to right, and a later assignment sees any EARLIER
  // assignment's new value when it references that same column (e.g.
  // `SET col1 = col1 + 1, col2 = col1` makes col2 read the incremented
  // col1). submitted_at/rejection_reason's CASEs both read `status` and
  // must see the ORIGINAL (pre-update) value, so they're placed before
  // status's own reassignment -- which is itself the first and only place
  // `status` is written, so it also still reads the original value.
  // Reordering these three lines would silently break the "clear
  // rejection_reason exactly when un-rejecting" behavior.
  const affected = await execAffectingRows(
    `UPDATE artworks
     SET ${setClause},
         submitted_at = CASE WHEN status = 'rejected' THEN NOW() ELSE submitted_at END,
         rejection_reason = CASE WHEN status = 'rejected' THEN NULL ELSE rejection_reason END,
         status = CASE WHEN status = 'rejected' THEN 'pending' ELSE status END
     WHERE artwork_id = ? AND artist_id = ?`,
    [...values, artworkId, artistId]
  );

  if (affected > 0 && touchesColorAnalysis) {
    if (input.colorAnalysis) {
      await replaceArtworkColorRows(artworkId, input.colorAnalysis);
    } else {
      // Image was replaced but analysis failed/produced nothing usable —
      // clear the now-stale color_analysis rows for the old image rather
      // than leaving them attached to a different picture.
      await query(`DELETE FROM artwork_colors WHERE artwork_id = ?`, [artworkId]);
    }
  }

  return affected > 0;
}

export async function deleteOwnedArtwork(
  artworkId: string,
  artistId: string
): Promise<boolean> {
  const affected = await execAffectingRows(
    `DELETE FROM artworks WHERE artwork_id = ? AND artist_id = ?`,
    [artworkId, artistId]
  );
  return affected > 0;
}

export async function submitOwnedArtwork(
  artworkId: string,
  artistId: string
): Promise<boolean> {
  const affected = await execAffectingRows(
    `UPDATE artworks SET status = 'pending', submitted_at = NOW(), rejection_reason = NULL
     WHERE artwork_id = ? AND artist_id = ? AND status IN ('draft', 'rejected')`,
    [artworkId, artistId]
  );
  return affected > 0;
}

/* ------------------------- admin-only operations ------------------------ */

/**
 * `status`, `artistId`, `impactful`, and `hasRank` combine (AND) when more
 * than one is given -- e.g. the admin artworks page's status tabs, its
 * artist filter (components/admin/ArtworkArtistFilter.tsx), and its rank
 * filter (components/admin/ArtworkRankFilter.tsx) apply together, so
 * "Approved" + "Ranked only" shows only approved pieces that already have a
 * feature_rank set.
 */
export async function listArtworksForAdmin(options?: {
  status?: ArtworkStatus;
  artistId?: string;
  /** true = impactful only, false = not (yet) impactful, undefined = no
   *  filter -- lets an admin, e.g., find approved-but-not-yet-featured
   *  pieces to decide on. */
  impactful?: boolean;
  /** true = only rows with a feature_rank set, false = only rows where it's
   *  still NULL, undefined = no filter on it -- lets an admin isolate the
   *  ranked picks to review/reorder them, or find candidates still waiting
   *  on a decision. Paired with ArtworkRankFilter's "Filter by rank". */
  hasRank?: boolean;
  /** true = order by feature_rank ascending (1 = best, shown first) instead
   *  of the default recency order, with unranked rows always trailing at
   *  the end regardless of hasRank -- same "ranked first, then the rest"
   *  convention as getFeaturedArtworks (lib/queries/artworks.ts). Paired
   *  with ArtworkRankFilter's "View by rank" toggle. Independent of
   *  hasRank: combining both is the common "review my ranked list in rank
   *  order" case, but either can be used alone. */
  sortByRank?: boolean;
}): Promise<ArtworkRow[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options?.status) {
    clauses.push("status = ?");
    params.push(options.status);
  }
  if (options?.artistId) {
    clauses.push("artist_id = ?");
    params.push(options.artistId);
  }
  if (options?.impactful !== undefined) {
    clauses.push("impactful = ?");
    params.push(options.impactful ? 1 : 0);
  }
  if (options?.hasRank !== undefined) {
    clauses.push(options.hasRank ? "feature_rank IS NOT NULL" : "feature_rank IS NULL");
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  // submitted_at is NULL for any still-draft row, which MySQL sorts as the
  // lowest value -- in DESC order that puts unsubmitted drafts last, a
  // reasonable default for a review queue regardless of which filters (if
  // any) are active. When sortByRank is on, ranked rows (lowest rank
  // number first) come first and unranked rows -- (feature_rank IS NULL)
  // evaluates to 1 for them, 0 for ranked rows -- fall back to that same
  // recency order among themselves.
  const orderBySql = options?.sortByRank
    ? "ORDER BY (feature_rank IS NULL) ASC, feature_rank ASC, submitted_at DESC, created_at DESC"
    : "ORDER BY submitted_at DESC, created_at DESC";
  return query<ArtworkRow>(
    `SELECT * FROM artworks ${whereSql} ${orderBySql}`,
    params
  );
}

export async function approveArtwork(
  artworkId: string,
  adminUserId: string
): Promise<void> {
  await query(
    `UPDATE artworks SET status = 'approved', reviewed_at = NOW(), reviewed_by = ?, rejection_reason = NULL WHERE artwork_id = ?`,
    [adminUserId, artworkId]
  );
}

export async function rejectArtwork(
  artworkId: string,
  adminUserId: string,
  reason: string
): Promise<void> {
  await query(
    `UPDATE artworks SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?, rejection_reason = ? WHERE artwork_id = ?`,
    [adminUserId, reason, artworkId]
  );
}

/**
 * The fields an Aartverse admin controls that an artist's own form never
 * touches at all (see lib/validation/artwork.ts's artworkAdminFieldsSchema)
 * — how a piece actually gets listed once the team has decided it's worth
 * selling, plus the "impactful" flag that gates whether it shows up
 * anywhere on the public site at all (see lib/queries/artworks.ts).
 */
export interface AdminArtworkFieldsInput {
  inStock?: boolean;
  impactful?: boolean;
  certificateNumber?: string | null;
  /** Admin can add or refine the same optional curatorial write-ups an
   *  artist may have already started — same columns, no ownership check
   *  (this is admin-only, gated by requireAdmin() at the call site in
   *  app/admin/artworks/actions.ts). */
  techniqueHighlight?: string | null;
  historicalContext?: string | null;
  symbolism?: string | null;
  compositionAnalysis?: string | null;
  culturalSignificance?: string | null;
}

/**
 * Updates any artwork regardless of owner — deliberately has no artistId
 * in its WHERE clause, unlike updateOwnedArtwork. Only ever call this from
 * an admin-only server action that has already called requireAdmin().
 * Same "only defined keys are written" convention as updateOwnedArtwork.
 */
export async function updateArtworkAdminFields(
  artworkId: string,
  input: AdminArtworkFieldsInput
): Promise<boolean> {
  const columnMap: Record<string, unknown> = {
    in_stock: input.inStock === undefined ? undefined : input.inStock ? 1 : 0,
    impactful: input.impactful === undefined ? undefined : input.impactful ? 1 : 0,
    certificate_number: input.certificateNumber,
    technique_highlight: input.techniqueHighlight,
    historical_context: input.historicalContext,
    symbolism: input.symbolism,
    composition_analysis: input.compositionAnalysis,
    cultural_significance: input.culturalSignificance,
  };

  const keys = Object.keys(columnMap).filter((k) => columnMap[k] !== undefined);
  if (keys.length === 0) return false;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => columnMap[k]);

  const affected = await execAffectingRows(
    `UPDATE artworks SET ${setClause} WHERE artwork_id = ?`,
    [...values, artworkId]
  );
  return affected > 0;
}

/**
 * Sets (or clears, with null) an artwork's manual feature rank -- see
 * getFeaturedArtworks (lib/queries/artworks.ts). Lower is better (1 = the
 * single best pick); NULL leaves the piece to backfill the featured rail by
 * recency, same as before this control existed. Independent of
 * `impactful`: a rank on a non-impactful artwork has no visible effect
 * until/unless it's also marked impactful, since every featured-rail query
 * filters on impactful = 1 first. Wired to
 * components/admin/FeatureRankInput.tsx via
 * app/admin/artworks/actions.ts#setFeatureRankAction.
 */
export async function setArtworkFeatureRank(
  artworkId: string,
  rank: number | null
): Promise<boolean> {
  const affected = await execAffectingRows(
    `UPDATE artworks SET feature_rank = ? WHERE artwork_id = ?`,
    [rank, artworkId]
  );
  return affected > 0;
}

/**
 * Updates an artwork's core, artist-submitted fields (title, category,
 * price, dimensions, description, photo, ...) regardless of owner — for an
 * admin correcting or filling in something an artist wrote poorly (see
 * app/admin/artworks/actions.ts's updateArtworkAsAdminAction). Same shape
 * and "only defined keys are written" convention as updateOwnedArtwork, but
 * with no artistId in the WHERE clause (admin can edit any artwork) and no
 * status side-effects at all — an admin fixing a typo shouldn't silently
 * move an artwork through the review queue the way an artist's own
 * edit/resubmit does.
 *
 * Deliberately accepts the same UpdateArtworkInput shape as
 * updateOwnedArtwork (including the curatorial write-up fields) for type
 * reuse, but callers here must never actually populate
 * techniqueHighlight/historicalContext/symbolism/compositionAnalysis/
 * culturalSignificance — those stay owned by updateArtworkAdminFields
 * above (and its ArtworkAdminFieldsForm), so there's exactly one save path
 * per field. updateArtworkAsAdminAction never sets them for this reason.
 */
export async function updateArtworkAsAdmin(
  artworkId: string,
  input: UpdateArtworkInput
): Promise<boolean> {
  const columnMap: Record<string, unknown> = {
    title: input.title,
    category: input.category,
    subcategory: input.subcategory,
    price: input.price,
    year: input.year,
    dimensions: input.dimensions,
    place: input.place,
    part_of_collection:
      input.partOfCollection === undefined ? undefined : input.partOfCollection ? 1 : 0,
    collection_name: input.collectionName,
    feature_image_url: input.featureImageUrl,
    short_description: input.shortDescription,
    description: input.description,
    technique_highlight: input.techniqueHighlight,
    historical_context: input.historicalContext,
    symbolism: input.symbolism,
    composition_analysis: input.compositionAnalysis,
    cultural_significance: input.culturalSignificance,
  };

  const touchesColorAnalysis = "colorAnalysis" in input && input.colorAnalysis !== undefined;
  if (touchesColorAnalysis) {
    columnMap.color_analysis = input.colorAnalysis ? JSON.stringify(input.colorAnalysis) : null;
  }

  const keys = Object.keys(columnMap).filter((k) => columnMap[k] !== undefined);
  if (keys.length === 0) return false;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => columnMap[k]);

  const affected = await execAffectingRows(
    `UPDATE artworks SET ${setClause} WHERE artwork_id = ?`,
    [...values, artworkId]
  );

  if (affected > 0 && touchesColorAnalysis) {
    if (input.colorAnalysis) {
      await replaceArtworkColorRows(artworkId, input.colorAnalysis);
    } else {
      await query(`DELETE FROM artwork_colors WHERE artwork_id = ?`, [artworkId]);
    }
  }

  return affected > 0;
}

/**
 * Deletes an artwork regardless of owner -- deliberately has no artistId in
 * its WHERE clause, unlike deleteOwnedArtwork above. Only ever call this
 * from an admin-only server action that has already called requireAdmin()
 * -- see app/admin/artworks/actions.ts#deleteArtworkAsAdminAction, which
 * fetches the row first, calls this, and only then cleans up the artwork's
 * image file once the row is confirmed gone (same "fetch, delete, then
 * clean up the file" order as the artist's own deleteOwnedArtwork call
 * site). Was previously imported and called from that action without ever
 * being defined here, which threw "is not a function" the moment an admin
 * actually tried to delete something -- this was never wired up.
 */
export async function deleteArtworkAsAdmin(artworkId: string): Promise<boolean> {
  const affected = await execAffectingRows(
    `DELETE FROM artworks WHERE artwork_id = ?`,
    [artworkId]
  );
  return affected > 0;
}
