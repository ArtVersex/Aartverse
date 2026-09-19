// One-off diagnostic: checks whether remote (FTP) image hosting is fully
// configured and actually reachable/writable, WITHOUT ever printing your
// FTP host/username/password back to the terminal. Run this on your own
// machine (not through any AI tool) after editing .env.local, so nothing
// here ever needs to be pasted into a chat -- share only the printed
// summary lines if you need help, never raw credential values.
//
//   node scripts/test-image-host.mjs
//
// This does three things, in order:
//   1. Checks the required IMAGE_FTP_*/IMAGE_PUBLIC_BASE_URL env vars are
//      all present (mirrors lib/remoteImageHost.ts's getRemoteHostConfig()
//      exactly -- if any one is missing, uploads silently fall back to
//      local disk instead of using FTP).
//   2. Connects over FTP and lists what's actually at IMAGE_FTP_REMOTE_DIR
//      (and the account's root, for comparison) so you can confirm it's
//      really pointing at the same place public_html/images is.
//   3. Uploads a small harmless test file, confirms it's there, then
//      deletes it again -- proving write + delete access end-to-end.

import "./_env.mjs";
import { Client } from "basic-ftp";
import { Readable } from "node:stream";

const REQUIRED = [
  "IMAGE_FTP_HOST",
  "IMAGE_FTP_USER",
  "IMAGE_FTP_PASSWORD",
  "IMAGE_PUBLIC_BASE_URL",
];

function checkConfig() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  console.log("===== 1. Config check =====");
  for (const k of REQUIRED) {
    console.log(`  ${k}: ${process.env[k] ? "set" : "MISSING"}`);
  }
  console.log(`  IMAGE_FTP_PORT: ${process.env.IMAGE_FTP_PORT || "(default 21)"}`);
  console.log(`  IMAGE_FTP_SECURE: ${process.env.IMAGE_FTP_SECURE || "(default false)"}`);
  console.log(`  IMAGE_FTP_REMOTE_DIR: ${process.env.IMAGE_FTP_REMOTE_DIR || "(default /images)"}`);
  if (missing.length > 0) {
    console.log(
      `\nRemote image hosting is currently INACTIVE -- missing: ${missing.join(", ")}.\n` +
        "Uploads are silently falling back to local disk (public/uploads/) until every\n" +
        "one of these is set in .env.local AND the server has been restarted.\n"
    );
    process.exit(1);
  }
  console.log("\nAll required vars are present.\n");
}

async function main() {
  checkConfig();

  const host = process.env.IMAGE_FTP_HOST;
  const port = Number(process.env.IMAGE_FTP_PORT || 21);
  const user = process.env.IMAGE_FTP_USER;
  const password = process.env.IMAGE_FTP_PASSWORD;
  const secure = process.env.IMAGE_FTP_SECURE === "true";
  const remoteDir = (process.env.IMAGE_FTP_REMOTE_DIR || "/images").replace(/\/+$/, "");

  const client = new Client(15000);
  try {
    console.log("===== 2. Connecting =====");
    await client.access({ host, port, user, password, secure });
    console.log("Connected and logged in OK.\n");

    const rootList = await client.list(".");
    console.log("Contents of the FTP account's ROOT (what you land in right after login):");
    for (const f of rootList) console.log(`  ${f.isDirectory ? "[dir] " : "      "}${f.name}`);
    console.log("");

    console.log(`Attempting to reach IMAGE_FTP_REMOTE_DIR ("${remoteDir}")...`);
    try {
      const dirList = await client.list(remoteDir);
      console.log(`Found it. Contents of "${remoteDir}":`);
      for (const f of dirList.slice(0, 30)) console.log(`  ${f.isDirectory ? "[dir] " : "      "}${f.name}`);
      if (dirList.length > 30) console.log(`  ... and ${dirList.length - 30} more`);
      console.log("");
      console.log(
        `If this list does NOT look like the same "images" folder you see in Hostinger's\n` +
          `hPanel File Manager (the one containing artworks/ with your existing catalogue\n` +
          `images), IMAGE_FTP_REMOTE_DIR is pointed at the wrong place -- compare against\n` +
          `the ROOT listing above and adjust it in .env.local.\n`
      );
    } catch (err) {
      console.log(`Could NOT list "${remoteDir}": ${err.message}`);
      console.log(
        "This usually means the path doesn't exist yet from this FTP account's root, or\n" +
          "is spelled differently than expected. Compare against the ROOT listing above.\n"
      );
    }

    console.log("===== 3. Write test =====");
    const testName = ".artverse-ftp-write-test.txt";
    const testPath = `${remoteDir}/${testName}`;
    try {
      await client.ensureDir(remoteDir);
      await client.uploadFrom(Readable.from(Buffer.from("artverse ftp test\n")), testName);
      console.log(`Uploaded a test file to "${testPath}".`);
      const confirmList = await client.list(".");
      const found = confirmList.some((f) => f.name === testName);
      console.log(found ? "Confirmed it's there." : "Uploaded, but couldn't confirm it in the listing.");
      await client.remove(testName);
      console.log("Deleted the test file again -- write + delete access both confirmed.\n");
      console.log("RESULT: FTP hosting is fully working from this connection.");
    } catch (err) {
      console.log(`Write test FAILED: ${err.message}`);
      console.log(
        "This is almost always a permissions issue on that directory for this FTP\n" +
          "account, or the directory not existing and the account not being allowed to\n" +
          "create it. Check the folder's permissions in hPanel's File Manager.\n"
      );
    }
  } catch (err) {
    console.log(`\nCould not connect/log in: ${err.message}`);
    console.log(
      "Double-check IMAGE_FTP_HOST/PORT/USER/PASSWORD/SECURE in .env.local against\n" +
        "Hostinger's hPanel -> Files -> FTP Accounts. If you rotated the password\n" +
        "recently, make sure .env.local has the NEW one and the server was restarted.\n"
    );
  } finally {
    client.close();
  }
}

main();
