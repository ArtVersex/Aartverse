"use client";

import { useTransition } from "react";
import { revokeAdminAction } from "@/app/admin/admins/actions";

/** Same "confirm, then fire the server action in a transition" shape as
 *  components/admin/ArtistRowActions.tsx's Suspend button -- revoking admin
 *  access is just as consequential, so it gets the same confirm() guard. */
export default function AdminRowActions({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Revoke this admin's access? They'll go back to a regular artist account.")) {
          startTransition(() => revokeAdminAction(userId));
        }
      }}
      className="eyebrow text-red-800 link-underline disabled:opacity-50"
    >
      Revoke access
    </button>
  );
}
