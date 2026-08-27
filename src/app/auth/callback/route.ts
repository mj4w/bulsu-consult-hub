import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email?.toLowerCase().endsWith("@ms.bulsu.edu.ph")) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=domain", url.origin));
    }

    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    const identityData = user.identities?.[0]?.identity_data as Record<string, string | undefined> | undefined;
    let importedFullName =
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.display_name ??
      identityData?.full_name ??
      identityData?.name ??
      identityData?.displayName ??
      ([identityData?.given_name, identityData?.family_name].filter(Boolean).join(" ") || undefined);

    if (providerToken) {
      const graphResponse = await fetch(
        "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName,mobilePhone,businessPhones,department,jobTitle,officeLocation",
        {
          headers: { Authorization: `Bearer ${providerToken}` },
          cache: "no-store",
        },
      );

      if (graphResponse.ok) {
        const graphProfile = await graphResponse.json() as {
          displayName?: string;
          mail?: string;
          userPrincipalName?: string;
          mobilePhone?: string;
          businessPhones?: string[];
          department?: string;
          jobTitle?: string;
          officeLocation?: string;
        };

        importedFullName = graphProfile.displayName ?? importedFullName;

        await supabase.from("profiles").update({
          full_name: importedFullName ?? undefined,
          phone_number: graphProfile.mobilePhone ?? graphProfile.businessPhones?.[0] ?? undefined,
          department: graphProfile.department ?? undefined,
          job_title: graphProfile.jobTitle ?? undefined,
          office_location: graphProfile.officeLocation ?? undefined,
        }).eq("id", user.id);
      }
    }

    if (importedFullName && !providerToken) {
      await supabase.from("profiles").update({ full_name: importedFullName }).eq("id", user.id);
    }
  }

  const redirectUrl = new URL(next, url.origin);
  redirectUrl.searchParams.set("welcome", "1");

  return NextResponse.redirect(redirectUrl);
}

function safeInternalPath(value: string | null) {
  if (!value) return "/onboarding";
  if (!value.startsWith("/") || value.startsWith("//")) return "/onboarding";
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/onboarding";
  return value;
}
