import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { ArtistRow } from "@/lib/types";

export default function ArtistCard({ artist }: { artist: ArtistRow }) {
  return (
    <Link href={`/artists/${artist.slug}`} className="group flex flex-col items-center text-center">
      <div className="relative h-32 w-32 overflow-hidden rounded-full bg-line/40 sm:h-40 sm:w-40">
        {artist.profile_image_url ? (
          <SafeImage
            src={artist.profile_image_url}
            alt={artist.name}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No photo
          </div>
        )}
      </div>
      <h3 className="mt-4 font-display text-lg">{artist.name}</h3>
      {artist.location && <p className="text-sm text-muted">{artist.location}</p>}
    </Link>
  );
}
