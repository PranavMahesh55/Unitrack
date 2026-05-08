import { NextResponse, type NextRequest } from "next/server";

import { syncTrains } from "@/lib/trains";

export async function POST(request: NextRequest) {
  try {
    const stationCode =
      request.nextUrl.searchParams.get("station") ??
      process.env.TRAIN_STATION_CODE ??
      "DNC";
    const result = await syncTrains(stationCode);

    return NextResponse.json({
      source: result.source,
      trains: result.trains,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Train sync failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
