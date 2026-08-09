"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isLogin = mode === "login";
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function continueWithMicrosoft() {
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email User.Read",
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setIsLoading(false);
    }
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-[2rem] bg-[var(--ink)] p-6 text-[var(--paper)] sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-soft)]">
        BSU Consultation Scheduler
      </p>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        {isLogin ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-white/70">
        {isLogin
          ? "Continue with your Bulacan State University Microsoft account."
          : "Use your official Microsoft account to create your scheduler profile."}
      </p>

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-white/65">
        Only verified <strong className="text-white">@ms.bulsu.edu.ph</strong> accounts are allowed.
      </div>

      {error && <Toast message={error} tone="error" onClose={() => setError("")} />}

      <button
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-[#17233d] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={continueWithMicrosoft}
        disabled={isLoading}
      >
        <MicrosoftMark />
        {isLoading ? "Connecting..." : "Continue with Microsoft"}
      </button>

      <p className="mt-6 text-center text-sm text-white/55">
        {isLogin ? "Need an account? " : "Already registered? "}
        <Link className="font-semibold text-[var(--accent-soft)] hover:text-white" href={isLogin ? "/register" : "/login"}>
          {isLogin ? "Register" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}

function MicrosoftMark() {
  return (
    <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
      <span className="bg-[#f25022]" />
      <span className="bg-[#7fba00]" />
      <span className="bg-[#00a4ef]" />
      <span className="bg-[#ffb900]" />
    </span>
  );
}
