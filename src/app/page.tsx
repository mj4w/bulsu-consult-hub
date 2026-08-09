"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  Menu,
  MessageCircleQuestion,
  Moon,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { Button } from "@/components/ui/button";
import { MicrosoftMark } from "@/components/brand/MicrosoftMark";

const faqs = [
  {
    question: "Who can use the scheduler?",
    answer: "Students and instructors with a verified @ms.bulsu.edu.ph account can use the platform.",
  },
  {
    question: "What can I book a consultation for?",
    answer: "You can request time for research, grades, projects, or any other academic concern.",
  },
  {
    question: "Can I choose online or F2F?",
    answer: "Yes. Instructors can publish online, F2F, or flexible availability.",
  },
];

const consultationExamples = [
  {
    concern: "Research discussion",
    date: "Aug 12",
    time: "5:00–6:00 PM",
    format: "Online",
  },
  {
    concern: "Project consultation",
    date: "Aug 14",
    time: "10:00–11:00 AM",
    format: "F2F",
  },
  {
    concern: "Grades consultation",
    date: "Aug 18",
    time: "2:30–3:30 PM",
    format: "Both available",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const consultationExample = consultationExamples[exampleIndex];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("scheduler-theme");
    const isDark = savedTheme === "dark";

    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const syncThemeState = window.setTimeout(() => {
      setDarkMode(isDark);
    }, 0);

    return () => window.clearTimeout(syncThemeState);
  }, []);

  useEffect(() => {
    const rotateExamples = window.setInterval(() => {
      setExampleIndex((currentIndex) => (currentIndex + 1) % consultationExamples.length);
    }, 3500);

    return () => window.clearInterval(rotateExamples);
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

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pb-32 lg:pt-28">
        <motion.div
          initial={{ opacity: 1, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          <span className="inline-flex rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground">
            Students and instructors
          </span>
          <h1 className="mt-8 text-5xl font-medium leading-[0.98] tracking-[-0.06em] text-balance sm:text-7xl lg:text-[6.7rem]">
            Make every academic conversation move the work forward.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Students find focused time with instructors. Instructors publish availability and guide requests—all in one shared place for research, projects, grades, and the work in between.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link
              href="/auth/microsoft"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Sign in with Microsoft
              <ArrowUpRight className="size-4" />
            </Link>
            <a
              href="#approach"
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              See how it works <span className="ml-1">↓</span>
            </a>
          </div>
        </motion.div>
      </section>

      <section id="about" className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[0.65fr_1.35fr] lg:py-32">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm backdrop-blur">
                <CalendarDays className="size-6 text-primary" aria-hidden="true" />
              </div>
              <p className="max-w-[12rem] text-sm font-medium leading-6 text-muted-foreground">
                One shared academic rhythm
              </p>
            </div>
          </div>
          <div>
            <h2 className="max-w-3xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
              Find the time. Focus the ask. Keep moving.
            </h2>
            <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground">
              Students can browse instructor availability, choose a format, and send a focused request. Instructors can publish time windows, define program scope, and keep every consultation organized from request to approval.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5 }}
              className="mt-10 border-y border-border py-5"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={consultationExample.concern}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 text-sm"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Example consultation
                    </p>
                    <p className="mt-2 font-medium">{consultationExample.concern}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-7 gap-y-3 text-muted-foreground">
                    <PreviewDetail label="Date" value={consultationExample.date} />
                    <PreviewDetail label="Time" value={consultationExample.time} />
                    <PreviewDetail label="Format" value={consultationExample.format} />
                  </div>
                  <span className="flex items-center gap-2 text-primary">
                    <Clock3 className="size-4" /> Available
                  </span>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      <ScrollStory />

      <section className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
        <div className="rounded-2xl border border-border bg-card p-7 sm:p-10 lg:p-14">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Built for students and instructors</p>
              <h2 className="mt-6 max-w-2xl text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
                A clearer rhythm for students and instructors.
              </h2>
            </div>
            <div className="space-y-6 text-sm text-muted-foreground">
              <Feature text="Students arrive with a clear concern and the information instructors need." />
              <Feature text="Instructors control their availability, format, and program scope." />
              <Feature text="Everyone stays informed when plans change." />
              <Link href="/auth/microsoft" className="inline-flex items-center gap-2 pt-3 text-foreground">
                Create your account <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:py-32">
          <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Questions, answered</p>
              <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-sm">
                <MessageCircleQuestion className="size-6 text-primary" />
                <p className="mt-5 text-lg font-medium tracking-tight">
                  Everything you need before you book.
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
                    className="flex w-full items-center justify-between py-6 text-left text-lg font-medium"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  >
                    {faq.question}
                    <span className="text-2xl font-light text-muted-foreground">
                      {openFaq === index ? "−" : "+"}
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
          <div className="text-sm font-semibold"><BrandLogo /></div>
          <p className="text-sm text-muted-foreground">For verified @ms.bulsu.edu.ph accounts.</p>
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
      <Link href="/" className="text-base font-semibold tracking-tight"><BrandLogo /></Link>
      <nav className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
        <a href="#about" className="transition hover:text-foreground">About</a>
        <a href="#approach" className="transition hover:text-foreground">Approach</a>
        <a href="#faq" className="transition hover:text-foreground">FAQ</a>
        <Link href="/auth/microsoft" className="inline-flex items-center gap-2 transition hover:text-foreground"><MicrosoftMark />Sign in</Link>
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
        <Link href="/auth/microsoft" className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 md:inline-flex"><MicrosoftMark />Sign in</Link>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" onClick={onOpenMenu}><Menu className="size-5" /></Button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-border bg-card p-5 shadow-2xl md:hidden">
            <div className="flex items-center justify-between"><span className="font-semibold">Menu</span><Button variant="ghost" size="icon" aria-label="Close menu" onClick={onCloseMenu}><X className="size-5" /></Button></div>
            <nav className="mt-6 grid gap-4 text-lg"><a href="#about" onClick={onCloseMenu}>About</a><a href="#approach" onClick={onCloseMenu}>Approach</a><a href="#faq" onClick={onCloseMenu}>FAQ</a><Link className="inline-flex items-center gap-2" href="/auth/microsoft"><MicrosoftMark />Sign in</Link></nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function PreviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return <p className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-foreground" />{text}</p>;
}
