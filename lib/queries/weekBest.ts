import "server-only";
import { randomUUID } from "node:crypto";
import { pool, query, queryOne } from "@/lib/db";
import type { ArtworkListItem, WeekBestCollectionRow } from "@/lib/types";

export interface WeekBestCollectionWithArtworks extends WeekBestCollectionRow {
  artworks: ArtworkListItem[];
}

/** All Week Best Collections, most recent week first. Any number may exist. */
export async function getAllWeekBestCollections(): Promise<WeekBestCollectionRow[]> {
  return query<WeekBestCollectionRow>(
    `SELECT * FROM week_best_collections ORDER BY week_of DESC, created_at DESC`
  );
}

export async function getLatestWeekBestCollection(): Promise<WeekBestCollectionWithArtworks | null> {
  const latest = await queryOne<WeekBestCollectionRow>(
    `SELECT * FROM week_best_collections ORDER BY week_of DESC, created_at DESC LIMIT 1`
  );
  if (!latest) return null;
  const artworks = await getArtworksForCollection(latest.week_best_collection_id);
  return { ...latest, artworks };
}

export async function getWeekBestCollectionById(
  collectionId: string
): Promise<WeekBestCollectionWithArtworks | null> {
  const collection = await queryOne<WeekBestCollectionRow>(
    `SELECT * FROM week_best_collections WHERE week_best_collection_id = ? LIMIT 1`,
    [collectionId]
  );
  if (!collection) return null;
  const artworks = await getArtworksForCollection(collectionId);
  return { ...collection, artworks };
}

/** Lightweight summary for every collection — artwork count + a cover image
 *  (the first artwork in curated `sort_order`) — in one extra query total,
 *  regardless of how many collections exist. Used by the `/week-best` index
 *  so it can show a real cover image per collection without re-fetching
 *  each collection's full artwork list one at a time. */
export async function getAllWeekBestCollectionsWithSummary(): Promise<
  Array<{
    collection: WeekBestCollectionRow;
    artworkCount: number;
    coverImageUrl: string | null;
  }>
