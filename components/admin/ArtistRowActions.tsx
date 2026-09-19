"use client";

import { useTransition } from "react";
import {
  approveArtistAction,
  suspendArtistAction,
  reactivateArtistAction,
} from "@/app/admin/artists/actions";

export default function ArtistRowActions({
  userId,
  status,
}: {
  userId: string;
  status: "pending" | "active" | "suspended";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      {status !== "active" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              status === "suspended"
                ? reactivateArtistAction(userId)
                : approveArtistAction(userId)
            )
          }
          className="eyebrow link-underline disabled:opacity-50"
        >
          {status === "suspended" ? "Reactivate" : "Approve"}
        </button>
      )}
      {status !== "suspended" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("Suspend this artist? Their data will be preserved.")) {
              startTransition(() => suspendArtistAction(userId));
            }
          }}
          className="eyebrow text-red-800 link-underline disabled:opacity-50"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
