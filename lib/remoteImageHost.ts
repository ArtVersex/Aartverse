import "server-only";
import { Client as FtpClient } from "basic-ftp";
import { Readable } from "node:stream";

/**
 * Optional remote image hosting over FTP. When the IMAGE_FTP_* env vars are
 * not fully configured, every function here is unused and lib/uploads.ts
 * falls back to storing files on this app's own local disk (public/uploads).
 *
 * This exists because the site's real catalogue images are served from a
 * separate static host (public_html/images/... on Hostinger) that this
 * Next.js app cannot reach as a local filesystem — it's a different server.
 * Pushing new artist-uploaded images there over FTP keeps them alongside
 * the existing catalogue and viewable the same way.
 */

export interface RemoteHostConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  /** Remote directory (relative to the FTP account's root) that new images
   *  are uploaded under, e.g. "/images". */
  remoteDir: string;
  /** Public base URL that serves that same directory, e.g.
   *  "https://springgreen-antelope-607895.hostingersite.com/images". No
   *  trailing slash. */
  publicBaseUrl: string;
}

let cachedConfig: RemoteHostConfig | null | undefined;

/**
 * Reads the IMAGE_FTP_* env vars. Returns null (and caches that result) if
 * any required value is missing, so callers can cleanly fall back to local
 * disk storage instead of every upload throwing.
 */
export function getRemoteHostConfig(): RemoteHostConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const host = process.env.IMAGE_FTP_HOST;
  const user = process.env.IMAGE_FTP_USER;
  const password = process.env.IMAGE_FTP_PASSWORD;
  const publicBaseUrl = process.env.IMAGE_PUBLIC_BASE_URL;

  if (!host || !user || !password || !publicBaseUrl) {
    cachedConfig = null;
    return null;
  }

  cachedConfig = {
    host,
    port: Number(process.env.IMAGE_FTP_PORT || 21),
    user,
    password,
    secure: process.env.IMAGE_FTP_SECURE === "true",
    remoteDir: (process.env.IMAGE_FTP_REMOTE_DIR || "/images").replace(/\/+$/, ""),
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
  return cachedConfig;
}

// basic-ftp's default control-socket timeout is 30s, which some shared
// hosting FTP servers can occasionally exceed under normal load (slow
// directory creation, a brief connection-limit throttle right after a
// previous session closed, etc.) even when the account/credentials are
// perfectly fine. 60s gives real transfers more room without hanging
// forever on a genuinely dead connection.
const CONTROL_SOCKET_TIMEOUT_MS = 60_000;

async function withFtpClient<T>(fn: (client: FtpClient) => Promise<T>): Promise<T> {
  const config = getRemoteHostConfig();
  if (!config) {
    throw new Error("Remote image host is not configured (IMAGE_FTP_* env vars missing).");
  }

  const client = new FtpClient(CONTROL_SOCKET_TIMEOUT_MS);
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      secure: config.secure,
    });
    return await fn(client);
  } finally {
    client.close();
  }
}

/**
 * Retries a flaky FTP operation with a brand-new connection: a control- or
 * data-socket timeout is usually a transient hiccup (a momentary network
 * blip, or a shared host briefly throttling back-to-back connections) and
 * a fresh attempt often just works. Not used for anything that already
 * has its own best-effort swallow (see deleteImageOverFtp) beyond this.
 *
 * `onRetry`, when given, runs once between a failed attempt and the next
 * one — see uploadImageOverFtp's use of it to clean up a stale hidden
 * upload file before trying again. Its own failures are logged and
 * swallowed: a cleanup step must never replace the real error with one of
 * its own, and the next attempt should still go ahead either way.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 2,
  delayMs = 2000,
  onRetry?: (err: unknown) => Promise<void>
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        console.error(
          `[remoteImageHost] attempt ${attempt}/${attempts} failed, retrying: ${
            err instanceof Error ? err.message : err
          }`
        );
        if (onRetry) {
          try {
            await onRetry(err);
          } catch (cleanupErr) {
            console.error(
              `[remoteImageHost] cleanup before retry failed (continuing anyway): ${
                cleanupErr instanceof Error ? cleanupErr.message : cleanupErr
              }`
            );
          }
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

/** The hidden staging name this FTP server (Pure-FTPd, in "safe uploads"
 *  mode) uploads a file to before atomically renaming it to the real
 *  filename on success — see uploadImageOverFtp's comment for why this
 *  matters. Deterministic: no random component, just this fixed prefix. */
