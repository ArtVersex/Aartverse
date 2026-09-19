import Link from "next/link";
import { requireArtist } from "@/lib/auth/session";
import { getArtistById } from "@/lib/queries/artists";
import { getCareerEntriesForArtist } from "@/lib/queries/artistCareerEntries";
import ProfileForm from "@/components/artist/ProfileForm";

export const metadata = { title: "Artist Profile" };

export default async function ArtistProfilePage() {
  const user = await requireArtist();
  const artist = user.artist_id ? await getArtistById(user.artist_id) : null;
  const careerEntries = user.artist_id ? await getCareerEntriesForArtist(user.artist_id) : [];

  return (
    <div>
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Your account</p>
          <h2 className="mb-2 font-display text-2xl">Your profile</h2>
          <p className="max-w-2xl text-sm text-muted">
            This is what appears on your public AartVerse artist page once your account is
            approved. Fill it in at your own pace. Everything saves instantly, and your contact
            details stay private to our team.
          </p>
        </div>
        <Link href="/artist/profile-builder" className="btn-secondary w-full shrink-0 sm:w-auto">
          Create Artist Profile
        </Link>
      </div>
      <ProfileForm artist={artist} careerEntries={careerEntries} />
    </div>
  );
}
