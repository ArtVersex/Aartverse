import { notFound } from "next/navigation";
import { requireArtist } from "@/lib/auth/session";
import { getOwnedArtwork, getArtistCollectionNames } from "@/lib/queries/artworkMutations";
import ArtworkForm from "@/components/artist/ArtworkForm";
import ArtworkRowActions from "@/components/artist/ArtworkRowActions";
import StatusPill from "@/components/StatusPill";
import { updateArtworkAction } from "@/app/artist/artworks/actions";

export const metadata = { title: "Edit Artwork" };

interface Props {
  params: Promise<{ artwork_id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}

export default async function EditArtworkPage({ params, searchParams }: Props) {
  const { artwork_id } = await params;
  const { submitted } = await searchParams;
  const user = await requireArtist();

  // Ownership check: 404s (rather than redirecting or erroring) for any
  // artwork_id that doesn't belong to this artist — including one that
  // belongs to someone else — so nothing about its existence leaks.
  const artwork = user.artist_id
    ? await getOwnedArtwork(artwork_id, user.artist_id)
    : null;
  if (!artwork) notFound();

  const existingCollections = user.artist_id
    ? await getArtistCollectionNames(user.artist_id)
    : [];

  const boundAction = updateArtworkAction.bind(null, artwork_id);

  return (
    <div>
      {submitted && (
        <p className="callout-banner mb-6 border-emerald-700/40 bg-emerald-50">
          You&apos;re live on Aartverse.com! Feel free to keep refining it below. Changes save
          instantly.
        </p>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Edit artwork</h2>
        <div className="flex items-center gap-4">
          <StatusPill status={artwork.status ?? "draft"} />
          <ArtworkRowActions
            artworkId={artwork_id}
            status={artwork.status ?? "draft"}
            suspended={user.status === "suspended"}
            showEditLink={false}
          />
        </div>
      </div>

      {artwork.status === "rejected" && artwork.rejection_reason && (
        <p className="callout-banner mb-6 border-red-800/40 bg-red-50">
          <span className="font-medium">Reviewer note:</span> {artwork.rejection_reason}
        </p>
      )}

      {/* Legacy-only -- nothing produces a new "pending" row anymore (see
          app/artist/artworks/actions.ts), but an old one could still be
          sitting here from before that change. */}
      {artwork.status === "pending" && !submitted && (
        <p className="callout-banner mb-6">
          This artwork hasn&apos;t been published yet. Hit Publish below when it is ready to go
          live.
        </p>
      )}

      {artwork.status === "draft" && (
        <p className="callout-banner mb-6">
          This artwork isn&apos;t published yet. It&apos;s only visible to you. Finish filling it in
          and hit Publish when it&apos;s ready to go live on Aartverse.com.
        </p>
      )}

      <ArtworkForm
        action={boundAction}
        artwork={artwork}
        submitLabel="Save changes"
        existingCollections={existingCollections}
      />
    </div>
  );
}
