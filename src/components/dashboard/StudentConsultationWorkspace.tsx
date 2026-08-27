"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Maximize2,
  Menu,
  Minimize2,
  Monitor,
  Search,
  Send,
  SquareSplitHorizontal,
  X,
  UserRound,
} from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { SessionTimeout } from "@/components/auth/SessionTimeout";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardGuidedTour } from "@/components/dashboard/DashboardGuidedTour";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { StudentHelpWidget } from "@/components/dashboard/StudentHelpWidget";
import {
  StudentHistoryPanel,
  type StudentHistoryRequest,
} from "@/components/dashboard/StudentHistoryPanel";
import { ProfileForm } from "@/components/profile/ProfileForm";
import {
  isWalkthroughCompleted,
  markWalkthroughCompleted,
} from "@/lib/walkthroughs";

import {
  StudentApprovedConsultationModal,
  type ApprovedConsultation,
} from "@/components/dashboard/StudentApprovedConsultationModal";
import { notifyConsultationEmail } from "@/lib/email/client-notifications";

type Availability = {
  id: string;
  instructor_id: string;
  instructor_display_name?: string | null;
  start_datetime: string;
  end_datetime: string;
  consultation_mode: "f2f" | "online" | "both";
  meeting_platform?: "none" | "other" | null;
  meeting_url?: string | null;
  venue?: string | null;
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
  microsoft_calendar_event_id: string | null;
  microsoft_calendar_synced_at: string | null;
  instructor?: { full_name: string | null; email: string | null } | null;
  availability?: {
    consultation_mode: Availability["consultation_mode"];
    meeting_platform?: Availability["meeting_platform"];
    meeting_url?: string | null;
    venue?: string | null;
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
    | {
        consultation_mode: Availability["consultation_mode"];
        meeting_platform?: Availability["meeting_platform"];
        meeting_url?: string | null;
        venue?: string | null;
      }[]
    | {
        consultation_mode: Availability["consultation_mode"];
        meeting_platform?: Availability["meeting_platform"];
        meeting_url?: string | null;
        venue?: string | null;
      }
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

type StudentRequestSlot = {
  request: ConsultationRequest;
  start: Date;
  end: Date;
  lane: number;
  laneCount: number;
};

type StudentCalendarLayout = {
  availabilitySlots: RequestableSlot[];
  requestSlots: StudentRequestSlot[];
};

type StudentProfile = {
  full_name: string | null;
  program: string | null;
  section: string | null;
  phone_number: string | null;
  department: string | null;
  job_title: string | null;
  office_location: string | null;
  role: "student" | "instructor";
};

type StudentDashboardView = "dashboard" | "calendar" | "history" | "profile";

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
  email,
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
  const [activeView, setActiveView] =
    useState<StudentDashboardView>("dashboard");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourScope = `student_${activeView}`;
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
  const historyRequests = studentRequests.map(
    (request): StudentHistoryRequest => ({
      id: request.id,
      requested_start_datetime: request.requested_start_datetime,
      requested_end_datetime: request.requested_end_datetime,
      concern_type: request.concern_type,
      message: request.message,
      status: request.status,
      decision_note: request.decision_note,
      created_at: request.created_at,
      instructor: request.instructor ?? null,
    }),
  );
  const dashboardSearchResults = useMemo(() => {
    const query = dashboardSearch.trim().toLowerCase();
    if (!query) return [];

    return studentRequests
      .filter((request) => consultationSearchText(request).includes(query))
      .sort(
        (first, second) =>
          new Date(second.requested_start_datetime).getTime() -
          new Date(first.requested_start_datetime).getTime(),
      )
      .slice(0, 8);
  }, [dashboardSearch, studentRequests]);

  useEffect(() => {
    function viewFromHash(): StudentDashboardView | null {
      const hash = window.location.hash.replace("#", "");
      return hash === "calendar" ||
        hash === "history" ||
        hash === "profile" ||
        hash === "dashboard"
        ? hash
        : null;
    }

    const syncFromHash = () => {
      const nextView = viewFromHash();
      if (nextView) setActiveView(nextView);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (!searchParams.get("request")) return;

    const timer = window.setTimeout(() => {
      setActiveView("history");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;

    const timer = window.setTimeout(() => {
      setToast({
        message: `Welcome, ${displayName}.`,
        tone: "success",
      });
      router.replace("/dashboard/student", { scroll: false });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [displayName, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("profile") !== "saved") return;

    const timer = window.setTimeout(() => {
      setToast({
        message: "Profile saved successfully.",
        tone: "success",
      });
      router.replace("/dashboard/student", { scroll: false });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router, searchParams]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void isWalkthroughCompleted(tourScope).then((completed) => {
        if (cancelled || completed) return;
        setTourStep(0);
        setTourOpen(true);
      });
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tourScope]);

  function changeActiveView(view: StudentDashboardView) {
    setActiveView(view);
    const nextHash = view === "dashboard" ? "" : `#${view}`;
    const nextUrl = `${window.location.pathname}${nextHash}`;
    window.history.replaceState(null, "", nextUrl);
  }

  function openTour() {
    setTourStep(0);
    setTourOpen(true);
  }

  function closeTour() {
    setTourOpen(false);
  }

  useEffect(() => {
    const supabase = createClient();

    async function refreshAvailability({
      silent = false,
    }: { silent?: boolean } = {}) {
      const { data, error } = await supabase
        .from("instructor_availability")
        .select(
          "id, instructor_id, instructor_display_name, start_datetime, end_datetime, consultation_mode, meeting_platform, meeting_url, venue, availability_programs(program), instructor:profiles!instructor_availability_instructor_id_fkey(full_name, email)",
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
          "id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, microsoft_calendar_event_id, microsoft_calendar_synced_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode, meeting_platform, meeting_url, venue)",
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

      const nextRequests = normalizeConsultationRequestRows(
        (data ?? []) as ConsultationRequestRow[],
      );

      setStudentRequests(nextRequests);
      setSelectedApprovedConsultation((current) => {
        if (!current) return current;
        return nextRequests.find((request) => request.id === current.id) ?? null;
      });
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
      void refreshAvailability({ silent });
      void refreshRequests({ silent });
      void refreshOccupiedSlots({ silent });
    }

    const channel = supabase
      .channel("student-availability-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instructor_availability" },
        () => refreshAvailability(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_programs" },
        () => refreshAvailability(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultation_requests" },
        () => refreshStudentWorkspace(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => refreshAvailability(),
      )
      .subscribe();

    const fallbackAvailabilityRefresh = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshAvailability({ silent: true });
    }, 2_500);

    const refreshOnFocus = () => refreshStudentWorkspace({ silent: true });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(fallbackAvailabilityRefresh);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

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
        "id, availability_id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, microsoft_calendar_event_id, microsoft_calendar_synced_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email), availability:instructor_availability!consultation_requests_availability_id_fkey(consultation_mode, meeting_platform, meeting_url, venue)",
      )
      .single();

    if (error || !data) {
      const exactStudentDuplicate =
        error?.code === "23505" &&
        error.message.includes(
          "consultation_requests_student_active_exact_time",
        );
      setToast({
        message: exactStudentDuplicate
          ? "You already sent a request for this exact time slot."
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
    void notifyConsultationEmail(data.id, "request_submitted");
    return true;
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

  return (
    <main className="student-dashboard-shell relative isolate min-h-screen overflow-x-hidden text-foreground">
      <SessionTimeout />

      <div className="student-dashboard-backdrop pointer-events-none absolute inset-0 z-0" />

      <div
        className={`relative z-10 min-h-screen transition-[padding] duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <StudentSidebar
          tourId="student-sidebar"
          activeView={activeView}
          displayName={displayName}
          email={email}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          onViewChange={changeActiveView}
        />
        <section className="flex min-w-0 flex-1 flex-col">
          <StudentTopBar
            tourId="student-topbar"
            activeView={activeView}
            sidebarCollapsed={sidebarCollapsed}
            onViewChange={changeActiveView}
            search={dashboardSearch}
            onSearchChange={setDashboardSearch}
            searchResults={dashboardSearchResults}
            onSelectSearchResult={(request) => {
              setSelectedApprovedConsultation(request);
              setDashboardSearch("");
            }}
            onOpenTour={openTour}
          />

          <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:pt-24">
            <div
              data-tour="student-hero"
              className="relative rounded-[1.5rem] border border-border bg-card p-5 sm:p-7"
            >
              <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a51c30]">
                    {activeView === "dashboard"
                      ? "Student dashboard"
                      : activeView === "calendar"
                        ? "Calendar"
                        : activeView === "history"
                          ? "Consultation history"
                          : "My profile"}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    {activeView === "dashboard" && `Welcome, ${displayName}.`}
                    {activeView === "calendar" && "Find a time to talk."}
                    {activeView === "history" && "Review your requests."}
                    {activeView === "profile" && "Manage your academic details."}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {activeView === "dashboard" &&
                      "Review your consultation statistics and current status."}
                    {activeView === "calendar" &&
                      "Browse available instructor windows and open approved requests."}
                    {activeView === "history" &&
                      "Search and review pending, approved, declined, and cancelled consultations."}
                    {activeView === "profile" &&
                      "Update the student information instructors need before consultation."}
                  </p>
                </div>
                <Link
                  href={profileComplete ? "#" : "/onboarding"}
                  onClick={(event) => {
                    if (!profileComplete) return;
                    event.preventDefault();
                    if (activeView === "calendar") {
                      changeActiveView("history");
                      return;
                    }
                    changeActiveView("calendar");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  {profileComplete
                    ? activeView === "dashboard"
                      ? "Open calendar"
                      : activeView === "calendar"
                        ? "View history"
                        : activeView === "history"
                          ? "Find a time"
                          : "Open calendar"
                    : "Complete profile"}
                  <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>

            <div data-tour="student-content">
              {activeView === "dashboard" && (
                <>
                <section className="mt-5 grid gap-4 md:grid-cols-3">
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
                    detail={
                      profileComplete ? "Ready to request" : "Action required"
                    }
                  />
                </section>

                <UpcomingConsultationCard
                  requests={upcomingConsultations}
                  onSelect={(request) =>
                    setSelectedApprovedConsultation(request)
                  }
                  onFindTime={() => changeActiveView("calendar")}
                />
                </>
              )}

              {activeView === "calendar" && (
              <section
                id="calendar"
                className={`mt-5 grid gap-6 ${profileComplete ? "lg:grid-cols-1" : "lg:grid-cols-[1.45fr_0.55fr]"}`}
              >
                <CalendarPanel
                  locked={!profileComplete}
                  availability={availableWindows}
                  requests={studentRequests}
                  profile={profile}
                  occupiedSlots={occupiedConsultations}
                  onSelectAvailability={setSelectedAvailability}
                  onSelectRequest={setSelectedApprovedConsultation}
                />
                {!profileComplete && <ProfileStatusPanel complete={false} />}
              </section>
              )}

              {activeView === "history" && (
              <section className="mt-5">
                <StudentHistoryPanel initialRequests={historyRequests} />
              </section>
              )}

              {activeView === "profile" && (
              <section className="mt-5 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
                <div
                  data-tour="student-profile-info"
                  className="rounded-[1.5rem] border border-border bg-card p-6 sm:p-7"
                >
                  <p className="text-sm font-semibold text-[#a51c30]">
                    Account setup
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    Keep your details accurate.
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Your program and section help limit appointment visibility
                    to the correct instructor schedules. Your email and student
                    identity remain read-only.
                  </p>
                  <div className="mt-6 rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      Protected student information
                    </p>
                    <p className="mt-2 leading-6">
                      Only authenticated users and instructors connected to your
                      request can access the required consultation details.
                    </p>
                  </div>
                </div>
                <ProfileForm profile={profile} email={email} />
              </section>
              )}

              {activeView === "dashboard" && (
            <section className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-border bg-card p-6 sm:p-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Your activity
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      Consultation history
                    </h2>
                  </div>
                  <ClipboardList className="size-5 text-[#a51c30]" />
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Review all pending, approved, declined, and cancelled
                  consultation requests in one organized page.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/55 p-4">
                    <p className="text-xs text-muted-foreground">
                      Total requests
                    </p>
                    <p className="mt-2 text-2xl font-medium">
                      {studentRequests.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/55 p-4">
                    <p className="text-xs text-muted-foreground">
                      Needs response
                    </p>
                    <p className="mt-2 text-2xl font-medium">
                      {pendingRequests}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => changeActiveView("history")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  View full history
                  <ChevronRight className="size-4" />
                </button>
              </div>

              <div className="rounded-[1.5rem] border border-border bg-card p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-[#a51c30]/10 text-[#a51c30]">
                    <GraduationCap className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Need guidance?
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                      Start with a clear concern
                    </h2>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Prepare your research, grades, project, or other academic
                  question before requesting a meeting.
                </p>
                <div className="mt-6 grid gap-3 text-sm">
                  <div className="rounded-2xl border border-border bg-background/55 p-4">
                    <p className="font-medium text-foreground">
                      Before booking
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Check the instructor, format, and available time range.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/55 p-4">
                    <p className="font-medium text-foreground">
                      After approval
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Download the calendar invite and prepare your concern
                      details before the meeting.
                    </p>
                  </div>
                </div>
              </div>
            </section>
              )}
            </div>
          </div>
        </section>
      </div>
      {selectedAvailability && (
        <BodyPortal>
          <RequestConsultationModal
            choices={selectedAvailability.choices}
            occupiedSlots={occupiedConsultations}
            onClose={() => setSelectedAvailability(null)}
            onSubmit={submitRequest}
          />
        </BodyPortal>
      )}
      {selectedApprovedConsultation && (
        <BodyPortal>
          <StudentApprovedConsultationModal
            key={`${selectedApprovedConsultation.id}-${selectedApprovedConsultation.status}-${selectedApprovedConsultation.concern_type}-${selectedApprovedConsultation.message}`}
            request={selectedApprovedConsultation}
            onClose={() => setSelectedApprovedConsultation(null)}
            onUpdated={handleApprovedConsultationUpdated}
            onCancelled={handleApprovedConsultationCancelled}
            onToast={(message, tone) => setToast({ message, tone })}
          />
        </BodyPortal>
      )}
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
      <DashboardGuidedTour
        role="student"
        context={activeView}
        open={tourOpen}
        step={tourStep}
        onStepChange={setTourStep}
        onClose={closeTour}
        onFinished={() => {
          void markWalkthroughCompleted(tourScope);
          setToast({
            message: "Walkthrough completed.",
            tone: "success",
          });
        }}
      />
      <StudentHelpWidget />
    </main>
  );
}

function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function StudentSidebar({
  tourId,
  activeView,
  displayName,
  email,
  collapsed,
  onToggleCollapsed,
  onViewChange,
}: {
  tourId: string;
  activeView: StudentDashboardView;
  displayName: string;
  email: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onViewChange: (view: StudentDashboardView) => void;
}) {
  const navButtonClass = (view: StudentDashboardView) =>
    `flex w-full items-center rounded-xl px-3 py-2.5 text-left transition ${
      collapsed ? "justify-center" : "gap-3"
    } ${
      activeView === view
        ? "bg-foreground font-semibold text-background"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <aside
      data-tour={tourId}
      className={`fixed left-0 top-0 z-50 hidden h-screen overflow-visible border-r border-border bg-card py-5 transition-[width,padding] duration-300 lg:flex lg:flex-col ${
        collapsed ? "w-20 px-3" : "w-64 px-4"
      }`}
    >
      <div
        className={`flex gap-2 ${
          collapsed
            ? "items-center justify-center"
            : "items-center justify-between"
        }`}
      >
        <Link
          href="/dashboard/student"
          className={`flex min-w-0 items-center gap-3 font-semibold tracking-tight ${
            collapsed ? "justify-center px-0" : "px-2"
          }`}
          aria-label="Refresh student dashboard"
          title="Student dashboard"
        >
          <span className="block min-w-0 overflow-hidden whitespace-nowrap">
            <BrandLogo compact={collapsed} />
          </span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`absolute top-6 z-10 flex size-8 items-center justify-center rounded-full border border-[#a51c30]/30 bg-[#a51c30] text-white shadow-lg shadow-red-900/20 transition hover:scale-105 hover:bg-[#8f1728] ${
            collapsed ? "right-[-1rem]" : "right-[-1rem]"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-8">
        <p
          className={`px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground ${
            collapsed ? "sr-only" : ""
          }`}
        >
          General
        </p>
        <nav className="mt-3 grid gap-1 text-sm">
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
            className={navButtonClass("dashboard")}
            title="Dashboard"
          >
            <LayoutDashboard className="size-4" />
            {!collapsed && <span className="truncate whitespace-nowrap">Dashboard</span>}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("calendar")}
            className={navButtonClass("calendar")}
            title="Calendar"
          >
            <CalendarRange className="size-4" />
            {!collapsed && <span className="truncate whitespace-nowrap">Calendar</span>}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("history")}
            className={navButtonClass("history")}
            title="History"
          >
            <ClipboardList className="size-4" />
            {!collapsed && <span className="truncate whitespace-nowrap">History</span>}
          </button>
          <button
            type="button"
            onClick={() => onViewChange("profile")}
            className={navButtonClass("profile")}
            title="My profile"
          >
            <UserRound className="size-4" />
            {!collapsed && <span className="truncate whitespace-nowrap">My profile</span>}
          </button>
        </nav>
      </div>

      <div
        className={`mt-auto rounded-2xl border border-border bg-background/70 ${
          collapsed ? "p-2" : "p-3"
        }`}
      >
        <button
          type="button"
          onClick={() => onViewChange("profile")}
          className={`flex w-full min-w-0 rounded-xl text-left ${
            collapsed ? "justify-center" : "items-center gap-3"
          }`}
          title={`${displayName} · ${email}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold uppercase text-background">
            {studentInitials(displayName, email)}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate whitespace-nowrap text-sm font-semibold leading-tight">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate whitespace-nowrap text-xs leading-5 text-muted-foreground">
                {email}
              </span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}

function StudentTopBar({
  tourId,
  activeView,
  sidebarCollapsed,
  onViewChange,
  search,
  onSearchChange,
  searchResults,
  onSelectSearchResult,
  onOpenTour,
}: {
  tourId: string;
  activeView: StudentDashboardView;
  sidebarCollapsed: boolean;
  onViewChange: (view: StudentDashboardView) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchResults: ConsultationRequest[];
  onSelectSearchResult: (request: ConsultationRequest) => void;
  onOpenTour: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const hasSearch = search.trim().length > 0;
  const mobileNavItems = [
    {
      view: "dashboard" as const,
      label: "Dashboard",
      description: "Overview and upcoming consultation",
      icon: LayoutDashboard,
    },
    {
      view: "calendar" as const,
      label: "Calendar",
      description: "Find and request a consultation time",
      icon: CalendarRange,
    },
    {
      view: "history" as const,
      label: "History",
      description: "Review pending and past requests",
      icon: ClipboardList,
    },
    {
      view: "profile" as const,
      label: "My profile",
      description: "Manage student information",
      icon: UserRound,
    },
  ];
  const activeMobileItem =
    mobileNavItems.find((item) => item.view === activeView) ?? mobileNavItems[0];

  function handleMobileViewChange(view: StudentDashboardView) {
    setMobileMenuOpen(false);
    onViewChange(view);
  }

  return (
    <header
      data-tour={tourId}
      className={`sticky top-0 z-40 border-b border-border bg-background/95 shadow-sm backdrop-blur-xl transition-[left] duration-300 lg:fixed lg:right-0 ${
        sidebarCollapsed ? "lg:left-20" : "lg:left-64"
      }`}
    >
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard/student"
          className="font-semibold tracking-tight lg:hidden"
          aria-label="Refresh student dashboard"
        >
          <BrandLogo />
        </Link>

        <div className="relative hidden min-w-0 flex-1 md:block lg:max-w-md">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search consultations, dates, or instructors"
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search consultations"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {hasSearch && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              {searchResults.length > 0 ? (
                <div className="max-h-96 overflow-y-auto p-2">
                  {searchResults.map((request) => {
                    const mode = request.availability?.consultation_mode
                      ? consultationModeLabel(request.availability.consultation_mode)
                      : "Consultation";

                    return (
                      <button
                        type="button"
                        key={request.id}
                        onClick={() => onSelectSearchResult(request)}
                        className="w-full rounded-xl px-3 py-3 text-left transition hover:bg-muted"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {consultationInstructorName(request)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {consultationSearchDateLabel(request)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {request.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {concernLabel(request.concern_type)} · {mode}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-5 text-sm text-muted-foreground">
                  No consultations found.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted max-sm:size-10 max-sm:justify-center max-sm:px-0"
            aria-label="Open walkthrough"
          >
            <CircleHelp className="size-4 text-[#a51c30]" />
            <span className="hidden sm:inline">Tour</span>
          </button>
          <NotificationBell role="student" />
          <ThemeToggle />
          <div className="hidden sm:block">
            <LogoutButton />
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-muted lg:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-2xl lg:hidden">
              <div className="border-b border-border bg-muted/35 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a51c30]">
                  Student menu
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Current section:{" "}
                  <span className="font-semibold text-foreground">
                    {activeMobileItem.label}
                  </span>
                </p>
              </div>

              <nav className="grid gap-1 p-2 text-sm">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = item.view === activeView;

                  return (
                    <button
                      type="button"
                      key={item.view}
                      onClick={() => handleMobileViewChange(item.view)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-[#a51c30] text-white shadow-sm"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-muted text-[#a51c30]"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {item.label}
                        </span>
                        <span
                          className={`mt-0.5 block text-xs ${
                            active ? "text-white/75" : "text-muted-foreground"
                          }`}
                        >
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-border p-2 sm:hidden">
                <LogoutButton />
              </div>
            </div>
          )}
        </div>
      </div>
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
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-[1.5rem] border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-7 text-[#a51c30]" />
      </div>
      <p
        className={`relative mt-5 text-3xl font-medium tracking-tight ${tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : ""}`}
      >
        {value}
      </p>
      <div className="relative mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        {detail}
      </div>
    </motion.div>
  );
}

function UpcomingConsultationCard({
  requests,
  onSelect,
  onFindTime,
}: {
  requests: ConsultationRequest[];
  onSelect: (request: ConsultationRequest) => void;
  onFindTime: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePosition = requests.length ? activeIndex % requests.length : 0;
  const request = requests.length ? requests[activePosition] : null;

  if (!request) {
    return (
      <section className="mt-6 rounded-[1.75rem] border border-dashed border-[#a51c30]/25 bg-card p-6 shadow-sm sm:p-7">
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
          <button
            type="button"
            onClick={onFindTime}
            className="inline-flex items-center justify-center rounded-full border border-[#a51c30]/25 px-5 py-3 text-sm font-medium text-muted-foreground transition hover:border-[#a51c30]/45 hover:text-[#a51c30]"
          >
            Find a time
          </button>
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
          <div className="absolute inset-x-4 top-3 h-full rounded-3xl border border-[#7ab8a6]/20" />
        </>
      )}

      <button
        type="button"
        key={request.id}
        onClick={() => onSelect(request)}
        className="consultation-card-swap relative block w-full overflow-hidden rounded-[1.75rem] border border-[#9fcdbf]/45 bg-gradient-to-br from-[#4f9b83] via-[#3f8f85] to-[#4f7f9f] text-left text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#7ab8a6]/25"
      >
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

          <div className="relative min-w-0 flex-1">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] shadow-sm backdrop-blur">
              Confirmed consultation
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Next consultation scheduled
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-white/80">
              Approved by {instructorName}. Prepare your concern details before
              the meeting.
            </p>
            {hasMoreMeetings && (
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-white/60">
                {activePosition + 1} of {requests.length} upcoming meetings
              </p>
            )}
          </div>

          <div className="relative flex shrink-0 flex-col gap-3 rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur-sm sm:min-w-[28rem] sm:flex-row sm:items-center">
            <div className="overflow-hidden rounded-xl bg-white text-[#2f7564] shadow-md shadow-slate-950/15">
              <div className="bg-[#244f48] px-5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white">
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
                <span className="rounded-full bg-white/[0.14] px-3 py-1 text-white/90">
                  {format}
                </span>
                <span className="rounded-full bg-white/[0.14] px-3 py-1 text-white/90">
                  {timeLabel(start)} - {timeLabel(end)}
                </span>
                <span className="rounded-full bg-white/[0.14] px-3 py-1 capitalize text-white/85">
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
            className="absolute bottom-3 right-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-semibold text-[#2f7564] shadow-md shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-white/90"
          >
            Next
            <ChevronRight className="size-4" />
          </span>
        )}
      </button>
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
  onSelectRequest,
}: {
  locked: boolean;
  availability: Availability[];
  requests: ConsultationRequest[];
  profile: StudentProfile | null;
  occupiedSlots: OccupiedSlot[];
  onSelectAvailability: (selection: SelectedAvailability) => void;
  onSelectRequest: (request: ConsultationRequest) => void;
}) {
  const studentProgram = profile?.program ?? null;
  const pendingRequests = requests.filter(
    (request) => request.status === "pending",
  );
  const visibleStudentRequests = requests.filter(
    (request) => request.status === "pending" || request.status === "approved",
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
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date()),
  );
  const [fullView, setFullView] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());
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
  const dayColumnMetrics = useMemo(
    () =>
      weekDays.map((day) => {
        const dayKey = localDateKey(day);
        const dayLayout = layoutStudentCalendarDay({
          availabilitySlots: requestableSlotsByDay.get(dayKey) ?? [],
          requests: visibleStudentRequests.filter((request) =>
            consultationRequestTouchesDay(request, day),
          ),
        });
        const requestCount = dayLayout.requestSlots.length;
        const requestMaxLaneCount = Math.max(
          1,
          ...dayLayout.requestSlots.map((slot) => slot.laneCount),
        );

        return {
          dayKey,
          shouldExpand: requestMaxLaneCount > 1 || requestCount > 2,
        };
      }),
    [weekDays, requestableSlotsByDay, visibleStudentRequests],
  );
  const expandedDayCount = dayColumnMetrics.filter(
    (metric) => metric.shouldExpand,
  ).length;
  const calendarMinWidthRem =
    3.5 + expandedDayCount * 18 + (7 - expandedDayCount) * 10;
  const calendarColumns = `3.5rem ${weekDays
    .map((day, index) => {
      const shouldExpand = dayColumnMetrics[index]?.shouldExpand;
      return shouldExpand ? "minmax(18rem, 2fr)" : "minmax(10rem, 0.9fr)";
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

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
      data-tour="student-calendar-overview"
      className={`relative border border-border bg-card p-4 transition-all sm:p-8 ${
        fullView
          ? "flex h-full w-full flex-col overflow-hidden rounded-none border-0 bg-background p-0"
          : "overflow-hidden rounded-[1.5rem] bg-card"
      }`}
    >
      {fullView && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-border bg-card px-4 py-3">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition hover:border-[#a51c30]/40 hover:text-[#a51c30]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-[#a51c30]/40 hover:text-[#a51c30]"
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
            className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-[#a51c30]/40 hover:text-[#a51c30]"
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setFullView(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition hover:border-[#a51c30]/40 hover:text-[#a51c30]"
            aria-label="Exit full calendar view"
          >
            <Minimize2 className="size-3.5" />
            Exit
          </button>
        </div>
      )}

      <div
        data-tour="student-calendar-controls"
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
            className="rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveWeek(-1)}
              className="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
              className="rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFullView(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
          data-tour="student-calendar-grid"
          className={`overflow-auto border border-border bg-background/35 ${fullView ? "m-0 min-h-0 flex-1 rounded-none border-0" : "mt-3 max-h-[44rem] rounded-[1.25rem] sm:mt-5"}`}
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
                  dayColumnMetrics.find((metric) => metric.dayKey === dayKey)
                    ?.shouldExpand ?? false;

                return (
                  <div
                    key={day.toISOString()}
                    className={`border-l border-border px-2 py-3 text-center transition ${
                      hasMultipleSlots
                        ? "bg-[#a51c30]/15"
                        : isSameDay(day, new Date())
                          ? "bg-[#a51c30]/10"
                          : ""
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </p>
                    <p
                      className={`mt-1 text-sm font-medium ${hasMultipleSlots || isSameDay(day, new Date()) ? "text-[#a51c30]" : ""}`}
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
                  requests: visibleStudentRequests.filter((request) =>
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
                        currentTimeMs={currentTime.getTime()}
                        onSelect={onSelectAvailability}
                      />
                    ))}
                    {dayLayout.requestSlots.map((slot) => (
                      <StudentCalendarRequestSlot
                        key={`${slot.request.id}-${day.toISOString()}`}
                        slot={slot}
                        onSelect={onSelectRequest}
                      />
                    ))}
                    {isSameDay(day, currentTime) && (
                      <CurrentTimeLine now={currentTime} />
                    )}
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
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#a51c30]/10 text-[#a51c30]">
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
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#a51c30] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#8f1728]"
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
      <div className="fixed left-0 top-0 z-[90] h-screen w-screen overflow-hidden bg-background">
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
      className="calendar-availability absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg border border-[#f5b800]/40 px-2 py-1.5 text-left text-xs text-white shadow-sm transition"
      style={{ top, height }}
      title={format}
    >
      <span className="flex items-center gap-1 font-semibold">
        <ConsultationModeIcon
          mode={availability.consultation_mode}
          className="size-3"
        />
        {format}
      </span>
      <span className="block truncate">
        {start.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}{" "}
        -{" "}
        {end.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </button>
  );
}

function CurrentTimeLine({ now }: { now: Date }) {
  const hour = now.getHours() + now.getMinutes() / 60;

  if (hour < 7 || hour > 21) return null;

  const top = (hour - 7) * 64;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-40"
      style={{ top }}
      aria-hidden="true"
    >
      <span className="absolute -left-1 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" />
      <span className="block h-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.45)]" />
    </div>
  );
}

function StudentRequestableSlot({
  day,
  slot,
  currentTimeMs,
  onSelect,
}: {
  day: Date;
  slot: RequestableSlot;
  currentTimeMs: number;
  onSelect: (selection: SelectedAvailability) => void;
}) {
  const format = consultationModeLabel(slot.availability.consultation_mode);
  const professor = professorName(slot.availability);
  const colors = instructorScheduleColor(slot.availability);
  const freeStart = slot.freeStart;
  const freeEnd = slot.freeEnd;
  const isPast = freeEnd.getTime() <= currentTimeMs;
  const startHour = Math.max(
    7,
    freeStart.getHours() + freeStart.getMinutes() / 60,
  );
  const endHour = Math.min(21, freeEnd.getHours() + freeEnd.getMinutes() / 60);
  const rawHeight = Math.max(0, (endHour - startHour) * 64);
  const top = (startHour - 7) * 64 + 2;
  const height = Math.max(30, rawHeight - 4);
  const compact = height < 58;
  const gap = 4;
  const laneWidth = 100 / slot.laneCount;
  const width =
    slot.laneCount > 1
      ? `calc(${laneWidth}% - ${gap}px)`
      : "calc(100% - 16px)";
  const left =
    slot.laneCount > 1
      ? `calc(${slot.lane * laneWidth}% + ${gap / 2}px)`
      : "8px";

  return (
    <button
      type="button"
      disabled={isPast}
      onClick={() => {
        if (isPast) return;

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
        });
      }}
      className={`absolute z-10 flex flex-col justify-center overflow-hidden rounded-lg border text-left text-white shadow-sm transition ${
        isPast
          ? "cursor-not-allowed grayscale opacity-45 saturate-0"
          : "hover:brightness-95"
      } ${
        compact ? "px-2 py-0.5 text-[9px] leading-[1.05]" : "px-3 py-2 text-xs leading-tight"
      }`}
      style={{
        top,
        height,
        left,
        width,
        background: colors.background,
        borderColor: colors.border,
        boxShadow: `0 12px 24px -18px ${colors.shadow}`,
      }}
      title={
        isPast
          ? `Past availability: ${format} with ${professor}`
          : `${format} with ${professor}`
      }
    >
      <span className="flex items-center gap-1 truncate font-semibold">
        <ConsultationModeIcon
          mode={slot.availability.consultation_mode}
          className="size-3"
        />
        {format}
      </span>
      <span className="block truncate font-medium">
        {timeLabel(freeStart)} - {timeLabel(freeEnd)}
      </span>
      {!compact && (
        <span className="mt-1 block whitespace-normal break-words text-[11px] text-white/85">
          {professor}
        </span>
      )}
    </button>
  );
}

function StudentCalendarRequestSlot({
  slot,
  onSelect,
}: {
  slot: StudentRequestSlot;
  onSelect: (request: ConsultationRequest) => void;
}) {
  const { request, start, end } = slot;
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const rawHeight = Math.max(0, (endHour - startHour) * 64);
  const top = (startHour - 7) * 64 + 2;
  const height = Math.max(30, rawHeight - 4);
  const gap = 4;
  const laneWidth = 100 / slot.laneCount;
  const width = `calc(${laneWidth}% - ${gap}px)`;
  const left = `calc(${slot.lane * laneWidth}% + ${gap / 2}px)`;
  const format = request.availability?.consultation_mode
    ? consultationModeLabel(request.availability.consultation_mode)
    : "Consultation";
  const timeRange = `${timeLabel(start)} - ${timeLabel(end)}`;
  const status = request.status === "approved" ? "Approved" : "Pending";
  const isApproved = request.status === "approved";
  const compact = height < 58;
  const roomy = height >= 82;

  return (
    <div
      className={`absolute z-30 overflow-hidden rounded-lg border text-left shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-4 focus-within:ring-[#a51c30]/20 ${
        isApproved
          ? "border-[#9fcdbf]/80 bg-[#4f9b83]/90 text-white dark:border-[#9fcdbf]/60 dark:bg-[#5fae99]/85 dark:text-white"
          : "border-[#d9c08a]/80 bg-[#d6b66a]/88 text-[#332712] dark:border-[#d9c08a]/60 dark:bg-[#caa85d]/85 dark:text-[#241b0e]"
      }`}
      style={{ top, height, left, width }}
      title={`${status} consultation details`}
    >
      <button
        type="button"
        onClick={() => onSelect(request)}
        className={`flex h-full w-full text-left focus:outline-none ${
          compact
            ? "flex-col justify-center px-2 py-0.5 text-[9px] leading-[1.05]"
            : `flex-col justify-center px-3 pb-2 pt-9 text-xs`
        }`}
      >
        {!compact && (
          <span
            className={`absolute left-2 top-2 inline-flex w-fit items-center rounded-full font-bold uppercase shadow-sm ${
              isApproved
                ? "bg-white/24 text-white dark:bg-white/22 dark:text-white"
                : "bg-white/68 text-[#4a3715] dark:bg-white/55 dark:text-[#332712]"
            } px-2 py-0.5 text-[10px] tracking-[0.12em]`}
          >
            {status}
          </span>
        )}
        <span
          className={`${compact ? "block truncate uppercase tracking-[0.08em]" : "mt-2 block"} font-semibold leading-tight`}
        >
          {!compact && request.availability?.consultation_mode && (
            <ConsultationModeIcon
              mode={request.availability.consultation_mode}
              className="size-3"
            />
          )}
          {compact ? status : format}
        </span>
        <span
          className={`${compact ? "block truncate" : "mt-1 block"} font-medium leading-tight`}
        >
          {compact ? `${format} · ${timeRange}` : timeRange}
        </span>
        {roomy && (
          <span
            className={`mt-1 block whitespace-normal break-words text-[11px] leading-tight capitalize ${
              isApproved
                ? "text-white/85 dark:text-white/82"
                : "text-[#4a3715]/85 dark:text-[#332712]/85"
            }`}
          >
            {request.concern_type}
          </span>
        )}
      </button>

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-4">
      <form
        onSubmit={submit}
        className="flex h-[min(90vh,46rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-300/80 bg-card shadow-xl dark:border-slate-700/80"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-800/80 bg-card px-5 py-5 dark:border-slate-700 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8da2ff]">
              Request consultation
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
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
            className="inline-flex size-10 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
            aria-label="Close request modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {choices.length > 1 && (
            <div>
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
                        ? "border-[#a51c30] bg-[#a51c30]/10 text-foreground shadow-sm"
                        : "border-border bg-background hover:border-[#a51c30]/40"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {professorName(choice.availability)}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <ConsultationModeIcon
                        mode={choice.availability.consultation_mode}
                        className="size-3.5"
                      />
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
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${concernType === value ? "border-[#a51c30] bg-[#a51c30] text-white" : "border-border bg-background hover:border-[#a51c30]/40"}`}
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
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-800/80 px-5 py-4 dark:border-slate-700 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            disabled={saving || !selectedStart || !selectedEnd}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:opacity-60"
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
  requests,
}: {
  availabilitySlots: RequestableSlot[];
  requests: ConsultationRequest[];
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
        type: "request";
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
    ...requests.map((request) => {
      const start = new Date(request.requested_start_datetime);
      const end = new Date(request.requested_end_datetime);

      return {
        type: "request" as const,
        start,
        end,
        visualEnd: end.getTime(),
        request,
        lane: 0,
        laneCount: 1,
      };
    }),
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
    requestSlots: entries
      .filter((entry) => entry.type === "request")
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
function concernLabel(concern: ConsultationRequest["concern_type"]) {
  return {
    research: "Research",
    grades: "Grades",
    projects: "Projects",
    others: "Other",
  }[concern];
}
function ConsultationModeIcon({
  mode,
  className = "size-4",
}: {
  mode: Availability["consultation_mode"];
  className?: string;
}) {
  if (mode === "online") return <Monitor className={className} />;
  if (mode === "f2f") return <MapPin className={className} />;
  return <SquareSplitHorizontal className={className} />;
}
function consultationInstructorName(request: ConsultationRequest) {
  const name = request.instructor?.full_name?.trim();
  if (name) return name;
  const emailName = request.instructor?.email?.split("@")[0]?.trim();
  return emailName || "the instructor";
}
function consultationSearchDateLabel(request: ConsultationRequest) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);

  return `${start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${timeLabel(start)} - ${timeLabel(end)}`;
}
function consultationSearchText(request: ConsultationRequest) {
  const mode = request.availability?.consultation_mode
    ? consultationModeLabel(request.availability.consultation_mode)
    : "";

  return [
    consultationInstructorName(request),
    request.instructor?.email,
    concernLabel(request.concern_type),
    request.concern_type,
    request.status,
    mode,
    request.message,
    request.decision_note,
    consultationSearchDateLabel(request),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
function studentInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.split("@")[0] || "Student";
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "S";
}
function instructorScheduleColor(availability: Availability) {
  const palette = [
    {
      background: "linear-gradient(135deg, #5277b8, #6f9cc9)",
      border: "rgba(191, 219, 254, 0.72)",
      shadow: "#5277b8",
    },
    {
      background: "linear-gradient(135deg, #0284c7, #38bdf8)",
      border: "rgba(186, 230, 253, 0.72)",
      shadow: "#0284c7",
    },
    {
      background: "linear-gradient(135deg, #8f1728, #f5b800)",
      border: "rgba(191, 219, 254, 0.72)",
      shadow: "#8f1728",
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
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}
function ProfileStatusPanel({ complete }: { complete: boolean }) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm sm:p-8">
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
            className={`h-full rounded-full bg-[#a51c30] transition-all ${complete ? "w-full" : "w-1/2"}`}
          />
        </div>
      </div>
      <Link
        href="/onboarding"
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#a51c30] hover:underline"
      >
        {complete ? "Update my profile" : "Complete my profile"}{" "}
        <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}




