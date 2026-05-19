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

// these test buttons are only for class testing not real auth
const TEST_ROLE_COOKIE = "unitrak_test_role";

export function ccTestLoginAllowed() {
  return process.env.ALLOW_CC_TEST_LOGIN !== "false";
}

export function studentTestLoginAllowed() {
  return process.env.ALLOW_STUDENT_TEST_LOGIN !== "false";
}

async function setTestLogin(role: UserRole) {
  const store = await cookies();
  // small cookie says which test dashboard to open
  store.set(TEST_ROLE_COOKIE, role, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
}

export async function setCcTestLogin() {
  await setTestLogin("cc");
}

export async function setStudentTestLogin() {
  await setTestLogin("student");
}

export async function clearTestLogins() {
  const store = await cookies();
  store.delete(TEST_ROLE_COOKIE);
}

async function getTestUser(): Promise<AppUser | null> {
  const store = await cookies();
  const role = store.get(TEST_ROLE_COOKIE)?.value as UserRole | undefined;

  if (role !== "student" && role !== "cc") {
    return null;
  }

  if (role === "cc" && !ccTestLoginAllowed()) {
    return null;
  }

  if (role === "student" && !studentTestLoginAllowed()) {
    return null;
  }

  const email = role === "cc" ? "test.cc@ncssm.edu" : "test.student@ncssm.edu";
  const name = role === "cc" ? "Test CC" : "Test Student";

  // creates fake users so we can click around if oauth is being annoying
  const user = await prisma.user.upsert({
    where: { email },
    update: { role, banned: false },
    create: {
      email,
      name,
      role,
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
    // real google login path
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

  return getTestUser();
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

  // cc pages should kick students back to their own dashboard
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
