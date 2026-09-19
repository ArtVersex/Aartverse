import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/validation/auth";
import { analyzeImageColors, validateColorAnalysis, type ColorAnalysisResult } from "@/lib/color-analysis";
import {
  getRemoteHostConfig,
  uploadImageOverFtp,
  deleteImageOverFtp,
  isManagedRemoteImageUrl,
  relativePathFromManagedUrl,
} from "@/lib/remoteImageHost";

export class UploadValidationError extends Error {}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9-]/g, "");
}

interface SavedImage {
  url: string;
  bytes: Buffer;
}

/**
 * Saves an uploaded image at a STABLE path derived from `relativePath`
 * (no random filename component) so that re-uploading for the same
 * entity — an artwork's feature image, an artist's profile/cover photo —
 * overwrites the same file in place instead of accumulating a new one on
 * every edit.
 *
 * Every upload is re-encoded to WebP via Sharp regardless of the input
 * format, both to normalize storage and keep files small.
 *
 * When IMAGE_FTP_* env vars are configured (see lib/remoteImageHost.ts),
 * the file is pushed over FTP to the same host that serves the site's
 * existing catalogue images, so newly uploaded images are hosted and
 * viewable the same way. Otherwise this falls back to this app's own
 * local disk under public/uploads/ (fine for a persistent Node host, not
 * for a serverless/ephemeral filesystem).
 */
async function saveImage(file: File, relativePath: string): Promise<SavedImage> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError("Please upload a JPG, PNG, or WEBP image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError("Image is too large (max 8MB).");
  }

  const inputBytes = Buffer.from(await file.arrayBuffer());
  let bytes: Buffer;
  try {
    // .toColorspace("srgb") BEFORE .webp() is deliberate, not decorative:
    // some real-world uploads (most often phone-camera JPEGs carrying a
    // wide-gamut ICC profile, or scanner/editor exports with an unusual
    // embedded profile) tag their pixel data with a colour interpretation
    // that this build of libvips can't resolve to a valid enum member.
    // Left unresolved, that ambiguity surfaces later — at WebP-encode
    // time — as `Error: colourspace: parameter space not set` (visible
    // server-side as a "GLib-GObject-CRITICAL ... VipsInterpretation"
    // warning immediately before it), which used to bubble up here as
    // "That image could not be processed" and reject an otherwise-fine
    // photo. Forcing a known-good working colourspace right after
    // decoding makes sharp resolve the conversion itself, deterministically,
    // instead of deferring an invalid/ambiguous value into the encoder.
    // A no-op for already-sRGB images (the common case), so this is safe
    // for every input, not just the problematic ones.
    bytes = await sharp(inputBytes).rotate().toColorspace("srgb").webp({ quality: 82 }).toBuffer();
  } catch (err) {
    throw new UploadValidationError(
      `That image could not be processed: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }

  const finalPath = `${relativePath}.webp`;
  const remoteConfig = getRemoteHostConfig();

  // A cache-busting query param -- NOT a new path; the underlying file is
  // still overwritten in place, per this function's stable-path design
  // above. Without something in the URL changing on every re-upload,
  // browsers, any CDN in front of the image host, and Next.js's own image
  // optimizer all cache purely by URL, so they keep serving the previous
  // upload's bytes indefinitely even though the file on disk/FTP was
  // replaced -- a replaced profile/cover/artwork photo would appear to
  // silently "not take". See lib/utils.ts#stripImageVersion, used by every
  // caller that compares a before/after URL for this same reason.
  const version = Date.now();

  if (remoteConfig) {
    await uploadImageOverFtp(bytes, finalPath);
    return { url: `${remoteConfig.publicBaseUrl}/${finalPath}?v=${version}`, bytes };
  }

  const dir = path.join(process.cwd(), "public", "uploads", path.dirname(finalPath));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "uploads", finalPath), bytes);
  return { url: `/uploads/${finalPath}?v=${version}`, bytes };
}

export interface SavedArtworkImage {
  url: string;
  /** Null when analysis failed or produced nothing usable — a failed
   *  analysis must never block the artwork upload itself, so callers
   *  should treat this as "no color data yet" rather than an error. */
  colorAnalysis: ColorAnalysisResult | null;
}

/**
 * Saves an artwork's feature image under a stable, artwork-scoped path
 * (artworks/<artworkId>.webp) and automatically runs server-side color
 * analysis on it (see lib/color-analysis.ts) — the artist never enters
 * colors manually. Analysis failures are swallowed and logged server-side
 * only: a broken/unusual image must still be allowed to upload.
 *
 * Callers must have an `artworkId` before calling this (generate it with
 * randomUUID() up front for a new artwork — see createArtworkAction).
 */
export async function saveArtworkImage(
  file: File,
  artworkId: string
): Promise<SavedArtworkImage> {
  const { url, bytes } = await saveImage(file, `artworks/${sanitizeSegment(artworkId)}`);

  let colorAnalysis: ColorAnalysisResult | null = null;
  try {
    const analyzed = await analyzeImageColors(bytes);
    colorAnalysis = validateColorAnalysis(analyzed);
    if (!colorAnalysis) {
      console.error(
        `[color-analysis] analyzeImageColors() returned a shape that failed validation for artwork ${artworkId}; storing no color analysis for this upload.`
      );
    }
  } catch (err) {
    // Never let a color-analysis failure block the artwork upload, and
    // never surface internals (stack traces, file paths) beyond the log.
    console.error(
      `[color-analysis] analyzeImageColors() threw for artwork ${artworkId}:`,
      err instanceof Error ? err.message : err
    );
  }

  return { url, colorAnalysis };
}

/** Saves an artist's profile or cover photo under a stable, artist-scoped
 *  path (artists/<artistId>/profile.webp or .../cover.webp). */
export async function saveArtistProfileImage(
  file: File,
  artistId: string,
  kind: "profile" | "cover"
): Promise<string> {
  const { url } = await saveImage(file, `artists/${sanitizeSegment(artistId)}/${kind}`);
  return url;
}

/**
 * Deletes a previously-uploaded image, given the URL that was stored for
 * it in the database. Callers use this to clean up an OLD file when it's
 * no longer referenced — most notably when an artwork is deleted outright
 * (a stable-path replace already overwrote the old file in place, so this
 * is mostly a no-op for the replace case, but it's what removes the file
 * for good when the owning row goes away).
 *
 * Deliberately a no-op for any URL that isn't one of OUR own managed
 * paths — either local `/uploads/...` or, once FTP hosting is configured,
 * `<IMAGE_PUBLIC_BASE_URL>/...`. The database also holds legacy/imported
 * catalogue image URLs on the same host; this must never be able to touch
 * those. Also a no-op (logged, never thrown) for a file that's already
 * gone — deletion here is best-effort cleanup, never something a mutation
 * should fail over.
 */
export async function deleteManagedImage(url: string | null | undefined): Promise<void> {
  if (!url) return;

  if (isManagedRemoteImageUrl(url)) {
    await deleteImageOverFtp(relativePathFromManagedUrl(url));
    return;
  }

  if (!url.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", url);
  try {
    await unlink(filePath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.error(
        `[uploads] failed to delete replaced image at ${url}:`,
        err instanceof Error ? err.message : err
      )
    }
  }
}
