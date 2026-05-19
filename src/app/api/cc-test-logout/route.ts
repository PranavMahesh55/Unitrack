import { NextResponse } from "next/server";

import { clearCcTestLogin } from "@/lib/current-user";

export async function POST() {
  await clearCcTestLogin();
  return NextResponse.json({ ok: true });
}
