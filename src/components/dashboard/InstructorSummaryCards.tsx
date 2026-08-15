"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CalendarRange, ClipboardList } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type InstructorRequestSummary = {
  id: string;
  requested_start_datetime: string;
  status: "pending" | "approved" | "declined" | "cancelled";
};

type InstructorAvailabilitySummary = {
  id: string;
  is_active: boolean;
};

export function InstructorSummaryCards({
  initialAvailability,
  initialRequests,
}: {
  initialAvailability: InstructorAvailabilitySummary[];
  initialRequests: InstructorRequestSummary[];
}) {
  const [availability, setAvailability] = useState(initialAvailability);
  const [requests, setRequests] = useState(initialRequests);

  useEffect(() => {
    const supabase = createClient();

    async function refreshAvailability() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("instructor_availability")
        .select("id, is_active")
        .eq("instructor_id", user.id);

      setAvailability((data ?? []) as InstructorAvailabilitySummary[]);
    }

    async function refreshRequests() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("consultation_requests")
        .select("id, requested_start_datetime, status")
        .eq("instructor_id", user.id);

      setRequests((data ?? []) as InstructorRequestSummary[]);
    }

    function refreshAll() {
      void refreshAvailability();
      void refreshRequests();
    }

    const channel = supabase
      .channel("instructor-summary-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "instructor_availability" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, refreshRequests)
      .subscribe();

    const interval = window.setInterval(refreshAll, 5000);
    const refreshOnFocus = () => refreshAll();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const pendingRequests = requests.filter((request) => request.status === "pending").length;
  const activeAvailability = availability.filter((item) => item.is_active).length;
  const confirmedToday = requests.filter((request) => {
    if (request.status !== "approved") return false;
    const requestedStart = new Date(request.requested_start_datetime);
    const today = new Date();
    return (
      requestedStart.getFullYear() === today.getFullYear() &&
      requestedStart.getMonth() === today.getMonth() &&
      requestedStart.getDate() === today.getDate()
    );
  }).length;

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-3">
      <SummaryCard
        icon={ClipboardList}
        label="Pending requests"
        value={String(pendingRequests)}
        detail={pendingRequests ? "Awaiting approval" : "No pending requests"}
      />
      <SummaryCard
        icon={CalendarDays}
        label="Confirmed today"
        value={String(confirmedToday)}
        detail={confirmedToday ? "Approved consultations" : "No approved consultations"}
      />
      <SummaryCard
        icon={CalendarRange}
        label="Open consultation windows"
        value={String(activeAvailability)}
        detail={activeAvailability ? "Available to students" : "None published"}
      />
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-7 text-[#2563eb]" />
      </div>
      <p className="mt-5 text-3xl font-medium tracking-tight">{value}</p>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}
