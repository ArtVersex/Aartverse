import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getSessionUser } from "@/lib/auth/session";
import { isManagedRemoteImageUrl } from "@/lib/remoteImageHost";

export const runtime = "nodejs";

/**
 * Fetches one of this app's own managed images (an artwork's feature image,
 * or an artist's profile/cover photo -- always stored as WebP, see
 * lib/uploads.ts) and re-encodes it to PNG, server-side, for the Artist
 * Profile PDF builder (components/artist/pdf/PdfPreviewAndDownload.tsx).
 *
 * Two problems this sidesteps by doing the conversion here instead of in
 * the browser:
 *   1. @react-pdf/renderer's WebP support has historically been
 *      unreliable, so every image handed to it should be PNG/JPEG instead.
 *   2. This app's images can be served from a completely different domain
 *      than the app itself (see lib/remoteImageHost.ts's FTP-hosted remote
 *      image host) -- converting via a browser <canvas> would risk a
 *      cross-origin "tainted canvas" failure there, since that remote host
 *      sends no CORS headers. Converting here, with the same `sharp`
 *      library already used for every other image transform in this app,
 *      avoids that entirely: there's no CORS restriction on an outbound
 *      fetch from the server, and the bytes hand back to the browser are
 *      always same-origin PNG.
 *
 * Deliberately narrow about what it will fetch -- either this app's own
 * local /uploads/... path or a URL on the configured remote image host,
 * never an arbitrary URL -- so this can never become an open image-fetching
 * proxy. Requires an artist session, matching every other route this
 * builder feature touches.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "artist") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  try {
    let bytes: Buffer;

    if (url.startsWith("/uploads/")) {
      if (url.includes("..")) {
        return NextResponse.json({ error: "Invalid image path." }, { status: 400 });
      }
      // Same join this app's own deleteManagedImage (lib/uploads.ts) uses
      // for this exact local-URL shape.
      const filePath = path.join(process.cwd(), "public", url);
      bytes = await fs.readFile(filePath);
    } else if (isManagedRemoteImageUrl(url)) {
      const upstream = await fetch(url);
      if (!upstream.ok) {
        return NextResponse.json({ error: "Image not found." }, { status: 404 });
      }
      bytes = Buffer.from(await upstream.arrayBuffer());
    } else {
      return NextResponse.json({ error: "Image is not managed by this app." }, { status: 400 });
    }

    const png = await sharp(bytes).png().toBuffer();
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Private: this is proxied through an authenticated route, and
        // shouldn't be cached by any shared/intermediate cache.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error(
      `[api/pdf-image] failed to convert "${url}":`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Failed to load image." }, { status: 500 });
  }
}
