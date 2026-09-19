import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtworkById } from "@/lib/queries/artworks";
import { getArtistCollectionNames } from "@/lib/queries/artworkMutations";
import { updateArtworkAdminFieldsAction, updateArtworkAsAdminAction } from "@/app/admin/artworks/actions";
import { fallbackFamilyHex } from "@/lib/colorFamilies";
import SafeImage from "@/components/SafeImage";
import StatusPill from "@/components/StatusPill";
import PriceTag from "@/components/PriceTag";
import ColorSwatch from "@/components/ColorSwatch";
import ColorScaleBar from "@/components/ColorScaleBar";
import RichText from "@/components/RichText";
import ArtworkRowActions from "@/components/admin/ArtworkRowActions";
import ImpactfulToggle from "@/components/admin/ImpactfulToggle";
import FeatureRankInput from "@/components/admin/FeatureRankInput";
import ArtworkAdminFieldsForm from "@/components/admin/ArtworkAdminFieldsForm";
import ArtworkForm from "@/components/artist/ArtworkForm";

export const metadata = { title: "Review Artwork" };

// Same normalization as the public artwork detail page
// (app/artworks/[artwork_id]/page.tsx) -- a stray case/whitespace
// difference in imported color data shouldn't hide the palette here either.
function normalizeScope(scope: string | null | undefined): string {
  return (scope ?? "").trim().toLowerCase();
}

interface Props {
  params: Promise<{ artwork_id: string }>;
}

/**
 * Admin-only detail screen for one artwork -- reachable from
 * app/admin/artworks/page.tsx's list regardless of status (draft, pending,
 * approved, or rejected), unlike the public detail page. This is the one
 * deliberate `{ requireApproved: false }` caller of getArtworkById (see
 * that function's doc comment in lib/queries/artworks.ts) -- every fresh
 * submission is already 'approved' (live) by the time it lands here (see
 * app/artist/artworks/actions.ts), but the `false` still matters for
 * reaching any leftover legacy draft/pending/rejected row.
 *
 * No auth check of its own -- app/admin/layout.tsx already calls
 * requireAdmin() for every /admin/* route, matching every sibling admin
 * page.
 */
export default async function AdminArtworkDetailPage({ params }: Props) {
  const { artwork_id } = await params;
  const artwork = await getArtworkById(artwork_id, { requireApproved: false });
  if (!artwork) notFound();

  // For CollectionFields' reuse-or-create picker in the "edit artist's
  // submission" section below -- this artwork's OWN artist's existing
  // collections, not the signed-in admin's (admins have no artist_id of
  // their own).
  const existingCollections = artwork.artist_id
    ? await getArtistCollectionNames(artwork.artist_id)
    : [];

  // Identical color-scale derivation to the public artwork detail page --
  // see the extended comment there for why the fraction-vs-percentage scale
  // has to be decided from the whole set of family rows together.
  const dominantColors = artwork.colors.filter((c) => normalizeScope(c.color_scope) === "dominant");
  const familyColors = artwork.colors.filter((c) => normalizeScope(c.color_scope) === "family");

  const familyProportionSum = familyColors.reduce((sum, c) => sum + (c.proportion ?? 0), 0);
  const familyIsFractionScale = familyProportionSum > 0 && familyProportionSum <= 1.5;

  const colorScaleSegments = familyColors
    .filter((c) => c.proportion !== null)
    .map((c) => {
      const matchingDominant = dominantColors
        .filter(
          (d) => (d.color_family ?? "").trim().toLowerCase() === (c.color_family ?? "").trim().toLowerCase()
        )
        .sort((a, b) => (b.proportion ?? 0) - (a.proportion ?? 0))[0];
      const rawProportion = c.proportion as number;
      return {
        family: c.color_family ?? c.color_name ?? "Color",
        proportion: familyIsFractionScale ? rawProportion * 100 : rawProportion,
        hex: matchingDominant?.hex ?? fallbackFamilyHex(c.color_family),
      };
    });

  const boundUpdateAdminFields = updateArtworkAdminFieldsAction.bind(null, artwork.artwork_id);
  const boundUpdateCoreFields = updateArtworkAsAdminAction.bind(null, artwork.artwork_id);

  return (
    <div>
      <Link href="/admin/artworks" className="eyebrow link-underline">
        ← Back to artworks
      </Link>

      <div className="mt-4 grid gap-10 md:grid-cols-2 lg:grid-cols-[1fr_1.2fr]">
        {/* Image + at-a-glance facts */}
        <div className="space-y-6">
          <div className="relative aspect-square w-full overflow-hidden border border-line bg-white">
            {artwork.feature_image_url ? (
              <SafeImage
                src={artwork.feature_image_url}
                alt={artwork.title}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-contain"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={artwork.status ?? "draft"} />
            <ImpactfulToggle artworkId={artwork.artwork_id} initialValue={Boolean(artwork.impactful)} />
            <FeatureRankInput artworkId={artwork.artwork_id} initialValue={artwork.feature_rank} />
          </div>

          <div className="border-t border-line pt-4">
            <ArtworkRowActions artworkId={artwork.artwork_id} />
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6">
            <Fact label="Artist" value={artwork.artist_name} />
            <Fact label="Category" value={artwork.category} />
            <Fact label="Subcategory" value={artwork.subcategory} />
            <Fact label="Year" value={artwork.year ? String(artwork.year) : null} />
            <Fact label="Dimensions" value={artwork.dimensions} />
            <Fact label="Place" value={artwork.place} />
            <Fact
              label="Submitted"
              value={artwork.submitted_at ? new Date(artwork.submitted_at).toLocaleDateString() : null}
            />
            <Fact
              label="Reviewed"
              value={artwork.reviewed_at ? new Date(artwork.reviewed_at).toLocaleDateString() : null}
            />
          </dl>

          <PriceTag price={artwork.price} inStock={artwork.in_stock} />

          {(colorScaleSegments.length > 0 || dominantColors.length > 0) && (
            <div className="space-y-6 border-t border-line pt-6">
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
            </div>
          )}
        </div>

        {/* Title, descriptions, admin-only listing fields */}
        <div className="space-y-8">
          <div>
            <h2 className="font-display text-3xl leading-tight">{artwork.title}</h2>
            {artwork.short_description && (
              <div className="mt-3">
                <RichText text={artwork.short_description} />
              </div>
            )}
          </div>

          <Narrative title="Description" text={artwork.description} />
          {/* Technique highlight / historical context / symbolism /
              composition analysis / cultural significance used to also be
              read-only Narrative blocks right here -- removed since
              ArtworkAdminFieldsForm below already shows and edits every one
              of those same columns. Two read paths for the same field is
              clutter at best and confusing (which one is "current"?) at
              worst. */}

          <details className="details-section group">
            <summary>
              <span>Edit artist&apos;s submission</span>
              <span
                aria-hidden
                className="text-lg leading-none text-muted transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="details-section-body">
              <p className="font-sans text-xs text-muted">
                Correct anything written unclearly — title, category, price, dimensions,
                description, even the photo itself. Saves immediately and stays live on
                Aartverse.com throughout.
              </p>
              <ArtworkForm
                action={boundUpdateCoreFields}
                artwork={artwork}
                submitLabel="Save corrections"
                showStorySection={false}
                existingCollections={existingCollections}
              />
            </div>
          </details>

          <ArtworkAdminFieldsForm artwork={artwork} action={boundUpdateAdminFields} />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="eyebrow text-[11px] text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Narrative({ title, text }: { title: string; text: string | null | undefined }) {
  if (!text) return null;
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <RichText text={text} />
    </div>
  );
}
