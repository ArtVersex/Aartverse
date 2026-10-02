import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserById } from "@/lib/queries/users";
import { getArtistById } from "@/lib/queries/artists";
import { getCareerEntriesForArtist } from "@/lib/queries/artistCareerEntries";
import ProfileForm from "@/components/artist/ProfileForm";
import StatusPill from "@/components/StatusPill";
import { updateArtistProfileAsAdminAction } from "./actions";

export const metadata = { title: "Artist Profile" };

interface Props {
  params: Promise<{ userId: string }>;
}

/**
 * Admin-only full-profile view/edit screen for one artist -- reachable from
 * each row's "View profile" link on app/admin/artists/page.tsx. Reuses the
 * exact same <ProfileForm> the artist sees on their own /artist/profile,
 * just bound to updateArtistProfileAsAdminAction instead (see that action's
 * own doc comment in ./actions.ts) -- same "one form, two bound actions"
 * shape as ArtworkForm's artist/admin reuse in
 * app/admin/artworks/[artwork_id]/page.tsx.
 *
 * Exists because artists can and do make mistakes in their own profile (a
 * typo, an outdated bio, a wrong contact number) that our team should be
 * able to fix directly, without relying on the artist to notice and redo it
 * themselves.
 *
 * No auth check of its own -- app/admin/layout.tsx already calls
 * requireAdmin() for every /admin/* route, same as every sibling admin page;
 * the action itself independently re-checks requireAdmin() too.
 */
export default async function AdminArtistProfilePage({ params }: Props) {
  const { userId } = await params;

  const target = await getUserById(userId);
  if (!target || target.role !== "artist") {
    notFound();
  }

  const artist = target.artist_id ? await getArtistById(target.artist_id) : null;
  const careerEntries = target.artist_id
    ? await getCareerEntriesForArtist(target.artist_id)
    : [];

  const boundAction = updateArtistProfileAsAdminAction.bind(null, userId);

  return (
    <div>
      <Link href="/admin/artists" className="eyebrow link-underline">
        ← Back to artists
      </Link>

      <div className="mb-2 mt-4 flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl">{artist?.name ?? target.name}</h2>
        <StatusPill status={target.status} />
      </div>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        Editing this artist&apos;s profile directly, on their behalf. Changes save immediately and
        show up on their public artist page and their own dashboard right away -- useful for fixing
        a mistake they&apos;ve flagged (or you&apos;ve spotted) without needing them to redo it
        themselves.
      </p>

      {!target.artist_id ? (
        <p className="border border-line bg-white p-6 text-sm text-muted">
          This account has no linked artist profile yet, so there is nothing to edit here.
        </p>
      ) : (
        <ProfileForm
          artist={artist}
          careerEntries={careerEntries}
          name={target.name}
          action={boundAction}
        />
      )}
    </div>
  );
}
