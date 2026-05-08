import { NextResponse, type NextRequest } from "next/server";

import { getTrains } from "@/lib/trains";

export async function GET(request: NextRequest) {
  const stationCode =
    request.nextUrl.searchParams.get("station") ??
    process.env.TRAIN_STATION_CODE ??
    "DNC";
  const force = request.nextUrl.searchParams.get("sync") === "1";

  try {
    const trains = await getTrains(stationCode, force);
    return NextResponse.json({ trains });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Train lookup failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
