import { NextResponse, type NextRequest } from "next/server";

import { setStudentTestLogin, studentTestLoginAllowed } from "@/lib/current-user";

export async function GET(request: NextRequest) {
  // same idea as cc test login but for student view testing
  if (!studentTestLoginAllowed()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  await setStudentTestLogin();

  return NextResponse.redirect(new URL("/student", request.url));
}
