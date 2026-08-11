"use client";

import { Check, ClipboardList, Clock, UserRound, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

export type InstructorRequest = {
  id: string;
  instructor_id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  message: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  created_at: string;
  student?: {
    full_name: string | null;
    email: string | null;
    program: string | null;
    section: string | null;
    phone_number: string | null;
  } | null;
};

const pageSize = 5;
const decisionDelayMs = 5000;

type PendingDecision = {
  requestId: string;
  status: "approved" | "declined";
  timeoutId: number;
};

export function InstructorRequestsPanel({
  initialRequests,
}: {
  initialRequests: InstructorRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [pendingDecisions, setPendingDecisions] = useState<PendingDecision[]>([]);
  const pendingDecisionsRef = useRef<PendingDecision[]>([]);

  useEffect(() => {
    pendingDecisionsRef.current = pendingDecisions;
  }, [pendingDecisions]);

  useEffect(() => () => {
    pendingDecisionsRef.current.forEach((decision) => window.clearTimeout(decision.timeoutId));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    async function refreshRequests({ silent = false }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultation_requests")
        .select("id, instructor_id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section, phone_number)")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) {
          setToast({ message: error.message || "Could not refresh requests.", tone: "error" });
        }
        return;
      }

      setRequests(normalizeInstructorRequests(data ?? []));
    }

    const channel = supabase
      .channel("instructor-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, () => refreshRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshRequests())
      .subscribe();
    const interval = window.setInterval(() => refreshRequests({ silent: true }), 5000);
    const refreshOnFocus = () => refreshRequests({ silent: true });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  function scheduleStatusUpdate(requestId: string, status: "approved" | "declined") {
    const existingDecision = pendingDecisionsRef.current.find((decision) => decision.requestId === requestId);
    if (existingDecision) {
      window.clearTimeout(existingDecision.timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setPendingDecisions((current) => current.filter((decision) => decision.requestId !== requestId));
      void updateStatus(requestId, status);
    }, decisionDelayMs);

    setPendingDecisions((current) => [
      ...current.filter((decision) => decision.requestId !== requestId),
      { requestId, status, timeoutId },
    ]);
    setToast({
      message:
        status === "approved"
          ? "Approval queued. You can undo it before it is sent."
          : "Decline queued. You can undo it before it is sent.",
      tone: "success",
    });
  }

  function undoPendingDecision(requestId: string) {
    const decision = pendingDecisionsRef.current.find((item) => item.requestId === requestId);
    if (!decision) return;
    window.clearTimeout(decision.timeoutId);
    setPendingDecisions((current) => current.filter((item) => item.requestId !== requestId));
    setToast({ message: "Action cancelled. No response was sent.", tone: "success" });
  }

  async function updateStatus(requestId: string, status: "approved" | "declined") {
    const selectedRequest = requests.find((request) => request.id === requestId);
    if (!selectedRequest) return;

    const supabase = createClient();
    const instructorName = await getCurrentInstructorName();
    const approvedNote = `Approved by ${instructorName}.`;
    const declinedNote = "Declined by instructor.";
    const autoDeclinedNote = "Another student was accepted for an overlapping time slot.";

    setUpdatingId(requestId);

    const { data: updatedRequest, error } = await supabase
      .from("consultation_requests")
      .update({
        status,
        decision_note: status === "approved" ? approvedNote : declinedNote,
      })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) {
      setToast({ message: error.message || "Could not update request.", tone: "error" });
      setUpdatingId(null);
      return;
    }

    if (!updatedRequest) {
      setToast({
        message: "This request was already changed. The list will refresh automatically.",
        tone: "error",
      });
      setUpdatingId(null);
      return;
    }

    if (status === "approved") {
      const { error: declineError } = await supabase
        .from("consultation_requests")
        .update({
          status: "declined",
          decision_note: autoDeclinedNote,
        })
        .eq("instructor_id", selectedRequest.instructor_id)
        .lt("requested_start_datetime", selectedRequest.requested_end_datetime)
        .gt("requested_end_datetime", selectedRequest.requested_start_datetime)
        .eq("status", "pending")
        .neq("id", requestId);

      if (declineError) {
        setToast({
          message: declineError.message || "Request approved, but competing requests were not updated.",
          tone: "error",
        });
        setUpdatingId(null);
        return;
      }
    }

    setRequests((current) =>
      current.map((request) => {
        if (request.id === requestId) {
          return {
            ...request,
            status,
            decision_note: status === "approved" ? approvedNote : declinedNote,
          };
        }

        const isCompetingPendingRequest =
          status === "approved" &&
          request.status === "pending" &&
          request.instructor_id === selectedRequest.instructor_id &&
          new Date(request.requested_start_datetime) < new Date(selectedRequest.requested_end_datetime) &&
          new Date(request.requested_end_datetime) > new Date(selectedRequest.requested_start_datetime);

        if (isCompetingPendingRequest) {
          return {
            ...request,
            status: "declined",
            decision_note: autoDeclinedNote,
          };
        }

        return request;
      }),
    );
    setToast({
      message:
        status === "approved"
          ? "Request approved. Other overlapping pending requests were declined."
          : "Consultation request declined.",
      tone: "success",
    });
    setUpdatingId(null);
  }

  const pending = requests
    .filter((request) => request.status === "pending")
    .sort(byRequestedStart);
  const reviewed = requests
    .filter((request) => request.status !== "pending")
    .sort(byRequestedStart);
  const pendingTotalPages = Math.max(1, Math.ceil(pending.length / pageSize));
  const reviewedTotalPages = Math.max(1, Math.ceil(reviewed.length / pageSize));
  const safePendingPage = Math.min(pendingPage, pendingTotalPages);
  const safeReviewedPage = Math.min(reviewedPage, reviewedTotalPages);
  const paginatedPending = pending.slice((safePendingPage - 1) * pageSize, safePendingPage * pageSize);
  const paginatedReviewed = reviewed.slice((safeReviewedPage - 1) * pageSize, safeReviewedPage * pageSize);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Consultation requests</p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Approve or decline</h2>
        </div>
        <ClipboardList className="size-5 text-muted-foreground" />
      </div>

      {requests.length ? (
        <div className="mt-7 space-y-6">
          <RequestSection
            title="Pending review"
            description="Start here. These requests need your approval or decline."
            count={pending.length}
            emptyText="No pending requests."
            priority
            page={safePendingPage}
            totalPages={pendingTotalPages}
            onPrevious={() => setPendingPage((value) => Math.max(1, value - 1))}
            onNext={() => setPendingPage((value) => Math.min(pendingTotalPages, value + 1))}
          >
            {paginatedPending.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                updating={updatingId === request.id}
                pendingDecisionStatus={pendingDecisions.find((decision) => decision.requestId === request.id)?.status ?? null}
                onUndo={() => undoPendingDecision(request.id)}
                onApprove={() => scheduleStatusUpdate(request.id, "approved")}
                onDecline={() => scheduleStatusUpdate(request.id, "declined")}
              />
            ))}
          </RequestSection>
          <RequestSection
            title="Reviewed requests"
            description="Already approved, declined, or cancelled."
            count={reviewed.length}
            emptyText="No reviewed requests yet."
            page={safeReviewedPage}
            totalPages={reviewedTotalPages}
            onPrevious={() => setReviewedPage((value) => Math.max(1, value - 1))}
            onNext={() => setReviewedPage((value) => Math.min(reviewedTotalPages, value + 1))}
          >
            {paginatedReviewed.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                updating={false}
                compact
                pendingDecisionStatus={null}
                onUndo={() => undoPendingDecision(request.id)}
                onApprove={() => scheduleStatusUpdate(request.id, "approved")}
                onDecline={() => scheduleStatusUpdate(request.id, "declined")}
              />
            ))}
          </RequestSection>
        </div>
      ) : (
        <div className="mt-7 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Students who choose your open consultation windows will appear here for review.
          </p>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </div>
  );
}

