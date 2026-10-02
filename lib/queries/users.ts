import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import type { UserRole, UserRow, UserStatus } from "@/lib/types";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string | null;
  role?: UserRole;
  status?: UserStatus;
  emailVerifiedAt?: Date | null;
  image?: string | null;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const id = randomUUID();
  await query(
    `INSERT INTO users
       (id, name, email, password_hash, role, status, email_verified_at, image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.email.toLowerCase(),
      input.passwordHash,
      input.role ?? "artist",
      input.status ?? "pending",
      input.emailVerifiedAt ?? null,
      input.image ?? null,
    ]
  );
  const created = await getUserById(id);
  if (!created) {
    throw new Error("Failed to load user immediately after creation.");
  }
  return created;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT * FROM users WHERE email = ? LIMIT 1`, [
    email.toLowerCase(),
  ]);
}

export async function getUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
}

export async function getUserByArtistId(
  artistId: string
): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT * FROM users WHERE artist_id = ? LIMIT 1`, [
    artistId,
  ]);
}

export async function linkArtistProfile(
  userId: string,
  artistId: string
): Promise<void> {
  await query(`UPDATE users SET artist_id = ? WHERE id = ?`, [
    artistId,
    userId,
  ]);
}

/** Lets an artist edit their own display name -- distinct from
 *  setUserRole/setUserStatus below, which are admin-only transitions. A
 *  Google sign-in sometimes seeds an inaccurate name (a nickname, a old
 *  name tied to the Google account, a transliteration) that the artist
 *  should be free to correct themselves at any time. */
export async function updateUserName(userId: string, name: string): Promise<void> {
  await query(`UPDATE users SET name = ? WHERE id = ?`, [name, userId]);
}

export async function setUserPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await query(
    `UPDATE users SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    [passwordHash, userId]
  );
}

export async function markEmailVerified(userId: string): Promise<void> {
  await query(
    `UPDATE users SET email_verified_at = NOW() WHERE id = ? AND email_verified_at IS NULL`,
    [userId]
  );
}

/** Admin-only transition. Never call this from anything Google/user-driven. */
export async function setUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  await query(`UPDATE users SET status = ? WHERE id = ?`, [status, userId]);
}

/** Admin-only transition, and only ever from a trusted server-side path
 *  (see scripts/create-admin.mjs) — never reachable from any HTTP route. */
export async function setUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  await query(`UPDATE users SET role = ? WHERE id = ?`, [role, userId]);
}

export function isAccountLocked(user: Pick<UserRow, "locked_until">): boolean {
  if (!user.locked_until) return false;
  return new Date(user.locked_until).getTime() > Date.now();
}

/** Call after a failed password check. Locks the account temporarily after
 *  too many consecutive failures (basic brute-force mitigation). */
