// Manual, opt-in one-time cleanup: publishes any artwork still sitting in
// "pending" or "rejected" from BEFORE the artist-trust workflow change
// (every new submission now goes straight to "approved"/live -- see
// app/artist/artworks/actions.ts and lib/queries/artworkMutations.ts).
//
// Why this script needs to exist at all: the admin Approve/Reject actions
// were removed as part of that change (admin's remaining artwork-level
// tools are the "Impactful" flag and outright deletion -- see
// components/admin/ArtworkRowActions.tsx), so any artwork that was still
// "pending" or "rejected" at the moment of that change has no UI path back
// to "approved" anymore other than the artist deleting and resubmitting it
// from scratch, which would lose its original submission date for no good
// reason. This script is the one-time fix for that specific gap.
//
// NEVER run automatically (not part of any build/deploy/upload step, not
// scheduled) -- this is invoked by a person, on purpose, via:
//
//   npm run artworks:publish-legacy             -- apply changes
//   npm run artworks:publish-legacy -- --dry-run -- preview only, writes nothing
//
// Effect on each matching row: status -> 'approved', rejection_reason
// cleared, and submitted_at backfilled with the current time only if it was
// ever NULL (a "pending" row already has a real submitted_at from when it
// was first submitted, so this never overwrites a genuine historical date
// -- it only fills in the gap for the rare row that somehow has neither).
// Every OTHER column is left completely untouched. Safe to run more than
// once: after the first run there are no more matching rows, so a second
// run just reports "Nothing to do."
//
// Same "open a short-lived connection directly" pattern as
// scripts/reprocess-colors.mjs, for the same reason: lib/db.ts is guarded
// with `import "server-only"` and can't be loaded from a plain Node script.

import "./_env.mjs";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log(`Connected. Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write)"}`);

  try {
    const [rows] = await conn.query(
      `SELECT artwork_id, title, artist_id, artist_name, status, submitted_at, rejection_reason
       FROM artworks
       WHERE status IN ('pending', 'rejected')
       ORDER BY created_at ASC`
    );

    console.log(`Found ${rows.length} legacy pending/rejected artwork(s).`);
    if (rows.length === 0) {
      console.log("Nothing to do.");
      return;
    }

    for (const row of rows) {
      const who = row.artist_name ?? row.artist_id ?? "unknown artist";
      const rejectedNote =
        row.status === "rejected" && row.rejection_reason
          ? ` -- was rejected: "${row.rejection_reason}"`
          : "";
      console.log(
        `  ${DRY_RUN ? "WOULD PUBLISH" : "PUBLISHING"}  ${row.artwork_id} -- "${row.title}" ` +
          `(currently ${row.status}, by ${who})${rejectedNote}`
      );
    }

    if (DRY_RUN) {
      console.log("\nThis was a dry run -- no database changes were made.");
      console.log(`Run again without --dry-run to publish these ${rows.length} artwork(s).`);
      return;
    }

    const [result] = await conn.query(
      `UPDATE artworks
       SET status = 'approved',
           submitted_at = COALESCE(submitted_at, NOW()),
           rejection_reason = NULL
       WHERE status IN ('pending', 'rejected')`
    );

    console.log(`\nDone. Published ${result.affectedRows} artwork(s) -- now live on Aartverse.com.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
