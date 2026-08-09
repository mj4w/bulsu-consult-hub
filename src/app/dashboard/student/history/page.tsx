import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  StudentHistoryPanel,
  type StudentHistoryRequest,
} from "@/components/dashboard/StudentHistoryPanel";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { createClient } from "@/lib/supabase/server";

export default async function StudentHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? (user.email?.match(/^[0-9]+@/) ? "student" : "instructor");
  if (role !== "student") redirect("/dashboard/instructor");

  const { data: requestData } = await supabase
    .from("consultation_requests")
    .select("id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const requests = ((requestData ?? []) as Array<
    Omit<StudentHistoryRequest, "instructor"> & {
      instructor?:
        | NonNullable<StudentHistoryRequest["instructor"]>[]
        | NonNullable<StudentHistoryRequest["instructor"]>
        | null;
    }
  >).map((request) => ({
    ...request,
    instructor: Array.isArray(request.instructor) ? request.instructor[0] ?? null : request.instructor ?? null,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SessionTimeout />
      <header className="border-t-4 border-primary border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:gap-5 sm:px-8 lg:px-12">
          <Link href="/dashboard/student/history" className="font-semibold tracking-tight" aria-label="Refresh student history">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2">
            <nav className="mr-3 hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
              <Link href="/dashboard/student" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/dashboard/student#calendar" className="hover:text-foreground">
                Consultations
              </Link>
              <Link href="/dashboard/student/history" className="font-medium text-primary">
                History
              </Link>
              <Link href="/onboarding" className="hover:text-foreground">
                My profile
              </Link>
            </nav>
            <NotificationBell role="student" />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto border-t border-border px-5 py-3 text-sm text-muted-foreground sm:px-8 lg:hidden lg:px-12">
          <Link href="/dashboard/student" className="shrink-0 rounded-full border border-border px-4 py-2">
            Dashboard
          </Link>
          <Link href="/dashboard/student#calendar" className="shrink-0 rounded-full border border-border px-4 py-2">
            Consultations
          </Link>
          <Link href="/dashboard/student/history" className="shrink-0 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">
            History
          </Link>
          <Link href="/onboarding" className="shrink-0 rounded-full border border-border px-4 py-2">
            My profile
          </Link>
        </nav>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="mb-6">
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <div className="mt-5 border-b border-border pb-6">
            <p className="text-sm font-medium text-muted-foreground">
              Student history
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Consultation history
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              A complete record of your consultation requests and instructor responses.
            </p>
          </div>
        </div>

        <StudentHistoryPanel initialRequests={requests} />
      </div>
    </main>
  );
}
