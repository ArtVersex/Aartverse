// One-time import: fills in an artist's professional profile + career
// history directly in the database, for an artist who has already
// registered (Google or email/password) but whose profile you're filling in
// on their behalf rather than having them type it all into the Profile form
// themselves.
//
// HOW TO USE:
//   1. Have the artist register first (or register them yourself via
//      "Sign up with Google" using their email) -- this script only fills in
//      an EXISTING artist's row, it never creates the account itself.
//   2. Edit the ARTIST_EMAIL constant and the ARTIST_DATA object below with
//      their real information. Every field is optional except the email --
//      leave a field as null (or an empty array) to leave it untouched.
//   3. Preview first, then apply:
//        npm run artists:import-profile -- --dry-run
//        npm run artists:import-profile
//
// WHAT THIS DOES NOT DO:
//   - Does not create the account/registration -- see step 1 above.
//   - Does not touch the profile photo or cover photo -- those are real
//     image uploads and need to go through the artist's own Profile page
//     (or you, logged in as them) so they get processed/hosted the same way
//     every other image on the site does.
//   - Does not touch `featured`/`active` -- those are admin controls, set
//     from /admin/artists, not part of the artist's own data.
//   - Safe to re-run: every write here is a full replace of the fields/rows
//     you've filled in below (same as saving the Profile form again with
//     different text), never an "add on top of" -- so if you spot a typo,
//     just fix ARTIST_DATA and run it again.
//
// PREREQUISITE: `npm run db:migrate` must already have been run at least
// once (it's what adds the bio/professional_experience/social_links/
// additional_notes columns and the artist_career_entries table this script
// writes to). If this script fails with an "Unknown column" or
// "doesn't exist" error, that's very likely why.
//
// Same "open a short-lived connection directly, no lib/ imports" pattern as
// scripts/publish-legacy-artworks.mjs and scripts/admin-promote.mjs, for the
// same reason: lib/db.ts and lib/queries/*.ts are guarded with
// `import "server-only"` and can't be loaded from a plain Node script.

import "./_env.mjs";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

// ---------------------------------------------------------------------------
// 1. Which artist. Must match the email they registered with, exactly.
// ---------------------------------------------------------------------------
const ARTIST_EMAIL = "madhusudhan.sharma@example.com"; // TODO: replace with his real, registered email

// ---------------------------------------------------------------------------
// 2. His data. Fill in whatever you actually have -- leave the rest as null
//    (for a single field) or [] (for a whole career-history category) and
//    this script will leave that part of his profile untouched.
// ---------------------------------------------------------------------------
const ARTIST_DATA = {
  // Short curatorial line shown right under his name on his public page.
  // Keep this to a sentence or two -- the longer story goes in `bio` below.
  artistStatement: null, // e.g. "Contemporary painter working at the intersection of memory and landscape."

  location: null, // e.g. "Jaipur, Rajasthan"

  // List each medium separately -- this becomes the chips shown on his card
  // and profile page.
  mediums: [], // e.g. ["Oil", "Watercolor", "Charcoal"]

  website: null, // e.g. "https://madhusudhansharma.com"
  instagram: null, // e.g. "madhusudhan.art" or a full instagram.com URL

  // PRIVATE -- for your team's own contact use only, never shown on his
  // public page. 10-digit Indian mobile numbers, no "+91" or spaces.
  phone: null,
  whatsapp: null,

  // Longer-form biography. Plain text is fine -- wrap a word in **double
  // asterisks** for bold if you want a touch of rich text, but plain
  // paragraphs work perfectly well too. Separate paragraphs with a blank
  // line.
  bio: null,

  professionalExperience: null,

  // Any other professional/social links beyond the main website above --
  // LinkedIn, Behance, a second gallery page, etc.
  socialLinks: [
    // { label: "LinkedIn", url: "https://linkedin.com/in/..." },
  ],

  // Anything else worth showing that doesn't fit the categories above.
  additionalNotes: null,

  // Career history. Every entry in every category shares the same shape:
  //   title        -- required if you include the entry at all
  //   organization -- school / gallery / venue / publisher / museum
  //   location     -- city, or city + country
  //   yearLabel    -- free text: "2019", "2018-2020", "Ongoing" all work
  //   description  -- a sentence or two, optional
  //   url          -- optional link
  // `subtype` is only used for exhibitions ("Solo" or "Group").
  //
  // Leave any category as an empty array if he has nothing to show there --
  // it will be skipped entirely, not cleared.
  education: [
    // { title: "BFA, Painting", organization: "College of Art", location: "New Delhi", yearLabel: "2012-2016", description: null, url: null },
  ],
  exhibitions: [
    // { subtype: "Solo", title: "Quiet Landscapes", organization: "Gallery Name", location: "Mumbai", yearLabel: "2023", description: null, url: null },
  ],
  awards: [
    // { title: "Award name", organization: "Awarding body", location: null, yearLabel: "2021", description: null, url: null },
  ],
  residencies: [
    // { title: "Residency name", organization: "Host institution", location: "Goa", yearLabel: "2020", description: null, url: null },
  ],
  publications: [
    // { title: "Featured in ...", organization: "Publication name", location: null, yearLabel: "2022", description: null, url: null },
  ],
  institutionalCollections: [
    // { title: "Permanent collection", organization: "Museum name", location: "Kolkata", yearLabel: null, description: null, url: null },
  ],
};

