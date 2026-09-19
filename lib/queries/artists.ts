import "server-only";
import { query, queryOne } from "@/lib/db";
import type { ArtistRow } from "@/lib/types";

export async function getAllArtists(): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE active = 1 OR active IS NULL ORDER BY featured DESC, name ASC`
  );
}

/** Home page "Featured artists" rail. Artists with a manually-set
 *  featured_priority lead (higher priority first); the rest of the
 *  featured set follows alphabetically -- same "ranked first, then a
 *  sensible fallback order" idea as getFeaturedArtworks
 *  (lib/queries/artworks.ts), just without a recency backfill since every
 *  featured artist is already eligible, ranked or not. */
export async function getFeaturedArtists(limit = 6): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE featured = 1
     ORDER BY (featured_priority IS NULL) ASC, featured_priority DESC, name ASC
     LIMIT ?`,
    [limit]
  );
}

export async function getArtistBySlug(slug: string): Promise<ArtistRow | null> {
  // Public profile lookup — only shows artists an admin has made active
  // (existing curated rows have active = 1 or NULL; a brand-new self
  // registered artist starts at active = 0 and isn't public yet, even
  // though they can already use their own dashboard via getArtistById).
  return queryOne<ArtistRow>(
    `SELECT * FROM artists WHERE slug = ? AND (active = 1 OR active IS NULL) LIMIT 1`,
    [slug]
  );
}

export async function getArtistById(artistId: string): Promise<ArtistRow | null> {
  return queryOne<ArtistRow>(
    `SELECT * FROM artists WHERE artist_id = ? LIMIT 1`,
    [artistId]
  );
}

/** Lightweight list for populating the "Artist" filter dropdown on /artworks. */
export async function getArtistsForFilter(): Promise<
  Array<Pick<ArtistRow, "artist_id" | "name" | "slug">>
> {
  return query<Pick<ArtistRow, "artist_id" | "name" | "slug">>(
    `SELECT artist_id, name, slug FROM artists ORDER BY name ASC`
  );
}
