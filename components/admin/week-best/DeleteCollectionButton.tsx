"use client";

import { useTransition } from "react";
import { deleteWeekBestCollectionAction } from "@/app/admin/week-best/actions";

export default function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        if (
          typeof window !== "undefined" &&
          !window.confirm("Delete this collection? This can't be undone.")
        ) {
          return;
        }
        startTransition(async () => {
          await deleteWeekBestCollectionAction(collectionId);
        });
      }}
      disabled={isPending}
      className="eyebrow border border-line px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-red-700 hover:text-red-700"
    >
      {isPending ? "Deleting…" : "Delete"}
    </button>
  );
}
