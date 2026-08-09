"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const programs = [
  "Doctor of Education",
  "Doctor of Philosophy",
  "Doctor of Public Administration",
  "Master in Business Administration",
  "Master in Physical Education",
  "Master in Public Administration",
  "Master of Arts in Education",
  "Master of Engineering Program",
  "Master of Industrial Technology Management",
  "Master of Information Technology",
  "Master of Manufacturing Engineering",
  "Master of Science in Civil Engineering",
  "Master of Science in Computer Engineering",
  "Master of Science in Electronics and Communications Engineering",
];

type Availability = {
  id: string;
  start_datetime: string;
  end_datetime: string;
  consultation_mode: "f2f" | "online" | "both";
  is_active: boolean;
  instructor_display_name?: string | null;
  availability_programs?: { program: string }[];
};

export type OccupiedConsultation = {
  id: string;
  requested_start_datetime: string;
  requested_end_datetime: string;
  concern_type: "research" | "grades" | "projects" | "others";
  student?: {
    full_name: string | null;
    email: string | null;
    program: string | null;
    section: string | null;
  } | null;
};

export function InstructorAvailabilityManager({
  initialAvailability,
  initialOccupiedConsultations = [],
}: {
  initialAvailability: Availability[];
  initialOccupiedConsultations?: OccupiedConsultation[];
}) {
  const [items, setItems] = useState(initialAvailability);
  const [occupiedConsultations, setOccupiedConsultations] = useState(initialOccupiedConsultations);
  const [editorOpen, setEditorOpen] = useState(false);
  const [details, setDetails] = useState<Availability | null>(null);
  const [occupiedDetails, setOccupiedDetails] = useState<OccupiedConsultation | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mode, setMode] = useState<Availability["consultation_mode"]>("both");
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [calendarView, setCalendarView] = useState("Week");
  const [todayToken, setTodayToken] = useState(0);
  const [selectionResetToken, setSelectionResetToken] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function refreshAvailability({ silent = false }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: refreshError } = await supabase
        .from("instructor_availability")
        .select("id, instructor_display_name, start_datetime, end_datetime, consultation_mode, is_active, availability_programs(program)")
        .eq("instructor_id", user.id)
        .order("start_datetime", { ascending: true });

      if (refreshError) {
        if (!silent) {
          setError(refreshError.message || "Could not refresh consultation windows.");
        }
        return;
      }

      setItems((data ?? []) as Availability[]);
    }

    async function refreshOccupiedConsultations({ silent = false }: { silent?: boolean } = {}) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: refreshError } = await supabase
        .from("consultation_requests")
        .select("id, requested_start_datetime, requested_end_datetime, concern_type, student:profiles!consultation_requests_student_id_fkey(full_name, email, program, section)")
        .eq("instructor_id", user.id)
        .eq("status", "approved")
        .order("requested_start_datetime", { ascending: true });

      if (refreshError) {
        if (!silent) {
          setError(refreshError.message || "Could not refresh occupied consultations.");
        }
        return;
      }

      setOccupiedConsultations(normalizeOccupiedConsultations(data ?? []));
    }

    const refreshCalendar = ({ silent = false }: { silent?: boolean } = {}) => {
      void refreshAvailability({ silent });
      void refreshOccupiedConsultations({ silent });
    };

    const channel = supabase
      .channel("instructor-calendar-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "instructor_availability" }, () => refreshCalendar())
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_programs" }, () => refreshAvailability())
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, () => refreshOccupiedConsultations())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refreshOccupiedConsultations())
      .subscribe();
    const interval = window.setInterval(() => refreshCalendar({ silent: true }), 5000);
    const refreshOnFocus = () => refreshCalendar({ silent: true });
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  function openNewWindow(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    setMode("both");
    setSelectedPrograms([]);
    setError("");
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setSelectionResetToken((value) => value + 1);
  }

  function toggleProgram(program: string) {
    setSelectedPrograms((current) =>
      current.includes(program)
        ? current.filter((item) => item !== program)
        : [...current, program],
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!start || !end || new Date(end) <= new Date(start)) {
      setError("Choose a valid start and end time.");
      return;
    }
    if (!selectedPrograms.length) {
      setError("Select at least one program.");
      return;
    }
    const newStart = new Date(start);
    const newEnd = new Date(end);
    const overlapsExisting = items.some((item) =>
      item.is_active && availabilityOverlapsRange(item, newStart, newEnd),
    );
    if (overlapsExisting) {
      setError("This time overlaps an existing consultation window. Choose another time.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();
    const instructorDisplayName =
      profile?.full_name?.trim() ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.display_name ||
      profile?.email?.split("@")[0] ||
      user.email?.split("@")[0] ||
      "Instructor";

    const { data: created, error: insertError } = await supabase
      .from("instructor_availability")
      .insert({
        instructor_id: user.id,
        instructor_display_name: instructorDisplayName,
        start_datetime: new Date(start).toISOString(),
        end_datetime: new Date(end).toISOString(),
        consultation_mode: mode,
      })
      .select("id, instructor_display_name, start_datetime, end_datetime, consultation_mode, is_active")
      .single();
    if (insertError || !created) {
      setError(insertError?.message ?? "Could not create consultation window.");
      setSaving(false);
      return;
    }
    const { error: programError } = await supabase
      .from("availability_programs")
      .insert(
        selectedPrograms.map((program) => ({
          availability_id: created.id,
          program,
        })),
      );
    if (programError) {
      await supabase
        .from("instructor_availability")
        .delete()
        .eq("id", created.id);
      setError(programError.message);
      setSaving(false);
      return;
    }

    setItems((current) => [
      {
        ...created,
        availability_programs: selectedPrograms.map((program) => ({ program })),
      },
      ...current,
    ]);
    closeEditor();
    setMessage("Consultation window opened successfully.");
    setSaving(false);
  }

  async function closeAvailability(item: Availability) {
    if (!window.confirm("Close this consultation window? Approved schedules and request history will be kept.")) return;
    const { error: closeError } = await createClient()
      .from("instructor_availability")
      .update({ is_active: false })
      .eq("id", item.id)
    if (closeError) {
      setError(closeError.message ?? "Could not close consultation window.");
      return;
    }
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, is_active: false } : entry,
      ),
    );
    setDetails(null);
    setMessage("Consultation window closed. Approved schedules were kept.");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-muted-foreground">
            Consultation windows
          </p>
          <h2 className="mt-1 text-2xl font-medium tracking-tight">
            Open consultation windows
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Mark the times when students may send consultation requests. You
            still approve or decline each request before it becomes confirmed.
            Approved requests appear as occupied blocks.
          </p>
        </div>
        <button
          onClick={() => openNewWindow("", "")}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-4" /> Add consultation window
        </button>
      </div>
      <CalendarGrid
        key={selectionResetToken}
        items={items}
        occupiedConsultations={occupiedConsultations}
        todayToken={todayToken}
        view={calendarView}
        onViewChange={setCalendarView}
        onToday={() => setTodayToken((value) => value + 1)}
        onCreate={openNewWindow}
        onOpenDetails={setDetails}
        onOpenOccupiedDetails={setOccupiedDetails}
      />
      {message && <Toast message={message} tone="success" onClose={() => setMessage("")} />}
      {error && !editorOpen && !details && <Toast message={error} tone="error" onClose={() => setError("")} />}
      {editorOpen && (
        <AvailabilityEditor
          start={start}
          end={end}
          mode={mode}
          selectedPrograms={selectedPrograms}
          saving={saving}
          error={error}
          onClose={closeEditor}
          onErrorDismiss={() => setError("")}
          onSave={save}
          onStartChange={setStart}
          onEndChange={setEnd}
          onModeChange={setMode}
          onToggleProgram={toggleProgram}
        />
      )}
      {details && (
        <AvailabilityDetails
          item={details}
          onClose={() => setDetails(null)}
          onCloseWindow={() => closeAvailability(details)}
        />
      )}
      {occupiedDetails && (
        <OccupiedDetails
          request={occupiedDetails}
          onClose={() => setOccupiedDetails(null)}
        />
      )}
    </section>
  );
}

