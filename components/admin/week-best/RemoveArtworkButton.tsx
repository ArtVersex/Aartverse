"use client";

import { useTransition } from "react";
import { removeArtworkFromCollectionAction } from "@/app/admin/week-best/actions";

export default function RemoveArtworkButton({
  collectionId,
  artworkId,
}: {
  collectionId: string;
  artworkId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          await removeArtworkFromCollectionAction(collectionId, artworkId);
        });
      }}
      disabled={isPending}
      className="eyebrow border border-line px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-red-700 hover:text-red-700"
    >
      {isPending ? "Removing…" : "Remove"}
    </button>
  );
}
