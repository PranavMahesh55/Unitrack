import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import { StudentSignupControls } from "@/components/StudentSignupControls";
import { requireUser } from "@/lib/current-user";
import { getStudentSignups } from "@/lib/signups";
import { formatTrainDate, getTrains } from "@/lib/trains";

export const dynamic = "force-dynamic";

const liveStatuses = new Set(["active", "boarded", "picked_up"]);

export default async function StudentPage() {
  const user = await requireUser();
  const [trains, signups] = await Promise.all([
    getTrains(process.env.TRAIN_STATION_CODE ?? "DNC"),
    getStudentSignups(user.id),
  ]);
  const signupByTrain = new Map(
    signups
      .filter((signup) => liveStatuses.has(signup.status))
      .map((signup) => [signup.trainStopId, signup]),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b-2 border-slate-300 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">
                Student Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold">Unitrak</h1>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as {user.email}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded border border-slate-300 px-3 py-2" href="/">
                Home
              </Link>
              {user.role === "cc" ? (
                <Link className="rounded border border-slate-300 px-3 py-2" href="/cc">
                  CC view
                </Link>
              ) : null}
              <SignOutButton />
            </nav>
          </div>
        </header>

        <section className="mb-6 rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-4">
            <h2 className="text-lg font-bold">Upcoming Durham Departures</h2>
            <p className="text-sm text-slate-500">
              Rough flow: choose the train, then CCs see you in their roster.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {trains.map((train) => {
              const signup = signupByTrain.get(train.id);

              return (
                <div
                  key={train.id}
                  className="grid gap-3 p-4 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-bold">
                      Train {train.trainNumber} to {train.destination}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatTrainDate(train.scheduledDeparture)} ·{" "}
                      {train.routeName ?? "Amtrak"} · {train.source}
                    </p>
                  </div>
                  <StudentSignupControls
                    trainStopId={train.id}
                    signupId={signup?.id}
                    status={signup?.status}
                  />
                </div>
              );
            })}

            {trains.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                No trains loaded. Run `npm run sync:trains`.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-4">
            <h2 className="text-lg font-bold">My Trip History</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {signups.map((signup) => (
              <Link
                key={signup.id}
                className="block p-4 hover:bg-slate-50"
                href={`/student/trips/${signup.id}`}
              >
                <p className="font-bold">
                  Train {signup.trainStop.trainNumber} · {signup.status}
                </p>
                <p className="text-sm text-slate-600">
                  {formatTrainDate(signup.trainStop.scheduledDeparture)} to{" "}
                  {signup.trainStop.destination}
                </p>
              </Link>
            ))}
            {signups.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">No signups yet.</div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
