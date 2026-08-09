"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  Maximize2,
  Minimize2,
  Send,
  X,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";
import { NotificationBell } from "@/components/dashboard/NotificationBell";

import {
  StudentApprovedConsultationModal,
  type ApprovedConsultation,
} from "@/components/dashboard/StudentApprovedConsultationModal";

type Availability = {
  id: string;
  instructor_id: string;
  instructor_display_name?: string | null;
  start_datetime: string;
  end_datetime: string;
  consultation_mode: "f2f" | "online" | "both";
  availability_programs?: { program: string }[];
  instructor?: { full_name: string | null; email: string | null } | null;
};

type AvailabilityRow = Omit<Availability, "instructor"> & {
  instructor?:
    | { full_name: string | null; email: string | null }[]
    | { full_name: string | null; email: string | null }
    | null;
};

type ConsultationRequest = {
  id: string;
  availability_id: string;
  instructor_id?: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  message: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  created_at: string;
  instructor?: { full_name: string | null; email: string | null } | null;
  availability?: {
    consultation_mode: Availability["consultation_mode"];
  } | null;
};

type ConsultationRequestRow = Omit<
  ConsultationRequest,
  "instructor" | "availability"
> & {
  instructor?:
    | { full_name: string | null; email: string | null }[]
    | { full_name: string | null; email: string | null }
    | null;
  availability?:
    | { consultation_mode: Availability["consultation_mode"] }[]
    | { consultation_mode: Availability["consultation_mode"] }
    | null;
};

type OccupiedSlot = {
  id: string;
  availability_id: string;
  instructor_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
};

type CalendarBlocker = {
  requested_start_datetime: string;
  requested_end_datetime: string;
};

type AvailabilityChoice = {
  availability: Availability;
  freeStart: string;
  freeEnd: string;
};

type SelectedAvailability = {
  day: string;
  freeStart: string;
  freeEnd: string;
  choices: AvailabilityChoice[];
};

type RequestableSlot = {
  availability: Availability;
  freeStart: Date;
  freeEnd: Date;
  lane: number;
  laneCount: number;
};

type PendingRequestSlot = {
  request: ConsultationRequest;
  start: Date;
  end: Date;
  lane: number;
  laneCount: number;
};

type ApprovedRequestSlot = {
  request: ConsultationRequest;
  start: Date;
  end: Date;
  lane: number;
  laneCount: number;
};

type StudentCalendarLayout = {
  availabilitySlots: RequestableSlot[];
  pendingSlots: PendingRequestSlot[];
  approvedSlots: ApprovedRequestSlot[];
};

function readableCalendarBlockHeight(
  baseHeight: number,
  textValues: string[],
  laneCount: number,
) {
  const visibleTextLength = textValues.join(" ").length;
  const narrowLanePenalty = laneCount > 1 ? 18 : 0;
  const wrappedTextPenalty = Math.min(
    36,
    Math.max(0, Math.ceil((visibleTextLength - 42) / 22) * 12),
  );

  return Math.max(baseHeight, 76 + narrowLanePenalty + wrappedTextPenalty);
}

function visualEndTimeForCalendarBlock(
  start: Date,
  actualEnd: Date,
  textValues: string[],
) {
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(
    21,
    actualEnd.getHours() + actualEnd.getMinutes() / 60,
  );
  const baseHeight = Math.max(34, (endHour - startHour) * 64);
  const readableHeight = readableCalendarBlockHeight(baseHeight, textValues, 1);
  const visualDurationMs = (readableHeight / 64) * 60 * 60 * 1000;

  return Math.max(actualEnd.getTime(), start.getTime() + visualDurationMs);
}

type StudentProfile = {
  program: string | null;
  section: string | null;
  phone_number: string | null;
};

function normalizeAvailabilityRows(rows: AvailabilityRow[]): Availability[] {
  return rows.map((item) => ({
    ...item,
    instructor: Array.isArray(item.instructor)
      ? (item.instructor[0] ?? null)
      : (item.instructor ?? null),
  }));
}

function normalizeConsultationRequestRows(
  rows: ConsultationRequestRow[],
): ConsultationRequest[] {
  return rows.map((request) => ({
    ...request,
    instructor: Array.isArray(request.instructor)
      ? (request.instructor[0] ?? null)
      : (request.instructor ?? null),
    availability: Array.isArray(request.availability)
      ? (request.availability[0] ?? null)
      : (request.availability ?? null),
  }));
}

