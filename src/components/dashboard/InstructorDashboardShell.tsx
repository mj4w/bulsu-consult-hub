"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { DashboardGuidedTour } from "@/components/dashboard/DashboardGuidedTour";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PendingRequestsBadge } from "@/components/dashboard/PendingRequestsBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ClientSafeBoundary } from "@/components/ui/ClientSafeBoundary";
import { Toast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  isWalkthroughCompleted,
  markWalkthroughCompleted,
} from "@/lib/walkthroughs";

type InstructorDashboardView = "dashboard" | "calendar" | "profile" | "requests";

type Props = {
  displayName: string;
  email: string;
  dashboardContent?: ReactNode;
  calendarContent?: ReactNode;
  profileContent?: ReactNode;
  requestsContent?: ReactNode;
  initialView?: InstructorDashboardView;
};

type InstructorSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  type: "request" | "availability";
  targetView: InstructorDashboardView;
  href?: string;
};

type InstructorSearchStudent =
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

type InstructorRequestSearchRow = {
  id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: string;
  status: string;
  message: string | null;
  student: InstructorSearchStudent;
};

type InstructorAvailabilitySearchRow = {
  id: string;
  start_datetime: string;
  end_datetime: string;
  consultation_mode: string;
  meeting_platform?: string | null;
  meeting_url?: string | null;
  venue?: string | null;
  is_active: boolean;
  availability_programs?: { program: string }[] | null;
};

