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
  const artists = await getAllArtists();

  return (
    <div className="container-gallery py-16">
      <div className="mb-14 border-b border-line pb-8">
        <p className="eyebrow">The studio</p>
        <h1 className="font-display text-4xl sm:text-5xl">Artists</h1>
        <p className="mt-3 text-muted">
          {artists.length} artist{artists.length === 1 ? "" : "s"} showing work on Aartverse.
        </p>
      </div>

      {artists.length === 0 ? (
        <EmptyState title="No artists to show yet" />
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-14 sm:grid-cols-3 lg:grid-cols-5">
          {artists.map((artist) => (
            <ArtistCard key={artist.artist_id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  );
}
