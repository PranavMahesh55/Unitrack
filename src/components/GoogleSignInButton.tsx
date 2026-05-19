"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function GoogleSignInButton({ callbackUrl = "/student" }: { callbackUrl?: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    // nextauth needs this helper so google gets the right callback
    setLoading(true);
    await signIn("google", { callbackUrl });
    setLoading(false);
  }

  return (
    <button
      className="block w-full rounded-md bg-blue-900 px-4 py-3 text-center font-bold text-white disabled:opacity-50"
      disabled={loading}
      onClick={handleClick}
      type="button"
    >
      {loading ? "Opening Google..." : "Continue with Google"}
    </button>
  );
}
