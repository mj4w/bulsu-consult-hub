"use client";

import { ChevronLeft, ChevronRight, ClipboardList, Search } from "lucide-react";
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

const pageSize = 6;

export function StudentHistoryPanel({
  initialRequests,
}: {
  initialRequests: StudentHistoryRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const filteredRequests = useMemo(
    () => filterRequests(requests, search),
    [requests, search],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const currentRequests = useMemo(
    () => filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredRequests, safePage],
  );

  useEffect(() => {
    const supabase = createClient();

    async function refreshRequests({ silent = false }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("consultation_requests")
        .select("id, requested_start_datetime, requested_end_datetime, concern_type, message, status, decision_note, created_at, instructor:profiles!consultation_requests_instructor_id_fkey(full_name, email)")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        if (!silent) setToast({ message: error.message || "Could not refresh consultation history.", tone: "error" });
        return;
      }

      setRequests(normalizeStudentHistoryRequests(data ?? []));
    }

    const channel = supabase
      .channel("student-history-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, () => refreshRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshRequests())
      .subscribe();
    const interval = window.setInterval(() => refreshRequests({ silent: true }), 5000);
    const onFocus = () => refreshRequests({ silent: true });
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-muted-foreground">Consultation records</p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">Request timeline</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Track every consultation request, its instructor response, and the schedule connected to it.
          </p>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
          <ClipboardList className="size-5" />
        </div>
      </div>

      <div className="mt-6">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by date, instructor name, purpose, status, or message"
            className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
        </label>
      </div>

      {requests.length ? (
        <>
          {filteredRequests.length ? (
            <>
              <div className="mt-6 space-y-4">
                {currentRequests.map((request) => (
                  <HistoryCard key={request.id} request={request} />
                ))}
              </div>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filteredRequests.length}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
              />
            </>
          ) : (
            <div className="mt-7 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                No consultation history matched your search.
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="mt-7 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center">
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            No consultation requests yet. Your submitted requests will appear here.
          </p>
        </div>
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </section>
  );
}

function HistoryCard({ request }: { request: StudentHistoryRequest }) {
  const instructor =
    request.instructor?.full_name?.trim() ||
    request.instructor?.email?.split("@")[0] ||
    "Instructor";

  return (
    <article className="rounded-2xl border border-border bg-background/60 p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium capitalize">{request.concern_type}</h3>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{requestTimeLabel(request)}</p>
          <p className="mt-1 text-sm text-muted-foreground">With {instructor}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Sent {new Date(request.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
      <div className="mt-4 rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
        {request.message}
      </div>
      {request.decision_note && (
        <p className="mt-3 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
          {request.decision_note}
        </p>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: StudentHistoryRequest["status"] }) {
  const classes = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-200",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    declined: "bg-rose-500/15 text-rose-700 dark:text-rose-200",
    cancelled: "bg-muted text-muted-foreground",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${classes[status]}`}>
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
    <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">
        {totalItems} result{totalItems === 1 ? "" : "s"} · Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page === 1}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
        >
          <ChevronLeft className="size-4" />
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
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
  return `${start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}, ${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
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
    instructor: Array.isArray(request.instructor) ? request.instructor[0] ?? null : request.instructor ?? null,
  }));
}
