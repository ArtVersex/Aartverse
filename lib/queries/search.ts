import "server-only";
import { query } from "@/lib/db";
import type { ArtistRow, ArtworkListItem } from "@/lib/types";

const ARTWORK_SEARCH_SELECT = `
  SELECT
    w.*,
    a.slug AS artist_slug,
    (
      SELECT c.hex FROM artwork_colors c
      WHERE c.artwork_id = w.artwork_id AND c.color_scope = 'dominant'
      ORDER BY c.rank_number ASC LIMIT 1
    ) AS dominant_color_hex
  FROM artworks w
  LEFT JOIN artists a ON a.artist_id = w.artist_id
`;

/** Server-side search across artworks — never pulls the whole table into
 *  the app to filter in JS. Restricted to impactful = 1, like every other
 *  artwork-browsing surface on the site. */
export async function searchArtworks(
  term: string,
  limit = 24
): Promise<ArtworkListItem[]> {
  const like = `%${term}%`;
  return query<ArtworkListItem>(
    `${ARTWORK_SEARCH_SELECT}
     WHERE (w.title LIKE ?
        OR w.artist_name LIKE ?
        OR w.category LIKE ?
        OR w.subcategory LIKE ?
        OR w.collection_name LIKE ?
        OR w.short_description LIKE ?
        OR w.description LIKE ?)
       AND w.impactful = 1
     ORDER BY w.created_at DESC
     LIMIT ?`,
    [like, like, like, like, like, like, like, limit]
  );
}

export async function searchArtists(term: string, limit = 12): Promise<ArtistRow[]> {
  const like = `%${term}%`;
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE name LIKE ? OR location LIKE ? OR mediums LIKE ? ORDER BY name ASC LIMIT ?`,
    [like, like, like, limit]
  );
}
