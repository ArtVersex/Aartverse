import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config: no database access, no Node-only APIs. This is
 * what middleware.ts runs (Next.js middleware executes on the Edge
 * runtime). The full config — Credentials/Google providers, DB-backed
 * callbacks — lives in auth.ts and is only ever used from Node.js route
 * handlers, Server Components, and Server Actions.
 *
 * Middleware here is a coarse, fast first gate (logged in? admin role?).
 * It is NOT the source of truth for authorization — every real decision
 * (pending vs active vs suspended, artwork ownership, admin actions) is
 * re-checked against the database in lib/auth/session.ts and the server
 * actions themselves. See AUTH_SETUP.md.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  // Required for Auth.js v5 on a self-hosted Node server (not Vercel),
  // where the deployment URL isn't auto-detected the same way.
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = token.role as "artist" | "admin" | undefined;
        session.user.status = token.status as
          | "pending"
          | "active"
          | "suspended"
          | undefined;
        session.user.artistId = (token.artistId as string | null) ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith("/admin")) {
        return isLoggedIn && auth?.user?.role === "admin";
      }
      if (pathname.startsWith("/artist")) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;
