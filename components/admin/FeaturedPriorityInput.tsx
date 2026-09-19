"use client";

import { useState, useTransition } from "react";
import { setFeaturedPriorityAction } from "@/app/admin/artists/actions";

/**
 * Inline numeric "priority" input for one artist row on /admin/artists --
 * sits next to FeaturedToggle. Only meaningful once an artist is marked
 * featured (see getFeaturedArtists, lib/queries/artists.ts): a higher
 * number sits closer to the top of the featured order, ties (and blanks)
 * fall back to plain alphabetical order among featured artists, same as
 * before this control existed.
 *
 * Saves on blur/Enter rather than on every keystroke -- a free-typed number
 * needs a moment to finish, unlike a single click -- but keeps the same
 * "apply optimistically, revert only if the server action throws" shape as
 * FeaturedToggle/ImpactfulToggle.
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
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setText(toText(committed));
      return;
    }
    if (parsed !== committed) save(parsed);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      disabled={isPending}
      placeholder="Priority"
      title="Priority among featured artists -- higher shows first; blank uses default (alphabetical) order"
      className={`w-20 border border-line px-2 py-1 text-center text-[11px] text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none ${isPending ? "opacity-60" : ""}`}
    />
  );
}
