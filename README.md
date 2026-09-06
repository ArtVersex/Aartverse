# Aartverse

A contemporary art marketplace built with Next.js (App Router) + TypeScript +
Tailwind CSS, reading directly from your existing MariaDB database on
Hostinger. No mock data, no second backend — every page is a Server
Component that queries MariaDB straight from Next.js server-side code.

## Project structure

```
app/                          Routes (Next.js App Router)
  layout.tsx                  Root layout: fonts, <Header>/<Footer>, global metadata
  page.tsx                    Home page
  globals.css                 Tailwind entrypoint + small base styles
  robots.ts, sitemap.ts        SEO: robots.txt and sitemap.xml, generated from real data
  artworks/
    page.tsx                  /artworks — catalogue, filters, sorting, pagination
    [artwork_id]/page.tsx     /artworks/:id — artwork detail page
  artists/
    page.tsx                  /artists — artist listing
    [slug]/page.tsx           /artists/:slug — artist profile + their artworks
  categories/
    page.tsx                  /categories — category listing
    [slug]/page.tsx           /categories/:slug — artworks in one category
  week-best/
    page.tsx                  /week-best — all editorial Week Best Collections
    [collection_id]/page.tsx  /week-best/:id — one weekly collection, in sort_order
  search/page.tsx              /search — server-side search across artworks/artists

components/                   Presentational, reusable UI (no data fetching)
  ArtworkCard.tsx, ArtistCard.tsx, ArtworkFilters.tsx, Pagination.tsx, ...

lib/
  db.ts                       The one MariaDB connection pool (mysql2), server-only
  types.ts                    TypeScript mirrors of the existing schema
  utils.ts                    Formatting helpers (price, dates, slugs, paging)
  queries/
    artworks.ts               All artwork reads: list+filter+sort+paginate, detail,
                               related, featured, filter-facet helpers
    artists.ts                Artist reads
    categories.ts              Category reads (see note below)
    colors.ts                  Color-family facets for the color filter
    weekBest.ts                Week Best Collection reads, in sort_order
    search.ts                  Server-side search queries
```

Nothing in `app/` or `components/` talks to MariaDB directly — every page
calls into `lib/queries/*`, which is the only code that touches SQL. That
keeps the database access layer in one place, exactly as requested.

**A note on `categories`:** the brief didn't specify that table's exact
columns (unlike `artworks`/`artists`/`artwork_colors`, which are fully
enumerated). `lib/queries/categories.ts` builds category listings primarily
from `artworks.category` / `category_id` (which already exist on every
artwork row) and *additionally* reads the `categories` table if it can, using
whichever of the common column names (`name`/`category_name`, `slug`, `image_url`/`cover_image_url`,
`description`) is actually present — falling back gracefully if the table
has a different shape. It never assumes a fixed schema and never writes to
that table.

## How the database connection works

`lib/db.ts` creates a single `mysql2` connection pool from environment
variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) — never
hard-coded, never read anywhere else. It's imported with `import "server-only"`
at the top, which makes it a *build error* if anything ever tries to import
it from a Client Component, so credentials can never end up in
browser-side JavaScript. Every query in `lib/queries/*` goes through
`query()`/`queryOne()` in that file, using parameterized `?` placeholders —
nothing is ever concatenated into SQL.

The pool is stashed on `globalThis` in development so Next.js's hot reload
doesn't open a new set of connections on every save.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the real password (the repo's
`.env.local` currently has the placeholder `YOUR_PASSWORD` — you said you'd
set this yourself):

```
DB_HOST=82.25.121.161
DB_PORT=3306
DB_NAME=u461383673_artworks
DB_USER=u461383673_nshar349
DB_PASSWORD=YOUR_PASSWORD
```

`.env.local` is already in `.gitignore` — it will never be committed.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

