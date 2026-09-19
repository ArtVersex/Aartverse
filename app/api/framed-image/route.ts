import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { isOptimizableImageSrc } from "@/lib/images";

export const runtime = "nodejs";

/**
 * Fetches an artwork photo and trims the uniform-colored margin that
 * scanned/photographed 2D art often has around the actual drawing (a
 * gray or white backdrop with extra headroom from the photography setup),
 * so the "wall frame" on the artwork detail page hugs the artwork itself
 * rather than the photographer's backdrop.
 *
 * Used only by components/FramedArtwork.tsx's single hero image per
 * artwork page — not by the optimized next/image thumbnails used
 * elsewhere (ArtworkCard, etc.), where the extra per-request work isn't
 * worth it for a whole grid of images.
 *
 * Security: this must never become an open image proxy for arbitrary
 * URLs. It only ever fetches from hosts already allow-listed for artwork
 * images in lib/images.ts (the same list next.config.mjs's
 * remotePatterns uses) — any other host is rejected outright.
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");

  if (!src || !isOptimizableImageSrc(src)) {
    return NextResponse.json(
      { error: "Missing or unlisted 'src' image host." },
      { status: 400 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(src, {
      // Artwork photos don't change shape once published — cache the
      // upstream fetch aggressively.
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach image host." }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream image fetch failed." }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/webp";
  const inputBuffer = Buffer.from(await upstream.arrayBuffer());

  try {
    // trim() removes pixels from every edge that closely match the
    // top-left corner's color — exactly the uniform photo-backdrop
    // margin we want gone. threshold is a little looser than sharp's
    // default (10) to tolerate the light compression noise webp/jpeg
    // photos of a "flat" background usually have.
    const trimmed = await sharp(inputBuffer).trim({ threshold: 20 }).toBuffer();
    return new NextResponse(new Uint8Array(trimmed), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // If trimming fails for any reason (an unsupported format, an image
    // with no uniform border to find, etc.) serve the original,
    // untouched image rather than breaking the page.
    return new NextResponse(new Uint8Array(inputBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
}