function hiddenUploadName(filename: string): string {
  return `.in.${filename}`;
}

/**
 * Uploads bytes to `<remoteDir>/<relativePath>` over FTP, creating any
 * intermediate directories as needed. Uploading to a path that already
 * exists overwrites it in place — this is how "stable filename, replace
 * in place" avoids ever duplicating files on the remote host.
 */
export async function uploadImageOverFtp(bytes: Buffer, relativePath: string): Promise<void> {
  const config = getRemoteHostConfig();
  if (!config) {
    throw new Error("Remote image host is not configured (IMAGE_FTP_* env vars missing).");
  }

  const segments = relativePath.split("/").filter(Boolean);
  const filename = segments.pop();
  if (!filename) {
    throw new Error(`Invalid remote image path: "${relativePath}"`);
  }
  const targetDir = [config.remoteDir, ...segments].join("/");

  await withRetry(
    () =>
      withFtpClient(async (client) => {
        // ensureDir() accepts a multi-segment path and creates every missing
        // directory along the way (like `mkdir -p`), leaving the client's
        // working directory positioned inside it.
        await client.ensureDir(targetDir);
        // Readable.from(bytes) can only be consumed once, so a retry needs a
        // fresh stream each attempt -- hence this whole callback (including
        // the Readable.from call) re-runs per attempt rather than being
        // built once outside withRetry.
        await client.uploadFrom(Readable.from(bytes), filename);
      }),
    // 3 attempts rather than 2: the first retry's job is often just to
    // clean up after the previous attempt (see onRetry below), so a
    // genuinely flaky connection still gets a real second shot at the
    // upload itself, not just a cleanup pass.
    3,
    2000,
    async () => {
      // This server (Pure-FTPd, "safe uploads") stores an in-progress
      // upload under a hidden name (".in.<filename>") and only renames it
      // to the real filename once the transfer completes successfully. If
      // an attempt dies mid-transfer -- a control-socket timeout, most
      // often -- the client side gives up and closes its connection, but
      // the server can be left holding that hidden file open on its side.
      // The next attempt's STOR for the same filename then collides with
      // it and fails immediately with "550 ...: Temporary hidden file
      // .../.in.<filename>. already exists" -- turning one transient
      // timeout into a guaranteed failure on every retry, forever, since
      // nothing ever removed the leftover file. Deleting it here, before
      // the next attempt, is what actually lets a retry succeed.
      await withFtpClient(async (client) => {
        await client.cd(targetDir);
        await client.remove(hiddenUploadName(filename));
      });
    }
  );
}

/**
 * Deletes `<remoteDir>/<relativePath>` over FTP. Best-effort: a file that's
 * already gone is not an error (mirrors deleteManagedImage's local-disk
 * behavior), since cleanup here is never allowed to fail a mutation.
 */
export async function deleteImageOverFtp(relativePath: string): Promise<void> {
  const config = getRemoteHostConfig();
  if (!config) return;

  try {
    await withRetry(() =>
      withFtpClient(async (client) => {
        await client.cd(config.remoteDir);
        await client.remove(relativePath.replace(/^\/+/, ""));
      })
    );
  } catch (err) {
    // basic-ftp throws on a missing file too (no distinct ENOENT-style
    // code) — log and swallow rather than let cleanup break a mutation.
    console.error(`[remoteImageHost] failed to delete ${relativePath}:`, err instanceof Error ? err.message : err);
  }
}

/** True when `url` points at a file this app manages on the remote host
 *  (as opposed to a legacy/imported catalogue URL on the same host, or a
 *  totally unrelated URL) — used to decide whether deleteManagedImage()
 *  is allowed to remove it. */
export function isManagedRemoteImageUrl(url: string): boolean {
  const config = getRemoteHostConfig();
  if (!config) return false;
  return url.startsWith(`${config.publicBaseUrl}/`);
}

/** Strips the public base URL off a managed remote image URL, returning
 *  the path relative to `remoteDir` (e.g. "artworks/<id>.webp"). Callers
 *  must check isManagedRemoteImageUrl() first. */
export function relativePathFromManagedUrl(url: string): string {
  const config = getRemoteHostConfig();
  if (!config) {
    throw new Error("Remote image host is not configured (IMAGE_FTP_* env vars missing).");
  }
  return url.slice(`${config.publicBaseUrl}/`.length);
}
