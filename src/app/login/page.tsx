import Link from "next/link";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { googleAuthReady } from "@/lib/auth-options";
import {
  ccTestLoginAllowed,
  getCurrentUser,
  studentTestLoginAllowed,
} from "@/lib/current-user";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
};

function errorMessage(error?: string) {
  if (!error) return null;

  if (error === "OAuthSignin" || error === "google") {
    return "Google sign-in did not start. Check the Google OAuth client id/secret and make sure the redirect URI is http://localhost:3000/api/auth/callback/google.";
  }

  if (error === "AccessDenied") {
    return "This app only accepts NCSSM Google accounts.";
  }

  return "Sign-in failed. Check the OAuth settings and try again.";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const message = errorMessage(params.error);
  const callbackUrl = params.callbackUrl ?? "/student";

  if (user?.role === "cc") {
    redirect("/cc");
  }

  if (user?.role === "student") {
    redirect("/student");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-xl rounded-md border border-slate-300 bg-white p-6">
        <p className="text-sm font-bold uppercase text-slate-500">Unitrak Login</p>
        <h1 className="mt-2 text-3xl font-bold">Sign in to pick your train</h1>
        <p className="mt-3 text-sm text-slate-600">
          Use your NCSSM Google account. Student accounts go to the student
          dashboard, and CC emails listed in the app settings get CC access.
        </p>

        <div className="mt-6 space-y-3">
          {message ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              {message}
            </div>
          ) : null}

          {googleAuthReady ? (
            <GoogleSignInButton callbackUrl={callbackUrl} />
          ) : (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {/* this shows if we forgot the google keys in env */}
              Google keys are missing. Add `GOOGLE_CLIENT_ID`,
              `GOOGLE_CLIENT_SECRET`, and `NEXTAUTH_SECRET` to `.env` for real
              login.
            </div>
          )}

          {/* test buttons are for grading when oauth accounts arent all setup */}
          {ccTestLoginAllowed() ? (
            <Link
              className="block rounded-md bg-blue-900 px-4 py-3 text-center font-bold text-white"
              href="/api/cc-test-login"
            >
              Test CC Dashboard
            </Link>
          ) : null}

          {studentTestLoginAllowed() ? (
            <Link
              className="block rounded-md bg-blue-900 px-4 py-3 text-center font-bold text-white"
              href="/api/student-test-login"
            >
              Test Student Dashboard
            </Link>
          ) : null}
        </div>

        <p className="mt-5 text-xs text-slate-500">
          Only `@ncssm.edu` accounts can sign in. CC access comes from the
          `CC_EMAILS` list.
        </p>
      </div>
    </main>
  );
}
