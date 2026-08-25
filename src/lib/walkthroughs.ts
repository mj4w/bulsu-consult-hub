import { createClient } from "@/lib/supabase/client";

export async function isWalkthroughCompleted(scope: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return true;

  const { data, error } = await supabase
    .from("user_walkthroughs")
    .select("scope")
    .eq("user_id", user.id)
    .eq("scope", scope)
    .maybeSingle();

  if (error) return false;

  return Boolean(data);
}

export async function markWalkthroughCompleted(scope: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const now = new Date().toISOString();

  await supabase.from("user_walkthroughs").upsert(
    {
      user_id: user.id,
      scope,
      completed_at: now,
      updated_at: now,
    },
    {
      onConflict: "user_id,scope",
    },
  );
}
