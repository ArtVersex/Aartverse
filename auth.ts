import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import authConfig from "@/auth.config";
import { verifyPassword } from "@/lib/auth/password";
import {
  createUser,
  getUserByEmail,
  getUserById,
  isAccountLocked,
  registerFailedLogin,
  clearFailedLogins,
} from "@/lib/queries/users";
import {
  getAccountByProvider,
  linkAccount,
  createArtistProfileForUser,
} from "@/lib/queries/artistAccounts";
import { loginSchema } from "@/lib/validation/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await getUserByEmail(email);
        // Same failure path (return null) whether the account doesn't
        // exist, has no password (Google-only account), is locked, or the
        // password is wrong — avoids telegraphing which case it was.
        if (!user || !user.password_hash) return null;
        if (isAccountLocked(user)) return null;

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          await registerFailedLogin(user.id);
          return null;
        }

        await clearFailedLogins(user.id);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Google sign-in: create-or-link the local user, ALWAYS as role
     * "artist" and status "pending" for brand-new accounts. Admin status
     * only ever comes from the database (see scripts/create-admin.mjs) —
     * this callback never inspects the Google email/domain to decide role.
     */
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        let existing = await getUserByEmail(user.email);
        if (!existing) {
          existing = await createUser({
            name: user.name || user.email.split("@")[0],
            email: user.email,
            passwordHash: null,
            role: "artist",
            status: "pending",
            // Google has already verified this address.
            emailVerifiedAt: new Date(),
            image: user.image ?? null,
          });
          await createArtistProfileForUser(existing.id, existing.name);
        } else {
          const linked = await getAccountByProvider(
            "google",
            account.providerAccountId
          );
          if (!linked) {
            await linkAccount(existing.id, "google", account.providerAccountId);
          }
        }
        // Make sure downstream callbacks key off our own user id.
        user.id = existing.id;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        const dbUser = await getUserById(token.id as string);
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.artistId = dbUser.artist_id;
        }
      }
      return token;
    },
  },
});
