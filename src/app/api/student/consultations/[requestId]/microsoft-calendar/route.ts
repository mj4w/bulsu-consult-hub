import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

type ConsultationMode = "f2f" | "online" | "both";

type ConsultationRequest = {
  id: string;
  student_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: string;
  message: string;
  status: string;
  microsoft_calendar_event_id: string | null;
  instructor:
    | {
        full_name: string | null;
        email: string | null;
      }[]
    | {
        full_name: string | null;
        email: string | null;
      }
    | null;
  availability:
    | {
        consultation_mode: ConsultationMode;
      }[]
    | {
        consultation_mode: ConsultationMode;
      }
    | null;
};

export async function POST(_request: Request, context: RouteContext) {
  const { requestId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json(
      {
        error:
          "Microsoft Calendar permission is missing. Please sign out and sign in again with Microsoft.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("consultation_requests")
    .select(
      "id, student_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, microsoft_calendar_event_id, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode)",
    )
    .eq("id", requestId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Consultation request not found." }, { status: 404 });
  }

  const consultation = normalizeConsultationRequest(data as ConsultationRequest);

  if (consultation.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved consultations can be synced to Microsoft Calendar." },
      { status: 409 },
    );
  }

  if (new Date(consultation.requested_end_datetime).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "Past consultations cannot be synced to Microsoft Calendar." },
      { status: 409 },
    );
  }

  if (consultation.microsoft_calendar_event_id) {
    return NextResponse.json({
      eventId: consultation.microsoft_calendar_event_id,
      alreadySynced: true,
    });
  }

  const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.provider_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildCalendarEvent(consultation)),
  });

  if (!graphResponse.ok) {
    return NextResponse.json(
      { error: await microsoftGraphError(graphResponse) },
      { status: graphResponse.status === 401 ? 401 : 502 },
    );
  }

  const graphEvent = (await graphResponse.json()) as { id?: string };

  if (!graphEvent.id) {
    return NextResponse.json(
      { error: "Microsoft Calendar did not return an event ID." },
      { status: 502 },
    );
  }

  const { error: updateError } = await supabase
    .from("consultation_requests")
    .update({
      microsoft_calendar_event_id: graphEvent.id,
      microsoft_calendar_synced_at: new Date().toISOString(),
    })
    .eq("id", consultation.id)
    .eq("student_id", user.id)
    .eq("status", "approved");

  if (updateError) {
    return NextResponse.json(
      {
        error:
          "The event was created in Microsoft Calendar, but the app could not save the sync status.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ eventId: graphEvent.id, alreadySynced: false });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { requestId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.provider_token) {
    return NextResponse.json(
      {
        error:
          "Microsoft Calendar permission is missing. Please sign out and sign in again with Microsoft.",
      },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("consultation_requests")
    .select("id, student_id, status, microsoft_calendar_event_id")
    .eq("id", requestId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Consultation request not found." }, { status: 404 });
  }

  const eventId = data.microsoft_calendar_event_id as string | null;

  if (!eventId) {
    return NextResponse.json({ deleted: false });
  }

  const graphResponse = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.provider_token}`,
      },
    },
  );

  if (!graphResponse.ok && graphResponse.status !== 404) {
    return NextResponse.json(
      { error: await microsoftGraphError(graphResponse) },
      { status: graphResponse.status === 401 ? 401 : 502 },
    );
  }

  const { error: updateError } = await supabase
    .from("consultation_requests")
    .update({
      microsoft_calendar_event_id: null,
      microsoft_calendar_synced_at: null,
    })
    .eq("id", requestId)
    .eq("student_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

function normalizeConsultationRequest(request: ConsultationRequest) {
  return {
    ...request,
    instructor: Array.isArray(request.instructor)
      ? (request.instructor[0] ?? null)
      : (request.instructor ?? null),
    availability: Array.isArray(request.availability)
      ? (request.availability[0] ?? null)
      : (request.availability ?? null),
  };
}

function buildCalendarEvent(request: ReturnType<typeof normalizeConsultationRequest>) {
  const instructorName =
    request.instructor?.full_name?.trim() ||
    request.instructor?.email?.split("@")[0] ||
    "Instructor";
  const mode = consultationModeLabel(request.availability?.consultation_mode);
  const concern = concernLabel(request.concern_type);

  return {
    subject: `${concern} consultation with ${instructorName}`,
    body: {
      contentType: "HTML",
      content: [
        `<p><strong>Consultation Scheduler</strong></p>`,
        `<p><strong>Instructor:</strong> ${escapeHtml(instructorName)}</p>`,
        `<p><strong>Format:</strong> ${escapeHtml(mode)}</p>`,
        `<p><strong>Purpose:</strong> ${escapeHtml(concern)}</p>`,
        `<p><strong>Concern details:</strong><br />${escapeHtml(request.message).replace(/\n/g, "<br />")}</p>`,
      ].join(""),
    },
    start: {
      dateTime: new Date(request.requested_start_datetime).toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: new Date(request.requested_end_datetime).toISOString(),
      timeZone: "UTC",
    },
    location: {
      displayName: mode,
    },
    showAs: "busy",
    isReminderOn: true,
    reminderMinutesBeforeStart: 30,
  };
}

function consultationModeLabel(mode?: ConsultationMode | null) {
  if (mode === "f2f") return "F2F";
  if (mode === "online") return "Online";
  if (mode === "both") return "Online or F2F";
  return "Consultation";
}

function concernLabel(concern: string) {
  return {
    research: "Research",
    grades: "Grades",
    projects: "Projects",
    others: "Other",
  }[concern] ?? "Consultation";
}

async function microsoftGraphError(response: Response) {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    return payload.error?.message ?? "Microsoft Calendar sync failed.";
  } catch {
    return "Microsoft Calendar sync failed.";
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