// ---------------------------------------------------------------------------
// Nothing below this line needs editing.
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

const CAREER_SECTIONS = [
  ["education", ARTIST_DATA.education],
  ["exhibition", ARTIST_DATA.exhibitions],
  ["award", ARTIST_DATA.awards],
  ["residency", ARTIST_DATA.residencies],
  ["publication", ARTIST_DATA.publications],
  ["collection", ARTIST_DATA.institutionalCollections],
];

// Same comma-list -> JSON array encoding lib/utils.ts#encodeJsonList does,
// for the same reason: `artists.mediums` has a `CHECK (json_valid(mediums))`
// constraint, so it must be stored as a JSON array string, never plain text.
function encodeMediums(list) {
  const cleaned = (list ?? []).map((m) => m.trim()).filter(Boolean);
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

// Same shape lib/utils.ts#encodeSocialLinks produces.
function encodeSocialLinks(list) {
  const cleaned = (list ?? [])
    .map((l) => ({ label: (l.label ?? "").trim(), url: (l.url ?? "").trim() }))
    .filter((l) => l.label !== "" && l.url !== "");
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

async function main() {
  if (!ARTIST_EMAIL || ARTIST_EMAIL.includes("example.com")) {
    console.error(
      "Set ARTIST_EMAIL at the top of this script to his real, registered email address first."
    );
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  console.log(`Connected. Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (will write)"}`);

  try {
    const [userRows] = await conn.query(
      `SELECT id, name, email, artist_id FROM users WHERE email = ? LIMIT 1`,
      [ARTIST_EMAIL.toLowerCase()]
    );

    if (userRows.length === 0) {
      console.error(
        `No account found for "${ARTIST_EMAIL}". He needs to register first (Google or email/password) -- this script only fills in an existing artist's profile, it doesn't create the account.`
      );
      process.exit(1);
    }

    const user = userRows[0];

    if (!user.artist_id) {
      console.error(
        `${user.email} has an account but no linked artist profile yet -- that's unexpected for a completed registration. Check that they finished sign-up as an artist, not an admin.`
      );
      process.exit(1);
    }

    const [artistRows] = await conn.query(`SELECT * FROM artists WHERE artist_id = ? LIMIT 1`, [
      user.artist_id,
    ]);
    if (artistRows.length === 0) {
      console.error(`users.artist_id (${user.artist_id}) doesn't match any row in artists -- data looks inconsistent, stopping.`);
      process.exit(1);
    }
    const artist = artistRows[0];

    console.log(`Found artist: ${artist.name} (${user.email}), artist_id=${artist.artist_id}`);

    // --- Build the profile field update -------------------------------------
    const fieldMap = {
      artist_statement: ARTIST_DATA.artistStatement,
      location: ARTIST_DATA.location,
      mediums: ARTIST_DATA.mediums && ARTIST_DATA.mediums.length > 0 ? encodeMediums(ARTIST_DATA.mediums) : undefined,
      website: ARTIST_DATA.website,
      instagram: ARTIST_DATA.instagram,
      phone: ARTIST_DATA.phone,
      whatsapp: ARTIST_DATA.whatsapp,
      bio: ARTIST_DATA.bio,
      professional_experience: ARTIST_DATA.professionalExperience,
      social_links:
        ARTIST_DATA.socialLinks && ARTIST_DATA.socialLinks.length > 0
          ? encodeSocialLinks(ARTIST_DATA.socialLinks)
          : undefined,
      additional_notes: ARTIST_DATA.additionalNotes,
    };
    // Only touch columns you actually filled in above (null is a deliberate
    // "leave alone", same as `undefined` -- both are skipped here).
    const columnsToUpdate = Object.entries(fieldMap).filter(([, v]) => v !== null && v !== undefined);

    console.log(`\nProfile fields to update (${columnsToUpdate.length}):`);
    if (columnsToUpdate.length === 0) {
      console.log("  (none -- every field in ARTIST_DATA is still empty)");
    }
    for (const [col, val] of columnsToUpdate) {
      const preview = String(val).length > 80 ? String(val).slice(0, 80) + "..." : val;
      console.log(`  ${col} = ${preview}`);
    }

    // --- Build the career-entry rows ----------------------------------------
    const rowsToInsert = [];
    const kindsToReplace = [];
    for (const [kind, entries] of CAREER_SECTIONS) {
      const valid = (entries ?? []).filter((e) => e.title && e.title.trim() !== "");
      if (valid.length === 0) continue; // nothing provided for this kind -- leave it untouched
      kindsToReplace.push(kind);
      valid.forEach((e, index) => {
        rowsToInsert.push([
          randomUUID(),
          artist.artist_id,
          kind,
          e.subtype?.trim() || null,
          e.title.trim(),
          e.organization?.trim() || null,
          e.location?.trim() || null,
          e.yearLabel?.trim() || null,
          e.description?.trim() || null,
          e.url?.trim() || null,
          index,
        ]);
      });
    }

    console.log(`\nCareer history to write (${kindsToReplace.length} categor${kindsToReplace.length === 1 ? "y" : "ies"}):`);
    if (kindsToReplace.length === 0) {
      console.log("  (none -- every career category in ARTIST_DATA is still empty)");
    }
    for (const kind of kindsToReplace) {
      const count = rowsToInsert.filter((r) => r[2] === kind).length;
      console.log(`  ${kind}: ${count} entr${count === 1 ? "y" : "ies"}`);
    }

    if (columnsToUpdate.length === 0 && kindsToReplace.length === 0) {
      console.log("\nNothing to write -- fill in ARTIST_DATA above with his real information first.");
      return;
    }

    if (DRY_RUN) {
      console.log("\nThis was a dry run -- no database changes were made.");
      console.log("Run again without --dry-run to apply these changes.");
      return;
    }

    await conn.beginTransaction();
    try {
      if (columnsToUpdate.length > 0) {
        const setClause = columnsToUpdate.map(([col]) => `${col} = ?`).join(", ");
        const values = columnsToUpdate.map(([, v]) => v);
        await conn.query(`UPDATE artists SET ${setClause} WHERE artist_id = ?`, [
          ...values,
          artist.artist_id,
        ]);
      }

      for (const kind of kindsToReplace) {
        await conn.query(`DELETE FROM artist_career_entries WHERE artist_id = ? AND kind = ?`, [
          artist.artist_id,
          kind,
        ]);
      }
      if (rowsToInsert.length > 0) {
        await conn.query(
          `INSERT INTO artist_career_entries
             (id, artist_id, kind, subtype, title, organization, location, year_label, description, url, sort_order)
           VALUES ?`,
          [rowsToInsert]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    }

    console.log(
      `\nDone. Updated ${columnsToUpdate.length} profile field(s) and wrote ${rowsToInsert.length} career entr${rowsToInsert.length === 1 ? "y" : "ies"} across ${kindsToReplace.length} categor${kindsToReplace.length === 1 ? "y" : "ies"} for ${artist.name}.`
    );
    console.log(
      `Remember: his public page still won't show up on /artists until an admin approves his account on /admin/artists (his profile currently has active=${artist.active ?? 0}), and his photo/cover image need to be added from his own Profile page.`
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("\nImport failed:", err.message);
  process.exit(1);
});
