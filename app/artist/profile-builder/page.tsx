import { requireArtist } from "@/lib/auth/session";
import { getArtistById } from "@/lib/queries/artists";
import { getCareerEntriesForArtist } from "@/lib/queries/artistCareerEntries";
import { listArtworksForArtist } from "@/lib/queries/artworkMutations";
import ArtistProfileBuilder from "@/components/artist/profile-builder/ArtistProfileBuilder";

export const metadata = { title: "Create Artist Profile" };

export default async function ProfileBuilderPage() {
  const user = await requireArtist();
  const artist = user.artist_id ? await getArtistById(user.artist_id) : null;
  const careerEntries = user.artist_id ? await getCareerEntriesForArtist(user.artist_id) : [];
  const artworks = user.artist_id ? await listArtworksForArtist(user.artist_id) : [];

  if (!artist) {
    return (
      <div>
        <p className="eyebrow mb-2">Create Artist Profile</p>
        <h2 className="mb-4 font-display text-2xl">Your profile isn&apos;t set up yet</h2>
        <p className="max-w-2xl font-sans text-sm text-muted">
          Please contact support so we can finish setting up your artist account.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow mb-2">Artist Profile PDF</p>
      <h2 className="mb-2 font-display text-2xl">Create Artist Profile</h2>
      <p className="mb-8 max-w-2xl font-sans text-sm text-muted">
        Build a professional Artist Profile document to share with galleries, curators,
        collectors, exhibitions, and organizations. It is a separate, one-off document, not a
        resume, and is generated from your saved profile.
      </p>
      <ArtistProfileBuilder artist={artist} careerEntries={careerEntries} artworks={artworks} />
    </div>
  );
}
