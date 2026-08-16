"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CalendarClock, CheckCheck, Circle, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

type UserRole = "student" | "instructor";

type RequestNotification = {
  id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  updated_at: string;
  created_at: string;
  student?: { full_name: string | null; email: string | null } | null;
  instructor?: { full_name: string | null; email: string | null } | null;
};

type RequestNotificationRow = Omit<RequestNotification, "student" | "instructor"> & {
  student?:
    | NonNullable<RequestNotification["student"]>
    | NonNullable<RequestNotification["student"]>[]
    | null;
  instructor?:
    | NonNullable<RequestNotification["instructor"]>
    | NonNullable<RequestNotification["instructor"]>[]
    | null;
};

export function NotificationBell({ role }: { role?: UserRole }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [resolvedRole, setResolvedRole] = useState<UserRole | null>(role ?? null);
  const [notifications, setNotifications] = useState<RequestNotification[]>([]);
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const initialized = useRef(false);
  const previousUnreadCount = useRef(0);

  const storageKey = userId && resolvedRole ? `consultation-notifications:${userId}:${resolvedRole}` : null;
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readKeys.includes(notificationKey(notification))),
    [notifications, readKeys],
  );

  useEffect(() => {
    const supabase = createClient();

    async function loadUserAndRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      if (role) {
        setResolvedRole(role);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setResolvedRole((profile?.role as UserRole | undefined) ?? (user.email?.match(/^[0-9]+@/) ? "student" : "instructor"));
    }

    void loadUserAndRole();
  }, [role]);

  useEffect(() => {
    if (!storageKey) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        setReadKeys(Array.isArray(parsed) ? parsed as string[] : []);
      } catch {
        window.localStorage.removeItem(storageKey);
        setReadKeys([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!userId || !resolvedRole) return;
    const supabase = createClient();

    async function refreshNotifications() {
      const query =
        resolvedRole === "student"
          ? supabase
              .from("consultation_requests")
              .select("id, requested_start_datetime, requested_end_datetime, concern_type, status, decision_note, updated_at, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email)")
              .eq("student_id", userId)
              .in("status", ["approved", "declined", "cancelled"])
              .order("updated_at", { ascending: false })
              .limit(15)
          : supabase
              .from("consultation_requests")
              .select("id, requested_start_datetime, requested_end_datetime, concern_type, status, decision_note, updated_at, created_at, student:profiles!consultation_requests_student_id_fkey(full_name, email)")
              .eq("instructor_id", userId)
              .eq("status", "pending")
              .order("created_at", { ascending: false })
              .limit(15);

      const { data } = await query;
      const nextNotifications = normalizeRows(
        (data ?? []) as RequestNotificationRow[],
      ).filter(
        (notification) =>
          resolvedRole !== "student" ||
          notification.status !== "cancelled" ||
          notification.decision_note
            ?.toLowerCase()
            .includes("cancelled by instructor"),
      );
      setNotifications(nextNotifications);

      const nextUnreadCount = nextNotifications.filter(
        (notification) => !readKeys.includes(notificationKey(notification)),
      ).length;

      if (initialized.current && nextUnreadCount > previousUnreadCount.current) {
        setToast(resolvedRole === "student" ? "Your consultation schedule has a new update." : "New consultation request received.");
      }

      previousUnreadCount.current = nextUnreadCount;
      initialized.current = true;
    }

    void refreshNotifications();

    const channel = supabase
      .channel(`notification-bell-${userId}-${resolvedRole}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, () => refreshNotifications())
      .subscribe();

    const refreshOnFocus = () => refreshNotifications();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [readKeys, resolvedRole, userId]);

  function saveReadKeys(nextKeys: string[]) {
    setReadKeys(nextKeys);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextKeys));
      } catch {
        // Ignore storage failures. The badge can still work for the current render.
      }
    }
  }

  function markAllRead() {
    saveReadKeys(Array.from(new Set([...readKeys, ...notifications.map(notificationKey)])));
  }

  function markOneRead(notification: RequestNotification) {
    saveReadKeys(Array.from(new Set([...readKeys, notificationKey(notification)])));
  }

  const unreadCount = unreadNotifications.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[90] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "No unread updates"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close notifications"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length ? (
              notifications.map((notification) => {
                const unread = !readKeys.includes(notificationKey(notification));
                return (
                  <Link
                    key={notificationKey(notification)}
                    href={notificationHref(notification, resolvedRole)}
                    onClick={() => markOneRead(notification)}
                    className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted/60"
                  >
                    <span className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full ${unread ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {unread ? <Circle className="size-3 fill-current" /> : <CalendarClock className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {notificationTitle(notification, resolvedRole)}
                      </span>
                      <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.12em] text-primary">
                        Request ID: {shortRequestId(notification.id)}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {notificationBody(notification, resolvedRole)}
                      </span>
                      <span className="mt-2 block text-[11px] text-muted-foreground">
                        {scheduleLabel(notification)}
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="size-4" />
                </div>
                <p className="mt-3 text-sm font-medium">No notifications yet</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Updates will appear here when consultation requests need attention.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast} tone="success" onClose={() => setToast(null)} />}
    </div>
  );
}

function normalizeRows(rows: RequestNotificationRow[]): RequestNotification[] {
  return rows.map((row) => ({
    ...row,
    student: Array.isArray(row.student) ? row.student[0] ?? null : row.student ?? null,
    instructor: Array.isArray(row.instructor) ? row.instructor[0] ?? null : row.instructor ?? null,
  }));
}

function notificationKey(notification: RequestNotification) {
  return `${notification.id}:${notification.status}:${notification.updated_at}`;
}

function notificationHref(notification: RequestNotification, role: UserRole | null) {
  const request = encodeURIComponent(notification.id);
  return role === "instructor"
    ? `/dashboard/instructor/requests?request=${request}`
    : `/dashboard/student?request=${request}#history`;
}

function shortRequestId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function notificationTitle(notification: RequestNotification, role: UserRole | null) {
  if (role === "instructor") return "New request for review";
  if (notification.status === "cancelled") return "Consultation cancelled";
  if (isRescheduledByInstructor(notification)) return "Schedule rescheduled";
  if (notification.status === "approved") return "Request approved";
  if (notification.status === "declined") return "Request declined";
  return "Request updated";
}

function notificationBody(notification: RequestNotification, role: UserRole | null) {
  if (role === "instructor") {
    const student = notification.student?.full_name?.trim() || notification.student?.email?.split("@")[0] || "A student";
    return `${student} requested a ${concernLabel(notification.concern_type)} consultation.`;
  }

  const instructor = notification.instructor?.full_name?.trim() || notification.instructor?.email?.split("@")[0] || "Your instructor";

  if (notification.status === "cancelled") {
    return `${instructor} cancelled your approved ${concernLabel(notification.concern_type)} consultation.`;
  }

  if (isRescheduledByInstructor(notification)) {
    return `${instructor} rescheduled your approved ${concernLabel(notification.concern_type)} consultation.`;
  }

  return `${instructor} ${notification.status === "approved" ? "approved" : "declined"} your ${concernLabel(notification.concern_type)} consultation.`;
}

function isRescheduledByInstructor(notification: RequestNotification) {
  return (
    notification.status === "approved" &&
    notification.decision_note?.toLowerCase().includes("rescheduled by instructor")
  );
}

function concernLabel(concern: RequestNotification["concern_type"]) {
  return concern === "research" ? "research" : concern === "grades" ? "grades" : concern === "projects" ? "project" : "general";
}

function scheduleLabel(notification: RequestNotification) {
  const start = new Date(notification.requested_start_datetime);
  const end = new Date(notification.requested_end_datetime);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}
