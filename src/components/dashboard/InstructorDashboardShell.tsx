"use client";

import Link from "next/link";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PendingRequestsBadge } from "@/components/dashboard/PendingRequestsBadge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ClientSafeBoundary } from "@/components/ui/ClientSafeBoundary";

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

export function InstructorDashboardShell({
  displayName,
  email,
  dashboardContent,
  calendarContent,
  profileContent,
  requestsContent,
  initialView = "dashboard",
}: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeView, setActiveView] =
    useState<InstructorDashboardView>(initialView);

  return (
    <main className="academic-dashboard-shell relative isolate min-h-screen overflow-x-hidden text-foreground">
      <div className="academic-dashboard-backdrop pointer-events-none absolute inset-0 z-0" />

      <InstructorSidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        displayName={displayName}
        email={email}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        onViewChange={setActiveView}
        hasDashboardContent={Boolean(dashboardContent)}
        hasCalendarContent={Boolean(calendarContent)}
        hasProfileContent={Boolean(profileContent)}
        requestsInShell={Boolean(requestsContent)}
      />

      <div
        className={`relative z-10 min-h-screen transition-[padding] duration-300 ${
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <InstructorTopBar
          activeView={activeView}
          sidebarCollapsed={sidebarCollapsed}
          onViewChange={setActiveView}
          hasDashboardContent={Boolean(dashboardContent)}
          hasCalendarContent={Boolean(calendarContent)}
          hasProfileContent={Boolean(profileContent)}
        />

        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 lg:pt-24">
          <div className="relative w-full">
            <section className="relative rounded-[1.5rem] border border-border bg-card p-5 shadow-sm sm:p-7">
              <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
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
                    setActiveView(
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

            {activeView === "dashboard" && dashboardContent}
            {activeView === "calendar" && calendarContent}
            {activeView === "profile" && profileContent}
            {activeView === "requests" && requestsContent}
          </div>
        </div>
      </div>
    </main>
  );
}

function InstructorSidebar({
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
          className="absolute right-[-1rem] top-6 z-10 flex size-8 items-center justify-center rounded-full border border-[#2563eb]/30 bg-[#2563eb] text-white shadow-lg shadow-blue-900/20 transition hover:scale-105 hover:bg-[#1d4ed8]"
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
              href="/dashboard/instructor"
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
              href="/onboarding"
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
          title={`${displayName} · ${email}`}
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
  activeView,
  sidebarCollapsed,
  onViewChange,
  hasDashboardContent,
  hasCalendarContent,
  hasProfileContent,
}: {
  activeView: InstructorDashboardView;
  sidebarCollapsed: boolean;
  onViewChange: (view: InstructorDashboardView) => void;
  hasDashboardContent: boolean;
  hasCalendarContent: boolean;
  hasProfileContent: boolean;
}) {
  const mobileNavButtonClass = (view: InstructorDashboardView) =>
    `shrink-0 rounded-full px-4 py-2 font-medium ${
      activeView === view
        ? "bg-foreground text-background"
        : "border border-border text-muted-foreground"
    }`;

  return (
    <header
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
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              Search requests, students, dates, or concerns
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      <nav className="flex gap-2 overflow-x-auto border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-6 lg:hidden">
        {hasDashboardContent ? (
          <button
            type="button"
            onClick={() => onViewChange("dashboard")}
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
            type="button"
            onClick={() => onViewChange("calendar")}
            className={mobileNavButtonClass("calendar")}
          >
            Calendar
          </button>
        ) : (
          <Link
            href="/dashboard/instructor"
            className="shrink-0 rounded-full border border-border px-4 py-2"
          >
            Calendar
          </Link>
        )}
        <Link
          href="/dashboard/instructor/requests"
          className="inline-flex shrink-0 items-center rounded-full border border-border px-4 py-2"
        >
          Requests
          <ClientSafeBoundary>
            <PendingRequestsBadge />
          </ClientSafeBoundary>
        </Link>
        {hasProfileContent ? (
          <button
            type="button"
            onClick={() => onViewChange("profile")}
            className={mobileNavButtonClass("profile")}
          >
            My profile
          </button>
        ) : (
          <Link
            href="/onboarding"
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
