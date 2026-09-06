import { isOptimizableImageSrc } from "@/lib/images";

/**
 * Two scales of the same wall-frame presentation, sharing one implementation
 * so a grid card and the artwork detail hero always look like the same
 * frame, just at different sizes — not two different visual languages.
 *  - "hero": the full-size treatment on the artwork detail page.
 *  - "card": a slimmer frame/mat for grid thumbnails (components/ArtworkCard.tsx)
 *    — proportionally much thinner, since a wide wood band that reads as
 *    tasteful on a large hero image reads as heavy clutter tiled dozens of
 *    times across a grid.
 */
const SIZE_CONFIG = {
  hero: {
    wallPadding: "p-6 sm:p-12",
    framePadding: "clamp(10px, 1.6vw, 18px)",
    matPadding: "clamp(14px, 2.6vw, 28px)",
    maxHeight: "70vh",
    dropShadow: "drop-shadow-[0_30px_40px_rgba(20,14,8,0.28)]",
    showWire: true,
    hoverZoom: false,
    placeholderSize: "h-64 w-64",
  },
  card: {
    wallPadding: "p-3 sm:p-4",
    framePadding: "clamp(3px, 0.9vw, 6px)",
    matPadding: "clamp(5px, 1.4vw, 9px)",
    maxHeight: "300px",
    dropShadow: "drop-shadow-[0_8px_14px_rgba(20,14,8,0.16)]",
    showWire: false,
    hoverZoom: true,
    placeholderSize: "h-32 w-32",
  },
} as const;

/**
 * Presents the artwork as if it were hanging on a gallery wall: a soft wall
 * backdrop, a wood-tone frame (built with layered box-shadows, no image
 * assets), a mat/passe-partout border, then the artwork itself. Pure CSS —
 * no client JS needed.
 *
 * The frame sizes itself to each artwork's own proportions instead of
 * forcing every piece into the same box: a landscape painting gets a wide
 * frame, a portrait piece gets a tall one, a square piece gets a square
 * one. That only works if the browser is left to size the image from its
 * real, natural dimensions — so this deliberately renders a plain <img>
 * (not next/image's `fill` mode, which needs a pre-sized box and would
 * force every artwork into an identical crop) constrained only by a max
 * width/height. The frame and mat are `inline-block`, so they shrink-wrap
 * around whatever size the image actually renders at, rather than
 * stretching to fill a fixed-width column.
 *
 * For allow-listed hosts, the image is routed through /api/framed-image,
 * which trims the uniform-colored photo/scan backdrop margin real artwork
 * photography often has around the actual drawing, so the frame hugs the
 * artwork itself rather than the photographer's backdrop. Any other host
 * falls back to the untouched original — see lib/images.ts.
 */
export default function FramedArtwork({
  src,
  alt,
  priority = false,
  size = "hero",
}: {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  size?: keyof typeof SIZE_CONFIG;
}) {
  const config = SIZE_CONFIG[size];
  const displaySrc =
    src && isOptimizableImageSrc(src)
      ? `/api/framed-image?src=${encodeURIComponent(src)}`
      : src;

  return (
    <div
      className={`relative flex justify-center ${config.wallPadding}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #f1ece3 0%, #e6dfd3 55%, #d9d0c1 100%)",
      }}
    >
      <div className={`relative inline-block max-w-full leading-[0] ${config.dropShadow}`}>
        {/* wood-tone frame — shrink-wraps to the mat/image below. `leading-[0]`
            here and on the outer wrapper above matters just as much as on the
            mat below: any inline-block nested inside another inline-block
            without a zeroed line-height picks up a few px of baseline
            "descender" gap under its content, and at hero scale that's easy
            to miss but at card scale it reads as a visibly thicker bottom
            edge on the frame. */}
        <div
          className="inline-block max-w-full leading-[0]"
          style={{
            background: "linear-gradient(155deg, #7a5842 0%, #4a3323 55%, #26170f 100%)",
            boxShadow:
              "inset 0 0 0 1px rgba(0,0,0,0.45), inset 0 2px 3px rgba(255,255,255,0.18), inset 0 -4px 8px rgba(0,0,0,0.55)",
            padding: config.framePadding,
          }}
        >
          {/* mat / passe-partout — also shrink-wraps */}
          <div
            className="inline-block max-w-full overflow-hidden bg-[#f8f5ef] leading-[0]"
            style={{
              boxShadow: "inset 0 0 16px rgba(0,0,0,0.14)",
              padding: config.matPadding,
            }}
          >
            {displaySrc ? (
              // Plain <img>, on purpose — see the component doc comment above.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt={alt}
                loading={priority ? "eager" : "lazy"}
                className={`block h-auto w-auto max-w-full ${
                  config.hoverZoom
                    ? "transition-transform duration-500 group-hover:scale-[1.04]"
                    : ""
                }`}
                style={{ maxHeight: config.maxHeight }}
              />
            ) : (
              <div
                className={`flex items-center justify-center bg-line/40 text-sm text-muted ${config.placeholderSize}`}
              >
                No image available
              </div>
            )}
          </div>
        </div>

        {/* hanging wire, suggested with two simple lines */}
        {config.showWire && (
          <svg
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[85%] opacity-40"
            width="90"
            height="36"
            viewBox="0 0 90 36"
            aria-hidden
          >
            <path d="M6 2 L45 32 L84 2" fill="none" stroke="#4a3323" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </div>
  );
}