**Important — this could not be verified from inside this session.** The
sandboxed environment this was built in has no network route to the npm
registry or to your MariaDB host (both are blocked by network policy in
this sandbox), so `npm install`, `npm run build`, and a live database query
could not be run or tested here. Everything above was written carefully
and reviewed by hand against the Next.js 15 / TypeScript / mysql2 APIs, but
please run `npm install` and `npm run dev` yourself as the very first step,
and fix anything that surfaces — most likely candidates are a dependency
version mismatch or a data-shape surprise in `categories`/`collections`
(see the note above). If you hit an error, the file/line is easy to find
since every SQL access is isolated in `lib/queries/`.

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" → import the repo. Framework preset
   "Next.js" will be detected automatically.
3. In the Vercel project's Settings → Environment Variables, add:
   `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — the same
   values as `.env.local`. Do **not** prefix them with `NEXT_PUBLIC_`.
4. Make sure your Hostinger MariaDB is configured to accept remote
   connections from Vercel's IPs (Hostinger's database "Remote MySQL"
   settings) — otherwise Vercel's serverless functions won't be able to
   reach it.
5. Point the `aartverse.com` domain at the Vercel project (Vercel → Domains).
6. Deploy. Every subsequent `git push` to your main branch redeploys
   automatically.

## Adding more artworks later

Nothing on the website needs to change. Every page queries MariaDB live —
insert a new row into `artworks` (plus its `artwork_colors` rows, and an
`artists` row if it's a new artist) and it appears on `/artworks`, the
home page's "Selected artworks" rail, its category page, its artist's
profile, and search — automatically, on the next request (list pages
revalidate every couple of minutes; nothing is hard-coded to "70 artworks").
Setting `impactful = 1` puts it in the homepage's "Featured artworks" rail.

## How Week Best Collections are retrieved

`lib/queries/weekBest.ts` reads `week_best_collections` for the collection's
metadata (label, headline, week_of, optional artist), then joins
`week_best_collection_artworks` to `artworks` and orders strictly by
`sort_order` — so the curated order is always preserved regardless of how
many artworks are in it. `/week-best` lists every collection that exists
(not just one), and `/week-best/[collection_id]` renders one collection in
full. The home page shows only the single most recent one (`ORDER BY
week_of DESC` — highest week_of first).

## Enhancements (round 2)

- **Fixed:** artist page crash (`artist.mediums.split is not a function`) —
  `lib/utils.ts#parseCommaList` now handles the mediums/subcategory columns
  defensively regardless of what shape they come back as.
- **Category filtering** now matches purely on `artworks.category` (the
  text field), not `category_id`, per your instruction — see
  `lib/queries/categories.ts` and `getDistinctCategories` in
  `lib/queries/artworks.ts`.
- **Subcategory filter** added to `/artworks` — `getDistinctSubcategories()`
  splits the comma-separated `subcategory` column into individual values,
  and matching uses `LIKE` so an artwork tagged "Abstract, Portrait" shows
  up under either.
- **Color palette fix on the artwork page:** the dominant/family color
  comparison is now case/whitespace-normalized, and any row whose
  `color_scope` doesn't cleanly match "dominant" or "family" now shows up
  under a catch-all "Colors" section instead of being silently dropped. If
  colors *still* don't show for a given artwork after this fix, the next
  thing to check is whether `artwork_colors.artwork_id` and
  `artworks.artwork_id` are the same column type (both should be a string
  type) — a type mismatch there would make the join return nothing even
  though the rows exist.
- **HTML-aware descriptions:** `lib/utils.ts#looksLikeHtml` detects when a
  long-form field (description, technique, symbolism, etc.) contains real
  markup vs. plain text, and renders it accordingly instead of showing
  literal `<p>` tags. `sanitizeRichText` strips scripts/handlers before
  anything is injected as HTML.
- **Color-first discovery:** `/artworks`' color filter is now a clickable
  swatch grid (not a dropdown), sourced from `artwork_colors` averaged
  RGB per family. Picking a color defaults sorting to "Best color match",
  which ranks by that family's `proportion` in each piece — the match % and
  its hex show up as a badge on the artwork card. The home page also got a
  "Find art by color" swatch strip linking straight into filtered results.
