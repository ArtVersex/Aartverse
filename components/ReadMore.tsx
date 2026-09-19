import type { ReactNode } from "react";

const COLLAPSED_HEIGHT: Record<"sm" | "md" | "lg", string> = {
  sm: "max-h-24",
  md: "max-h-32",
  lg: "max-h-48",
};

// The fade overlay used to be a flat h-14 (56px) for every size. That's a
// reasonable ~30% of the "lg" box (192px), but ate ~44% of "md" (128px) and
// over half of "sm" (96px) -- on a short mobile preview the gradient (and
// the "Read more" label sitting right under it) visually swallowed most of
// the last one or two lines instead of just softening one line's edge.
// Scaling the fade with the box keeps that ratio consistent at every size.
const FADE_HEIGHT: Record<"sm" | "md" | "lg", string> = {
  sm: "-mt-6 h-6",
  md: "-mt-8 h-8",
  lg: "-mt-12 h-12",
};

/**
 * Clamps long text to a preview height with a "Read more" toggle — pure
 * CSS (a hidden checkbox + the `peer` variant), no client JS, consistent
 * with the rest of the site's plain server-rendered pages.
 *
 * Every piece that reacts to the checkbox (the clamped box, the fade
 * overlay, both labels) is a direct sibling of it — peer-checked only
 * reaches direct siblings, not elements nested inside one, so the fade
 * overlay is its own sibling pulled up over the clamp with a negative
 * margin rather than an absolutely-positioned child of the clamped box.
 * Two separate <label>s (rather than one label with nested spans) swap
 * visibility for the same reason.
 */
export default function ReadMore({
  id,
  size = "md",
  children,
}: {
  id: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  return (
    <div>
      <input type="checkbox" id={id} className="peer sr-only" />
      <div className={`overflow-hidden ${COLLAPSED_HEIGHT[size]} peer-checked:max-h-none`}>
        {children}
      </div>
      <div
        className={`${FADE_HEIGHT[size]} bg-gradient-to-t from-canvas to-transparent peer-checked:hidden`}
        aria-hidden
      />
      <label
        htmlFor={id}
        className="eyebrow link-underline relative z-10 mt-2 inline-block cursor-pointer peer-checked:hidden"
      >
        Read more
      </label>
      <label
        htmlFor={id}
        className="eyebrow link-underline relative z-10 mt-2 hidden cursor-pointer peer-checked:inline-block"
      >
        Show less
      </label>
    </div>
  );
}
