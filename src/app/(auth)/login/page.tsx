import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  if (params.error === "auth_required") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10 text-foreground">
        <section className="w-full max-w-md rounded-3xl border border-border bg-card p-7 text-center shadow-sm sm:p-9">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">!</div>
          <p className="mt-6 text-sm font-medium text-primary">Authentication required</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">Please sign in first.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">This page is protected. Sign in with your BulSU Microsoft account to continue.</p>
          <Link href="/auth/microsoft" className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90">Sign in with Microsoft</Link>
          <Link href="/" className="mt-5 block text-sm text-muted-foreground hover:text-foreground">Return to landing page</Link>
        </section>
      </main>
    );
  }

  redirect("/auth/microsoft");
}
