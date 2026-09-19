import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getWeekBestCollectionById,
  getWeekBestCollectionArtworksForAdmin,
} from "@/lib/queries/weekBest";
import { getAllArtists } from "@/lib/queries/artists";
import { listArtworksForAdmin } from "@/lib/queries/artworkMutations";
import SafeImage from "@/components/SafeImage";
import EditCollectionForm from "@/components/admin/week-best/EditCollectionForm";
import AddArtworkForm from "@/components/admin/week-best/AddArtworkForm";
import ReorderArtworkButtons from "@/components/admin/week-best/ReorderArtworkButtons";
import RemoveArtworkButton from "@/components/admin/week-best/RemoveArtworkButton";

export const metadata = { title: "Manage Week Best Collection" };

interface Props {
  params: Promise<{ collection_id: string }>;
}

/**
 * Admin edit screen for one Week Best Collection: its metadata (name, week,
 * label, headline, featuring artist) plus its member artworks in curated
 * order. Membership uses getWeekBestCollectionArtworksForAdmin rather than
 * the public getWeekBestCollectionById(...).artworks list, since the public
 * one filters to impactful/approved only -- an admin managing the
 * collection needs to see a piece they just added even before it clears
 * those flags, and is told so inline (see the warning label below) rather
 * than the piece just silently not showing up here.
 */
export default async function AdminWeekBestCollectionPage({ params }: Props) {
  const { collection_id } = await params;
  const collection = await getWeekBestCollectionById(collection_id);
  if (!collection) notFound();

  const [members, allApproved, artists] = await Promise.all([
    getWeekBestCollectionArtworksForAdmin(collection_id),
    listArtworksForAdmin({ status: "approved" }),
    getAllArtists(),
  ]);

  const memberIds = new Set(members.map((a) => a.artwork_id));
  const candidates = allApproved.filter((a) => !memberIds.has(a.artwork_id));

  return (
    <div>
      <p className="mb-2">
        <Link href="/admin/week-best" className="eyebrow link-underline text-muted">
          ← All collections
        </Link>
      </p>
      <h2 className="mb-6 font-display text-2xl">{collection.collection_name}</h2>

      <section className="mb-10 border border-line p-6">
        <p className="eyebrow mb-4">Collection details</p>
        <EditCollectionForm
          collection={collection}
          artists={artists.map((a) => ({ artist_id: a.artist_id, name: a.name }))}
        />
      </section>

      <section className="mb-10">
        <p className="eyebrow mb-4">Artworks in this collection ({members.length})</p>
        {members.length === 0 ? (
          <p className="text-sm text-muted">No artworks added yet -- add one below.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {members.map((artwork, index) => {
              const needsAttention = artwork.status !== "approved" || !artwork.impactful;
              return (
                <li key={artwork.artwork_id} className="row-card">
                  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-line bg-line/40">
                      {artwork.feature_image_url ? (
                        <SafeImage
                          src={artwork.feature_image_url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base">{artwork.title}</p>
                      <p className="mt-0.5 truncate font-sans text-xs text-muted">
                        {artwork.artist_name ?? artwork.artist_id}
                      </p>
                      {needsAttention && (
                        <p className="mt-1 font-sans text-xs text-accent">
                          {artwork.status !== "approved"
                            ? "Not approved yet -- won't show publicly until it is"
                            : "Not marked impactful -- won't show publicly until it is"}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <ReorderArtworkButtons
                        collectionId={collection.week_best_collection_id}
                        artworkId={artwork.artwork_id}
                        canMoveUp={index > 0}
                        canMoveDown={index < members.length - 1}
                      />
                      <RemoveArtworkButton
                        collectionId={collection.week_best_collection_id}
                        artworkId={artwork.artwork_id}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <p className="eyebrow mb-4">Add an artwork</p>
        <AddArtworkForm
          collectionId={collection.week_best_collection_id}
          candidates={candidates.map((a) => ({
            artwork_id: a.artwork_id,
            title: a.title,
            artist_name: a.artist_name,
          }))}
        />
      </section>
    </div>
  );
}
