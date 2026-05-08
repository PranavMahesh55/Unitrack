# Unitrak Schedule Lab

This is the backend/schedule part of the Unitrak final project. It is intentionally small because the login, signup flow, Redis work, and CC dashboard are being made by other group members.

## What This Lab Does

- Uses Next.js for the web page and API routes.
- Uses Prisma with SQLite to store train departures.
- Downloads Amtrak's official GTFS schedule feed.
- Finds upcoming trains at Durham station `DNC`.
- Shows those trains on the homepage and at `/api/trains`.
- Uses a tiny demo schedule only if the GTFS download fails.

## Files To Look At

- `src/app/page.tsx` - simple table page for the train schedule
- `src/app/api/trains/route.ts` - API route that returns trains
- `src/app/api/jobs/sync-trains/route.ts` - API route that refreshes the database
- `src/lib/trains.ts` - the main train-fetching code
- `prisma/schema.prisma` - the SQLite table

## Setup

```bash
npm install
npm run prisma:generate
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Environment

```bash
DATABASE_URL="file:./dev.db"
TRAIN_STATION_CODE="DNC"
```

## API Testing

Get trains:

```bash
curl http://localhost:3000/api/trains
```

Force the app to download the GTFS feed again:

```bash
curl "http://localhost:3000/api/trains?sync=1"
```

Run the sync job endpoint:

```bash
curl -X POST http://localhost:3000/api/jobs/sync-trains
```

## Note

If your local database has old tables from an earlier version, that is okay for running the app. For a clean lab database, stop the dev server, delete `dev.db`, and run the app again.
