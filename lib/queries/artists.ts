import "server-only";
import { query, queryOne } from "@/lib/db";
import type { ArtistRow } from "@/lib/types";

/** /artists directory. Manually prioritized artists lead (1 = best/shown
 *  first, same convention as featured_priority everywhere else -- see
 *  getFeaturedArtists below); everyone without a priority -- whether
 *  featured or not -- falls back to newest-profile-first, same "ranked
 *  picks lead, then a recency fallback" idea used by getFeaturedArtworks in
 *  lib/queries/artworks.ts. */
export async function getAllArtists(): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE active = 1 OR active IS NULL
     ORDER BY (featured_priority IS NULL) ASC, featured_priority ASC, created_at DESC`
  );
}

/** Home page "Featured artists" rail. Artists with a manually-set
 *  featured_priority lead, 1 = the single best pick shown first (lower is
 *  better, same "1st/2nd/3rd..." semantics as getFeaturedArtworks'
 *  feature_rank -- see lib/queries/artworks.ts and
 *  components/admin/FeaturedPriorityInput.tsx); the rest of the featured
 *  set follows alphabetically, same "ranked first, then a sensible
 *  fallback order" idea, just without a recency backfill since every
 *  featured artist is already eligible, ranked or not.
 *
 *  Sort direction flipped 2026-10 to match feature_rank's "1 = best"
 *  convention -- previously ordered by featured_priority DESC (higher =
 *  first). */
export async function getFeaturedArtists(limit = 6): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE featured = 1
     ORDER BY (featured_priority IS NULL) ASC, featured_priority ASC, name ASC
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
