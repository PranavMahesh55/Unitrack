"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton({ callbackUrl = "/student" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await signIn("google", { callbackUrl });
    setLoading(false);
  }

  return (
    <button
      className="block w-full rounded-md bg-blue-700 px-4 py-3 text-center font-bold text-white disabled:bg-blue-400"
      disabled={loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? "Opening Google..." : "Continue with Google"}
    </button>
  );
}
