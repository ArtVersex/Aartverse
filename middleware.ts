import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Coarse-grained route gate, running on the Edge runtime. Redirects
 * unauthenticated users away from /artist/* and /admin/* (and non-admins
 * away from /admin/*) before a page even renders — see authConfig's
 * `authorized` callback for the actual rule. This is a fast first line of
 * defense only: every protected page/action independently re-verifies
 * against the database (see lib/auth/session.ts), so this middleware being
 * coarse or briefly stale is never a security hole by itself.
 */
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ["/artist/:path*", "/admin/:path*"],
};
