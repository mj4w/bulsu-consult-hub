"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Bell,
  BookOpenCheck,
  CalendarPlus,
  Check,
  ClipboardList,
  GraduationCap,
  Menu,
  MessageCircleQuestion,
  Moon,
  ShieldCheck,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { MicrosoftMark } from "@/components/brand/MicrosoftMark";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { Button } from "@/components/ui/button";

const faqs = [
  {
    question: "Who can use the scheduler?",
    answer:
      "Students sign in using their verified @ms.bulsu.edu.ph Microsoft account. Instructors can use their institutional Microsoft account or the instructor portal account provided for testing.",
  },
  {
    question: "What can I book a consultation for?",
    answer:
      "Students can request time for research, grades, projects, or other academic concerns. Each request includes the purpose, preferred time, consultation format, and student profile details.",
  },
  {
    question: "Can I choose Online or F2F?",
    answer:
      "Yes. Instructors can publish Online, F2F, or Both. Students only see available windows that match their program scope.",
  },
  {
    question: "What happens after a request is approved?",
    answer:
      "The approved consultation appears on both dashboards. The occupied time is removed from open availability so other students cannot book the same slot.",
  },
  {
    question: "Can a student cancel or reschedule?",
    answer:
      "Students can request changes only when the consultation is not in the past and not within the 1-day lock period. Past consultations are view-only.",
  },
];

const roleCards = [
  {
    icon: GraduationCap,
    label: "For students",
    title: "Request the right conversation with clear context.",
    points: [
      "Browse instructor availability",
      "Choose a preferred time inside an open window",
      "Track pending, approved, declined, and cancelled requests",
    ],
  },
  {
    icon: CalendarPlus,
    label: "For instructors",
    title: "Publish consultation windows without losing control of your time.",
    points: [
      "Set Online, F2F, or Both availability",
      "Limit windows by program scope",
      "Approve or decline requests with conflict protection",
    ],
  },
  {
    icon: ShieldCheck,
    label: "For the process",
    title: "Keep the schedule clean, visible, and accountable.",
    points: [
      "Avoid double-booked approved slots",
      "Notify both sides when status changes",
      "Keep a searchable consultation history",
    ],
  },
];

const workflowCards = [
  {
    step: "01",
    title: "Instructor opens availability",
    copy: "The instructor sets date, time range, format, and program scope. Students only see windows that apply to them.",
  },
  {
    step: "02",
    title: "Student sends a focused request",
    copy: "The student selects an available time inside the instructor window and adds the consultation purpose.",
  },
  {
    step: "03",
    title: "Instructor reviews and decides",
    copy: "Pending requests are separated from reviewed requests, with clear student details and approval actions.",
  },
  {
    step: "04",
    title: "Both dashboards stay updated",
    copy: "Approved schedules, notifications, occupied slots, and history update across student and instructor views.",
  },
];

