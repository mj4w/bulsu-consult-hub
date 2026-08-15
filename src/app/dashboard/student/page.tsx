import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentConsultationWorkspace } from "@/components/dashboard/StudentConsultationWorkspace";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, program, section, phone_number, department, job_title, office_location")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? (user.email?.match(/^[0-9]+@/) ? "student" : "instructor");
  if (role !== "student") redirect("/dashboard/instructor");
  const emailUsername = user.email?.split("@")[0] ?? "Student";
  const microsoftName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.user_metadata?.display_name;
  const identityData = user.identities?.[0]?.identity_data as Record<string, string | undefined> | undefined;
  const identityName = identityData?.full_name ?? identityData?.name ?? identityData?.displayName ?? [identityData?.given_name, identityData?.family_name].filter(Boolean).join(" ");
  const storedName = profile?.full_name && profile.full_name !== emailUsername ? profile.full_name : undefined;
  const displayName = microsoftName ?? identityName ?? storedName ?? emailUsername;
  const { data: availabilityData } = await supabase
    .from("instructor_availability")
    .select("id, instructor_id, instructor_display_name, start_datetime, end_datetime, consultation_mode, availability_programs(program), instructor:profiles!instructor_availability_instructor_id_fkey(full_name, email)")
    .eq("is_active", true)
    .order("start_datetime", { ascending: true });

  const availabilityRows = (availabilityData ?? []) as Array<{
    id: string;
    instructor_id: string;
    instructor_display_name?: string | null;
    start_datetime: string;
    end_datetime: string;
    consultation_mode: "f2f" | "online" | "both";
    availability_programs?: { program: string }[];
    instructor?: { full_name: string | null; email: string | null }[] | { full_name: string | null; email: string | null } | null;
  }>;
  const availability = availabilityRows.map((item) => ({
    ...item,
    instructor: Array.isArray(item.instructor) ? item.instructor[0] ?? null : item.instructor ?? null,
  }));

  const { data: requestData } = await supabase
    .from("consultation_requests")
    .select("id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, microsoft_calendar_event_id, microsoft_calendar_synced_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const requestRows = (requestData ?? []) as Array<{
    id: string;
    availability_id: string;
    instructor_id: string;
    requested_start_datetime: string;
    requested_end_datetime: string;
    concern_type: "research" | "grades" | "projects" | "others";
    message: string;
    status: "pending" | "approved" | "declined" | "cancelled";
    decision_note: string | null;
    created_at: string;
    microsoft_calendar_event_id: string | null;
    microsoft_calendar_synced_at: string | null;
    instructor?: { full_name: string | null; email: string | null }[] | { full_name: string | null; email: string | null } | null;
    availability?: { consultation_mode: "f2f" | "online" | "both" }[] | { consultation_mode: "f2f" | "online" | "both" } | null;
  }>;
  const requests = requestRows.map((request) => ({
    ...request,
    instructor: Array.isArray(request.instructor) ? request.instructor[0] ?? null : request.instructor ?? null,
    availability: Array.isArray(request.availability) ? request.availability[0] ?? null : request.availability ?? null,
  }));

  const { data: occupiedData } = await supabase
    .from("student_occupied_consultation_slots")
    .select("id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime");

  const occupiedSlots = (occupiedData ?? []) as Array<{
    id: string;
    availability_id: string;
    instructor_id: string;
    requested_start_datetime: string;
    requested_end_datetime: string;
  }>;

  const workspaceVersion = [
    availability.map((item) => item.id).join(","),
    requests.map((request) => `${request.id}:${request.status}`).join(","),
    occupiedSlots.map((slot) => slot.id).join(","),
  ].join("|");

  return (
    <StudentConsultationWorkspace
      key={workspaceVersion}
      displayName={displayName}
      email={user.email ?? ""}
      profile={
        profile
          ? {
              role,
              full_name: profile.full_name,
              program: profile.program,
              section: profile.section,
              phone_number: profile.phone_number,
              department: profile.department,
              job_title: profile.job_title,
              office_location: profile.office_location,
            }
          : null
      }
      availability={availability}
      requests={requests}
      occupiedSlots={occupiedSlots}
    />
  );
}
