import Link from "next/link";

import { CcDashboard } from "@/components/CcDashboard";
import { SignOutButton } from "@/components/SignOutButton";
import { requireCc } from "@/lib/current-user";
import { getRoster } from "@/lib/signups";

export const dynamic = "force-dynamic";

export default async function CcPage() {
  const user = await requireCc();
  // server loads the first roster then the client keeps refreshing it
  const roster = await getRoster();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b-2 border-slate-300 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">
                CC Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold">Live shuttle roster</h1>
              <p className="mt-2 text-sm text-slate-600">
                Signed in as {user.email}
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              <Link className="rounded bg-blue-900 px-3 py-2 text-white" href="/student">
                Student view
              </Link>
              <Link className="rounded bg-blue-900 px-3 py-2 text-white" href="/cc/history">
                History
              </Link>
              <SignOutButton />
            </nav>
          </div>
        </header>

        <CcDashboard initialRoster={JSON.parse(JSON.stringify(roster))} />
      </div>
    </main>
  );
}
