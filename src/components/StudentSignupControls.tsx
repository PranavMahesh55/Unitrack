"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  trainStopId: string;
  signupId?: string | null;
  status?: string | null;
};

export function StudentSignupControls({ trainStopId, signupId, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function callApi(url: string, body: unknown, method = "PATCH") {
    setBusy(true);
    setMessage("");

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error ?? "Something went wrong.");
    } else {
      router.refresh();
    }

    setBusy(false);
  }

  if (!signupId || status === "cancelled" || status === "no_show") {
    return (
      <div>
        <button
          className="rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            callApi("/api/signups", { trainStopId }, "POST")
          }
        >
          Sign up
        </button>
        {message ? <p className="mt-2 text-xs text-red-700">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "active" ? (
        <button
          className="rounded bg-green-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() =>
            callApi(`/api/signups/${signupId}`, { status: "boarded" })
          }
        >
          I boarded
        </button>
      ) : null}
      <button
        className="rounded border border-slate-300 px-3 py-2 text-sm font-bold disabled:opacity-50"
        disabled={busy}
        onClick={() =>
          callApi(`/api/signups/${signupId}`, { status: "cancelled" })
        }
      >
        Cancel
      </button>
      <span className="text-xs text-slate-500">Current: {status}</span>
      {message ? <p className="basis-full text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
