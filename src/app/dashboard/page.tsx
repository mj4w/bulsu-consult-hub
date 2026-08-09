import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  const role = profile?.role ?? (user.email?.match(/^[0-9]+@/) ? "student" : "instructor");
  redirect(role === "instructor" ? "/dashboard/instructor" : "/dashboard/student");
}
