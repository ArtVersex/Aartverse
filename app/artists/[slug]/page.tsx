import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReadMore from "@/components/ReadMore";
import RichText, { isLongRichText } from "@/components/RichText";
import SafeImage from "@/components/SafeImage";
import { getArtistBySlug } from "@/lib/queries/artists";
import { getCareerEntriesForArtist } from "@/lib/queries/artistCareerEntries";
import {
  getArtworkCountForArtist,
  getArtworks,
  getDistinctCollectionNamesForArtist,
} from "@/lib/queries/artworks";
import ArtworkCard from "@/components/ArtworkCard";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import type { ArtistCareerEntryKind, ArtistCareerEntryRow } from "@/lib/types";
import {
  firstParam,
  looksLikeHtml,
  parseCommaList,
  parsePageParam,
  parseSocialLinks,
  stripHtml,
  toURLSearchParams,
  truncate,
} from "@/lib/utils";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}

// Public display order + labels for the six artist_career_entries kinds.
// "Institutional Collections" (not just "Collections") is deliberate: this
// same page already has an unrelated "Browse by collection" artwork-series
// filter further down, and ArtistCareerEntryKind's own doc comment in
// lib/types.ts is explicit that these are two different ideas that must
// never be conflated for a visitor reading the page.
const CAREER_SECTIONS: Array<{ kind: ArtistCareerEntryKind; label: string }> = [
  { kind: "education", label: "Education" },
  { kind: "exhibition", label: "Exhibitions" },
  { kind: "award", label: "Awards & Recognition" },
  { kind: "residency", label: "Residencies" },
  { kind: "publication", label: "Publications" },
  { kind: "collection", label: "Institutional Collections" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: "Artist not found" };
  // artist_statement may be rich-text HTML (see
  // components/RichTextEditor.tsx) -- strip tags before truncating so a
  // <meta description> never contains literal markup.
  const plainStatement = artist.artist_statement
    ? looksLikeHtml(artist.artist_statement)
      ? stripHtml(artist.artist_statement)
      : artist.artist_statement
    : undefined;

  return {
    title: artist.name,
    description: truncate(plainStatement, 160) || undefined,
    openGraph: artist.profile_image_url
      ? { images: [{ url: artist.profile_image_url }] }
      : undefined,
  };
}