> {
  const collections = await getAllWeekBestCollections();
  if (collections.length === 0) return [];

  const ids = collections.map((c) => c.week_best_collection_id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await query<{
    week_best_collection_id: string;
    artwork_count: number;
    cover_image_url: string | null;
  }>(
    `SELECT
       wbca.week_best_collection_id,
       COUNT(*) AS artwork_count,
       (
         SELECT w2.feature_image_url FROM week_best_collection_artworks wbca2
         JOIN artworks w2 ON w2.artwork_id = wbca2.artwork_id
         WHERE wbca2.week_best_collection_id = wbca.week_best_collection_id AND w2.status = 'approved'
         ORDER BY wbca2.sort_order ASC LIMIT 1
       ) AS cover_image_url
     FROM week_best_collection_artworks wbca
     WHERE wbca.week_best_collection_id IN (${placeholders})
     GROUP BY wbca.week_best_collection_id`,
    ids
  );
  const byId = new Map(rows.map((r) => [r.week_best_collection_id, r]));

  return collections.map((collection) => {
    const summary = byId.get(collection.week_best_collection_id);
    return {
      collection,
      artworkCount: summary?.artwork_count ?? 0,
      coverImageUrl: summary?.cover_image_url ?? null,
    };
  });
}

/** Artworks in a weekly collection, in the exact curated order. The number
 *  of artworks is not fixed — this returns however many rows exist.
 *  Restricted to impactful = 1, like every other artwork-browsing surface
 *  on the site; the curated `sort_order` is still respected among whatever
 *  remains. */
async function getArtworksForCollection(
  collectionId: string
): Promise<ArtworkListItem[]> {
  return query<ArtworkListItem>(
    `SELECT
       w.*,
       a.slug AS artist_slug,
       (
         SELECT c.hex FROM artwork_colors c
         WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'dominant'
         ORDER BY c.rank_number ASC LIMIT 1
       ) AS dominant_color_hex
     FROM week_best_collection_artworks wbca
     JOIN artworks w ON w.artwork_id = wbca.artwork_id
     LEFT JOIN artists a ON a.artist_id = w.artist_id
     WHERE wbca.week_best_collection_id = ? AND w.impactful = 1 AND w.status = 'approved'
     ORDER BY wbca.sort_order ASC`,
    [collectionId]
  );
}

/* ------------------------- admin-only operations ------------------------ */

/** mysql2's pool.query() for INSERT/UPDATE/DELETE returns a ResultSetHeader
 *  (affectedRows etc), not a row array -- same small helper as
 *  lib/queries/artworkMutations.ts#execAffectingRows, kept as its own local
 *  copy the same way that module keeps its own rather than sharing one
 *  across query modules. */
async function execAffectingRows(
  sql: string,
  params: ReadonlyArray<unknown>
): Promise<number> {
  const [result] = await pool.query(sql, params as unknown[]);
  return (result as { affectedRows: number }).affectedRows;
}

export interface WeekBestCollectionInput {
  collectionName: string;
  artistId?: string | null;
  /** "YYYY-MM-DD", matching how dateStrings:true (lib/db.ts) already
   *  returns this column and how an <input type="date"> submits it. */
  weekOf?: string | null;
  label?: string | null;
  headline?: string | null;
}

export async function createWeekBestCollection(
  input: WeekBestCollectionInput
): Promise<string> {
  const id = randomUUID();
  await query(
    `INSERT INTO week_best_collections
       (week_best_collection_id, collection_name, artist_id, week_of, label, headline)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.collectionName,
      input.artistId ?? null,
      input.weekOf ?? null,
      input.label ?? null,
      input.headline ?? null,
    ]
  );
  return id;
}

/** Same "only keys actually present in `input` are written, and a value of
 *  null clears that column" convention as
 *  lib/queries/artworkMutations.ts#updateOwnedArtwork. */
export async function updateWeekBestCollection(
  collectionId: string,
  input: Partial<WeekBestCollectionInput>
): Promise<boolean> {
  const columnMap: Record<string, unknown> = {
    collection_name: input.collectionName,
    artist_id: "artistId" in input ? input.artistId ?? null : undefined,
    week_of: "weekOf" in input ? input.weekOf ?? null : undefined,
    label: "label" in input ? input.label ?? null : undefined,
    headline: "headline" in input ? input.headline ?? null : undefined,
  };
  const keys = Object.keys(columnMap).filter((k) => columnMap[k] !== undefined);
  if (keys.length === 0) return false;

  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => columnMap[k]);
  const affected = await execAffectingRows(
    `UPDATE week_best_collections SET ${setClause} WHERE week_best_collection_id = ?`,
    [...values, collectionId]
  );
  return affected > 0;
}

/** Deletes a collection and its membership rows. The junction table
 *  (week_best_collection_artworks) is cleared explicitly first rather than
 *  relying on an ON DELETE CASCADE -- this schema predates this codebase
 *  (see the note above on getArtworksForCollection) and its foreign keys,
 *  if any, aren't something this app controls or can assume exist. */
export async function deleteWeekBestCollection(collectionId: string): Promise<boolean> {
  await query(
    `DELETE FROM week_best_collection_artworks WHERE week_best_collection_id = ?`,
    [collectionId]
  );
  const affected = await execAffectingRows(
    `DELETE FROM week_best_collections WHERE week_best_collection_id = ?`,
    [collectionId]
  );
  return affected > 0;
}

export interface WeekBestArtworkRef {
  artwork_id: string;
  sort_order: number;
}

/** Raw membership rows for a collection, in curated order -- unlike
 *  getArtworksForCollection above, this does NOT filter by impactful/
 *  approved, since the admin edit screen needs to see (and manage) a piece
 *  it just added even before it's impactful/approved. */
export async function getWeekBestCollectionArtworkRefs(
  collectionId: string
): Promise<WeekBestArtworkRef[]> {
  return query<WeekBestArtworkRef>(
    `SELECT artwork_id, sort_order FROM week_best_collection_artworks
     WHERE week_best_collection_id = ? ORDER BY sort_order ASC`,
    [collectionId]
  );
}

/** Every member artwork of a collection, joined to its full artwork row and
 *  in curated order -- the admin equivalent of getArtworksForCollection
 *  above, minus its impactful/approved filter (see the note on
 *  getWeekBestCollectionArtworkRefs). Used by the admin edit screen so a
 *  newly-added or not-yet-impactful piece still shows up to manage, rather
 *  than silently disappearing from the list the moment it's added. */
export async function getWeekBestCollectionArtworksForAdmin(
  collectionId: string
): Promise<ArtworkListItem[]> {
  const refs = await getWeekBestCollectionArtworkRefs(collectionId);
  if (refs.length === 0) return [];

  const ids = refs.map((r) => r.artwork_id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await query<ArtworkListItem>(
    `SELECT
       w.*,
       a.slug AS artist_slug,
       (
         SELECT c.hex FROM artwork_colors c
         WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'dominant'
         ORDER BY c.rank_number ASC LIMIT 1
       ) AS dominant_color_hex,
       NULL AS color_match_hex,
       NULL AS color_match_proportion
     FROM artworks w
     LEFT JOIN artists a ON a.artist_id = w.artist_id
     WHERE w.artwork_id IN (${placeholders})`,
    ids
  );

  const orderById = new Map(ids.map((id, index) => [id, index]));
  return rows.sort(
    (a, b) => (orderById.get(a.artwork_id) ?? 0) - (orderById.get(b.artwork_id) ?? 0)
  );
}

/** Adds one artwork to a collection at the end of the current order -- a
 *  no-op if it's already a member, so the admin "add" control can't create
 *  a duplicate row by double-submitting. */
export async function addArtworkToWeekBestCollection(
  collectionId: string,
  artworkId: string
): Promise<void> {
  const existing = await queryOne(
    `SELECT 1 FROM week_best_collection_artworks WHERE week_best_collection_id = ? AND artwork_id = ? LIMIT 1`,
    [collectionId, artworkId]
  );
  if (existing) return;

  const maxRow = await queryOne<{ max_order: number | null }>(
    `SELECT MAX(sort_order) AS max_order FROM week_best_collection_artworks WHERE week_best_collection_id = ?`,
    [collectionId]
  );
  const nextOrder = (maxRow?.max_order ?? -1) + 1;
  await query(
    `INSERT INTO week_best_collection_artworks (week_best_collection_id, artwork_id, sort_order) VALUES (?, ?, ?)`,
    [collectionId, artworkId, nextOrder]
  );
}

export async function removeArtworkFromWeekBestCollection(
  collectionId: string,
  artworkId: string
): Promise<void> {
  await query(
    `DELETE FROM week_best_collection_artworks WHERE week_best_collection_id = ? AND artwork_id = ?`,
    [collectionId, artworkId]
  );
}

/** Swaps this artwork's sort_order with its immediate neighbor in the given
 *  direction -- the simplest reorder primitive that can't produce gaps or
 *  duplicate positions, which is all the admin edit screen's Up/Down
 *  buttons need. A no-op past either end of the list. */
export async function moveWeekBestCollectionArtwork(
  collectionId: string,
  artworkId: string,
  direction: "up" | "down"
): Promise<void> {
  const refs = await getWeekBestCollectionArtworkRefs(collectionId);
  const index = refs.findIndex((r) => r.artwork_id === artworkId);
  if (index === -1) return;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= refs.length) return;

  const a = refs[index];
  const b = refs[swapWith];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Routed through a temporary value so the two UPDATEs below can never
    // collide even if this table enforces a unique (collection_id,
    // sort_order) pair -- writing b's row straight to a's old sort_order
    // while a's row still holds it would violate that momentarily.
    await conn.query(
      `UPDATE week_best_collection_artworks SET sort_order = -1 WHERE week_best_collection_id = ? AND artwork_id = ?`,
      [collectionId, a.artwork_id]
    );
    await conn.query(
      `UPDATE week_best_collection_artworks SET sort_order = ? WHERE week_best_collection_id = ? AND artwork_id = ?`,
      [a.sort_order, collectionId, b.artwork_id]
    );
    await conn.query(
      `UPDATE week_best_collection_artworks SET sort_order = ? WHERE week_best_collection_id = ? AND artwork_id = ?`,
      [b.sort_order, collectionId, a.artwork_id]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
