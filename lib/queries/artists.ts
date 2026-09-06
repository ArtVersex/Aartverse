import "server-only";
import { query, queryOne } from "@/lib/db";
import type { ArtistRow } from "@/lib/types";

export async function getAllArtists(): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE active = 1 OR active IS NULL ORDER BY featured DESC, name ASC`
  );
}

export async function getFeaturedArtists(limit = 6): Promise<ArtistRow[]> {
  return query<ArtistRow>(
    `SELECT * FROM artists WHERE featured = 1 ORDER BY name ASC LIMIT ?`,
    [limit]
  );
}

export async function getArtistBySlug(slug: string): Promise<ArtistRow | null> {
  return queryOne<ArtistRow>(`SELECT * FROM artists WHERE slug = ? LIMIT 1`, [
    slug,
  ]);
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
