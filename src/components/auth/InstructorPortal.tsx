"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

export function InstructorPortal() {
  const [registerMode, setRegisterMode] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = window.setTimeout(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "instructor") {
        window.location.replace("/dashboard/instructor");
        return;
      }

      await supabase.auth.signOut();
      setCheckingSession(false);
    }, 0);

    return () => window.clearTimeout(checkSession);
  }, []);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Loading instructor portal...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8">
        <section className="hidden lg:block">
          <div className="max-w-md">
            <BrandLogo />

            <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <ShieldCheck className="size-4" />
              Instructor testing access
            </div>

            <h1 className="mt-6 text-4xl font-medium leading-tight tracking-tight">
              Manage consultation requests with a test instructor account.
            </h1>

            <p className="mt-5 text-base leading-7 text-muted-foreground">
              This portal is for non-Microsoft instructor testing. After sign in,
              it opens the same instructor dashboard used by real instructor
              accounts.
            </p>

            <div className="mt-8 grid gap-3">
              <PortalBenefit
                icon={CalendarDays}
                title="Open consultation windows"
                text="Set the dates, time ranges, format, and allowed programs."
              />
              <PortalBenefit
                icon={CheckCircle2}
                title="Review student requests"
                text="Approve, decline, and track pending requests in realtime."
              />
              <PortalBenefit
                icon={LockKeyhole}
                title="Separated from student access"
                text="Accounts created here are marked as instructor test users."
              />
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <BrandLogo compact />
              </div>

              <div className="ml-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CalendarDays className="size-6" />
              </div>
            </div>

            <p className="mt-8 text-sm font-medium text-primary">
              Instructor Portal
            </p>

            <h2 className="mt-2 text-3xl font-medium tracking-tight">
              {registerMode ? "Create test account" : "Sign in"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {registerMode
                ? "Create a testing account for the instructor dashboard."
                : "Use your registered test instructor email and password."}
            </p>

            {registerMode ? (
              <RegisterForm onBack={() => setRegisterMode(false)} />
            ) : (
              <LoginForm onRegister={() => setRegisterMode(true)} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function RegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    const { data, error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), test_teacher: true },
        emailRedirectTo: `${window.location.origin}/instructor-portal`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      setNotice("Account created. Confirm your email, then sign in here.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/instructor");
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={submit}>
      <Input
        label="Display name"
        value={name}
        onChange={setName}
        placeholder="e.g. Instructor Demo"
        disabled={submitting}
      />
      <Input
        label="Email"
        value={email}
        onChange={setEmail}
        type="email"
        placeholder="teacher@example.com"
        disabled={submitting}
      />
      <Input
        label="Password"
        value={password}
        onChange={setPassword}
        type="password"
        placeholder="At least 6 characters"
        minLength={6}
        disabled={submitting}
      />

      {notice && (
        <Toast message={notice} tone="success" onClose={() => setNotice("")} />
      )}
      {error && (
        <Toast message={error} tone="error" onClose={() => setError("")} />
      )}

      <button
        disabled={submitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Processing account...
          </>
        ) : (
          <>
            Register instructor
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="w-full rounded-full px-4 py-2 text-sm text-primary transition hover:bg-primary/10 disabled:opacity-50"
      >
        Back to sign in
      </button>
    </form>
  );
}

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await createClient().auth.signInWithPassword(
      {
        email: email.trim(),
        password,
      },
    );

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard/instructor");
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={submit}>
      <Input
        label="Email"
        value={email}
        onChange={setEmail}
        type="email"
        placeholder="teacher@example.com"
        disabled={submitting}
      />
      <Input
        label="Password"
        value={password}
        onChange={setPassword}
        type="password"
        placeholder="Your password"
        disabled={submitting}
      />

      {error && (
        <Toast message={error} tone="error" onClose={() => setError("")} />
      )}

      <button
        disabled={submitting}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign in
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onRegister}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm text-primary transition hover:bg-primary/10 disabled:opacity-50"
      >
        <Mail className="size-4" />
        Create a test instructor account
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  minLength,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  minLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="profile-input disabled:cursor-not-allowed disabled:bg-muted"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minLength}
        disabled={disabled}
        required
      />
    </label>
  );
}

function PortalBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CalendarDays;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-card/70 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
