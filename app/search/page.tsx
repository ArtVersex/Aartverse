import type { Metadata } from "next";
import { searchArtists, searchArtworks } from "@/lib/queries/search";
import ArtworkCard from "@/components/ArtworkCard";
import ArtistCard from "@/components/ArtistCard";
import EmptyState from "@/components/EmptyState";
import SectionHeading from "@/components/SectionHeading";
import { firstParam } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Aartverse artworks and artists.",
};

interface Props {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const term = firstParam(resolved.q)?.trim() ?? "";

  const [artworks, artists] = term
    ? await Promise.all([searchArtworks(term, 24), searchArtists(term, 8)])
    : [[], []];

  return (
    <div className="container-gallery py-16">
      <div className="mb-14 border-b border-line pb-8">
        <p className="eyebrow">Find something</p>
        <h1 className="font-display text-4xl sm:text-5xl">Search</h1>
        <form method="get" action="/search" className="mt-8 max-w-xl">
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Search artworks, artists, categories…"
            className="border-b-2 border-ink py-3 text-lg"
            autoFocus
          />
        </form>
      </div>

      {!term && (
        <EmptyState
          title="Start typing to search"
          message="Search across titles, artists, categories, subcategories and collections."
        />
      )}

      {term && artworks.length === 0 && artists.length === 0 && (
        <EmptyState
          title={`No results for "${term}"`}
          message="Try a different title, artist name, or category."
        />
      )}

      {artists.length > 0 && (
        <section className="mb-20">
          <SectionHeading eyebrow={`${artists.length} match${artists.length === 1 ? "" : "es"}`} title="Artists" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.artist_id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {artworks.length > 0 && (
        <section>
          <SectionHeading
            eyebrow={`${artworks.length} match${artworks.length === 1 ? "" : "es"}`}
            title="Artworks"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {artworks.map((artwork) => (
              <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
