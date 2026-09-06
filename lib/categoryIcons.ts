/**
 * Curated category icons (public/categories/*.png), used instead of
 * whatever — if anything — the loosely-typed `categories` table's
 * image_url column holds. Matched by name rather than a fixed id, so a
 * category keeps its icon even if new categories are added later with
 * slightly different capitalization/spacing.
 *
 * NOTE: the source files for painting/sculpture/mixed_media/drawing carry a
 * faint diagonal "OpenArt" watermark from the AI image generator they came
 * from (visible on close inspection, most obvious on painting and
 * sculpture). They're used as provided, but worth swapping for
 * watermark-free versions before this goes to production.
 */
const CATEGORY_ICONS: Record<string, string> = {
  painting: "/categories/painting.png",
  drawing: "/categories/drawing.png",
  sculpture: "/categories/sculpture.png",
  "mixed media": "/categories/mixed_media.png",
  "mixed-media": "/categories/mixed_media.png",
  printmaking: "/categories/printmaking.png",
  "print making": "/categories/printmaking.png",
};

/** Loose contains-matching for names that don't hit an exact key above
 *  (e.g. "Prints" or "Print-making"), so a close variant still gets an
 *  icon instead of none. */
const FUZZY_ICON_KEYS: Array<{ test: RegExp; icon: string }> = [
  { test: /paint/i, icon: "/categories/painting.png" },
  { test: /draw/i, icon: "/categories/drawing.png" },
  { test: /sculpt/i, icon: "/categories/sculpture.png" },
  { test: /mixed/i, icon: "/categories/mixed_media.png" },
  { test: /print/i, icon: "/categories/printmaking.png" },
];

export function getCategoryIcon(categoryName: string | null | undefined): string | null {
  if (!categoryName) return null;
  const key = categoryName.trim().toLowerCase();
  if (CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  const fuzzy = FUZZY_ICON_KEYS.find((f) => f.test.test(key));
  return fuzzy?.icon ?? null;
}
