import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeekBestCollectionById } from "@/lib/queries/weekBest";
import { getArtistById } from "@/lib/queries/artists";
import ArtworkCard from "@/components/ArtworkCard";
import EmptyState from "@/components/EmptyState";
import SafeImage from "@/components/SafeImage";
import { formatDate, truncate } from "@/lib/utils";

export const revalidate = 300;

interface Props {
  params: Promise<{ collection_id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection_id } = await params;
  const collection = await getWeekBestCollectionById(collection_id);
  if (!collection) return { title: "Collection not found" };
  return {
    title: collection.headline ?? collection.collection_name,
    description: truncate(collection.headline ?? collection.collection_name, 160),
  };
}

export default async function WeekBestCollectionPage({ params }: Props) {
  const { collection_id } = await params;
  const collection = await getWeekBestCollectionById(collection_id);
  if (!collection) notFound();

  const artist = collection.artist_id ? await getArtistById(collection.artist_id) : null;
  const cover = collection.artworks[0] ?? null;

  return (
    <div>
      {/* Editorial hero — the collection's own curated cover artwork sets
          the tone, with a gradient scrim so the headline stays legible
          against any image. */}
      <section className="relative flex min-h-[50vh] items-end overflow-hidden bg-ink text-canvas sm:min-h-[62vh]">
        {cover?.feature_image_url && (
          <SafeImage
            src={cover.feature_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30" />
        <div className="container-gallery relative z-10 max-w-3xl py-14 sm:py-20">
          {collection.label && <p className="eyebrow text-accent">{collection.label}</p>}
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">
            {collection.headline ?? collection.collection_name}
          </h1>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-canvas/70">
            {collection.week_of && <span>Week of {formatDate(collection.week_of)}</span>}
            {artist?.name && <span>Featuring {artist.name}</span>}
            <span>
              {collection.artworks.length} artwork{collection.artworks.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </section>

      <div className="container-gallery py-16">
        {collection.artworks.length === 0 ? (
          <EmptyState title="This collection doesn't have any artworks yet" />
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {collection.artworks.map((artwork) => (
              <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
