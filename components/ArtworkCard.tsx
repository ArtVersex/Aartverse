import Link from "next/link";
import FramedArtwork from "@/components/FramedArtwork";
import type { ArtworkListItem } from "@/lib/types";
import PriceTag from "@/components/PriceTag";
import { formatColorProportion, normalizeHex } from "@/lib/utils";

export default function ArtworkCard({ artwork }: { artwork: ArtworkListItem }) {
  const matchHex = normalizeHex(artwork.color_match_hex);
  const matchPct = formatColorProportion(artwork.color_match_proportion);
  const dominantHex = normalizeHex(artwork.dominant_color_hex);

  return (
    <article className="group flex flex-col">
      {/* The same wall-frame presentation as the artwork detail hero (see
          components/FramedArtwork.tsx), at its smaller "card" scale — the
          frame shrink-wraps to each artwork's real proportions instead of
          forcing every piece into an identical box, exactly like the hero
          does. Grid rows are allowed to vary in height row-to-row as a
          result (see the `items-start` on each grid this card is used in). */}
      <Link
        href={`/artworks/${encodeURIComponent(artwork.artwork_id)}`}
        className="relative block w-full"
      >
        <FramedArtwork src={artwork.feature_image_url} alt={artwork.title} size="card" />
        {artwork.part_of_collection === 1 && artwork.collection_name && (
          // Hidden until hover — sitting on top of the frame at all times
          // covered part of the artwork itself, which matters more here
          // than always-on labeling.
          <span className="eyebrow absolute left-4 top-4 z-10 bg-canvas/90 px-2 py-1 text-[10px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:left-5 sm:top-5">
            {artwork.collection_name}
          </span>
        )}
        {matchHex && matchPct && (
          <span className="eyebrow absolute right-4 top-4 z-10 flex items-center gap-1.5 bg-canvas/90 px-2 py-1 text-[10px] sm:right-5 sm:top-5">
            <span
              className="h-2.5 w-2.5 rounded-full border border-line/60"
              style={{ backgroundColor: matchHex }}
              aria-hidden
            />
            {matchPct} match
          </span>
        )}
      </Link>

      <div className="mt-4 flex flex-col gap-1">
        <h3 className="font-display text-lg leading-snug transition-colors">
          <Link
            href={`/artworks/${encodeURIComponent(artwork.artwork_id)}`}
            className="link-underline decoration-line group-hover:text-accent group-hover:decoration-accent/50"
          >
            {artwork.title}
          </Link>
        </h3>
        {artwork.artist_name && (
          <p className="text-sm text-muted">
            {artwork.artist_slug ? (
              <Link href={`/artists/${artwork.artist_slug}`} className="transition-colors hover:text-ink">
                {artwork.artist_name}
              </Link>
            ) : (
              artwork.artist_name
            )}
          </p>
        )}
        <div className="flex items-center gap-2">
          {dominantHex && (
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-line/60"
              style={{ backgroundColor: dominantHex }}
              aria-hidden
              title="Dominant color"
            />
          )}
          {artwork.category && <p className="eyebrow text-[11px]">{artwork.category}</p>}
        </div>
        <PriceTag price={artwork.price} inStock={artwork.in_stock} className="mt-1" />
      </div>
    </article>
  );
}
