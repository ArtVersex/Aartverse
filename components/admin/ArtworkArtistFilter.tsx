"use client";

import { useRouter } from "next/navigation";

/**
 * Artist filter for /admin/artworks (sits alongside the existing status
 * tabs -- see app/admin/artworks/page.tsx). A plain client-side <select>
 * rather than a <form method="get"> like the public ArtworkFilters.tsx,
 * since there's only one control here and auto-submitting on change is
 * the less clicky option for an admin who'll use this repeatedly.
 *
 * Takes `currentStatus` (and the other controls' current values) as props,
 * read from the page's own `searchParams`, rather than reading the URL
 * itself via useSearchParams() -- avoids that hook's Suspense-boundary
 * requirement entirely, and the page already has the values on hand anyway.
 * Every OTHER active control is carried through unchanged on navigation --
 * choosing an artist must never silently reset the impactful or rank
 * filter, or the rank sort, and vice versa (see the matching comment on
 * ArtworkRankFilter, its sibling in the same header row).
 */
export default function ArtworkArtistFilter({
  artists,
  currentArtistId,
  currentStatus,
  currentImpactful,
  currentRankFilter,
  currentSort,
}: {
  artists: Array<{ artist_id: string; name: string }>;
  currentArtistId?: string;
  currentStatus: string;
  // Not rendered here -- there's no "Filter by impactful" control yet --
  // but still threaded through so switching artists doesn't drop it if a
  // future control (or a manually-edited URL) ever sets it.
  currentImpactful?: string;
  currentRankFilter?: string;
  currentSort?: string;
}) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    params.set("status", currentStatus);
    if (e.target.value) {
      params.set("artist", e.target.value);
    }
    if (currentImpactful) params.set("impactful", currentImpactful);
    if (currentRankFilter) params.set("rank", currentRankFilter);
    if (currentSort) params.set("sort", currentSort);
    router.push(`/admin/artworks?${params.toString()}`);
  }

  return (
    <label className="flex flex-col gap-1.5 sm:w-56">
      <span className="eyebrow text-[11px]">Filter by artist</span>
      <select defaultValue={currentArtistId ?? ""} onChange={handleChange}>
        <option value="">All artists</option>
        {artists.map((a) => (
          <option key={a.artist_id} value={a.artist_id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
}
