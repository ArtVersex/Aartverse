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
import FramedArtwork from "@/components/FramedArtwork";
import SafeImage from "@/components/SafeImage";
import SectionHeading from "@/components/SectionHeading";
import { normalizeHex } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Aartverse | Contemporary Art Marketplace",
  description:
    "Discover original artworks and the artists behind them on Aartverse, a contemporary art marketplace.",
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

  // The single strongest "curator's pick" doubles as the hero's visual
  // companion, presented the same way every artwork is (see
  // components/FramedArtwork.tsx) rather than a generic stock hero image --
  // the homepage should look like the same gallery as every other page.
  const heroArtwork = featured[0] ?? null;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 12% 0%, rgba(154,91,63,0.10), transparent 60%)",
          }}
        />
        <div className="container-gallery grid gap-10 py-8 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-4 lg:py-24">
          <div className="flex flex-col gap-5 sm:gap-6 lg:gap-7">
            <p className="eyebrow text-accent normal-case">AartVerse</p>
            <h1 className="max-w-2xl font-display text-4xl leading-[1.05] sm:text-5xl lg:text-[4rem]">
              Original art, straight from the artist&apos;s studio.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              A considered collection of contemporary paintings, drawings and
              mixed-media work, each piece selected and ready to find a new
              home.
            </p>

            {/* CTAs right after the intro copy, ahead of the mobile hero
                image below -- on a phone that gets a visitor to "Browse
                artworks" within the first screen instead of making them
                scroll past a large decorative image first. */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/artworks" className="btn-accent">
                Browse artworks
              </Link>
              <Link href="/artists" className="nav-link !text-sm normal-case tracking-normal">
                Meet the artists →
              </Link>
            </div>

            {/* Mobile/tablet: the strongest current piece shows up right here,
                after the intro and CTAs, instead of after a wall of text with
                no artwork in sight (see its own comment above on why this
                exists). At lg+ this copy is hidden and the wider, side-by-side
                one further down takes over instead. */}
            {heroArtwork && (
              <div className="lg:hidden">
                <FramedArtwork
                  src={heroArtwork.feature_image_url}
                  alt={heroArtwork.title}
                  priority
                />
              </div>
            )}
          </div>

          {heroArtwork && (
            <div className="hidden lg:block">
              <FramedArtwork
                src={heroArtwork.feature_image_url}
                alt={heroArtwork.title}
                priority
              />
            </div>
          )}
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
                <p className="eyebrow text-accent">
                  {weekBest.label ?? "Week Best Collection"}
                </p>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                  {weekBest.headline ?? weekBest.collection_name}
                </h2>
              </div>
              <Link
                href={`/week-best/${encodeURIComponent(weekBest.week_best_collection_id)}`}
                className="eyebrow text-canvas underline decoration-canvas/40 underline-offset-4 transition-colors hover:decoration-accent hover:text-accent"
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
                className="card-lift group flex flex-col items-center gap-5 border border-line bg-white px-6 py-12 text-center hover:border-accent/40"
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
                    className="block h-16 w-16 rounded-full border border-line shadow-soft transition-transform duration-300 group-hover:scale-110 group-hover:shadow-elevated sm:h-20 sm:w-20"
                    style={{ backgroundColor: hex ?? "#d8d2c8" }}
                    aria-hidden
                  />
                  <span className="eyebrow text-[11px] transition-colors group-hover:text-accent">
                    {color.color_family}
                  </span>
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

      {/* CTA for artists -- py-14 on mobile (was py-24 everywhere): stacked
          against the footer's own top margin, the old value left close to a
          fifth of a phone screen as pure dead space between this section
          and the footer starting. sm:py-24 keeps the original, more
          generous desktop spacing untouched. */}
      <section className="container-gallery py-14 sm:py-24">
        <div
          className="relative flex flex-col items-start gap-6 overflow-hidden border border-line p-10 sm:p-16"
          style={{
            background:
              "radial-gradient(ellipse 90% 100% at 100% 0%, rgba(154,91,63,0.08), transparent 60%)",
          }}
        >
          <p className="eyebrow text-accent">For artists</p>
          <h2 className="max-w-2xl font-display text-3xl sm:text-4xl">
            Show your work to collectors who are looking for it.
          </h2>
          <p className="max-w-xl text-muted">
            Aartverse is built for original, verified work. Every piece is
            certified and presented with the context collectors want:
            technique, history and meaning.
          </p>
          <div className="flex flex-wrap gap-6 pt-2">
            <Link href="/login" className="btn-accent">
              Register as an artist
            </Link>
            <Link href="/login" className="nav-link !text-sm normal-case tracking-normal self-center">
              Submit an artwork
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
