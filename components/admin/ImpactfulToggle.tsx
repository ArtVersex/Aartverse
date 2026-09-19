"use client";

import { useState, useTransition } from "react";
import { toggleImpactfulAction } from "@/app/admin/artworks/actions";

/**
 * Inline "impactful" star toggle for one artwork row in the admin list (see
 * app/admin/artworks/page.tsx) -- lets an admin flag a piece as worth
 * featuring without opening the full review/detail page. Optimistic: flips
 * immediately on click and only reverts if the server action actually
 * fails, so it feels instant even though it's a real database write.
 *
 * Deliberately its own tiny client component (rather than making the whole
 * list row/page client-side) -- the surrounding admin list stays a plain
 * server component, and only this one control needs interactivity.
 */
export default function ImpactfulToggle({
  artworkId,
  initialValue,
}: {
  artworkId: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      try {
        await toggleImpactfulAction(artworkId, next);
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
      title={value ? "Marked impactful (click to remove)" : "Mark as impactful"}
      className={`eyebrow shrink-0 border px-2.5 py-1 text-[10px] transition-colors ${
        value
          ? "border-accent bg-accent text-canvas"
          : "border-line text-muted hover:border-ink hover:text-ink"
      } ${isPending ? "opacity-60" : ""}`}
    >
      {value ? "★ Impactful" : "☆ Impactful"}
    </button>
  );
}
