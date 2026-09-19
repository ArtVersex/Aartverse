// Deliberately NOT importing "server-only" here (unlike the rest of this
// codebase's server-side modules): this module must also run standalone
// under plain Node for tests/scripts/reprocess-colors.mjs (see the note
// below), and "server-only" unconditionally throws outside a bundler's
// "react-server" resolution condition — it would break every test run
// and the reprocessing script, not just guard against client bundling.
// That guard is redundant here anyway: sharp is a native Node module that
// cannot be bundled into a browser build in the first place.
import sharp from "sharp";
import { z } from "zod";

/**
 * Server-side artwork color analysis — a full Node.js/Sharp replacement
 * for the previous Python-based pipeline. No Python process, script, or
 * external API is involved anywhere in this module.
 *
 * No repository copy of the old Python implementation was found anywhere
 * in this project (searched for *.py, requirements.txt, pyproject.toml —
 * see AUTH_SETUP.md-adjacent notes / the accompanying chat message for
 * what was checked), so this is a fresh, deterministic implementation
 * built to the requested output shape rather than a port.
 *
 * NOTE ON DEPENDENCIES: this file intentionally uses only relative/
 * package imports (no "@/..." path alias) so it can run standalone under
 * plain Node (see tests/color-analysis.test.mjs), not just inside Next.js.
 */

