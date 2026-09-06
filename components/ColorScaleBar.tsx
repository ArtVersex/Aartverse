import { normalizeHex } from "@/lib/utils";

export interface ColorScaleSegment {
  family: string;
  /** Already normalized to a 0–100 percentage by the caller. A single
   *  family's raw DB proportion can't be told apart as "0–1 fraction" vs
   *  "0–100 percentage" on its own — a legitimate percentage-scale share can
   *  itself be well under 1 (e.g. 0.77%) — so that decision has to be made
   *  once for the whole set of a given artwork's family rows together (see
   *  the colorScaleSegments construction in the artwork detail page). This
   *  component intentionally does no further per-segment guessing. */
  proportion: number;
  hex: string;
}

/**
 * A single horizontal bar, one segment per color family, each sized by its
 * share of the artwork — the "color scale" view of an artwork's palette,
 * built from artwork_colors' color_scope = 'family' rows (which store
 * exactly this: a family name + its proportion). A short legend underneath
 * spells out the same numbers, since a thin bar segment alone isn't always
 * readable for a small share.
 */
export default function ColorScaleBar({ segments }: { segments: ColorScaleSegment[] }) {
  const normalized = segments
    .map((s) => ({ ...s, pct: s.proportion }))
    .filter((s) => s.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  if (normalized.length === 0) return null;

  const total = normalized.reduce((sum, s) => sum + s.pct, 0) || 100;

  return (
    <div>
      <div className="flex h-4 w-full overflow-hidden rounded-full border border-line/60">
        {normalized.map((s) => (
          <span
            key={s.family}
            style={{
              width: `${(s.pct / total) * 100}%`,
              backgroundColor: normalizeHex(s.hex) ?? "#d8d2c8",
            }}
            title={`${s.family} — ${Math.round(s.pct)}%`}
          />
        ))}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {normalized.map((s) => (
          <li key={s.family} className="flex items-center gap-2 text-sm text-muted">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full border border-line/60"
              style={{ backgroundColor: normalizeHex(s.hex) ?? "#d8d2c8" }}
              aria-hidden
            />
            {s.family} <span className="text-xs">({Math.round(s.pct)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
