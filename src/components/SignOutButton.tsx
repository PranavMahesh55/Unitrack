"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  async function handleSignOut() {
    await fetch("/api/cc-test-logout", { method: "POST" }).catch(() => {});
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <button
      className="rounded border border-slate-300 px-3 py-2"
      onClick={handleSignOut}
      type="button"
    >
      Sign out
    </button>
  );
}
