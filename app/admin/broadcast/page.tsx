import { requireAdmin } from "@/lib/auth/session";
import { isArtistProfileIncomplete, listArtistUsers } from "@/lib/queries/users";
import BroadcastEmailForm from "@/components/admin/BroadcastEmailForm";

export const metadata = { title: "Email Artists" };

/**
 * One-off broadcast email to any number of artists -- a submission
 * reminder, a note that an account is registered but nothing's been
 * submitted yet, news about an authenticated listing, an upcoming
 * competition, or any other communication. No auth check of its own beyond
 * calling requireAdmin() for defense-in-depth -- app/admin/layout.tsx
 * already gates every /admin/* route, same as every sibling admin page.
 * Any admin can use this, not a super-admin-only capability.
 */
export default async function AdminBroadcastPage() {
  await requireAdmin();
  const artists = await listArtistUsers();

  return (
    <div>
      <h2 className="mb-2 font-display text-2xl">Email Artists</h2>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        Send the same email to several artists at once. Selecting more than one sends everyone the
        same message via Bcc, so no recipient sees who else got it -- and you can also type in an
        email address directly for anyone who isn&apos;t registered on the site yet.
      </p>

      <BroadcastEmailForm
        artists={artists.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          status: a.status,
          // Flags anyone who's registered but has submitted nothing and
          // never finished their profile, so the form's one-click shortcut
          // can select exactly this group and drop in a ready-to-send
          // reminder -- see isArtistProfileIncomplete's doc comment for
          // exactly which fields count toward "incomplete".
          needsReminder: a.artwork_count === 0 && isArtistProfileIncomplete(a),
        }))}
      />
    </div>
  );
}
