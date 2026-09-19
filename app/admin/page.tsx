import Link from "next/link";
import { listArtistUsers } from "@/lib/queries/users";
import { listArtworksForAdmin } from "@/lib/queries/artworkMutations";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const [artists, pendingArtworks] = await Promise.all([
    listArtistUsers(),
    listArtworksForAdmin({ status: "pending" }),
  ]);

  const pendingArtists = artists.filter((a) => a.status === "pending").length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Link href="/admin/artists" className="border border-line p-6 hover:border-ink">
        <p className="font-display text-3xl">{pendingArtists}</p>
        <p className="eyebrow mt-1">Artists awaiting approval</p>
      </Link>
      <Link href="/admin/artworks?status=pending" className="border border-line p-6 hover:border-ink">
        <p className="font-display text-3xl">{pendingArtworks.length}</p>
        <p className="eyebrow mt-1">Artworks awaiting review</p>
      </Link>
      <Link href="/admin/artists" className="border border-line p-6 hover:border-ink">
        <p className="font-display text-3xl">{artists.length}</p>
        <p className="eyebrow mt-1">Total artists</p>
      </Link>
    </div>
  );
}
