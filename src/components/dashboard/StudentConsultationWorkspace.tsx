"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
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
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  message: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  created_at: string;
};

type OccupiedSlot = {
  id: string;
  availability_id: string;
  instructor_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
};

type SelectedAvailability = {
  availability: Availability;
  day: string;
  freeStart: string;
  freeEnd: string;
};

type StudentProfile = {
  program: string | null;
  section: string | null;
  phone_number: string | null;
};

function normalizeAvailabilityRows(rows: AvailabilityRow[]): Availability[] {
  return rows.map((item) => ({
    ...item,
    instructor: Array.isArray(item.instructor) ? item.instructor[0] ?? null : item.instructor ?? null,
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
  const [occupiedConsultations, setOccupiedConsultations] = useState(occupiedSlots);
  const [selectedAvailability, setSelectedAvailability] = useState<SelectedAvailability | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const pendingRequests = studentRequests.filter((request) => request.status === "pending").length;
  const upcomingRequests = studentRequests.filter((request) => request.status === "approved").length;

  useEffect(() => {
    const supabase = createClient();

    async function refreshAvailability({ silent = false, refreshRoute = false }: { silent?: boolean; refreshRoute?: boolean } = {}) {
      const { data, error } = await supabase
        .from("instructor_availability")
        .select("id, instructor_id, instructor_display_name, start_datetime, end_datetime, consultation_mode, availability_programs(program), instructor:profiles!instructor_availability_instructor_id_fkey(full_name, email)")
        .eq("is_active", true)
        .order("start_datetime", { ascending: true });

      if (error) {
        if (!silent) {
          setToast({ message: "Could not refresh consultation windows.", tone: "error" });
        }
        return;
      }

      const nextWindows = normalizeAvailabilityRows(data ?? []);
      setAvailableWindows(nextWindows);
      setSelectedAvailability((current) =>
        current && !nextWindows.some((item) => item.id === current.availability.id)
          ? null
          : current,
      );
      if (refreshRoute) {
        router.refresh();
      }
    }

    async function refreshRequests({ silent = false }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultation_requests")
        .select("id, availability_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) {
          setToast({ message: "Could not refresh consultation requests.", tone: "error" });
        }
        return;
      }

      setStudentRequests((data ?? []) as ConsultationRequest[]);
    }

    async function refreshOccupiedSlots({ silent = false }: { silent?: boolean } = {}) {
      const { data, error } = await supabase
        .from("student_occupied_consultation_slots")
        .select("id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime");

      if (error) {
        if (!silent) {
          setToast({ message: "Could not refresh occupied consultation times.", tone: "error" });
        }
        return;
      }

      setOccupiedConsultations((data ?? []) as OccupiedSlot[]);
    }

    function refreshStudentWorkspace({ silent = false }: { silent?: boolean } = {}) {
      void refreshAvailability({ silent, refreshRoute: true });
      void refreshRequests({ silent });
      void refreshOccupiedSlots({ silent });
    }

    const channel = supabase
      .channel("student-availability-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "instructor_availability" }, () => refreshAvailability({ refreshRoute: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_programs" }, () => refreshAvailability({ refreshRoute: true }))
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, () => refreshStudentWorkspace())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshAvailability({ refreshRoute: true }))
      .subscribe();

    const interval = window.setInterval(() => refreshStudentWorkspace({ silent: true }), 5000);
    const refreshOnFocus = () => refreshStudentWorkspace({ silent: true });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [router]);

  async function submitRequest(availabilityItem: Availability, requestedStart: Date, requestedEnd: Date, concernType: ConsultationRequest["concern_type"], message: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setToast({ message: "Your session expired. Please sign in again.", tone: "error" });
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
      .select("id, availability_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at")
      .single();

    if (error || !data) {
      const duplicate = error?.code === "23505";
      setToast({
        message: duplicate
          ? "You already sent a request for this consultation window."
          : error?.message ?? "Could not send your consultation request.",
        tone: "error",
      });
      return false;
    }

    setStudentRequests((current) => [data as ConsultationRequest, ...current]);
    setSelectedAvailability(null);
    setToast({ message: "Consultation request sent for instructor review.", tone: "success" });
    return true;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SessionTimeout />
      <DashboardHeader />

      <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Student dashboard</p>
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
          <SummaryCard icon={CalendarRange} label="Approved consultations" value={String(upcomingRequests)} />
          <SummaryCard icon={ClipboardList} label="Pending requests" value={String(pendingRequests)} />
          <SummaryCard
            icon={UserRound}
            label="Profile status"
            value={profileComplete ? "Complete" : "Incomplete"}
            tone={profileComplete ? "success" : "warning"}
          />
        </section>

        <section id="calendar" className={`mt-8 grid gap-6 ${profileComplete ? "lg:grid-cols-1" : "lg:grid-cols-[1.45fr_0.55fr]"}`}>
          <CalendarPanel
            locked={!profileComplete}
            availability={availableWindows}
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
                <h2 className="mt-1 text-2xl font-medium tracking-tight">Consultation history</h2>
              </div>
              <ClipboardList className="size-5 text-muted-foreground" />
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Review all pending, approved, declined, and cancelled consultation requests in one organized page.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Total requests</p>
                <p className="mt-2 text-2xl font-medium">{studentRequests.length}</p>
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
                <h2 className="mt-1 text-xl font-medium tracking-tight">Start with a clear concern</h2>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Prepare your research, grades, project, or other academic question before requesting a meeting.
            </p>
          </div>
        </section>
      </div>
      {selectedAvailability && (
        <RequestConsultationModal
          availability={selectedAvailability.availability}
          freeStart={selectedAvailability.freeStart}
          freeEnd={selectedAvailability.freeEnd}
          occupiedSlots={occupiedConsultations}
          onClose={() => setSelectedAvailability(null)}
          onSubmit={submitRequest}
        />
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="border-t-4 border-primary border-b border-border bg-card">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
        <Link href="/dashboard/student" className="font-semibold tracking-tight" aria-label="Refresh student dashboard">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-2">
          <nav className="mr-3 hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
            <a href="#calendar" className="font-medium text-primary">Dashboard</a>
            <a href="#calendar" className="transition hover:text-foreground">Consultations</a>
            <a href="/onboarding" className="transition hover:text-foreground">My profile</a>
          </nav>
          <button className="hidden size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground sm:flex" aria-label="Notifications">
            <Bell className="size-4" />
          </button>
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof CalendarRange;
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-7 text-primary" />
      </div>
      <p className={`mt-5 text-3xl font-medium tracking-tight ${tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : ""}`}>
        {value}
      </p>
      <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        {tone === "warning" ? "Action required" : "No records yet"}
      </div>
    </div>
  );
}

function CalendarPanel({
  locked,
  availability,
  profile,
  occupiedSlots,
  onSelectAvailability,
}: {
  locked: boolean;
  availability: Availability[];
  profile: StudentProfile | null;
  occupiedSlots: OccupiedSlot[];
  onSelectAvailability: (selection: SelectedAvailability) => void;
}) {
  const studentProgram = profile?.program ?? null;
  const visibleAvailability = useMemo(
    () =>
      availability.filter((item) => {
        if (!studentProgram) return true;
        const allowedPrograms = item.availability_programs ?? [];
        return !allowedPrograms.length || allowedPrograms.some(({ program }) => program === studentProgram);
      }),
    [availability, studentProgram],
  );
  const firstAvailabilityDate = visibleAvailability[0]?.start_datetime ?? new Date().toISOString();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(firstAvailabilityDate)));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);

  function moveWeek(amount: number) {
    setWeekStart((current) => addDays(current, amount * 7));
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date()));
  }
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Consultation calendar</p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Find a time to talk</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={goToToday} className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:border-primary/40 hover:text-primary">Today</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => moveWeek(-1)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Previous week"><ChevronLeft className="size-4" /></button>
            <p className="min-w-44 text-center text-sm font-medium">{weekLabel(weekStart, weekDays[6])}</p>
            <button type="button" onClick={() => moveWeek(1)} className="rounded-lg border border-border p-2 text-muted-foreground transition hover:text-foreground" aria-label="Next week"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className={`transition ${locked ? "select-none blur-[2px]" : ""}`} aria-hidden={locked}>
        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border bg-muted/20">
              <div />
              {weekDays.map((day) => <div key={day.toISOString()} className={`border-l border-border px-2 py-3 text-center ${isSameDay(day, new Date()) ? "bg-primary/10" : ""}`}><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{day.toLocaleDateString(undefined, { weekday: "short" })}</p><p className={`mt-1 text-sm font-medium ${isSameDay(day, new Date()) ? "text-primary" : ""}`}>{day.getDate()}</p></div>)}
            </div>
            <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
              <div>{hours.map((hour) => <div key={hour} className="h-16 border-b border-border px-2 pt-2 text-[10px] text-muted-foreground">{formatHour(hour)}</div>)}</div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="relative border-l border-border">
                  {hours.map((hour) => (
                    <div key={hour} className="h-16 border-b border-border" />
                  ))}
                  {visibleAvailability
                    .filter((item) => eventTouchesDay(item, day))
                    .flatMap((item) => {
                      const dayWindow = requestWindowForDay(item, localDateKey(day));
                      const occupiedForWindow = occupiedSlots.filter(
                        (slot) =>
                          slot.availability_id === item.id &&
                          requestTouchesDay(slot, day),
                      );
                      return buildFreeSegments(dayWindow.start, dayWindow.end, occupiedForWindow).map((segment) => ({
                        availability: item,
                        freeStart: segment.start,
                        freeEnd: segment.end,
                      }));
                    })
                    .sort((first, second) => first.freeStart.getTime() - second.freeStart.getTime())
                    .map((slot) => (
                      <StudentRequestableSlot
                        key={`${slot.availability.id}-${day.toISOString()}-${slot.freeStart.toISOString()}`}
                        availability={slot.availability}
                        day={day}
                        freeStart={slot.freeStart}
                        freeEnd={slot.freeEnd}
                        onSelect={onSelectAvailability}
                      />
                    ))}
                </div>
              ))}
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
            <h3 className="mt-4 text-lg font-medium">Complete your profile first</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Your calendar is ready, but we need your program and section before you can book a consultation.</p>
            <Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">
              Go to my profile <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function StudentAvailabilityEvent({ availability }: { availability: Availability }) {
  const start = new Date(availability.start_datetime);
  const end = new Date(availability.end_datetime);
  const format = availability.consultation_mode === "f2f" ? "Face-to-face" : availability.consultation_mode === "online" ? "Online" : "Online or face-to-face";

  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);

  return <button type="button" className="calendar-availability absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg border border-primary/30 px-2 py-1.5 text-left text-xs text-white shadow-sm transition" style={{ top, height }} title={format}><span className="block font-semibold">{format}</span><span className="block truncate">{start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – {end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span></button>;
}

function StudentRequestableSlot({
  availability,
  day,
  freeStart,
  freeEnd,
  onSelect,
}: {
  availability: Availability;
  day: Date;
  freeStart: Date;
  freeEnd: Date;
  onSelect: (selection: SelectedAvailability) => void;
}) {
  const format = consultationModeLabel(availability.consultation_mode);
  const professor = professorName(availability);
  const startHour = Math.max(7, freeStart.getHours() + freeStart.getMinutes() / 60);
  const endHour = Math.min(21, freeEnd.getHours() + freeEnd.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);

  return (
    <button
      type="button"
      onClick={() =>
        onSelect({
          availability,
          day: localDateKey(day),
          freeStart: freeStart.toISOString(),
          freeEnd: freeEnd.toISOString(),
        })
      }
      className="calendar-availability absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg border border-primary/30 px-2 py-1.5 text-left text-xs text-white shadow-sm transition hover:brightness-95"
      style={{ top, height }}
      title={`${format} with ${professor}`}
    >
      <span className="block font-semibold">{format}</span>
      <span className="block truncate">
        {timeLabel(freeStart)} - {timeLabel(freeEnd)}
      </span>
      <span className="mt-1 block truncate text-[11px] text-white/85">{professor}</span>
    </button>
  );
}

function RequestConsultationModal({
  availability,
  freeStart,
  freeEnd,
  occupiedSlots,
  onClose,
  onSubmit,
}: {
  availability: Availability;
  freeStart: string;
  freeEnd: string;
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
  const [concernType, setConcernType] = useState<ConsultationRequest["concern_type"]>("research");
  const [message, setMessage] = useState("");
  const [selectedStartIndex, setSelectedStartIndex] = useState(0);
  const [selectedEndIndex, setSelectedEndIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const dayWindow = {
    start: new Date(freeStart),
    end: new Date(freeEnd),
  };
  const professor = professorName(availability);
  const occupiedForSelectedWindow = occupiedSlots.filter(
    (slot) =>
      slot.availability_id === availability.id &&
      requestTouchesDay(slot, dayWindow.start),
  );
  const freeSegments = buildFreeSegments(dayWindow.start, dayWindow.end, occupiedForSelectedWindow);
  const startOptions = freeSegments.flatMap((segment) =>
    buildTimeOptions(segment.start, segment.end).slice(0, -1),
  );
  const safeStartIndex = Math.min(selectedStartIndex, Math.max(0, startOptions.length - 1));
  const selectedStart = startOptions[safeStartIndex] ?? startOptions[0];
  const selectedSegment = selectedStart
    ? freeSegments.find(
        (segment) => selectedStart >= segment.start && selectedStart < segment.end,
      )
    : undefined;
  const endOptions =
    selectedStart && selectedSegment
      ? buildTimeOptions(selectedStart, selectedSegment.end).slice(1)
      : [];
  const safeEndIndex = Math.min(selectedEndIndex, Math.max(0, endOptions.length - 1));
  const selectedEnd = endOptions[safeEndIndex] ?? endOptions[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStart || !selectedEnd) return;
    setSaving(true);
    const saved = await onSubmit(availability, selectedStart, selectedEnd, concernType, message.trim());
    if (!saved) setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-sm text-muted-foreground">Request consultation</p>
            <h3 className="mt-1 text-2xl font-medium tracking-tight">{professor}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {dayWindow.start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, available {timeLabel(dayWindow.start)} - {timeLabel(dayWindow.end)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close request modal">
            <X className="size-5" />
          </button>
        </div>

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
                onChange={(event) => setSelectedEndIndex(Number(event.target.value))}
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
          <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-3 text-sm text-muted-foreground">
            Cancel
          </button>
          <button disabled={saving || !selectedStart || !selectedEnd} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {saving ? "Sending..." : "Send request"}
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function startOfWeek(date: Date) { const result = new Date(date); result.setHours(0, 0, 0, 0); const day = result.getDay(); result.setDate(result.getDate() - (day === 0 ? 6 : day - 1)); return result; }
function addDays(date: Date, amount: number) { const result = new Date(date); result.setDate(result.getDate() + amount); return result; }
function isSameDay(first: Date, second: Date) { return first.toDateString() === second.toDateString(); }
function eventTouchesDay(availability: Availability, day: Date) { const start = new Date(availability.start_datetime); const end = new Date(availability.end_datetime); const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()); const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1); return start < dayEnd && end > dayStart; }
function requestTouchesDay(slot: OccupiedSlot, day: Date) { const start = new Date(slot.requested_start_datetime); const end = new Date(slot.requested_end_datetime); const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()); const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1); return start < dayEnd && end > dayStart; }
function localDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function requestWindowForDay(availability: Availability, dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const availabilityStart = new Date(availability.start_datetime);
  const availabilityEnd = new Date(availability.end_datetime);
  const windowStart = new Date(year, month - 1, day, availabilityStart.getHours(), availabilityStart.getMinutes());
  const windowEnd = new Date(year, month - 1, day, availabilityEnd.getHours(), availabilityEnd.getMinutes());

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
function buildFreeSegments(start: Date, end: Date, occupiedSlots: OccupiedSlot[]) {
  const occupied = occupiedSlots
    .map((slot) => ({
      start: new Date(Math.max(start.getTime(), new Date(slot.requested_start_datetime).getTime())),
      end: new Date(Math.min(end.getTime(), new Date(slot.requested_end_datetime).getTime())),
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

  return segments.filter((segment) => segment.end.getTime() - segment.start.getTime() >= 30 * 60_000);
}
function consultationModeLabel(mode: Availability["consultation_mode"]) { return mode === "f2f" ? "Face-to-face" : mode === "online" ? "Online" : "Online or face-to-face"; }
function professorName(availability: Availability) {
  const displayName = availability.instructor_display_name?.trim();
  if (displayName) return displayName;
  const name = availability.instructor?.full_name?.trim();
  if (name) return name;
  const emailName = availability.instructor?.email?.split("@")[0]?.trim();
  return emailName || "Instructor";
}
function timeLabel(date: Date) { return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
function formatHour(hour: number) { const suffix = hour >= 12 ? "PM" : "AM"; const value = hour % 12 || 12; return `${value} ${suffix}`; }
function weekLabel(start: Date, end: Date) { return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`; }

function ProfileStatusPanel({ complete }: { complete: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">Profile setup</p>
      <h2 className="mt-1 text-2xl font-medium tracking-tight">{complete ? "You are ready" : "Finish your details"}</h2>
      <div className="mt-7 rounded-xl bg-muted/40 p-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-muted-foreground">Program and section</span><span className={complete ? "text-emerald-600" : "text-amber-600"}>{complete ? "Complete" : "Required"}</span></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full bg-primary transition-all ${complete ? "w-full" : "w-1/2"}`} /></div>
      </div>
      <Link href="/onboarding" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
        {complete ? "Update my profile" : "Complete my profile"} <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}
