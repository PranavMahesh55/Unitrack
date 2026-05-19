"use client";

import { useCallback, useEffect, useState } from "react";

type RosterUser = {
  name: string | null;
  email: string | null;
};

type RosterSignup = {
  id: string;
  status: string;
  createdAt: string;
  user: RosterUser;
};

type RosterTrain = {
  id: string;
  trainNumber: string;
  routeName: string | null;
  destination: string;
  scheduledDeparture: string;
  estimatedDeparture: string | null;
  delayMinutes: number;
  signups: RosterSignup[];
  shuttleRun: {
    id: string;
    status: string;
    departedAt: string | null;
    ccNotes: string | null;
  } | null;
};

type Roster = {
  dateText: string;
  trains: RosterTrain[];
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "picked_up") return "bg-green-100 text-green-800";
  if (status === "boarded") return "bg-blue-100 text-blue-800";
  if (status === "no_show") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-800";
}

export function CcDashboard({ initialRoster }: { initialRoster: Roster }) {
  const [roster, setRoster] = useState(initialRoster);
  const [loading, setLoading] = useState(false);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/cc/roster?date=${roster.dateText}`);
    const data = await response.json();
    setRoster(data);
    setLoading(false);
  }, [roster.dateText]);

  async function updateSignup(id: string, status: string) {
    await fetch(`/api/signups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadRoster();
  }

  async function markDeparted(trainStopId: string) {
    const ccNotes = window.prompt("CC notes for this shuttle run?") ?? "";
    await fetch(`/api/cc/runs/${trainStopId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ccNotes }),
    });
    await loadRoster();
  }

  useEffect(() => {
    // when events come in reload roster instead of refreshing whole page
    const source = new EventSource("/api/events");
    source.onmessage = () => loadRoster();
    source.addEventListener("signup.changed", () => loadRoster());
    source.addEventListener("run.changed", () => loadRoster());
    source.addEventListener("trains.synced", () => loadRoster());

    return () => source.close();
  }, [loadRoster]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Date: <span className="font-bold">{roster.dateText}</span>
          {loading ? " (refreshing)" : ""}
        </p>
        <button
          className="rounded bg-blue-900 px-3 py-2 text-sm font-bold text-white"
          onClick={loadRoster}
        >
          Refresh
        </button>
      </div>

      {roster.trains.length === 0 ? (
        <div className="rounded border border-slate-300 bg-white p-4 text-sm text-slate-600">
          No train groups for this date yet. Sync trains or create a student signup.
        </div>
      ) : null}

      {roster.trains.map((train) => (
        <section key={train.id} className="rounded-md border border-slate-300 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="text-lg font-bold">
                Train {train.trainNumber} to {train.destination}
              </h2>
              <p className="text-sm text-slate-600">
                Leaves DNC at {formatTime(train.scheduledDeparture)} ·{" "}
                {train.routeName ?? "Amtrak"} · {train.signups.length} students
              </p>
            </div>
            <button
              className="rounded bg-blue-900 px-3 py-2 text-sm font-bold text-white"
              onClick={() => markDeparted(train.id)}
            >
              Mark van departed
            </button>
          </div>

          {train.shuttleRun?.status === "departed" ? (
            <div className="border-b border-slate-200 bg-green-50 px-4 py-2 text-sm text-green-900">
              Van departed
              {train.shuttleRun.departedAt
                ? ` at ${formatTime(train.shuttleRun.departedAt)}`
                : ""}
              {train.shuttleRun.ccNotes ? ` · ${train.shuttleRun.ccNotes}` : ""}
            </div>
          ) : null}

          <div className="divide-y divide-slate-100">
            {train.signups.map((signup) => (
              <div
                key={signup.id}
                className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-bold">{signup.user.name ?? "Unnamed student"}</p>
                  <p className="text-slate-500">{signup.user.email}</p>
                  <span
                    className={`mt-2 inline-block rounded px-2 py-1 text-xs font-bold ${statusClass(
                      signup.status,
                    )}`}
                  >
                    {signup.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded bg-blue-900 px-3 py-2 font-bold text-white"
                    onClick={() => updateSignup(signup.id, "picked_up")}
                  >
                    Picked up
                  </button>
                  <button
                    className="rounded bg-blue-900 px-3 py-2 font-bold text-white"
                    onClick={() => updateSignup(signup.id, "no_show")}
                  >
                    No-show
                  </button>
                </div>
              </div>
            ))}

            {train.signups.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No students signed up.</div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
