import Link from "next/link";
import { listArtistUsers } from "@/lib/queries/users";
import StatusPill from "@/components/StatusPill";
import ArtistRowActions from "@/components/admin/ArtistRowActions";
import FeaturedToggle from "@/components/admin/FeaturedToggle";
import FeaturedPriorityInput from "@/components/admin/FeaturedPriorityInput";
import { buildPersonalWhatsAppLink, buildTelLink } from "@/lib/constants";

export const metadata = { title: "Manage Artists" };

export default async function AdminArtistsPage() {
  const artists = await listArtistUsers();

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl">Artists</h2>

      {artists.length === 0 ? (
        <p className="text-sm text-muted">No artist accounts yet.</p>
      ) : (
        // A phone-friendly stacked list rather than a horizontally-scrolling
        // table -- same row-card pattern as app/artist/artworks/page.tsx and
        // app/admin/artworks/page.tsx, so both admin list views behave the
        // same way on a narrow screen instead of needing a sideways scroll.
        <ul className="divide-y divide-line border-y border-line">
          {artists.map((artist) => {
            // WhatsApp falls back to phone when no separate WhatsApp number
            // was given -- same "same as phone" convention as the profile
            // form itself (ProfileForm.tsx's sameAsPhone checkbox).
            const whatsappNumber = artist.artist_whatsapp ?? artist.artist_phone;
            return (
            <li key={artist.id} className="row-card">
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/artists/${artist.id}`}
                      className="link-underline truncate font-display text-base"
                    >
                      {artist.artist_name ?? artist.name}
                    </Link>
                    <StatusPill status={artist.status} />
                  </div>
                  <p className="mt-0.5 truncate font-sans text-xs text-muted">{artist.email}</p>
                  <p className="mt-2 font-sans text-xs text-muted">
                    {artist.email_verified_at ? "Email verified" : "Email not verified"}
                    {" · "}
                    Joined {new Date(artist.created_at).toLocaleDateString()}
                  </p>
                  {(artist.artist_phone || whatsappNumber) && (
                    <p className="mt-2 flex flex-wrap items-center gap-3 font-sans text-xs">
                      {artist.artist_phone && (
                        <a href={buildTelLink(artist.artist_phone)} className="link-underline text-muted">
                          Call
                        </a>
                      )}
                      {whatsappNumber && (
                        <a
                          href={buildPersonalWhatsAppLink(
                            whatsappNumber,
                            `Hi ${artist.artist_name ?? artist.name}, this is the Aartverse team.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-underline text-muted"
                        >
                          WhatsApp
                        </a>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 sm:pl-2">
                  {artist.artist_id && (
                    <>
                      <FeaturedToggle
                        artistId={artist.artist_id}
                        initialValue={artist.artist_featured === 1}
                      />
                      <FeaturedPriorityInput
                        artistId={artist.artist_id}
                        initialValue={artist.artist_featured_priority}
                      />
                    </>
                  )}
                  <Link href={`/admin/artists/${artist.id}`} className="eyebrow link-underline">
                    View profile
                  </Link>
                  <ArtistRowActions userId={artist.id} status={artist.status} />
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
