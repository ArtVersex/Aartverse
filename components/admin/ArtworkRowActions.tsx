"use client";

import { useState, useTransition } from "react";
import { deleteArtworkAsAdminAction } from "@/app/admin/artworks/actions";

/**
 * Admin's only per-artwork action now that every submission publishes
 * immediately (see app/artist/artworks/actions.ts) -- there's no more
 * Approve/Reject queue to work through. This is deliberately delete-only,
 * for the rare piece that turns out not to be a genuine, accurate
 * submission from that artist; day-to-day curation (deciding what to
 * spotlight) happens through the separate, always-visible
 * components/admin/ImpactfulToggle.tsx instead.
 *
 * Used both on the artworks list (app/admin/artworks/page.tsx) and the
 * detail/review page (app/admin/artworks/[artwork_id]/page.tsx), same
 * component in both places -- deleteArtworkAsAdminAction always redirects
 * to /admin/artworks, which is a harmless refresh from the list and a
 * necessary navigation away from a detail page that no longer exists.
 *
 * Confirms inline (swaps this control for a compact "are you sure" bar)
 * rather than a native confirm() popup, matching the same pattern already
 * used by the artist's own delete flow
 * (components/artist/ArtworkRowActions.tsx).
 */
export default function ArtworkRowActions({ artworkId }: { artworkId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-[13rem] text-right font-sans text-xs text-muted">
          Delete this artwork? This can&apos;t be undone.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={isPending} onClick={() => setConfirming(false)} className="chip-btn">
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteArtworkAsAdminAction(artworkId))}
            className="chip-btn chip-btn-danger"
          >
            {isPending ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => setConfirming(true)}
      className="chip-btn chip-btn-danger"
    >
      Delete
    </button>
  );
}
