"use client";

import { FormEvent, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Toast } from "@/components/ui/Toast";

type Profile = {
  full_name: string | null;
  program: string | null;
  section: string | null;
  phone_number: string | null;
  department: string | null;
  job_title: string | null;
  office_location: string | null;
  role: "student" | "instructor";
};

const graduatePrograms = [
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

export function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const [fullName] = useState(profile?.full_name ?? "");
  const [program, setProgram] = useState(profile?.program ?? "");
  const [section, setSection] = useState(profile?.section ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? "");
  const [department, setDepartment] = useState(profile?.department ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? "");
  const [officeLocation, setOfficeLocation] = useState(profile?.office_location ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      router.replace("/login");
      return;
    }
    if (profile?.role === "student" && (!program.trim() || !section.trim())) {
      setError("Program and section are required.");
      setLoading(false);
      return;
    }

    const saveProfile = supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        program: program.trim() || null,
        section: section.trim() || null,
        phone_number: phoneNumber.trim() || null,
        department: department.trim() || null,
        job_title: jobTitle.trim() || null,
        office_location: officeLocation.trim() || null,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    const timeout = new Promise<{
      data: null;
      error: { message: string };
    }>((resolve) => {
      window.setTimeout(
        () =>
          resolve({
            data: null,
            error: {
              message:
                "Profile save took too long. Check your connection and try again.",
            },
          }),
        10_000,
      );
    });

    const { data: savedProfile, error: updateError } = await Promise.race([
      saveProfile,
      timeout,
    ]);

    if (updateError) {
      setError(`We could not save your profile: ${updateError.message}`);
      setLoading(false);
      return;
    }

    if (!savedProfile) {
      setError("No profile record was updated. Run the Supabase repair query, then sign out and sign in again.");
      setLoading(false);
      return;
    }

    const dashboardPath =
      profile?.role === "instructor"
        ? "/dashboard/instructor"
        : "/dashboard/student";

    router.replace(`${dashboardPath}?profile=saved`);
    router.refresh();
    window.setTimeout(() => setLoading(false), 1500);
  }

  return (
    <form
      data-tour="profile-form"
      onSubmit={submit}
      className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{profile?.role === "instructor" ? "Instructor profile" : "Student profile"}</p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight">Your academic details</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Required fields are marked with an asterisk.</p>
        </div>
        <div className="hidden size-11 items-center justify-center rounded-2xl bg-accent text-primary sm:flex"><Check className="size-5" /></div>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Full name" hint="From your Microsoft account" className="sm:col-span-2"><input className="profile-input cursor-not-allowed bg-muted" value={fullName || "Name not provided"} disabled /></Field>
        <Field label="Account email" hint="Cannot be changed" className="sm:col-span-2"><input className="profile-input cursor-not-allowed bg-muted" value={email} disabled /></Field>
        {profile?.role === "student" ? <><Field label="Graduate program" required><select className="profile-input" value={program} onChange={(event) => setProgram(event.target.value)} required><option value="" disabled>Select your graduate program</option>{graduatePrograms.map((graduateProgram) => <option key={graduateProgram} value={graduateProgram}>{graduateProgram}</option>)}</select></Field><Field label="Section" required><input className="profile-input" value={section} onChange={(event) => setSection(event.target.value)} placeholder="e.g. MS.CPE 1-A" required /></Field></> : <><Field label="Department"><input className="profile-input" value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Graduate School" /></Field><Field label="Position or specialization"><input className="profile-input" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="e.g. Instructor" /></Field><Field label="Office location" className="sm:col-span-2"><input className="profile-input" value={officeLocation} onChange={(event) => setOfficeLocation(event.target.value)} placeholder="e.g. Main campus" /></Field></>}
        <Field label="Phone number" hint="Optional" className="sm:col-span-2"><input className="profile-input" type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="09XX XXX XXXX" /></Field>
      </div>
      {error && <Toast message={error} tone="error" onClose={() => setError("")} />}
      <button className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto" disabled={loading}>{loading ? <><LoaderCircle className="size-4 animate-spin" /> Saving profile...</> : <>Save and continue <ChevronRight className="size-4" /></>}</button>
    </form>
  );
}

function Field({ label, hint, required, className = "", children }: { label: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return <label className={`block text-sm font-medium ${className}`}><span>{label}{required && <span className="ml-1 text-red-500">*</span>}</span>{hint && <span className="ml-2 text-xs font-normal text-muted-foreground">{hint}</span>}{children}</label>;
}
