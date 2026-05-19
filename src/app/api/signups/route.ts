import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiUser } from "@/lib/current-user";
import { createSignup } from "@/lib/signups";

const createSignupSchema = z.object({
  trainStopId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = createSignupSchema.parse(await request.json());
    const signup = await createSignup(auth.user, body.trainStopId);
    return NextResponse.json({ signup });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create signup.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
