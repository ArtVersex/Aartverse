"use client";

import { useState } from "react";
import {
  convertDimensionValues,
  formatDimensionValues,
  parseDimensionString,
  type DimensionUnit,
} from "@/lib/dimensions";

const UNITS: DimensionUnit[] = ["cm", "in"];

/**
 * Renders the artwork's `dimensions` text with a cm/in toggle when it can
 * be parsed (see lib/dimensions.ts), falling back to the plain original
 * string when it can't -- a free-typed value the parser doesn't recognize
 * (no numbers at all, or just one) still displays exactly as entered,
 * nothing is ever hidden or altered on the page.
 */
export default function DimensionsToggle({ raw }: { raw: string }) {
  const parsed = parseDimensionString(raw);
  const [unit, setUnit] = useState<DimensionUnit>(parsed?.unit ?? "cm");

  if (!parsed) {
    return <>{raw}</>;
  }

  const values = convertDimensionValues(parsed.values, parsed.unit, unit);

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span>
        {formatDimensionValues(values)} {unit}
      </span>
      <span className="inline-flex overflow-hidden border border-line" role="group" aria-label="Display unit">
        {UNITS.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUnit(u)}
            aria-pressed={unit === u}
            className={`px-2 py-0.5 font-sans text-[10px] uppercase tracking-widest2 transition-colors ${
              unit === u ? "bg-ink text-canvas" : "text-muted hover:text-ink"
            }`}
          >
            {u}
          </button>
        ))}
      </span>
    </span>
  );
}
