import "server-only";
import { randomUUID, randomBytes } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import type { AccountRow } from "@/lib/types";
import { parseCommaList, encodeJsonList } from "@/lib/utils";

/** Turns a display name into a URL slug, e.g. "Ada K. Lovelace" -> "ada-k-lovelace". */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artist"
  );
}

async function slugTaken(slug: string): Promise<boolean> {
  const row = await queryOne(`SELECT 1 FROM artists WHERE slug = ? LIMIT 1`, [
    slug,
  ]);
  return row !== null;
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let attempt = 0;
  while (await slugTaken(candidate)) {
    attempt += 1;
    candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (attempt > 10) {
      candidate = `${base}-${randomUUID().slice(0, 8)}`;
      break;
    }
  }
  return candidate;
}

/**
 * Creates the public `artists` profile row for a brand-new artist user and
 * links it back to their `users` row. The profile starts hidden from the
 * public site (active = 0) until an admin approves the artist — this does
 * NOT block the artist from using their dashboard or submitting artwork,
 * it only controls whether their public /artists/[slug] page is listed.
 *
 * Returns the generated artist_id.
 */
export async function createArtistProfileForUser(
  userId: string,
  name: string
): Promise<string> {
  const artistId = randomUUID();
  const slug = await generateUniqueSlug(name);

  await query(
    `INSERT INTO artists (artist_id, user_id, name, slug, active, featured)
     VALUES (?, ?, ?, ?, 0, 0)`,
    [artistId, userId, name, slug]
  );

  await query(`UPDATE users SET artist_id = ? WHERE id = ?`, [
    artistId,
    userId,
  ]);

  return artistId;
}

export async function getAccountByProvider(
  provider: string,
  providerAccountId: string
): Promise<AccountRow | null> {
  return queryOne<AccountRow>(
    `SELECT * FROM accounts WHERE provider = ? AND provider_account_id = ? LIMIT 1`,
    [provider, providerAccountId]
  );
}

export async function linkAccount(
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<void> {
  await query(
    `INSERT INTO accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)`,
    [randomUUID(), userId, provider, providerAccountId]
  );
}

/** Shows/hides an artist's public profile page. Independent of their
 *  users.status (auth account state) — an admin can feature/unfeature a
 *  profile without touching the account itself if ever needed. */
export async function setArtistActive(
  artistId: string,
  active: boolean
): Promise<void> {
  await query(`UPDATE artists SET active = ? WHERE artist_id = ?`, [
    active ? 1 : 0,
    artistId,
  ]);
}

/** Marks/unmarks an artist as "featured" -- getAllArtists() (lib/queries/
 *  artists.ts) already orders the public /artists page by this column
 *  DESC (and getFeaturedArtists() powers the home page's "Featured
 *  artists" rail), but until now nothing ever set it: this is that control,
 *  wired to components/admin/FeaturedToggle.tsx via
 *  app/admin/artists/actions.ts#toggleFeaturedAction, the same "instant,
 *  no-form toggle" shape as artworks' impactful flag
 *  (components/admin/ImpactfulToggle.tsx / toggleImpactfulAction). */
export async function setArtistFeatured(
  artistId: string,
  featured: boolean
): Promise<void> {
  await query(`UPDATE artists SET featured = ? WHERE artist_id = ?`, [
    featured ? 1 : 0,
    artistId,
  ]);
}

/** Sets (or clears, with null) an artist's manual priority among featured
 *  artists -- see getFeaturedArtists (lib/queries/artists.ts). Independent
 *  of the featured flag itself: a priority value on a non-featured artist
 *  has no visible effect until/unless they're also marked featured, since
 *  getFeaturedArtists always filters on featured = 1 first. Wired to
 *  components/admin/FeaturedPriorityInput.tsx via
 *  app/admin/artists/actions.ts#setFeaturedPriorityAction. */
export async function setArtistFeaturedPriority(
  artistId: string,
  priority: number | null
): Promise<void> {
  await query(`UPDATE artists SET featured_priority = ? WHERE artist_id = ?`, [
    priority,
    artistId,
  ]);
}

/**
 * `fields.mediums` is the plain, human-typed comma-separated text from the
 * profile form (e.g. "Oil, Watercolor") -- but the real `artists.mediums`
 * column is `longtext` with a `CHECK (json_valid(mediums))` constraint
 * (confirmed via `SHOW CREATE TABLE artists`; see AUTH_SETUP.md), so it
 * must be written as a JSON array string, not the raw comma text. Writing
 * the raw text there is exactly what was causing
 * `CONSTRAINT \`artists.mediums\` failed` on profile save. This is
 * translated here, at the query layer, so callers keep working with the
 * human-friendly comma text and never need to know about the column's
 * on-disk JSON encoding.
 */
export async function updateArtistProfile(
  artistId: string,
  fields: Partial<{
    artist_statement: string | null;
    profile_image_url: string | null;
    cover_image_url: string | null;
    location: string | null;
    mediums: string | null;
    website: string | null;
    instagram: string | null;
    phone: string | null;
    whatsapp: string | null;
    // --- optional professional-profile fields (see
    // scripts/migrate.mjs#extendArtistsTableProfessional) -- all stored and
    // passed through as-is, no special encoding needed. `social_links` is
    // the one exception in shape (structured {label,url} pairs) but is
    // still passed through as an already-JSON-encoded string, produced by
    // the caller via lib/utils.ts#encodeSocialLinks -- same "query layer
    // stores whatever string it's given" treatment as these other three.
    bio: string | null;
    professional_experience: string | null;
    social_links: string | null;
    additional_notes: string | null;
  }>
): Promise<void> {
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return;
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => {
    if (k === "mediums") {
      return encodeJsonList(parseCommaList(fields.mediums ?? ""));
    }
    return fields[k] ?? null;
  });
  await query(`UPDATE artists SET ${setClause} WHERE artist_id = ?`, [
    ...values,
    artistId,
  ]);
}
