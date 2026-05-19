import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

export type UserRole = "student" | "cc";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const googleAuthReady = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

export function ccEmailSet() {
  return new Set(
    (process.env.CC_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isNcssmEmail(email: string) {
  return email.toLowerCase().endsWith("@ncssm.edu");
}

export function roleForEmail(email: string): UserRole {
  return ccEmailSet().has(email.toLowerCase()) ? "cc" : "student";
}

async function syncRole(email: string) {
  const cleanEmail = email.toLowerCase();

  await prisma.user.updateMany({
    where: { email: cleanEmail },
    data: { role: roleForEmail(cleanEmail) },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret:
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    "rough-local-class-project-secret",
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  providers: googleAuthReady
    ? [
        GoogleProvider({
          clientId: GOOGLE_CLIENT_ID as string,
          clientSecret: GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();

      if (!email || !isNcssmEmail(email)) {
        return false;
      }

      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { banned: true },
      });

      if (dbUser?.banned) {
        return false;
      }

      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true, banned: true },
      });

      if (session.user) {
        session.user.id = user.id;
        session.user.role = (dbUser?.role ?? "student") as UserRole;
        session.user.banned = dbUser?.banned ?? false;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        await syncRole(user.email);
      }
    },
    async signIn({ user }) {
      if (user.email) {
        await syncRole(user.email);
      }
    },
  },
};
