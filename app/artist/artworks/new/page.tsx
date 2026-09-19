import { requireArtist } from "@/lib/auth/session";
import ArtworkForm from "@/components/artist/ArtworkForm";
import { createArtworkAction } from "@/app/artist/artworks/actions";
import { getArtistCollectionNames } from "@/lib/queries/artworkMutations";

export const metadata = { title: "Add Artwork" };

export default async function NewArtworkPage() {
  const user = await requireArtist();
  const existingCollections = user.artist_id
    ? await getArtistCollectionNames(user.artist_id)
    : [];

  return (
    <div>
      <p className="eyebrow mb-2">New artwork</p>
      <h2 className="mb-6 font-display text-2xl">Add an artwork</h2>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Once you publish, it goes live on Aartverse.com right away, with no waiting on review. Our
        team may still spotlight standout pieces as &ldquo;Impactful,&rdquo; and can remove
        anything that turns out not to be an accurate, genuine submission. You can keep editing
        anytime after publishing too.
      </p>
      <ArtworkForm
        action={createArtworkAction}
        submitLabel="Publish artwork"
        existingCollections={existingCollections}
      />
    </div>
  );
}