export const COLOR_FAMILIES = [
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Cyan",
  "Blue",
  "Purple",
  "Pink",
  "Brown",
  "Beige",
  "Gray",
  "Black",
  "White",
  "Other",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export interface DominantColor {
  rank: number;
  name: string;
  family: ColorFamily;
  /** Uppercase "#RRGGBB". */
  hex: string;
  rgb: [number, number, number];
  /** Percentage (0-100) of analyzed, weighted pixels this cluster covers. */
  proportion: number;
}

export interface ColorAnalysisResult {
  dominantColors: DominantColor[];
  colorFamilies: Partial<Record<ColorFamily, number>>;
}

// --- tunables -------------------------------------------------------------

/** Longest side, in px, the image is shrunk to before analysis. Small
 *  enough to keep a multi-megapixel upload fast to process, large enough
 *  to preserve the color distribution that matters. */
const ANALYSIS_SIZE = 150;

/** Alpha below this (out of 255) is treated as fully transparent and
 *  ignored outright — see the transparency note below. */
const ALPHA_IGNORE_THRESHOLD = 16;

/** Uniform-quantization bucket width per RGB channel (0-255). Pixels are
 *  first binned at this resolution — a cheap, deterministic first pass —
 *  then visually-similar buckets are merged (see MERGE_DISTANCE) to undo
 *  the fragmentation binning alone would cause from anti-aliasing/JPEG
 *  noise around otherwise-solid colors. */
const BUCKET_SIZE = 16;

/** Two color clusters closer than this Euclidean RGB distance are merged
 *  into one during the agglomerative merge pass. */
const MERGE_DISTANCE = 28;

const TOP_N = 5;

// --- transparency handling --------------------------------------------------
//
// DECISION (documented per the spec's request):
//   - Fully transparent pixels (alpha < ALPHA_IGNORE_THRESHOLD) are ignored
//     completely — they contribute no weight to any cluster or total.
//   - Partially transparent pixels are NOT composited onto an assumed
//     background color (that would inject an arbitrary hue — e.g. white —
//     into the analysis of a piece that may never be shown on a white
//     background). Instead each partially-transparent pixel contributes
//     its own RGB color to its cluster, weighted by (alpha / 255). A pixel
//     that is 50% transparent counts as "half a pixel" of its own color,
//     rather than being blended toward some other color it was never
//     actually painted.

interface RawCluster {
  weight: number;
  r: number;
  g: number;
  b: number;
}

/**
 * Analyzes an already-loaded image buffer and returns its dominant colors
 * and color-family breakdown. Deterministic: the same bytes always
 * produce the same result (no randomness anywhere in the pipeline).
 */
export async function analyzeImageColors(
  imageBuffer: Buffer
): Promise<ColorAnalysisResult> {
  const { data, info } = await sharp(imageBuffer)
    .rotate() // normalize EXIF orientation before we start counting pixels
    // Force a known-good working colourspace before anything else touches
    // pixel data. Most callers already hand this function WebP bytes that
    // lib/uploads.ts's saveImage() already normalized this way, but
    // scripts/reprocess-colors.mjs can call this directly on arbitrary
    // re-fetched catalogue images, and an unresolvable embedded colour
    // interpretation (see the matching comment in lib/uploads.ts) would
    // otherwise throw here too — this function is documented to never
    // throw on a merely-unusual image, so it needs the same guard.
    .toColorspace("srgb")
    .resize(ANALYSIS_SIZE, ANALYSIS_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const pixelCount = info.width * info.height;

  const buckets = new Map<
    string,
    { weight: number; rSum: number; gSum: number; bSum: number }
  >();
  let totalWeight = 0;

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = channels >= 4 ? data[offset + 3] : 255;

    if (a < ALPHA_IGNORE_THRESHOLD) continue;

    const weight = a / 255;
    const key = `${r >> 4}_${g >> 4}_${b >> 4}`; // >> 4 === floor(x / 16)

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { weight: 0, rSum: 0, gSum: 0, bSum: 0 };
      buckets.set(key, bucket);
    }
    bucket.weight += weight;
    bucket.rSum += r * weight;
    bucket.gSum += g * weight;
    bucket.bSum += b * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0 || buckets.size === 0) {
    // e.g. a fully transparent image — nothing meaningful to report.
    return { dominantColors: [], colorFamilies: {} };
  }

  const rawClusters: RawCluster[] = Array.from(buckets.values()).map((b) => ({
    weight: b.weight,
    r: b.rSum / b.weight,
    g: b.gSum / b.weight,
    b: b.bSum / b.weight,
  }));

  // Largest first, so the merge pass below always folds a smaller/noisier
  // bucket into an already-established larger one (deterministic and
  // order-stable for a given input).
  rawClusters.sort((a, b) => b.weight - a.weight);

  const merged: RawCluster[] = [];
  for (const cluster of rawClusters) {
    let bestTarget: RawCluster | null = null;
    let bestDistance = Infinity;
    for (const existing of merged) {
      const d = colorDistance(cluster, existing);
      if (d < MERGE_DISTANCE && d < bestDistance) {
        bestTarget = existing;
        bestDistance = d;
      }
    }
    if (bestTarget) {
      const newWeight = bestTarget.weight + cluster.weight;
      bestTarget.r = (bestTarget.r * bestTarget.weight + cluster.r * cluster.weight) / newWeight;
      bestTarget.g = (bestTarget.g * bestTarget.weight + cluster.g * cluster.weight) / newWeight;
      bestTarget.b = (bestTarget.b * bestTarget.weight + cluster.b * cluster.weight) / newWeight;
      bestTarget.weight = newWeight;
    } else {
      merged.push({ ...cluster });
    }
  }

  merged.sort((a, b) => b.weight - a.weight);

  const dominantColors: DominantColor[] = merged.slice(0, TOP_N).map((cluster, index) => {
    const r = clampChannel(cluster.r);
    const g = clampChannel(cluster.g);
    const b = clampChannel(cluster.b);
    const family = classifyColorFamily(r, g, b);
    return {
      rank: index + 1,
      name: nameColor(r, g, b, family),
      family,
      hex: rgbToHexUpper(r, g, b),
      rgb: [r, g, b],
      proportion: round2((cluster.weight / totalWeight) * 100),
    };
  });

  // Aggregated across EVERY merged cluster, not just the top 5 shown above
  // — several small clusters of the same family should still add up to
  // that family's true combined share.
  const familyWeights = new Map<ColorFamily, number>();
  for (const cluster of merged) {
    const r = clampChannel(cluster.r);
    const g = clampChannel(cluster.g);
    const b = clampChannel(cluster.b);
    const family = classifyColorFamily(r, g, b);
    familyWeights.set(family, (familyWeights.get(family) ?? 0) + cluster.weight);
  }

  const colorFamilies: Partial<Record<ColorFamily, number>> = {};
  for (const [family, weight] of familyWeights) {
    colorFamilies[family] = round2((weight / totalWeight) * 100);
  }

  return { dominantColors, colorFamilies };
}

