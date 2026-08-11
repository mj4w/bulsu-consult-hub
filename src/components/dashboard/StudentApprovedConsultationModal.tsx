"use client";

import {
  CalendarDays,
  Clock,
  Edit3,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  SquareSplitHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ConsultationMode = "f2f" | "online" | "both";
type ConcernType = "research" | "grades" | "projects" | "others";
type ConsultationStatus =
  | "pending"
  | "approved"
  | "declined"
  | "cancelled";

export type ApprovedConsultation = {
  id: string;
  availability_id: string;
  instructor_id?: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: ConcernType;
  message: string;
  status: ConsultationStatus;
  decision_note: string | null;
  created_at: string;
  instructor?: {
    full_name: string | null;
    email: string | null;
  } | null;
  availability?: {
    consultation_mode: ConsultationMode;
  } | null;
};

type ApprovedConsultationRow = Omit<
  ApprovedConsultation,
  "instructor" | "availability"
> & {
  instructor?:
    | ApprovedConsultation["instructor"][]
    | ApprovedConsultation["instructor"];
  availability?:
    | ApprovedConsultation["availability"][]
    | ApprovedConsultation["availability"];
};

type Props = {
  request: ApprovedConsultation;
  onClose: () => void;
  onUpdated: (request: ApprovedConsultation) => void;
  onCancelled: (requestId: string) => void;
  onToast: (message: string, tone: "success" | "error") => void;
};

const CANCELLATION_CUTOFF_HOURS = 24;
const consultationRequestSelect = `
  id,
  availability_id,
  instructor_id,
  requested_start_datetime,
  requested_end_datetime,
  concern_type,
  message,
  status,
  decision_note,
  created_at,
  instructor:profiles!consultation_requests_instructor_id_fkey(
    full_name,
    email
  ),
  availability:instructor_availability!consultation_requests_availability_id_fkey(
    consultation_mode
  )
`;

function hoursUntil(startDateTime: string) {
  return (
    (new Date(startDateTime).getTime() - Date.now()) /
    (1000 * 60 * 60)
  );
}

function canCancelConsultation(request: ApprovedConsultation) {
  return (
    request.status === "approved" &&
    hoursUntil(request.requested_end_datetime) > 0 &&
    hoursUntil(request.requested_start_datetime) >
      CANCELLATION_CUTOFF_HOURS
  );
}

function hasConsultationEnded(request: ApprovedConsultation) {
  return hoursUntil(request.requested_end_datetime) <= 0;
}

function canEditRequest(request: ApprovedConsultation) {
  return request.status === "pending";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function modeLabel(mode?: ConsultationMode | null) {
  if (mode === "f2f") return "F2F";
  if (mode === "online") return "Online";
  if (mode === "both") return "F2F / Online";
  return "Consultation";
}

function concernLabel(concern: ConcernType) {
  return {
    research: "Research",
    grades: "Grades",
    projects: "Projects",
    others: "Others",
  }[concern];
}

function statusLabel(status: ConsultationStatus) {
  return {
    pending: "Pending",
    approved: "Approved",
    declined: "Declined",
    cancelled: "Cancelled",
  }[status];
}

function statusClass(status: ConsultationStatus) {
  if (status === "approved") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (status === "pending") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status === "declined") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }

  return "bg-muted text-muted-foreground";
}