export function StudentConsultationWorkspace({
  displayName,
  profile,
  availability,
  requests,
  occupiedSlots,
}: {
  displayName: string;
  email: string;
  profile: StudentProfile | null;
  availability: Availability[];
  requests: ConsultationRequest[];
  occupiedSlots: OccupiedSlot[];
}) {
  const router = useRouter();
  const profileComplete = Boolean(profile?.program && profile?.section);
  const [availableWindows, setAvailableWindows] = useState(availability);
  const [studentRequests, setStudentRequests] = useState(requests);
  const [occupiedConsultations, setOccupiedConsultations] =
    useState(occupiedSlots);
  const [selectedAvailability, setSelectedAvailability] =
    useState<SelectedAvailability | null>(null);
  const [selectedApprovedConsultation, setSelectedApprovedConsultation] =
    useState<ApprovedConsultation | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const pendingRequests = studentRequests.filter(
    (request) => request.status === "pending",
  ).length;
  const approvedRequests = studentRequests.filter(
    (request) => request.status === "approved",
  );
  const upcomingConsultations = approvedRequests
    .filter((request) => new Date(request.requested_end_datetime) >= new Date())
    .sort(
      (first, second) =>
        new Date(first.requested_start_datetime).getTime() -
        new Date(second.requested_start_datetime).getTime(),
    );

  useEffect(() => {
    const supabase = createClient();

    async function refreshAvailability({
      silent = false,
      refreshRoute = false,
    }: { silent?: boolean; refreshRoute?: boolean } = {}) {
      const { data, error } = await supabase
        .from("instructor_availability")
        .select(
          "id, instructor_id, instructor_display_name, start_datetime, end_datetime, consultation_mode, availability_programs(program), instructor:profiles!instructor_availability_instructor_id_fkey(full_name, email)",
        )
        .eq("is_active", true)
        .order("start_datetime", { ascending: true });

      if (error) {
        if (!silent) {
          setToast({
            message: "Could not refresh consultation windows.",
            tone: "error",
          });
        }
        return;
      }

      const nextWindows = normalizeAvailabilityRows(data ?? []);
      setAvailableWindows(nextWindows);
      setSelectedAvailability((current) =>
        current &&
        !current.choices.some((choice) =>
          nextWindows.some((item) => item.id === choice.availability.id),
        )
          ? null
          : current,
      );
      if (refreshRoute) {
        router.refresh();
      }
    }

    async function refreshRequests({
      silent = false,
    }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultation_requests")
        .select(
          "id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode)",
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) {
          setToast({
            message: "Could not refresh consultation requests.",
            tone: "error",
          });
        }
        return;
      }

      setStudentRequests(
        normalizeConsultationRequestRows(
          (data ?? []) as ConsultationRequestRow[],
        ),
      );
    }

    async function refreshOccupiedSlots({
      silent = false,
    }: { silent?: boolean } = {}) {
      const { data, error } = await supabase
        .from("student_occupied_consultation_slots")
        .select(
          "id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime",
        );

      if (error) {
        if (!silent) {
          setToast({
            message: "Could not refresh occupied consultation times.",
            tone: "error",
          });
        }
        return;
      }

      setOccupiedConsultations((data ?? []) as OccupiedSlot[]);
    }

    function refreshStudentWorkspace({
      silent = false,
    }: { silent?: boolean } = {}) {
      void refreshAvailability({ silent, refreshRoute: true });
      void refreshRequests({ silent });
      void refreshOccupiedSlots({ silent });
    }

    const channel = supabase
      .channel("student-availability-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instructor_availability" },
        () => refreshAvailability({ refreshRoute: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_programs" },
        () => refreshAvailability({ refreshRoute: true }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultation_requests" },
        () => refreshStudentWorkspace(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => refreshAvailability({ refreshRoute: true }),
      )
      .subscribe();

    const interval = window.setInterval(
      () => refreshStudentWorkspace({ silent: true }),
      5000,
    );
    const refreshOnFocus = () => refreshStudentWorkspace({ silent: true });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [router]);

  async function submitRequest(
    availabilityItem: Availability,
    requestedStart: Date,
    requestedEnd: Date,
    concernType: ConsultationRequest["concern_type"],
    message: string,
  ) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setToast({
        message: "Your session expired. Please sign in again.",
        tone: "error",
      });
      return false;
    }

    const { data, error } = await supabase
      .from("consultation_requests")
      .insert({
        availability_id: availabilityItem.id,
        student_id: user.id,
        instructor_id: availabilityItem.instructor_id,
        requested_start_datetime: requestedStart.toISOString(),
        requested_end_datetime: requestedEnd.toISOString(),
        concern_type: concernType,
        message,
      })
      .select(
        "id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode)",
      )
      .single();

    if (error || !data) {
      const duplicate = error?.code === "23505";
      setToast({
        message: duplicate
          ? "You already sent a request for this consultation window."
          : (error?.message ?? "Could not send your consultation request."),
        tone: "error",
      });
      return false;
    }

    setStudentRequests((current) => [
      normalizeConsultationRequestRows([data as ConsultationRequestRow])[0],
      ...current,
    ]);
    setSelectedAvailability(null);
    setToast({
      message: "Consultation request sent for instructor review.",
      tone: "success",
    });
    return true;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SessionTimeout />
      <DashboardHeader />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Student dashboard
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
              Welcome, {displayName}.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Keep your academic consultations organized and moving forward.
            </p>
          </div>
          <Link
            href={profileComplete ? "#calendar" : "/onboarding"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            {profileComplete ? "Find a consultation" : "Complete your profile"}
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={CalendarRange}
            label="Upcoming consultations"
            value={String(upcomingConsultations.length)}
            detail={
              upcomingConsultations.length
                ? "Confirmed meetings"
                : "No confirmed meetings"
            }
          />
          <SummaryCard
            icon={ClipboardList}
            label="Pending requests"
            value={String(pendingRequests)}
            detail={
              pendingRequests
                ? "Awaiting instructor review"
                : "No pending requests"
            }
          />
          <SummaryCard
            icon={UserRound}
            label="Profile status"
            value={profileComplete ? "Complete" : "Incomplete"}
            tone={profileComplete ? "success" : "warning"}
            detail={profileComplete ? "Ready to request" : "Action required"}
          />
        </section>

        <UpcomingConsultationCard
          requests={upcomingConsultations}
          onSelect={(request) => setSelectedApprovedConsultation(request)}
        />

        <PendingConsultationsCard
          requests={studentRequests.filter(
            (request) => request.status === "pending",
          )}
          onSelect={(request) =>
            setSelectedApprovedConsultation(request)
          }
        />

        <section
          id="calendar"
          className={`mt-8 grid gap-6 ${profileComplete ? "lg:grid-cols-1" : "lg:grid-cols-[1.45fr_0.55fr]"}`}
        >
          <CalendarPanel
            locked={!profileComplete}
            availability={availableWindows}
            requests={studentRequests}
            profile={profile}
            occupiedSlots={occupiedConsultations}
            onSelectAvailability={setSelectedAvailability}
          />
          {!profileComplete && <ProfileStatusPanel complete={false} />}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Your activity</p>
                <h2 className="mt-1 text-2xl font-medium tracking-tight">
                  Consultation history
                </h2>
              </div>
              <ClipboardList className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Review all pending, approved, declined, and cancelled consultation
              requests in one organized page.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Total requests</p>
                <p className="mt-2 text-2xl font-medium">
                  {studentRequests.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Needs response</p>
                <p className="mt-2 text-2xl font-medium">{pendingRequests}</p>
              </div>
            </div>
            <Link
              href="/dashboard/student/history"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              View full history
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Need guidance?</p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">
                  Start with a clear concern
                </h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Prepare your research, grades, project, or other academic question
              before requesting a meeting.
            </p>
          </div>
        </section>
      </div>
      {selectedAvailability && (
        <RequestConsultationModal
          choices={selectedAvailability.choices}
          occupiedSlots={occupiedConsultations}
          onClose={() => setSelectedAvailability(null)}
          onSubmit={submitRequest}
        />
      )}
      {selectedApprovedConsultation && (
        <StudentApprovedConsultationModal
          request={selectedApprovedConsultation}
          onClose={() => setSelectedApprovedConsultation(null)}
          onUpdated={handleApprovedConsultationUpdated}
          onCancelled={handleApprovedConsultationCancelled}
          onToast={(message, tone) => setToast({ message, tone })}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="border-t-4 border-primary border-b border-border bg-card">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:gap-5 sm:px-8 lg:px-12">
        <Link
          href="/dashboard/student"
          className="font-semibold tracking-tight"
          aria-label="Refresh student dashboard"
        >
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-2">
          <nav className="mr-3 hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#calendar" className="font-medium text-primary">
              Dashboard
            </a>
            <Link
              href="/dashboard/student/history"
              className="transition hover:text-foreground"
            >
              History
            </Link>
            <a href="/onboarding" className="transition hover:text-foreground">
              My profile
            </a>
          </nav>
          <NotificationBell role="student" />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto border-t border-border px-5 py-3 text-sm text-muted-foreground sm:px-8 lg:hidden lg:px-12">
        <Link
          href="/dashboard/student"
          className="shrink-0 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          Dashboard
        </Link>
        <Link
          href="/dashboard/student/history"
          className="shrink-0 rounded-full border border-border px-4 py-2"
        >
          History
        </Link>
        <Link
          href="/onboarding"
          className="shrink-0 rounded-full border border-border px-4 py-2"
        >
          My profile
        </Link>
      </nav>
    </header>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-7 text-primary" />
      </div>
      <p
        className={`mt-5 text-3xl font-medium tracking-tight ${tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : ""}`}
      >
        {value}
      </p>
      <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        {detail}
      </div>
    </div>
  );
}

function UpcomingConsultationCard({
  requests,
  onSelect,
}: {
  requests: ConsultationRequest[];
  onSelect: (request: ConsultationRequest) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePosition = requests.length ? activeIndex % requests.length : 0;
  const request = requests.length ? requests[activePosition] : null;

  if (!request) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Upcoming consultation
            </p>
            <h2 className="mt-1 text-2xl font-medium tracking-tight">
              No confirmed schedule yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Approved consultation requests will appear here clearly once an
              instructor confirms one.
            </p>
          </div>
          <Link
            href="#calendar"
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            Find a time
          </Link>
        </div>
      </section>
    );
  }

  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  const calendarMonth = start
    .toLocaleDateString(undefined, { month: "short" })
    .toUpperCase();
  const calendarDay = start.getDate();
  const hasMoreMeetings = requests.length > 1;
  const instructorName = consultationInstructorName(request);
  const format = request.availability?.consultation_mode
    ? consultationModeLabel(request.availability.consultation_mode)
    : "Consultation";

  function showNextMeeting() {
    setActiveIndex((current) => (current + 1) % requests.length);
  }

  return (
    <section className="relative mt-6">
      {hasMoreMeetings && (
        <>
          <div className="absolute inset-x-4 top-3 h-full rounded-3xl bg-transparent shadow-[0_18px_0_-8px_rgba(75,85,201,0.18)] dark:shadow-[0_18px_0_-8px_rgba(129,140,248,0.18)]" />
          <div className="absolute inset-x-8 top-6 h-full rounded-3xl bg-transparent shadow-[0_22px_0_-8px_rgba(75,85,201,0.1)] dark:shadow-[0_22px_0_-8px_rgba(129,140,248,0.12)]" />
        </>
      )}

      <button
        type="button"
        key={request.id}
        onClick={() => onSelect(request)}
        className="consultation-card-swap relative block w-full overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary via-primary to-indigo-500 text-left text-primary-foreground shadow-lg shadow-primary/10 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/20"
      >
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="pointer-events-none absolute -right-16 -top-28 size-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative min-w-0 flex-1">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] shadow-sm backdrop-blur">
              Confirmed consultation
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Next consultation scheduled
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-primary-foreground/80">
              Approved by {instructorName}. Prepare your concern details before
              the meeting.
            </p>
            {hasMoreMeetings && (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-primary-foreground/60">
                {activePosition + 1} of {requests.length} upcoming meetings
              </p>
            )}
          </div>

          <div className="relative flex shrink-0 flex-col gap-3 rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur-sm sm:min-w-[28rem] sm:flex-row sm:items-center">
            <div className="overflow-hidden rounded-xl bg-white text-primary shadow-md shadow-primary/20">
              <div className="bg-slate-950 px-5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                {calendarMonth}
              </div>
              <div className="px-6 py-3 text-center text-3xl font-bold leading-none">
                {calendarDay}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5">
                {start.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white/14 px-3 py-1 text-primary-foreground/90">
                  {format}
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1 text-primary-foreground/90">
                  {timeLabel(start)} - {timeLabel(end)}
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1 capitalize text-primary-foreground/85">
                  {request.concern_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        {hasMoreMeetings && (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              showNextMeeting();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                showNextMeeting();
              }
            }}
            className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-semibold text-primary shadow-md shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Next
            <ChevronRight className="size-4" />
          </span>
        )}
      </button>
    </section>
  );
}

function PendingConsultationsCard({
  requests,
  onSelect,
}: {
  requests: ConsultationRequest[];
  onSelect: (request: ConsultationRequest) => void;
}) {
  if (!requests.length) {
    return null;
  }

  return (
    <section className="mt-6 rounded-3xl border border-amber-500/20 bg-card p-6 shadow-sm sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-amber-600">
            Pending requests
          </p>

          <h2 className="mt-1 text-2xl font-medium tracking-tight">
            Waiting for instructor review
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Click a request to see its complete details.
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {requests.length}
        </div>
      </div>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {requests.map((request) => {
          const start = new Date(
            request.requested_start_datetime,
          );

          const end = new Date(
            request.requested_end_datetime,
          );

          const instructorName =
            request.instructor?.full_name?.trim() ||
            request.instructor?.email?.split("@")[0] ||
            "Instructor";

          const concern = {
            research: "Research",
            grades: "Grades",
            projects: "Projects",
            others: "Others",
          }[request.concern_type];

          const mode =
            request.availability?.consultation_mode === "f2f"
              ? "Face-to-face"
              : request.availability?.consultation_mode ===
                  "online"
                ? "Online"
                : request.availability?.consultation_mode ===
                    "both"
                  ? "Face-to-face / Online"
                  : "Consultation";

          return (
            <button
              key={request.id}
              type="button"
              onClick={() => onSelect(request)}
              className="group flex w-full flex-col gap-4 bg-card p-5 text-left transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Pending
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {concern}
                  </span>
                </div>

                <p className="mt-2 truncate font-medium">
                  {instructorName}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {start.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" · "}
                  {start.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {end.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {mode}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                View details
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function CalendarPanel({
  locked,
  availability,
  requests,
  profile,
  occupiedSlots,
  onSelectAvailability,
}: {
  locked: boolean;
  availability: Availability[];
  requests: ConsultationRequest[];
  profile: StudentProfile | null;
  occupiedSlots: OccupiedSlot[];
  onSelectAvailability: (selection: SelectedAvailability) => void;
}) {
  const studentProgram = profile?.program ?? null;
  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );
  const approvedRequests = requests.filter(
    (request) => request.status === "approved",
  );
  const visibleAvailability = useMemo(
    () =>
      availability.filter((item) => {
        if (!studentProgram) return true;
        const allowedPrograms = item.availability_programs ?? [];
        return (
          !allowedPrograms.length ||
          allowedPrograms.some(({ program }) => program === studentProgram)
        );
      }),
    [availability, studentProgram],
  );
  const firstAvailabilityDate =
    visibleAvailability[0]?.start_datetime ?? new Date().toISOString();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(firstAvailabilityDate)),
  );
  const [fullView, setFullView] = useState(false);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const requestableSlotsByDay = useMemo(
    () =>
      new Map(
        weekDays.map((day) => [
          localDateKey(day),
          buildStudentRequestableSlotsForDay({
            availability: visibleAvailability,
            occupiedSlots,
            pendingRequests,
            day,
          }),
        ]),
      ),
    [weekDays, visibleAvailability, occupiedSlots, pendingRequests],
  );
  const expandedDayCount = weekDays.filter(
    (day) => (requestableSlotsByDay.get(localDateKey(day))?.length ?? 0) > 1,
  ).length;
  const calendarMinWidthRem =
    3.5 + expandedDayCount * 20 + (7 - expandedDayCount) * 9;
  const calendarColumns = `3.5rem ${weekDays
    .map((day) => {
      const slotCount =
        requestableSlotsByDay.get(localDateKey(day))?.length ?? 0;
      return slotCount > 1 ? "minmax(20rem, 2.4fr)" : "minmax(9rem, 1fr)";
    })
    .join(" ")}`;

  useEffect(() => {
    if (!fullView) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullView]);

  function moveWeek(amount: number) {
    const nextWeekStart = addDays(weekStart, amount * 7);
    setWeekStart(nextWeekStart);
  }

  function goToToday() {
    const today = new Date();
    setWeekStart(startOfWeek(today));
  }

  const calendarSection = (
    <section
      className={`relative border border-border bg-card p-4 transition-all sm:p-8 ${
        fullView
          ? "flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-background p-0"
          : "overflow-hidden rounded-2xl"
      }`}
    >
      {fullView && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:border-primary/40 hover:text-primary"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="min-w-40 text-center text-xs font-medium">
            {weekLabel(weekStart, weekDays[6])}
          </p>
          <button
            type="button"
            onClick={() => moveWeek(1)}
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setFullView(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            aria-label="Exit full calendar view"
          >
            <Minimize2 className="size-3.5" />
            Exit
          </button>
        </div>
      )}

      <div
        className={`flex flex-col justify-between gap-4 sm:flex-row sm:items-end ${fullView ? "hidden" : ""}`}
      >
        <div>
          <p className="text-sm text-muted-foreground">Consultation calendar</p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">
            Find a time to talk
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-44 text-center text-sm font-medium">
              {weekLabel(weekStart, weekDays[6])}
            </p>
            <button
              type="button"
              onClick={() => moveWeek(1)}
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFullView(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            aria-label="Open full calendar view"
          >
            <Maximize2 className="size-3.5" />
            Full view
          </button>
        </div>
      </div>

      <div
        className={`min-h-0 transition ${fullView ? "flex flex-1 flex-col" : ""} ${locked ? "select-none blur-[2px]" : ""}`}
        aria-hidden={locked}
      >
        <p
          className={`mt-4 text-xs text-muted-foreground sm:hidden ${fullView ? "hidden" : ""}`}
        >
          Swipe the calendar sideways to see wider day columns.
        </p>
        <div
          className={`overflow-auto border border-border ${fullView ? "m-0 min-h-0 flex-1 rounded-none border-0" : "mt-3 max-h-[44rem] rounded-xl sm:mt-5"}`}
        >
          <div
            className={fullView ? "min-h-full" : ""}
            style={{ minWidth: `max(100%, ${calendarMinWidthRem}rem)` }}
          >
            <div
              className="grid border-b border-border bg-muted/20 transition-[grid-template-columns]"
              style={{ gridTemplateColumns: calendarColumns }}
            >
              <div />
              {weekDays.map((day) => {
                const dayKey = localDateKey(day);
                const hasMultipleSlots =
                  (requestableSlotsByDay.get(dayKey)?.length ?? 0) > 1;

                return (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-border px-2 py-3 text-center transition ${
                      hasMultipleSlots
                        ? "bg-primary/15"
                        : isSameDay(day, new Date())
                          ? "bg-primary/10"
                          : ""
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${hasMultipleSlots || isSameDay(day, new Date()) ? "text-primary" : ""}`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>
            <div
              className="grid transition-[grid-template-columns]"
              style={{ gridTemplateColumns: calendarColumns }}
            >
              <div>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-border px-2 pt-2 text-[10px] text-muted-foreground"
                  >
                    {formatHour(hour)}
                  </div>
                ))}
              </div>
              {weekDays.map((day) => {
                const dayKey = localDateKey(day);
                const dayLayout = layoutStudentCalendarDay({
                  availabilitySlots: requestableSlotsByDay.get(dayKey) ?? [],
                  pendingRequests: pendingRequests.filter((request) =>
                    consultationRequestTouchesDay(request, day),
                  ),
                  approvedRequests: approvedRequests.filter((request) =>
                    consultationRequestTouchesDay(request, day),
                  ),
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="relative border-l border-border"
                  >
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b border-border" />
                    ))}
                    {dayLayout.availabilitySlots.map((slot) => (
                      <StudentRequestableSlot
                        key={`${slot.availability.id}-${day.toISOString()}-${slot.freeStart.toISOString()}-${slot.freeEnd.toISOString()}`}
                        day={day}
                        slot={slot}
                        onSelect={onSelectAvailability}
                      />
                    ))}
                    {dayLayout.pendingSlots.map((slot) => (
                      <StudentPendingRequestSlot
                        key={`${slot.request.id}-${day.toISOString()}`}
                        slot={slot}
                      />
                    ))}
                    {dayLayout.approvedSlots.map((slot) => (
                      <StudentApprovedRequestSlot
                        key={`${slot.request.id}-${day.toISOString()}`}
                        slot={slot}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/55 px-6 backdrop-blur-[1px]">
          <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-primary">
              <LockKeyhole className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-medium">
              Complete your profile first
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your calendar is ready, but we need your program and section
              before you can book a consultation.
            </p>
            <Link
              href="/onboarding"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Go to my profile <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );

  if (fullView && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed left-0 top-0 z-[9999] h-screen w-screen overflow-hidden bg-background">
        {calendarSection}
      </div>,
      document.body,
    );
  }

  return calendarSection;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StudentAvailabilityEvent({
  availability,
}: {
  availability: Availability;
}) {
  const start = new Date(availability.start_datetime);
  const end = new Date(availability.end_datetime);
  const format =
    availability.consultation_mode === "f2f"
      ? "F2F"
      : availability.consultation_mode === "online"
        ? "Online"
        : "Online or F2F";

  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);

  return (
    <button
      type="button"
      className="calendar-availability absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg border border-primary/30 px-2 py-1.5 text-left text-xs text-white shadow-sm transition"
      style={{ top, height }}
      title={format}
    >
      <span className="block font-semibold">{format}</span>
      <span className="block truncate">
        {start.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        –{" "}
        {end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </button>
  );
}

function StudentRequestableSlot({
  day,
  slot,
  onSelect,
}: {
  day: Date;
  slot: RequestableSlot;
  onSelect: (selection: SelectedAvailability) => void;
}) {
  const format = consultationModeLabel(slot.availability.consultation_mode);
  const professor = professorName(slot.availability);
  const colors = instructorScheduleColor(slot.availability);
  const freeStart = slot.freeStart;
  const freeEnd = slot.freeEnd;
  const startHour = Math.max(
    7,
    freeStart.getHours() + freeStart.getMinutes() / 60,
  );
  const endHour = Math.min(21, freeEnd.getHours() + freeEnd.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);
  const gap = 4;
  const laneWidth = 100 / slot.laneCount;
  const width = `calc(${laneWidth}% - ${gap}px)`;
  const left = `calc(${slot.lane * laneWidth}% + ${gap / 2}px)`;

  return (
    <button
      type="button"
      onClick={() =>
        onSelect({
          day: localDateKey(day),
          freeStart: freeStart.toISOString(),
          freeEnd: freeEnd.toISOString(),
          choices: [
            {
              availability: slot.availability,
              freeStart: slot.freeStart.toISOString(),
              freeEnd: slot.freeEnd.toISOString(),
            },
          ],
        })
      }
      className="absolute z-10 flex flex-col justify-center overflow-hidden rounded-lg border px-3 py-2 text-left text-xs leading-tight text-white shadow-sm transition hover:brightness-95"
      style={{
        top,
        height,
        left,
        width,
        background: colors.background,
        borderColor: colors.border,
        boxShadow: `0 12px 24px -18px ${colors.shadow}`,
      }}
      title={`${format} with ${professor}`}
    >
      <span className="block whitespace-normal break-words font-semibold">
        {format}
      </span>
      <span className="block whitespace-normal break-words">
        {timeLabel(freeStart)} - {timeLabel(freeEnd)}
      </span>
      <span className="mt-1 block whitespace-normal break-words text-[11px] text-white/85">
        {professor}
      </span>
    </button>
  );
}

function StudentPendingRequestSlot({ slot }: { slot: PendingRequestSlot }) {
  const { request, start, end } = slot;
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const timeHeight = Math.max(34, (endHour - startHour) * 64);
  const gap = 4;
  const laneWidth = 100 / slot.laneCount;
  const width = `calc(${laneWidth}% - ${gap}px)`;
  const left = `calc(${slot.lane * laneWidth}% + ${gap / 2}px)`;
  const timeRange = `${timeLabel(start)} - ${timeLabel(end)}`;
  const height = readableCalendarBlockHeight(
    timeHeight,
    ["Pending", "Awaiting review", timeRange, request.concern_type],
    slot.laneCount,
  );
  const compact = height < 64;
  const roomy = height >= 92;

  return (
    <div
      className={`absolute z-20 overflow-hidden rounded-lg border border-amber-400/80 bg-amber-300/75 text-left text-amber-950 shadow-[0_14px_28px_-18px_rgba(180,83,9,0.75)] backdrop-blur-md transition dark:border-amber-300/60 dark:bg-amber-400/70 dark:text-amber-950 ${
        compact
          ? "flex items-center gap-1.5 px-2 py-1 text-[10px]"
          : "flex flex-col justify-center px-3 py-2 text-xs"
      }`}
      style={{ top, height, left, width }}
      title="Pending instructor review"
    >
      <span
        className={`inline-flex w-fit items-center rounded-full bg-white/70 font-bold uppercase text-amber-900 shadow-sm dark:bg-amber-100/80 dark:text-amber-950 ${
          compact
            ? "px-1.5 py-0.5 text-[8px] tracking-[0.08em]"
            : "px-2 py-0.5 text-[10px] tracking-[0.12em]"
        }`}
      >
        Pending
      </span>
      <span
        className={`${compact ? "min-w-0 truncate" : "mt-2 block"} font-semibold leading-tight`}
      >
        Awaiting review
      </span>
      <span
        className={`${compact ? "shrink-0" : "mt-1 block"} font-medium leading-tight`}
      >
        {timeRange}
      </span>
      {roomy && (
        <span className="mt-1 block whitespace-normal break-words text-[11px] leading-tight text-amber-900/85 capitalize dark:text-amber-950/80">
          {request.concern_type}
        </span>
      )}
    </div>
  );
}

function StudentApprovedRequestSlot({ slot }: { slot: ApprovedRequestSlot }) {
  const { request, start, end } = slot;
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const timeHeight = Math.max(34, (endHour - startHour) * 64);
  const gap = 4;
  const laneWidth = 100 / slot.laneCount;
  const width = `calc(${laneWidth}% - ${gap}px)`;
  const left = `calc(${slot.lane * laneWidth}% + ${gap / 2}px)`;
  const format = request.availability?.consultation_mode
    ? consultationModeLabel(request.availability.consultation_mode)
    : "Confirmed";
  const timeRange = `${timeLabel(start)} - ${timeLabel(end)}`;
  const height = readableCalendarBlockHeight(
    timeHeight,
    ["Approved", format, timeRange, request.concern_type],
    slot.laneCount,
  );
  const compact = height < 64;
  const roomy = height >= 92;

  return (
    <div
      className={`absolute z-30 overflow-hidden rounded-lg border border-emerald-400/80 bg-emerald-500/75 text-left text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,0.82)] backdrop-blur-md dark:border-emerald-300/60 dark:bg-emerald-400/70 dark:text-emerald-950 ${
        compact
          ? "flex items-center gap-1.5 px-2 py-1 text-[10px]"
          : "flex flex-col justify-center px-3 py-2 text-xs"
      }`}
      style={{ top, height, left, width }}
      title="Approved consultation"
    >
      <span
        className={`inline-flex w-fit items-center rounded-full bg-white/25 font-bold uppercase text-white shadow-sm dark:bg-emerald-100/80 dark:text-emerald-950 ${
          compact
            ? "px-1.5 py-0.5 text-[8px] tracking-[0.08em]"
            : "px-2 py-0.5 text-[10px] tracking-[0.12em]"
        }`}
      >
        Approved
      </span>
      <span
        className={`${compact ? "min-w-0 truncate" : "mt-2 block"} font-semibold leading-tight`}
      >
        {format}
      </span>
      <span
        className={`${compact ? "shrink-0" : "mt-1 block"} font-medium leading-tight`}
      >
        {timeRange}
      </span>
      {roomy && (
        <span className="mt-1 block whitespace-normal break-words text-[11px] leading-tight text-white/85 capitalize dark:text-emerald-950/80">
          {request.concern_type}
        </span>
      )}
    </div>
  );
}

function RequestConsultationModal({
  choices,
  occupiedSlots,
  onClose,
  onSubmit,
}: {
  choices: AvailabilityChoice[];
  occupiedSlots: OccupiedSlot[];
  onClose: () => void;
  onSubmit: (
    availability: Availability,
    requestedStart: Date,
    requestedEnd: Date,
    concernType: ConsultationRequest["concern_type"],
    message: string,
  ) => Promise<boolean>;
}) {
  const [concernType, setConcernType] =
    useState<ConsultationRequest["concern_type"]>("research");
  const [message, setMessage] = useState("");
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState(0);
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [selectedEndIndex, setSelectedEndIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const safeChoiceIndex = Math.min(
    selectedChoiceIndex,
    Math.max(0, choices.length - 1),
  );
  const selectedChoice = choices[safeChoiceIndex] ?? choices[0];
  const availability = selectedChoice.availability;
  const dayWindow = {
    start: new Date(selectedChoice.freeStart),
    end: new Date(selectedChoice.freeEnd),
  };
  const professor = professorName(availability);
  const occupiedForSelectedWindow = occupiedSlots.filter(
    (slot) =>
      slot.availability_id === availability.id &&
      requestTouchesDay(slot, dayWindow.start),
  );
  const freeSegments = buildFreeSegments(
    dayWindow.start,
    dayWindow.end,
    occupiedForSelectedWindow,
  );
  const startOptions = freeSegments.flatMap((segment) =>
    buildTimeOptions(segment.start, segment.end).slice(0, -1),
  );
  const safeStartIndex = Math.min(
    selectedStartIndex,
    Math.max(0, startOptions.length - 1),
  );
  const selectedStart = startOptions[safeStartIndex] ?? startOptions[0];
  const selectedSegment = selectedStart
    ? freeSegments.find(
        (segment) =>
          selectedStart >= segment.start && selectedStart < segment.end,
      )
    : undefined;
  const endOptions =
    selectedStart && selectedSegment
      ? buildTimeOptions(selectedStart, selectedSegment.end).slice(1)
      : [];
  const safeEndIndex = Math.min(
    selectedEndIndex,
    Math.max(0, endOptions.length - 1),
  );
  const selectedEnd = endOptions[safeEndIndex] ?? endOptions[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStart || !selectedEnd) return;
    setSaving(true);
    const saved = await onSubmit(
      availability,
      selectedStart,
      selectedEnd,
      concernType,
      message.trim(),
    );
    if (!saved) setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-sm text-muted-foreground">
              Request consultation
            </p>
            <h3 className="mt-1 text-2xl font-medium tracking-tight">
              {professor}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {dayWindow.start.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              , available {timeLabel(dayWindow.start)} -{" "}
              {timeLabel(dayWindow.end)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close request modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {choices.length > 1 && (
          <div className="mt-5">
            <p className="text-sm font-medium">Choose instructor</p>
            <div className="mt-3 grid gap-3">
              {choices.map((choice, index) => {
                const choiceStart = new Date(choice.freeStart);
                const choiceEnd = new Date(choice.freeEnd);
                const selected = index === safeChoiceIndex;

                return (
                  <button
                    type="button"
                    key={choice.availability.id}
                    onClick={() => {
                      setSelectedChoiceIndex(index);
                      setSelectedStartIndex(0);
                      setSelectedEndIndex(0);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground shadow-sm"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {professorName(choice.availability)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {consultationModeLabel(
                        choice.availability.consultation_mode,
                      )}{" "}
                      · {timeLabel(choiceStart)} - {timeLabel(choiceEnd)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-sm font-medium">Select your preferred time</p>
          {startOptions.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Starts
                <select
                  className="profile-input"
                  value={safeStartIndex}
                  onChange={(event) => {
                    setSelectedStartIndex(Number(event.target.value));
                    setSelectedEndIndex(0);
                  }}
                >
                  {startOptions.map((option, index) => (
                    <option key={option.toISOString()} value={index}>
                      {timeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Ends
                <select
                  className="profile-input"
                  value={safeEndIndex}
                  onChange={(event) =>
                    setSelectedEndIndex(Number(event.target.value))
                  }
                >
                  {endOptions.map((option, index) => (
                    <option key={option.toISOString()} value={index}>
                      {timeLabel(option)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This consultation window is fully occupied.
            </div>
          )}
          {occupiedForSelectedWindow.length > 0 && (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Occupied portions are removed from the time choices.
            </p>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium">Purpose</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["research", "Research"],
                ["grades", "Grades"],
                ["projects", "Projects"],
                ["others", "Others"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                onClick={() => setConcernType(value)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${concernType === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium">
          Concern details
          <textarea
            className="profile-input min-h-32 resize-none"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Briefly explain what you want to consult about."
            required
          />
        </label>

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm text-muted-foreground"
          >
            Cancel
          </button>
          <button
            disabled={saving || !selectedStart || !selectedEnd}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Sending..." : "Send request"}
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}
function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}
function isSameDay(first: Date, second: Date) {
  return first.toDateString() === second.toDateString();
}
function eventTouchesDay(availability: Availability, day: Date) {
  const start = new Date(availability.start_datetime);
  const end = new Date(availability.end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return start < dayEnd && end > dayStart;
}
function requestTouchesDay(slot: OccupiedSlot, day: Date) {
  const start = new Date(slot.requested_start_datetime);
  const end = new Date(slot.requested_end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return start < dayEnd && end > dayStart;
}
function consultationRequestTouchesDay(
  request: ConsultationRequest,
  day: Date,
) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return start < dayEnd && end > dayStart;
}
function localDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function requestWindowForDay(availability: Availability, dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const availabilityStart = new Date(availability.start_datetime);
  const availabilityEnd = new Date(availability.end_datetime);
  const windowStart = new Date(
    year,
    month - 1,
    day,
    availabilityStart.getHours(),
    availabilityStart.getMinutes(),
  );
  const windowEnd = new Date(
    year,
    month - 1,
    day,
    availabilityEnd.getHours(),
    availabilityEnd.getMinutes(),
  );

  if (windowEnd <= windowStart) {
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  return {
    start: windowStart,
    end: windowEnd,
  };
}
function buildTimeOptions(start: Date, end: Date) {
  const options: Date[] = [];
  const cursor = new Date(start);
  cursor.setSeconds(0, 0);

  while (cursor.getTime() <= end.getTime()) {
    options.push(new Date(cursor));
    cursor.setTime(cursor.getTime() + 30 * 60_000);
  }

  if (options.at(-1)?.getTime() !== end.getTime()) {
    options.push(new Date(end));
  }

  return options;
}
function buildStudentRequestableSlotsForDay({
  availability,
  occupiedSlots,
  pendingRequests,
  day,
}: {
  availability: Availability[];
  occupiedSlots: OccupiedSlot[];
  pendingRequests: ConsultationRequest[];
  day: Date;
}) {
  return availability
    .filter((item) => eventTouchesDay(item, day))
    .flatMap((item) => {
      const dayWindow = requestWindowForDay(item, localDateKey(day));
      const occupiedForWindow = occupiedSlots.filter(
        (slot) =>
          slot.availability_id === item.id && requestTouchesDay(slot, day),
      );
      const pendingForWindow = pendingRequests.filter(
        (request) =>
          request.availability_id === item.id &&
          consultationRequestTouchesDay(request, day),
      );
      const unavailableForWindow = [...occupiedForWindow, ...pendingForWindow];

      return buildFreeSegments(
        dayWindow.start,
        dayWindow.end,
        unavailableForWindow,
      ).map((segment) => ({
        availability: item,
        freeStart: segment.start,
        freeEnd: segment.end,
        lane: 0,
        laneCount: 1,
      }));
    });
}
function layoutStudentCalendarDay({
  availabilitySlots,
  pendingRequests,
  approvedRequests,
}: {
  availabilitySlots: RequestableSlot[];
  pendingRequests: ConsultationRequest[];
  approvedRequests: ConsultationRequest[];
}): StudentCalendarLayout {
  type CalendarEntry =
    | {
        type: "availability";
        start: Date;
        end: Date;
        visualEnd: number;
        slot: RequestableSlot;
        lane: number;
        laneCount: number;
      }
    | {
        type: "pending";
        start: Date;
        end: Date;
        visualEnd: number;
        request: ConsultationRequest;
        lane: number;
        laneCount: number;
      }
    | {
        type: "approved";
        start: Date;
        end: Date;
        visualEnd: number;
        request: ConsultationRequest;
        lane: number;
        laneCount: number;
      };

  const entries = [
    ...availabilitySlots.map((slot) => ({
      type: "availability" as const,
      start: slot.freeStart,
      end: slot.freeEnd,
      visualEnd: slot.freeEnd.getTime(),
      slot,
      lane: 0,
      laneCount: 1,
    })),
    ...pendingRequests.map((request) => ({
      type: "pending" as const,
      start: new Date(request.requested_start_datetime),
      end: new Date(request.requested_end_datetime),
      visualEnd: visualEndTimeForCalendarBlock(
        new Date(request.requested_start_datetime),
        new Date(request.requested_end_datetime),
        [
          "Pending",
          "Awaiting review",
          `${timeLabel(new Date(request.requested_start_datetime))} - ${timeLabel(new Date(request.requested_end_datetime))}`,
          request.concern_type,
        ],
      ),
      request,
      lane: 0,
      laneCount: 1,
    })),
    ...approvedRequests.map((request) => ({
      type: "approved" as const,
      start: new Date(request.requested_start_datetime),
      end: new Date(request.requested_end_datetime),
      visualEnd: visualEndTimeForCalendarBlock(
        new Date(request.requested_start_datetime),
        new Date(request.requested_end_datetime),
        [
          "Approved",
          request.availability?.consultation_mode
            ? consultationModeLabel(request.availability.consultation_mode)
            : "Confirmed",
          `${timeLabel(new Date(request.requested_start_datetime))} - ${timeLabel(new Date(request.requested_end_datetime))}`,
          request.concern_type,
        ],
      ),
      request,
      lane: 0,
      laneCount: 1,
    })),
  ].sort(
    (first, second) => first.start.getTime() - second.start.getTime(),
  ) satisfies CalendarEntry[];

  const clusters: (typeof entries)[] = [];
  let currentCluster: typeof entries = [];
  let currentClusterEnd = 0;

  for (const entry of entries) {
    if (!currentCluster.length || entry.start.getTime() < currentClusterEnd) {
      currentCluster.push(entry);
      currentClusterEnd = Math.max(currentClusterEnd, entry.visualEnd);
    } else {
      clusters.push(currentCluster);
      currentCluster = [entry];
      currentClusterEnd = entry.visualEnd;
    }
  }

  if (currentCluster.length) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const laneEnds: number[] = [];

    for (const entry of cluster) {
      const availableLane = laneEnds.findIndex(
        (endTime) => endTime <= entry.start.getTime(),
      );
      const lane = availableLane === -1 ? laneEnds.length : availableLane;
      laneEnds[lane] = entry.visualEnd;
      if (entry.type === "availability") {
        entry.slot.lane = lane;
      }
      entry.lane = lane;
    }

    for (const entry of cluster) {
      if (entry.type === "availability") {
        entry.slot.laneCount = laneEnds.length;
      }
      entry.laneCount = laneEnds.length;
    }
  }

  return {
    availabilitySlots: entries
      .filter((entry) => entry.type === "availability")
      .map((entry) => entry.slot),
    pendingSlots: entries
      .filter((entry) => entry.type === "pending")
      .map((entry) => ({
        request: entry.request,
        start: entry.start,
        end: entry.end,
        lane: entry.lane,
        laneCount: entry.laneCount,
      })),
    approvedSlots: entries
      .filter((entry) => entry.type === "approved")
      .map((entry) => ({
        request: entry.request,
        start: entry.start,
        end: entry.end,
        lane: entry.lane,
        laneCount: entry.laneCount,
      })),
  };
}
function buildFreeSegments(
  start: Date,
  end: Date,
  occupiedSlots: CalendarBlocker[],
) {
  const occupied = occupiedSlots
    .map((slot) => ({
      start: new Date(
        Math.max(
          start.getTime(),
          new Date(slot.requested_start_datetime).getTime(),
        ),
      ),
      end: new Date(
        Math.min(
          end.getTime(),
          new Date(slot.requested_end_datetime).getTime(),
        ),
      ),
    }))
    .filter((slot) => slot.end > slot.start)
    .sort((first, second) => first.start.getTime() - second.start.getTime());
  const segments: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start);

  for (const slot of occupied) {
    if (slot.start > cursor) {
      segments.push({ start: new Date(cursor), end: new Date(slot.start) });
    }
    if (slot.end > cursor) {
      cursor = new Date(slot.end);
    }
  }

  if (cursor < end) {
    segments.push({ start: new Date(cursor), end: new Date(end) });
  }

  return segments.filter(
    (segment) => segment.end.getTime() - segment.start.getTime() >= 30 * 60_000,
  );
}
function consultationModeLabel(mode: Availability["consultation_mode"]) {
  return mode === "f2f"
    ? "F2F"
    : mode === "online"
      ? "Online"
      : "Online or F2F";
}
function consultationInstructorName(request: ConsultationRequest) {
  const name = request.instructor?.full_name?.trim();
  if (name) return name;
  const emailName = request.instructor?.email?.split("@")[0]?.trim();
  return emailName || "the instructor";
}
function instructorScheduleColor(availability: Availability) {
  const palette = [
    {
      background: "linear-gradient(135deg, #2563eb, #3b82f6)",
      border: "rgba(191, 219, 254, 0.72)",
      shadow: "#2563eb",
    },
    {
      background: "linear-gradient(135deg, #0284c7, #38bdf8)",
      border: "rgba(186, 230, 253, 0.72)",
      shadow: "#0284c7",
    },
    {
      background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
      border: "rgba(191, 219, 254, 0.72)",
      shadow: "#1d4ed8",
    },
    {
      background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      border: "rgba(221, 214, 254, 0.72)",
      shadow: "#7c3aed",
    },
    {
      background: "linear-gradient(135deg, #db2777, #ec4899)",
      border: "rgba(251, 207, 232, 0.72)",
      shadow: "#db2777",
    },
    {
      background: "linear-gradient(135deg, #c026d3, #e879f9)",
      border: "rgba(245, 208, 254, 0.72)",
      shadow: "#c026d3",
    },
    {
      background: "linear-gradient(135deg, #4f46e5, #6366f1)",
      border: "rgba(199, 210, 254, 0.72)",
      shadow: "#4f46e5",
    },
    {
      background: "linear-gradient(135deg, #475569, #64748b)",
      border: "rgba(203, 213, 225, 0.72)",
      shadow: "#475569",
    },
    {
      background: "linear-gradient(135deg, #be123c, #f43f5e)",
      border: "rgba(254, 205, 211, 0.72)",
      shadow: "#be123c",
    },
    {
      background: "linear-gradient(135deg, #9333ea, #a855f7)",
      border: "rgba(233, 213, 255, 0.72)",
      shadow: "#9333ea",
    },
  ];
  const key =
    availability.instructor_id ||
    availability.instructor_display_name ||
    availability.instructor?.email ||
    availability.id;
  const hash = Array.from(key).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );
  return palette[hash % palette.length];
}
function professorName(availability: Availability) {
  const displayName = availability.instructor_display_name?.trim();
  if (displayName) return displayName;
  const name = availability.instructor?.full_name?.trim();
  if (name) return name;
  const emailName = availability.instructor?.email?.split("@")[0]?.trim();
  return emailName || "Instructor";
}
function timeLabel(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const value = hour % 12 || 12;
  return `${value} ${suffix}`;
}
function weekLabel(start: Date, end: Date) {
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}
function handleApprovedConsultationUpdated(
  updatedRequest: ApprovedConsultation,
) {
  setStudentRequests((current) =>
    current.map((request) =>
      request.id === updatedRequest.id
        ? {
            ...request,
            ...updatedRequest,
          }
        : request,
    ),
  );

  setSelectedApprovedConsultation(updatedRequest);
}

function handleApprovedConsultationCancelled(requestId: string) {
  setStudentRequests((current) =>
    current.map((request) =>
      request.id === requestId
        ? {
            ...request,
            status: "cancelled",
            decision_note: "Cancelled by student.",
          }
        : request,
    ),
  );

  setSelectedApprovedConsultation(null);
}
function ProfileStatusPanel({ complete }: { complete: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">Profile setup</p>
      <h2 className="mt-1 text-2xl font-medium tracking-tight">
        {complete ? "You are ready" : "Finish your details"}
      </h2>
      <div className="mt-7 rounded-xl bg-muted/40 p-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Program and section</span>
          <span className={complete ? "text-emerald-600" : "text-amber-600"}>
            {complete ? "Complete" : "Required"}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full bg-primary transition-all ${complete ? "w-full" : "w-1/2"}`}
          />
        </div>
      </div>
      <Link
        href="/onboarding"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {complete ? "Update my profile" : "Complete my profile"}{" "}
        <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}
