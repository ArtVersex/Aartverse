// Minimal .env.local loader with no external dependency (keeps db scripts
// runnable before `npm install` has pulled in anything extra, and works on
// any Node version — no reliance on `node --env-file`).
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadFile(file) {
  const full = path.join(root, file);
  if (!existsSync(full)) return;
  const text = readFileSync(full, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // strip matching surrounding quotes, if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// .env first, then .env.local overrides (mirrors Next.js precedence).
loadFile(".env");
loadFile(".env.local");

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill in real values.`
    );
  }
  return value;
}