function CalendarToolbar({
  view,
  onViewChange,
  onToday,
}: {
  view: string;
  onViewChange: (view: string) => void;
  onToday: () => void;
}) {
  const [open, setOpen] = useState(false);
  const views = ["Week", "Month"];
  return (
    <div className="mt-7 flex items-center justify-between gap-3 lg:ml-auto">
      <button
        type="button"
        onClick={onToday}
        className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
      >
        Today
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary"
        >
          {view} <span className="ml-2 text-muted-foreground">⌄</span>
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-[100] w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-xl">
            {views.map((option) => (
              <button
                type="button"
                key={option}
                onClick={() => {
                  onViewChange(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted ${view === option ? "bg-muted font-medium text-primary" : ""}`}
              >
                {option}
                <span className="text-xs text-muted-foreground">
                  {option === "Day"
                    ? "D"
                    : option === "Week"
                      ? "W"
                      : option === "Month"
                        ? "M"
                        : option === "Year"
                          ? "Y"
                          : "A"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({
  items,
  occupiedConsultations,
  todayToken,
  view,
  onViewChange,
  onToday,
  onCreate,
  onOpenDetails,
  onOpenOccupiedDetails,
}: {
  items: Availability[];
  occupiedConsultations: OccupiedConsultation[];
  todayToken: number;
  view: string;
  onViewChange: (view: string) => void;
  onToday: () => void;
  onCreate: (start: string, end: string) => void;
  onOpenDetails: (item: Availability) => void;
  onOpenOccupiedDetails: (request: OccupiedConsultation) => void;
}) {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [selectionStart, setSelectionStart] = useState<string | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectionDay, setSelectionDay] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      setWeekStart(monday);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!todayToken) return;
    const timer = window.setTimeout(() => {
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      setWeekStart(monday);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [todayToken]);

  if (!weekStart)
    return <div className="mt-7 h-80 animate-pulse rounded-2xl bg-muted/40" />;
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const hours = Array.from({ length: 14 }, (_, index) => index + 7);
  const weekLabel = `${dateLabel(days[0], { month: "short", day: "numeric" })} – ${dateLabel(days[6], { month: "short", day: "numeric", year: "numeric" })}`;

  if (view === "Month") {
    return (
      <MonthCalendar
        key={todayToken}
        anchor={weekStart}
        items={items}
        occupiedConsultations={occupiedConsultations}
        onToday={onToday}
        onViewChange={onViewChange}
        onCreate={onCreate}
        onOpenDetails={onOpenDetails}
        onOpenOccupiedDetails={onOpenOccupiedDetails}
      />
    );
  }

  function eventAt(day: Date, hour: number) {
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    return items.find((item) => {
      if (!item.is_active) return false;
      if (!eventTouchesDay(item, day)) return false;
      const window = availabilityWindowForDay(item, day);
      return cell >= window.start && cell < window.end;
    });
  }

  function occupiedAt(day: Date, hour: number) {
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    return occupiedConsultations.find((request) => {
      if (!requestTouchesDay(request, day)) return false;
      const start = new Date(request.requested_start_datetime);
      const end = new Date(request.requested_end_datetime);
      return cell >= start && cell < end;
    });
  }

  function begin(day: Date, hour: number) {
    const occupied = occupiedAt(day, hour);
    if (occupied) {
      onOpenOccupiedDetails(occupied);
      return;
    }
    const existing = eventAt(day, hour);
    if (existing) {
      onOpenDetails(existing);
      return;
    }
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    setSelectionStart(localDateTime(cell));
    setSelectionEnd(localDateTime(new Date(cell.getTime() + 3600000)));
    setSelectionDay(localDateTime(cell).slice(0, 10));
    setDragging(true);
  }

  function move(day: Date, hour: number) {
    if (
      !dragging ||
      !selectionStart ||
      localDateTime(day).slice(0, 10) !== selectionDay
    )
      return;
    if (eventAt(day, hour) || occupiedAt(day, hour)) return;
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    const anchor = new Date(selectionStart);
    const rangeStart = Math.min(anchor.getTime(), cell.getTime());
    const rangeEnd = Math.max(anchor.getTime(), cell.getTime() + 3600000);
    if (rangeOverlapsExisting(rangeStart, rangeEnd)) {
      clearSelection();
      return;
    }
    setSelectionStart(localDateTime(new Date(rangeStart)));
    setSelectionEnd(localDateTime(new Date(rangeEnd)));
  }

  function finish(day: Date, hour: number) {
    if (
      !dragging ||
      !selectionStart ||
      localDateTime(day).slice(0, 10) !== selectionDay
    ) {
      setDragging(false);
      return;
    }
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    const anchor = new Date(selectionStart);
    const rangeStart = Math.min(anchor.getTime(), cell.getTime());
    const rangeEnd = Math.max(anchor.getTime(), cell.getTime() + 3600000);
    const start = localDateTime(new Date(rangeStart));
    const end = localDateTime(new Date(rangeEnd));
    setSelectionStart(start);
    setSelectionEnd(end);
    setDragging(false);
    setSelectionDay(null);
    onCreate(start, end);
  }

  function rangeOverlapsExisting(start: number, end: number) {
    return items.some((item) =>
      item.is_active && availabilityOverlapsRange(item, new Date(start), new Date(end)),
    );
  }

  function clearSelection() {
    setSelectionStart(null);
    setSelectionEnd(null);
    setSelectionDay(null);
    setDragging(false);
  }

  function selected(day: Date, hour: number) {
    const start = selectionStart ? new Date(selectionStart).getTime() : null;
    const end = selectionEnd ? new Date(selectionEnd).getTime() : null;
    const cell = new Date(day);
    cell.setHours(hour, 0, 0, 0);
    const value = cell.getTime();
    return (
      start !== null &&
      end !== null &&
      value >= Math.min(start, end) &&
      value < Math.max(start, end)
    );
  }

  return (
    <div className="mt-7 overflow-hidden rounded-2xl border border-border">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium">
              Open a consultation window
            </p>
            <p className="text-xs text-muted-foreground">
              Press and drag within one day to mark when students may request.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CalendarToolbar
              view={view}
              onViewChange={onViewChange}
              onToday={onToday}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                aria-label="Previous week"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-medium">
                {weekLabel}
              </span>
              <button
                type="button"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
                aria-label="Next week"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-h-[42rem] overflow-auto">
        <div className="min-w-[680px] sm:min-w-[760px]">
          <div className="sticky top-0 z-50 isolate grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-border bg-card shadow-sm">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`border-l border-border px-2 py-3 text-center ${isToday(day) ? "bg-primary/10" : ""}`}
              >
                <p
                  className={`text-xs ${isToday(day) ? "font-semibold text-primary" : "text-muted-foreground"}`}
                >
                  {dateLabel(day, { weekday: "short" })}
                </p>
                <p className="mt-1 text-sm font-medium">{day.getDate()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
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
            {days.map((day) => (
              <div key={day.toISOString()} className="relative border-l border-border">
                {hours.map((hour) => {
                  const event = eventAt(day, hour);
                  const occupied = occupiedAt(day, hour);
                  return (
                    <button
                      type="button"
                      key={`${day.toISOString()}-${hour}`}
                      onMouseDown={(mouseEvent) => {
                        mouseEvent.preventDefault();
                        begin(day, hour);
                      }}
                      onMouseEnter={() => move(day, hour)}
                      onMouseUp={() => finish(day, hour)}
                      className={`block h-16 w-full border-b border-border text-left transition ${selected(day, hour) ? "cursor-grabbing bg-primary/20" : event || occupied ? "cursor-pointer" : "cursor-crosshair hover:bg-muted/60"}`}
                      aria-label={`${dateLabel(day, { weekday: "long", month: "long", day: "numeric" })} ${formatHour(hour)}`}
                    />
                  );
                })}
                {items
                  .filter((item) => item.is_active)
                  .filter((item) => eventTouchesDay(item, day))
                  .flatMap((item) => {
                    const window = availabilityWindowForDay(item, day);
                    const occupiedForWindow = occupiedConsultations.filter(
                      (request) =>
                        requestTouchesDay(request, day) &&
                        new Date(request.requested_start_datetime) < window.end &&
                        new Date(request.requested_end_datetime) > window.start,
                    );

                    return buildFreeSegments(window.start, window.end, occupiedForWindow).map((segment) => ({
                      availability: item,
                      start: segment.start,
                      end: segment.end,
                    }));
                  })
                  .sort((first, second) => first.start.getTime() - second.start.getTime())
                  .map((event) => (
                    <InstructorAvailabilityEvent
                      key={`${event.availability.id}-${day.toISOString()}-${event.start.toISOString()}`}
                      availability={event.availability}
                      start={event.start}
                      end={event.end}
                      onOpenDetails={onOpenDetails}
                    />
                  ))}
                {occupiedConsultations
                  .filter((request) => requestTouchesDay(request, day))
                  .sort(
                    (first, second) =>
                      new Date(first.requested_start_datetime).getTime() -
                      new Date(second.requested_start_datetime).getTime(),
                  )
                  .map((request) => (
                    <OccupiedConsultationEvent
                      key={`${request.id}-${day.toISOString()}`}
                      request={request}
                      day={day}
                      onOpenDetails={onOpenOccupiedDetails}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthCalendar({
  anchor,
  items,
  occupiedConsultations,
  onToday,
  onViewChange,
  onCreate,
  onOpenDetails,
  onOpenOccupiedDetails,
}: {
  anchor: Date;
  items: Availability[];
  occupiedConsultations: OccupiedConsultation[];
  onToday: () => void;
  onViewChange: (view: string) => void;
  onCreate: (start: string, end: string) => void;
  onOpenDetails: (item: Availability) => void;
  onOpenOccupiedDetails: (request: OccupiedConsultation) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(anchor));
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - ((monthStart.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const monthLabel = dateLabel(monthStart, { month: "long", year: "numeric" });
  function availabilitySegmentsOn(day: Date) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return items
      .filter((item) => item.is_active)
      .filter((item) => new Date(item.start_datetime) < dayEnd && new Date(item.end_datetime) > dayStart)
      .flatMap((item) => {
        const window = availabilityWindowForDay(item, day);
        const occupiedForWindow = occupiedConsultations.filter(
          (request) =>
            requestTouchesDay(request, day) &&
            new Date(request.requested_start_datetime) < window.end &&
            new Date(request.requested_end_datetime) > window.start,
        );

        return buildFreeSegments(window.start, window.end, occupiedForWindow).map((segment) => ({
          availability: item,
          start: segment.start,
          end: segment.end,
        }));
      })
      .sort((first, second) => first.start.getTime() - second.start.getTime());
  }
  function occupiedOn(day: Date) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return occupiedConsultations
      .filter((request) => new Date(request.requested_start_datetime) < dayEnd && new Date(request.requested_end_datetime) > dayStart)
      .sort(
        (first, second) =>
          new Date(first.requested_start_datetime).getTime() -
          new Date(second.requested_start_datetime).getTime(),
      );
  }
  function createForDay(day: Date) {
    const start = new Date(day);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start);
    end.setHours(8);
    onCreate(localDateTime(start), localDateTime(end));
  }
  return (
    <div className="mt-7 overflow-x-auto rounded-2xl border border-border">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm font-medium">Open consultation windows</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click an empty day to open a requestable time window. Click a window or occupied request to view details.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CalendarToolbar view="Month" onViewChange={onViewChange} onToday={onToday} />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, -1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Previous month">
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-36 text-center text-sm font-medium">{monthLabel}</span>
              <button type="button" onClick={() => setMonthCursor((current) => addMonths(current, 1))} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Next month">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="grid min-w-[680px] grid-cols-7 border-b border-border bg-card sm:min-w-[760px]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="border-l border-border px-2 py-3 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-w-[680px] grid-cols-7 bg-background sm:min-w-[760px]">
        {days.map((day) => {
          const events = availabilitySegmentsOn(day);
          const occupied = occupiedOn(day);
          const inMonth = day.getMonth() === monthStart.getMonth();
          return (
            <div
              key={day.toISOString()}
              onClick={() => createForDay(day)}
              className={`min-h-32 border-b border-l border-border p-2 ${inMonth ? "bg-card" : "bg-muted/20"} ${isToday(day) ? "ring-2 ring-inset ring-primary/40" : ""}`}
            >
              <p className={`text-xs font-medium ${isToday(day) ? "text-primary" : inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                {day.getDate()}
              </p>
              <div className="mt-2 space-y-1">
                {events.map((event) => (
                  <button
                    type="button"
                    key={`${event.availability.id}-${event.start.toISOString()}`}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onOpenDetails(event.availability);
                    }}
                    className="block w-full rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 text-left text-xs text-foreground transition hover:bg-primary/20"
                  >
                    <span className="block font-semibold">
                      {event.availability.consultation_mode === "f2f" ? "F2F" : event.availability.consultation_mode === "online" ? "Online" : "Both"}
                    </span>
                    <span className="block">
                      {dateLabel(event.start, { hour: "numeric", minute: "2-digit" })} - {dateLabel(event.end, { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
                {occupied.map((request) => (
                  <button
                    type="button"
                    key={request.id}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onOpenOccupiedDetails(request);
                    }}
                    className={`block w-full rounded-lg border px-2 py-1 text-left text-xs transition ${programColorClasses(request.student?.program).soft}`}
                  >
                    <span className="block font-semibold">Occupied</span>
                    <span className="block truncate">{studentName(request)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InstructorAvailabilityEvent({
  availability,
  start,
  end,
  onOpenDetails,
}: {
  availability: Availability;
  start: Date;
  end: Date;
  onOpenDetails: (item: Availability) => void;
}) {
  const event = availability;
  const format =
    event.consultation_mode === "f2f"
      ? "Face-to-face"
      : event.consultation_mode === "online"
        ? "Online"
        : "Online or face-to-face";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const time = `${dateLabel(new Date(event.start_datetime), { hour: "numeric", minute: "2-digit" })} – ${dateLabel(new Date(event.end_datetime), { hour: "numeric", minute: "2-digit" })}`;
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);
  const dailyTime = `${dateLabel(start, { hour: "numeric", minute: "2-digit" })} - ${dateLabel(end, { hour: "numeric", minute: "2-digit" })}`;
  return (
    <button
      type="button"
      title={format}
      onClick={() => onOpenDetails(event)}
      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      style={{ top, height }}
      className="calendar-availability absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg border border-primary/30 px-2 py-1.5 text-left text-xs text-white shadow-sm transition"
    >
      <span className="block font-semibold">{format}</span>
      <span className="block truncate">{dailyTime}</span>
    </button>
  );
}

function OccupiedConsultationEvent({
  request,
  day,
  onOpenDetails,
}: {
  request: OccupiedConsultation;
  day: Date;
  onOpenDetails: (request: OccupiedConsultation) => void;
}) {
  if (!requestTouchesDay(request, day)) return null;

  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  const startHour = Math.max(7, start.getHours() + start.getMinutes() / 60);
  const endHour = Math.min(21, end.getHours() + end.getMinutes() / 60);
  const top = (startHour - 7) * 64;
  const height = Math.max(34, (endHour - startHour) * 64);
  const time = `${dateLabel(start, { hour: "numeric", minute: "2-digit" })} - ${dateLabel(end, { hour: "numeric", minute: "2-digit" })}`;
  const colors = programColorClasses(request.student?.program);

  return (
    <button
      type="button"
      title={`Occupied by ${studentName(request)}`}
      onClick={() => onOpenDetails(request)}
      onMouseDown={(mouseEvent) => mouseEvent.stopPropagation()}
      style={{ top, height }}
      className={`absolute inset-x-2 z-20 flex flex-col justify-center overflow-hidden rounded-lg border px-2 py-1.5 text-left text-xs text-white shadow-sm transition ${colors.solid}`}
    >
      <span className="flex items-center gap-1 font-semibold">
        <UserRound className="size-3" />
        Occupied
      </span>
      <span className="block truncate">{time}</span>
      <span className="mt-1 block truncate text-[11px] text-white/90">
        {studentName(request)}
      </span>
    </button>
  );
}

function AvailabilityEditor({
  start,
  end,
  mode,
  selectedPrograms,
  saving,
  error,
  onClose,
  onErrorDismiss,
  onSave,
  onStartChange,
  onEndChange,
  onModeChange,
  onToggleProgram,
}: {
  start: string;
  end: string;
  mode: Availability["consultation_mode"];
  selectedPrograms: string[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onErrorDismiss: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onModeChange: (value: Availability["consultation_mode"]) => void;
  onToggleProgram: (program: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSave}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <CalendarPlus className="size-5 text-primary" />
            <div>
              <h3 className="font-medium">Open consultation window</h3>
              <p className="text-sm text-muted-foreground">
                Choose a time students may request. You will approve or decline requests later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Starts">
            <input
              className="profile-input"
              type="datetime-local"
              value={start}
              onChange={(event) => onStartChange(event.target.value)}
              required
            />
          </Field>
          <Field label="Ends">
            <input
              className="profile-input"
              type="datetime-local"
              value={end}
              onChange={(event) => onEndChange(event.target.value)}
              required
            />
            <span className="mt-2 block text-xs font-normal text-muted-foreground">
              Adjust this end date and time for the exact duration you want.
            </span>
          </Field>
        </div>
        <p className="mt-6 text-sm font-medium">Consultation format</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              ["online", "Online"],
              ["f2f", "Face-to-face"],
              ["both", "Both available"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => onModeChange(value)}
              className={`rounded-xl border px-4 py-3 text-left text-sm ${mode === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
            >
              <Video className="mb-2 size-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm font-medium">Who can request this window?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Select the graduate programs allowed to request this time.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {programs.map((program) => (
            <label
              key={program}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm ${selectedPrograms.includes(program) ? "border-primary bg-primary/10" : "border-border bg-background"}`}
            >
              <input
                type="checkbox"
                checked={selectedPrograms.includes(program)}
                onChange={() => onToggleProgram(program)}
                className="size-4 accent-indigo-600"
              />
              {program}
            </label>
          ))}
        </div>
        {error && <Toast message={error} tone="error" onClose={onErrorDismiss} />}
        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm text-muted-foreground"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving..." : "Open consultation window"}
            <Check className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function AvailabilityDetails({
  item,
  onClose,
  onCloseWindow,
}: {
  item: Availability;
  onClose: () => void;
  onCloseWindow: () => void;
}) {
  const startDate = new Date(item.start_datetime);
  const endDate = new Date(item.end_datetime);
  const dateFormat = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  } as const;
  const date = sameCalendarDay(startDate, endDate)
    ? dateLabel(startDate, dateFormat)
    : `${dateLabel(startDate, dateFormat)} – ${dateLabel(endDate, dateFormat)}`;
  const time = `${dateLabel(new Date(item.start_datetime), { hour: "numeric", minute: "2-digit" })} – ${dateLabel(new Date(item.end_datetime), { hour: "numeric", minute: "2-digit" })}`;
  const mode =
    item.consultation_mode === "f2f"
      ? "Face-to-face"
      : item.consultation_mode === "online"
        ? "Online"
        : "Online or face-to-face";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              Consultation window details
            </p>
            <h3 className="mt-2 text-xl font-medium">{date}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-muted-foreground"
          >
            ×
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="mt-1 font-medium">{time}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Format</p>
            <p className="mt-1 font-medium">{mode}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Programs allowed</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.availability_programs?.map(({ program }) => (
                <span
                  key={program}
                  className="rounded-full bg-muted px-3 py-1 text-xs"
                >
                  {program}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-7 flex justify-end gap-3 border-t border-border pt-5">
          <button
            type="button"
            onClick={onCloseWindow}
            disabled={!item.is_active}
            className="inline-flex items-center gap-2 rounded-full border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" />
            {item.is_active ? "Close window" : "Already closed"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function OccupiedDetails({
  request,
  onClose,
}: {
  request: OccupiedConsultation;
  onClose: () => void;
}) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">
              Occupied consultation
            </p>
            <h3 className="mt-2 text-xl font-medium">{studentName(request)}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-muted-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-6 space-y-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Schedule</p>
            <p className="mt-1 font-medium">
              {dateLabel(start, { weekday: "long", month: "long", day: "numeric", year: "numeric" })},{" "}
              {dateLabel(start, { hour: "numeric", minute: "2-digit" })} - {dateLabel(end, { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Concern</p>
            <p className="mt-1 font-medium capitalize">{request.concern_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Student details</p>
            <p className="mt-1 font-medium">
              {request.student?.program ?? "Program not set"}
            </p>
            {request.student?.section && (
              <p className="text-muted-foreground">{request.student.section}</p>
            )}
            {request.student?.email && (
              <p className="text-muted-foreground">{request.student.email}</p>
            )}
          </div>
        </div>
        <div className="mt-7 flex justify-end border-t border-border pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className={`toast-enter fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
      <p className="flex-1 leading-5">{message}</p>
      <button type="button" onClick={onClose} className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification">
        <X className="size-4" />
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
function eventTouchesDay(availability: Availability, day: Date) {
  const start = new Date(availability.start_datetime);
  const end = new Date(availability.end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return start < dayEnd && end > dayStart;
}
function requestTouchesDay(request: OccupiedConsultation, day: Date) {
  const start = new Date(request.requested_start_datetime);
  const end = new Date(request.requested_end_datetime);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return start < dayEnd && end > dayStart;
}
function studentName(request: OccupiedConsultation) {
  return (
    request.student?.full_name?.trim() ||
    request.student?.email?.split("@")[0] ||
    "Student"
  );
}
function normalizeOccupiedConsultations(
  rows: Array<
    Omit<OccupiedConsultation, "student"> & {
      student?:
        | NonNullable<OccupiedConsultation["student"]>[]
        | NonNullable<OccupiedConsultation["student"]>
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
      solid: "border-sky-200/80 bg-sky-500/90 hover:bg-sky-500",
      soft: "border-sky-300/70 bg-sky-500/15 text-sky-950 hover:bg-sky-500/25 dark:text-sky-50",
    },
    {
      solid: "border-emerald-200/80 bg-emerald-500/90 hover:bg-emerald-500",
      soft: "border-emerald-300/70 bg-emerald-500/15 text-emerald-950 hover:bg-emerald-500/25 dark:text-emerald-50",
    },
    {
      solid: "border-violet-200/80 bg-violet-500/90 hover:bg-violet-500",
      soft: "border-violet-300/70 bg-violet-500/15 text-violet-950 hover:bg-violet-500/25 dark:text-violet-50",
    },
    {
      solid: "border-rose-200/80 bg-rose-500/90 hover:bg-rose-500",
      soft: "border-rose-300/70 bg-rose-500/15 text-rose-950 hover:bg-rose-500/25 dark:text-rose-50",
    },
    {
      solid: "border-amber-200/80 bg-amber-500/90 hover:bg-amber-500",
      soft: "border-amber-300/70 bg-amber-500/15 text-amber-950 hover:bg-amber-500/25 dark:text-amber-50",
    },
    {
      solid: "border-cyan-200/80 bg-cyan-500/90 hover:bg-cyan-500",
      soft: "border-cyan-300/70 bg-cyan-500/15 text-cyan-950 hover:bg-cyan-500/25 dark:text-cyan-50",
    },
  ];
  const key = program?.trim() || "Unknown";
  const hash = Array.from(key).reduce((total, character) => total + character.charCodeAt(0), 0);
  return colorSets[hash % colorSets.length];
}
function availabilityWindowForDay(availability: Availability, day: Date) {
  const start = new Date(availability.start_datetime);
  const end = new Date(availability.end_datetime);
  const windowStart = new Date(day);
  windowStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);

  if (windowEnd <= windowStart) {
    windowEnd.setDate(windowEnd.getDate() + 1);
  }

  return { start: windowStart, end: windowEnd };
}
function availabilityOverlapsRange(availability: Availability, rangeStart: Date, rangeEnd: Date) {
  const cursor = new Date(rangeStart);
  cursor.setHours(0, 0, 0, 0);
  const finalDay = new Date(rangeEnd);
  finalDay.setHours(0, 0, 0, 0);

  while (cursor <= finalDay) {
    if (eventTouchesDay(availability, cursor)) {
      const window = availabilityWindowForDay(availability, cursor);
      if (rangeStart < window.end && rangeEnd > window.start) return true;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return false;
}
function buildFreeSegments(start: Date, end: Date, occupiedRequests: OccupiedConsultation[]) {
  const occupied = occupiedRequests
    .map((request) => ({
      start: new Date(Math.max(start.getTime(), new Date(request.requested_start_datetime).getTime())),
      end: new Date(Math.min(end.getTime(), new Date(request.requested_end_datetime).getTime())),
    }))
    .filter((request) => request.end > request.start)
    .sort((first, second) => first.start.getTime() - second.start.getTime());
  const segments: Array<{ start: Date; end: Date }> = [];
  let cursor = new Date(start);

  for (const request of occupied) {
    if (request.start > cursor) {
      segments.push({ start: new Date(cursor), end: new Date(request.start) });
    }
    if (request.end > cursor) {
      cursor = new Date(request.end);
    }
  }

  if (cursor < end) {
    segments.push({ start: new Date(cursor), end: new Date(end) });
  }

  return segments;
}
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function dateLabel(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", options).format(date);
}
function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12} ${suffix}`;
}
function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
function sameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