export function InstructorDashboardShell({
  displayName,
  email,
  dashboardContent,
  calendarContent,
  profileContent,
  requestsContent,
  initialView = "dashboard",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeView, setActiveView] =
    useState<InstructorDashboardView>(initialView);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const hasDashboardContent = Boolean(dashboardContent);
  const hasCalendarContent = Boolean(calendarContent);
  const hasProfileContent = Boolean(profileContent);
  const requestsInShell = Boolean(requestsContent);
  const tourScope = `instructor_${activeView}`;

  const canShowView = useCallback(
    (view: InstructorDashboardView) => {
      if (view === "dashboard") return hasDashboardContent;
      if (view === "calendar") return hasCalendarContent;
      if (view === "profile") return hasProfileContent;
      return requestsInShell;
    },
    [
      hasDashboardContent,
      hasCalendarContent,
      hasProfileContent,
      requestsInShell,
    ],
  );

  const routeForView = useCallback((view: InstructorDashboardView) => {
    if (view === "calendar") return "/dashboard/instructor#calendar";
    if (view === "profile") return "/dashboard/instructor#profile";
    if (view === "requests") return "/dashboard/instructor/requests";
    return "/dashboard/instructor";
  }, []);

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;

    const timer = window.setTimeout(() => {
      setToast({
        message: `Welcome, ${displayName}.`,
        tone: "success",
      });
      router.replace(routeForView(activeView), { scroll: false });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [activeView, displayName, routeForView, router, searchParams]);

  useEffect(() => {
    if (searchParams.get("profile") !== "saved") return;

    const timer = window.setTimeout(() => {
      setToast({
        message: "Profile saved successfully.",
        tone: "success",
      });
      router.replace("/dashboard/instructor", { scroll: false });
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

  useEffect(() => {
    function viewFromHash(): InstructorDashboardView | null {
      const hash = window.location.hash.replace("#", "");
      return hash === "calendar" ||
        hash === "profile" ||
        hash === "requests" ||
        hash === "dashboard"
        ? hash
        : null;
    }

    const syncFromHash = () => {
      const nextView = viewFromHash();
      if (!nextView) return;

      if (!canShowView(nextView)) {
        router.replace(routeForView(nextView));
        return;
      }

      setActiveView(nextView);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [canShowView, routeForView, router]);

  function changeActiveView(view: InstructorDashboardView) {
    if (!canShowView(view)) {
      router.push(routeForView(view));
      return;
    }

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

  return (
    <main className="academic-dashboard-shell relative isolate min-h-screen overflow-x-hidden text-foreground">
      <div className="academic-dashboard-backdrop pointer-events-none absolute inset-0 z-0" />

      <InstructorSidebar
        tourId="instructor-sidebar"
        activeView={activeView}
        collapsed={sidebarCollapsed}
        displayName={displayName}
        email={email}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onViewChange={changeActiveView}
        hasDashboardContent={hasDashboardContent}
        hasCalendarContent={hasCalendarContent}
        hasProfileContent={hasProfileContent}
        requestsInShell={requestsInShell}
      />

      <div
        className={`relative z-10 min-h-screen transition-[padding] duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <InstructorTopBar
          tourId="instructor-topbar"
          activeView={activeView}
          sidebarCollapsed={sidebarCollapsed}
          onViewChange={changeActiveView}
          hasDashboardContent={hasDashboardContent}
          hasCalendarContent={hasCalendarContent}
          hasProfileContent={hasProfileContent}
          onOpenTour={openTour}
        />

        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:pt-24">
          <div className="relative w-full">
            <section
              data-tour="instructor-hero"
              className="relative rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7"
            >
              <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a51c30]">
                    {activeView === "dashboard"
                      ? "Instructor dashboard"
                      : activeView === "calendar"
                        ? "Calendar"
                        : activeView === "requests"
                          ? "Requests"
                          : "Instructor profile"}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    {activeView === "dashboard" && `Welcome, ${displayName}.`}
                    {activeView === "calendar" &&
                      "Manage consultation windows."}
                    {activeView === "profile" &&
                      "Keep your instructor details current."}
                    {activeView === "requests" &&
                      "Review consultation requests."}
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {activeView === "dashboard" &&
                      "Monitor consultation activity, pending reviews, and confirmed schedules."}
                    {activeView === "calendar" &&
                      "Create availability, edit open windows, and review confirmed student bookings."}
                    {activeView === "profile" &&
                      "Update the information students use to identify and contact you."}
                    {activeView === "requests" &&
                      "Approve or decline student requests with clear context and conflict protection."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    changeActiveView(
                      activeView === "calendar" ? "dashboard" : "calendar",
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  {activeView === "calendar" ? "View dashboard" : "Open calendar"}
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </section>

            <div data-tour="instructor-content">
              {activeView === "dashboard" && dashboardContent}
              {activeView === "calendar" && calendarContent}
              {activeView === "profile" && profileContent}
              {activeView === "requests" && requestsContent}
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
      <DashboardGuidedTour
        role="instructor"
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
    </main>
  );
}

function InstructorSidebar({
  tourId,
  activeView,
  collapsed,
  displayName,
  email,
  onToggleCollapsed,
  onViewChange,
  hasDashboardContent,
  hasCalendarContent,
  hasProfileContent,
  requestsInShell,
}: {
  tourId: string;
  activeView: InstructorDashboardView;
  collapsed: boolean;
  displayName: string;
  email: string;
  onToggleCollapsed: () => void;
  onViewChange: (view: InstructorDashboardView) => void;
  hasDashboardContent: boolean;
  hasCalendarContent: boolean;
  hasProfileContent: boolean;
  requestsInShell: boolean;
}) {
  const navButtonClass = (view: InstructorDashboardView) =>
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
          href="/dashboard/instructor"
          className={`flex min-w-0 items-center gap-3 font-semibold tracking-tight ${
            collapsed ? "justify-center px-0" : "px-2"
          }`}
          aria-label="Refresh instructor dashboard"
          title="Instructor dashboard"
        >
          <span className="block min-w-0 overflow-hidden whitespace-nowrap">
            <BrandLogo compact={collapsed} />
          </span>
        </Link>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="absolute right-[-1rem] top-6 z-10 flex size-8 items-center justify-center rounded-full border border-[#a51c30]/30 bg-[#a51c30] text-white shadow-lg shadow-red-900/20 transition hover:scale-105 hover:bg-[#8f1728]"
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
          {hasDashboardContent ? (
            <button
              type="button"
              onClick={() => onViewChange("dashboard")}
              title="Dashboard"
              className={navButtonClass("dashboard")}
            >
              <LayoutDashboard className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">Dashboard</span>}
            </button>
          ) : (
            <Link
              href="/dashboard/instructor"
              title="Dashboard"
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <LayoutDashboard className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">Dashboard</span>}
            </Link>
          )}
          {hasCalendarContent ? (
            <button
              data-tour="instructor-calendar-tab"
              type="button"
              onClick={() => onViewChange("calendar")}
              title="Calendar"
              className={navButtonClass("calendar")}
            >
              <CalendarRange className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">Calendar</span>}
            </button>
          ) : (
            <Link
              data-tour="instructor-calendar-tab"
              href="/dashboard/instructor#calendar"
              title="Calendar"
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <CalendarRange className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">Calendar</span>}
            </Link>
          )}
          {requestsInShell ? (
            <button
              data-tour="instructor-requests-tab"
              type="button"
              onClick={() => onViewChange("requests")}
              title="Requests"
              className={navButtonClass("requests")}
            >
              <ClipboardList className="size-4" />
              {!collapsed && (
                <span className="inline-flex items-center gap-2">
                  <span className="truncate whitespace-nowrap">Requests</span>
                  <ClientSafeBoundary>
                    <PendingRequestsBadge />
                  </ClientSafeBoundary>
                </span>
              )}
            </button>
          ) : (
            <Link
              data-tour="instructor-requests-tab"
              href="/dashboard/instructor/requests"
              title="Requests"
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <ClipboardList className="size-4" />
              {!collapsed && (
                <span className="inline-flex items-center gap-2">
                  <span className="truncate whitespace-nowrap">Requests</span>
                  <ClientSafeBoundary>
                    <PendingRequestsBadge />
                  </ClientSafeBoundary>
                </span>
              )}
            </Link>
          )}
          {hasProfileContent ? (
            <button
              data-tour="instructor-profile-tab"
              type="button"
              onClick={() => onViewChange("profile")}
              title="My profile"
              className={navButtonClass("profile")}
            >
              <UserRound className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">My profile</span>}
            </button>
          ) : (
            <Link
              data-tour="instructor-profile-tab"
              href="/dashboard/instructor#profile"
              title="My profile"
              className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-muted-foreground transition hover:bg-muted hover:text-foreground ${
                collapsed ? "justify-center" : "gap-3"
              }`}
            >
              <UserRound className="size-4" />
              {!collapsed && <span className="truncate whitespace-nowrap">My profile</span>}
            </Link>
          )}
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
          title={`${displayName} - ${email}`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold uppercase text-background">
            {initials(displayName, email)}
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

function InstructorTopBar({
  tourId,
  activeView,
  sidebarCollapsed,
  onViewChange,
  hasDashboardContent,
  hasCalendarContent,
  hasProfileContent,
  onOpenTour,
}: {
  tourId: string;
  activeView: InstructorDashboardView;
  sidebarCollapsed: boolean;
  onViewChange: (view: InstructorDashboardView) => void;
  hasDashboardContent: boolean;
  hasCalendarContent: boolean;
  hasProfileContent: boolean;
  onOpenTour: () => void;
}) {
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<InstructorSearchResult[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavButtonClass = (view: InstructorDashboardView) =>
    `shrink-0 rounded-full px-4 py-2 font-medium ${
      activeView === view
        ? "bg-foreground text-background"
      : "border border-border text-muted-foreground"
    }`;

  useEffect(() => {
    const query = search.trim().toLowerCase();
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      const [requestsResult, availabilityResult] = await Promise.all([
        supabase
          .from("consultation_requests")
          .select("id, requested_start_datetime, requested_end_datetime, concern_type, status, message, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section)")
          .eq("instructor_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("instructor_availability")
          .select("id, start_datetime, end_datetime, consultation_mode, meeting_platform, meeting_url, venue, is_active, availability_programs(program)")
          .eq("instructor_id", user.id)
          .order("start_datetime", { ascending: true })
          .limit(80),
      ]);

      if (cancelled) return;

      const requestResults = ((requestsResult.data ??
        []) as InstructorRequestSearchRow[])
        .flatMap((request): InstructorSearchResult[] => {
          const student = Array.isArray(request.student)
            ? (request.student[0] ?? null)
            : (request.student ?? null);
          const title =
            student?.full_name?.trim() ||
            student?.email?.split("@")[0] ||
            "Student request";
          const subtitle = [
            request.status,
            concernLabel(request.concern_type),
            formatDateTimeRange(
              request.requested_start_datetime,
              request.requested_end_datetime,
            ),
            student?.program,
            request.message,
          ]
            .filter(Boolean)
            .join(" · ");
          const searchable = `${title} ${subtitle}`.toLowerCase();

          if (!searchable.includes(query)) return [];

          return [{
            id: request.id,
            title,
            subtitle,
            type: "request",
            targetView: "requests",
            href: `/dashboard/instructor/requests?request=${request.id}`,
          }];
        });

      const availabilityResults = ((availabilityResult.data ??
        []) as InstructorAvailabilitySearchRow[])
        .flatMap((availabilityWindow): InstructorSearchResult[] => {
          const programs = (availabilityWindow.availability_programs ?? [])
            .map((item) => item.program)
            .join(", ");
          const title = `${consultationModeLabel(availabilityWindow.consultation_mode)} consultation window`;
          const subtitle = [
            availabilityWindow.is_active ? "Open" : "Closed",
            formatDateTimeRange(
              availabilityWindow.start_datetime,
              availabilityWindow.end_datetime,
            ),
            programs,
          ]
            .filter(Boolean)
            .join(" · ");
          const searchable = `${title} ${subtitle}`.toLowerCase();

          if (!searchable.includes(query)) return [];

          return [{
            id: availabilityWindow.id,
            title,
            subtitle,
            type: "availability",
            targetView: "calendar",
          }];
        });

      setResults([...requestResults, ...availabilityResults].slice(0, 8));
      setSearching(false);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search]);

  function handleResultClick(result: InstructorSearchResult) {
    setSearch("");
    setResults([]);
    setMobileMenuOpen(false);
    onViewChange(result.targetView);
  }

  function handleMobileViewChange(view: InstructorDashboardView) {
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
              href="/dashboard/instructor"
          className="font-semibold tracking-tight lg:hidden"
          aria-label="Refresh instructor dashboard"
        >
          <BrandLogo />
        </Link>

        <div className="relative hidden min-w-0 flex-1 md:block lg:max-w-md">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm focus-within:border-[#5277b8]/60 focus-within:ring-4 focus-within:ring-[#5277b8]/10">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Search requests, students, dates, or concerns"
              aria-label="Search instructor dashboard"
            />
          </div>
          {(search.trim().length >= 2 || results.length > 0) && (
            <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
              {searching ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Searching...
                </p>
              ) : results.length ? (
                <div className="max-h-80 overflow-y-auto p-1">
                  {results.map((result) =>
                    result.href ? (
                      <Link
                        key={`${result.type}-${result.id}`}
                        href={result.href}
                        onClick={() => handleResultClick(result)}
                        className="block rounded-xl px-4 py-3 text-left transition hover:bg-muted"
                      >
                        <SearchResultContent result={result} />
                      </Link>
                    ) : (
                      <button
                        key={`${result.type}-${result.id}`}
                        type="button"
                        onClick={() => handleResultClick(result)}
                        className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-muted"
                      >
                        <SearchResultContent result={result} />
                      </button>
                    ),
                  )}
                </div>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No matching instructor records.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
          >
            <CircleHelp className="size-4 text-[#a51c30]" />
            <span className="hidden sm:inline">Tour</span>
          </button>
          <ClientSafeBoundary>
            <NotificationBell role="instructor" />
          </ClientSafeBoundary>
          <ClientSafeBoundary>
            <ThemeToggle />
          </ClientSafeBoundary>
          <ClientSafeBoundary>
            <LogoutButton />
          </ClientSafeBoundary>
        </div>

        <button
          data-tour="instructor-calendar-tab instructor-requests-tab instructor-profile-tab"
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition hover:bg-muted sm:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background/98 px-4 py-4 shadow-xl sm:hidden">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search requests or schedules"
                aria-label="Search instructor dashboard"
              />
            </div>
            {(search.trim().length >= 2 || results.length > 0) && (
              <div className="absolute left-0 right-0 top-14 z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                {searching ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Searching...
                  </p>
                ) : results.length ? (
                  <div className="max-h-72 overflow-y-auto p-1">
                    {results.map((result) =>
                      result.href ? (
                        <Link
                          key={`${result.type}-${result.id}-mobile`}
                          href={result.href}
                          onClick={() => handleResultClick(result)}
                          className="block rounded-xl px-4 py-3 text-left transition hover:bg-muted"
                        >
                          <SearchResultContent result={result} />
                        </Link>
                      ) : (
                        <button
                          key={`${result.type}-${result.id}-mobile`}
                          type="button"
                          onClick={() => handleResultClick(result)}
                          className="block w-full rounded-xl px-4 py-3 text-left transition hover:bg-muted"
                        >
                          <SearchResultContent result={result} />
                        </button>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No matching instructor records.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={onOpenTour}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <CircleHelp className="size-4 text-[#a51c30]" />
              Tour
            </button>
            <ClientSafeBoundary>
              <NotificationBell role="instructor" />
            </ClientSafeBoundary>
            <ClientSafeBoundary>
              <ThemeToggle />
            </ClientSafeBoundary>
            <ClientSafeBoundary>
              <LogoutButton />
            </ClientSafeBoundary>
          </div>
        </div>
      )}

      <nav className={`${mobileMenuOpen ? "flex" : "hidden"} gap-2 overflow-x-auto border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6 lg:hidden`}>
        {hasDashboardContent ? (
          <button
            type="button"
            onClick={() => handleMobileViewChange("dashboard")}
            className={mobileNavButtonClass("dashboard")}
          >
            Dashboard
          </button>
        ) : (
          <Link
            href="/dashboard/instructor"
            className="shrink-0 rounded-full border border-border px-4 py-2"
          >
            Dashboard
          </Link>
        )}
        {hasCalendarContent ? (
          <button
            data-tour="instructor-calendar-tab"
            type="button"
            onClick={() => handleMobileViewChange("calendar")}
            className={mobileNavButtonClass("calendar")}
          >
            Calendar
          </button>
        ) : (
          <Link
            data-tour="instructor-calendar-tab"
            href="/dashboard/instructor#calendar"
            className="shrink-0 rounded-full border border-border px-4 py-2"
          >
            Calendar
          </Link>
        )}
        <Link
          data-tour="instructor-requests-tab"
          href="/dashboard/instructor/requests"
          onClick={() => setMobileMenuOpen(false)}
          className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-2"
        >
          Requests
          <ClientSafeBoundary>
            <PendingRequestsBadge />
          </ClientSafeBoundary>
        </Link>
        {hasProfileContent ? (
          <button
            data-tour="instructor-profile-tab"
            type="button"
            onClick={() => handleMobileViewChange("profile")}
            className={mobileNavButtonClass("profile")}
          >
            My profile
          </button>
        ) : (
          <Link
            data-tour="instructor-profile-tab"
            href="/dashboard/instructor#profile"
            onClick={() => setMobileMenuOpen(false)}
            className="shrink-0 rounded-full border border-border px-4 py-2"
          >
            My profile
          </Link>
        )}
      </nav>
    </header>
  );
}

function initials(displayName: string, email: string) {
  const source = displayName.trim() || email.split("@")[0] || "Instructor";
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("") || "I"
  );
}

function SearchResultContent({ result }: { result: InstructorSearchResult }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold">
          {result.title}
        </p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {result.type === "request" ? "Request" : "Window"}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {result.subtitle}
      </p>
    </>
  );
}

function formatDateTimeRange(startValue: string, endValue?: string | null) {
  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : null;
  const date = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!end) return `${date}, ${startTime}`;

  return `${date}, ${startTime} - ${end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function concernLabel(concern: string | null | undefined) {
  return {
    research: "Research",
    grades: "Grades",
    projects: "Projects",
    others: "Other",
  }[concern ?? ""] ?? concern ?? "";
}

function consultationModeLabel(mode: string | null | undefined) {
  return mode === "f2f"
    ? "F2F"
    : mode === "online"
      ? "Online"
      : mode === "both"
        ? "Online or F2F"
        : "Consultation";
}

