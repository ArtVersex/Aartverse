import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getArtworkById,
  getMoreByArtist,
  getRelatedArtworks,
} from "@/lib/queries/artworks";
import ArtworkCard from "@/components/ArtworkCard";
import ColorSwatch from "@/components/ColorSwatch";
import ColorScaleBar from "@/components/ColorScaleBar";
import FramedArtwork from "@/components/FramedArtwork";
import PriceTag from "@/components/PriceTag";
import PurchaseEnquiry from "@/components/PurchaseEnquiry";
import ReadMore from "@/components/ReadMore";
import SectionHeading from "@/components/SectionHeading";
import { fallbackFamilyHex } from "@/lib/colorFamilies";
import {
  formatDate,
  isInStock,
  looksLikeHtml,
  sanitizeRichText,
  stripHtml,
  truncate,
} from "@/lib/utils";

export const revalidate = 300;

interface Props {
  params: Promise<{ artwork_id: string }>;
}

/** Some color_scope values may not come through as a clean lowercase
 *  "dominant"/"family" — normalize before comparing. */
function normalizeScope(scope: string | null | undefined): string {
  return (scope ?? "").trim().toLowerCase();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artwork_id } = await params;
  const artwork = await getArtworkById(artwork_id);
  if (!artwork) return { title: "Artwork not found" };

  const rawDescription = artwork.short_description ?? artwork.description ?? undefined;
  const plainDescription = rawDescription
    ? looksLikeHtml(rawDescription)
      ? stripHtml(rawDescription)
      : rawDescription
    : undefined;
  const description = truncate(plainDescription, 160);

  return {
    title: artwork.artist_name ? `${artwork.title} by ${artwork.artist_name}` : artwork.title,
    description: description || undefined,
    openGraph: artwork.feature_image_url
      ? { images: [{ url: artwork.feature_image_url }] }
      : undefined,
  };
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { artwork_id } = await params;
  const artwork = await getArtworkById(artwork_id);
  if (!artwork) notFound();

  const [moreByArtist, related] = await Promise.all([
    artwork.artist_id
      ? getMoreByArtist(artwork.artist_id, artwork.artwork_id, 8)
      : Promise.resolve([]),
    getRelatedArtworks(artwork.category_id, artwork.category, artwork.artwork_id, 8),
  ]);

  // color_scope should be "dominant" / "family", but normalize the match so
  // a stray case/whitespace difference in the imported data doesn't hide
  // the whole palette. Anything that matches neither still shows up under
  // "Colors" rather than being silently dropped.
  const dominantColors = artwork.colors.filter((c) => normalizeScope(c.color_scope) === "dominant");
  const familyColors = artwork.colors.filter((c) => normalizeScope(c.color_scope) === "family");
  const otherColors = artwork.colors.filter((c) => {
    const scope = normalizeScope(c.color_scope);
    return scope !== "dominant" && scope !== "family";
  });

  // The "family" rows are what this artwork's color palette should be shown
  // by — a clean set of named families with an exact proportion each (e.g.
  // White 61%, Gray 31%, Black 4%) — but they carry no hex of their own.
  // For a swatch color true to this specific piece, match each family to
  // this artwork's own "dominant" rows sharing that family name (the
  // measured colors behind it) and use the strongest one; only fall back to
  // a generic representative hex when this artwork has no dominant row in
  // that family at all.
  // artwork_colors.proportion is stored as either a 0–1 fraction or a 0–100
  // percentage depending on how a given import ran — but that can only be
  // told apart at the group level, never per value. A single family's
  // legitimate share can itself be under 1 on a 0–100-scale artwork (e.g.
  // Red at 0.77%, confirmed against raw DB rows for one artwork whose family
  // proportions summed to ~100 including that value) — so guessing per-value
  // misreads a real "0.77%" as "77%". Decide the scale once from every
  // family row's proportion together (they're shares of the same whole and
  // should sum to roughly 100, or roughly 1, as a group) and apply that one
  // decision to all of them.
  const familyProportionSum = familyColors.reduce((sum, c) => sum + (c.proportion ?? 0), 0);
  const familyIsFractionScale = familyProportionSum > 0 && familyProportionSum <= 1.5;

  const colorScaleSegments = familyColors
    .filter((c) => c.proportion !== null)
    .map((c) => {
      const matchingDominant = dominantColors
        .filter((d) => (d.color_family ?? "").trim().toLowerCase() === (c.color_family ?? "").trim().toLowerCase())
        .sort((a, b) => (b.proportion ?? 0) - (a.proportion ?? 0))[0];
      const rawProportion = c.proportion as number;
      return {
        family: c.color_family ?? c.color_name ?? "Color",
        proportion: familyIsFractionScale ? rawProportion * 100 : rawProportion,
        hex: matchingDominant?.hex ?? fallbackFamilyHex(c.color_family),
      };
    });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    image: artwork.feature_image_url ?? undefined,
    description: artwork.short_description ?? artwork.description ?? undefined,
    creator: artwork.artist_name
      ? { "@type": "Person", name: artwork.artist_name }
      : undefined,
    dateCreated: artwork.year ? String(artwork.year) : undefined,
    offers: artwork.price
      ? {
          "@type": "Offer",
          price: artwork.price,
          priceCurrency: "INR",
          availability: isInStock(artwork.in_stock)
            ? "https://schema.org/InStock"
            : "https://schema.org/SoldOut",
        }
      : undefined,
  };

  return (
    <div className="container-gallery py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        {/* Image, presented as if hanging on a gallery wall */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <FramedArtwork src={artwork.feature_image_url} alt={artwork.title} priority />
        </div>

        {/* Details */}
        <div>
          {artwork.part_of_collection === 1 && artwork.collection_name && (
            <p className="eyebrow mb-3">{artwork.collection_name}</p>
          )}
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {artwork.title}
          </h1>
          {artwork.artist_name && (
            <p className="mt-3 text-lg text-muted">
              by{" "}
              {artwork.artist_slug ? (
                <Link href={`/artists/${artwork.artist_slug}`} className="link-underline text-ink">
                  {artwork.artist_name}
                </Link>
              ) : (
                artwork.artist_name
              )}
            </p>
          )}

          <PriceTag price={artwork.price} inStock={artwork.in_stock} className="mt-6 text-lg" />

          {artwork.short_description && (
            <div className="mt-6">
              {isLongText(artwork.short_description) ? (
                <ReadMore id={`${artwork.artwork_id}-short-description`} size="sm">
                  <RichText text={artwork.short_description} className="text-lg" />
                </ReadMore>
              ) : (
                <RichText text={artwork.short_description} className="text-lg" />
              )}
            </div>
          )}

          <PurchaseEnquiry artworkTitle={artwork.title} artworkId={artwork.artwork_id} />

          {/* Key facts */}
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-line py-8">
            <Fact label="Category" value={artwork.category} />
            <Fact label="Subcategory" value={artwork.subcategory} />
            <Fact label="Year" value={artwork.year ? String(artwork.year) : null} />
            <Fact label="Dimensions" value={artwork.dimensions} />
            <Fact label="Place" value={artwork.place} />
            <Fact label="Certificate no." value={artwork.certificate_number} />
          </dl>

          {(colorScaleSegments.length > 0 || dominantColors.length > 0 || otherColors.length > 0) && (
            <div className="mt-8 space-y-6">
              {colorScaleSegments.length > 0 && (
                <div>
                  <p className="eyebrow mb-3">Color palette</p>
                  <ColorScaleBar segments={colorScaleSegments} />
                </div>
              )}

              {dominantColors.length > 0 && (
                <div>
                  <p className="eyebrow mb-3">Exact tones detected</p>
                  <div className="flex flex-wrap gap-4">
                    {dominantColors.map((c) => (
                      <ColorSwatch key={c.id} hex={c.hex} label={c.color_name} size="sm" />
                    ))}
                  </div>
                </div>
              )}

              {otherColors.length > 0 && (
                <div>
                  <p className="eyebrow mb-3">Colors</p>
                  <div className="flex flex-wrap gap-3">
                    {otherColors.map((c) => (
                      <ColorSwatch
                        key={c.id}
                        hex={c.hex}
                        label={c.color_name ?? c.color_family}
                        size="sm"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Long-form narrative fields */}
      <div className="mx-auto mt-20 grid max-w-3xl gap-12">
        <Narrative id={`${artwork.artwork_id}-description`} title="Description" text={artwork.description} />
        <Narrative id={`${artwork.artwork_id}-technique`} title="Technique" text={artwork.technique_highlight} />
        <Narrative id={`${artwork.artwork_id}-history`} title="Historical context" text={artwork.historical_context} />
        <Narrative id={`${artwork.artwork_id}-symbolism`} title="Symbolism" text={artwork.symbolism} />
        <Narrative id={`${artwork.artwork_id}-composition`} title="Composition analysis" text={artwork.composition_analysis} />
        <Narrative id={`${artwork.artwork_id}-culture`} title="Cultural significance" text={artwork.cultural_significance} />
      </div>

      {artwork.timestamp_create && (
        <p className="mx-auto mt-16 max-w-3xl text-xs text-muted">
          Catalogued {formatDate(artwork.timestamp_create)}
        </p>
      )}

      {moreByArtist.length > 0 && (
        <section className="mt-24">
          <SectionHeading
            eyebrow="From the same artist"
            title={`More by ${artwork.artist_name ?? "this artist"}`}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {moreByArtist.map((a) => (
              <ArtworkCard key={a.artwork_id} artwork={a} />
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-24">
          <SectionHeading eyebrow="Keep exploring" title="Related artworks" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-14 items-start sm:grid-cols-3 lg:grid-cols-4">
            {related.map((a) => (
              <ArtworkCard key={a.artwork_id} artwork={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="eyebrow text-[11px] text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

/** Some long-form fields come through as real HTML from the import
 *  pipeline, others as plain text — render each the right way instead of
 *  showing literal tags or losing paragraph breaks. */
function RichText({ text, className = "" }: { text: string; className?: string }) {
  if (looksLikeHtml(text)) {
    return (
      <div
        className={`richtext ${className}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(text) }}
      />
    );
  }
  return <p className={`whitespace-pre-line leading-relaxed text-muted ${className}`}>{text}</p>;
}

/** Text past this length (plain characters, tags stripped) gets clamped
 *  behind a "Read more" toggle instead of running the full length. */
const READ_MORE_THRESHOLD = 420;

function isLongText(text: string): boolean {
  const plain = looksLikeHtml(text) ? stripHtml(text) : text;
  return plain.trim().length > READ_MORE_THRESHOLD;
}

function Narrative({
  id,
  title,
  text,
}: {
  id: string;
  title: string;
  text: string | null | undefined;
}) {
  if (!text) return null;
  return (
    <div>
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-4">
        {isLongText(text) ? (
          <ReadMore id={id}>
            <RichText text={text} />
          </ReadMore>
        ) : (
          <RichText text={text} />
        )}
      </div>
    </div>
  );
}
