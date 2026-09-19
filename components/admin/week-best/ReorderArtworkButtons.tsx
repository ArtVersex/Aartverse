"use client";

import { useTransition } from "react";
import { moveArtworkInCollectionAction } from "@/app/admin/week-best/actions";

export default function ReorderArtworkButtons({
  collectionId,
  artworkId,
  canMoveUp,
  canMoveDown,
}: {
  collectionId: string;
  artworkId: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveArtworkInCollectionAction(collectionId, artworkId, direction);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => move("up")}
        disabled={!canMoveUp || isPending}
        aria-label="Move up in this collection"
        title="Move up"
        className="border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={!canMoveDown || isPending}
        aria-label="Move down in this collection"
        title="Move down"
        className="border border-line px-2 py-1 text-xs text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-30"
      >
        ↓
      </button>
    </div>
  );
}
