# AartVerse — Authentication & Artist Onboarding

This document covers the authentication, artist-onboarding, and admin
moderation system added on top of the existing AartVerse site. It does not
duplicate the rest of the app's documentation — see `README.md` for that.

## 1. Environment variables

Copy `.env.example` to `.env.local` for local development and fill in real
values. In production, set the same variables through your hosting
provider's environment configuration — never commit real values.

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Existing MySQL/MariaDB connection (unchanged). |
| `AUTH_SECRET` | Signs/encrypts session JWTs. Generate with `openssl rand -base64 32`. Use a **different** value in production than in dev. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth client credentials (see §3). |
| `AUTH_URL` | This deployment's base URL: `http://localhost:3000` in dev, `https://aartverse.com` in production. |
| `APP_URL` | Used to build absolute links inside emails (verification, password reset). Keep in sync with `AUTH_URL`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL` | Hostinger SMTP (see §4). |

None of these are ever exposed to the browser — there are no `NEXT_PUBLIC_*`
equivalents for any secret above, by design.

## 2. Local setup

```bash
npm install
npm run db:migrate     # creates/extends the tables described in §5
npm run dev
```

`npm run db:migrate` reads `.env.local` itself (no extra tooling needed) and
is safe to re-run — every step checks whether it has already been applied
before doing anything.

## 3. Google OAuth configuration

1. In Google Cloud Console, use the existing OAuth client (the one whose
   credentials JSON you already have) or create a new one under **APIs &
   Services → Credentials → OAuth 2.0 Client IDs**.
2. Authorized redirect URIs must include both:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://aartverse.com/api/auth/callback/google`
3. Put the client ID and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
   in `.env.local` (dev) and your production environment config.
4. This project's own Firebase configuration (if any is used elsewhere for
   this Google Cloud project) is untouched by any of this — Auth.js talks
   to Google's OAuth endpoints directly and doesn't go through Firebase.

**Google sign-in always creates the user as `role = artist`, `status =
pending`.** Nothing about the Google account (including its email address
or domain) is ever used to decide role — see §7.

## 4. Hostinger SMTP configuration

