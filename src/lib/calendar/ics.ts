type CalendarInviteInput = {
  id: string;
  title: string;
  instructorName: string;
  mode: string;
  concern: string;
  message: string;
  start: string;
  end: string;
  meetingUrl?: string | null;
  venue?: string | null;
};

export function downloadConsultationInvite({
  id,
  title,
  instructorName,
  mode,
  concern,
  message,
  start,
  end,
  meetingUrl,
  venue,
}: CalendarInviteInput) {
  const startsAt = new Date(start);
  const endsAt = new Date(end);
  const fileName = sanitizeFileName(
    `${title}-${startsAt.toISOString().slice(0, 10)}.ics`,
  );
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BulSU Consultation Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(id)}@bulsu-consultation-scheduler`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startsAt)}`,
    `DTEND:${formatIcsDate(endsAt)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `LOCATION:${escapeIcsText(venue || meetingUrl || mode)}`,
    ...(meetingUrl ? [`URL:${escapeIcsText(meetingUrl)}`] : []),
    `DESCRIPTION:${escapeIcsText(
      [
        "Consultation Appointment",
        "",
        `Instructor: ${instructorName}`,
        `Consultation format: ${mode}`,
        ...(meetingUrl ? [`Meeting link: ${meetingUrl}`] : []),
        ...(venue ? [`F2F location: ${venue}`] : []),
        `Purpose: ${concern}`,
        "",
        "Student concern:",
        message,
        "",
        "Please prepare the necessary files, notes, or academic outputs before the consultation.",
      ].join("\n"),
    )}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcsText(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function sanitizeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*]+/g, "-").replace(/\s+/g, "-");
}
