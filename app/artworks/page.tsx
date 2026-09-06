import type { Metadata } from "next";
import {
  getArtworks,
  getDistinctCollectionNames,
  getDistinctSubcategories,
  getDistinctYears,
  getPriceBounds,
  type ArtworkFilters as ArtworkFiltersInput,
  type ArtworkSort,
  type Availability,
} from "@/lib/queries/artworks";
import { getArtistsForFilter } from "@/lib/queries/artists";
import { getCategoriesWithCounts } from "@/lib/queries/categories";
import { getColorFacets } from "@/lib/queries/colors";
import ArtworkCard from "@/components/ArtworkCard";
import ArtworkFilters from "@/components/ArtworkFilters";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { firstParam, parsePageParam, toArray, toURLSearchParams } from "@/lib/utils";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Artworks",
  description: "Browse the full Aartverse catalogue of original artworks.",
};

type SearchParams = Record<string, string | string[] | undefined>;

const VALID_SORTS: ArtworkSort[] = [
  "newest",
  "price_asc",
  "price_desc",
  "title_asc",
  "color_match",
];
const VALID_AVAILABILITY: Availability[] = ["in_stock", "sold", "all"];

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;

  const category = firstParam(resolved.category);
  const subcategory = firstParam(resolved.subcategory);
  const artist = firstParam(resolved.artist);
  const minPriceRaw = firstParam(resolved.minPrice);
  const maxPriceRaw = firstParam(resolved.maxPrice);
  const yearRaw = firstParam(resolved.year);
  const availabilityRaw = firstParam(resolved.availability);
  const collection = firstParam(resolved.collection);

  // Colors are a multi-select: one repeated `color` param per family
  // checked, each paired with its own `pct_<family>` minimum-proportion
  // slider (0 when the slider wasn't touched, meaning "contains this color
  // at all").
  const selectedColorFamilies = toArray(resolved.color).filter(Boolean);
  const selectedColors = selectedColorFamilies.map((family) => {
    const pctRaw = firstParam(resolved[`pct_${family}`]);
    const pct = pctRaw ? Number(pctRaw) : 0;
    return {
      family,
      minProportion: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0,
    };
  });

  const sortRaw = firstParam(resolved.sort);
  const page = parsePageParam(resolved.page);

  // When a color is picked and no sort was explicitly chosen, lead with the
  // strongest color matches rather than just the newest uploads.
  const sort: ArtworkSort = VALID_SORTS.includes(sortRaw as ArtworkSort)
    ? (sortRaw as ArtworkSort)
    : selectedColors.length > 0
      ? "color_match"
      : "newest";
  const availability: Availability | undefined = VALID_AVAILABILITY.includes(
    availabilityRaw as Availability
  )
    ? (availabilityRaw as Availability)
    : undefined;

  const filters: ArtworkFiltersInput = {
    category,
    subcategory,
    artistId: artist,
    minPrice: minPriceRaw ? Number(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw ? Number(maxPriceRaw) : undefined,
    year: yearRaw ? Number(yearRaw) : undefined,
    availability,
    collectionName: collection,
    colors: selectedColors,
    // The catalogue only ever shows impactful = 1 artworks — the one
    // exception on the site is a single artist's own profile page.
    impactfulOnly: true,
  };

  const [
    { items, totalPages, total },
    categories,
    subcategories,
    artists,
    years,
    collections,
    colors,
    priceBounds,
  ] = await Promise.all([
    getArtworks({ filters, sort, page, pageSize: 24 }),
    getCategoriesWithCounts(),
    getDistinctSubcategories(),
    getArtistsForFilter(),
    getDistinctYears(),
    getDistinctCollectionNames(),
    getColorFacets(),
    getPriceBounds(),
  ]);

  const activeColorLabel =
    selectedColorFamilies.length > 0 ? selectedColorFamilies.join(" + ") : null;

  return (
    <div className="container-gallery py-16">
      <div className="mb-10 border-b border-line pb-8">
        <p className="eyebrow">Catalogue</p>
        <h1 className="font-display text-4xl sm:text-5xl">
          {activeColorLabel ? `${activeColorLabel} artworks` : "Artworks"}
        </h1>
        <p className="mt-3 text-muted">
          {total} artwork{total === 1 ? "" : "s"}
          {activeColorLabel ? ` with ${activeColorLabel.toLowerCase()} tones` : " in the collection"}.
        </p>
      </div>

      <div className="mb-12">
        <ArtworkFilters
          facets={{ categories, subcategories, artists, years, collections, colors, priceBounds }}
          current={{
            category,
            subcategory,
            artist,
            minPrice: minPriceRaw,
            maxPrice: maxPriceRaw,
            year: yearRaw,
            availability: availabilityRaw,
            collection,
            colors: selectedColors,
            sort,
          }}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No artworks match those filters"
          message="Try clearing a filter or two — new work is added regularly."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
          {items.map((artwork) => (
            <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
          ))}
        </div>
      )}

      <Pagination
        basePath="/artworks"
        searchParams={toURLSearchParams(resolved)}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
