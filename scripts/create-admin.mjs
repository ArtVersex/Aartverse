// Safely promotes an EXISTING user to the admin role, directly against the
// database. This is intentionally a command-line-only operation — there is
// no UI, API route, or URL parameter anywhere in the app that can grant
// admin — so promoting someone always requires shell access to the server
// (or database).
//
// Usage:
//   npm run admin:promote -- someone@example.com
//
// The person must have already registered a normal account (email/password
// or Google) before running this — it only flips their existing row.

import "./_env.mjs";
import mysql from "mysql2/promise";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run admin:promote -- <email>");
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
      `SELECT id, name, email, role, status FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      console.error(
        `No user found for "${email}". Ask them to register an account first (email/password or Google), then run this again.`
      );
      process.exit(1);
    }

    const user = rows[0];

    if (user.role === "admin") {
      console.log(`${user.email} is already an admin.`);
      return;
    }

    await conn.query(
      `UPDATE users SET role = 'admin', status = 'active' WHERE id = ?`,
      [user.id]
    );

    console.log(`Promoted ${user.email} (${user.name}) to admin.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed to promote user:", err.message);
  process.exit(1);
});
