"use client";

import {
  CalendarDays,
  Clock,
  Edit3,
  Mail,
  MessageSquare,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type ConsultationMode = "f2f" | "online" | "both";
type ConcernType = "research" | "grades" | "projects" | "others";

export type ApprovedConsultation = {
  id: string;
  availability_id: string;
  instructor_id?: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: ConcernType;
  message: string;
  status: "pending" | "approved" | "declined" | "cancelled";
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

type Props = {
  request: ApprovedConsultation;
  onClose: () => void;
  onUpdated: (request: ApprovedConsultation) => void;
  onCancelled: (requestId: string) => void;
  onToast: (message: string, tone: "success" | "error") => void;
};

const EDIT_CUTOFF_HOURS = 24;

function hoursUntil(startDateTime: string) {
  return (
    (new Date(startDateTime).getTime() - Date.now()) /
    (1000 * 60 * 60)
  );
}

function canModifyConsultation(request: ApprovedConsultation) {
  return (
    request.status === "approved" &&
    hoursUntil(request.requested_start_datetime) > EDIT_CUTOFF_HOURS
  );
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
  if (mode === "f2f") return "Face-to-face";
  if (mode === "online") return "Online";
  if (mode === "both") return "Face-to-face / Online";
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

  const canModify = canModifyConsultation(request);
  const remainingHours = Math.max(
    0,
    hoursUntil(request.requested_start_datetime),
  );

  useEffect(() => {
    setConcernType(request.concern_type);
    setMessage(request.message);
    setEditing(false);
    setConfirmCancel(false);
  }, [request]);

  async function saveChanges() {
    if (!canModify) {
      onToast(
        "This consultation can no longer be edited because it is within 24 hours.",
        "error",
      );
      return;
    }

    if (!message.trim()) {
      onToast("Please enter your consultation concern.", "error");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("consultation_requests")
      .update({
        concern_type: concernType,
        message: message.trim(),
      })
      .eq("id", request.id)
      .eq("status", "approved")
      .select(
        `
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
        `,
      )
      .single();

    setSaving(false);

    if (error || !data) {
      onToast(
        error?.message || "Could not update the consultation.",
        "error",
      );
      return;
    }

    const updatedRequest = normalizeRequest(data);

    onUpdated(updatedRequest);
    setEditing(false);

    onToast("Consultation details updated.", "success");
  }

  async function cancelConsultation() {
    if (!canModify) {
      onToast(
        "This consultation can no longer be cancelled because it is within 24 hours.",
        "error",
      );
      return;
    }

    setCancelling(true);

    const { error } = await supabase.rpc(
        "cancel_student_consultation",
        {
            request_id: request.id,
        },
    );

    setCancelling(false);

    if (error) {
      onToast(
        error.message || "Could not cancel the consultation.",
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
        aria-labelledby="approved-consultation-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Approved consultation
            </p>
            <h2
              id="approved-consultation-title"
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              Consultation details
            </h2>
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
              icon={Video}
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
                    setConcernType(event.target.value as ConcernType)
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
                  onChange={(event) => setMessage(event.target.value)}
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

          {!canModify && !editing && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
              <strong>Changes are locked.</strong> This consultation starts
              in less than 24 hours, so editing and cancellation are no longer
              available.
            </div>
          )}

          {canModify && !editing && !confirmCancel && (
            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium transition hover:border-primary/40 hover:text-primary"
              >
                <Edit3 className="size-4" />
                Edit consultation
              </button>

              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/30 px-5 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10"
              >
                <X className="size-4" />
                Cancel consultation
              </button>
            </div>
          )}

          {confirmCancel && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
              <p className="font-medium">Cancel this consultation?</p>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This will release the scheduled consultation slot. You can
                only cancel consultations that are more than 24 hours away.
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
                  {cancelling ? "Cancelling..." : "Yes, cancel"}
                </button>
              </div>
            </div>
          )}

          {!editing && canModify && !confirmCancel && (
            <p className="text-center text-xs text-muted-foreground">
              Changes and cancellation close 24 hours before the consultation.
              You currently have approximately{" "}
              {Math.floor(remainingHours)} hours remaining.
            </p>
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

      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function normalizeRequest(
  request: ApprovedConsultation & {
    instructor?:
      | ApprovedConsultation["instructor"][]
      | ApprovedConsultation["instructor"];
    availability?:
      | ApprovedConsultation["availability"][]
      | ApprovedConsultation["availability"];
  },
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