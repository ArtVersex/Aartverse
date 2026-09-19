"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteArtworkAction, submitArtworkAction } from "@/app/artist/artworks/actions";

/**
 * Row-level actions for one of the artist's own artworks -- used both on
 * the "My artworks" list (app/artist/artworks/page.tsx) and, minus the
 * redundant Edit link, in the edit page's own header
 * (app/artist/artworks/[artwork_id]/edit/page.tsx).
 *
 * Edit is effectively always available (the artwork's thumbnail/title on
 * the list already link to the edit page, and this is the edit page
 * itself), and so is Delete -- at any status, on purpose: an artist should
 * be able to remove an incomplete draft, a piece they've changed their
 * mind about, or anything else, without needing an admin's help. Publish
 * only appears for "draft" (a leftover from before artwork submission went
 * straight to "approved" -- see createArtworkAction) and legacy "rejected"
 * rows (to bring a piece live unchanged; editing a rejected piece also
 * auto-republishes it, see updateOwnedArtwork, but that only fires when
 * something actually changes).
 *
 * Delete asks for confirmation inline (swaps this control for a compact
 * "are you sure" bar) rather than a native `confirm()` popup, matching the
 * same pattern used by the admin's own delete flow
 * (components/admin/ArtworkRowActions.tsx).
 */
export default function ArtworkRowActions({
  artworkId,
  status,
  suspended,
  showEditLink = true,
}: {
  artworkId: string;
  status: string;
  suspended: boolean;
  showEditLink?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (suspended) {
    return <span className="font-sans text-xs text-muted">Actions paused</span>;
  }

  if (confirmingDelete) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-[13rem] text-right font-sans text-xs text-muted">
          Delete this artwork? This can&apos;t be undone.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmingDelete(false)}
            className="chip-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => deleteArtworkAction(artworkId))}
            className="chip-btn chip-btn-danger"
          >
            {isPending ? "Deleting…" : "Confirm delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showEditLink && (
        <Link href={`/artist/artworks/${artworkId}/edit`} className="chip-btn">
          Edit
        </Link>
      )}
      {(status === "draft" || status === "rejected") && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => submitArtworkAction(artworkId))}
          className="chip-btn"
        >
          {isPending ? "Publishing…" : status === "rejected" ? "Resubmit" : "Publish"}
        </button>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirmingDelete(true)}
        className="chip-btn chip-btn-danger"
      >
        Delete
      </button>
    </div>
  );
}
