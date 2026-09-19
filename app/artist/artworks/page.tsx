import Link from "next/link";
import { requireArtist } from "@/lib/auth/session";
import { listArtworksForArtist } from "@/lib/queries/artworkMutations";
import StatusPill from "@/components/StatusPill";
import SafeImage from "@/components/SafeImage";
import ArtworkRowActions from "@/components/artist/ArtworkRowActions";

export const metadata = { title: "My Artworks" };

export default async function ArtistArtworksPage() {
  const user = await requireArtist();
  const artworks = user.artist_id ? await listArtworksForArtist(user.artist_id) : [];
  const suspended = user.status === "suspended";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">My artworks</h2>
          {artworks.length > 0 && (
            <p className="mt-1 font-sans text-xs text-muted">
              {artworks.length} {artworks.length === 1 ? "artwork" : "artworks"}
            </p>
          )}
        </div>
        {!suspended && (
          <Link href="/artist/artworks/new" className="btn-primary">
            Add artwork
          </Link>
        )}
      </div>

      {artworks.length === 0 ? (
        <div className="mt-8 border border-dashed border-line px-6 py-14 text-center">
          <p className="text-sm text-muted">You haven&apos;t added any artworks yet.</p>
          <Link href="/artist/artworks/new" className="btn-primary mt-4 inline-flex">
            Add your first artwork
          </Link>
        </div>
      ) : (
        // A phone-friendly stacked list rather than a horizontally-scrolling
        // table -- most artists upload and manage their work from a phone
        // (see components/artist/ArtworkForm.tsx's mobile-first design).
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {artworks.map((artwork) => (
            <li key={artwork.artwork_id} className="row-card">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                <Link
                  href={`/artist/artworks/${artwork.artwork_id}/edit`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden border border-line bg-line/40 transition-opacity hover:opacity-80"
                >
                  {artwork.feature_image_url ? (
                    <SafeImage
                      src={artwork.feature_image_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/artist/artworks/${artwork.artwork_id}/edit`}
                    className="link-underline font-display text-base"
                  >
                    {artwork.title}
                  </Link>
                  {(artwork.category || artwork.subcategory) && (
                    <p className="mt-0.5 truncate font-sans text-xs text-muted">
                      {[artwork.category, artwork.subcategory].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {artwork.status === "rejected" && artwork.rejection_reason && (
                    <p className="mt-1.5 font-sans text-xs text-red-700">
                      Reviewer note: {artwork.rejection_reason}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={artwork.status ?? "draft"} />
                    <span className="font-sans text-xs text-muted">
                      {artwork.updated_at ? new Date(artwork.updated_at).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 sm:pl-2">
                  <ArtworkRowActions
                    artworkId={artwork.artwork_id}
                    status={artwork.status ?? "draft"}
                    suspended={suspended}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
