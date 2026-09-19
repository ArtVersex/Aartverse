/**
 * A representative hex for each color family, used only as a last-resort
 * fallback. `artwork_colors` rows with color_scope = 'family' carry a
 * proportion but no hex (see lib/queries/colors.ts), so the real swatch
 * color normally comes from averaging that family's own `dominant`-scope
 * rows instead — this map only covers a family that, for some artwork,
 * has no matching dominant row at all.
 *
 * The list matches the fixed set of family names actually used across the
 * `artwork_colors` table today. If a new family name shows up later that
 * isn't listed here, it still renders — just with a neutral gray swatch
 * instead of a tailored one — rather than breaking.
 */
export const FAMILY_COLOR_FALLBACK: Record<string, string> = {
  white: "#F5F3EC",
  black: "#1E1B18",
  gray: "#9C9890",
  grey: "#9C9890",
  beige: "#E3D5B8",
  brown: "#7B5233",
  red: "#B23A34",
  orange: "#C9702E",
  yellow: "#D8B84A",
  pink: "#E3A8B3",
  purple: "#7C6296",
  blue: "#4C74A0",
  teal: "#3E8C82",
  cyan: "#3E8C82",
  green: "#5F8C55",
  other: "#B5AFA3",
};

/** Case/whitespace-tolerant lookup against the fallback map above. */
export function fallbackFamilyHex(familyName: string | null | undefined): string {
  const key = (familyName ?? "").trim().toLowerCase();
  return FAMILY_COLOR_FALLBACK[key] ?? FAMILY_COLOR_FALLBACK.other;
}
