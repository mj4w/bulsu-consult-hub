"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowUp,
  Bell,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  ClipboardList,
  GraduationCap,
  LockKeyhole,
  Menu,
  MessageCircleQuestion,
  Moon,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { MicrosoftMark } from "@/components/brand/MicrosoftMark";
import { Button } from "@/components/ui/button";

const faqs = [
  ["Who can use the scheduler?", "Graduate students sign in using their verified @ms.bulsu.edu.ph Microsoft account. Instructors use their institutional account or the controlled instructor portal account used for testing."],
  ["What details are included in a request?", "A request includes the graduate student profile, program and section, consultation purpose, preferred time, selected instructor, selected format, and concern details."],
  ["How does the system prevent double booking?", "When an instructor approves one request, the occupied time is removed from student availability and conflicting requests are prevented from being approved."],
  ["Can students cancel or reschedule?", "Students can request changes only when the consultation is still upcoming and not within the one-day lock period. Past consultations are view-only."],
];

const heroMetrics = [
  { label: "Graduate programs", value: "01" },
  { label: "Faculty schedules", value: "02" },
  { label: "Consultation records", value: "03" },
];

const roleCards = [
  {
    icon: GraduationCap,
    eyebrow: "Graduate students",
    title: "Request consultations with academic context.",
    copy: "Masteral and doctoral students can find available faculty time, select a valid consultation slot, and send the concern before the meeting.",
    points: ["Program-scoped faculty availability", "Pending and approved calendar view", "Searchable consultation records"],
  },
  {
    icon: CalendarPlus,
    eyebrow: "Instructors and professors",
    title: "Manage consultation load with clear boundaries.",
    copy: "Faculty members can publish consultation windows, limit visibility by graduate program, review requests, and keep approved slots protected.",
    points: ["Online, F2F, or Both formats", "Conflict-aware approvals", "Upcoming schedule management"],
  },
];

const workflowCards = [
  ["01", "Faculty availability", "Instructors define consultation dates, time ranges, format, and graduate program scope."],
  ["02", "Focused request", "Graduate students choose a time inside the faculty window and submit a clear academic concern."],
  ["03", "Instructor review", "Faculty review the student details, purpose, and requested time before approving or declining."],
  ["04", "Traceable record", "Both sides receive updates, calendar visibility, and searchable consultation history."],
];

const platformHighlights = [
  [Bell, "Realtime academic coordination", "Requests, approvals, cancellations, and counters update across student and instructor dashboards without forcing users to refresh."],
  [ClipboardList, "Graduate consultation records", "Pending, approved, declined, cancelled, and past consultations remain traceable for students and faculty."],
  [ShieldCheck, "Institutional safeguards", "Access rules, schedule checks, and approval limits protect records even if someone tries to bypass the interface."],
] as const;

const securityItems = [
  "Student sign-in is restricted to the institutional domain.",
  "Role-based access limits which records each user can read or change.",
  "Approved consultation slots are protected from overlapping approvals.",
  "Private system credentials stay out of public browser code.",
];

