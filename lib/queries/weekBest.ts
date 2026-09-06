import "server-only";
import { query, queryOne } from "@/lib/db";
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
         WHERE wbca2.week_best_collection_id = wbca.week_best_collection_id
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
     WHERE wbca.week_best_collection_id = ? AND w.impactful = 1
     ORDER BY wbca.sort_order ASC`,
    [collectionId]
  );
}
