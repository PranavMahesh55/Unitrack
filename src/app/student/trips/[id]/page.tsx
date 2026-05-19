import Link from "next/link";
import { notFound } from "next/navigation";

import { StudentSignupControls } from "@/components/StudentSignupControls";
import { requireUser } from "@/lib/current-user";
import { getTripForUser } from "@/lib/signups";
import { formatTrainDate } from "@/lib/trains";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function TripPage({ params }: Params) {
  const user = await requireUser();
  const { id } = await params;
  // this also checks that students only see their own trip
  const signup = await getTripForUser(user, id);

  if (!signup) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-md border border-slate-300 bg-white p-5">
        <Link className="text-sm font-bold text-blue-700" href="/student">
          Back to dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold">
          Train {signup.trainStop.trainNumber}
        </h1>
        <p className="mt-2 text-slate-600">
          {signup.trainStop.routeName ?? "Amtrak"} to {signup.trainStop.destination}
        </p>
        <dl className="mt-6 grid gap-3 text-sm">
          <div>
            <dt className="font-bold">Departure</dt>
            <dd>{formatTrainDate(signup.trainStop.scheduledDeparture)}</dd>
          </div>
          <div>
            <dt className="font-bold">Current signup status</dt>
            <dd>{signup.status}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <StudentSignupControls
            trainStopId={signup.trainStopId}
            signupId={signup.id}
            status={signup.status}
          />
        </div>
      </div>
    </main>
  );
}
