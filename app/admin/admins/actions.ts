"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/session";
import {
  getUserByEmail,
  getUserById,
  promoteUserToAdmin,
  revokeAdminAccess,
} from "@/lib/queries/users";

export interface PromoteAdminState {
  error?: string;
  success?: boolean;
}

/**
 * The UI-reachable way to grant admin access -- looked up by email, same
 * convention as scripts/create-admin.mjs's CLI promotion, just from a form
 * instead of a shell. Gated to the super admin only (requireSuperAdmin());
 * every other admin either doesn't see this page at all or (if they guess
 * the URL) is redirected away before this ever runs.
 */
export async function promoteToAdminAction(
  _prevState: PromoteAdminState,
  formData: FormData
): Promise<PromoteAdminState> {
  await requireSuperAdmin();

  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!email) {
    return { error: "Enter the email address of an existing account." };
  }

  const target = await getUserByEmail(email);
  if (!target) {
    return {
      error: `No account found for "${email}". They need to register first (Google or email/password) -- this can only grant admin access to an existing account.`,
    };
  }
  if (target.role === "admin") {
    return { error: `${target.email} is already an admin.` };
  }

  await promoteUserToAdmin(target.id);
  revalidatePath("/admin/admins");
  return { success: true };
}

/**
 * Instant, no-form action for components/admin/AdminRowActions.tsx's
 * "Revoke access" button -- same "flip now" shape as suspendArtistAction in
 * app/admin/artists/actions.ts. Refuses to touch the super admin account
 * (that status has no HTTP-reachable setter anywhere, see
 * scripts/set-super-admin.mjs, and must stay that way) and refuses to let
 * the super admin revoke their own access by mistake, which would
 * otherwise lock everyone out of ever granting admin access again.
 */
export async function revokeAdminAction(userId: string): Promise<void> {
  const actingUser = await requireSuperAdmin();

  const target = await getUserById(userId);
  if (!target || target.role !== "admin") {
    throw new Error("Admin not found.");
  }
  if (target.is_super_admin) {
    throw new Error("The super admin's access can't be revoked from here.");
  }
  if (target.id === actingUser.id) {
    throw new Error("You can't revoke your own access.");
  }

  await revokeAdminAccess(target.id);
  revalidatePath("/admin/admins");
}
