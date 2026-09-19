// nodemailer 7.x ships no bundled TypeScript declarations, and there is no
// @types/nodemailer release compatible with its v7 API yet. This ambient
// module declaration silences the resulting "Cannot find module" build
// error by typing the whole package (and its `Transporter` type) as `any`
// — it's only imported from lib/email/mailer.ts, a server-only module
// never exposed to the client, so the loss of type-checking here is
// low-risk. Safe to delete once a compatible @types/nodemailer (or
// nodemailer's own types) is available — just re-run `npx tsc --noEmit`
// afterward to confirm it's no longer needed.
declare module "nodemailer" {
  const nodemailer: any;
  export default nodemailer;
  export type Transporter = any;
}