const footerGroups = [
  { title: "Features", links: ["Availability calendar", "Request review", "Consultation history", "Notifications"] },
  { title: "Students", links: ["Find instructor time", "Submit concerns", "Track request status", "View approved schedules"] },
  { title: "Instructors", links: ["Set availability", "Limit program scope", "Approve requests", "Manage consultations"] },
  { title: "Safeguards", links: ["Role-based access", "Conflict prevention", "Verified accounts", "Protected records"] },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("scheduler-theme");
    const isDark = savedTheme ? savedTheme === "dark" : false;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const syncThemeState = window.setTimeout(() => {
      setDarkMode(isDark);
    }, 0);

    return () => window.clearTimeout(syncThemeState);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 520);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function toggleTheme() {
    const nextIsDark = !darkMode;
    setDarkMode(nextIsDark);
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
    window.localStorage.setItem("scheduler-theme", nextIsDark ? "dark" : "light");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background pt-20 text-foreground">
      <Header
        darkMode={darkMode}
        menuOpen={menuOpen}
        onToggleTheme={toggleTheme}
        onOpenMenu={() => setMenuOpen(true)}
        onCloseMenu={() => setMenuOpen(false)}
      />

      <section className={`relative overflow-hidden ${darkMode ? "bg-[#08111f] text-white" : "bg-[#fffaf0] text-[#241316]"}`}>
        <div
          className={`absolute inset-0 ${
            darkMode
              ? "bg-[radial-gradient(circle_at_18%_18%,rgba(245,184,0,0.12),transparent_22rem),radial-gradient(circle_at_88%_32%,rgba(37,99,235,0.20),transparent_30rem),linear-gradient(135deg,rgba(8,17,31,0.98),rgba(13,28,52,0.96)_52%,rgba(7,14,27,0.98))]"
              : "bg-[radial-gradient(circle_at_18%_18%,rgba(245,184,0,0.18),transparent_22rem),linear-gradient(135deg,rgba(255,250,240,0.98),rgba(255,247,226,0.96)_52%,rgba(252,240,216,0.92))]"
          }`}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5b800]/55 to-transparent" />
        <Image
          src="/bulsu-seal.png"
          alt=""
          width={760}
          height={760}
          priority
          aria-hidden="true"
          className={`pointer-events-none absolute right-[-13rem] top-24 w-[25rem] select-none sm:right-[-15rem] sm:top-16 sm:w-[31rem] lg:right-[-17rem] lg:top-1/2 lg:w-[47.5rem] lg:-translate-y-1/2 ${darkMode ? "opacity-[0.10] lg:opacity-[0.18]" : "opacity-[0.12] lg:opacity-[0.20]"}`}
        />
        <div className={`pointer-events-none absolute right-0 top-0 h-full w-full sm:w-3/4 lg:w-1/2 ${darkMode ? "bg-gradient-to-l from-[#07142b]/62 via-[#08111f]/34 to-transparent lg:from-[#07142b]/76 lg:via-[#08111f]/42" : "bg-gradient-to-l from-[#fffaf0]/78 via-[#fffaf0]/45 to-transparent lg:from-[#fffaf0]/70"}`} />
        <div className="relative mx-auto grid min-h-[38rem] w-full max-w-[94rem] items-center px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24">

        <motion.div
          initial="hidden"
          animate="visible"
          variants={reveal}
          transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex max-w-5xl flex-col justify-center"
        >
          <div className={`mb-6 inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? "border-[#f5b800]/25 bg-[#f5b800]/10 text-[#f7d56b]" : "border-[#a51c30]/15 bg-[#a51c30]/5 text-[#8f1728]"}`}>
            Bulacan State University Graduate School
          </div>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-balance sm:text-7xl lg:text-[5.2rem]">
            Coordinate <em className="font-serif italic font-normal tracking-[-0.02em]">graduate</em>
            <br />
            consultations with
            <br />
            <em className="font-serif italic font-normal tracking-[-0.02em] text-[#f5b800]">academic clarity.</em>
          </h1>

          <p className={`mt-7 max-w-2xl text-sm leading-7 sm:text-base ${darkMode ? "text-white/68" : "text-[#5f4a3c]"}`}>
            A consultation scheduling platform for BulSU masteral and doctoral students, instructors, and professors. It organizes faculty availability, student requests, approval decisions, and consultation records in one academic workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/auth/microsoft"
              className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 ${darkMode ? "bg-[#173b7a] text-white shadow-blue-950/25 ring-1 ring-[#f5b800]/15 hover:bg-[#1d4ed8]" : "bg-[#a51c30] text-white shadow-red-300/30 hover:bg-[#8f1728]"}`}
            >
              <MicrosoftMark />
              Sign in with Microsoft
            </Link>
            <a
              href="#workflow"
              className={`inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${darkMode ? "border-[#f5b800]/20 bg-[#f5b800]/5 text-white/80 hover:bg-[#f5b800]/10 hover:text-white" : "border-[#d8b24c]/35 bg-white/35 text-[#4a2a14] hover:bg-white/60"}`}
            >
              View workflow <ArrowUpRight className="size-4" />
            </a>
          </div>

          <div className={`mt-10 border-t pt-5 ${darkMode ? "border-[#f5b800]/15" : "border-[#d8b24c]/35"}`}>
            <div className={`flex flex-wrap items-center gap-x-7 gap-y-4 text-xs ${darkMode ? "text-white/55" : "text-[#6b5442]"}`}>
              <span className={`font-medium ${darkMode ? "text-white/75" : "text-[#241316]"}`}>Designed for graduate consultation workflows</span>
              {heroMetrics.map((metric) => (
                <span key={metric.label} className="inline-flex items-center gap-2">
                  <span className={darkMode ? "text-[#f5b800]" : "text-[#a51c30]"}>{metric.value}</span>
                  {metric.label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        </div>
      </section>

      <MotionSection id="about" className="relative mx-auto w-full max-w-[94rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7791f]">Why it exists</p>
            <h2 className="mt-5 text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
              Graduate consultation should be intentional, documented, and easy to coordinate.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              Research advising, proposal reviews, thesis direction, grade clarification, and project guidance require a clearer process than scattered chat messages.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {roleCards.map((card, index) => (
              <RolePanel key={card.eyebrow} index={index} {...card} />
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="workflow" className="relative bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(250,204,21,0.045))] py-16 lg:py-24">
        <div className="mx-auto w-full max-w-[94rem] px-5 sm:px-8 lg:px-10">
        <div className="rounded-[2rem] border border-border bg-card p-6 lg:p-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7791f]">Workflow</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
                A formal path from faculty availability to approved consultation.
              </h2>
            </div>
            <Link
              href="/auth/microsoft"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#a51c30] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#8f1728]"
            >
              Start now <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <motion.div
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.25 }}
            className="relative mt-10 grid gap-4 lg:grid-cols-4"
          >
            <motion.div
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: 0.25, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-6 right-6 top-10 hidden h-px origin-left bg-gradient-to-r from-[#f5b800]/0 via-[#f5b800]/55 to-[#a51c30]/45 lg:block"
            />
            {workflowCards.map(([step, title, copy], index) => (
              <ProcessCard key={step} step={step} title={title} copy={copy} index={index} />
            ))}
          </motion.div>
        </div>
        </div>
      </MotionSection>

      <MotionSection className="mx-auto grid w-full max-w-[94rem] gap-6 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-24">
        <div className="rounded-[2rem] border border-border bg-card p-6 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7791f]">Core functions</p>
          <h2 className="mt-4 max-w-2xl text-4xl font-medium leading-tight tracking-[-0.04em]">
            Built around the real work of graduate academic advising.
          </h2>
          <div className="mt-8 grid gap-4">
            {platformHighlights.map(([Icon, title, copy], index) => (
              <InfoRow key={title} icon={<Icon className="size-5" />} title={title} copy={copy} index={index} />
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <motion.div whileHover={{ y: -3 }} className="rounded-[2rem] border border-border bg-card p-6 transition">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a51c30]">Calendar logic</p>
              <Clock3 className="size-5 text-[#a51c30]" />
            </div>
            <div className="mt-6 space-y-3">
              <PreviewRow label="Available window" value="9:00 AM - 1:00 PM" />
              <PreviewRow label="Student selected" value="10:00 AM - 10:30 AM" />
              <PreviewRow label="Remaining slot" value="9:00 AM - 10:00 AM / 10:30 AM - 1:00 PM" />
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} className="rounded-[2rem] border border-[#f5b800]/30 bg-[linear-gradient(135deg,rgba(245,184,0,0.14),rgba(165,28,48,0.07))] p-6 transition">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b7791f]">Result</p>
            <h3 className="mt-4 text-3xl font-medium tracking-[-0.035em]">
              Students see the available faculty time. Instructors keep the official record.
            </h3>
          </motion.div>
        </div>
      </MotionSection>

      <MotionSection id="security" className={`border-y border-[#a51c30]/15 ${darkMode ? "bg-[linear-gradient(135deg,rgba(8,17,31,0.98),rgba(13,28,52,0.94),rgba(74,46,6,0.42))] text-white" : "bg-[linear-gradient(135deg,rgba(255,250,240,0.96),rgba(255,247,226,0.9))] text-[#241316]"}`}>
        <div className="mx-auto grid w-full max-w-[94rem] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-10 lg:py-24">
          <div>
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#a51c30] text-white">
              <LockKeyhole className="size-7" />
            </div>
            <h2 className="mt-6 text-4xl font-medium leading-tight tracking-[-0.04em]">
              Academic records need protection beyond the interface.
            </h2>
            <p className={`mt-5 leading-7 ${darkMode ? "text-white/65" : "text-[#50617b]"}`}>
              The interface guides users, but record access, role permissions, and scheduling conflict checks provide the final protection layer.
            </p>
          </div>

          <div className="grid gap-3">
            {securityItems.map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.07, duration: 0.38 }}
                className={`flex items-start gap-4 rounded-2xl border p-5 ${darkMode ? "border-white/10 bg-white/[0.06]" : "border-[#93c5fd]/45 bg-white/45"}`}
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#f5b800]" />
                <p className={`text-sm leading-6 ${darkMode ? "text-white/70" : "text-[#334155]"}`}>{item}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="faq" className="bg-[linear-gradient(180deg,rgba(37,99,235,0.04),transparent)]">
        <div className="mx-auto w-full max-w-[94rem] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b7791f]">Questions</p>
            <h2 className="mt-4 text-4xl font-medium leading-tight tracking-[-0.04em]">
              What graduate students and faculty should know before using it.
            </h2>
            <div className="mt-8 rounded-3xl border border-border bg-card p-5">
              <MessageCircleQuestion className="size-6 text-[#a51c30]" />
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Clear rules make the scheduler easier to trust for both students and instructors.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-border bg-card">
            {faqs.map(([question, answer], index) => (
              <div key={question} className="border-b border-border last:border-b-0">
                <button
                  className="flex w-full items-center justify-between gap-6 px-6 py-6 text-left text-lg font-semibold transition hover:bg-muted/45"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {question}
                  <motion.span animate={{ rotate: openFaq === index ? 180 : 0 }} className="text-2xl font-light text-[#a51c30]">
                    {openFaq === index ? "-" : "+"}
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl px-6 pb-6 text-sm leading-6 text-muted-foreground">{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
        </div>
      </MotionSection>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[94rem] px-5 py-14 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_2fr]">
            <div>
              <div className="text-base font-semibold"><BrandLogo /></div>
              <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
                Student Consultation Scheduler organizes availability, requests, approvals, and records for academic consultation workflows.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{"\u00A9"} 2026 Student Consultation Scheduler. All rights reserved.</p>
            <p>For verified @ms.bulsu.edu.ph student accounts and instructor-managed schedules.</p>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            aria-label="Back to top"
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.94 }}
            transition={{ duration: 0.22 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 inline-flex size-12 items-center justify-center rounded-full border border-[#f5b800]/35 bg-[#a51c30] text-white shadow-2xl shadow-red-950/25 transition hover:-translate-y-1 hover:bg-[#8f1728]"
          >
            <ArrowUp className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>
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
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b backdrop-blur-md ${
        darkMode
          ? "border-[#f5b800]/15 bg-[#08111f]/92 text-white"
          : "border-[#d8b24c]/30 bg-[#fffaf0]/92 text-[#241316]"
      }`}
    >
      <div className="mx-auto flex h-20 w-full max-w-[94rem] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="text-base font-semibold tracking-tight"><BrandLogo /></Link>
        <nav
          className={`hidden items-center gap-8 text-sm font-medium md:flex ${
            darkMode ? "text-white/62" : "text-[#6b5442]"
          }`}
        >
          <a href="#about" className={`transition ${darkMode ? "hover:text-[#f5b800]" : "hover:text-[#a51c30]"}`}>About</a>
          <a href="#workflow" className={`transition ${darkMode ? "hover:text-[#f5b800]" : "hover:text-[#a51c30]"}`}>Workflow</a>
          <a href="#security" className={`transition ${darkMode ? "hover:text-[#f5b800]" : "hover:text-[#a51c30]"}`}>Security</a>
          <a href="#faq" className={`transition ${darkMode ? "hover:text-[#f5b800]" : "hover:text-[#a51c30]"}`}>FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="theme-toggle landing-theme-toggle" aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleTheme}>
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
            <span>{darkMode ? "Light" : "Dark"}</span>
          </Button>
          <Link href="/auth/microsoft" className={`hidden items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 md:inline-flex ${darkMode ? "bg-[#173b7a] ring-1 ring-[#f5b800]/15 hover:bg-[#1d4ed8]" : "bg-[#a51c30] hover:bg-[#8f1728]"}`}>
            <MicrosoftMark />Sign in
          </Link>
          <Button variant="ghost" size="icon" className={darkMode ? "text-white md:hidden" : "text-[#17233d] md:hidden"} aria-label="Open menu" onClick={onOpenMenu}><Menu className="size-5" /></Button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed inset-x-4 top-4 z-50 rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl md:hidden">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={onCloseMenu}><X className="size-5" /></Button>
            </div>
            <nav className="mt-6 grid gap-4 text-lg">
              <a href="#about" onClick={onCloseMenu}>About</a>
              <a href="#workflow" onClick={onCloseMenu}>Workflow</a>
              <a href="#security" onClick={onCloseMenu}>Security</a>
              <a href="#faq" onClick={onCloseMenu}>FAQ</a>
              <Link className="inline-flex items-center gap-2" href="/auth/microsoft"><MicrosoftMark />Sign in</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MotionSection({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <motion.section id={id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.16 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.section>
  );
}

function RolePanel({ icon: Icon, eyebrow, title, copy, points, index }: { icon: typeof GraduationCap; eyebrow: string; title: string; copy: string; points: string[]; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: index * 0.08, duration: 0.42 }} whileHover={{ y: -3 }} className="rounded-[1.75rem] border border-border bg-card p-6 transition">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#a51c30]/10 text-[#a51c30]">
        <Icon className="size-6" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#a51c30]">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p>
      <div className="mt-6 space-y-3">
        {points.map((point) => <Feature key={point} text={point} />)}
      </div>
    </motion.div>
  );
}

function ProcessCard({ step, title, copy, index }: { step: string; title: string; copy: string; index: number }) {
  return (
    <motion.div
      variants={reveal}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group relative overflow-hidden rounded-3xl border border-border bg-background p-5 transition"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[#f5b800]"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ delay: 0.18 + index * 0.09, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "left" }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-[#a51c30] text-sm font-semibold text-white">
          {step}
        </span>
        <span
          aria-hidden="true"
          className="text-[#a51c30] opacity-0 transition group-hover:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
      <h3 className="relative z-10 mt-6 text-xl font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="relative z-10 mt-4 text-sm leading-6 text-muted-foreground">{copy}</p>
    </motion.div>
  );
}

function InfoRow({ icon, title, copy, index }: { icon: ReactNode; title: string; copy: string; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: index * 0.08, duration: 0.38 }} whileHover={{ x: 3 }} className="flex gap-4 rounded-3xl border border-border bg-background/60 p-5">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#a51c30]/10 text-[#a51c30]">{icon}</div>
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
      </div>
    </motion.div>
  );
}

function PreviewRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`flex justify-between gap-5 rounded-2xl border border-border bg-card/80 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function FooterGroup({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a51c30]">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
        {links.map((link) => <span key={link}>{link}</span>)}
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <p className="flex gap-3 text-sm leading-6 text-muted-foreground">
      <Check className="mt-0.5 size-4 shrink-0 text-[#a51c30]" />
      {text}
    </p>
  );
}
