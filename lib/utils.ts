import type { ColorAnalysis, SocialLink } from "@/lib/types";

/** Strips the cache-busting "?v=..." query param lib/uploads.ts#saveImage
 *  appends to every managed image URL, returning the bare path underneath.
 *  Profile/cover/artwork photos all use a STABLE path that's overwritten
 *  in place on every re-upload (see saveImage's doc comment), so without
 *  this, comparing a "before" and "after" URL to decide whether to clean
 *  up an old file would see a difference on every single re-upload (the
 *  version always changed) even though it's really the same file -- which
 *  would fire a delete against the very file that was just uploaded a
 *  moment earlier. */
export function stripImageVersion(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  const i = url.indexOf("?");
  return i === -1 ? url : url.slice(0, i);
}

/** Format a price stored in the `artworks.price` column for display.
 *  Prices in this database are in Indian Rupees. */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

/** tinyint(1) columns come back as 0/1/null — normalize to a real boolean. */
export function toBool(value: number | null | undefined): boolean {
  return value === 1;
}

export function isInStock(value: number | null | undefined): boolean {
  return toBool(value);
}

/** Safely parse the `color_analysis` JSON text column. */
export function parseColorAnalysis(raw: string | null): ColorAnalysis | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ColorAnalysis;
    return null;
  } catch {
    return null;
  }
}

/** Trim a long description down for card/preview contexts. */
export function truncate(text: string | null | undefined, max = 140): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Splits a "list of short strings" column into clean, trimmed values.
 *  Two real storage shapes exist across this schema and this handles both:
 *    - artworks.subcategory is genuinely plain comma-separated text
 *      (e.g. "Abstract, Portrait").
 *    - artists.mediums is `longtext` with a `CHECK (json_valid(mediums))`
 *      constraint (see AUTH_SETUP.md) — it's stored as a JSON array string
 *      (e.g. '["Oil Painting","Watercolor"]'), not plain comma text, so a
 *      naive comma-split would mangle it (splitting inside the JSON
 *      syntax). A value that looks like a JSON array is parsed as one;
 *      anything else falls back to comma-splitting. Defensive either way
 *      (a column that's usually a string can come back as something else —
 *      empty, a number, already an array) — never throws. */
export function parseCommaList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        // Not actually valid JSON despite the leading "[" -- fall through
        // to plain comma-splitting below rather than throwing.
      }
    }
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

/** Encodes a list of short strings back into the JSON-array-string shape
 *  `artists.mediums` requires (see parseCommaList above and the
 *  `CHECK (json_valid(mediums))` constraint on that column). Returns null
 *  for an empty list, matching how every other clearable profile field is
 *  stored as NULL rather than an empty value. */
export function encodeJsonList(values: string[]): string | null {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

/** Safely parse the `artists.social_links` column -- a JSON array of
 *  {label, url} objects (see SocialLink in lib/types.ts), same "plain
 *  LONGTEXT, app-layer validation" convention as `mediums`/`phone`/
 *  `whatsapp` (see scripts/migrate.mjs's doc comment on
 *  extendArtistsTableProfessional for why there's no DB-level CHECK
 *  constraint). Never throws; anything that isn't cleanly an array of
 *  {label, url} objects comes back as []. */
export function parseSocialLinks(raw: string | null | undefined): SocialLink[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === "object")
      .map((v) => ({
        label: typeof v.label === "string" ? v.label.trim() : "",
        url: typeof v.url === "string" ? v.url.trim() : "",
      }))
      .filter((v) => v.label !== "" && v.url !== "");
  } catch {
    return [];
  }
}

/** Encodes a list of {label, url} pairs back into `artists.social_links`'s
 *  JSON-string shape (see parseSocialLinks above). Returns null for an
 *  empty list, matching how every other clearable profile field is stored
 *  as NULL rather than an empty value. */
export function encodeSocialLinks(links: SocialLink[]): string | null {
  const cleaned = links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label !== "" && l.url !== "");
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

/** Basic slugify, used only as a fallback when a table has no slug column. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Format a DATE/DATETIME string column for display, without a time-of-day. */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** Clamp + parse a page-number query param, defaulting to 1. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

/** Read a single string value out of a Next.js searchParams object. */
export function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Read every value of a possibly-repeated query param (e.g. several
 *  checkboxes sharing one `name`) as a plain array — Next.js gives a bare
 *  string when only one was present, an array when several were. */
export function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Convert a resolved Next.js searchParams object into a URLSearchParams,
 *  used to build "keep the current filters, only change X" links. Keeps
 *  every value of a repeated param (e.g. several selected colors), not
 *  just the first. */
export function toURLSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const v of toArray(value)) {
      if (v) params.append(key, v);
    }
  }
  return params;
}

/** Normalize a hex color value from artwork_colors — some rows may store it
 *  without a leading "#". Returns null for anything that isn't recognizably
 *  a hex color, so callers can skip rendering a swatch instead of showing a
 *  broken color. */
export function normalizeHex(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const trimmed = hex.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash) ? withHash : null;
}

/** Format a color proportion for display. The value passed in must already
 *  be normalized to a 0–100 percentage by the caller — artwork_colors.
 *  proportion is stored as either a 0–1 fraction or a 0–100 percentage
 *  depending on how a given import ran, and a single value can't reveal
 *  which: a legitimate percentage-scale share can itself be under 1 (e.g.
 *  0.77%), which a per-value "is it <= 1?" guess would misread as a 0–1
 *  fraction and blow up into "77%". That decision can only be made once,
 *  from the whole group of proportions the value came from (see the
 *  colorScaleSegments normalization on the artwork detail page and the
 *  color_match_proportion SQL in lib/queries/artworks.ts) — this function
 *  intentionally does no scale guessing of its own. */
export function formatColorProportion(
  proportion: number | null | undefined
): string | null {
  if (proportion === null || proportion === undefined || Number.isNaN(proportion)) {
    return null;
  }
  return `${Math.round(proportion)}%`;
}

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*?>/i;

/** Heuristic: does this text field contain actual markup, or is it plain
 *  text? Some long-form artwork fields (description in particular) can
 *  come through as HTML from the import pipeline, others as plain text —
 *  render each appropriately instead of showing literal tags. */
export function looksLikeHtml(text: string): boolean {
  return HTML_TAG_PATTERN.test(text);
}

/** Build a "#rrggbb" hex string from RGB components — used to compute a
 *  representative swatch for a color family from averaged rgb_r/g/b rather
 *  than trusting the formatting of any single stored hex value. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Strip markup down to plain text — used for <meta description> and other
 *  contexts that must never contain literal HTML tags. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A minimal, dependency-free sanitizer for the small amount of trusted
 * rich-text we store (artwork descriptions from our own import pipeline,
 * not arbitrary user input at request time). It strips script/style/iframe
 * blocks, inline event handlers, and javascript: URLs before the markup is
 * ever handed to dangerouslySetInnerHTML, as defense-in-depth rather than a
 * full HTML parser.
 */
export function sanitizeRichText(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, '$1="#"');
}
