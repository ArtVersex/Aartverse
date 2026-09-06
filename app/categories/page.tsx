import type { Metadata } from "next";
import Link from "next/link";
import { getCategoriesWithCounts } from "@/lib/queries/categories";
import EmptyState from "@/components/EmptyState";
import SafeImage from "@/components/SafeImage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse the Aartverse collection by category.",
};

export default async function CategoriesPage() {
  const categories = await getCategoriesWithCounts();

  return (
    <div className="container-gallery py-16">
      <div className="mb-14 border-b border-line pb-8">
        <p className="eyebrow">Discover</p>
        <h1 className="font-display text-4xl sm:text-5xl">Categories</h1>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories to show yet" />
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group flex flex-col items-center gap-6 border border-line px-6 py-14 text-center transition-colors hover:border-ink"
            >
              {category.image_url && (
                <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                  <SafeImage
                    src={category.image_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              )}
              <div>
                <h2 className="font-display text-xl">{category.name}</h2>
                <p className="eyebrow mt-2 text-[11px]">
                  {category.artwork_count} artwork{category.artwork_count === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
