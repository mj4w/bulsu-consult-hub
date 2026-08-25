type ConsultationEmailClientEvent =
  | "request_submitted"
  | "request_approved"
  | "request_declined"
  | "student_cancelled_approved"
  | "instructor_cancelled_approved"
  | "instructor_rescheduled_approved";

export async function notifyConsultationEmail(
  requestId: string,
  event: ConsultationEmailClientEvent,
) {
  try {
    const response = await fetch("/api/emails/consultation-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, event }),
    });
    const payload = (await response.json().catch(() => null)) as {
      skipped?: boolean;
      reason?: string;
      recipient?: string;
      deliveredTo?: string;
      error?: string;
    } | null;

    if (!response.ok) {
      console.warn(
        "Consultation email notification failed:",
        payload?.error ?? response.statusText,
      );
      return;
    }

    if (payload?.skipped) {
      console.info(
        "Consultation email notification skipped:",
        payload.reason ?? "No reason returned.",
      );
      return;
    }

    console.info("Consultation email notification sent:", {
      recipient: payload?.recipient,
      deliveredTo: payload?.deliveredTo,
    });
  } catch (error) {
    console.warn("Consultation email notification failed:", error);
  }
}
