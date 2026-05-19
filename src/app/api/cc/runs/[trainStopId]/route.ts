import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiCc } from "@/lib/current-user";
import { markRunDeparted } from "@/lib/signups";

const runSchema = z.object({
  ccNotes: z.string().optional(),
});

type Params = {
  params: Promise<{ trainStopId: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  // cc clicks this when the van leaves campus
  const auth = await requireApiCc();

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { trainStopId } = await params;
    const body = runSchema.parse(await request.json());
    const run = await markRunDeparted(auth.user, trainStopId, body.ccNotes);
    return NextResponse.json({ run });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not update shuttle run.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
