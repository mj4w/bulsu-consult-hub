"use client";

import { useSearchParams } from "next/navigation";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MessageSquareText,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

export type StudentHistoryRequest = {
  id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  message: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  decision_note: string | null;
  created_at: string;
  instructor?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

const pageSize = 8;

export function StudentHistoryPanel({
  initialRequests,
}: {
  initialRequests: StudentHistoryRequest[];
}) {
  const searchParams = useSearchParams();
  const selectedRequestId = searchParams.get("request");
  const [requests, setRequests] = useState(initialRequests);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const filteredRequests = useMemo(
    () => filterRequests(requests, search).sort(byCreatedAtDesc),
    [requests, search],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const currentRequests = useMemo(
    () =>
      filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRequests, safePage],
  );

  useEffect(() => {
    if (!selectedRequestId) return;

    const timer = window.setTimeout(() => {
      const selectedIndex = filteredRequests.findIndex(
        (request) => request.id === selectedRequestId,
      );
      if (selectedIndex < 0) return;

      const selectedPage = Math.floor(selectedIndex / pageSize) + 1;
      if (selectedPage !== page) {
        setPage(selectedPage);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [filteredRequests, page, selectedRequestId]);

  useEffect(() => {
    if (!selectedRequestId) return;

    const timer = window.setTimeout(() => {
      document.getElementById(`request-${selectedRequestId}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [currentRequests, selectedRequestId]);

  useEffect(() => {
    const supabase = createClient();

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
          "id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email)",
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) {
          setToast({
            message: error.message || "Could not refresh consultation history.",
            tone: "error",
          });
        }
        return;
      }

      setRequests(normalizeStudentHistoryRequests(data ?? []));
    }

    const channel = supabase
      .channel("student-history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultation_requests" },
        () => refreshRequests(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => refreshRequests(),
      )
      .subscribe();
    const onFocus = () => refreshRequests({ silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <section
      data-tour="student-history-overview"
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-muted/20 px-4 py-5 sm:flex-row sm:items-start sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Consultation records
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Request history
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review every request by instructor, status, purpose, and scheduled
            time.
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-sm">
          <ClipboardList className="size-5" />
        </div>
      </div>

      <div
        data-tour="student-history-search"
        className="border-b border-border px-4 py-4 sm:px-6"
      >
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by date, instructor name, purpose, status, or message"
            className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      {requests.length ? (
        filteredRequests.length ? (
          <>
            <div
              data-tour="student-history-list"
              className="relative px-4 py-4 sm:px-6"
            >
              <div className="absolute bottom-6 left-[2.15rem] top-6 hidden w-px bg-border sm:block" />
              <div className="space-y-3">
                {currentRequests.map((request) => (
                  <HistoryCard
                    key={request.id}
                    request={request}
                    selected={request.id === selectedRequestId}
                  />
                ))}
              </div>
            </div>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={filteredRequests.length}
              onPrevious={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            />
          </>
        ) : (
          <EmptyHistoryState>No consultation history matched your search.</EmptyHistoryState>
        )
      ) : (
        <EmptyHistoryState>
          No consultation requests yet. Your submitted requests will appear here.
        </EmptyHistoryState>
      )}

      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </section>
  );
}

function HistoryCard({
  request,
  selected,
}: {
  request: StudentHistoryRequest;
  selected: boolean;
}) {
  const instructor =
    request.instructor?.full_name?.trim() ||
    request.instructor?.email?.split("@")[0] ||
    "Instructor";
  const sentDate = new Date(request.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article
      id={`request-${request.id}`}
      className={`relative rounded-2xl border p-4 transition ${
        selected
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 ring-2 ring-primary/25"
          : "border-border bg-card shadow-sm hover:border-primary/30 hover:bg-muted/30"
      }`}
    >
      {selected && (
        <div className="mb-3 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Selected request
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] md:items-start">
        <div className="flex min-w-0 gap-3">
          <div className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-sm font-bold text-primary shadow-sm">
            {initials(instructor)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold capitalize text-foreground">
                {request.concern_type}
              </span>
            </div>
            <h3 className="mt-2 truncate text-base font-semibold">
              {instructor}
            </h3>
            {request.instructor?.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {request.instructor.email}
              </p>
            )}
            <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Sent {sentDate}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex gap-2 rounded-xl border border-border bg-background px-3 py-2.5 shadow-sm">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {requestTimeLabel(request)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Schedule connected to this request
                </p>
              </div>
            </div>
            <p className="rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              ID {request.id.slice(0, 8)}
            </p>
          </div>

          <div className="flex gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 text-foreground shadow-sm">
            <MessageSquareText className="mt-1 size-4 shrink-0 text-muted-foreground" />
            <p className="line-clamp-3">
              {request.message || "No concern details provided."}
            </p>
          </div>

          {request.decision_note && (
            <p className="rounded-xl border border-border bg-background px-3 py-2.5 text-xs leading-5 text-foreground shadow-sm">
              {request.decision_note}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function EmptyHistoryState({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-4 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center sm:m-6">
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentHistoryRequest["status"] }) {
  const classes = {
    pending: "status-badge-pending",
    approved: "status-badge-approved",
    declined: "status-badge-declined",
    cancelled: "status-badge-cancelled",
  };

  return (
    <span
      className={`dashboard-status-badge rounded-full px-2.5 py-1 text-xs font-bold capitalize ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-sm text-muted-foreground">
        {totalItems} result{totalItems === 1 ? "" : "s"} · Page {page} of{" "}
        {totalPages}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function requestTimeLabel(request: StudentHistoryRequest) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  return `${start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })}, ${start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function filterRequests(requests: StudentHistoryRequest[], search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return requests;

  return requests.filter((request) => {
    const instructor =
      request.instructor?.full_name?.trim() ||
      request.instructor?.email?.split("@")[0] ||
      "";
    const searchable = [
      instructor,
      request.instructor?.email,
      request.concern_type,
      request.status,
      request.message,
      request.decision_note,
      requestTimeLabel(request),
      new Date(request.created_at).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function byCreatedAtDesc(
  first: StudentHistoryRequest,
  second: StudentHistoryRequest,
) {
  return (
    new Date(second.created_at).getTime() - new Date(first.created_at).getTime()
  );
}

function initials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  return `${parts[0]?.[0] ?? "I"}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function normalizeStudentHistoryRequests(
  rows: Array<
    Omit<StudentHistoryRequest, "instructor"> & {
      instructor?:
        | NonNullable<StudentHistoryRequest["instructor"]>[]
        | NonNullable<StudentHistoryRequest["instructor"]>
        | null;
    }
  >,
) {
  return rows.map((request) => ({
    ...request,
    instructor: Array.isArray(request.instructor)
      ? (request.instructor[0] ?? null)
      : (request.instructor ?? null),
  }));
}
