import Link from "next/link";
import { getAllWeekBestCollectionsWithSummary } from "@/lib/queries/weekBest";
import { getAllArtists } from "@/lib/queries/artists";
import { formatDate } from "@/lib/utils";
import NewCollectionForm from "@/components/admin/week-best/NewCollectionForm";
import DeleteCollectionButton from "@/components/admin/week-best/DeleteCollectionButton";

export const metadata = { title: "Week Best Collection" };

/**
 * Admin index for the Week Best Collection editorial feature -- lets an
 * admin create a new weekly collection and see/manage every existing one.
 * No write path existed for this table at all before (see
 * lib/queries/weekBest.ts): every collection currently on Aartverse.com was
 * put there by hand in the database.
 */
export default async function AdminWeekBestPage() {
  const [summaries, artists] = await Promise.all([
    getAllWeekBestCollectionsWithSummary(),
    getAllArtists(),
  ]);

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl">Week Best Collection</h2>

      <section className="mb-10 border border-line p-6">
        <p className="eyebrow mb-4">New collection</p>
        <NewCollectionForm artists={artists.map((a) => ({ artist_id: a.artist_id, name: a.name }))} />
      </section>

      {summaries.length === 0 ? (
        <p className="text-sm text-muted">No collections yet -- create the first one above.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {summaries.map(({ collection, artworkCount }) => (
            <li key={collection.week_best_collection_id} className="row-card">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/week-best/${collection.week_best_collection_id}`}
                    className="link-underline font-display text-base"
                  >
                    {collection.headline ?? collection.collection_name}
                  </Link>
                  <p className="mt-0.5 truncate font-sans text-xs text-muted">
                    {collection.collection_name}
                    {collection.label ? ` · ${collection.label}` : ""}
                  </p>
                  <p className="mt-2 font-sans text-xs text-muted">
                    {collection.week_of ? formatDate(collection.week_of) : "No date set"}
                    {" · "}
                    {artworkCount} artwork{artworkCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/week-best/${collection.week_best_collection_id}`}
                    className="eyebrow border border-line px-2.5 py-1 text-[10px] text-muted transition-colors hover:border-ink hover:text-ink"
                  >
                    Manage
                  </Link>
                  <DeleteCollectionButton collectionId={collection.week_best_collection_id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