const systemHighlights = [
  {
    icon: Bell,
    title: "Realtime status updates",
    copy: "Students see request results without manually refreshing, and instructors see new requests as they arrive.",
  },
  {
    icon: ClipboardList,
    title: "Consultation history",
    copy: "Search by date, instructor or student name, purpose, and status so records are easy to review later.",
  },
  {
    icon: UsersRound,
    title: "Role-aware dashboards",
    copy: "Students and instructors land on dashboards built for their work instead of sharing one confusing screen.",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("scheduler-theme");
    const isDark = savedTheme === "dark";

    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const syncThemeState = window.setTimeout(() => {
      setDarkMode(isDark);
    }, 0);

    return () => window.clearTimeout(syncThemeState);
  }, []);

  function toggleTheme() {
    const nextIsDark = !darkMode;

    setDarkMode(nextIsDark);
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
    window.localStorage.setItem("scheduler-theme", nextIsDark ? "dark" : "light");
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header
        darkMode={darkMode}
        menuOpen={menuOpen}
        onToggleTheme={toggleTheme}
        onOpenMenu={() => setMenuOpen(true)}
        onCloseMenu={closeMenu}
      />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 lg:pb-32 lg:pt-24">
        <motion.div
          initial={{ opacity: 1, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-5xl"
        >
          <span className="inline-flex rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            BulSU academic consultation scheduler
          </span>
          <h1 className="mt-8 text-5xl font-medium leading-[0.98] tracking-[-0.06em] text-balance sm:text-7xl lg:text-[6.4rem]">
            Book consultations with less back-and-forth.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            A focused scheduling system for students and instructors: publish availability, request the right time, approve consultations, and keep academic work moving from one organized dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/auth/microsoft"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <MicrosoftMark />
              Sign in with Microsoft
            </Link>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              See the workflow <ArrowUpRight className="size-4" />
            </a>
          </div>
        </motion.div>
      </section>

      <section id="about" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm backdrop-blur">
                  <BookOpenCheck className="size-7 text-primary" aria-hidden="true" />
                </div>
                <p className="max-w-[13rem] text-sm font-medium leading-6 text-muted-foreground">
                  Built for academic consultation, not generic calendar booking
                </p>
              </div>
            </div>
            <div>
              <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
                The system keeps the important details visible before the meeting starts.
              </h2>
              <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
                Students do not only pick a date. They submit the concern, program details, preferred time, and consultation format. Instructors do not only receive a notification. They review the request, approve or decline it, and keep the schedule protected from overlapping approvals.
              </p>
            </div>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {roleCards.map((card) => (
              <RoleCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Practical workflow</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
                From availability to approved consultation.
              </h2>
            </div>
            <Link href="/auth/microsoft" className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium transition hover:bg-muted">
              Start scheduling <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
            {workflowCards.map((item) => (
              <div key={item.step} className="rounded-3xl border border-border bg-card/75 p-6 shadow-sm backdrop-blur">
                <p className="text-sm font-semibold text-primary">{item.step}</p>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ScrollStory />

      <section className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="rounded-[2rem] border border-border bg-card/80 p-7 shadow-sm backdrop-blur sm:p-10 lg:p-14">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">What makes it useful</p>
              <h2 className="mt-6 max-w-2xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
                Designed around the actual consultation process.
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground">
                The landing page now explains the system clearly for first-time users: what each role can do, how booking works, what happens after approval, and how schedule conflicts are handled.
              </p>
            </div>
            <div className="grid gap-4">
              {systemHighlights.map((item) => (
                <InfoCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          <Feature text="Student accounts are restricted to the required institutional email domain." />
          <Feature text="Approved time slots are protected from duplicate bookings." />
          <Feature text="Upcoming, pending, cancelled, and past consultations stay visible in history." />
        </div>
      </section>

      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Questions, answered</p>
              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <MessageCircleQuestion className="size-6 text-primary" />
                <p className="mt-5 text-lg font-medium tracking-tight">
                  What users should know before they book.
                </p>
                <div className="mt-6 space-y-3">
                  <div className="h-2 w-4/5 rounded-full bg-muted" />
                  <div className="h-2 w-3/5 rounded-full bg-muted" />
                  <div className="h-2 w-2/5 rounded-full bg-primary/30" />
                </div>
              </div>
            </div>
            <div className="border-t border-border">
              {faqs.map((faq, index) => (
                <div key={faq.question} className="border-b border-border">
                  <button
                    className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    {faq.question}
                    <span className="text-2xl font-light text-muted-foreground">
                      {openFaq === index ? "-" : "+"}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-xl pb-6 text-sm leading-6 text-muted-foreground">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold">
            <BrandLogo />
          </div>
          <div className="space-y-1 text-sm text-muted-foreground sm:text-right">
            <p>For verified @ms.bulsu.edu.ph student accounts and instructor-managed consultation schedules.</p>
            <p>© 2026 Student Consultation Scheduler. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Header({
  darkMode,
  menuOpen,
  onToggleTheme,
  onOpenMenu,
  onCloseMenu,
}: {
  darkMode: boolean;
  menuOpen: boolean;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
}) {
  return (
    <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6 lg:h-24">
      <Link href="/" className="text-base font-semibold tracking-tight">
        <BrandLogo />
      </Link>
      <nav className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
        <a href="#about" className="transition hover:text-foreground">About</a>
        <a href="#workflow" className="transition hover:text-foreground">Workflow</a>
        <a href="#approach" className="transition hover:text-foreground">Approach</a>
        <a href="#faq" className="transition hover:text-foreground">FAQ</a>
        <Link href="/auth/microsoft" className="inline-flex items-center gap-2 transition hover:text-foreground">
          <MicrosoftMark />Sign in
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="theme-toggle"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={onToggleTheme}
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span>{darkMode ? "Light" : "Dark"}</span>
        </Button>
        <Link href="/auth/microsoft" className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 md:inline-flex">
          <MicrosoftMark />Sign in
        </Link>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={onOpenMenu}>
          <Menu className="size-5" />
        </Button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-border bg-card p-5 shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={onCloseMenu}>
                <X className="size-5" />
              </Button>
            </div>
            <nav className="mt-6 grid gap-4 text-lg">
              <a href="#about" onClick={onCloseMenu}>About</a>
              <a href="#workflow" onClick={onCloseMenu}>Workflow</a>
              <a href="#approach" onClick={onCloseMenu}>Approach</a>
              <a href="#faq" onClick={onCloseMenu}>FAQ</a>
              <Link className="inline-flex items-center gap-2" href="/auth/microsoft">
                <MicrosoftMark />Sign in
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function RoleCard({
  icon: Icon,
  label,
  title,
  points,
}: {
  icon: typeof GraduationCap;
  label: string;
  title: string;
  points: string[];
}) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/75 p-6 shadow-sm backdrop-blur">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground">{label}</p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight">{title}</h3>
      <div className="mt-6 space-y-3">
        {points.map((point) => (
          <Feature key={point} text={point} />
        ))}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  copy,
}: {
  icon: typeof Bell;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex gap-4 rounded-3xl border border-border bg-background/50 p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <p className="flex gap-3 text-sm leading-6 text-muted-foreground">
      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
      {text}
    </p>
  );
}
