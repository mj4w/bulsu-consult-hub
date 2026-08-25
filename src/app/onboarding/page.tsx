import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ProfileWalkthrough } from "@/components/profile/ProfileWalkthrough";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header
        data-tour="onboarding-header"
        className="border-t-4 border-primary border-b border-border bg-card"
      >
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-16">
        <div data-tour="onboarding-info" className="lg:pt-8">
          <p className="text-sm font-medium text-primary">Account setup</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-5xl">Complete your profile.</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Add the academic details instructors need before you request a consultation. You can update these details later.</p>
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Your information is protected</p>
            <p className="mt-2 leading-6">Only verified BulSU users and the instructors involved in your consultation can use these details.</p>
          </div>
        </div>
        <ProfileForm profile={profile} email={user.email ?? ""} />
      </div>
      <ProfileWalkthrough role={profile?.role === "instructor" ? "instructor" : "student"} />
    </main>
  );
}
