"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ProfileDraft, SectionKey } from "@/lib/pdf/profileDraft";
import ArtistProfileDocument, { type PdfArtwork } from "./ArtistProfileDocument";

/**
 * @react-pdf/renderer's <PDFViewer>/<PDFDownloadLink> both need a real
 * browser (they build/read Blob URLs and, for the viewer, render an
 * <iframe>), so they're loaded with next/dynamic + ssr:false -- the
 * standard way to use a browser-only library in the Next.js App Router.
 * This also keeps the (fairly large) react-pdf bundle out of every other
 * page's load, since only an artist who actually opens this builder needs
 * it at all.
 */
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <PreviewPlaceholder label="Loading preview…" />,
});
const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink), {
  ssr: false,
});

function PreviewPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[520px] items-center justify-center border border-line bg-white font-sans text-sm text-muted sm:h-[640px]">
      {label}
    </div>
  );
}

/**
 * Fetches and converts a list of image URLs to PNG data URIs, once each,
 * via /api/pdf-image -- see that route's doc comment for why this has to
 * happen server-side rather than through a browser <canvas>. Null/blank
 * URLs are skipped; a URL that fails to convert is simply left out of the
 * result map, so the PDF renders that one image slot empty rather than
 * failing the whole document.
 */
function useConvertedImages(urls: Array<string | null | undefined>): {
  dataUriByUrl: Record<string, string>;
  loading: boolean;
} {
  const dedupedKey = Array.from(new Set(urls.filter(Boolean))).join("|");
  const uniqueUrls = useMemo(
    () => (dedupedKey ? dedupedKey.split("|") : []),
    [dedupedKey]
  );

  const [map, setMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(uniqueUrls.length > 0);

  useEffect(() => {
    if (uniqueUrls.length === 0) {
      setMap({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all(
      uniqueUrls.map(async (url) => {
        try {
          const res = await fetch(`/api/pdf-image?url=${encodeURIComponent(url)}`);
          if (!res.ok) return [url, null] as const;
          const blob = await res.blob();
          const dataUri = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
          return [url, dataUri] as const;
        } catch {
          return [url, null] as const;
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const [url, dataUri] of entries) {
        if (dataUri) next[url] = dataUri;
      }
      setMap(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [uniqueUrls]);

  return { dataUriByUrl: map, loading };
}

export interface PdfArtworkSource {
  title: string;
  year: number | null;
  category: string | null;
  dimensions: string | null;
  collectionName: string | null;
  imageUrl: string | null;
}

/**
 * The Preview + Download step of the Artist Profile builder. Everything
 * about WHAT goes into the document (content, section toggles, artwork
 * selection) is decided by the parent (ArtistProfileBuilder.tsx, a plain
 * client component with no react-pdf dependency of its own) and handed in
 * as props; this component's only job is turning that into an actual
 * rendered PDF -- converting images, then showing a live <PDFViewer> and a
 * real <PDFDownloadLink>.
 */
export default function PdfPreviewAndDownload({
  draft,
  includedSections,
  selectedArtworks,
  profileImageUrl,
  onDownloadClick,
}: {
  draft: ProfileDraft;
  includedSections: Record<SectionKey, boolean>;
  selectedArtworks: PdfArtworkSource[];
  profileImageUrl: string | null;
  /** Fired when the artist clicks the download link, right as the download
   *  starts -- used by the parent to also fire the optional "save to my
   *  Artist Profile" action in the same click, without gating or delaying
   *  the download itself on that save's outcome. */
  onDownloadClick?: () => void;
}) {
  const { dataUriByUrl, loading } = useConvertedImages([
    profileImageUrl,
    ...selectedArtworks.map((a) => a.imageUrl),
  ]);

  const photoDataUri = profileImageUrl ? dataUriByUrl[profileImageUrl] ?? null : null;
  const pdfArtworks: PdfArtwork[] = selectedArtworks.map((a) => ({
    title: a.title,
    year: a.year,
    category: a.category,
    dimensions: a.dimensions,
    collectionName: a.collectionName,
    imageDataUri: a.imageUrl ? dataUriByUrl[a.imageUrl] ?? null : null,
  }));

  const fileNameBase =
    draft.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "artist-profile";

  const documentElement = (
    <ArtistProfileDocument
      draft={draft}
      includedSections={includedSections}
      artworks={pdfArtworks}
      photoDataUri={photoDataUri}
    />
  );

  if (loading) {
    return <PreviewPlaceholder label="Preparing images…" />;
  }

  return (
    <div className="space-y-4">
      <div className="border border-line bg-white">
        <PDFViewer width="100%" height={600} showToolbar={false} style={{ border: "none" }}>
          {documentElement}
        </PDFViewer>
      </div>

      <PDFDownloadLink
        document={documentElement}
        fileName={`${fileNameBase}-artist-profile.pdf`}
        className="btn-primary inline-flex w-full justify-center sm:w-auto"
        onClick={onDownloadClick}
      >
        {({ loading: pdfLoading }: { loading: boolean }) =>
          pdfLoading ? "Preparing PDF…" : "Download PDF"
        }
      </PDFDownloadLink>
    </div>
  );
}
