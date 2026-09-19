/**
 * Turns the two plain-number inputs artists see (Width / Height) into the
 * single `artworks.dimensions` string the DB has always stored, and back
 * again for prefilling those two boxes when an existing artwork is edited.
 *
 * `dimensions` itself stays a free-text VARCHAR with no format enforced at
 * the DB or validation layer (see lib/validation/artwork.ts's note on why a
 * strict format isn't forced at that layer either) -- this is purely a
 * UI-layer convenience, same spirit as components/artist/CategoryFields.tsx
 * turning a free-text column into a guided picker. An artwork saved before
 * this feature existed can hold anything in `dimensions` (blank, "24x36",
 * "Diameter 30cm, framed", ...); parseDimensions only recognizes a clean
 * "<number> x <number>" shape and returns null for everything else, so
 * components/artist/DimensionFields.tsx can fall back to showing that raw
 * legacy text untouched instead of silently discarding it.
 */

const DIMENSIONS_PATTERN =
  /^(\d+(?:\.\d+)?)\s*(?:"|”|in\.?|inch(?:es)?)?\s*[x×X]\s*(\d+(?:\.\d+)?)\s*(?:"|”|in\.?|inch(?:es)?)?$/;

export function parseDimensions(
  raw: string | null | undefined
): { width: string; height: string } | null {
  if (!raw) return null;
  const match = raw.trim().match(DIMENSIONS_PATTERN);
  if (!match) return null;
  return { width: match[1], height: match[2] };
}

/** Drops insignificant trailing zeros (24.50 -> 24.5, 24.0 -> 24) via a
 *  plain round-trip through parseFloat. Only ever called on a value that's
 *  already passed the numeric <input>, so this is always a clean decimal
 *  string by the time it gets here. */
function trimNumber(value: string): string {
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(n) : value.trim();
}

/** e.g. formatDimensions("24", "24") -> `24"x24"` -- exactly the format the
 *  artist used to have to type by hand (quotes, "x", no spaces). */
export function formatDimensions(width: string, height: string): string {
  return `${trimNumber(width)}"x${trimNumber(height)}"`;
}
