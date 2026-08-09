"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, LockKeyhole } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

export function InstructorPortal() {
  const [registerMode, setRegisterMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = window.setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "instructor") {
        window.location.replace("/dashboard/instructor");
        return;
      }

      await supabase.auth.signOut();
      setLoading(false);
    }, 0);
    return () => window.clearTimeout(checkSession);
  }, []);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading instructor portal...</main>;

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground"><div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3 text-primary"><div className="flex size-10 items-center justify-center rounded-xl bg-accent"><CalendarDays className="size-5" /></div><div><p className="text-sm font-semibold">Instructor Portal</p><p className="text-xs text-muted-foreground">Native testing account</p></div></div><h1 className="mt-8 text-3xl font-medium tracking-tight">{registerMode ? "Create instructor account" : "Instructor sign in"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Use a non-Microsoft email for testing. After authentication, you will use the same instructor dashboard as Microsoft accounts.</p>{registerMode ? <RegisterForm onBack={() => setRegisterMode(false)} /> : <LoginForm onRegister={() => setRegisterMode(true)} />}<div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3" /> Test accounts are marked separately</div></div></main>;
}

function RegisterForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const { data, error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim(), test_teacher: true },
        emailRedirectTo: `${window.location.origin}/instructor-portal`,
      },
    });
    if (signUpError) { setError(signUpError.message); return; }
    if (!data.session) { setNotice("Account created. Confirm your email, then sign in here."); return; }
    router.push("/dashboard/instructor");
  }

  return <form className="mt-7 space-y-4" onSubmit={submit}><Input label="Display name" value={name} onChange={setName} placeholder="e.g. Instructor Demo" /><Input label="Email" value={email} onChange={setEmail} type="email" placeholder="teacher@example.com" /><Input label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 6 characters" minLength={6} />{notice && <Toast message={notice} tone="success" onClose={() => setNotice("")} />}{error && <Toast message={error} tone="error" onClose={() => setError("")} />}<button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Register instructor <ArrowRight className="size-4" /></button><button type="button" onClick={onBack} className="w-full text-sm text-primary hover:underline">Back to sign in</button></form>;
}

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) { setError(signInError.message); return; }
    router.push("/dashboard/instructor");
  }

  return <form className="mt-7 space-y-4" onSubmit={submit}><Input label="Email" value={email} onChange={setEmail} type="email" placeholder="teacher@example.com" /><Input label="Password" value={password} onChange={setPassword} type="password" placeholder="Your password" />{error && <Toast message={error} tone="error" onClose={() => setError("")} />}<button className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Sign in <ArrowRight className="size-4" /></button><button type="button" onClick={onRegister} className="w-full text-sm text-primary hover:underline">Create a test instructor account</button></form>;
}

function Input({ label, value, onChange, placeholder, type = "text", minLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; minLength?: number }) {
  return <label className="block text-sm font-medium">{label}<input className="profile-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} minLength={minLength} required /></label>;
}