export function StudentApprovedConsultationModal({
  request,
  onClose,
  onUpdated,
  onCancelled,
  onToast,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const [concernType, setConcernType] = useState<ConcernType>(
    request.concern_type,
  );
  const [message, setMessage] = useState(request.message);

  const isApproved = request.status === "approved";
  const isPending = request.status === "pending";
  const isPastApproved =
    isApproved &&
    hasConsultationEnded(request);
  const canEdit = canEditRequest(request);
  const canCancel = canCancelConsultation(request);

  const remainingHours = Math.max(
    0,
    hoursUntil(request.requested_start_datetime),
  );

  async function saveChanges() {
    if (!canEdit) {
      onToast("Only pending requests can be edited.", "error");
      return;
    }

    if (!message.trim()) {
      onToast("Please enter your consultation concern.", "error");
      return;
    }

    setSaving(true);

    const { data, error: updateError } = await supabase
      .from("consultation_requests")
      .update({
        concern_type: concernType,
        message: message.trim(),
      })
      .eq("id", request.id)
      .eq("status", "pending")
      .select(consultationRequestSelect)
      .maybeSingle();

    if (updateError) {
      setSaving(false);
      onToast(
        updateError.message || "Could not update the consultation.",
        "error",
      );
      return;
    }

    if (!data) {
      const { data: latestRequest } = await supabase
        .from("consultation_requests")
        .select(consultationRequestSelect)
        .eq("id", request.id)
        .maybeSingle();

      setSaving(false);

      if (latestRequest) {
        onUpdated(normalizeRequest(latestRequest as ApprovedConsultationRow));
      }

      onToast(
        "This request is no longer pending, so it cannot be edited.",
        "error",
      );
      return;
    }

    setSaving(false);

    const updatedRequest = normalizeRequest(data as ApprovedConsultationRow);

    onUpdated(updatedRequest);
    setEditing(false);

    onToast("Consultation details updated.", "success");
  }

  async function cancelPendingRequest() {
    if (!isPending) {
      onToast("Only pending requests can be cancelled here.", "error");
      return;
    }

    setCancelling(true);

    const { data, error } = await supabase
      .from("consultation_requests")
      .update({
        status: "cancelled",
        decision_note: "Cancelled by student before instructor review.",
      })
      .eq("id", request.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    setCancelling(false);

    if (error) {
      onToast(error.message || "Could not cancel the request.", "error");
      return;
    }

    if (!data) {
      onToast(
        "This request was already reviewed. Refreshing the dashboard.",
        "error",
      );
      return;
    }

    onCancelled(request.id);
    onToast("Pending request cancelled.", "success");
    onClose();
  }

  async function cancelConsultation() {
    if (!canCancel) {
      onToast(
        "This consultation can only be cancelled more than 24 hours before it starts.",
        "error",
      );
      return;
    }

    setCancelling(true);

    const { data, error } = await supabase
      .from("consultation_requests")
      .update({
        status: "cancelled",
        decision_note: "Cancelled by student.",
      })
      .eq("id", request.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    setCancelling(false);

    if (error) {
      onToast(
        error.message || "Could not cancel the consultation.",
        "error",
      );
      return;
    }

    if (!data) {
      onToast(
        "This consultation could not be cancelled. It may already be changed or inside the 24-hour cutoff.",
        "error",
      );
      return;
    }

    onCancelled(request.id);
    onToast("Consultation cancelled.", "success");
    onClose();
  }

  const instructorName =
    request.instructor?.full_name?.trim() ||
    request.instructor?.email?.split("@")[0] ||
    "Instructor";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultation-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Consultation request
            </p>

            <div className="mt-2 flex items-center gap-2">
              <h2
                id="consultation-details-title"
                className="text-xl font-semibold tracking-tight"
              >
                Consultation details
              </h2>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                  request.status,
                )}`}
              >
                {statusLabel(request.status)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full border border-border transition hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-7">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <CalendarDays className="size-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Scheduled for
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatDate(request.requested_start_datetime)}
                </p>

                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />

                  {formatTime(request.requested_start_datetime)} -{" "}
                  {formatTime(request.requested_end_datetime)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem
              icon={UserRound}
              label="Instructor"
              value={instructorName}
            />

            <DetailItem
              icon={Mail}
              label="Instructor email"
              value={request.instructor?.email || "Not available"}
            />

            <DetailItem
              icon={modeIcon(request.availability?.consultation_mode)}
              label="Consultation mode"
              value={modeLabel(request.availability?.consultation_mode)}
            />

            <DetailItem
              icon={MessageSquare}
              label="Concern"
              value={concernLabel(request.concern_type)}
            />
          </div>

          {editing ? (
            <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
              <div>
                <label className="text-sm font-medium">
                  Concern type
                </label>

                <select
                  value={concernType}
                  onChange={(event) =>
                    setConcernType(
                      event.target.value as ConcernType,
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                >
                  <option value="research">Research</option>
                  <option value="grades">Grades</option>
                  <option value="projects">Projects</option>
                  <option value="others">Others</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Consultation concern
                </label>

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value)
                  }
                  rows={5}
                  className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  placeholder="Describe what you want to discuss..."
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setConcernType(request.concern_type);
                    setMessage(request.message);
                    setEditing(false);
                  }}
                  disabled={saving}
                  className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
                >
                  Cancel edit
                </button>

                <button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={saving}
                  className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Your concern
              </p>

              <div className="mt-2 rounded-2xl border border-border bg-muted/30 p-5 text-sm leading-7">
                {request.message}
              </div>
            </div>
          )}

          {request.decision_note && (
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <p className="text-sm font-medium">
                Instructor note
              </p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {request.decision_note}
              </p>
            </div>
          )}

          {request.status === "pending" && (
            <>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
                <strong>Waiting for instructor review.</strong>{" "}
                Your consultation request has been submitted and is
                waiting for the instructor to approve or decline it.
              </div>

              {!editing && !confirmCancel && (
                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
                  >
                    <Edit3 className="size-4" />
                    Edit concern details
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/30 px-5 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4" />
                    Cancel request
                  </button>
                </div>
              )}

              {confirmCancel && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
                  <p className="font-medium">
                    Cancel this request?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This will withdraw your pending consultation request before the instructor reviews it.
                  </p>

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-medium"
                    >
                      Keep request
                    </button>

                    <button
                      type="button"
                      onClick={() => void cancelPendingRequest()}
                      disabled={cancelling}
                      className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {cancelling
                        ? "Cancelling..."
                        : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {request.status === "declined" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm leading-6 text-rose-800 dark:text-rose-200">
              This consultation request was declined by the
              instructor.
            </div>
          )}

          {request.status === "cancelled" && (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
              This consultation has been cancelled.
            </div>
          )}

          {isApproved && (
            <>
              {isPastApproved && (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                  <strong>This consultation is completed.</strong>{" "}
                  Past approved consultations are kept as view-only records.
                </div>
              )}

              {!isPastApproved && !canCancel && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
                  <strong>Cancellation is locked.</strong>{" "}
                  This consultation starts in less than 24 hours.
                  You can no longer cancel it.
                </div>
              )}

              {!isPastApproved && canCancel && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  You currently have approximately{" "}
                  <strong>
                    {Math.floor(remainingHours)} hours
                  </strong>{" "}
                  before the consultation. Cancellation is available
                  until the 24-hour cutoff.
                </div>
              )}

              {!editing && !confirmCancel && (
                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    disabled={!canCancel}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/30 px-5 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X className="size-4" />
                    Cancel consultation
                  </button>
                </div>
              )}

              {confirmCancel && canCancel && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
                  <p className="font-medium">
                    Cancel this consultation?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This will cancel your approved consultation.
                    The time slot may become available again to
                    other students.
                  </p>

                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                      className="rounded-full border border-border px-5 py-2.5 text-sm font-medium"
                    >
                      Keep consultation
                    </button>

                    <button
                      type="button"
                      onClick={() => void cancelConsultation()}
                      disabled={cancelling}
                      className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {cancelling
                        ? "Cancelling..."
                        : "Yes, cancel"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>

      <p className="mt-2 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}

function modeIcon(mode?: ConsultationMode | null) {
  if (mode === "online") return Monitor;
  if (mode === "f2f") return MapPin;
  return SquareSplitHorizontal;
}

function normalizeRequest(
  request: ApprovedConsultationRow,
): ApprovedConsultation {
  return {
    ...request,
    instructor: Array.isArray(request.instructor)
      ? request.instructor[0] ?? null
      : request.instructor ?? null,
    availability: Array.isArray(request.availability)
      ? request.availability[0] ?? null
      : request.availability ?? null,
  };
}
