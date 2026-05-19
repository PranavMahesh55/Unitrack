import { NextResponse } from "next/server";

import { clearTestLogins } from "@/lib/current-user";

export async function POST() {
  // clear either test role when the user signs out
  await clearTestLogins();
  return NextResponse.json({ ok: true });
}
