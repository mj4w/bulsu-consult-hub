import { createHash, randomBytes } from "crypto";

import nodemailer from "nodemailer";

import { createAdminClient } from "@/lib/supabase/admin";

export type ConsultationEmailType =
  | "request_submitted_to_instructor"
  | "request_approved_to_student"
  | "request_declined_to_student"
  | "student_cancelled_to_instructor"
  | "instructor_cancelled_to_student"
  | "instructor_rescheduled_to_student"
  | "reminder_24h_to_student"
  | "reminder_24h_to_instructor";

type ConsultationMode = "f2f" | "online" | "both";
type ConcernType = "research" | "grades" | "projects" | "others";
type EmailActionLinks = {
  approveUrl: string;
  declineUrl: string;
};

export type ConsultationEmailRequest = {
  id: string;
  student_id: string;
  instructor_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: ConcernType;
  message: string | null;
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  student?: {
    full_name: string | null;
    email: string | null;
    program: string | null;
    section: string | null;
  } | null;
  instructor?: {
    full_name: string | null;
    email: string | null;
  } | null;
  availability?: {
    consultation_mode: ConsultationMode;
    meeting_url?: string | null;
    venue?: string | null;
  } | null;
};

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

export async function getConsultationEmailRequest(requestId: string) {
  const supabase = createAdminClient();
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
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return normalizeConsultationEmailRequest(data as ConsultationEmailRow);
}

