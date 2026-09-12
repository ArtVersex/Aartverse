import type { Metadata } from "next";
import Link from "next/link";
import { getAllWeekBestCollectionsWithSummary } from "@/lib/queries/weekBest";
import { getArtistById } from "@/lib/queries/artists";
import EmptyState from "@/components/EmptyState";
import SafeImage from "@/components/SafeImage";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Week Best Collection",
  description: "Aartverse's editorial Week Best Collections, curated week by week.",
};

export default async function WeekBestIndexPage() {
  const summaries = await getAllWeekBestCollectionsWithSummary();

  const withArtists = await Promise.all(
    summaries.map(async (summary) => ({
      ...summary,
      artist: summary.collection.artist_id
        ? await getArtistById(summary.collection.artist_id)
        : null,
    }))
  );

  return (
    <div className="container-gallery py-16">
      <div className="mb-16 max-w-2xl border-b border-line pb-10">
        <p className="eyebrow">Editorial</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Week Best Collection</h1>
        <p className="mt-4 text-lg text-muted">
          Every week, our editors highlight a small set of artworks worth a
          closer look, not to be confused with an artist&apos;s own series.
        </p>
      </div>

      {withArtists.length === 0 ? (
        <EmptyState title="No weekly collections published yet" />
      ) : (
        <div className="flex flex-col divide-y divide-line border-t border-line">
          {withArtists.map(({ collection, artworkCount, coverImageUrl, artist }, index) => {
            const imageFirst = index % 2 === 0;
            return (
              <Link
                key={collection.week_best_collection_id}
                href={`/week-best/${encodeURIComponent(collection.week_best_collection_id)}`}
                className="group grid gap-8 py-14 sm:grid-cols-2 sm:items-center sm:gap-16 lg:gap-24"
              >
                <div
                  className={`relative aspect-[4/3] w-full overflow-hidden bg-line/30 ${
                    imageFirst ? "" : "sm:order-2"
                  }`}
                >
                  {coverImageUrl ? (
                    <SafeImage
                      src={coverImageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="eyebrow">Aartverse Selection</span>
                    </div>
                  )}
                </div>

                <div className={imageFirst ? "" : "sm:order-1"}>
                  {collection.label && <p className="eyebrow">{collection.label}</p>}
                  <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                    <span className="link-underline decoration-1 underline-offset-4">
                      {collection.headline ?? collection.collection_name}
                    </span>
                  </h2>
                  <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                    {collection.week_of && <span>{formatDate(collection.week_of)}</span>}
                    {artist?.name && <span>Featuring {artist.name}</span>}
                    <span>
                      {artworkCount} artwork{artworkCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="eyebrow mt-8 inline-block text-ink">
                    View collection &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
