import { formatTrainDate, getTrains } from "@/lib/trains";

export const dynamic = "force-dynamic";

export default async function Home() {
  const trains = await getTrains(process.env.TRAIN_STATION_CODE ?? "DNC");

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 border-b-2 border-slate-300 pb-4">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Server Side Final Project
          </p>
          <h1 className="mt-1 text-3xl font-bold">Unitrak Train Schedule Lab</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            This page shows the backend part of the project: pulling train
            schedule data for the Durham Amtrak station and saving it in SQLite.
          </p>
        </header>

        <section className="mb-5 rounded-md border border-slate-300 bg-white p-4">
          <h2 className="text-lg font-bold">What This Part Does</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Downloads the official Amtrak GTFS schedule feed.</li>
            <li>Finds upcoming trains that stop at Durham station DNC.</li>
            <li>Saves the train rows in a SQLite database with Prisma.</li>
            <li>Shows the saved trains below and through `/api/trains`.</li>
          </ul>
        </section>

        <section className="rounded-md border border-slate-300 bg-white">
          <div className="border-b border-slate-300 p-4">
            <h2 className="text-lg font-bold">Upcoming DNC Departures</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-2">Train</th>
                  <th className="border-b border-slate-200 px-4 py-2">Route</th>
                  <th className="border-b border-slate-200 px-4 py-2">
                    Destination
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2">
                    Departure
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {trains.map((train) => (
                  <tr key={train.id}>
                    <td className="border-b border-slate-100 px-4 py-2 font-bold">
                      {train.trainNumber}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-2">
                      {train.routeName ?? "Amtrak"}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-2">
                      {train.destination}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-2">
                      {formatTrainDate(train.scheduledDeparture)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-2">
                      {train.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {trains.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No trains are loaded yet. Run `npm run sync:trains` while the dev
                server is running.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