- **Wall / framed view:** the artwork detail page now renders the image
  inside `components/FramedArtwork.tsx` — a wood-tone frame + mat + soft
  wall backdrop built entirely from CSS (no extra image assets).
- **Registration links:** the Artist Registration and Art Submission Google
  Forms are linked from the footer and the homepage's "For artists" CTA —
  see `lib/constants.ts`.
- **WhatsApp:** a site-wide floating WhatsApp button (`components/WhatsAppButton.tsx`)
  and a per-artwork "Chat on WhatsApp" + "Ask about a home visit" panel
  (`components/PurchaseEnquiry.tsx`) both open a chat pre-filled with the
  artwork's title and ID. The number and message templates live in
  `lib/constants.ts` — update them there if either changes.

## Enhancements (round 3)

- **Fixed the `next/image` crash on unconfigured hosts** (`Invalid src prop ... hostname "images.unsplash.com" is not configured`). Some rows in the database — most likely fallback/placeholder artist or artwork images from the import pipeline — point at hosts other than the Hostinger image domain, and `next/image` throws a hard error (crashing the whole page) for any host not explicitly listed in `next.config.mjs`. Added:
  - `lib/images.ts` — an `OPTIMIZABLE_HOSTS` allowlist mirroring `next.config.mjs`'s `remotePatterns`.
  - `components/SafeImage.tsx` — a drop-in replacement for `next/image` used everywhere a database-supplied image URL is rendered (artwork cards, the framed artwork view, artist profile/cover photos, category tiles). It renders the optimized `<Image>` for allow-listed hosts and falls back to a plain `<img>` for anything else, so an unexpected host degrades gracefully instead of crashing the page.
  - Also added `images.unsplash.com` to `next.config.mjs`'s `remotePatterns` directly, so those specific images get the normal optimization too. If you add another image host later, add it in both places (`next.config.mjs` and `lib/images.ts`) to get optimization for it — otherwise it still displays, just unoptimized, via `SafeImage`'s fallback.
- **Fixed artwork images showing as cropped everywhere.** The artwork grid (`components/ArtworkCard.tsx`) and the artwork detail page's framed "wall view" (`components/FramedArtwork.tsx`) both used `object-cover` inside a fixed aspect-ratio box, which crops any artwork whose proportions don't match that box. Both now use `object-contain`, so the complete, uncropped artwork is always visible (letterboxed against the card/mat background for non-matching proportions). The framed view's image area also switched from a fixed `aspect-[4/5]` box to a viewport-height-based box (`h-[50vh] sm:h-[65vh]`) so both portrait and landscape pieces display fully. Circular artist avatars and the artist cover banner intentionally keep `object-cover` — those are photos of people/banners, not the artwork itself, and are meant to fill their frame.

## Enhancements (round 4)

