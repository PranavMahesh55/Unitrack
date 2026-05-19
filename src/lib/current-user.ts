import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions, type UserRole } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export type AppUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  banned: boolean;
};

const CC_TEST_COOKIE = "unitrak_cc_test";

export function ccTestLoginAllowed() {
  return process.env.ALLOW_CC_TEST_LOGIN !== "false";
}

export async function setCcTestLogin() {
  const store = await cookies();
  store.set(CC_TEST_COOKIE, "true", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function clearCcTestLogin() {
  const store = await cookies();
  store.delete(CC_TEST_COOKIE);
}

async function getCcTestUser(): Promise<AppUser | null> {
  if (!ccTestLoginAllowed()) {
    return null;
  }

  const enabled = (await cookies()).get(CC_TEST_COOKIE)?.value === "true";

  if (!enabled) {
    return null;
  }

  const user = await prisma.user.upsert({
    where: { email: "test.cc@ncssm.edu" },
    update: { role: "cc", banned: false },
    create: {
      email: "test.cc@ncssm.edu",
      name: "Test CC",
      role: "cc",
      banned: false,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role as UserRole,
    banned: user.banned,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.banned) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role as UserRole,
      banned: user.banned,
    };
  }

  return getCcTestUser();
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireCc() {
  const user = await requireUser();

  if (user.role !== "cc") {
    redirect("/student");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, error: "Please sign in first.", status: 401 as const };
  }

  return { user, error: null, status: 200 as const };
}

export async function requireApiCc() {
  const result = await requireApiUser();

  if (!result.user) {
    return result;
  }

  if (result.user.role !== "cc") {
    return { user: null, error: "CC access only.", status: 403 as const };
  }

  return { user: result.user, error: null, status: 200 as const };
}
