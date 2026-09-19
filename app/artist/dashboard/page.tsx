import Link from "next/link";
import { requireArtist } from "@/lib/auth/session";
import { listArtworksForArtist } from "@/lib/queries/artworkMutations";
import { getArtistById } from "@/lib/queries/artists";
import { parseCommaList } from "@/lib/utils";
import SafeImage from "@/components/SafeImage";
import StatusPill from "@/components/StatusPill";

export const metadata = { title: "Artist Dashboard" };

export default async function ArtistDashboardPage() {
  const user = await requireArtist();
  const artworks = user.artist_id ? await listArtworksForArtist(user.artist_id) : [];
  const artistProfile = user.artist_id ? await getArtistById(user.artist_id) : null;

  // Every submission publishes immediately now (see
  // app/artist/artworks/actions.ts), so a review-pipeline breakdown would
  // mostly read zero. "Impactful" is an internal curatorial/marketing call
  // Aartverse makes, not something shown to the artist -- these two tiles
  // are simply the artist's own totals instead.
  const collectionsCount = new Set(
    artworks
      .filter((a) => a.part_of_collection && a.collection_name)
      .map((a) => a.collection_name)
  ).size;

  const profileIncomplete =
    !artistProfile?.artist_statement || !artistProfile?.location || !artistProfile?.mediums;

  const mediums = parseCommaList(artistProfile?.mediums).slice(0, 4);
  const initials = getInitials(user.name);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ----- Hero: cover photo, avatar, name/location/status, stats ----- */}
      <div className="border border-line bg-white">
        <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-line/70 via-canvas to-line/40 sm:h-48">
          {artistProfile?.cover_image_url && (
            <SafeImage
              src={artistProfile.cover_image_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="px-4 pb-5 sm:px-8 sm:pb-6">
          {/* Only the avatar overlaps the cover photo -- name/location/status
              sit in normal flow underneath with their own margin, so they
              can never end up rendering on top of the cover image the way
              they could when everything shared one bottom-aligned row
              shifted up by the same negative margin. */}
          <div className="-mt-9 sm:-mt-12">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden border-2 border-canvas bg-line shadow-[0_10px_20px_rgba(23,20,18,0.18)] sm:h-24 sm:w-24">
              {artistProfile?.profile_image_url ? (
                <SafeImage
                  src={artistProfile.profile_image_url}
                  alt={user.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ink font-display text-xl text-canvas sm:text-2xl">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="eyebrow mb-1">Artist Portal</p>
              <h1 className="truncate font-display text-xl leading-tight sm:text-3xl">
                {user.name}
              </h1>
              {artistProfile?.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <IconMapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{artistProfile.location}</span>
                </p>
              )}
            </div>
            <div>
              <StatusPill status={user.status} />
            </div>
          </div>

          {mediums.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {mediums.map((medium) => (
                <span
                  key={medium}
                  className="eyebrow border border-line bg-canvas/50 px-2.5 py-1 text-[10px]"
                >
                  {medium}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats ride along as a footer row inside the same card, rather
            than a second bordered box stacked right underneath it. */}
        <div className="grid grid-cols-2 divide-x divide-line border-t border-line">
          <StatCard label="Artworks" value={artworks.length} />
          <StatCard label="Collections" value={collectionsCount} accent />
        </div>
      </div>

      {profileIncomplete && (
        <div className="callout-banner flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <IconInfo className="h-4 w-4 shrink-0" />
            Your artist profile is still missing a few details.
          </span>
          <Link href="/artist/profile" className="btn-secondary w-full sm:w-auto">
            Complete your profile
          </Link>
        </div>
      )}

      {/* ----- Artist Profile PDF promo ----- */}
      <div className="flex flex-col items-start gap-4 border border-accent/30 bg-accent/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <IconSparkle className="mt-1 h-5 w-5 shrink-0 text-accent" />
          <div>
            <p className="eyebrow mb-2 text-accent">New</p>
            <h2 className="mb-1 font-display text-lg">Create Artist Profile</h2>
            <p className="max-w-xl text-sm text-muted">
              Build a professional, gallery-style PDF from your profile, ready to share with
              curators, collectors, and exhibitions.
            </p>
          </div>
        </div>
        <Link href="/artist/profile-builder" className="btn-primary w-full shrink-0 sm:w-auto">
          Create Artist Profile
        </Link>
      </div>

      {artworks.length === 0 ? (
        <div className="border border-line bg-white p-6 sm:p-8">
          <IconImage className="mb-4 h-8 w-8 text-muted" />
          <p className="eyebrow mb-2">Get started</p>
          <h2 className="mb-3 font-display text-xl">Upload your first artwork</h2>
          <p className="mb-5 max-w-2xl text-sm leading-relaxed text-muted">
            Add a piece and fill in its details. Once you publish, it goes live on
            Aartverse.com right away, with no waiting on review.
          </p>
          <Link href="/artist/artworks/new" className="btn-primary w-full sm:w-auto">
            Add artwork
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 border border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-sm text-muted">Ready to add another piece?</p>
          <Link href="/artist/artworks/new" className="btn-secondary w-full sm:w-auto">
            Add artwork
          </Link>
        </div>
      )}

      {/* ----- Recent artworks ----- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">Recent artworks</p>
          <Link
            href="/artist/artworks"
            className="link-underline flex items-center gap-1 text-sm text-muted"
          >
            View all
            <IconArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {artworks.length === 0 ? (
          <p className="border-y border-line py-6 text-sm text-muted">
            You haven&apos;t added any artworks yet.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {artworks.slice(0, 5).map((artwork) => (
              <li
                key={artwork.artwork_id}
                className="flex items-center gap-3 py-3 transition-colors hover:bg-canvas/50 sm:gap-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-line bg-line/40">
                  {artwork.feature_image_url ? (
                    <SafeImage
                      src={artwork.feature_image_url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <IconImage className="h-5 w-5 text-muted/60" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{artwork.title}</p>
                  {artwork.status && (
                    <span className={`status-pill-${artwork.status} mt-1 !px-2 !py-0.5 !text-[9px]`}>
                      {artwork.status}
                    </span>
                  )}
                </div>
                <Link
                  href={`/artist/artworks/${artwork.artwork_id}/edit`}
                  className="eyebrow link-underline shrink-0"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="bg-white p-4 text-center sm:p-6">
      <p className={`font-display text-2xl sm:text-4xl ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
      <p className="eyebrow mt-1.5 text-[10px] sm:text-xs">{label}</p>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5.5" />
      <circle cx="12" cy="8" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.8L12 16l-1.8-5.2L4.5 9l5.7-1.4L12 2Z" />
    </svg>
  );
}

function IconImage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <rect x="3" y="4" width="18" height="16" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-5.5-5.5a1.5 1.5 0 0 0-2.12 0L4 19" />
    </svg>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}