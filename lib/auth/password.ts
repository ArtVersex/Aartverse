import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/** Hashes a plaintext password for storage. Never store the plaintext. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compares a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Minimum password strength check, enforced server-side (in addition to
 * whatever client-side hints the form shows). Keep in sync with the zod
 * schema in lib/validation/auth.ts.
 */
export function isPasswordStrongEnough(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}
