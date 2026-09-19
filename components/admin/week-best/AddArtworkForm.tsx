"use client";

import { useState, useTransition } from "react";
import { addArtworkToCollectionAction } from "@/app/admin/week-best/actions";

export default function AddArtworkForm({
  collectionId,
  candidates,
}: {
  collectionId: string;
  candidates: Array<{ artwork_id: string; title: string; artist_name: string | null }>;
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted">
        Every approved artwork is already in this collection.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={isPending}
        className="min-w-[16rem] border border-line px-3 py-2 text-sm focus:border-ink focus:outline-none"
      >
        <option value="">Choose an artwork…</option>
        {candidates.map((c) => (
          <option key={c.artwork_id} value={c.artwork_id}>
            {c.title}
            {c.artist_name ? ` — ${c.artist_name}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selected || isPending}
        onClick={() => {
          const artworkId = selected;
          setSelected("");
          startTransition(async () => {
            await addArtworkToCollectionAction(collectionId, artworkId);
          });
        }}
        className="btn-secondary"
      >
        {isPending ? "Adding…" : "Add to collection"}
      </button>
    </div>
  );
}
