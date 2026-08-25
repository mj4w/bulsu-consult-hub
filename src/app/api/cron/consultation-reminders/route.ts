import { NextResponse } from "next/server";

import {
  sendConsultationEmailOnce,
  type ConsultationEmailRequest,
} from "@/lib/email/consultation-emails";
import { createAdminClient } from "@/lib/supabase/admin";

type ConsultationEmailRow = Omit<
  ConsultationEmailRequest,
  "student" | "instructor" | "availability"
> & {
  student?:
    | NonNullable<ConsultationEmailRequest["student"]>[]
    | NonNullable<ConsultationEmailRequest["student"]>
    | null;
  instructor?:
    | NonNullable<ConsultationEmailRequest["instructor"]>[]
    | NonNullable<ConsultationEmailRequest["instructor"]>
    | null;
  availability?:
    | NonNullable<ConsultationEmailRequest["availability"]>[]
    | NonNullable<ConsultationEmailRequest["availability"]>
    | null;
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + 10 * 60 * 1000);

  const { data, error } = await supabase
    .from("consultation_requests")
    .select(
      `
        id,
        student_id,
        instructor_id,
        requested_start_datetime,
        requested_end_datetime,
        concern_type,
        message,
        status,
        decision_note,
        student:profiles!consultation_requests_student_id_fkey(
          full_name,
          email,
          program,
          section
        ),
        instructor:profiles!consultation_requests_instructor_id_fkey(
          full_name,
          email
        ),
        availability:instructor_availability!consultation_requests_availability_id_fkey(
          consultation_mode,
          meeting_url,
          venue
        )
      `,
    )
    .eq("status", "approved")
    .gte("requested_start_datetime", windowStart.toISOString())
    .lt("requested_start_datetime", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const requests = (data ?? []).map(normalizeConsultationEmailRequest);
  const results = await Promise.allSettled(
    requests.flatMap((consultation) => [
      sendConsultationEmailOnce({
        request: consultation,
        type: "reminder_24h_to_student",
      }),
      sendConsultationEmailOnce({
        request: consultation,
        type: "reminder_24h_to_instructor",
      }),
    ]),
  );

  const sent = results.filter(
    (result) => result.status === "fulfilled" && !result.value.skipped,
  ).length;
  const skipped = results.filter(
    (result) => result.status === "fulfilled" && result.value.skipped,
  ).length;
  const failed = results.filter((result) => result.status === "rejected").length;

  return NextResponse.json({
    checked: requests.length,
    sent,
    skipped,
    failed,
  });
}

function normalizeConsultationEmailRequest(
  row: ConsultationEmailRow,
): ConsultationEmailRequest {
  return {
    ...row,
    student: Array.isArray(row.student) ? row.student[0] ?? null : row.student ?? null,
    instructor: Array.isArray(row.instructor)
      ? row.instructor[0] ?? null
      : row.instructor ?? null,
    availability: Array.isArray(row.availability)
      ? row.availability[0] ?? null
      : row.availability ?? null,
  };
}
