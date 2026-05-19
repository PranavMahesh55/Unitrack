import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/current-user";
import { getStudentSignups } from "@/lib/signups";

export async function GET() {
  const auth = await requireApiUser();

  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const signups = await getStudentSignups(auth.user.id);
  return NextResponse.json({ signups });
}
