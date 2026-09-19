import Link from "next/link";
import { listArtworksForAdmin } from "@/lib/queries/artworkMutations";
import { getArtistsForFilter } from "@/lib/queries/artists";
import StatusPill from "@/components/StatusPill";
import SafeImage from "@/components/SafeImage";
import ArtworkRowActions from "@/components/admin/ArtworkRowActions";
import ArtworkArtistFilter from "@/components/admin/ArtworkArtistFilter";
import ArtworkRankFilter from "@/components/admin/ArtworkRankFilter";
import ImpactfulToggle from "@/components/admin/ImpactfulToggle";
import FeatureRankInput from "@/components/admin/FeatureRankInput";
import type { ArtworkStatus } from "@/lib/types";

export const metadata = { title: "Manage Artworks" };

const TABS: Array<{ value: ArtworkStatus | "all"; label: string }> = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Drafts" },
  { value: "all", label: "All" },
];

interface Props {
  searchParams: Promise<{
    status?: string;
    artist?: string;
    impactful?: string;
    rank?: string;
    sort?: string;
  }>;
}

export default async function AdminArtworksPage({ searchParams }: Props) {
  const { status, artist, impactful, rank, sort } = await searchParams;
  // Defaults to "approved" -- that's the live-on-the-site view an admin
  // wants day to day now that every submission publishes immediately (see
  // app/artist/artworks/actions.ts). "Pending review"/"Rejected" are kept
  // as tabs purely to find and clean up any leftover legacy rows from
  // before that change -- they're not part of the ongoing workflow anymore.
  const activeTab: ArtworkStatus | "all" =
    status === "approved" ||
    status === "rejected" ||
    status === "draft" ||
    status === "pending" ||
    status === "all"
      ? status
      : "approved";
  const impactfulFilter = impactful === "1" ? true : impactful === "0" ? false : undefined;
  // "rank" filters to only-ranked / only-unranked; "sort" (independently)
  // reorders the list by feature_rank instead of the default recency order
  // -- see components/admin/ArtworkRankFilter.tsx and listArtworksForAdmin's
  // own doc comment (lib/queries/artworkMutations.ts) for how they compose.
  const rankFilter = rank === "ranked" ? true : rank === "unranked" ? false : undefined;
  const sortByRank = sort === "rank";

  const [artworks, artists] = await Promise.all([
    listArtworksForAdmin({
      status: activeTab === "all" ? undefined : activeTab,
      artistId: artist || undefined,
      impactful: impactfulFilter,
      hasRank: rankFilter,
      sortByRank,
    }),
    getArtistsForFilter(),
  ]);

  // Every tab/filter link keeps whatever the OTHER controls are currently
  // set to, so switching status tabs never silently clears an active
  // artist, impactful, rank, or sort control, and vice versa.
  const extraParams = new URLSearchParams();
  if (artist) extraParams.set("artist", artist);
  if (impactful) extraParams.set("impactful", impactful);
  if (rank) extraParams.set("rank", rank);
  if (sort) extraParams.set("sort", sort);
  const extraParamsSuffix = extraParams.toString() ? `&${extraParams.toString()}` : "";
  const selectedArtistName = artist ? artists.find((a) => a.artist_id === artist)?.name : undefined;
  const hasActiveFilter = Boolean(artist || impactful || rank);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl">Artworks</h2>
        <div className="flex flex-wrap items-end gap-3">
          <ArtworkArtistFilter
            artists={artists}
            currentArtistId={artist}
            currentStatus={activeTab}
            currentImpactful={impactful}
            currentRankFilter={rank}
            currentSort={sort}
          />
          <ArtworkRankFilter
            currentStatus={activeTab}
            currentArtistId={artist}
            currentImpactful={impactful}
            currentRankFilter={rank}
            currentSort={sort}
          />
        </div>
      </div>

      {/* Horizontal scroll instead of wrap on narrow screens -- five tabs
          wrapping to two/three lines pushed everything below down
          unpredictably on a phone. */}
      <div className="mb-6 flex gap-4 overflow-x-auto border-b border-line pb-4 sm:flex-wrap">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/artworks?status=${tab.value}${extraParamsSuffix}`}
            className={`eyebrow shrink-0 whitespace-nowrap ${activeTab === tab.value ? "text-ink underline decoration-1 underline-offset-4" : "text-muted hover:text-ink"}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {artworks.length === 0 ? (
        <div className="border border-dashed border-line px-6 py-14 text-center">
          <p className="text-sm text-muted">
            {hasActiveFilter
              ? `Nothing matches these filters${selectedArtistName ? ` for ${selectedArtistName}` : ""}.`
              : "Nothing here."}
          </p>
        </div>
      ) : (
        // Stacked list rather than a horizontally-scrolling table, matching
        // the artist-facing artworks list -- also links each piece through
        // to the full review screen (app/admin/artworks/[artwork_id]/page.tsx)
        // instead of showing its title as plain, unclickable text.
        <ul className="divide-y divide-line border-y border-line">
          {artworks.map((artwork) => (
            <li key={artwork.artwork_id} className="row-card">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                <Link
                  href={`/admin/artworks/${artwork.artwork_id}`}
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
                    href={`/admin/artworks/${artwork.artwork_id}`}
                    className="link-underline font-display text-base"
                  >
                    {artwork.title}
                  </Link>
                  <p className="mt-0.5 truncate font-sans text-xs text-muted">
                    {artwork.artist_name ?? artwork.artist_id}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusPill status={artwork.status ?? "draft"} />
                    <span className="font-sans text-xs text-muted">
                      {artwork.submitted_at
                        ? new Date(artwork.submitted_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-row flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                  <div className="flex items-center gap-2">
                    <ImpactfulToggle
                      artworkId={artwork.artwork_id}
                      initialValue={Boolean(artwork.impactful)}
                    />
                    <FeatureRankInput
                      artworkId={artwork.artwork_id}
                      initialValue={artwork.feature_rank}
                    />
                  </div>
                  <ArtworkRowActions artworkId={artwork.artwork_id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
