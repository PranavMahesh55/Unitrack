import { NextResponse, type NextRequest } from "next/server";

import { requireApiCc } from "@/lib/current-user";
import { getRoster } from "@/lib/signups";

export async function GET(request: NextRequest) {
  const auth = await requireApiCc();

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const roster = await getRoster(date);

  return NextResponse.json(roster);
}