function RequestSection({
  title,
  description,
  count,
  emptyText,
  priority = false,
  page,
  totalPages,
  onPrevious,
  onNext,
  children,
}: {
  title: string;
  description: string;
  count: number;
  emptyText: string;
  priority?: boolean;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-2xl border p-4 sm:p-5 ${priority ? "border-primary/25 bg-primary/5" : "border-border bg-background/40"}`}>
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium tracking-tight">{title}</h3>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${priority ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {count}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {priority && count > 0 && (
          <div className="rounded-xl border border-primary/20 bg-card px-4 py-3 text-sm text-primary">
            Review top to bottom
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3">
        {count ? children : (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center">
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        )}
      </div>
      {count > pageSize && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={onPrevious}
              disabled={page === 1}
              className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={page === totalPages}
              className="rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

async function getCurrentInstructorName() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "instructor";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name ||
    profile?.email?.split("@")[0] ||
    user.email?.split("@")[0] ||
    "instructor"
  );
}

function RequestCard({
  request,
  updating,
  compact = false,
  pendingDecisionStatus,
  onUndo,
  onApprove,
  onDecline,
}: {
  request: InstructorRequest;
  updating: boolean;
  compact?: boolean;
  pendingDecisionStatus: "approved" | "declined" | null;
  onUndo: () => void;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const studentName =
    request.student?.full_name?.trim() ||
    request.student?.email?.split("@")[0] ||
    "Student";
  const studentEmail = request.student?.email?.trim();
  const color = programColorClasses(request.student?.program);
  const time = requestTimeLabel(request);
  const isPending = request.status === "pending";

  return (
    <article className={`rounded-2xl border bg-card p-5 shadow-sm ${color.card} ${isPending ? "ring-1 ring-primary/10" : ""}`}>
      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <UserRound className="size-3.5" />
              Student
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${color.badge}`}>
              {request.status}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold tracking-tight">{studentName}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {request.student?.program ?? "Program not set"}
            {request.student?.section ? `, ${request.student.section}` : ""}
          </p>
          {studentEmail && (
            <p className="mt-1 text-sm text-muted-foreground">{studentEmail}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 lg:min-w-64">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="size-4" />
            Requested time
          </p>
          <p className="mt-2 text-base font-semibold leading-6 text-foreground">{time}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
        <p className="text-sm font-semibold capitalize text-foreground">Purpose: {request.concern_type}</p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{request.message}</p>
      </div>

      {request.decision_note && (
        <p className="mt-3 rounded-xl bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground">
          {request.decision_note}
        </p>
      )}

      {!compact && request.status === "pending" && (
        <>
          {pendingDecisionStatus && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-300/30 dark:bg-amber-300/10 dark:text-amber-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="leading-6">
                  {pendingDecisionStatus === "approved" ? "Approval" : "Decline"} is queued and will be sent in a few seconds.
                  If this was a mistake, undo it now.
                </p>
                <button
                  type="button"
                  onClick={onUndo}
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Undo action
                </button>
              </div>
            </div>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={updating || Boolean(pendingDecisionStatus)}
              onClick={onDecline}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-card px-5 py-3 text-base font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <X className="size-4" />
              Decline
            </button>
            <button
              type="button"
              disabled={updating || Boolean(pendingDecisionStatus)}
              onClick={onApprove}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              <Check className="size-4" />
              Approve
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function requestTimeLabel(request: InstructorRequest) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function byRequestedStart(first: InstructorRequest, second: InstructorRequest) {
  return (
    new Date(first.requested_start_datetime).getTime() -
    new Date(second.requested_start_datetime).getTime()
  );
}

function normalizeInstructorRequests(
  rows: Array<
    Omit<InstructorRequest, "student"> & {
      student?:
        | NonNullable<InstructorRequest["student"]>[]
        | NonNullable<InstructorRequest["student"]>
        | null;
    }
  >,
) {
  return rows.map((request) => ({
    ...request,
    student: Array.isArray(request.student) ? request.student[0] ?? null : request.student ?? null,
  }));
}

function programColorClasses(program: string | null | undefined) {
  const colorSets = [
    {
      card: "border-sky-200/80 dark:border-sky-400/30",
      badge: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    },
    {
      card: "border-emerald-200/80 dark:border-emerald-400/30",
      badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    },
    {
      card: "border-violet-200/80 dark:border-violet-400/30",
      badge: "bg-violet-500/15 text-violet-700 dark:text-violet-200",
    },
    {
      card: "border-rose-200/80 dark:border-rose-400/30",
      badge: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    },
    {
      card: "border-amber-200/80 dark:border-amber-400/30",
      badge: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
    },
    {
      card: "border-cyan-200/80 dark:border-cyan-400/30",
      badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200",
    },
  ];
  const key = program?.trim() || "Unknown";
  const hash = Array.from(key).reduce((total, character) => total + character.charCodeAt(0), 0);
  return colorSets[hash % colorSets.length];
}
