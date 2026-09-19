import { looksLikeHtml, sanitizeRichText, stripHtml } from "@/lib/utils";

/** Text past this length (plain characters, tags stripped) gets clamped
 *  behind a "Read more" toggle instead of running the full length. Shared
 *  by every place that renders a long-form field an artist or admin wrote
 *  through components/RichTextEditor.tsx (or, for older data, plain text
 *  typed before that editor existed). */
export const RICH_TEXT_READ_MORE_THRESHOLD = 420;

export function isLongRichText(text: string): boolean {
  const plain = looksLikeHtml(text) ? stripHtml(text) : text;
  return plain.trim().length > RICH_TEXT_READ_MORE_THRESHOLD;
}

/**
 * Some long-form fields (artwork descriptions/curatorial write-ups, an
 * artist statement) may be plain text typed before rich text existed, or
 * real HTML — either from components/RichTextEditor.tsx or from the
 * original import pipeline. Render each the right way instead of showing
 * literal tags or losing paragraph breaks. Originally a page-local
 * function on the artwork detail page; pulled out here once the artist
 * detail page needed the exact same handling for artist_statement.
 */
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
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
