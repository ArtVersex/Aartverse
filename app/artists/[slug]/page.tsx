import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReadMore from "@/components/ReadMore";
import SafeImage from "@/components/SafeImage";
import { getArtistBySlug } from "@/lib/queries/artists";
import {
  getArtworkCountForArtist,
  getArtworks,
  getDistinctCategoriesForArtist,
  getDistinctCollectionNamesForArtist,
} from "@/lib/queries/artworks";
import ArtworkCard from "@/components/ArtworkCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import {
  firstParam,
  parseCommaList,
  parsePageParam,
  toURLSearchParams,
  truncate,
} from "@/lib/utils";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist not found" };
  return {
    title: artist.name,
    description: truncate(artist.artist_statement ?? undefined, 160) || undefined,
    openGraph: artist.profile_image_url
      ? { images: [{ url: artist.profile_image_url }] }
      : undefined,
  };
}

export default async function ArtistProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parsePageParam(resolvedSearchParams.page);
  const selectedCategory = firstParam(resolvedSearchParams.category) || undefined;
  const selectedCollection = firstParam(resolvedSearchParams.collection) || undefined;

  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  // The artist page is the one deliberate exception to "impactful = 1
  // everywhere": it shows every artwork by this artist by default, with the
  // impactful-flagged pieces surfaced first and the rest following. The
  // category and collection filters below narrow that same "all artworks"
  // set (and can be combined) rather than switching to the impactful-only
  // view used elsewhere on the site.
  const [{ items, totalPages }, categories, collections, allArtworksCount] = await Promise.all([
    getArtworks({
      filters: {
        artistId: artist.artist_id,
        category: selectedCategory,
        collectionName: selectedCollection,
      },
      sort: "newest",
      page,
      pageSize: 24,
      prioritizeImpactful: true,
    }),
    getDistinctCategoriesForArtist(artist.artist_id),
    getDistinctCollectionNamesForArtist(artist.artist_id),
    getArtworkCountForArtist(artist.artist_id),
  ]);

  const mediums = parseCommaList(artist.mediums);

  // Both filter rows narrow the same underlying list and can be combined
  // (category AND collection); each chip's link keeps the OTHER row's
  // current selection intact rather than resetting it.
  const buildFilterHref = (overrides: { category?: string; collection?: string }) => {
    const params = new URLSearchParams();
    const category = "category" in overrides ? overrides.category : selectedCategory;
    const collection = "collection" in overrides ? overrides.collection : selectedCollection;
    if (category) params.set("category", category);
    if (collection) params.set("collection", collection);
    const qs = params.toString();
    return `/artists/${slug}${qs ? `?${qs}` : ""}`;
  };

  const headingLabel = [selectedCollection, selectedCategory].filter(Boolean).join(" — ");

  return (
    <div>
      {/* Cover */}
      <div className="relative h-[40vh] w-full bg-line/40 sm:h-[50vh]">
        {artist.cover_image_url && (
          <SafeImage
            src={artist.cover_image_url}
            alt={`${artist.name} — cover image`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="container-gallery -mt-16 pb-16 sm:-mt-20">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-canvas bg-line/40 sm:h-40 sm:w-40">
            {artist.profile_image_url && (
              <SafeImage
                src={artist.profile_image_url}
                alt={artist.name}
                fill
                sizes="160px"
                className="object-cover"
              />
            )}
          </div>
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">{artist.name}</h1>
            {artist.location && <p className="mt-2 text-muted">{artist.location}</p>}
          </div>
        </div>

        {artist.artist_statement && (
          <div className="mt-10 max-w-2xl">
            {artist.artist_statement.trim().length > 420 ? (
              <ReadMore id={`${artist.artist_id}-statement`}>
                <p className="text-lg leading-relaxed text-muted whitespace-pre-line">
                  {artist.artist_statement}
                </p>
              </ReadMore>
            ) : (
              <p className="text-lg leading-relaxed text-muted whitespace-pre-line">
                {artist.artist_statement}
              </p>
            )}
          </div>
        )}

        {(mediums.length > 0 || artist.website || artist.instagram) && (
          <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-line py-6">
            {mediums.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediums.map((medium) => (
                  <span key={medium} className="eyebrow border border-line px-3 py-1 text-[11px]">
                    {medium}
                  </span>
                ))}
              </div>
            )}
            {artist.website && (
              <a
                href={artist.website}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow link-underline"
              >
                Website
              </a>
            )}
            {artist.instagram && (
              <a
                href={
                  artist.instagram.startsWith("http")
                    ? artist.instagram
                    : `https://instagram.com/${artist.instagram.replace(/^@/, "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow link-underline"
              >
                Instagram
              </a>
            )}
          </div>
        )}

        <div className="mt-16">
          <h2 className="font-display text-2xl">
            {headingLabel ? `${headingLabel} by ${artist.name}` : `Artworks by ${artist.name}`}
          </h2>

          {/* All of this artist's work shows by default (impactful pieces
              first, see the note above); these two rows let a visitor
              narrow that same set by category and/or collection — both can
              be active at once — rather than switching to the
              impactful-only view used elsewhere on the site. */}
          {categories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-6">
              <span className="eyebrow text-muted">Browse by category:</span>
              <Link
                href={buildFilterHref({ category: "" })}
                className={`eyebrow ${
                  !selectedCategory ? "text-ink underline decoration-1 underline-offset-4" : "text-muted"
                }`}
              >
                All ({allArtworksCount})
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.category}
                  href={buildFilterHref({ category: c.category })}
                  className={`eyebrow ${
                    selectedCategory === c.category
                      ? "text-ink underline decoration-1 underline-offset-4"
                      : "text-muted"
                  }`}
                >
                  {c.category} ({c.artwork_count})
                </Link>
              ))}
            </div>
          )}

          {collections.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-8">
              <span className="eyebrow text-muted">Browse by collection:</span>
              <Link
                href={buildFilterHref({ collection: "" })}
                className={`eyebrow ${
                  !selectedCollection ? "text-ink underline decoration-1 underline-offset-4" : "text-muted"
                }`}
              >
                All ({allArtworksCount})
              </Link>
              {collections.map((c) => (
                <Link
                  key={c.collection_name}
                  href={buildFilterHref({ collection: c.collection_name })}
                  className={`eyebrow ${
                    selectedCollection === c.collection_name
                      ? "text-ink underline decoration-1 underline-offset-4"
                      : "text-muted"
                  }`}
                >
                  {c.collection_name} ({c.artwork_count})
                </Link>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              message={
                headingLabel
                  ? `No ${headingLabel.toLowerCase()} artworks by this artist yet.`
                  : "This artist doesn't have any published artworks yet."
              }
            />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
              {items.map((artwork) => (
                <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
              ))}
            </div>
          )}
          <Pagination
            basePath={`/artists/${slug}`}
            searchParams={toURLSearchParams(resolvedSearchParams)}
            page={page}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
