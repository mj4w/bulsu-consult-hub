import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  InstructorRequestsPanel,
  type InstructorRequest,
} from "@/components/dashboard/InstructorRequestsPanel";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorRequestsPage() {
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
  if (role !== "instructor") redirect("/dashboard/student");

  const { data: requestData } = await supabase
    .from("consultation_requests")
    .select("id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section, phone_number)")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  const requests = ((requestData ?? []) as Array<
    Omit<InstructorRequest, "student"> & {
      student?:
        | NonNullable<InstructorRequest["student"]>[]
        | NonNullable<InstructorRequest["student"]>
        | null;
    }
  >).map((request) => ({
    ...request,
    student: Array.isArray(request.student) ? request.student[0] ?? null : request.student ?? null,
  }));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SessionTimeout />
      <header className="border-t-4 border-primary border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link
            href="/dashboard/instructor/requests"
            className="font-semibold tracking-tight"
            aria-label="Refresh instructor requests"
          >
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2">
            <nav className="mr-3 hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
              <Link href="/dashboard/instructor" className="hover:text-foreground">
                Dashboard
              </Link>
              <Link href="/dashboard/instructor#availability" className="hover:text-foreground">
                Consultation windows
              </Link>
              <Link href="/dashboard/instructor/requests" className="font-medium text-primary">
                Requests
              </Link>
              <Link href="/onboarding" className="hover:text-foreground">
                My profile
              </Link>
            </nav>
            <button
              className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground sm:flex"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
            </button>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="mb-6">
          <Link
            href="/dashboard/instructor"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
          <div className="mt-5 border-b border-border pb-6">
            <p className="text-sm font-medium text-muted-foreground">
              Instructor requests
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Review consultation requests
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Approve one request per overlapping time range. If multiple students request conflicting times, approving one automatically declines the others.
            </p>
          </div>
        </div>

        <InstructorRequestsPanel initialRequests={requests} />
      </div>
    </main>
  );
}
