import Link from "next/link";
import {
  CalendarRange,
  ClipboardList,
  UserRound,
} from "lucide-react";
import { redirect } from "next/navigation";

import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { InstructorDashboardShell } from "@/components/dashboard/InstructorDashboardShell";
import {
  InstructorAvailabilityManager,
  type OccupiedConsultation,
} from "@/components/dashboard/InstructorAvailabilityManager";
import { InstructorSummaryCards } from "@/components/dashboard/InstructorSummaryCards";
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
    .select("id, requested_start_datetime, requested_end_datetime, concern_type, message, decision_note, status, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section)")
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
    <>
      <SessionTimeout />
      <InstructorDashboardShell
        displayName={displayName}
        email={user.email ?? ""}
        dashboardContent={
          <>
            <ClientSafeBoundary>
              <InstructorSummaryCards
                initialAvailability={availability}
                initialRequests={requests}
              />
            </ClientSafeBoundary>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb]">
                    <ClipboardList className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Consultation requests
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      Review student requests
                    </h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Approve or decline student requests in a separate workspace.
                  This keeps the calendar focused on availability and confirmed
                  meetings.
                </p>
                <Link
                  href="/dashboard/instructor/requests"
                  className="mt-5 inline-flex text-sm font-medium text-[#2563eb] hover:underline"
                >
                  Open requests
                </Link>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb]">
                    <CalendarRange className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Availability planning
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      Publish only the windows you can handle
                    </h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Set consultation windows by date, time, format, and program
                  scope. Approved bookings reduce availability for students.
                </p>
              </div>
            </section>
          </>
        }
        calendarContent={
          <section className="mt-5">
            <ClientSafeBoundary
              fallback={
                <div className="rounded-[1.5rem] border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
                  The calendar widget could not load. Refresh the page or sign
                  in again.
                </div>
              }
            >
              <InstructorAvailabilityManager
                initialAvailability={availability}
                initialOccupiedConsultations={approvedRequests}
              />
            </ClientSafeBoundary>
          </section>
        }
        profileContent={
          <section className="mt-5 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm sm:p-7">
              <p className="text-sm font-semibold text-[#2563eb]">
                Instructor identity
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Make it easy for students to recognize you.
              </h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Your profile name appears on student calendars, request
                details, and approved consultation records.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb]">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Signed in as
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {displayName}
                  </h2>
                </div>
              </div>
              <p className="mt-4 break-all text-sm text-muted-foreground">
                {user.email}
              </p>
              <Link
                href="/onboarding"
                className="mt-6 inline-flex items-center rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Edit profile
              </Link>
            </div>
          </section>
        }
      />
    </>
  );
}
