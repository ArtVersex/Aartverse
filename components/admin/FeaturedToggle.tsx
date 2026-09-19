"use client";

import { useState, useTransition } from "react";
import { toggleFeaturedAction } from "@/app/admin/artists/actions";

/**
 * Inline "featured" star toggle for one artist row on /admin/artists --
 * same optimistic-flip shape as components/admin/ImpactfulToggle.tsx (flips
 * immediately, reverts only if the server action actually throws).
 *
 * This is what actually gives artists.featured a way to be set at all:
 * getAllArtists() (lib/queries/artists.ts) already orders the public
 * /artists page by `featured DESC`, and getFeaturedArtists() already powers
 * the home page's "Featured artists" rail, but until this control existed
 * nothing ever wrote to that column, so every artist tied at "not featured"
 * and the sort had no visible effect.
 */
export default function FeaturedToggle({
  artistId,
  initialValue,
}: {
  artistId: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      try {
        await toggleFeaturedAction(artistId, next);
      } catch {
        setValue(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={value}
      title={value ? "Featured artist (click to remove)" : "Mark as a featured artist"}
      className={`eyebrow shrink-0 border px-2.5 py-1 text-[10px] transition-colors ${
        value
          ? "border-accent bg-accent text-canvas"
          : "border-line text-muted hover:border-ink hover:text-ink"
      } ${isPending ? "opacity-60" : ""}`}
    >
      {value ? "★ Featured" : "☆ Featured"}
    </button>
  );
}
