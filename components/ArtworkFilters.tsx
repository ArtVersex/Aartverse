import type { ReactNode } from "react";
import type { CategoryFacet } from "@/lib/queries/categories";
import type { ColorFacet } from "@/lib/queries/colors";
import { normalizeHex } from "@/lib/utils";

export interface ArtworkFiltersFacets {
  categories: CategoryFacet[];
  subcategories: string[];
  artists: Array<{ artist_id: string; name: string; slug: string }>;
  years: number[];
  collections: string[];
  colors: ColorFacet[];
  priceBounds: { min: number; max: number } | null;
}

export interface CurrentFilterValues {
  category?: string;
  subcategory?: string;
  artist?: string;
  minPrice?: string;
  maxPrice?: string;
  year?: string;
  availability?: string;
  collection?: string;
  /** One or more selected color families, each with the minimum proportion
   *  (0-100) its slider is set to. */
  colors?: Array<{ family: string; minProportion: number }>;
  sort?: string;
}

/**
 * A plain server-rendered <form method="get"> — filtering/sorting works via
 * normal navigation and query params, so it needs no client-side JS. The
 * color picker is a grid of checkbox swatches (not radios — more than one
 * color can be selected at once) rather than a <select>, since color is the
 * primary way people find a piece on this site. Checking a color reveals a
 * slider (pure CSS, via the `peer` checked-state trick) to set how strong a
 * presence of that color is required, from "contains it at all" up to
 * "dominated by it".
 */
export default function ArtworkFilters({
  facets,
  current,
}: {
  facets: ArtworkFiltersFacets;
  current: CurrentFilterValues;
}) {
  const selectedColors = current.colors ?? [];
  const minProportionFor = (family: string) =>
    selectedColors.find((c) => c.family === family)?.minProportion ?? 0;

  return (
    <form method="get" action="/artworks" className="border border-line p-6">
      {/* Color — matched and ranked by color_family + proportion (see
          lib/queries/artworks.ts) — is the most powerful, least obvious way
          to browse this site, so it lives under "Advanced filters" rather
          than among the everyday category/price/artist fields. Left open
          automatically whenever a color is already active, so a chosen
          filter is never hidden behind a collapsed toggle. */}
      <details className="mb-8 border-b border-line pb-8" open={selectedColors.length > 0}>
        <summary className="eyebrow cursor-pointer text-[11px]">
          Advanced filters — find by color
          {selectedColors.length > 0 &&
            ` (${selectedColors.map((c) => c.family).join(", ")})`}
        </summary>
        <p className="mt-4 text-xs text-muted">
          Select one or more colors. Each gets its own slider for how
          strongly that color should show up in the piece — leave it at 0%
          to just require the color is present at all.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-8">
          {facets.colors.map((c) => (
            <ColorOption
              key={c.color_family}
              family={c.color_family}
              hex={c.hex}
              checked={selectedColors.some((s) => s.family === c.color_family)}
              minProportion={minProportionFor(c.color_family)}
            />
          ))}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <Field label="Category">
          <select name="category" defaultValue={current.category ?? ""}>
            <option value="">All categories</option>
            {facets.categories.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.name} ({c.artwork_count})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subcategory">
          <select name="subcategory" defaultValue={current.subcategory ?? ""}>
            <option value="">All subcategories</option>
            {facets.subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Artist">
          <select name="artist" defaultValue={current.artist ?? ""}>
            <option value="">All artists</option>
            {facets.artists.map((a) => (
              <option key={a.artist_id} value={a.artist_id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Min price">
          <input
            type="number"
            name="minPrice"
            min={facets.priceBounds?.min ?? 0}
            placeholder={facets.priceBounds ? String(Math.floor(facets.priceBounds.min)) : "0"}
            defaultValue={current.minPrice ?? ""}
          />
        </Field>

        <Field label="Max price">
          <input
            type="number"
            name="maxPrice"
            min={0}
            placeholder={facets.priceBounds ? String(Math.ceil(facets.priceBounds.max)) : ""}
            defaultValue={current.maxPrice ?? ""}
          />
        </Field>

        <Field label="Year">
          <select name="year" defaultValue={current.year ?? ""}>
            <option value="">Any year</option>
            {facets.years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Availability">
          <select name="availability" defaultValue={current.availability ?? ""}>
            <option value="">All</option>
            <option value="in_stock">Available</option>
            <option value="sold">Sold</option>
          </select>
        </Field>

        <Field label="Collection">
          <select name="collection" defaultValue={current.collection ?? ""}>
            <option value="">All collections</option>
            {facets.collections.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Sort by">
          <select name="sort" defaultValue={current.sort ?? "newest"}>
            {selectedColors.length > 0 && (
              <option value="color_match">Best color match</option>
            )}
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="title_asc">Title A–Z</option>
          </select>
        </Field>
      </div>

      <div className="mt-8 flex items-end gap-4 border-t border-line pt-6">
        <button
          type="submit"
          className="bg-ink px-6 py-3 text-sm uppercase tracking-widest2 text-canvas transition-opacity hover:opacity-90"
        >
          Apply filters
        </button>
        <a href="/artworks" className="eyebrow link-underline">
          Clear all
        </a>
      </div>
    </form>
  );
}

/**
 * One color swatch. Checking it selects that color family for filtering;
 * a slider then appears (pure CSS `peer` — the checkbox, the slider block,
 * and the label are all siblings under this one wrapper, so peer-checked
 * can reach every one of them) to set its minimum-proportion threshold.
 * Each color has its own independent checkbox/slider pair scoped to this
 * wrapper, so selecting one never affects another's slider.
 */
function ColorOption({
  family,
  hex,
  checked,
  minProportion,
}: {
  family: string;
  hex: string;
  checked: boolean;
  minProportion: number;
}) {
  const normalized = normalizeHex(hex);
  const inputId = `color-${family.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex w-20 flex-col items-center gap-2">
      {/* The checkbox IS the swatch (appearance-none + its own background
          color) — checked: applies directly to it, unlike peer-checked:
          which can only reach siblings, not something nested inside one. */}
      <input
        type="checkbox"
        id={inputId}
        name="color"
        value={family}
        defaultChecked={checked}
        className="peer h-11 w-11 cursor-pointer appearance-none rounded-full border border-line ring-offset-2 ring-offset-canvas transition-shadow checked:ring-2 checked:ring-ink"
        style={{ backgroundColor: normalized ?? "#d8d2c8" }}
      />
      <label
        htmlFor={inputId}
        className="eyebrow max-w-[4.5rem] cursor-pointer truncate text-center text-[10px] text-muted"
      >
        {family}
      </label>
      <div className="hidden w-full flex-col items-center gap-1 peer-checked:flex">
        <input
          type="range"
          name={`pct_${family}`}
          min={0}
          max={100}
          step={5}
          defaultValue={minProportion}
          className="w-full accent-ink"
          aria-label={`Minimum ${family} presence`}
        />
        <span className="text-[9px] text-muted">min. presence</span>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="eyebrow text-[11px]">{label}</span>
      {children}
    </label>
  );
}