export async function registerFailedLogin(userId: string): Promise<void> {
  const user = await getUserById(userId);
  if (!user) return;
  const attempts = user.failed_login_attempts + 1;
  if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await query(
      `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
      [attempts, lockedUntil, userId]
    );
  } else {
    await query(`UPDATE users SET failed_login_attempts = ? WHERE id = ?`, [
      attempts,
      userId,
    ]);
  }
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await query(
    `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`,
    [userId]
  );
}

export interface AdminArtistListItem extends UserRow {
  artist_name: string | null;
  artist_slug: string | null;
  /** artists.featured for this user's linked profile, if any -- was never
   *  actually selected here before, which meant FeaturedToggle
   *  (components/admin/FeaturedToggle.tsx) always rendered from an
   *  undefined value on page load and could drift out of sync with the
   *  real column until clicked. Added alongside artist_featured_priority
   *  since both admin artist controls (FeaturedToggle.tsx and the new
   *  FeaturedPriorityInput.tsx) need real starting values. */
  artist_featured: number | null;
  artist_featured_priority: number | null;
  /** artists.phone/whatsapp for this user's linked profile, if any -- lets
   *  the admin "manage artists" screen render a direct call/WhatsApp link
   *  per row (see app/admin/artists/page.tsx) so staff can reach an artist
   *  without hunting through their profile first. */
  artist_phone: string | null;
  artist_whatsapp: string | null;
  /** Raw core-profile fields -- used only to flag an incomplete profile for
   *  the "needs a reminder" shortcut on the admin broadcast screen (see
   *  isArtistProfileIncomplete below). All NULL for a user who registered
   *  but never created an artist profile row at all (artist_id is NULL),
   *  which correctly counts as "incomplete" too. */
  artist_profile_image_url: string | null;
  artist_statement: string | null;
  artist_location: string | null;
  artist_mediums: string | null;
  /** Total rows in `artworks` for this artist, any status -- unlike
   *  getArtworkCountForArtist in lib/queries/artworks.ts (approved-only, for
   *  a public artist page), this counts pending/rejected submissions too,
   *  since "has this artist submitted anything at all" is the question the
   *  broadcast screen's reminder shortcut needs answered, not "has anything
   *  been approved yet". */
  artwork_count: number;
}

/** For the admin "manage artists" screen, and (via the extra fields above)
 *  the "needs a reminder" shortcut on the broadcast screen. */
export async function listArtistUsers(): Promise<AdminArtistListItem[]> {
  return query<AdminArtistListItem>(
    `SELECT u.*, a.name AS artist_name, a.slug AS artist_slug,
            a.featured AS artist_featured, a.featured_priority AS artist_featured_priority,
            a.phone AS artist_phone, a.whatsapp AS artist_whatsapp,
            a.profile_image_url AS artist_profile_image_url,
            a.artist_statement AS artist_statement,
            a.location AS artist_location,
            a.mediums AS artist_mediums,
            (SELECT COUNT(*) FROM artworks w WHERE w.artist_id = u.artist_id) AS artwork_count
     FROM users u
     LEFT JOIN artists a ON a.artist_id = u.artist_id
     WHERE u.role = 'artist'
     ORDER BY u.created_at DESC`
  );
}

/** Treats a profile as "incomplete" when it's missing any of the core,
 *  publicly-visible basics -- photo, artist statement, location, mediums --
 *  that ProfileForm.tsx groups above its "Professional profile" section;
 *  that section's own copy calls everything below it (bio, career history,
 *  social links, etc.) "entirely optional and never required to submit
 *  artwork", so none of those factor in here. Used only by the admin
 *  broadcast screen's "needs a reminder" shortcut (see
 *  app/admin/broadcast/page.tsx) -- not a gate anywhere else, so an artist
 *  is never blocked from doing anything over this. */
export function isArtistProfileIncomplete(artist: {
  artist_profile_image_url: string | null;
  artist_statement: string | null;
  artist_location: string | null;
  artist_mediums: string | null;
}): boolean {
  const hasRichText = (html: string | null) =>
    !!html && html.replace(/<[^>]*>/g, "").trim() !== "";
  return (
    !artist.artist_profile_image_url ||
    !hasRichText(artist.artist_statement) ||
    !artist.artist_location?.trim() ||
    !artist.artist_mediums?.trim()
  );
}

/** Every current admin's email -- used to notify the whole admin team on
 *  site events (today: a new customer inquiry, see
 *  lib/email/templates.ts#sendNewInquiryAdminEmail). Deliberately every
 *  admin, not just the super admin, since responding to customers is a
 *  normal admin capability, not a super-admin-only one. */
export async function listAdminEmails(): Promise<string[]> {
  const rows = await query<{ email: string }>(`SELECT email FROM users WHERE role = 'admin'`);
  return rows.map((row) => row.email);
}

/** For the super-admin-only "Manage Admins" screen
 *  (app/admin/admins/page.tsx) -- the super admin sorts first, then the
 *  rest by how long they've been an admin. */
export async function listAdminUsers(): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT * FROM users WHERE role = 'admin' ORDER BY is_super_admin DESC, created_at ASC`
  );
}

/**
 * Grants admin access to an existing account -- the UI-reachable
 * counterpart to scripts/create-admin.mjs's CLI promotion, reachable only
 * from app/admin/admins/actions.ts#promoteToAdminAction, which gates it
 * behind requireSuperAdmin(). Also activates the account (same as the CLI
 * script) so a pending/suspended user becomes a fully working admin right
 * away. Never touches is_super_admin -- that flag has no HTTP-reachable
 * setter at all (see scripts/set-super-admin.mjs).
 */
export async function promoteUserToAdmin(userId: string): Promise<void> {
  await query(`UPDATE users SET role = 'admin', status = 'active' WHERE id = ?`, [userId]);
}

/**
 * Reverses promoteUserToAdmin() above -- demotes an admin back to the
 * 'artist' role, which cuts off every /admin/* route on their very next
 * request (requireAdmin() re-checks role fresh every time, see
 * lib/auth/session.ts). Status resets to 'pending' rather than guessing
 * whether they should land back as an active artist, since an admin
 * promoted straight from a brand-new signup may never have had an
 * approved artist profile at all; an admin who DID have one before being
 * promoted can simply be re-approved from /admin/artists afterward. Never
 * called on a super admin -- enforced in the calling action
 * (app/admin/admins/actions.ts#revokeAdminAction), not here, same
 * defense-in-depth pattern as every other admin mutation in this codebase.
 */
export async function revokeAdminAccess(userId: string): Promise<void> {
  await query(`UPDATE users SET role = 'artist', status = 'pending' WHERE id = ?`, [userId]);
}
