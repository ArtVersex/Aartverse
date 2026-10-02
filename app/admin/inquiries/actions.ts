"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { setInquiryStatus } from "@/lib/queries/inquiries";
import type { InquiryStatus } from "@/lib/types";

/** Instant, no-form status update for app/admin/inquiries/page.tsx -- same
 *  "flip now" shape as toggleFeaturedAction in app/admin/artists/actions.ts.
 *  Any admin can use this (responding to customers isn't a super-admin-only
 *  capability -- see lib/queries/users.ts#listAdminEmails's own comment). */
export async function setInquiryStatusAction(id: string, status: InquiryStatus): Promise<void> {
  await requireAdmin();
  await setInquiryStatus(id, status);
  revalidatePath("/admin/inquiries");
}
