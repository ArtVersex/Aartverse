import "server-only";
import { randomBytes, createHash } from "node:crypto";

/**
 * Generates a cryptographically random, URL-safe token to email to a user
 * (for email verification / password reset links). Only the HASH of this
 * value is ever stored in the database — see hashToken() — so a database
 * leak alone can never be used to redeem a token.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

/** One-way hash of a raw token, for storage/lookup in the database. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function futureDate(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}
