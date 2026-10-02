// Flags an EXISTING user as the super admin, directly against the database.
// Same "command-line only, no UI/API/URL path can grant this" philosophy as
// scripts/create-admin.mjs -- is_super_admin can never be set from the
// website, by anyone, including an existing admin. This is intentionally
// separate from create-admin.mjs rather than a flag on it, so promoting a
// regular admin (a routine, UI-reachable action once this script has run
// once -- see app/admin/admins/page.tsx) can never be confused with handing
// out super-admin status (a rare, deliberate, shell-only action).
//
// Usage:
//   npm run admin:promote-super -- someone@example.com
//
// The person must have already registered a normal account (email/password
// or Google) before running this. Also grants the regular 'admin' role and
// 'active' status, same as create-admin.mjs, so one command is enough to
// go from a fresh signup to a fully working super admin.

import "./_env.mjs";
import mysql from "mysql2/promise";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run admin:promote-super -- <email>");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const [rows] = await conn.query(
      `SELECT id, name, email, role, status, is_super_admin FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      console.error(
        `No user found for "${email}". Ask them to register an account first (email/password or Google), then run this again.`
      );
      process.exit(1);
    }

    const user = rows[0];

    if (user.is_super_admin) {
      console.log(`${user.email} is already the super admin.`);
      return;
    }

    const [existingSuperAdmins] = await conn.query(
      `SELECT email FROM users WHERE is_super_admin = 1`
    );
    if (existingSuperAdmins.length > 0) {
      console.warn(
        `Note: ${existingSuperAdmins.map((r) => r.email).join(", ")} is already flagged as super admin. ` +
          `Proceeding will give ${user.email} super-admin access too -- there is no limit of one enforced here, ` +
          `so demote the old one by hand (UPDATE users SET is_super_admin = 0 WHERE email = '...') if that's not intended.`
      );
    }

    await conn.query(
      `UPDATE users SET role = 'admin', status = 'active', is_super_admin = 1 WHERE id = ?`,
      [user.id]
    );

    console.log(`${user.email} (${user.name}) is now the super admin, with full admin access.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed to set super admin:", err.message);
  process.exit(1);
});
