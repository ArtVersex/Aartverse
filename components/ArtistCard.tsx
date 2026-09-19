import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import type { ArtistRow } from "@/lib/types";
import { parseCommaList } from "@/lib/utils";

export default function ArtistCard({ artist }: { artist: ArtistRow }) {
  const isFeatured = artist.featured === 1;
  const primaryMedium = parseCommaList(artist.mediums)[0] ?? null;

  return (
    <Link href={`/artists/${artist.slug}`} className="group flex flex-col items-center text-center">
      <div className="relative">
        <div className="relative h-32 w-32 overflow-hidden rounded-full bg-line/40 shadow-soft ring-1 ring-line transition-all duration-300 group-hover:shadow-elevated group-hover:ring-accent/40 sm:h-40 sm:w-40">
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
        {isFeatured && (
          <span
            title="Featured artist"
            className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap border border-accent bg-canvas px-2 py-0.5 text-[10px] uppercase tracking-widest2 text-accent shadow-soft"
          >
            ★ Featured
          </span>
        )}
      </div>
      <h3 className="mt-5 font-display text-lg transition-colors group-hover:text-accent">{artist.name}</h3>
      {artist.location && <p className="text-sm text-muted">{artist.location}</p>}
      {/* {primaryMedium && <p className="eyebrow mt-1 text-[10px] text-muted/80">{primaryMedium}</p>} */}
    </Link>
  );
}
