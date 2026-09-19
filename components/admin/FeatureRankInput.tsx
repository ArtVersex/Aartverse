"use client";

import { useState, useTransition } from "react";
import { setFeatureRankAction } from "@/app/admin/artworks/actions";

/**
 * Inline numeric "rank" input for one artwork -- used on the admin artworks
 * list (app/admin/artworks/page.tsx) and the review/detail page
 * (app/admin/artworks/[artwork_id]/page.tsx), next to ImpactfulToggle. Only
 * meaningful once a piece is marked impactful (see getFeaturedArtworks,
 * lib/queries/artworks.ts): 1 = the single best pick, 2 = next, and so on.
 * Blank (NULL) leaves the piece to backfill the rest of the home page rail
 * by recency, same as every artwork before this control existed.
 *
 * Same "save on blur/Enter, optimistic apply, revert only on failure" shape
 * as FeaturedPriorityInput (components/admin/FeaturedPriorityInput.tsx) --
 * the artist-side equivalent of this same idea.
 *
 * The small "×" button next to the input is a one-click reset back to NULL
 * (its original, unranked state) -- only shown once a rank is actually set,
 * so there's always an obvious way back to "unranked" without having to
 * select-all/backspace the field and remember to blur it.
 */
export default function FeatureRankInput({
  artworkId,
  initialValue,
}: {
  artworkId: string;
  initialValue: number | null;
}) {
  const toText = (n: number | null) => (n === null ? "" : String(n));
  const [committed, setCommitted] = useState<number | null>(initialValue);
  const [text, setText] = useState<string>(toText(initialValue));
  const [isPending, startTransition] = useTransition();

  function save(next: number | null) {
    const previous = committed;
    setCommitted(next);
    setText(toText(next));
    startTransition(async () => {
      try {
        await setFeatureRankAction(artworkId, next);
      } catch {
        setCommitted(previous);
        setText(toText(previous));
      }
    });
  }

  function commit() {
    const trimmed = text.trim();
    if (trimmed === "") {
      if (committed !== null) save(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
      setText(toText(committed));
      return;
    }
    if (parsed !== committed) save(parsed);
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        disabled={isPending}
        placeholder="Rank"
        title="Feature rank -- 1 is the best pick shown first on the home page; blank fills in by recency"
        className={`w-16 border border-line px-2 py-1 text-center text-[11px] text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none ${isPending ? "opacity-60" : ""}`}
      />
      {committed !== null && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={isPending}
          title="Clear rank -- back to unranked (fills in by recency)"
          aria-label="Clear rank"
          className={`text-xs leading-none text-muted transition-colors hover:text-ink ${isPending ? "opacity-60" : ""}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
