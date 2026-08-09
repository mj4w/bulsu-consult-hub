"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const SESSION_DURATION = 60 * 60 * 1000;
const SESSION_KEY = "scheduler-session-started-at";

export function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    let storedStart: string | null = null;
    try {
      storedStart = window.localStorage.getItem(SESSION_KEY);
    } catch {
      storedStart = null;
    }

    const parsedStart = storedStart ? Number(storedStart) : NaN;
    const startedAt = Number.isFinite(parsedStart) ? parsedStart : Date.now();

    if (!storedStart) {
      try {
        window.localStorage.setItem(SESSION_KEY, String(startedAt));
      } catch {
        // Ignore storage failures.
      }
    }

    const remainingTime = Math.max(0, startedAt + SESSION_DURATION - Date.now());
    const timeout = window.setTimeout(async () => {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        // Ignore storage failures.
      }
      await createClient().auth.signOut();
      router.replace("/");
      router.refresh();
    }, remainingTime);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return null;
}
