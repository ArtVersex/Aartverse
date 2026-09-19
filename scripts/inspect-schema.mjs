// One-off diagnostic: prints every table in the database (row counts, data
// size, index size) plus each table's exact CREATE TABLE definition, so we
// can review the schema for cleanup/optimization opportunities. Safe,
// read-only -- makes no changes. Run with:
//
//   node scripts/inspect-schema.mjs

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
  });

  try {
    const [tables] = await conn.query(
      `SELECT
         TABLE_NAME AS name,
         TABLE_ROWS AS approxRows,
         ROUND(DATA_LENGTH / 1024, 1) AS dataKb,
         ROUND(INDEX_LENGTH / 1024, 1) AS indexKb,
         ENGINE AS engine
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME ASC`,
      [DB_NAME]
    );

    console.log(`\n===== Tables in "${DB_NAME}" (${tables.length}) =====`);
    console.table(tables);

    for (const t of tables) {
      const [rows] = await conn.query(`SHOW CREATE TABLE \`${t.name}\``);
      console.log(`\n===== ${t.name} =====`);
      console.log(rows[0]["Create Table"]);
    }

    console.log("\n===== Foreign keys referencing / referenced by anything =====");
    const [fks] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME, COLUMN_NAME`,
      [DB_NAME]
    );
    console.table(fks);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
