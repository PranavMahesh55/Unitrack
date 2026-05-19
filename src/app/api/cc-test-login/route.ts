import { NextResponse, type NextRequest } from "next/server";

import { ccTestLoginAllowed, setCcTestLogin } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  if (!ccTestLoginAllowed()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await setCcTestLogin();

  return NextResponse.redirect(new URL("/cc", request.url));
}
