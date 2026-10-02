/**
 * Lightweight parser/converter for `artworks.dimensions` -- a free-text
 * column (e.g. "60 x 90 cm", "24 x 36 in", "60 x 90") with no fixed format,
 * entered by hand by each artist (see components/artist/ArtworkForm.tsx).
 * Rather than requiring artists to re-enter their data in a stricter shape,
 * this extracts whatever numbers it can find and lets the viewer toggle the
 * *display* unit -- see components/DimensionsToggle.tsx.
 */

const CM_PER_IN = 2.54;

const IN_UNIT_REGEX = /\b(inch(?:es)?|in)\b|["”]/i;
const CM_UNIT_REGEX = /\b(centimet(?:er|re)s?|cm)\b/i;

export type DimensionUnit = "cm" | "in";

export interface ParsedDimensions {
  /** The numbers found, in their original order (width, height, and an
   *  optional third for depth) -- in `unit`. */
  values: number[];
  /** The unit the original text was written in. Defaults to 'cm' when no
   *  unit is mentioned at all -- the overwhelming majority of existing
   *  dimension text on this site is plain numbers with no unit, and every
   *  one checked so far is a centimeter measurement (consistent with this
   *  being an India-based marketplace), so that's the safest default rather
   *  than refusing to show a toggle at all. */
  unit: DimensionUnit;
}

/** Returns null when the text doesn't contain at least two numbers (width
 *  + height) -- not worth offering a toggle for, so the caller should just
 *  render the original string as plain text. */
export function parseDimensionString(raw: string): ParsedDimensions | null {
  const numberMatches = raw.match(/\d+(?:\.\d+)?/g);
  if (!numberMatches || numberMatches.length < 2) return null;

  const isInches = IN_UNIT_REGEX.test(raw) && !CM_UNIT_REGEX.test(raw);
  return {
    values: numberMatches.map(Number),
    unit: isInches ? "in" : "cm",
  };
}

export function convertDimensionValues(
  values: number[],
  from: DimensionUnit,
  to: DimensionUnit
): number[] {
  if (from === to) return values;
  return from === "cm" ? values.map((v) => v / CM_PER_IN) : values.map((v) => v * CM_PER_IN);
}

/** Whole numbers display as whole numbers; anything else to one decimal --
 *  keeps "60 × 90 cm" clean while still showing "23.6 × 35.4 in" for the
 *  converted side, which is essentially never a round number. */
export function formatDimensionValues(values: number[]): string {
  return values.map((v) => (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1))).join(" × ");
}

// --- Width/Height entry on the artist's own submission form -----------
//
// Everything above is for the public-facing cm/in *display* toggle
// (DimensionsToggle.tsx), which accepts any unit and any number of parsed
// values. The two functions below are a separate, narrower pair: they back
// DimensionFields.tsx's two plain Width/Height number boxes on
// components/artist/ArtworkForm.tsx, which always collects (and stores) a
// single inches measurement in one fixed shape, e.g. 24"x24".

export interface ParsedWidthHeight {
  width: string;
  height: string;
}

/** Strictly parses the one shape formatDimensions below ever writes --
 *  "<number>"?x<number>"?", optionally spaced, optionally quote-marked
 *  (24"x24", 24 x 24, 24x24) -- back into separate width/height strings so
 *  an existing artwork's saved dimensions re-populates the two boxes on the
 *  edit form. Returns null for anything else -- a three-number depth, a
 *  unit-less/open-ended legacy string like "Diameter 30cm, framed", or no
 *  numbers at all -- so the form falls back to showing that original text
 *  untouched (see DimensionFields.tsx's `legacyRaw`) rather than guessing at
 *  a bad split. */
export function parseDimensions(raw: string | null | undefined): ParsedWidthHeight | null {
  if (!raw) return null;
  const match = raw
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*"?\s*x\s*(\d+(?:\.\d+)?)\s*"?$/i);
  if (!match) return null;
  return { width: match[1], height: match[2] };
}

/** Composes the two Width/Height boxes back into the single stored string,
 *  in inches (matching the boxes' own "inches" label) -- e.g. 24"x24".
 *  Called only once both boxes hold a valid number (DimensionFields.tsx's
 *  `bothFilled` check happens before this), so this assumes valid numeric
 *  strings rather than re-validating them itself. */
export function formatDimensions(width: string, height: string): string {
  return `${width}"x${height}"`;
}
