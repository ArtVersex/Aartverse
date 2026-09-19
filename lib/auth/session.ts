import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserById } from "@/lib/queries/users";
import type { UserRow } from "@/lib/types";

/**
 * Always re-reads the user row fresh from the database. The JWT's
 * role/status claims are convenient for the coarse middleware gate, but
 * they can lag behind an admin's most recent decision by up to one
 * request — so every real authorization decision in a page, server
 * action, or route handler goes through THIS function instead of trusting
 * the token, guaranteeing approve/suspend take effect immediately and a
 * stale/forged claim can never grant more than the database currently
 * allows.
 */
export async function getSessionUser(): Promise<UserRow | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getUserById(session.user.id);
}

export async function requireUser(): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireArtist(): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== "artist") redirect("/");
  return user;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

export class ArtistSuspendedError extends Error {
  constructor() {
    super(
      "Your artist account is currently suspended, so this action isn't available. Your profile and existing artworks are safe."
    );
    this.name = "ArtistSuspendedError";
  }
}

/**
 * Guard for mutating artist actions (create/edit/delete/submit artwork,
 * update profile). Pending accounts ARE allowed through — only suspended
 * accounts are blocked — per the onboarding flow: approval gates being
 * listed for sale, not using the portal.
 */
export async function requireActiveArtistForMutation(): Promise<UserRow> {
  const user = await requireArtist();
  if (user.status === "suspended") {
    throw new ArtistSuspendedError();
  }
  if (!user.artist_id) {
    throw new Error("Your artist profile isn't set up yet. Please contact support.");
  }
  return user;
}
