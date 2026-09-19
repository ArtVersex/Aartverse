"use client";

import { useRouter } from "next/navigation";

/**
 * Rank view for /admin/artworks -- sits in the same header row as
 * ArtworkArtistFilter (see app/admin/artworks/page.tsx). Two independent
 * controls that compose:
 *   - "Filter by rank" narrows the list to only ranked or only unranked
 *     pieces (WHERE feature_rank IS [NOT] NULL -- see listArtworksForAdmin,
 *     lib/queries/artworkMutations.ts).
 *   - "View by rank" reorders the (possibly filtered) list by feature_rank
 *     ascending -- 1 first -- instead of the default recency order, with
 *     unranked rows always trailing at the end.
 * Resetting an individual artwork's rank back to NULL is handled inline on
 * each row by FeatureRankInput's own "×" button, not here.
 *
 * Both controls are plain client-side handlers that push a new URL rather
 * than a <form>, matching ArtworkArtistFilter's own reasoning (auto-apply
 * is less clicky for a control an admin uses repeatedly), and both preserve
 * every OTHER active control (status tab, artist, impactful) the same way
 * that component's own handleChange does -- switching the rank view/filter
 * never silently clears an unrelated filter, and vice versa.
 */
export default function ArtworkRankFilter({
  currentStatus,
  currentArtistId,
  currentImpactful,
  currentRankFilter,
  currentSort,
}: {
  currentStatus: string;
  currentArtistId?: string;
  currentImpactful?: string;
  /** "ranked" | "unranked" | undefined (= all) */
  currentRankFilter?: string;
  /** "rank" | undefined (= default recency order) */
  currentSort?: string;
}) {
  const router = useRouter();

  function navigate(overrides: { rank?: string; sort?: string }) {
    const params = new URLSearchParams();
    params.set("status", currentStatus);
    if (currentArtistId) params.set("artist", currentArtistId);
    if (currentImpactful) params.set("impactful", currentImpactful);
    const nextRank = "rank" in overrides ? overrides.rank : currentRankFilter;
    const nextSort = "sort" in overrides ? overrides.sort : currentSort;
    if (nextRank) params.set("rank", nextRank);
    if (nextSort) params.set("sort", nextSort);
    router.push(`/admin/artworks?${params.toString()}`);
  }

  function handleRankFilterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    navigate({ rank: e.target.value || undefined });
  }

  function toggleSort() {
    navigate({ sort: currentSort === "rank" ? undefined : "rank" });
  }

  const sortActive = currentSort === "rank";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 sm:w-44">
        <span className="eyebrow text-[11px]">Filter by rank</span>
        <select defaultValue={currentRankFilter ?? ""} onChange={handleRankFilterChange}>
          <option value="">All</option>
          <option value="ranked">Ranked only</option>
          <option value="unranked">Unranked only</option>
        </select>
      </label>

      <button
        type="button"
        onClick={toggleSort}
        title="Sort the list by feature rank (1 = best pick first); unranked pieces always sort last"
        aria-pressed={sortActive}
        className={`eyebrow whitespace-nowrap border px-3 py-2 text-[11px] transition-colors ${
          sortActive
            ? "border-ink bg-ink text-canvas"
            : "border-line text-muted hover:border-ink hover:text-ink"
        }`}
      >
        {sortActive ? "Default order" : "View by rank"}
      </button>
    </div>
  );
}
