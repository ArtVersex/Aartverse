"use client";

import { useState } from "react";
import { parseDimensions, formatDimensions } from "@/lib/dimensions";

/**
 * Replaces a single free-text "Dimensions" input with two plain numeric
 * boxes (Width / Height) so the artist never has to type the quote marks
 * or "x" themselves. The two boxes carry no `name` of their own -- a hidden
 * "dimensions" input carries the composed result (e.g. 24"x24"), so the
 * server action's FormData reading needs no changes at all, same pattern as
 * CategoryFields.tsx's subcategory field.
 *
 * An existing artwork's saved dimensions string is parsed back into the two
 * boxes when it cleanly matches "<number> x <number>" (see
 * lib/dimensions.ts). When it doesn't -- free text saved before this
 * feature existed, e.g. "Diameter 30cm, framed" -- the boxes start blank
 * rather than guessing, and that raw text is carried through untouched
 * (shown as a caption below) unless and until the artist fills in both
 * boxes to replace it. That mirrors how every other field on this form
 * already behaves (an untouched box doesn't change that column) while still
 * never silently deleting an older value the new boxes can't represent.
 */
export default function DimensionFields({
  defaultDimensions,
}: {
  defaultDimensions?: string | null;
}) {
  const parsedOnce = parseDimensions(defaultDimensions);
  const [width, setWidth] = useState(parsedOnce?.width ?? "");
  const [height, setHeight] = useState(parsedOnce?.height ?? "");

  const legacyRaw = !parsedOnce && defaultDimensions ? defaultDimensions.trim() : "";
  const widthFilled = width.trim() !== "" && !Number.isNaN(parseFloat(width));
  const heightFilled = height.trim() !== "" && !Number.isNaN(parseFloat(height));
  const bothFilled = widthFilled && heightFilled;
  const onlyOneFilled = widthFilled !== heightFilled;

  const composedValue = bothFilled ? formatDimensions(width, height) : legacyRaw;

  return (
    <div>
      <span className="field-label">Dimensions</span>
      <div className="flex items-center gap-3">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          placeholder="Width"
          aria-label="Width, in inches"
          className="min-w-0 flex-1"
        />
        <span aria-hidden className="shrink-0 text-muted">
          ×
        </span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Height"
          aria-label="Height, in inches"
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 font-sans text-xs text-muted">inches</span>
      </div>

      {bothFilled ? (
        <p className="mt-1.5 font-sans text-xs text-muted">Will be saved as {composedValue}</p>
      ) : onlyOneFilled ? (
        <p className="mt-1.5 font-sans text-xs text-muted">Enter both width and height.</p>
      ) : legacyRaw ? (
        <p className="mt-1.5 font-sans text-xs text-muted">
          Currently saved as &ldquo;{legacyRaw}&rdquo;. Fill in both boxes above to replace it.
        </p>
      ) : null}

      <input type="hidden" name="dimensions" value={composedValue} />
    </div>
  );
}
