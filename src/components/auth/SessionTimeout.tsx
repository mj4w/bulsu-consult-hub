"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const SESSION_DURATION = 60 * 60 * 1000;
const SESSION_KEY = "scheduler-session-started-at";

export function SessionTimeout() {
  const router = useRouter();

  useEffect(() => {
    const storedStart = window.localStorage.getItem(SESSION_KEY);
    const startedAt = storedStart ? Number(storedStart) : Date.now();

    if (!storedStart) {
      window.localStorage.setItem(SESSION_KEY, String(startedAt));
    }

    const remainingTime = Math.max(0, startedAt + SESSION_DURATION - Date.now());
    const timeout = window.setTimeout(async () => {
      window.localStorage.removeItem(SESSION_KEY);
      await createClient().auth.signOut();
      router.replace("/");
      router.refresh();
    }, remainingTime);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return null;
}