export default async function ArtistProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const page = parsePageParam(resolvedSearchParams.page);
  const selectedCategory = firstParam(resolvedSearchParams.category) || undefined;
  const selectedCollection = firstParam(resolvedSearchParams.collection) || undefined;

  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  // The artist page is the one deliberate exception to "impactful = 1
  // everywhere": it shows every artwork by this artist by default, with the
  // impactful-flagged pieces surfaced first and the rest following. The
  // category and collection filters below narrow that same "all artworks"
  // set (and can be combined) rather than switching to the impactful-only
  // view used elsewhere on the site.
  const [{ items, totalPages }, collections, allArtworksCount, careerEntries] =
    await Promise.all([
      getArtworks({
        filters: {
          artistId: artist.artist_id,
          category: selectedCategory,
          collectionName: selectedCollection,
        },
        sort: "newest",
        page,
        pageSize: 24,
        prioritizeImpactful: true,
      }),
      getDistinctCollectionNamesForArtist(artist.artist_id),
      getArtworkCountForArtist(artist.artist_id),
      getCareerEntriesForArtist(artist.artist_id),
    ]);

  const mediums = parseCommaList(artist.mediums);
  // Never surfaced here: artist.phone / artist.whatsapp. Both are collected
  // strictly for the Aartverse team's own contact use -- see
  // components/artist/ProfileForm.tsx's own Contact-section copy, which
  // tells the artist exactly that up front -- so this page must not be the
  // place that quietly breaks that promise.
  const socialLinks = parseSocialLinks(artist.social_links);

  const careerByKind = new Map<ArtistCareerEntryKind, ArtistCareerEntryRow[]>();
  for (const entry of careerEntries) {
    const list = careerByKind.get(entry.kind);
    if (list) list.push(entry);
    else careerByKind.set(entry.kind, [entry]);
  }
  const hasCareerHistory = CAREER_SECTIONS.some(
    ({ kind }) => (careerByKind.get(kind)?.length ?? 0) > 0
  );

  // Both filter rows narrow the same underlying list and can be combined
  // (category AND collection); each chip's link keeps the OTHER row's
  // current selection intact rather than resetting it.
  const buildFilterHref = (overrides: { category?: string; collection?: string }) => {
    const params = new URLSearchParams();
    const category = "category" in overrides ? overrides.category : selectedCategory;
    const collection = "collection" in overrides ? overrides.collection : selectedCollection;
    if (category) params.set("category", category);
    if (collection) params.set("collection", collection);
    const qs = params.toString();
    return `/artists/${slug}${qs ? `?${qs}` : ""}`;
  };

  const headingLabel = [selectedCollection, selectedCategory].filter(Boolean).join(" · ");

  return (
    <div>
      {/* Cover -- a fixed, more modest height on phones (was 40vh, which on
          a typical phone ran to ~300px+ of pure decoration before a visitor
          reached the artist's name); still a generous 50vh band from sm: up
          where there's more room to spare. */}
      <div className="relative h-56 w-full bg-line/40 sm:h-[50vh]">
        {artist.cover_image_url && (
          <SafeImage
            src={artist.cover_image_url}
            alt={`${artist.name} cover image`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-canvas/50 via-transparent to-transparent"
        />
      </div>

      <div className="container-gallery -mt-16 pb-16 sm:-mt-20">
        {/* Only the avatar overlaps the cover photo, on its own -- the name
            and location sit in normal flow underneath with their own
            margin, so a long (or wrapping) name can never render on top of
            the cover image the way it used to when both shared one
            bottom-aligned row shifted up by the same negative margin. */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-canvas bg-line/40 shadow-elevated sm:h-40 sm:w-40">
          {artist.profile_image_url && (
            <SafeImage
              src={artist.profile_image_url}
              alt={artist.name}
              fill
              sizes="160px"
              className="object-cover"
            />
          )}
        </div>
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl sm:text-5xl">{artist.name}</h1>
            {artist.featured === 1 && <span className="badge-featured">★ Featured</span>}
          </div>
          {artist.location && <p className="mt-2 text-muted">{artist.location}</p>}
        </div>

        {artist.artist_statement && (
          <div className="mt-10 max-w-2xl">
            {isLongRichText(artist.artist_statement) ? (
              <ReadMore id={`${artist.artist_id}-statement`}>
                <RichText text={artist.artist_statement} className="text-lg" />
              </ReadMore>
            ) : (
              <RichText text={artist.artist_statement} className="text-lg" />
            )}
          </div>
        )}

        {(mediums.length > 0 || artist.website || artist.instagram || socialLinks.length > 0) && (
          <div className="mt-8 flex flex-wrap items-center gap-2.5 border-y border-line py-6">
            {mediums.map((medium) => (
              <span key={medium} className="eyebrow border border-line px-3 py-1 text-[11px]">
                {medium}
              </span>
            ))}
            {artist.website && <LinkPill href={artist.website} label="Website" />}
            {artist.instagram && (
              <LinkPill
                href={
                  artist.instagram.startsWith("http")
                    ? artist.instagram
                    : `https://instagram.com/${artist.instagram.replace(/^@/, "")}`
                }
                label="Instagram"
              />
            )}
            {socialLinks.map((link) => (
              <LinkPill key={`${link.label}-${link.url}`} href={link.url} label={link.label} />
            ))}
          </div>
        )}

        {/* Biography / Professional experience -- pre-filled today only
            into the Artist Profile PDF builder; surfaced here so a visitor
            gets the same depth without downloading a PDF. Both are
            optional, rich-text fields (see components/RichTextEditor.tsx),
            so each renders exactly like the artist statement above. */}
        {(artist.bio || artist.professional_experience) && (
          <section className="mt-10 grid gap-12 border-t border-line pt-10 sm:mt-16 sm:pt-16 lg:grid-cols-2">
            {artist.bio && (
              <div>
                <h2 className="font-display text-2xl">Biography</h2>
                <div className="mt-4 max-w-xl">
                  {isLongRichText(artist.bio) ? (
                    <ReadMore id={`${artist.artist_id}-bio`}>
                      <RichText text={artist.bio} />
                    </ReadMore>
                  ) : (
                    <RichText text={artist.bio} />
                  )}
                </div>
              </div>
            )}
            {artist.professional_experience && (
              <div>
                <h2 className="font-display text-2xl">Professional Experience</h2>
                <div className="mt-4 max-w-xl">
                  {isLongRichText(artist.professional_experience) ? (
                    <ReadMore id={`${artist.artist_id}-experience`}>
                      <RichText text={artist.professional_experience} />
                    </ReadMore>
                  ) : (
                    <RichText text={artist.professional_experience} />
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Career history -- exhibitions/education/awards/residencies/
            publications/institutional collections, the same six
            repeatable lists the Profile form and PDF builder already
            collect (artist_career_entries), never shown publicly before
            this refresh. */}
        {hasCareerHistory && (
          <section className="mt-10 border-t border-line pt-10 sm:mt-16 sm:pt-16">
            <h2 className="font-display text-2xl">Career highlights</h2>
            <div className="mt-8 grid gap-x-12 gap-y-12 sm:grid-cols-2">
              {CAREER_SECTIONS.map(({ kind, label }) => {
                const entries = careerByKind.get(kind);
                if (!entries || entries.length === 0) return null;
                return <CareerList key={kind} label={label} entries={entries} />;
              })}
            </div>
          </section>
        )}

        {artist.additional_notes && (
          <section className="mt-10 max-w-2xl border-t border-line pt-10 sm:mt-16 sm:pt-16">
            <h2 className="font-display text-2xl">Additional notes</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
              {artist.additional_notes}
            </p>
          </section>
        )}

        <div className="mt-10 border-t border-line pt-10 sm:mt-16 sm:pt-16">
          <h2 className="font-display text-2xl">
            {headingLabel ? `${headingLabel} by ${artist.name}` : `Artworks by ${artist.name}`}
          </h2>

          {/* Lets a visitor narrow this artist's work down to one
              collection/series -- the matching "Browse by category" row was
              removed (2026-09-19) to keep this to a single, simpler filter
              rather than two side by side. */}

          {collections.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-8">
              <span className="eyebrow text-muted">Browse by collection:</span>
              <Link
                href={buildFilterHref({ collection: "" })}
                className={`eyebrow ${
                  !selectedCollection ? "text-ink underline decoration-1 underline-offset-4" : "text-muted"
                }`}
              >
                All ({allArtworksCount})
              </Link>
              {collections.map((c) => (
                <Link
                  key={c.collection_name}
                  href={buildFilterHref({ collection: c.collection_name })}
                  className={`eyebrow min-w-0 ${
                    selectedCollection === c.collection_name
                      ? "text-ink underline decoration-1 underline-offset-4"
                      : "text-muted"
                  }`}
                >
                  {c.collection_name} ({c.artwork_count})
                </Link>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <EmptyState
              message={
                headingLabel
                  ? `No ${headingLabel.toLowerCase()} artworks by this artist yet.`
                  : "This artist doesn't have any published artworks yet."
              }
            />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
              {items.map((artwork) => (
                <ArtworkCard key={artwork.artwork_id} artwork={artwork} />
              ))}
            </div>
          )}
          <Pagination
            basePath={`/artists/${slug}`}
            searchParams={toURLSearchParams(resolvedSearchParams)}
            page={page}
            totalPages={totalPages}
          />
        </div>
      </div>
    </div>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="eyebrow inline-flex items-center gap-1.5 border border-line px-3 py-1 text-[11px] text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {label}
      <span aria-hidden>↗</span>
    </a>
  );
}

function CareerList({ label, entries }: { label: string; entries: ArtistCareerEntryRow[] }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-accent">{label}</p>
      <ul className="space-y-5">
        {entries.map((entry) => (
          <li key={entry.id} className="border-l-2 border-line pl-4">
            {entry.subtype && <p className="eyebrow text-[10px] text-muted">{entry.subtype}</p>}
            <p className="font-display text-lg leading-snug">{entry.title}</p>
            {(entry.organization || entry.location || entry.year_label) && (
              <p className="mt-0.5 text-sm text-muted">
                {[entry.organization, entry.location, entry.year_label].filter(Boolean).join(" · ")}
              </p>
            )}
            {entry.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{entry.description}</p>
            )}
            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="eyebrow link-underline mt-2 inline-block text-[11px]"
              >
                View ↗
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
