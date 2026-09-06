import "server-only";
import { query } from "@/lib/db";
import { rgbToHex } from "@/lib/utils";
import { fallbackFamilyHex } from "@/lib/colorFamilies";

export interface ColorFacet {
  color_family: string;
  hex: string;
}

/**
 * Distinct color families used for the color filter UI and the "find by
 * color" browsing section, each with a representative swatch hex.
 *
 * Filtering itself (see lib/queries/artworks.ts) matches and ranks purely
 * on `artwork_colors` rows with color_scope = 'family' — color_family +
 * proportion, exactly as stored. Those 'family' rows are precomputed
 * percentages with no hex of their own (hex/rgb are NULL on them), so the
 * swatch color shown for each family is computed separately here, by
 * averaging the RGB of that family's 'dominant'-scope rows instead — the
 * scope that actually carries real measured colors. A family with no
 * matching dominant rows at all falls back to a fixed representative hex
 * (lib/colorFamilies.ts) rather than showing no color.
 */
export async function getColorFacets(): Promise<ColorFacet[]> {
  const families = await query<{ color_family: string }>(
    `SELECT DISTINCT color_family FROM artwork_colors
     WHERE color_scope = 'family' AND color_family IS NOT NULL AND color_family != ''
     ORDER BY color_family ASC`
  );

  const averages = await query<{
    color_family: string;
    avg_r: number | null;
    avg_g: number | null;
    avg_b: number | null;
  }>(
    `SELECT
       color_family,
       AVG(rgb_r) AS avg_r,
       AVG(rgb_g) AS avg_g,
       AVG(rgb_b) AS avg_b
     FROM artwork_colors
     WHERE color_scope = 'dominant' AND color_family IS NOT NULL AND color_family != ''
     GROUP BY color_family`
  );

  const averageByFamily = new Map(
    averages.map((row) => [row.color_family.trim().toLowerCase(), row])
  );

  return families.map(({ color_family }) => {
    const avg = averageByFamily.get(color_family.trim().toLowerCase());
    const hex =
      avg && avg.avg_r !== null && avg.avg_g !== null && avg.avg_b !== null
        ? rgbToHex(avg.avg_r, avg.avg_g, avg.avg_b)
        : fallbackFamilyHex(color_family);
    return { color_family, hex };
  });
}
