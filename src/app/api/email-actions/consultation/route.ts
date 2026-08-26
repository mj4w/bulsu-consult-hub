import { NextResponse } from "next/server";

import {
  getConsultationEmailRequest,
  hashEmailActionToken,
  sendConsultationEmailOnce,
} from "@/lib/email/consultation-emails";
import { createAdminClient } from "@/lib/supabase/admin";

type EmailActionTokenRow = {
  id: string;
  consultation_request_id: string;
  action: "approve" | "decline";
  expires_at: string;
  used_at: string | null;
};

type RequestRow = {
  id: string;
  instructor_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  status: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();

  if (!token) {
    return actionPage({
      title: "Invalid action link",
      message: "This consultation action link is missing its token.",
      tone: "error",
    });
  }

  const supabase = createAdminClient();
  const tokenHash = hashEmailActionToken(token);
  const { data: tokenRow, error: tokenError } = await supabase
    .from("email_action_tokens")
    .select("id, consultation_request_id, action, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    return actionPage({
      title: "Action unavailable",
      message: tokenError.message,
      tone: "error",
    });
  }

  const actionToken = tokenRow as EmailActionTokenRow | null;

  if (!actionToken) {
    return actionPage({
      title: "Invalid action link",
      message: "This consultation action link is not recognized.",
      tone: "error",
    });
  }

  if (actionToken.used_at) {
    return actionPage({
      title: "Action already used",
      message: "This email action link was already used. Please check the dashboard for the current request status.",
      tone: "warning",
    });
  }

  if (new Date(actionToken.expires_at).getTime() <= Date.now()) {
    return actionPage({
      title: "Action expired",
      message: "This email action link has expired. Please review the request from the instructor dashboard.",
      tone: "warning",
    });
  }

  const { data: existingRequest, error: requestError } = await supabase
    .from("consultation_requests")
    .select("id, instructor_id, requested_start_datetime, requested_end_datetime, status")
    .eq("id", actionToken.consultation_request_id)
    .maybeSingle();

  if (requestError || !existingRequest) {
    return actionPage({
      title: "Request not found",
      message: requestError?.message ?? "The consultation request no longer exists.",
      tone: "error",
    });
  }

  const consultationRequest = existingRequest as RequestRow;

  if (consultationRequest.status !== "pending") {
    await markTokenUsed(actionToken.id);
    return actionPage({
      title: "Request already reviewed",
      message: "This request is no longer pending. Please check the dashboard for its current status.",
      tone: "warning",
    });
  }

  const decisionNote =
    actionToken.action === "approve"
      ? "Approved by instructor from email."
      : "Declined by instructor from email.";

  const { data: updatedRequest, error: updateError } = await supabase
    .from("consultation_requests")
    .update({
      status: actionToken.action === "approve" ? "approved" : "declined",
      decision_note: decisionNote,
    })
    .eq("id", consultationRequest.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (updateError || !updatedRequest) {
    return actionPage({
      title: "Action failed",
      message: updateError?.message ?? "The request changed before this action was completed.",
      tone: "error",
    });
  }

  await markTokenUsed(actionToken.id);
  await expireSiblingTokens(actionToken.consultation_request_id);

  const autoDeclinedIds =
    actionToken.action === "approve"
      ? await declineOverlappingPendingRequests(supabase, consultationRequest)
      : [];

  const emailRequest = await getConsultationEmailRequest(consultationRequest.id);
  if (emailRequest) {
    await sendConsultationEmailOnce({
      request: emailRequest,
      type:
        actionToken.action === "approve"
          ? "request_approved_to_student"
          : "request_declined_to_student",
    }).catch((error) => {
      console.warn("Email action notification failed:", error);
    });
  }

  await Promise.all(
    autoDeclinedIds.map(async (requestId) => {
      const autoDeclinedRequest = await getConsultationEmailRequest(requestId);
      if (!autoDeclinedRequest) return;
      await sendConsultationEmailOnce({
        request: autoDeclinedRequest,
        type: "request_declined_to_student",
      });
    }),
  ).catch((error) => {
    console.warn("Auto-decline email notification failed:", error);
  });

  return actionPage({
    title:
      actionToken.action === "approve"
        ? "Consultation approved"
        : "Consultation declined",
    message:
      actionToken.action === "approve"
        ? "The student has been notified. Any overlapping pending requests were declined automatically."
        : "The student has been notified that the request was declined.",
    tone: actionToken.action === "approve" ? "success" : "warning",
  });
}

async function markTokenUsed(tokenId: string) {
  await createAdminClient()
    .from("email_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId);
}

async function expireSiblingTokens(requestId: string) {
  await createAdminClient()
    .from("email_action_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("consultation_request_id", requestId)
    .is("used_at", null);
}

async function declineOverlappingPendingRequests(
  supabase: ReturnType<typeof createAdminClient>,
  request: RequestRow,
) {
  const { data, error } = await supabase
    .from("consultation_requests")
    .update({
      status: "declined",
      decision_note: "Another student was accepted for an overlapping time slot.",
    })
    .eq("instructor_id", request.instructor_id)
    .lt("requested_start_datetime", request.requested_end_datetime)
    .gt("requested_end_datetime", request.requested_start_datetime)
    .eq("status", "pending")
    .neq("id", request.id)
    .select("id");

  if (error) {
    console.warn("Could not auto-decline overlapping requests:", error);
    return [];
  }

  return ((data ?? []) as Array<{ id: string }>).map((item) => item.id);
}

function actionPage({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "success" | "warning" | "error";
}) {
  const siteUrl = appSiteUrl();
  const color =
    tone === "success" ? "#047857" : tone === "warning" ? "#b45309" : "#b91c1c";
  const html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
        <main style="min-height:100vh;display:grid;place-items:center;padding:24px;">
          <section style="max-width:520px;border:1px solid #e2e8f0;border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08);">
            <p style="margin:0 0 12px;color:${color};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.16em;">BulSU Consult Hub</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
            <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">${escapeHtml(message)}</p>
            <a href="${escapeHtml(siteUrl)}/dashboard/instructor/requests" style="display:inline-block;margin-top:22px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:700;">Open instructor dashboard</a>
          </section>
        </main>
      </body>
    </html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function appSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
