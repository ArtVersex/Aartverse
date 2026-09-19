// Manual, opt-in backfill: fills in automatic color analysis for artworks
// that don't have any yet. NEVER run automatically (not part of any
// build/deploy/upload step, not scheduled) — this is invoked by a person,
// on purpose, via:
//
//   npm run colors:reprocess           -- apply changes
//   npm run colors:reprocess -- --dry-run   -- preview only, writes nothing
//   npm run colors:reprocess -- --limit=25  -- process at most 25 artworks
//
// Strictly additive/non-destructive:
//   - Only ever touches artworks whose `color_analysis` column is currently
//     NULL/empty. An artwork that already has color data (from this feature
//     or from the old Python pipeline) is never re-analyzed, overwritten,
//     or deleted by this script.
//   - Each artwork's `color_analysis` UPDATE is itself re-guarded by the
//     same "still empty?" condition in its WHERE clause, so two runs (or a
//     run racing a real upload) can't clobber a value written meanwhile.
//   - A missing image file, an unreadable/corrupt image, or a failed
//     analysis just skips that artwork (logged) — it is left exactly as it
//     was, never marked, never partially written.
//
// This mirrors the same color_analysis JSON shape and artwork_colors rows
// that lib/queries/artworkMutations.ts writes for a fresh upload (see
// replaceArtworkColorRows there) — duplicated here rather than imported,
// because lib/db.ts and lib/queries/* are guarded with `import "server-only"`
// (which throws outside a bundler's "react-server" condition) and so can't
// be loaded from a plain Node script; this script opens its own short-lived
// connection instead, the same pattern scripts/migrate.mjs and
// scripts/inspect-schema.mjs already use.

import "./_env.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { analyzeImageColors, validateColorAnalysis } from "../lib/color-analysis.ts";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : null;

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log(
    `Connected. Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write)"}` +
      (LIMIT ? `, limit ${LIMIT}` : "")
  );

  try {
    const [rows] = await conn.query(
      `SELECT artwork_id, feature_image_url
       FROM artworks
       WHERE (color_analysis IS NULL OR color_analysis = '')
         AND feature_image_url IS NOT NULL
         AND feature_image_url != ''
       ORDER BY created_at ASC`
    );

    const candidates = LIMIT ? rows.slice(0, LIMIT) : rows;
    console.log(
      `Found ${rows.length} artwork(s) with no color analysis yet` +
        (LIMIT ? `; processing first ${candidates.length}.` : ".")
    );

    let analyzed = 0;
    let skippedNotLocal = 0;
    let skippedMissingFile = 0;
    let skippedAnalysisFailed = 0;

    for (const row of candidates) {
      const { artwork_id: artworkId, feature_image_url: imageUrl } = row;

      // Only local /uploads/... files live on this filesystem — an
      // artwork whose image is an external URL (or otherwise unrecognized)
      // is skipped, not treated as an error.
      if (!imageUrl.startsWith("/uploads/")) {
        skippedNotLocal++;
        console.log(`  SKIP  ${artworkId} -- not a local upload (${imageUrl})`);
        continue;
      }

      const filePath = path.join(process.cwd(), "public", imageUrl);
      let bytes;
      try {
        bytes = await readFile(filePath);
      } catch {
        skippedMissingFile++;
        console.log(`  SKIP  ${artworkId} -- image file not found on disk (${imageUrl})`);
        continue;
      }

      let colorAnalysis;
      try {
        const raw = await analyzeImageColors(bytes);
        colorAnalysis = validateColorAnalysis(raw);
      } catch (err) {
        colorAnalysis = null;
        console.error(
          `  SKIP  ${artworkId} -- analysis threw: ${err instanceof Error ? err.message : err}`
        );
      }

      if (!colorAnalysis) {
        skippedAnalysisFailed++;
        console.log(`  SKIP  ${artworkId} -- analysis produced no usable result`);
        continue;
      }

      if (DRY_RUN) {
        analyzed++;
        console.log(
          `  WOULD UPDATE  ${artworkId} -- ${colorAnalysis.dominantColors.length} dominant color(s), ` +
            `families: ${Object.keys(colorAnalysis.colorFamilies).join(", ") || "(none)"}`
        );
        continue;
      }

      await conn.beginTransaction();
      try {
        const [updateResult] = await conn.query(
          `UPDATE artworks
           SET color_analysis = ?
           WHERE artwork_id = ? AND (color_analysis IS NULL OR color_analysis = '')`,
          [JSON.stringify(colorAnalysis), artworkId]
        );

        if (updateResult.affectedRows > 0) {
          // Defensive: this artwork had no color_analysis a moment ago
          // (the SELECT above), so it should have no artwork_colors rows
          // either — but guard with a DELETE anyway before inserting, in
          // case of a partial/inconsistent prior state, exactly as
          // replaceArtworkColorRows does for a live upload.
          await conn.query(`DELETE FROM artwork_colors WHERE artwork_id = ?`, [artworkId]);

          const colorRows = [];
          for (const c of colorAnalysis.dominantColors) {
            colorRows.push([
              artworkId,
              c.name,
              c.family.toLowerCase(),
              "dominant",
              c.hex.toLowerCase(),
              c.proportion,
              c.rank,
              c.rgb[0],
              c.rgb[1],
              c.rgb[2],
            ]);
          }
          Object.entries(colorAnalysis.colorFamilies).forEach(([family, proportion], index) => {
            colorRows.push([
              artworkId,
              null,
              family.toLowerCase(),
              "family",
              null,
              proportion,
              index + 1,
              null,
              null,
              null,
            ]);
          });

          if (colorRows.length > 0) {
            await conn.query(
              `INSERT INTO artwork_colors
                 (artwork_id, color_name, color_family, color_scope, hex, proportion, rank_number, rgb_r, rgb_g, rgb_b)
               VALUES ?`,
              [colorRows]
            );
          }

          await conn.commit();
          analyzed++;
          console.log(
            `  OK    ${artworkId} -- ${colorAnalysis.dominantColors.length} dominant color(s) saved`
          );
        } else {
          // Someone else (a real upload/edit) filled this in between our
          // SELECT and this UPDATE -- leave their data alone.
          await conn.rollback();
          console.log(`  SKIP  ${artworkId} -- color_analysis was set concurrently, left as-is`);
        }
      } catch (err) {
        await conn.rollback();
        throw err;
      }
    }

    console.log("\nDone.");
    console.log(`  ${DRY_RUN ? "Would analyze" : "Analyzed"}: ${analyzed}`);
    console.log(`  Skipped (external/non-local image): ${skippedNotLocal}`);
    console.log(`  Skipped (image file missing on disk): ${skippedMissingFile}`);
    console.log(`  Skipped (analysis failed/empty): ${skippedAnalysisFailed}`);
    if (DRY_RUN) {
      console.log("\nThis was a dry run -- no database changes were made.");
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("\nReprocessing failed:", err.message);
  process.exit(1);
});
