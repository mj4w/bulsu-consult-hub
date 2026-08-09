"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function InstructorDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Instructor dashboard failed:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">
          Instructor dashboard
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          The dashboard could not load.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Your session may be stale, or the deployment may still be using old
          environment settings. Try reloading first. If it still fails, sign in
          again through the instructor portal.
        </p>
        {error.digest && (
          <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/instructor-portal"
            className="rounded-full border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Instructor portal
          </Link>
        </div>
      </div>
    </main>
  );
}
