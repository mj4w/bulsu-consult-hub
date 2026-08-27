"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  Download,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { downloadConsultationInvite } from "@/lib/calendar/ics";

type InstructorRequestSummary = {
  id: string;
  requested_start_datetime: string;
  requested_end_datetime?: string;
  concern_type?: "research" | "grades" | "projects" | "others";
  message?: string | null;
  status: "pending" | "approved" | "declined" | "cancelled";
  student?:
    | {
        full_name: string | null;
        email: string | null;
        program: string | null;
        section: string | null;
      }
    | {
        full_name: string | null;
        email: string | null;
        program: string | null;
        section: string | null;
      }[]
    | null;
  availability?:
    | {
        consultation_mode: "f2f" | "online" | "both";
        meeting_url?: string | null;
        venue?: string | null;
      }
    | {
        consultation_mode: "f2f" | "online" | "both";
        meeting_url?: string | null;
        venue?: string | null;
      }[]
    | null;
};

type InstructorAvailabilitySummary = {
  id: string;
  is_active: boolean;
};

export function InstructorSummaryCards({
  initialAvailability,
  initialRequests,
}: {
  initialAvailability: InstructorAvailabilitySummary[];
  initialRequests: InstructorRequestSummary[];
}) {
  const [availability, setAvailability] = useState(initialAvailability);
  const [requests, setRequests] = useState(initialRequests);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const nowTimer = window.setInterval(() => setNow(Date.now()), 60_000);
    const supabase = createClient();

    async function refreshAvailability() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("instructor_availability")
        .select("id, is_active")
        .eq("instructor_id", user.id);

      setAvailability((data ?? []) as InstructorAvailabilitySummary[]);
    }

    async function refreshRequests() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("consultation_requests")
        .select("id, requested_start_datetime, requested_end_datetime, concern_type, message, status, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode, meeting_url, venue)")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      setRequests((data ?? []) as InstructorRequestSummary[]);
    }

    function refreshAll() {
      void refreshAvailability();
      void refreshRequests();
    }

    const channel = supabase
      .channel("instructor-summary-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "instructor_availability" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, refreshRequests)
      .subscribe();

    const refreshOnFocus = () => refreshAll();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(nowTimer);
      supabase.removeChannel(channel);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const activeAvailability = availability.filter((item) => item.is_active).length;
  const nextApproved = requests
    .filter(
      (request) =>
        request.status === "approved" &&
        request.requested_end_datetime &&
        new Date(request.requested_end_datetime).getTime() >= now,
    )
    .sort(
      (first, second) =>
        new Date(first.requested_start_datetime).getTime() -
        new Date(second.requested_start_datetime).getTime(),
    )[0];
  const latestPending = requests
    .filter((request) => request.status === "pending")
    .sort(
      (first, second) =>
        new Date(first.requested_start_datetime).getTime() -
        new Date(second.requested_start_datetime).getTime(),
    )[0];
  const confirmedToday = requests.filter((request) => {
    if (request.status !== "approved") return false;
    const requestedStart = new Date(request.requested_start_datetime);
    const today = new Date();
    return (
      requestedStart.getFullYear() === today.getFullYear() &&
      requestedStart.getMonth() === today.getMonth() &&
      requestedStart.getDate() === today.getDate()
    );
  }).length;

  return (
    <section className="mt-8 space-y-4">
      {latestPending && (
        <Link
          href="/dashboard/instructor/requests"
          className="group flex flex-col justify-between gap-4 rounded-[1.5rem] border border-[#f5b800]/35 bg-[linear-gradient(135deg,rgba(245,184,0,0.18),rgba(165,28,48,0.08))] p-5 transition hover:-translate-y-0.5 hover:border-[#f5b800]/55 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5b800] text-[#241316]">
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b7791f]">
                New student request
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {studentName(latestPending)} is waiting for review
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {requestDateTime(latestPending)}
                {latestPending.concern_type ? ` · ${concernLabel(latestPending.concern_type)}` : ""}
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#a51c30] px-4 py-2 text-sm font-semibold text-white">
            Review requests
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {nextApproved ? (
        <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#4f9b83]/12 text-[#3f8f75]">
                <CalendarCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  Next approved consultation
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                  {studentName(nextApproved)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {requestDateTime(nextApproved)}
                  {nextApproved.concern_type ? ` · ${concernLabel(nextApproved.concern_type)}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => downloadInstructorInvite(nextApproved)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted"
              >
                <Download className="size-4" />
                Download invite
              </button>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3">
                <Clock className="size-5 text-[#3f8f75]" />
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold text-[#3f8f75]">Confirmed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-card/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Next approved consultation
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                No confirmed student schedule yet
              </h2>
            </div>
            <CalendarCheck className="size-7 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={ClipboardList}
          label="Pending requests"
          value={String(pendingRequests)}
          detail={pendingRequests ? "Awaiting approval" : "No pending requests"}
        />
        <SummaryCard
          icon={CalendarDays}
          label="Confirmed today"
          value={String(confirmedToday)}
          detail={confirmedToday ? "Approved consultations" : "No approved consultations"}
        />
        <SummaryCard
          icon={CalendarRange}
          label="Open consultation windows"
          value={String(activeAvailability)}
          detail={activeAvailability ? "Available to students" : "None published"}
        />
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-7 text-[#a51c30]" />
      </div>
      <p className="mt-5 text-3xl font-medium tracking-tight">{value}</p>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function studentName(request: InstructorRequestSummary) {
  const student = Array.isArray(request.student)
    ? (request.student[0] ?? null)
    : (request.student ?? null);

  return (
    student?.full_name?.trim() ||
    student?.email?.split("@")[0] ||
    "Student"
  );
}

function studentProfile(request: InstructorRequestSummary) {
  return Array.isArray(request.student)
    ? (request.student[0] ?? null)
    : (request.student ?? null);
}

function requestAvailability(request: InstructorRequestSummary) {
  return Array.isArray(request.availability)
    ? (request.availability[0] ?? null)
    : (request.availability ?? null);
}

function downloadInstructorInvite(request: InstructorRequestSummary) {
  const student = studentProfile(request);
  const availability = requestAvailability(request);
  const format = availability?.consultation_mode
    ? consultationModeLabel(availability.consultation_mode)
    : "Consultation";

  downloadConsultationInvite({
    id: request.id,
    title: `Consultation with ${studentName(request)}`,
    instructorName: "Instructor",
    studentName: studentName(request),
    studentProgram: student?.program,
    studentSection: student?.section,
    mode: format,
    concern: request.concern_type
      ? concernLabel(request.concern_type)
      : "Consultation",
    message: request.message || "No concern details provided.",
    start: request.requested_start_datetime,
    end: request.requested_end_datetime ?? request.requested_start_datetime,
    meetingUrl: availability?.meeting_url,
    venue: availability?.venue,
  });
}

function consultationModeLabel(mode: "f2f" | "online" | "both") {
  if (mode === "f2f") return "F2F";
  if (mode === "online") return "Online";
  return "Online or F2F";
}

function requestDateTime(request: InstructorRequestSummary) {
  const start = new Date(request.requested_start_datetime);
  const end = request.requested_end_datetime
    ? new Date(request.requested_end_datetime)
    : null;

  return `${start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}${end ? ` - ${end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}` : ""}`;
}

function concernLabel(concern: NonNullable<InstructorRequestSummary["concern_type"]>) {
  return {
    research: "Research",
    grades: "Grades",
    projects: "Projects",
    others: "Other",
  }[concern];
}
