import Link from "next/link";
import {
  ClipboardList,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  InstructorAvailabilityManager,
  type OccupiedConsultation,
} from "@/components/dashboard/InstructorAvailabilityManager";
import { InstructorSummaryCards } from "@/components/dashboard/InstructorSummaryCards";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PendingRequestsBadge } from "@/components/dashboard/PendingRequestsBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ClientSafeBoundary } from "@/components/ui/ClientSafeBoundary";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorDashboardPage() {
  const supabase = await createClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult.user;
  if (userError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role ?? (user.email?.match(/^[0-9]+@/) ? "student" : "instructor");
  if (role !== "instructor") redirect("/dashboard/student");

  const { data: availabilityData, error: availabilityError } = await supabase
    .from("instructor_availability")
    .select("id, instructor_display_name, start_datetime, end_datetime, consultation_mode, is_active, availability_programs(program)")
    .eq("instructor_id", user.id)
    .order("start_datetime", { ascending: true });

  const emailUsername = user.email?.split("@")[0] ?? "Instructor";
  const microsoftName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.display_name;
  const identityData = user.identities?.[0]?.identity_data as
    | Record<string, string | undefined>
    | undefined;
  const identityName =
    identityData?.full_name ??
    identityData?.name ??
    identityData?.displayName ??
    [identityData?.given_name, identityData?.family_name].filter(Boolean).join(" ");
  const storedName =
    profile?.full_name && profile.full_name !== emailUsername
      ? profile.full_name
      : undefined;
  const displayName = microsoftName ?? identityName ?? storedName ?? emailUsername;
  const availability = (availabilityError ? [] : availabilityData ?? []) as Array<{
    id: string;
    instructor_display_name?: string | null;
    start_datetime: string;
    end_datetime: string;
    consultation_mode: "f2f" | "online" | "both";
    is_active: boolean;
    availability_programs?: { program: string }[];
  }>;
  const { data: requestData, error: requestError } = await supabase
    .from("consultation_requests")
    .select("id, requested_start_datetime, requested_end_datetime, concern_type, status, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section)")
    .eq("instructor_id", user.id)
    .order("created_at", { ascending: false });

  const requests = ((requestError ? [] : requestData ?? []) as Array<
    Omit<OccupiedConsultation, "student"> & {
      status: "pending" | "approved" | "declined" | "cancelled";
      student?:
        | NonNullable<OccupiedConsultation["student"]>[]
        | NonNullable<OccupiedConsultation["student"]>
        | null;
    }
  >).map((request) => ({
    ...request,
    student: Array.isArray(request.student) ? request.student[0] ?? null : request.student ?? null,
  }));
  const approvedRequests = requests.filter((request) => request.status === "approved");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SessionTimeout />
      <header className="border-t-4 border-primary border-b border-border bg-card">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:gap-5 sm:px-8 lg:px-12">
          <Link
            href="/dashboard/instructor"
            className="font-semibold tracking-tight"
            aria-label="Refresh instructor dashboard"
          >
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-2">
            <nav className="mr-3 hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
              <a href="#dashboard" className="font-medium text-primary">
                Dashboard
              </a>
              <Link href="/dashboard/instructor/requests" className="inline-flex items-center hover:text-foreground">
                Requests
                <ClientSafeBoundary>
                  <PendingRequestsBadge />
                </ClientSafeBoundary>
              </Link>
              <Link href="/onboarding" className="hover:text-foreground">
                My profile
              </Link>
            </nav>
            <ClientSafeBoundary>
              <NotificationBell role="instructor" />
            </ClientSafeBoundary>
            <ClientSafeBoundary>
              <ThemeToggle />
            </ClientSafeBoundary>
            <ClientSafeBoundary>
              <LogoutButton />
            </ClientSafeBoundary>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto border-t border-border px-5 py-3 text-sm text-muted-foreground sm:px-8 lg:hidden lg:px-12">
          <Link href="/dashboard/instructor" className="shrink-0 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground">
            Dashboard
          </Link>
          <Link href="/dashboard/instructor/requests" className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-2">
            Requests
            <ClientSafeBoundary>
              <PendingRequestsBadge />
            </ClientSafeBoundary>
          </Link>
          <Link href="/onboarding" className="shrink-0 rounded-full border border-border px-4 py-2">
            My profile
          </Link>
        </nav>
      </header>

      <div id="dashboard" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="border-b border-border pb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Instructor dashboard
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
            Welcome, {displayName}.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Open consultation windows, review student requests, and confirm the meetings that fit your time.
          </p>
        </div>

        <ClientSafeBoundary>
          <InstructorSummaryCards initialAvailability={availability} initialRequests={requests} />
        </ClientSafeBoundary>

        <section id="availability" className="mt-8">
          <ClientSafeBoundary
            fallback={
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                The calendar widget could not load. Refresh the page or sign in again.
              </div>
            }
          >
            <InstructorAvailabilityManager
              initialAvailability={availability}
              initialOccupiedConsultations={approvedRequests}
            />
          </ClientSafeBoundary>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Consultation requests
                </p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">
                  Review student requests
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Keep request approval in a separate workspace so the calendar stays focused on availability and confirmed meetings.
            </p>
            <Link
              href="/dashboard/instructor/requests"
              className="mt-5 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Open requests
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                <UserRound className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Instructor profile
                </p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">
                  Keep it current
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Your profile helps students identify the right instructor before sending a consultation request.
            </p>
            <Link
              href="/onboarding"
              className="mt-5 inline-flex text-sm font-medium text-primary hover:underline"
            >
              Edit profile
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
