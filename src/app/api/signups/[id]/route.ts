import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/current-user";
import { updateSignupStatus } from "@/lib/signups";

const patchSchema = z.object({
  status: z.enum(["cancelled", "boarded", "picked_up", "no_show"]),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireApiUser();

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    const signup = await updateSignupStatus(auth.user, id, body.status);
    return NextResponse.json({ signup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update signup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
