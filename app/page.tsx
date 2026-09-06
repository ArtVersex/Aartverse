import Link from "next/link";
import type { Metadata } from "next";
import {
  getFeaturedArtworks,
  getOtherArtworksByArtists,
} from "@/lib/queries/artworks";
import { getFeaturedArtists } from "@/lib/queries/artists";
import { getCategoriesWithCounts } from "@/lib/queries/categories";
import { getColorFacets } from "@/lib/queries/colors";
import { getLatestWeekBestCollection } from "@/lib/queries/weekBest";
import ArtworkCard from "@/components/ArtworkCard";
import ArtistCard from "@/components/ArtistCard";
import SafeImage from "@/components/SafeImage";
import SectionHeading from "@/components/SectionHeading";
import {
  ARTIST_REGISTRATION_FORM_URL,
  ART_SUBMISSION_FORM_URL,
} from "@/lib/constants";
import { normalizeHex } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Aartverse — Contemporary Art Marketplace",
  description:
    "Discover original artworks and the artists behind them on Aartverse — a contemporary art marketplace.",
};

export default async function HomePage() {
  const [featured, featuredArtists, categories, colors, weekBest] = await Promise.all([
    getFeaturedArtworks(8),
    getFeaturedArtists(6),
    getCategoriesWithCounts(),
    getColorFacets(),
    getLatestWeekBestCollection(),
  ]);

  const selected = await getOtherArtworksByArtists(
    featured.map((a) => a.artwork_id),
    12
  );

  return (
    <div>
      {/* Hero */}
      <section className="container-gallery flex min-h-[70vh] flex-col justify-center gap-8 py-20">
        <p className="eyebrow">Aartverse</p>
        <h1 className="max-w-3xl font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
          Original art, straight from the artist&apos;s studio.
        </h1>
        <p className="max-w-xl text-lg text-muted">
          A considered collection of contemporary paintings, drawings and
          mixed-media work — each piece verified, certified, and ready to
          find a new home.
        </p>
        <div className="flex flex-wrap gap-6 pt-2">
          <Link
            href="/artworks"
            className="bg-ink px-8 py-4 text-sm uppercase tracking-widest2 text-canvas transition-opacity hover:opacity-90"
          >
            Browse artworks
          </Link>
          <Link href="/artists" className="eyebrow link-underline self-center">
            Meet the artists
          </Link>
        </div>
      </section>

      {/* Featured artworks (impactful = 1) */}
      {featured.length > 0 && (
        <section className="container-gallery py-20">
          <SectionHeading
            eyebrow="Curator's picks"
            title="Featured artworks"
            href="/artworks"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((artwork) => (
              <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
            ))}
          </div>
        </section>
      )}

      {/* Week Best Collection */}
      {weekBest && weekBest.artworks.length > 0 && (
        <section className="border-y border-line bg-ink py-20 text-canvas">
          <div className="container-gallery">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-canvas/20 pb-6">
              <div>
                <p className="eyebrow text-canvas/70">
                  {weekBest.label ?? "Week Best Collection"}
                </p>
                <h2 className="font-display text-3xl sm:text-4xl">
                  {weekBest.headline ?? weekBest.collection_name}
                </h2>
              </div>
              <Link
                href={`/week-best/${encodeURIComponent(weekBest.week_best_collection_id)}`}
                className="eyebrow text-canvas underline decoration-canvas/40 underline-offset-4 hover:decoration-canvas"
              >
                View collection
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
              {weekBest.artworks.slice(0, 8).map((artwork) => (
                <div key={artwork.artwork_id} className="[&_a]:text-canvas [&_p]:text-canvas/70">
                  <ArtworkCard artwork={artwork} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured artists */}
      {featuredArtists.length > 0 && (
        <section className="container-gallery py-20">
          <SectionHeading
            eyebrow="The studio"
            title="Featured artists"
            href="/artists"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
            {featuredArtists.map((artist) => (
              <ArtistCard key={artist.artist_id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {/* Browse by category */}
      {categories.length > 0 && (
        <section className="container-gallery py-20">
          <SectionHeading eyebrow="Discover" title="Browse by category" />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group flex flex-col items-center gap-5 border border-line px-6 py-12 text-center transition-colors hover:border-ink"
              >
                {category.image_url && (
                  <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                    <SafeImage
                      src={category.image_url}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl">{category.name}</h3>
                  <p className="eyebrow mt-1 text-[11px]">
                    {category.artwork_count} artwork
                    {category.artwork_count === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Browse by color — the site's primary discovery path */}
      {colors.length > 0 && (
        <section className="container-gallery py-20">
          <SectionHeading
            eyebrow="Discover"
            title="Find art by color"
            href="/artworks"
            hrefLabel="See all colors"
          />
          <div className="flex flex-wrap gap-6">
            {colors.map((color) => {
              const hex = normalizeHex(color.hex);
              return (
                <Link
                  key={color.color_family}
                  href={`/artworks?color=${encodeURIComponent(color.color_family)}`}
                  className="group flex flex-col items-center gap-3"
                >
                  <span
                    className="block h-16 w-16 rounded-full border border-line shadow-sm transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
                    style={{ backgroundColor: hex ?? "#d8d2c8" }}
                    aria-hidden
                  />
                  <span className="eyebrow text-[11px]">{color.color_family}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Selected artworks */}
      {selected.length > 0 && (
        <section className="container-gallery py-20">
          <SectionHeading
            eyebrow="Recently added"
            title="Selected artworks"
            href="/artworks"
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {selected.map((artwork) => (
              <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
            ))}
          </div>
        </section>
      )}

      {/* CTA for artists */}
      <section className="container-gallery py-24">
        <div className="flex flex-col items-start gap-6 border border-line p-10 sm:p-16">
          <p className="eyebrow">For artists</p>
          <h2 className="max-w-2xl font-display text-3xl sm:text-4xl">
            Show your work to collectors who are looking for it.
          </h2>
          <p className="max-w-xl text-muted">
            Aartverse is built for original, verified work — every piece is
            certified and presented with the context collectors want:
            technique, history and meaning.
          </p>
          <div className="flex flex-wrap gap-6 pt-2">
            <a
              href={ARTIST_REGISTRATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-ink px-8 py-4 text-sm uppercase tracking-widest2 text-canvas transition-opacity hover:opacity-90"
            >
              Register as an artist
            </a>
            <a
              href={ART_SUBMISSION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow link-underline self-center"
            >
              Submit an artwork
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