Set in `.env.local` / production env:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<your Hostinger mailbox address>
SMTP_PASSWORD=<mailbox or app password>
FROM_EMAIL=noreply@aartverse.com
```

Port 465 + `SMTP_SECURE=true` uses implicit TLS. All transactional email
(`lib/email/templates.ts`) goes through `lib/email/mailer.ts`, which is a
server-only module — it can't be imported from a Client Component (Next.js
enforces this at build time via the `server-only` package).

## 5. Database changes

`npm run db:migrate` (see `scripts/migrate.mjs`) makes only additive
changes — it never drops or truncates anything:

- **New tables**: `users`, `accounts`, `verification_tokens`,
  `password_reset_tokens`.
- **`artists` table**: adds a nullable `user_id` column linking a public
  artist profile to a login. Existing rows are untouched (`user_id` stays
  `NULL` for artists that existed before this system).
- **`artworks` table**: adds `status` (`draft` / `pending` / `approved` /
  `rejected`, default `draft`), `rejection_reason`, `submitted_at`,
  `reviewed_at`, `reviewed_by`. **One-time backfill**: every artwork that
  existed before this column was added is set to `status = 'approved'`, so
  the existing catalogue keeps showing up exactly as before. Every artwork
  created after that point gets an explicit status from the application
  and is never touched by the backfill again.
- The public artwork queries (`lib/queries/artworks.ts`) now only return
  `status = 'approved'` rows. The public artist profile page
  (`getArtistBySlug`) only returns artists with `active = 1` (or `NULL`,
  matching the existing convention) — a newly self-registered artist's
  profile starts at `active = 0` and isn't public until an admin approves
  them, exactly like a curated artist always has been.
- Some id-like `VARCHAR` columns are widened (never shrunk) to fit
  generated UUIDs if they were narrower than 64 characters.

Foreign keys are attempted but not required to succeed (some hosts'
existing charset/collation can reject them) — the application enforces
referential integrity itself in the query layer either way.

## 6. Creating the first admin

There is intentionally **no UI, API route, or URL parameter** that can
grant admin — see §7. To promote someone:

```bash
npm run admin:promote -- someone@example.com
```

That person must already have a normal account (registered via
email/password or Google) before running this. The script flips their
existing row directly in the database (`role = 'admin'`, `status =
'active'`) and prints a confirmation. Run it on a machine that can reach
the production database, or against your local `.env.local` in dev.

## 7. Roles and where they come from

- Every new registration — email/password or Google — is created as
  `role = 'artist'`. There is no code path anywhere that sets `role =
  'admin'` from an HTTP request, a Google profile, an email domain, or a
  client-supplied value. The only way `role` ever becomes `admin` is
  `scripts/create-admin.mjs`, run by someone with shell/database access.
- Every server action and route that needs an admin calls
  `requireAdmin()` (`lib/auth/session.ts`), which re-reads the user's row
  from the database on every single call — never trusts a JWT claim by
  itself for the actual authorization decision.
- `middleware.ts` also blocks non-admins from `/admin/*` and anyone
  unauthenticated from `/artist/*` or `/admin/*`, as a fast first-pass
  gate — but it is not the source of truth. Even if that gate were somehow
  bypassed, every page and Server Action underneath it independently
  re-checks role/status/ownership against the database before doing
  anything.

## 8. Artist onboarding flow

1. An artist registers (email/password) or signs in with Google.
2. They are authenticated **immediately** — no separate approval gate
   before they can use the site.
3. A `users` row (`role = artist`, `status = pending`) and a linked,
   initially-hidden (`active = 0`) `artists` profile row are created in the
   same step.
4. They land on `/artist/dashboard`, which shows a **Pending** badge and a
   non-blocking banner explaining that their account is under review.
5. While pending, they can fully use the portal: complete their profile
   (`/artist/profile`), add/edit/delete artworks (`/artist/artworks`,
   `/artist/artworks/new`, `/artist/artworks/[id]/edit`), and submit
   artworks for review. None of this requires admin approval first.
6. Email verification (`/verify-email?token=...`) is a **separate**
   concept from admin approval — it only confirms the artist owns that
   email address, and never blocks dashboard access or artwork submission.
7. An admin reviews artists at `/admin/artists` and artworks at
   `/admin/artworks`. Approving an artist sets `status = active` and makes
   their public profile visible (`artists.active = 1`); it does not touch
   their existing artworks, drafts, or account — nothing needs to be
   redone.
8. Artwork moderation is independent of artist approval: an artist can
   submit artwork while still pending, and an admin can approve/reject
   individual artworks at any time. Only `status = approved` artworks are
   ever shown on the public site.

## 9. Pending vs. active vs. suspended

Enforced server-side in `lib/auth/session.ts`, never only in the UI:

- **pending** — authenticated, full artist-portal access (profile,
  artwork CRUD, submission), no admin access, account awaiting approval.
- **active** — same as pending, plus their public profile is visible and
  their approved artworks appear on the public site.
- **suspended** — can still sign in and see their dashboard/existing
  artworks (nothing is deleted), but `requireActiveArtistForMutation()`
  blocks every mutating action (create/edit/delete/submit artwork, edit
  profile) with a clear message. Their public profile is hidden
  (`artists.active = 0`) while suspended.

## 10. Known limitations / things to revisit

- **Local file storage for uploads** (`lib/uploads.ts`) writes artwork and
  profile images to `public/uploads/...` on the server's local disk. This
  is fine on a persistent Node host (e.g. a Hostinger VPS) but will **not**
  persist on an ephemeral/serverless filesystem (e.g. Vercel) — if you ever
  move to a host like that, swap this module for S3/Cloudinary/etc.
  without changing any calling code (it's isolated behind
  `saveArtworkImage` / `saveArtistProfileImage`).
- **Rate limiting / lockout** is in-memory-adjacent (failed-login counters
  live in the `users` table, so they do persist and work across restarts),
  but there's no distributed rate limiting for password-reset requests
  beyond the 1-hour/single-use token itself. Fine for a single-server
  deployment; revisit if you scale to multiple app servers behind a load
  balancer.
- **Single-use email links** (verification, password reset) can
  occasionally be pre-fetched and silently consumed by corporate email
  scanners / "safe links" systems before the person clicks them — a
  known, common trade-off of GET-based single-use links industry-wide. If
  this becomes a real problem, consider a confirmation click step instead
  of consuming the token directly on page load.

## 11. Automatic artwork color analysis

Every artwork feature image is analyzed server-side on upload/edit — the
artist never enters colors manually. Implemented entirely in Node/TypeScript
with [Sharp](https://sharp.pixelplumbing.com/); no Python process, script,
or external API is involved.

- **Core module:** `lib/color-analysis.ts` — `analyzeImageColors(buffer)`
  returns `{ dominantColors, colorFamilies }` (up to 5 ranked dominant
  colors + a full color-family breakdown, computed across every pixel
  cluster, not just the top 5). `validateColorAnalysis()` checks the shape
  before anything is saved. Deterministic: same image bytes always
  produce the same result. Runs standalone under plain Node (no `@/...`
  aliases, and deliberately no `import "server-only"` — see the comment at
  the top of the file) so it can be exercised directly in tests and in
  `scripts/reprocess-colors.mjs`.
- **Algorithm:** resize to 150px, uniform-quantize pixel colors into
  16-wide RGB buckets, then agglomeratively merge visually-close buckets
  (Euclidean RGB distance < 28) to undo anti-aliasing/JPEG noise. Each
  merged cluster is classified into one of 14 standardized families using
  HSL (hue/saturation/lightness), with explicit lightness/saturation
  carve-outs so light warm tones read as Beige and muted warm tones read
  as Brown rather than Orange/Yellow. Fully transparent pixels are
  ignored; partially-transparent pixels count with weight `alpha/255`
  toward their own color (never composited onto an assumed background).
- **Wiring:** `lib/uploads.ts`'s `saveArtworkImage()` runs analysis
  automatically after saving an artwork image and returns
  `{ url, colorAnalysis }`; a failed/unusable analysis just yields
  `colorAnalysis: null` and never blocks the upload. `createArtwork` /
  `updateOwnedArtwork` (`lib/queries/artworkMutations.ts`) persist the
  result into the existing `artworks.color_analysis` JSON column and into
  `artwork_colors` (both `dominant` and `family` scope rows, matching that
  table's existing lowercase-family/lowercase-hex convention — distinct
  from the Title-Case/uppercase-hex shape of the `color_analysis` JSON
  blob itself).
- **Backfilling old artworks:** `npm run colors:reprocess` (add
  `-- --dry-run` to preview, `-- --limit=N` to cap how many it touches)
  fills in `color_analysis` only for artworks that don't have any yet —
  never run automatically, never touches an artwork that already has
  color data (from this feature or the old pipeline), never overwrites
  concurrent writes. See `scripts/reprocess-colors.mjs` for details.
- **Tests:** `npm test` (`tests/color-analysis.test.mjs`, Node's built-in
  test runner) covers the 14 families, transparency handling, determinism,
  and output validation. Needs `sharp`'s native binary for your OS/arch —
  if `npm test` errors with "Could not load the sharp module", re-run
  `npm install` on the machine you're testing from.

## 12. Image storage: stable paths, WebP, and remote (FTP) hosting

New artist-uploaded images — an artwork's feature image, an artist's
profile/cover photo — are handled by `lib/uploads.ts`, with two goals: never
duplicate files on disk/host when an image is replaced, and (optionally)
host them on the same server that already serves the site's catalogue
images, so they're viewable the same way.

- **Stable, per-entity paths — no duplication.** Every image is saved at a
  path derived from the ID of the thing it belongs to, not a random
  filename: `artworks/<artworkId>.webp` for an artwork's feature image,
  `artists/<artistId>/profile.webp` and `artists/<artistId>/cover.webp` for
  profile/cover photos. Re-uploading for the same artwork/artist overwrites
  that same file in place — there is never a second copy to clean up. For a
  brand-new artwork, `createArtworkAction`
  (`app/artist/artworks/actions.ts`) generates the artwork's ID with
  `randomUUID()` *before* saving the image, then passes that same ID into
  `createArtwork(...)` so the row and the file agree on the ID.
- **Always converted to WebP.** `saveImage()` re-encodes every upload with
  Sharp (`sharp(bytes).rotate().webp({ quality: 82 })`) regardless of
  whether the artist uploaded a JPG, PNG, or WebP file — smaller files,
  one consistent format.
- **Where files actually land.** If the `IMAGE_FTP_*` env vars (see
  `.env.example`) are configured, `lib/remoteImageHost.ts` pushes the WebP
  bytes over FTP to `IMAGE_FTP_REMOTE_DIR` on `IMAGE_FTP_HOST`, and the
  stored URL is `${IMAGE_PUBLIC_BASE_URL}/<path>` — pointed at Hostinger's
  `public_html/images/...`, the same place the existing catalogue images
  live, so new uploads show up right alongside them. If those env vars are
  **not** set, uploads fall back to this app's own local disk under
  `public/uploads/<path>` (as before) — fine for local dev or a
  single-persistent-host deployment, not for a serverless/ephemeral
  filesystem.
- **Cleanup, not just replace-in-place.** `deleteManagedImage(url)`
  (renamed from the earlier `deleteLocalImage`) removes a file that's no
  longer referenced at all — e.g. when an artwork is deleted outright. It's
  a no-op for anything that isn't one of *our own* managed URLs (local
  `/uploads/...` or `${IMAGE_PUBLIC_BASE_URL}/...`), so it can never touch
  the legacy/imported catalogue image URLs already sitting in the
  database.
- **Setting up FTP hosting:** get the FTP host/username/password from
  Hostinger's hPanel (Files → FTP Accounts), and confirm — by connecting
  with any FTP client, or from hPanel's File Manager breadcrumb — the exact
  path that maps to `public_html/images` *from that FTP account's own
  root* (it is not always `/images`; some Hostinger FTP accounts are
  rooted at `public_html` already, others at the account root). Put these
  into `.env.local` (never commit them, never paste them into chat/AI
  tools) as `IMAGE_FTP_HOST`, `IMAGE_FTP_USER`, `IMAGE_FTP_PASSWORD`, and
  set `IMAGE_FTP_REMOTE_DIR` to whatever path you confirmed. Leave
  `IMAGE_FTP_PORT=21` and `IMAGE_FTP_SECURE=false` unless Hostinger tells
  you otherwise (FTPS on a different port). `IMAGE_PUBLIC_BASE_URL` should
  already be correct as shipped
  (`https://springgreen-antelope-607895.hostingersite.com/images`) — only
  change it if that hostname ever changes. Run `npm install` once
  (pulls in the new `basic-ftp` dependency) and restart the dev/prod
  server after editing `.env.local`.
- **Existing artworks are untouched.** This only affects *new* uploads
  through the artist dashboard. The random-named catalogue images already
  in `public_html/images/artworks/` are not renamed, moved, or
  re-encoded by anything here.

### 12.1 Troubleshooting: "530 Login incorrect" only from the app, never from `npm run images:test-host`

If the diagnostic script connects fine but the running app fails FTP login with
`530 Login incorrect`, the most likely cause (confirmed at least once on this
project) is an **unquoted `#` in `IMAGE_FTP_PASSWORD`**. Next.js's built-in env
loader (`@next/env`) treats an unquoted `#` as the start of a comment and
silently truncates everything after it -- so a password like `abc#def` gets
loaded as just `abc`, with no error or warning. `scripts/test-image-host.mjs`
uses a simpler parser (via `scripts/_env.mjs`) that doesn't do this, which is
exactly why it can succeed while the real app fails with the same `.env.local`.

**Fix:** wrap the value in single quotes in `.env.local`:

```
IMAGE_FTP_PASSWORD='your#actual-password-here'
```

Single quotes (not double) are safest -- Next's env loader only strips the
outer quotes and does no further escape processing on single-quoted values,
so the password comes through byte-for-byte. Restart the dev/prod server
after editing `.env.local` for this to take effect (env files are only read
at process startup).

If you ever need to confirm the two loaders agree again without exposing the
password, the throwaway comparison script from that session compared
`@next/env`'s `loadEnvConfig()` output against a naive line-by-line read of
`.env.local`, printing only value **lengths** and a match/mismatch boolean --
never the values themselves. Recreate it the same way if this ever recurs.