- **Fixed the frame not matching each artwork's proportions.** The wall/frame view previously forced every artwork into the same fixed-height box (even after switching to `object-contain`), so a square or landscape piece would sit inside a tall box with a lot of empty mat padding above and below — the frame didn't feel "sized" to the piece. `components/FramedArtwork.tsx` now renders the image as a plain `<img>` (not `next/image`'s `fill` mode, which requires a pre-sized box) constrained only by `max-width`/`max-height`, and the wood frame + mat are `inline-block` so they shrink-wrap around whatever size the image actually renders at — a landscape painting gets a wide frame, a portrait piece gets a tall one, a square piece gets a square one, all still capped so nothing overflows the layout (`max-height: 70vh`, `max-width: 100%` of its column). This is the one place in the app that intentionally bypasses `next/image`/`SafeImage`: this hero image is loaded once per artwork page, so the small loss of automatic responsive-format optimization is a fair trade for correct, undistorted proportions.

## Enhancements (round 5)

- **Trims the photo/scan backdrop out of the wall-frame hero image.** Some artwork photos have a uniform gray/white margin around the actual drawing (typical of how scanned or photographed 2D art gets exported), so the round-4 fix — which correctly shows the whole photo at its real proportions — was still showing that backdrop margin along with the artwork. Added:
  - `app/api/framed-image/route.ts` — a server route that fetches an artwork photo and runs it through `sharp`'s `.trim()` (crops pixels from every edge that closely match the top-left corner's color) before serving it, cached hard (`Cache-Control: public, max-age=31536000, immutable`) since a given photo's trim result never changes. It only ever fetches from hosts already allow-listed in `lib/images.ts` — never an open proxy for arbitrary URLs.
  - `components/FramedArtwork.tsx` now points its `<img>` at `/api/framed-image?src=<the real photo URL>` for allow-listed hosts, and falls back to the untouched original for anything else.
  - **New dependency: `sharp`** (added to `package.json`) — the standard Node image-processing library, also what Vercel uses internally for `next/image` optimization, so it's a safe, well-supported addition rather than an unusual one. **Run `npm install` again to pull it in** before restarting `npm run dev` — this session's sandbox has no outbound network access to the npm registry, so this dependency could only be added to `package.json` here, not actually installed; that step has to happen in your own terminal.
  - To sanity-check the trim on one image directly (bypassing the frame/mat entirely), open `http://localhost:3000/api/framed-image?src=<url-encoded original image URL>` in a browser tab after restarting the dev server, and compare it against the original URL.

## Enhancements (round 6)

