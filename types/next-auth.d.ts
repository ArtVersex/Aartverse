import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      status?: UserStatus;
      artistId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    status?: UserStatus;
    artistId?: string | null;
  }
}
