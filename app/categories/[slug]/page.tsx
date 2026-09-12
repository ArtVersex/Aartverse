import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/queries/categories";
import { getArtworks, type ArtworkSort } from "@/lib/queries/artworks";
import ArtworkCard from "@/components/ArtworkCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import SafeImage from "@/components/SafeImage";
import { firstParam, parsePageParam, toURLSearchParams } from "@/lib/utils";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Category pages never filter by color, so "color_match" (only meaningful
// alongside a color filter) is deliberately excluded from the options here.
type CategorySort = Exclude<ArtworkSort, "color_match">;

const VALID_SORTS: CategorySort[] = ["newest", "price_asc", "price_desc", "title_asc"];
const SORT_LABELS: Record<CategorySort, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  title_asc: "Title A–Z",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description:
      category.description ?? `Browse ${category.name} artworks on Aartverse.`,
  };
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolved = await searchParams;
  const page = parsePageParam(resolved.page);
  const sortRaw = firstParam(resolved.sort);
  const sort: ArtworkSort = VALID_SORTS.includes(sortRaw as CategorySort)
    ? (sortRaw as CategorySort)
    : "newest";

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { items, totalPages, total } = await getArtworks({
    // Category pages only ever show impactful = 1 artworks — the one
    // exception on the site is a single artist's own profile page.
    filters: { category: category.name, impactfulOnly: true },
    sort,
    page,
    pageSize: 24,
  });

  return (
    <div className="container-gallery py-16">
      <div className="mb-10 flex items-center gap-6 border-b border-line pb-8">
        {category.image_url && (
          <div className="relative hidden h-20 w-20 shrink-0 sm:block">
            <SafeImage src={category.image_url} alt="" fill sizes="80px" className="object-contain" />
          </div>
        )}
        <div>
          <p className="eyebrow">Category</p>
          <h1 className="font-display text-4xl sm:text-5xl">{category.name}</h1>
          {category.description && (
            <p className="mt-3 max-w-2xl text-muted">{category.description}</p>
          )}
          <p className="mt-3 text-muted">
            {total} artwork{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap gap-6">
        {VALID_SORTS.map((option) => (
          <Link
            key={option}
            href={`/categories/${slug}?sort=${option}`}
            className={`eyebrow ${sort === option ? "text-ink underline decoration-1 underline-offset-4" : "text-muted"}`}
          >
            {SORT_LABELS[option]}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No artworks in this category yet"
          message="Check back soon. New work is added regularly."
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
          {items.map((artwork) => (
            <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
          ))}
        </div>
      )}

      <Pagination
        basePath={`/categories/${slug}`}
        searchParams={toURLSearchParams(resolved)}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
