"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MicrosoftSignInPage() {
  useEffect(() => {
    let cancelled = false;

    async function startMicrosoftSignIn() {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "openid profile email User.Read",
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error && !cancelled) {
        window.location.replace(`/login?error=${encodeURIComponent(error.message)}`);
      }
    }

    void startMicrosoftSignIn();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        <h1 className="mt-6 text-2xl font-medium">Connecting to Microsoft</h1>
        <p className="mt-3 text-sm text-muted-foreground">You will be redirected to your BulSU account.</p>
      </div>
    </main>
  );
}
