import "server-only";
import { randomUUID } from "node:crypto";
import { pool, query } from "@/lib/db";
import type { ArtistCareerEntryKind, ArtistCareerEntryRow } from "@/lib/types";

/**
 * Every career-history entry for one artist, across all six kinds
 * (exhibitions, education, awards, residencies, publications, and
 * institutional collections -- see ArtistCareerEntryKind in lib/types.ts),
 * ordered for display. Used by the Profile form's "Professional profile"
 * section to prefill its repeatable lists, and by the Artist Profile PDF
 * builder, which needs the same full career history to prefill its own
 * (separate, temporary) draft.
 */
export async function getCareerEntriesForArtist(artistId: string): Promise<ArtistCareerEntryRow[]> {
  return query<ArtistCareerEntryRow>(
    `SELECT * FROM artist_career_entries WHERE artist_id = ? ORDER BY kind, sort_order, created_at`,
    [artistId]
  );
}

/** One career entry as edited in the UI -- no id/artist_id/timestamps,
 *  since those are assigned or already known by the caller. Field names
 *  match components/artist/CareerEntriesFields.tsx's per-row shape rather
 *  than the DB's snake_case columns. */
export interface CareerEntryInput {
  subtype?: string | null;
  title: string;
  organization?: string | null;
  location?: string | null;
  yearLabel?: string | null;
  description?: string | null;
  url?: string | null;
}

export type CareerEntriesByKind = Partial<Record<ArtistCareerEntryKind, CareerEntryInput[]>>;

/**
 * Wholesale replaces this artist's career history for every kind present in
 * `entriesByKind`, all in one transaction -- the profile form's
 * "Professional profile" section saves everything (bio, statement, links,
 * and all six repeatable lists) from a single submit, so this keeps that
 * one save atomic instead of risking a half-applied state if, say, the
 * fourth of six lists failed partway through. A kind left out of
 * `entriesByKind` is untouched; pass an empty array for a kind to clear it
 * entirely. A row whose title is blank is silently dropped rather than
 * saved -- title is the one field every entry needs to be worth keeping.
 *
 * Modeled directly on replaceArtworkColorRows in
 * lib/queries/artworkMutations.ts: delete-then-bulk-insert inside a
 * transaction, since a repeatable list edited as a whole in one form has no
 * stable per-row identity worth reconciling against -- replacing the whole
 * set each save is simpler and just as correct.
 */
export async function replaceCareerEntries(
  artistId: string,
  entriesByKind: CareerEntriesByKind
): Promise<void> {
  const kinds = Object.keys(entriesByKind) as ArtistCareerEntryKind[];
  if (kinds.length === 0) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const rows: unknown[][] = [];
    for (const kind of kinds) {
      const entries = entriesByKind[kind] ?? [];
      await conn.query(`DELETE FROM artist_career_entries WHERE artist_id = ? AND kind = ?`, [
        artistId,
        kind,
      ]);

      entries
        .filter((e) => e.title.trim() !== "")
        .forEach((e, index) => {
          rows.push([
            randomUUID(),
            artistId,
            kind,
            e.subtype?.trim() || null,
            e.title.trim(),
            e.organization?.trim() || null,
            e.location?.trim() || null,
            e.yearLabel?.trim() || null,
            e.description?.trim() || null,
            e.url?.trim() || null,
            index,
          ]);
        });
    }

    if (rows.length > 0) {
      await conn.query(
        `INSERT INTO artist_career_entries
           (id, artist_id, kind, subtype, title, organization, location, year_label, description, url, sort_order)
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