// --- color-family classification -------------------------------------------

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    h = (bn - rn) / delta + 2;
  } else {
    h = (rn - gn) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

/**
 * Classifies an RGB color into one of the 14 standardized families using
 * hue, saturation AND lightness — not hue alone — so light/desaturated
 * warm tones can land on Beige rather than Yellow/Orange, dark desaturated
 * tones can land on Brown/Gray/Black, etc. Never throws.
 */
export function classifyColorFamily(r: number, g: number, b: number): ColorFamily {
  const { h, s, l } = rgbToHsl(r, g, b);
  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) return "Other";

  // Achromatic first — hue is meaningless/noisy at the extremes.
  if (l >= 0.94) return "White";
  if (l <= 0.07) return "Black";
  if (s <= 0.08) return "Gray";

  // The "warm" hue neighborhood (yellow/orange) is where Beige and Brown
  // live, and lightness — not saturation — is what actually separates a
  // beige/tan/cream from a vivid orange: many real beige/cream tones
  // (wheat, bisque, navajowhite, …) are fully saturated in raw HSL terms
  // but read as beige purely because they're so light. Brown is the same
  // hue band at low-to-mid lightness, but WITH a saturation ceiling — a
  // fully-saturated color at that same lightness (pure orange, s=1) must
  // stay Orange rather than being swept into Brown.
  const inWarmBand = h >= 8 && h < 65;
  if (inWarmBand) {
    if (l >= 0.68) return "Beige";
    if (l <= 0.55 && s <= 0.8) return "Brown";
    // otherwise (fully-saturated at this lightness, or an in-between
    // lightness that's neither light enough nor muted enough) falls
    // through to the plain Orange/Yellow hue buckets below.
  }

  // Light, moderately-saturated red/magenta reads as pink.
  if ((h < 8 || h >= 345) && l >= 0.72 && s >= 0.25) {
    return "Pink";
  }

  if (h < 8 || h >= 345) return "Red";
  if (h < 45) return "Orange";
  if (h < 70) return "Yellow";
  if (h < 170) return "Green";
  if (h < 200) return "Cyan";
  if (h < 255) return "Blue";
  if (h < 290) return "Purple";
  if (h < 345) return "Pink";

  return "Other";
}

/** Human-friendly name within a family. Doesn't need to be an exact CSS
 *  color name — just a useful, deterministic description. */
function nameColor(r: number, g: number, b: number, family: ColorFamily): string {
  const { s, l } = rgbToHsl(r, g, b);
  switch (family) {
    case "Red":
      if (l < 0.35) return "Dark Red";
      if (s > 0.75 && l >= 0.4 && l <= 0.6) return "Crimson";
      if (l > 0.55 && s < 0.65) return "Coral";
      return "Red";
    case "Orange":
      return l < 0.35 ? "Dark Orange" : "Orange";
    case "Yellow":
      return l > 0.85 ? "Pale Yellow" : "Yellow";
    case "Green":
      if (l < 0.3) return "Dark Green";
      if (s < 0.25) return "Sage Green";
      return "Green";
    case "Cyan":
      return l < 0.45 ? "Teal" : "Cyan";
    case "Blue":
      return l < 0.3 ? "Navy Blue" : "Blue";
    case "Purple":
      return l < 0.3 ? "Dark Purple" : "Purple";
    case "Pink":
      return l > 0.85 ? "Pale Pink" : "Pink";
    case "Brown":
      return l < 0.25 ? "Dark Brown" : "Brown";
    case "Beige":
      if (l > 0.85) return "Cream";
      if (s < 0.2) return "Tan";
      return "Beige";
    case "Gray":
      if (l > 0.8) return "Light Gray";
      if (l < 0.3) return "Dark Gray";
      return "Gray";
    case "Black":
      return "Black";
    case "White":
      return "White";
    default:
      return "Other";
  }
}

// --- small numeric helpers --------------------------------------------------

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function rgbToHexUpper(r: number, g: number, b: number): string {
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function colorDistance(a: RawCluster, b: RawCluster): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// --- output validation -------------------------------------------------------

const dominantColorSchema = z.object({
  rank: z.number().int().min(1).max(5),
  name: z.string().min(1),
  family: z.enum(COLOR_FAMILIES),
  hex: z.string().regex(/^#[0-9A-F]{6}$/, "hex must be uppercase #RRGGBB"),
  rgb: z.tuple([
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
    z.number().int().min(0).max(255),
  ]),
  proportion: z.number().min(0).max(100),
});

const colorAnalysisSchema = z.object({
  dominantColors: z.array(dominantColorSchema).max(5),
  colorFamilies: z.record(z.string(), z.number().min(0).max(100)),
});

/**
 * Validates a generated (or persisted) color-analysis object against the
 * expected shape before it's saved. Returns null — never throws — for
 * anything malformed, so a caller can safely fall back to "no analysis"
 * rather than writing bad JSON to the database.
 */
export function validateColorAnalysis(value: unknown): ColorAnalysisResult | null {
  const result = colorAnalysisSchema.safeParse(value);
  if (!result.success) return null;
  // Extra belt-and-suspenders check: every colorFamilies key must actually
  // be one of the standardized families (zod's z.record above only checked
  // the *values*, not that each key is a real family name).
  const validKeys = new Set<string>(COLOR_FAMILIES);
  for (const key of Object.keys(result.data.colorFamilies)) {
    if (!validKeys.has(key)) return null;
  }
  return result.data as ColorAnalysisResult;
}
