"use client";

import { useState, useTransition } from "react";
import { setFeaturedPriorityAction } from "@/app/admin/artists/actions";

/**
 * Inline numeric "priority" input for one artist row on /admin/artists --
 * sits next to FeaturedToggle. Only meaningful once an artist is marked
 * featured (see getFeaturedArtists, lib/queries/artists.ts).
 *
 * Deliberately matches components/admin/FeatureRankInput.tsx's behavior
 * exactly (same semantics, same control) rather than its own earlier
 * "higher number shows first, any number allowed" rule: 1 = the single
 * best pick, 2 = next, and so on; blank (NULL) leaves the artist to
 * backfill the rest of the featured order alphabetically, same as before
 * this control existed. Changed 2026-10 -- note this flips the sort
 * direction from before (getFeaturedArtists now orders ascending), so any
 * artist who already had a priority number set reorders once this ships.
 *
 * Same "save on blur/Enter, optimistic apply, revert only on failure" shape
 * as before, plus the same one-click "x" reset back to NULL that
 * FeatureRankInput has, shown only once a priority is actually set.
 */
export default function FeaturedPriorityInput({
  artistId,
  initialValue,
}: {
  artistId: string;
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
        await setFeaturedPriorityAction(artistId, next);
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
        placeholder="Priority"
        title="Priority among featured artists -- 1 is shown first; blank fills in alphabetically"
        className={`w-20 border border-line px-2 py-1 text-center text-[11px] text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none ${isPending ? "opacity-60" : ""}`}
      />
      {committed !== null && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={isPending}
          title="Clear priority -- back to default alphabetical order"
          aria-label="Clear priority"
          className={`text-xs leading-none text-muted transition-colors hover:text-ink ${isPending ? "opacity-60" : ""}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
