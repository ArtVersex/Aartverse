import { requireArtist } from "@/lib/auth/session";
import ArtistNav from "@/components/artist/ArtistNav";
import StatusBanner from "@/components/artist/StatusBanner";
import StatusPill from "@/components/StatusPill";

/**
 * Guards every /artist/* route. requireArtist() re-checks the database on
 * every request (see lib/auth/session.ts) — it redirects to /login if not
 * authenticated, and away entirely if the account isn't an artist. Status
 * (pending/active/suspended) is NOT gated here on purpose: pending and
 * suspended artists still reach their dashboard, per the onboarding flow —
 * individual mutating actions enforce the suspended restriction themselves.
 */
export default async function ArtistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireArtist();

  return (
    <div className="container-gallery py-8 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Artist Portal</p>
          <h1 className="font-display text-2xl">{user.name}</h1>
        </div>
        <StatusPill status={user.status} />
      </div>

      <ArtistNav />
      <StatusBanner status={user.status} emailVerified={!!user.email_verified_at} />

      {children}
    </div>
  );
}
