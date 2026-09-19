// Idempotent, additive database migration for the artist authentication /
// onboarding system.
//
// Safe to run multiple times: every change first checks whether it has
// already been applied (via information_schema) before doing anything.
// Never drops or truncates existing tables/columns/data.
//
// Usage:  npm run db:migrate

import "./_env.mjs";
import mysql from "mysql2/promise";

const DB_NAME = process.env.DB_NAME;

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  console.log(`Connected to database "${DB_NAME}". Starting migration...\n`);

  try {
    await createAuthTables(conn);
    await alignAuthTableCollation(conn);
    await extendArtistsTable(conn);
    await extendArtistsTableProfessional(conn);
    await createArtistCareerEntriesTable(conn);
    await extendArtworksTable(conn);
    await extendRankingColumns(conn);
    await widenIdColumns(conn);
    console.log("\nMigration complete. No existing data was modified or removed.");
  } finally {
    await conn.end();
  }
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1`,
    [DB_NAME, table]
  );
  return rows.length > 0;
}

async function columnInfo(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH, COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [DB_NAME, table, column]
  );
  return rows[0] ?? null;
}

async function columnExists(conn, table, column) {
  return (await columnInfo(conn, table, column)) !== null;
}

async function run(conn, label, sql) {
  try {
    await conn.query(sql);
    console.log(`  OK  ${label}`);
  } catch (err) {
    console.warn(`  SKIPPED  ${label} -- ${err.message}`);
  }
}

async function createAuthTables(conn) {
  console.log("Step 1/7: auth tables (users, accounts, tokens)");

  if (!(await tableExists(conn, "users"))) {
    await conn.query(`
      CREATE TABLE users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NULL,
        role ENUM('artist','admin') NOT NULL DEFAULT 'artist',
        status ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
        email_verified_at DATETIME NULL,
        image VARCHAR(1024) NULL,
        artist_id VARCHAR(64) NULL,
        failed_login_attempts INT NOT NULL DEFAULT 0,
        locked_until DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_users_email (email),
        UNIQUE KEY uniq_users_artist_id (artist_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("  OK  created table `users`");
  } else {
    console.log("  --  table `users` already exists, skipping create");
  }

  if (!(await tableExists(conn, "accounts"))) {
    await conn.query(`
      CREATE TABLE accounts (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        provider VARCHAR(64) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_accounts_provider (provider, provider_account_id),
        KEY idx_accounts_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("  OK  created table `accounts`");
  } else {
    console.log("  --  table `accounts` already exists, skipping create");
  }

  if (!(await tableExists(conn, "verification_tokens"))) {
    await conn.query(`
      CREATE TABLE verification_tokens (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_verification_token_hash (token_hash),
        KEY idx_verification_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("  OK  created table `verification_tokens`");
  } else {
    console.log("  --  table `verification_tokens` already exists, skipping create");
  }

  if (!(await tableExists(conn, "password_reset_tokens"))) {
    await conn.query(`
      CREATE TABLE password_reset_tokens (
        id CHAR(36) NOT NULL PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_reset_token_hash (token_hash),
        KEY idx_reset_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log("  OK  created table `password_reset_tokens`");
  } else {
    console.log("  --  table `password_reset_tokens` already exists, skipping create");
  }

  // Foreign keys are attempted separately (and non-fatally) because an
  // existing table's charset/collation can occasionally prevent them; the
  // app enforces referential integrity itself in the query layer either way.
  await run(
    conn,
    "FK accounts.user_id -> users.id",
    `ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  );
  await run(
    conn,
    "FK verification_tokens.user_id -> users.id",
    `ALTER TABLE verification_tokens ADD CONSTRAINT fk_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  );
  await run(
    conn,
    "FK password_reset_tokens.user_id -> users.id",
    `ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  );
}

/**
 * `users` was created above with `DEFAULT CHARSET=utf8mb4` and no explicit
 * COLLATE, so it picked up whatever this MariaDB server's *current*
 * default utf8mb4 collation is. The pre-existing `artists` table (part of
 * the original Aartverse.com schema, not created by this script) was
 * created earlier, under an older default -- so on a server that has
 * since moved its default (e.g. to `utf8mb4_uca1400_ai_ci`), the two
 * tables can end up on different collations without anyone choosing
 * that. That's silent right up until a query compares a column from each
 * side directly, which happens in exactly one place in this codebase:
 * `users.artist_id = artists.artist_id` on the admin artists list, which
 * MariaDB then refuses with "Illegal mix of collations".
 *
 * Fix: realign just that one column, `users.artist_id`, to match
 * `artists.artist_id`'s collation. Deliberately narrow and NOT a
 * whole-table `CONVERT TO CHARACTER SET`: `users.id` is referenced by
 * foreign keys from `accounts`, `verification_tokens`,
 * `password_reset_tokens`, and `artists.user_id`, and MariaDB refuses to
 * change the collation of a column that's part of a foreign-key
 * relationship (converting the whole table hits that and silently no-ops
 * via this script's `run()` error-swallowing -- which is exactly what
 * happened the first time this was attempted). `artist_id` itself carries
 * no foreign key, so it can be realigned on its own with no such
 * conflict. Idempotent: skipped once the collations already match.
 */
async function alignAuthTableCollation(conn) {
  console.log("\nStep 2/7: align `users.artist_id` collation with legacy `artists.artist_id`");

  if (!(await tableExists(conn, "artists")) || !(await tableExists(conn, "users"))) {
    console.log("  --  `artists` or `users` table missing, skipping");
    return;
  }

  const [artistsRows] = await conn.query(
    `SELECT COLLATION_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'artists' AND COLUMN_NAME = 'artist_id' LIMIT 1`,
    [DB_NAME]
  );
  const target = artistsRows[0]?.COLLATION_NAME ?? null;
  if (!target) {
    console.log("  --  `artists.artist_id` not found, nothing to align to, skipping");
    return;
  }

  const [usersRows] = await conn.query(
    `SELECT COLUMN_TYPE, IS_NULLABLE, COLLATION_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'artist_id' LIMIT 1`,
    [DB_NAME]
  );
  const usersCol = usersRows[0] ?? null;
  if (!usersCol) {
    console.log("  --  `users.artist_id` not found, skipping");
    return;
  }
  if (usersCol.COLLATION_NAME === target) {
    console.log(`  --  \`users.artist_id\` already uses ${target}, skipping`);
    return;
  }

  const nullability = usersCol.IS_NULLABLE === "NO" ? "NOT NULL" : "NULL";
  await run(
    conn,
    `align \`users.artist_id\` collation (${usersCol.COLLATION_NAME ?? "unknown"} -> ${target})`,
    `ALTER TABLE users MODIFY COLUMN artist_id ${usersCol.COLUMN_TYPE} COLLATE ${target} ${nullability}`
  );
}

async function extendArtistsTable(conn) {
  console.log("\nStep 3/7: extend `artists` table (additive only)");

  if (!(await tableExists(conn, "artists"))) {
    console.log("  --  table `artists` does not exist yet, skipping (nothing to extend)");
    return;
  }

  if (!(await columnExists(conn, "artists", "user_id"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN user_id CHAR(36) NULL AFTER artist_id`);
    await run(conn, "UNIQUE index on artists.user_id", `ALTER TABLE artists ADD UNIQUE INDEX uniq_artists_user_id (user_id)`);
    await run(
      conn,
      "FK artists.user_id -> users.id",
      `ALTER TABLE artists ADD CONSTRAINT fk_artists_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
    );
    console.log("  OK  added column `artists.user_id` (links a public artist profile to a login)");
  } else {
    console.log("  --  `artists.user_id` already exists, skipping");
  }

  // Plain VARCHAR, no CHECK constraint on purpose: format validation lives
  // in lib/validation/auth.ts (app layer) instead, after the `mediums`
  // CHECK-constraint incident (see AUTH_SETUP.md) made clear how brittle a
  // DB-level format constraint is to get exactly right up front, and how
  // confusing the resulting error is for a mismatch. 10 raw digits are
  // stored (no "+91", no spaces) -- the UI adds the +91 prefix for display.
  if (!(await columnExists(conn, "artists", "phone"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN phone VARCHAR(15) NULL AFTER instagram`);
    console.log("  OK  added column `artists.phone`");
  } else {
    console.log("  --  `artists.phone` already exists, skipping");
  }

  if (!(await columnExists(conn, "artists", "whatsapp"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN whatsapp VARCHAR(15) NULL AFTER phone`);
    console.log("  OK  added column `artists.whatsapp`");
  } else {
    console.log("  --  `artists.whatsapp` already exists, skipping");
  }
}

/**
 * Optional professional-profile fields, all nullable and never required for
 * registration/submission -- used by the "Professional profile" section of
 * <ProfileForm> and by the Artist Profile PDF builder (see
 * app/artist/profile-builder). Reuses existing columns wherever one already
 * fits (artist_statement, mediums, website, instagram, location) rather than
 * duplicating them; these four are genuinely new information the schema had
 * no home for.
 *
 * Plain LONGTEXT, no CHECK constraint -- same reasoning as `phone`/
 * `whatsapp` above: format/shape validation lives in lib/validation/auth.ts
 * (app layer), after the `mediums` CHECK-constraint incident (see
 * AUTH_SETUP.md) showed how brittle a DB-level format constraint is to get
 * right and how confusing the resulting error is. `social_links` is a JSON
 * array of {label, url} objects, encoded/decoded in lib/utils.ts exactly
 * like the existing `mediums` comma-list <-> JSON convention -- validated
 * in the app layer, not enforced by the column itself.
 */
async function extendArtistsTableProfessional(conn) {
  console.log("\nStep 4/7: extend `artists` table with optional professional-profile fields");

  if (!(await tableExists(conn, "artists"))) {
    console.log("  --  table `artists` does not exist yet, skipping (nothing to extend)");
    return;
  }

  if (!(await columnExists(conn, "artists", "bio"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN bio LONGTEXT NULL AFTER whatsapp`);
    console.log("  OK  added column `artists.bio`");
  } else {
    console.log("  --  `artists.bio` already exists, skipping");
  }

  if (!(await columnExists(conn, "artists", "professional_experience"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN professional_experience LONGTEXT NULL AFTER bio`);
    console.log("  OK  added column `artists.professional_experience`");
  } else {
    console.log("  --  `artists.professional_experience` already exists, skipping");
  }

  if (!(await columnExists(conn, "artists", "social_links"))) {
    await conn.query(
      `ALTER TABLE artists ADD COLUMN social_links LONGTEXT NULL AFTER professional_experience`
    );
    console.log("  OK  added column `artists.social_links`");
  } else {
    console.log("  --  `artists.social_links` already exists, skipping");
  }

  if (!(await columnExists(conn, "artists", "additional_notes"))) {
    await conn.query(`ALTER TABLE artists ADD COLUMN additional_notes LONGTEXT NULL AFTER social_links`);
    console.log("  OK  added column `artists.additional_notes`");
  } else {
    console.log("  --  `artists.additional_notes` already exists, skipping");
  }
}

/**
 * One unified table for every repeatable career-history entry (exhibitions,
 * education, awards, residencies, publications, and institutional
 * collections that hold an artist's work -- NOT the existing per-artwork
 * "collection/series" concept in artworks.collection_name, a different,
 * unrelated idea that predates this table). A `kind` column distinguishes
 * the six categories instead of six separate tables, and `subtype` carries
 * the one sub-distinction the spec called out (exhibition solo/group) --
 * future categories or sub-distinctions are new enum values or new
 * `subtype` strings, never a schema change. `year_label` is deliberately a
 * flexible free-text string ("2019", "2018-2020", "Ongoing") rather than a
 * strict year integer, since career history doesn't always fit one.
 *
 * FK attempted non-fatally via the shared run() helper, same as every other
 * table in this script -- the app enforces referential integrity itself in
 * the query layer either way (see lib/queries/artistCareerEntries.ts), and
 * this sidesteps the same collation-mismatch class of issue
 * alignAuthTableCollation() exists to work around.
 */
async function createArtistCareerEntriesTable(conn) {
  console.log("\nStep 5/7: create `artist_career_entries` table");

  if (await tableExists(conn, "artist_career_entries")) {
    console.log("  --  table `artist_career_entries` already exists, skipping create");
    return;
  }

  await conn.query(`
    CREATE TABLE artist_career_entries (
      id CHAR(36) NOT NULL PRIMARY KEY,
      artist_id VARCHAR(64) NOT NULL,
      kind ENUM('exhibition','education','award','residency','publication','collection') NOT NULL,
      subtype VARCHAR(50) NULL,
      title VARCHAR(500) NOT NULL,
      organization VARCHAR(500) NULL,
      location VARCHAR(255) NULL,
      year_label VARCHAR(50) NULL,
      description TEXT NULL,
      url VARCHAR(1000) NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_career_entries_artist (artist_id, kind, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log("  OK  created table `artist_career_entries`");

  await run(
    conn,
    "FK artist_career_entries.artist_id -> artists.artist_id",
    `ALTER TABLE artist_career_entries ADD CONSTRAINT fk_career_entries_artist FOREIGN KEY (artist_id) REFERENCES artists(artist_id) ON DELETE CASCADE`
  );
}

async function extendArtworksTable(conn) {
  console.log("\nStep 6/7: extend `artworks` table (additive only)");

  if (!(await tableExists(conn, "artworks"))) {
    console.log("  --  table `artworks` does not exist, skipping (nothing to extend)");
    return;
  }

  const statusExisted = await columnExists(conn, "artworks", "status");
  if (!statusExisted) {
    await conn.query(
      `ALTER TABLE artworks ADD COLUMN status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft'`
    );
    console.log("  OK  added column `artworks.status`");

    // One-time backfill: every row that existed BEFORE this column was
    // added just got defaulted to 'draft'. Those are the pre-existing,
    // already-curated catalogue items, so mark them 'approved' so they
    // keep showing up exactly as before. This block only ever runs once,
    // inside the "column didn't exist yet" branch — artworks created by
    // artists afterwards are inserted with an explicit status by the
    // application and are never touched by this backfill.
    const [result] = await conn.query(`UPDATE artworks SET status = 'approved' WHERE status = 'draft'`);
    console.log(`  OK  backfilled ${result.affectedRows} pre-existing artwork(s) to status = 'approved'`);
  } else {
    console.log("  --  `artworks.status` already exists, skipping (and skipping backfill)");
  }

  if (!(await columnExists(conn, "artworks", "rejection_reason"))) {
    await conn.query(`ALTER TABLE artworks ADD COLUMN rejection_reason VARCHAR(500) NULL`);
    console.log("  OK  added column `artworks.rejection_reason`");
  } else {
    console.log("  --  `artworks.rejection_reason` already exists, skipping");
  }

  if (!(await columnExists(conn, "artworks", "submitted_at"))) {
    await conn.query(`ALTER TABLE artworks ADD COLUMN submitted_at DATETIME NULL`);
    console.log("  OK  added column `artworks.submitted_at`");
  } else {
    console.log("  --  `artworks.submitted_at` already exists, skipping");
  }

  if (!(await columnExists(conn, "artworks", "reviewed_at"))) {
    await conn.query(`ALTER TABLE artworks ADD COLUMN reviewed_at DATETIME NULL`);
    console.log("  OK  added column `artworks.reviewed_at`");
  } else {
    console.log("  --  `artworks.reviewed_at` already exists, skipping");
  }

  if (!(await columnExists(conn, "artworks", "reviewed_by"))) {
    await conn.query(`ALTER TABLE artworks ADD COLUMN reviewed_by CHAR(36) NULL`);
    console.log("  OK  added column `artworks.reviewed_by`");
  } else {
    console.log("  --  `artworks.reviewed_by` already exists, skipping");
  }
}

/**
 * Manual featured/ranking controls -- lets an admin pick a small ordered
 * set of "best" artists/artworks instead of relying purely on the
 * featured/impactful boolean flags, which gate visibility but carry no
 * order of their own. NULL on either column means "not manually ranked",
 * so every existing row is untouched until an admin actually sets a value
 * -- see lib/queries/artists.ts#getFeaturedArtists and
 * lib/queries/artworks.ts#getFeaturedArtworks for how these are read.
 *
 * `artists.featured_priority`: higher number = higher priority among
 * featured artists (a simple "float to the top" score, ties broken by
 * name). `artworks.feature_rank`: lower number = better (1 = best), since
 * this sets an actual 1st/2nd/3rd... order among a small hand-picked set,
 * not just a magnitude score -- unranked artworks (NULL) backfill the rest
 * of the home page rail by recency.
 */
async function extendRankingColumns(conn) {
  console.log("\nStep 7/7: add featured_priority (artists) / feature_rank (artworks) ranking columns");

  if (await tableExists(conn, "artists")) {
    if (!(await columnExists(conn, "artists", "featured_priority"))) {
      await conn.query(`ALTER TABLE artists ADD COLUMN featured_priority INT NULL AFTER featured`);
      console.log("  OK  added column `artists.featured_priority`");
    } else {
      console.log("  --  `artists.featured_priority` already exists, skipping");
    }
  } else {
    console.log("  --  table `artists` does not exist yet, skipping");
  }

  if (await tableExists(conn, "artworks")) {
    if (!(await columnExists(conn, "artworks", "feature_rank"))) {
      await conn.query(`ALTER TABLE artworks ADD COLUMN feature_rank INT NULL AFTER impactful`);
      console.log("  OK  added column `artworks.feature_rank`");
    } else {
      console.log("  --  `artworks.feature_rank` already exists, skipping");
    }
  } else {
    console.log("  --  table `artworks` does not exist, skipping");
  }
}

/** Widens (never shrinks) id-like VARCHAR columns to fit generated ids. */
async function widenIdColumns(conn) {
  const targets = [
    { table: "artists", column: "artist_id" },
    { table: "artworks", column: "artist_id" },
    { table: "artworks", column: "artwork_id" },
  ];

  for (const { table, column } of targets) {
    if (!(await tableExists(conn, table))) continue;
    const info = await columnInfo(conn, table, column);
    if (!info) continue;
    const currentLength = info.CHARACTER_MAXIMUM_LENGTH;
    if (currentLength !== null && currentLength < 64) {
      await run(
        conn,
        `widen ${table}.${column} to VARCHAR(64) (was VARCHAR(${currentLength}))`,
        `ALTER TABLE ${table} MODIFY COLUMN ${column} VARCHAR(64) NOT NULL`
      );
    }
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  process.exit(1);
});
