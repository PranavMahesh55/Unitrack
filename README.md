# Unitrak Server Side Final

Unitrak is a rough class-project version of an NCSSM Amtrak shuttle tracker. It lets students see upcoming trains at Durham station `DNC`, sign up for a shuttle, cancel, or say they boarded. CCs have a simple live roster where they can mark students picked up, no-show, and mark a van as departed.

## What This Project Does

- Uses Next.js for the web page and API routes.
- Uses Prisma with SQLite to store train departures.
- Downloads Amtrak's official GTFS schedule feed.
- Finds upcoming trains at Durham station `DNC`.
- Has a Google OAuth setup through NextAuth.
- Lets students create and update shuttle signups.
- Gives CCs a roster grouped by train.
- Includes a temporary CC test button for class demos.
- Uses Redis for cache/pub-sub if Redis is running.
- Falls back to an in-memory cache/events system if Redis is not running.
- Saves audit log rows for important actions.

## Files To Look At

- `src/app/page.tsx` - simple project home page
- `src/app/login/page.tsx` - Google login page
- `src/app/student/page.tsx` - student train list and signup page
- `src/app/cc/page.tsx` - CC live roster page
- `src/app/api/trains/route.ts` - API route that returns trains
- `src/app/api/signups/route.ts` - API route for creating signups
- `src/app/api/events/route.ts` - Server-Sent Events route
- `src/app/api/jobs/sync-trains/route.ts` - API route that refreshes the database
- `src/lib/trains.ts` - the main train-fetching code
- `src/lib/signups.ts` - signup and CC action code
- `src/lib/current-user.ts` - login helpers
- `src/lib/live.ts` - Redis plus in-memory fallback
- `prisma/schema.prisma` - the SQLite models

## Setup

```bash
npm install
npm run prisma:generate
npx prisma db push
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
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="rough-local-dev-secret"
```

Optional Google OAuth keys:

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
CC_EMAILS="cc1@ncssm.edu,cc2@ncssm.edu"
ALLOW_CC_TEST_LOGIN="true"
```

Optional Redis:

```bash
REDIS_URL="redis://localhost:6379"
```

You can start Redis with Docker:

```bash
docker run --name unitrak-redis -p 6379:6379 -d redis:7
```

If Redis is not running, remove `REDIS_URL` from `.env` for the quietest local run.

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

If your local database has old tables from an earlier version, run `npx prisma db push`. If the native SQLite package complains about `NODE_MODULE_VERSION`, run `npm rebuild better-sqlite3` with the same terminal you use for `npm run dev`.
