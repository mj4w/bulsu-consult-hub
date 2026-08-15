import { redirect } from "next/navigation";

import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { InstructorDashboardShell } from "@/components/dashboard/InstructorDashboardShell";
import {
  InstructorRequestsPanel,
  type InstructorRequest,
} from "@/components/dashboard/InstructorRequestsPanel";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
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
  const emailUsername = user.email?.split("@")[0] ?? "Instructor";
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.user_metadata?.display_name ??
    profile?.full_name ??
    emailUsername;

  return (
    <>
      <SessionTimeout />
      <InstructorDashboardShell
        displayName={displayName}
        email={user.email ?? ""}
        initialView="requests"
        requestsContent={
          <section className="mt-5">
            <InstructorRequestsPanel initialRequests={requests} />
          </section>
        }
      />
    </>
  );
}