- **Color filtering now genuinely runs on `color_family` + `proportion`, and moved into "Advanced filters".** The filtering/ranking SQL already matched and sorted by the `family`-scope rows' exact `proportion` value — but the filter's own swatch colors were broken: `getColorFacets()` (`lib/queries/colors.ts`) was averaging `rgb_r/g/b` from `color_scope = 'family'` rows, which never carry rgb/hex data (only `dominant`-scope rows do) — so every swatch rendered as the same empty placeholder regardless of family. Fixed to average each family's `dominant`-scope rows instead, with a fixed fallback palette (`lib/colorFamilies.ts`) for the rare family with no dominant match. The "Find by color" swatch picker on `/artworks` is now under a collapsible "Advanced filters" `<details>` section (native HTML, no JS) that auto-opens whenever a color filter is already active.
- **Artwork detail pages now show the color *family* breakdown, not just dominant swatches, as a proportional scale.** New `components/ColorScaleBar.tsx` renders a single horizontal bar segmented by each color family's real share of the piece (from the `family`-scope rows), with a legend underneath — much more useful than a flat swatch list for "how much of this piece is which color." Segment colors come from that same artwork's own `dominant`-scope rows sharing that family name (real, piece-specific color), falling back to the generic palette only when no match exists. The old dominant-swatch list is kept underneath as "Exact tones detected."
- **Currency switched to Indian Rupees everywhere** — `formatPrice()` (`lib/utils.ts`) now formats via `en-IN`/`INR` instead of `en-US`/`USD`, and the artwork detail page's JSON-LD `Offer.priceCurrency` was updated to `"INR"` to match.
- **Consistent logo, including the favicon.** The project had no favicon at all, which is why different pages/tabs could show different browser-assigned placeholder icons — there was nothing of ours for the browser to fall back to consistently. Added `app/icon.png` and `app/apple-icon.png` (Next's file-convention icons, so they apply site-wide automatically), both cropped from the brush mark in the logo file you provided (`public/logo-full.png` keeps the full original). `components/Header.tsx` and `components/Footer.tsx` now show that same cropped mark (`public/logo-icon.png`) next to the "Aartverse" wordmark, so the same logo appears everywhere.
- **New `/about` page** (`app/about/page.tsx`, linked from the header and footer): what Aartverse is, how browsing/color discovery and purchasing work, the home-visit service and its pricing (a flat ₹1,000 per artist, covering up to 3 artworks from that artist, adjusted against the final purchase — the fee's real purpose is filtering out non-serious/hoax requests, not revenue), and the digital certificate of authenticity that comes with every sale. Pricing constants live in `lib/constants.ts` (`HOME_VISIT_FEE_INR`, `HOME_VISIT_MAX_ARTWORKS_PER_ARTIST`) so the artwork page's home-visit blurb and the about page never drift apart. Added to `app/sitemap.ts`.

## Enhancements (round 7)

- **Category icons.** `lib/categoryIcons.ts` maps each of the 5 fixed categories (Painting, Drawing, Sculpture, Mixed Media, Printmaking) to a matching icon under `public/categories/`, matching by exact name first and then a fuzzy keyword fallback so a slightly different spelling/casing in the database still resolves. `lib/queries/categories.ts` uses this as the first choice for a category's `image_url`, before falling back to whatever the database row itself provides. Shown on `/categories` (category tiles) and as an 80×80 icon next to the heading on `/categories/[slug]`.
  - **Source-image note:** the 5 icons were cropped and cleaned up from the images you provided (background removed, squared, padded). 4 of the 5 source files (painting, sculpture, mixed_media, drawing — printmaking is the exception) carry a faint diagonal "OpenArt" watermark from whatever AI image generator produced them originally. *(Resolved in round 8 below — you provided watermark-free replacements.)*
- **"Read more" on long text.** New `components/ReadMore.tsx` — a pure-CSS (no client-side JS) expand/collapse: text is clamped to a max height with a fade-out at the bottom and a "Read more" link; clicking it (a hidden checkbox + Tailwind's `peer-checked` styling) reveals the rest and swaps the link to "Show less". Applied wherever a field can run long: the artwork detail page's short description and its six narrative sections (description, technique highlight, historical context, symbolism, composition analysis, cultural significance — each only wrapped when it's actually long, so short entries display in full with no "Read more" clutter), and the artist page's artist statement.
- **Advanced filters: color is now multi-select, each with its own proportion slider.** Previously only one color family could be selected at a time. `ArtworkFilters` now renders every color swatch as an independent checkbox (checking one no longer affects the others), and checking a swatch reveals its own 0–100% slider for "how strong a presence of this color is required" — leaving it at 0 just means "contains this color at all." Selecting several colors combines them with AND (an artwork must satisfy every selected color's threshold). Under the hood: `lib/queries/artworks.ts`'s `ArtworkFilters.colors` is now an array of `{ family, minProportion }`, and the SQL builds one `EXISTS (...)` clause per selected color; the page (`app/artworks/page.tsx`) reads the repeated `color` query param plus one `pct_<family>` param per color, and `lib/utils.ts` gained a `toArray()` helper (and `toURLSearchParams()` was fixed to preserve *every* value of a repeated param, not just the first) so multiple selected colors survive pagination links correctly.
- **Every artwork-browsing surface now shows only `impactful = 1` artworks, with one deliberate exception.** The catalogue (`/artworks`), category pages, both home page rails (Featured and Selected), search results, the Week Best editorial collections, and the "More by this artist" / "Related artworks" rails on the artwork detail page all now filter to `impactful = 1` — added as `ArtworkFilters.impactfulOnly` (`lib/queries/artworks.ts`, applied in `buildWhere()`) for the catalogue/category pages, and as a direct `AND w.impactful = 1` clause in `getMoreByArtist`, `getRelatedArtworks`, `getSelectedArtworks`, `getOtherArtworksByArtists`, `searchArtworks` (`lib/queries/search.ts`), and `getArtworksForCollection` (`lib/queries/weekBest.ts`). The one exception, per your instruction, is a single **artist's own profile page** (`/artists/[slug]`): it still shows *all* of that artist's artworks, but with the impactful-flagged ones listed first — via a new `getArtworks({ prioritizeImpactful: true })` option that sorts `(impactful = 1) DESC` ahead of the normal sort, rather than filtering anything out.

## Enhancements (round 8)

- **Category icons now always show, not just on hover.** The tiles on `/categories`, the homepage's "Browse by category" section, and (already correct) the category detail page header used to treat the icon like a full-bleed background photo that fades in on hover (`opacity-0 group-hover:opacity-100`) — a pattern meant for photography, not for a small transparent icon PNG, which is why the icon was invisible until you pointed at it. Both tiles were redesigned as clean bordered cards: the icon is centered and always visible, with only a subtle scale-up on hover.
- **Category icons replaced with your watermark-free versions.** You swapped in new source images for painting/sculpture/mixed_media/drawing (printmaking was already clean); they've been re-cropped and padded the same way as before (transparent background, squared, 480×480) and pushed to `public/categories/`. If the old icons still show after this, it's Next's on-disk image-optimization cache serving a stale render of the same filename — restart `npm run dev`, and hard-refresh the browser tab (Ctrl/Cmd+Shift+R) so it isn't showing a browser-cached copy either.
- **Week Best is now an editorial spread, not a plain text list.** `/week-best` renders each weekly collection as a full image-and-text row — using that collection's first curated artwork (by `sort_order`) as its cover photo — alternating image-left/image-right down the page. The individual collection page (`/week-best/[collection_id]`) now opens with a full-width hero banner using that same cover artwork behind a dark gradient scrim, with the label/headline/week/artist laid over it, before the artwork grid. A new lightweight query, `getAllWeekBestCollectionsWithSummary()` (`lib/queries/weekBest.ts`), fetches every collection's artwork count and cover image in one extra query total (not one per collection), so the index page stays fast regardless of how many weekly collections exist.
- **Artist pages can now be browsed by category, without losing the "show everything" default.** Below the "Artworks by {artist}" heading, a "Browse by category" chip row (`All (N)` plus one chip per category this artist has work in, each with its own count) lets a visitor narrow the artist's own artwork grid to one category at a time — `/artists/[slug]?category=Painting` — while the default (no chip selected) still shows every artwork by that artist, impactful-flagged pieces first, exactly as before. New queries `getDistinctCategoriesForArtist()` and `getArtworkCountForArtist()` (`lib/queries/artworks.ts`) power the chip counts; both are deliberately **not** restricted to impactful = 1, since they describe the same "all artworks" set the page shows by default. Pagination now correctly preserves the selected category across pages too (it previously discarded all query params).
- **Artwork cards now show the artwork in a miniature version of the wall-frame treatment used on the artwork detail page**, instead of a bare photo. `components/ArtworkCard.tsx` wraps the image in the same wood-tone frame + mat styling as `components/FramedArtwork.tsx`'s hero view (percentage-based insets so the frame scales with the card, no extra breakpoints needed), while keeping the card's fixed aspect ratio — unlike the detail page's hero, which shrink-wraps to each artwork's real proportions — so grid rows still line up cleanly across `/artworks`, category pages, artist pages, and every other listing. *(Superseded in round 9 below — this fixed-box version didn't actually match each artwork's real proportions and made the frame too thick.)*

## Enhancements (round 9)

- **Fixed the card frame to genuinely match each artwork's proportions, and made it thinner.** Round 8's card frame used a fixed `aspect-[4/5]` box with percentage insets — since the insets were relative to that arbitrary box rather than to the image's own edges, a landscape piece sitting letterboxed inside a portrait box got a frame that didn't hug the actual artwork, and the wood/mat bands (sized as a % of the whole box) read as too wide. Fixed properly by sharing one implementation between the hero and the card: `components/FramedArtwork.tsx` now takes a `size: "hero" | "card"` prop, and `components/ArtworkCard.tsx` renders `<FramedArtwork size="card" />` instead of its own separate frame markup. Both sizes use the same shrink-wrap technique — the frame sizes itself to the image's real, natural proportions, exactly like the hero — just with much thinner frame/mat padding for the card scale, and no hanging-wire detail (too fussy at thumbnail size). Since cards no longer force a fixed aspect ratio, every grid that renders `ArtworkCard` (`/artworks`, category pages, artist pages, home page rails, Week Best, search, related/more-by-artist) got `items-start` added to its grid container, so rows of differently-proportioned artworks don't get stretched to match their tallest neighbor.
- **Artist pages can now also be browsed by collection, alongside category.** A second chip row, "Browse by collection," sits directly below "Browse by category" — one chip per artist-series collection this artist has work in (via `artworks.part_of_collection` / `collection_name`, the *artist's own* series concept, not an Aartverse Week Best editorial collection), each showing its count. The two filters combine (AND) rather than replace each other — picking a category keeps whatever collection was selected, and vice versa — via a small `buildFilterHref()` helper that always carries the other row's current selection forward. New query `getDistinctCollectionNamesForArtist()` (`lib/queries/artworks.ts`) powers it, deliberately not restricted to impactful = 1 for the same reason as the category version.

## Enhancements (round 10)

- **Fixed a wider-than-the-rest bottom edge on the card frame.** `components/FramedArtwork.tsx` nests three `inline-block` layers (the drop-shadow wrapper, the wood frame, the mat) around the image. Only the innermost (the mat) had `leading-[0]` set — the two outer layers didn't, so each was quietly leaving a few pixels of baseline "descender" whitespace under its content, the classic CSS "mystery gap below an image" bug. At hero size those few px were negligible; at card scale they stacked up into a visibly thicker bottom band on every card. All three nesting levels now get `leading-[0]`, so the frame is even on all four sides regardless of size.
- **The collection/series tag on a card no longer covers the artwork.** It previously sat directly on top of the image at all times, which on a piece with content near the top edge visibly obscured part of the art. It's now hidden by default and fades in on hover (`opacity-0 group-hover:opacity-100`), matching the "image-focused, minimal" design direction — the tag is still there for anyone who wants to know a piece belongs to a series, just not competing with the artwork for attention by default.

## Enhancements (round 11)

- **Fixed the color palette showing "77%" for a color that's actually 0.77%.** `artwork_colors.proportion` is stored as either a 0–1 fraction or a 0–100 percentage depending on how a given import ran, and the code used to guess the scale per individual value (`value <= 1 ? value * 100 : value`). That guess is wrong whenever an artwork's proportions are genuinely on the 0–100 scale but one color family's real share happens to be under 1 — confirmed against raw `artwork_colors` rows for one artwork where Blue/White/Teal/Gray/Brown/Red proportions were 62.79/18.26/15.4/1.9/0.89/0.77, summing to ~100 as a group, yet Brown and Red were individually misread as 89% and 77%. The fix moves the scale decision from "look at this one value" to "look at the whole group of proportions it came from together," since they're shares of the same whole and should sum to roughly 100 (percentage scale) or roughly 1 (fraction scale) either way:
  - `app/artworks/[artwork_id]/page.tsx` now sums every `color_scope = 'family'` row's proportion for the artwork once, decides the scale for that whole group, and normalizes each segment before it's ever handed to `ColorScaleBar` — the "Color palette" bar on the artwork detail page.
  - The `color_match_proportion` SQL in `lib/queries/artworks.ts` (the "X% match" badge shown on artwork cards when a color filter is active) does the same thing inside the query itself: a correlated subquery sums *all* of that artwork's family-row proportions to decide the scale, then applies it to the selected-color sum, so the value the query returns is already a normalized 0–100 percentage.
  - `formatColorProportion()` (`lib/utils.ts`) and `ColorScaleBar` no longer do any per-value scale guessing of their own — both now assume the value they're given is already normalized, since that's the only place the decision can correctly be made.

## Design notes

- Every list page (`/artworks`, `/artists/[slug]`, `/categories/[slug]`)
  fetches from MariaDB with `LIMIT`/`OFFSET` — nothing loads the whole table
  into the browser, and the UI scales the same way whether there are 70
  artworks or 70,000.
- Filtering and sorting on `/artworks` is a plain server-rendered
  `<form method="get">` — no client-side JavaScript framework needed, and
  every filter combination is a shareable/bookmarkable URL.
- Sort columns are chosen from a fixed whitelist (`lib/queries/artworks.ts`,
  `SORT_TO_ORDER_BY`) rather than ever interpolating a client-supplied
  column name into `ORDER BY`.
