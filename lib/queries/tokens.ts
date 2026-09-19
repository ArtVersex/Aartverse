import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import {
  generateRawToken,
  hashToken,
  futureDate,
  VERIFICATION_TOKEN_TTL_MS,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from "@/lib/auth/tokens";

interface TokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/**
 * Creates a new email-verification token for a user and returns the RAW
 * token (only this call site ever sees the raw value — put it straight
 * into the email link and discard it; only the hash is persisted).
 */
export async function createVerificationToken(userId: string): Promise<string> {
  const raw = generateRawToken();
  await query(
    `INSERT INTO verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [randomUUID(), userId, hashToken(raw), futureDate(VERIFICATION_TOKEN_TTL_MS)]
  );
  return raw;
}

/**
 * Redeems a raw verification token: valid, unused, unexpired tokens are
 * marked used (single-use) and the owning user id is returned. Returns
 * null for anything invalid, already-used, or expired, without revealing
 * which.
 */
export async function consumeVerificationToken(
  rawToken: string
): Promise<string | null> {
  const hash = hashToken(rawToken);
  const row = await queryOne<TokenRow>(
    `SELECT * FROM verification_tokens WHERE token_hash = ? LIMIT 1`,
    [hash]
  );
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await query(`UPDATE verification_tokens SET used_at = NOW() WHERE id = ?`, [
    row.id,
  ]);
  return row.user_id;
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const raw = generateRawToken();
  await query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
    [randomUUID(), userId, hashToken(raw), futureDate(PASSWORD_RESET_TOKEN_TTL_MS)]
  );
  return raw;
}

/** Same single-use / expiry semantics as consumeVerificationToken(). */
export async function consumePasswordResetToken(
  rawToken: string
): Promise<string | null> {
  const hash = hashToken(rawToken);
  const row = await queryOne<TokenRow>(
    `SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1`,
    [hash]
  );
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [
    row.id,
  ]);
  return row.user_id;
}