export async function sendConsultationEmailOnce({
  request,
  type,
}: {
  request: ConsultationEmailRequest;
  type: ConsultationEmailType;
}) {
  const intendedRecipient = recipientForEmailType(request, type);
  if (!intendedRecipient) {
    return { skipped: true, reason: "missing-recipient" };
  }
  const deliveryRecipient =
    process.env.EMAIL_TEST_RECIPIENT_OVERRIDE?.trim() || intendedRecipient;
  const emailTypeForLog =
    type === "instructor_rescheduled_to_student"
      ? `${type}:${request.requested_start_datetime}:${request.requested_end_datetime}`
      : type;

  const supabase = createAdminClient();
  const { error: logError } = await supabase.from("email_logs").insert({
    consultation_request_id: request.id,
    email_type: emailTypeForLog,
    recipient_email: intendedRecipient,
  });

  if (logError) {
    if (logError.code === "23505") {
      return { skipped: true, reason: "duplicate" };
    }

    throw new Error(logError.message);
  }

  const actionLinks =
    type === "request_submitted_to_instructor"
      ? await createEmailActionLinks(supabase, request.id).catch((error) => {
          console.warn("Email action links were not created:", error);
          return null;
        })
      : null;

  const template = consultationEmailTemplate(request, type, {
    intendedRecipient:
      deliveryRecipient !== intendedRecipient ? intendedRecipient : null,
    actionLinks,
  });

  try {
    await sendEmailWithSmtp({
      to: deliveryRecipient,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    await supabase
      .from("email_logs")
      .delete()
      .eq("consultation_request_id", request.id)
      .eq("email_type", emailTypeForLog)
      .eq("recipient_email", intendedRecipient);

    throw error;
  }

  return {
    skipped: false,
    recipient: intendedRecipient,
    deliveredTo: deliveryRecipient,
  };
}

async function sendEmailWithSmtp({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPassword || !from) {
    throw new Error(
      "Missing Gmail SMTP configuration. Set SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.",
    );
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text,
  });
}

export function consultationEmailTemplate(
  request: ConsultationEmailRequest,
  type: ConsultationEmailType,
  options: {
    intendedRecipient?: string | null;
    actionLinks?: EmailActionLinks | null;
  } = {},
) {
  const studentName = personName(request.student, "Student");
  const instructorName = personName(request.instructor, "Instructor");
  const scheduleDate = formatDate(request.requested_start_datetime);
  const scheduleTime = `${formatTime(request.requested_start_datetime)} - ${formatTime(
    request.requested_end_datetime,
  )}`;
  const format = consultationModeLabel(request.availability?.consultation_mode);
  const purpose = concernLabel(request.concern_type);
  const dashboardUrl = dashboardUrlForType(request, type);
  const details = [
    ...(options.intendedRecipient
      ? [["Original recipient", options.intendedRecipient]]
      : []),
    ["Student", studentName],
    ["Instructor", instructorName],
    ["Date", scheduleDate],
    ["Time", scheduleTime],
    ["Format", format],
    ...(request.availability?.meeting_url
      ? [["Meeting link", request.availability.meeting_url]]
      : []),
    ...(request.availability?.venue ? [["F2F location", request.availability.venue]] : []),
    ["Purpose", purpose],
    ...(request.message ? [["Concern details", request.message]] : []),
    ...(request.decision_note ? [["Note", request.decision_note]] : []),
  ] as Array<[string, string]>;

  const subject = subjectForType(type, purpose, studentName);
  const intro = introForType(type, studentName, instructorName);
  const theme = emailThemeForType(type);
  const detailsHtml = details
    .map(
      ([label, value], index) => `
        <tr>
          <td style="width:34%;padding:14px 16px;border-top:${index === 0 ? "0" : "1px solid #e5e7eb"};background:#f8fafc;color:#475569;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:14px 16px;border-top:${index === 0 ? "0" : "1px solid #e5e7eb"};color:#111827;font-size:14px;font-weight:700;line-height:1.55;vertical-align:top;word-break:break-word;white-space:pre-wrap;">
            ${linkifyIfUrl(value)}
          </td>
        </tr>
      `,
    )
    .join("");
  const html = `
    <div style="margin:0;background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;">
        <div style="border-radius:24px 24px 0 0;background:${theme.header};padding:26px 28px;color:${theme.headerText};">
          <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.9;">BulSU Consult Hub</p>
          <h1 style="margin:0;font-size:25px;line-height:1.25;font-weight:800;">${escapeHtml(subject)}</h1>
        </div>

        <div style="border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;border-radius:0 0 24px 24px;background:#ffffff;padding:28px;">
          ${
            options.intendedRecipient
              ? `<div style="margin:0 0 18px;border-radius:16px;background:#fff7ed;border:1px solid #fed7aa;padding:13px 15px;font-size:13px;line-height:1.6;color:#9a3412;"><strong>Testing mode:</strong> this email was redirected here. Original recipient: ${escapeHtml(options.intendedRecipient)}</div>`
              : ""
          }

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px;">
                <span style="display:inline-block;border-radius:999px;background:${theme.badgeBg};color:${theme.badgeText};padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">
                  ${escapeHtml(theme.label)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 20px;color:#334155;font-size:15px;line-height:1.75;">
                ${escapeHtml(intro)}
              </td>
            </tr>
          </table>

          ${
            options.actionLinks
              ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-collapse:collapse;">
                  <tr>
                    <td style="padding:0 10px 10px 0;">
                      <a href="${escapeHtml(options.actionLinks.approveUrl)}" style="display:block;border-radius:14px;background:#047857;color:#ffffff;text-align:center;text-decoration:none;padding:13px 18px;font-size:14px;font-weight:800;">Approve request</a>
                    </td>
                    <td style="padding:0 0 10px 0;">
                      <a href="${escapeHtml(options.actionLinks.declineUrl)}" style="display:block;border-radius:14px;background:#ffffff;border:1px solid #fecaca;color:#991b1b;text-align:center;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:800;">Decline request</a>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:2px 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                      These one-time action links expire after 7 days. Use the dashboard if you need to review more context before deciding.
                    </td>
                  </tr>
                </table>`
              : ""
          }

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:18px;border-collapse:separate;border-spacing:0;overflow:hidden;">
            ${detailsHtml}
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;border-collapse:collapse;">
            <tr>
              <td>
                <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;border-radius:999px;background:${theme.button};color:${theme.buttonText};text-decoration:none;padding:12px 18px;font-size:14px;font-weight:800;">Open dashboard</a>
              </td>
            </tr>
          </table>

          <p style="margin:22px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#64748b;line-height:1.6;">
            This is an automated consultation notification from BulSU Consult Hub. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    "BulSU Consult Hub",
    "",
    subject,
    "",
    ...(options.intendedRecipient
      ? [`Testing mode: redirected email. Original recipient: ${options.intendedRecipient}`, ""]
      : []),
    intro,
    "",
    ...(options.actionLinks
      ? [
          `Approve request: ${options.actionLinks.approveUrl}`,
          `Decline request: ${options.actionLinks.declineUrl}`,
          "",
        ]
      : []),
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open dashboard: ${dashboardUrl}`,
  ].join("\n");

  return { subject, html, text };
}

async function createEmailActionLinks(
  supabase: ReturnType<typeof createAdminClient>,
  requestId: string,
): Promise<EmailActionLinks> {
  const siteUrl = appSiteUrl();
  const [approveToken, declineToken] = [randomToken(), randomToken()];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("email_action_tokens").insert([
    {
      consultation_request_id: requestId,
      action: "approve",
      token_hash: hashToken(approveToken),
      expires_at: expiresAt,
    },
    {
      consultation_request_id: requestId,
      action: "decline",
      token_hash: hashToken(declineToken),
      expires_at: expiresAt,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return {
    approveUrl: `${siteUrl}/api/email-actions/consultation?token=${approveToken}`,
    declineUrl: `${siteUrl}/api/email-actions/consultation?token=${declineToken}`,
  };
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function hashEmailActionToken(token: string) {
  return hashToken(token);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function recipientForEmailType(
  request: ConsultationEmailRequest,
  type: ConsultationEmailType,
) {
  if (
    type === "request_submitted_to_instructor" ||
    type === "student_cancelled_to_instructor" ||
    type === "reminder_24h_to_instructor"
  ) {
    return request.instructor?.email;
  }

  return request.student?.email;
}

function subjectForType(
  type: ConsultationEmailType,
  purpose: string,
  studentName: string,
) {
  if (type === "request_submitted_to_instructor") {
    return `New ${purpose} consultation request`;
  }
  if (type === "request_approved_to_student") {
    return `Consultation approved: ${purpose}`;
  }
  if (type === "request_declined_to_student") {
    return `Consultation declined: ${purpose}`;
  }
  if (type === "student_cancelled_to_instructor") {
    return `${studentName} cancelled a consultation`;
  }
  if (type === "instructor_cancelled_to_student") {
    return `Consultation cancelled by instructor`;
  }
  if (type === "instructor_rescheduled_to_student") {
    return `Consultation rescheduled: ${purpose}`;
  }
  return `Reminder: consultation in 24 hours`;
}

function introForType(
  type: ConsultationEmailType,
  studentName: string,
  instructorName: string,
) {
  if (type === "request_submitted_to_instructor") {
    return `${studentName} submitted a consultation request for your review.`;
  }
  if (type === "request_approved_to_student") {
    return `${instructorName} approved your consultation request.`;
  }
  if (type === "request_declined_to_student") {
    return `${instructorName} declined your consultation request.`;
  }
  if (type === "student_cancelled_to_instructor") {
    return `${studentName} cancelled an approved consultation.`;
  }
  if (type === "instructor_cancelled_to_student") {
    return `${instructorName} cancelled the approved consultation.`;
  }
  if (type === "instructor_rescheduled_to_student") {
    return `${instructorName} rescheduled your approved consultation. Please review the updated date and time.`;
  }
  if (type === "reminder_24h_to_instructor") {
    return `Reminder: you have a consultation with ${studentName} in about 24 hours.`;
  }
  return `Reminder: your consultation with ${instructorName} is in about 24 hours.`;
}

function dashboardUrlForType(
  request: ConsultationEmailRequest,
  type: ConsultationEmailType,
) {
  const siteUrl = appSiteUrl();
  if (
    type === "request_submitted_to_instructor" ||
    type === "student_cancelled_to_instructor" ||
    type === "reminder_24h_to_instructor"
  ) {
    return `${siteUrl}/dashboard/instructor/requests?request=${request.id}`;
  }

  return `${siteUrl}/dashboard/student?request=${request.id}#history`;
}

function appSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

function emailThemeForType(type: ConsultationEmailType) {
  if (type === "request_submitted_to_instructor") {
    return {
      label: "Needs review",
      header: "linear-gradient(135deg,#7f1d1d,#f59e0b)",
      headerText: "#ffffff",
      badgeBg: "#fef3c7",
      badgeText: "#92400e",
      button: "#a31521",
      buttonText: "#ffffff",
    };
  }

  if (type === "request_approved_to_student") {
    return {
      label: "Approved",
      header: "linear-gradient(135deg,#065f46,#10b981)",
      headerText: "#ffffff",
      badgeBg: "#d1fae5",
      badgeText: "#065f46",
      button: "#047857",
      buttonText: "#ffffff",
    };
  }

  if (type === "request_declined_to_student") {
    return {
      label: "Declined",
      header: "linear-gradient(135deg,#7f1d1d,#dc2626)",
      headerText: "#ffffff",
      badgeBg: "#fee2e2",
      badgeText: "#991b1b",
      button: "#991b1b",
      buttonText: "#ffffff",
    };
  }

  if (
    type === "student_cancelled_to_instructor" ||
    type === "instructor_cancelled_to_student"
  ) {
    return {
      label: "Cancelled",
      header: "linear-gradient(135deg,#334155,#64748b)",
      headerText: "#ffffff",
      badgeBg: "#e2e8f0",
      badgeText: "#334155",
      button: "#334155",
      buttonText: "#ffffff",
    };
  }

  if (type === "instructor_rescheduled_to_student") {
    return {
      label: "Rescheduled",
      header: "linear-gradient(135deg,#1d4ed8,#38bdf8)",
      headerText: "#ffffff",
      badgeBg: "#dbeafe",
      badgeText: "#1e40af",
      button: "#1d4ed8",
      buttonText: "#ffffff",
    };
  }

  return {
    label: "Reminder",
    header: "linear-gradient(135deg,#a31521,#f2b705)",
    headerText: "#ffffff",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    button: "#0f172a",
    buttonText: "#ffffff",
  };
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

function personName(
  person: { full_name: string | null; email: string | null } | null | undefined,
  fallback: string,
) {
  return person?.full_name?.trim() || person?.email?.split("@")[0] || fallback;
}

function consultationModeLabel(mode?: ConsultationMode | null) {
  if (mode === "f2f") return "F2F";
  if (mode === "online") return "Online";
  if (mode === "both") return "Online or F2F";
  return "Consultation";
}

function concernLabel(concern: string) {
  return (
    {
      research: "Research",
      grades: "Grades",
      projects: "Projects",
      others: "Other",
    }[concern] ?? "Consultation"
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function linkifyIfUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return `<a href="${escapeHtml(value)}" style="color:#2563eb;text-decoration:none;">${escapeHtml(value)}</a>`;
  }

  return escapeHtml(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
