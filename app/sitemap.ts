import type { MetadataRoute } from "next";
import { getAllArtworkIdsForSitemap } from "@/lib/queries/artworks";
import { getAllArtists } from "@/lib/queries/artists";

export const revalidate = 3600;

/** MariaDB DATETIME strings ("YYYY-MM-DD HH:MM:SS") aren't valid W3C
 *  datetimes on their own — normalize to ISO 8601 for <lastmod>. */
function toIsoOrUndefined(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://aartverse.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/artworks`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/artists`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/categories`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/week-best`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/search`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const [artworks, artists] = await Promise.all([
    getAllArtworkIdsForSitemap(),
    getAllArtists(),
  ]);

  const artworkRoutes: MetadataRoute.Sitemap = artworks.map((a) => ({
    url: `${base}/artworks/${encodeURIComponent(a.artwork_id)}`,
    lastModified: toIsoOrUndefined(a.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const artistRoutes: MetadataRoute.Sitemap = artists.map((a) => ({
    url: `${base}/artists/${a.slug}`,
    lastModified: toIsoOrUndefined(a.updated_at),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...artworkRoutes, ...artistRoutes];
}
