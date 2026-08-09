"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function PendingRequestsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function refreshCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { count: pendingCount } = await supabase
        .from("consultation_requests")
        .select("id", { count: "exact", head: true })
        .eq("instructor_id", user.id)
        .eq("status", "pending");

      setCount(pendingCount ?? 0);
    }

    void refreshCount();

    const channel = supabase
      .channel("pending-requests-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "consultation_requests" }, refreshCount)
      .subscribe();

    const interval = window.setInterval(refreshCount, 10000);
    const refreshOnFocus = () => refreshCount();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  if (!count) return null;

  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
