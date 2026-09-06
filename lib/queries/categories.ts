import "server-only";
import { query } from "@/lib/db";
import { getDistinctCategories } from "@/lib/queries/artworks";
import { getCategoryIcon } from "@/lib/categoryIcons";
import type { LooseRow } from "@/lib/types";
import { slugify } from "@/lib/utils";

/**
 * The `categories` table's exact column set isn't specified by the project
 * brief (unlike artworks/artists/artwork_colors, which are fully
 * enumerated), so this module reads rows loosely and normalizes whichever
 * of the common column names is actually present, instead of assuming one
 * fixed shape. It never writes to the table and never redefines the schema.
 *
 * Matching is done purely on the artworks.category *text* field (not
 * category_id) — there are only a handful of categories in use today
 * (Drawing, Painting, Print Making) and the category text is what's
 * reliably populated on every artwork row.
 */
export interface CategoryFacet {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  artwork_count: number;
}

function normalizeCategoryRow(row: LooseRow, name: string, artworkCount: number): CategoryFacet {
  return {
    name,
    slug:
      (row.slug as string) ?? (row.category_slug as string) ?? slugify(name),
    description:
      (row.description as string) ?? (row.category_description as string) ?? null,
    // A curated local icon (public/categories/*.png) takes priority over
    // whatever the loosely-typed `categories` table happens to hold — see
    // lib/categoryIcons.ts. Falls back to the table's own image, then none.
    image_url:
      getCategoryIcon(name) ??
      (row.image_url as string) ??
      (row.cover_image_url as string) ??
      (row.image as string) ??
      null,
    artwork_count: artworkCount,
  };
}

/**
 * Categories, derived from the `artworks.category` field itself (present on
 * every row) and enriched with whatever the `categories` table happens to
 * contain, when it can be read without assuming an exact shape. Falls back
 * to artworks-only data if the categories table is unreadable, empty, or
 * uses different names — the page never breaks because of an unexpected
 * categories schema.
 */
export async function getCategoriesWithCounts(): Promise<CategoryFacet[]> {
  const counts = await getDistinctCategories();

  let extraByName = new Map<string, LooseRow>();
  try {
    const rows = await query<LooseRow>(`SELECT * FROM categories`);
    extraByName = new Map(
      rows.map((row) => {
        const name = String(row.name ?? row.category_name ?? row.title ?? "");
        return [name.toLowerCase(), row];
      })
    );
  } catch {
    // categories table has an unexpected shape or is unavailable — degrade
    // gracefully to artworks-derived data only.
  }

  return counts.map(({ category, artwork_count }) =>
    normalizeCategoryRow(
      extraByName.get(category.toLowerCase()) ?? {},
      category,
      artwork_count
    )
  );
}

export async function getCategoryBySlug(slug: string): Promise<CategoryFacet | null> {
  const all = await getCategoriesWithCounts();
  return all.find((c) => c.slug === slug) ?? null;
}
