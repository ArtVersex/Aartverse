/**
 * Hostnames next/image is allowed to optimize — must stay in sync with
 * next.config.mjs's images.remotePatterns. Any image URL whose host isn't
 * listed here is rendered with a plain <img> tag instead (see
 * components/SafeImage.tsx) rather than letting next/image throw a hard
 * runtime error for the whole page.
 *
 * Why this exists: feature_image_url / profile_image_url / cover_image_url
 * / category.image_url all come straight from the database, which we don't
 * control the contents of. A row importer that used a stock/placeholder
 * photo (e.g. an images.unsplash.com URL for a fallback artist record)
 * would otherwise crash every page that renders it. This keeps the site
 * working for any host, optimized or not, and scales to new data without
 * code changes for the common case (add the new host below + in
 * next.config.mjs when you want it optimized).
 */
const OPTIMIZABLE_HOSTS = new Set([
  "springgreen-antelope-607895.hostingersite.com",
  "images.unsplash.com",
]);

export function isOptimizableImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  // A root-relative path is one of our own bundled /public assets (e.g. the
  // logo mark, category icons) — next/image can always optimize those with
  // no remotePatterns entry needed, since that config only governs remote
  // http(s) hosts.
  if (src.startsWith("/")) return true;
  try {
    const { hostname, protocol } = new URL(src);
    return protocol === "https:" && OPTIMIZABLE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}
