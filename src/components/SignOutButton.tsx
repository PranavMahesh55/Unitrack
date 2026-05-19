"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  async function handleSignOut() {
    await fetch("/api/cc-test-logout", { method: "POST" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button
      className="rounded bg-blue-900 px-3 py-2 text-white"
      onClick={handleSignOut}
      type="button"
    >
      Sign out
    </button>
  );
}
