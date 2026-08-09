"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    window.localStorage.removeItem("scheduler-session-started-at");
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return <button onClick={logout} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-red-300 hover:text-red-500 disabled:opacity-60"><LogOut className="size-4" />{loading ? "Signing out..." : "Sign out"}</button>;
}
