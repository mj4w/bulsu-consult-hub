import { NextResponse } from "next/server";

import {
  getConsultationEmailRequest,
  sendConsultationEmailOnce,
  type ConsultationEmailType,
} from "@/lib/email/consultation-emails";
import { createClient } from "@/lib/supabase/server";

type NotifyEvent =
  | "request_submitted"
  | "request_approved"
  | "request_declined"
  | "student_cancelled_approved"
  | "instructor_cancelled_approved"
  | "instructor_rescheduled_approved";

const eventToEmailType: Record<NotifyEvent, ConsultationEmailType> = {
  request_submitted: "request_submitted_to_instructor",
  request_approved: "request_approved_to_student",
  request_declined: "request_declined_to_student",
  student_cancelled_approved: "student_cancelled_to_instructor",
  instructor_cancelled_approved: "instructor_cancelled_to_student",
  instructor_rescheduled_approved: "instructor_rescheduled_to_student",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    requestId?: string;
    event?: NotifyEvent;
  } | null;

  if (!body?.requestId || !body.event || !(body.event in eventToEmailType)) {
    return NextResponse.json({ error: "Invalid email notification request." }, { status: 400 });
  }

  const consultation = await getConsultationEmailRequest(body.requestId);
  if (!consultation) {
    return NextResponse.json({ error: "Consultation request not found." }, { status: 404 });
  }

  const validationError = validateEventPermission({
    event: body.event,
    userId: user.id,
    status: consultation.status,
    studentId: consultation.student_id,
    instructorId: consultation.instructor_id,
    decisionNote: consultation.decision_note,
  });

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 403 });
  }

  const result = await sendConsultationEmailOnce({
    request: consultation,
    type: eventToEmailType[body.event],
  }).catch((error: unknown) => ({
    skipped: true,
    reason:
      error instanceof Error
        ? error.message
        : "Email provider failed to send the notification.",
  }));

  if (result.skipped) {
    console.warn("Consultation email skipped:", {
      requestId: body.requestId,
      event: body.event,
      reason: result.reason,
    });
  } else {
    console.info("Consultation email sent:", {
      requestId: body.requestId,
      event: body.event,
      recipient: "recipient" in result ? result.recipient : undefined,
      deliveredTo: "deliveredTo" in result ? result.deliveredTo : undefined,
    });
  }

  return NextResponse.json(result);
}

function validateEventPermission({
  event,
  userId,
  status,
  studentId,
  instructorId,
  decisionNote,
}: {
  event: NotifyEvent;
  userId: string;
  status: string;
  studentId: string;
  instructorId: string;
  decisionNote: string | null;
}) {
  if (event === "request_submitted") {
    if (userId !== studentId) return "Only the student can send this notification.";
    if (status !== "pending") return "Only pending requests can trigger this notification.";
    return null;
  }

  if (event === "request_approved") {
    if (userId !== instructorId) return "Only the instructor can send this notification.";
    if (status !== "approved") return "Only approved requests can trigger this notification.";
    return null;
  }

  if (event === "request_declined") {
    if (userId !== instructorId) return "Only the instructor can send this notification.";
    if (status !== "declined") return "Only declined requests can trigger this notification.";
    return null;
  }

  if (event === "student_cancelled_approved") {
    if (userId !== studentId) return "Only the student can send this notification.";
    if (status !== "cancelled") return "Only cancelled requests can trigger this notification.";
    if (!decisionNote?.toLowerCase().includes("student")) {
      return "This cancellation was not made by the student.";
    }
    return null;
  }

  if (event === "instructor_rescheduled_approved") {
    if (userId !== instructorId) return "Only the instructor can send this notification.";
    if (status !== "approved") return "Only approved requests can trigger this notification.";
    if (!decisionNote?.toLowerCase().includes("rescheduled by instructor")) {
      return "This request was not rescheduled by the instructor.";
    }
    return null;
  }

  if (userId !== instructorId) return "Only the instructor can send this notification.";
  if (status !== "cancelled") return "Only cancelled requests can trigger this notification.";
  if (!decisionNote?.toLowerCase().includes("instructor")) {
    return "This cancellation was not made by the instructor.";
  }

  return null;
}
