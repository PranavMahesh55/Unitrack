import Link from "next/link";

import { requireCc } from "@/lib/current-user";
import { getCcHistory } from "@/lib/signups";
import { formatTrainDate } from "@/lib/trains";

export const dynamic = "force-dynamic";

export default async function CcHistoryPage() {
  await requireCc();
  // shows runs and logs together so ccs can check what happened
  const { runs, logs } = await getCcHistory();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b-2 border-slate-300 pb-4">
          <Link className="text-sm font-bold text-blue-700" href="/cc">
            Back to CC dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold">History and Audit Log</h1>
          <p className="mt-2 text-sm text-slate-600">
            Rough record of shuttle departures and signup changes.
          </p>
        </header>

        <section className="mb-6 rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-4">
            <h2 className="text-lg font-bold">Shuttle Runs</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {runs.map((run) => (
              <div key={run.id} className="p-4 text-sm">
                <p className="font-bold">
                  Train {run.trainStop.trainNumber} · {run.status}
                </p>
                <p className="text-slate-600">
                  {formatTrainDate(run.trainStop.scheduledDeparture)}
                  {run.departedAt ? ` · departed ${formatTrainDate(run.departedAt)}` : ""}
                </p>
                {run.ccNotes ? <p className="mt-1 text-slate-600">{run.ccNotes}</p> : null}
              </div>
            ))}
            {runs.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No shuttle runs yet.</div>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-4">
            <h2 className="text-lg font-bold">Audit Log</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 text-sm">
                <p className="font-bold">{log.action}</p>
                <p className="text-slate-600">
                  {formatTrainDate(log.createdAt)} · {log.actor?.email ?? "system"} ·{" "}
                  {log.targetType} {log.targetId}
                </p>
                {log.metadata ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-xs">
                    {log.metadata}
                  </pre>
                ) : null}
              </div>
            ))}
            {logs.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No audit rows yet.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
