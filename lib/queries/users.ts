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
}

/** For the admin "manage artists" screen. */
export async function listArtistUsers(): Promise<AdminArtistListItem[]> {
  return query<AdminArtistListItem>(
    `SELECT u.*, a.name AS artist_name, a.slug AS artist_slug,
            a.featured AS artist_featured, a.featured_priority AS artist_featured_priority
     FROM users u
     LEFT JOIN artists a ON a.artist_id = u.artist_id
     WHERE u.role = 'artist'
     ORDER BY u.created_at DESC`
  );
}
