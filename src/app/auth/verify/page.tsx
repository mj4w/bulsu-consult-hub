import Link from "next/link";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass-panel w-full max-w-lg rounded-[2rem] bg-[var(--ink)] text-[var(--paper)] p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/20 text-3xl">✉</div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-[var(--accent-soft)]">Check your inbox</p>
        <h1 className="mt-4 text-3xl font-semibold">Verify your university email</h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          We sent a verification link to <span className="font-semibold text-white">{params.email ?? "your email address"}</span>. Verify it, then return here to sign in.
        </p>
        <Link className="mt-8 inline-flex rounded-full bg-[var(--accent)] px-6 py-3 font-semibold text-white hover:bg-[#a096ff]" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
