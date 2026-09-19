import type { Metadata } from "next";
import { getAllArtists } from "@/lib/queries/artists";
import ArtistCard from "@/components/ArtistCard";
import EmptyState from "@/components/EmptyState";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Artists",
  description: "Meet the artists behind the Aartverse collection.",
};

export default async function ArtistsPage() {
  // Already ordered featured DESC, name ASC (see getAllArtists in
  // lib/queries/artists.ts) -- ArtistCard marks which ones are featured
  // with a small badge, so that ordering has a visible reason behind it
  // instead of just being an unexplained sort.
  const artists = await getAllArtists();
  const featuredCount = artists.filter((a) => a.featured === 1).length;

  return (
    <div className="container-gallery py-16">
      <div className="mb-14 max-w-2xl border-b border-line pb-8">
        <p className="eyebrow text-accent">The studio</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Artists</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {artists.length} artist{artists.length === 1 ? "" : "s"} showing work on Aartverse
          {featuredCount > 0
            ? `, ${featuredCount} of them currently featured.`
            : "."}
        </p>
      </div>

      {artists.length === 0 ? (
        <EmptyState title="No artists to show yet" />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-16 sm:grid-cols-3 lg:grid-cols-5">
          {artists.map((artist) => (
            <ArtistCard key={artist.artist_id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
