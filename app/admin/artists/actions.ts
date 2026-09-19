"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { getUserById, setUserStatus } from "@/lib/queries/users";
import {
  setArtistActive,
  setArtistFeatured,
  setArtistFeaturedPriority,
} from "@/lib/queries/artistAccounts";
import { sendArtistApprovedEmail, sendArtistSuspendedEmail } from "@/lib/email/templates";

async function loadTargetArtist(userId: string) {
  const target = await getUserById(userId);
  if (!target || target.role !== "artist") {
    throw new Error("Artist not found.");
  }
  return target;
}

export async function approveArtistAction(userId: string): Promise<void> {
  await requireAdmin();
  const target = await loadTargetArtist(userId);

  await setUserStatus(target.id, "active");
  if (target.artist_id) {
    await setArtistActive(target.artist_id, true);
  }

  try {
    await sendArtistApprovedEmail(target);
  } catch (err) {
    console.error("[approve-artist] email failed:", (err as Error).message);
  }

  revalidatePath("/admin/artists");
}

export async function suspendArtistAction(userId: string): Promise<void> {
  await requireAdmin();
  const target = await loadTargetArtist(userId);

  await setUserStatus(target.id, "suspended");
  if (target.artist_id) {
    await setArtistActive(target.artist_id, false);
  }

  try {
    await sendArtistSuspendedEmail(target);
  } catch (err) {
    console.error("[suspend-artist] email failed:", (err as Error).message);
  }

  revalidatePath("/admin/artists");
}

/** Restores a suspended artist to active without re-sending the
 *  "you're approved" welcome email (that's only for first-time approval). */
export async function reactivateArtistAction(userId: string): Promise<void> {
  await requireAdmin();
  const target = await loadTargetArtist(userId);

  await setUserStatus(target.id, "active");
  if (target.artist_id) {
    await setArtistActive(target.artist_id, true);
  }

  revalidatePath("/admin/artists");
}

/**
 * Instant, no-form toggle for components/admin/FeaturedToggle.tsx -- same
 * "flip now, let the caller revert on failure" shape as
 * app/admin/artworks/actions.ts#toggleImpactfulAction. Only revalidates the
 * admin list, same as that action: the public /artists and / pages are
 * already on a 300s ISR revalidate (see their own `revalidate` export) and
 * will pick up the change on their own, same tradeoff already accepted for
 * the impactful flag.
 */
export async function toggleFeaturedAction(artistId: string, next: boolean): Promise<void> {
  await requireAdmin();
  await setArtistFeatured(artistId, next);
  revalidatePath("/admin/artists");
}

/**
 * Instant, no-form save for components/admin/FeaturedPriorityInput.tsx --
 * same shape as toggleFeaturedAction above, just carrying a number (or
 * null to clear) instead of a boolean. Also revalidates "/" and "/artists"
 * since, unlike the admin list, the public home page's "Featured artists"
 * rail (getFeaturedArtists) reads this value directly and isn't on a short
 * enough ISR revalidate window to be worth waiting out during testing.
 */
export async function setFeaturedPriorityAction(
  artistId: string,
  priority: number | null
): Promise<void> {
  await requireAdmin();
  await setArtistFeaturedPriority(artistId, priority);
  revalidatePath("/admin/artists");
  revalidatePath("/artists");
  revalidatePath("/");
}
