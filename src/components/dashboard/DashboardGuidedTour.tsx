"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

type DashboardTourRole = "student" | "instructor";
type DashboardTourContext =
  | "dashboard"
  | "calendar"
  | "history"
  | "requests"
  | "profile"
  | "onboarding";

type TourStep = {
  target: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof LayoutDashboard;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const sharedStudentSteps: TourStep[] = [
  {
    target: "student-sidebar",
    eyebrow: "Navigation",
    title: "Use the sidebar to move between sections.",
    description:
      "Dashboard, calendar, history, and profile are separated so each page has one clear purpose.",
    icon: LayoutDashboard,
  },
  {
    target: "student-topbar",
    eyebrow: "Search and actions",
    title: "Search from the top bar.",
    description:
      "Find consultations by instructor, date, status, or purpose without leaving the dashboard.",
    icon: Search,
  },
  {
    target: "student-hero",
    eyebrow: "Current page",
    title: "This header explains where you are.",
    description:
      "The title, short description, and action button change depending on the selected dashboard section.",
    icon: UserRound,
  },
  {
    target: "student-content",
    eyebrow: "Workspace",
    title: "Work inside the main content area.",
    description:
      "This area shows your consultation statistics, upcoming schedule, calendar, history, or profile form.",
    icon: CalendarRange,
  },
];

const sharedInstructorSteps: TourStep[] = [
  {
    target: "instructor-sidebar",
    eyebrow: "Navigation",
    title: "Use the sidebar to manage instructor work.",
    description:
      "Dashboard, calendar, requests, and profile are separated so approvals and scheduling stay organized.",
    icon: LayoutDashboard,
  },
  {
    target: "instructor-topbar",
    eyebrow: "Search and alerts",
    title: "Search and monitor updates here.",
    description:
      "Quickly find student requests, consultation windows, dates, and concerns from the top bar.",
    icon: Search,
  },
  {
    target: "instructor-hero",
    eyebrow: "Current page",
    title: "This page header gives context.",
    description:
      "The heading and primary button adjust based on whether you are reviewing requests or managing availability.",
    icon: UserRound,
  },
  {
    target: "instructor-content",
    eyebrow: "Workspace",
    title: "Handle the main instructor task here.",
    description:
      "This content area shows dashboard stats, the calendar, profile details, or the request review workspace.",
    icon: ClipboardList,
  },
];

const studentStepsByContext: Record<
  Exclude<DashboardTourContext, "onboarding">,
  TourStep[]
> = {
  dashboard: sharedStudentSteps,
  calendar: [
    {
      target: "student-calendar-overview",
      eyebrow: "Calendar overview",
      title: "This is where you find available consultation time.",
      description:
        "Available instructor windows appear here based on your graduate program and the instructor's schedule.",
      icon: CalendarRange,
    },
    {
      target: "student-calendar-controls",
      eyebrow: "Calendar controls",
      title: "Move through the weekly calendar.",
      description:
        "Use Today, the arrows, and Full view to inspect the week and see more schedule details.",
      icon: Search,
    },
    {
      target: "student-calendar-grid",
      eyebrow: "Available slots",
      title: "Click an available slot to request a consultation.",
      description:
        "You can choose a preferred time inside the instructor's available window and submit your purpose.",
      icon: CalendarRange,
    },
  ],
  history: [
    {
      target: "student-history-overview",
      eyebrow: "Consultation history",
      title: "This page keeps your request records.",
      description:
        "Pending, approved, declined, cancelled, and past consultations stay organized here.",
      icon: ClipboardList,
    },
    {
      target: "student-history-search",
      eyebrow: "Search history",
      title: "Find previous requests faster.",
      description:
        "Search by date, instructor name, purpose, status, or message.",
      icon: Search,
    },
    {
      target: "student-history-list",
      eyebrow: "Timeline",
      title: "Review each consultation record.",
      description:
        "Each item shows the instructor, consultation status, purpose, schedule, and related notes.",
      icon: ClipboardList,
    },
  ],
  profile: [
    {
      target: "student-profile-info",
      eyebrow: "Profile purpose",
      title: "Your student profile controls schedule visibility.",
      description:
        "Your graduate program and section help the system show the correct instructor windows.",
      icon: UserRound,
    },
    {
      target: "profile-form",
      eyebrow: "Profile form",
      title: "Keep your academic details updated.",
      description:
        "Your email and name are protected fields. Program, section, and phone number can be maintained here.",
      icon: UserRound,
    },
  ],
  requests: sharedStudentSteps,
};

const instructorStepsByContext: Record<
  Exclude<DashboardTourContext, "history" | "onboarding">,
  TourStep[]
> = {
  dashboard: sharedInstructorSteps,
  calendar: [
    {
      target: "instructor-calendar-overview",
      eyebrow: "Calendar overview",
      title: "This is your availability workspace.",
      description:
        "Use this page to publish consultation windows students can request from.",
      icon: CalendarRange,
    },
    {
      target: "instructor-add-window",
      eyebrow: "Create window",
      title: "Add a consultation window manually.",
      description:
        "Use this button if you want to create a schedule without dragging on the calendar.",
      icon: CalendarRange,
    },
    {
      target: "instructor-calendar-controls",
      eyebrow: "Calendar controls",
      title: "Move between dates and views.",
      description:
        "Use Today, Week, Month, and the arrows to review the correct schedule range.",
      icon: Search,
    },
    {
      target: "instructor-calendar-grid",
      eyebrow: "Schedule grid",
      title: "Drag inside one day to select time.",
      description:
        "Click and drag vertically inside a day column to choose the available time range.",
      icon: CalendarRange,
    },
  ],
  requests: [
    {
      target: "instructor-requests-overview",
      eyebrow: "Request review",
      title: "This page separates pending and reviewed requests.",
      description:
        "Start with pending requests, then use reviewed requests for already processed consultations.",
      icon: ClipboardList,
    },
    {
      target: "instructor-requests-metrics",
      eyebrow: "Request status",
      title: "Use these counters to scan workload quickly.",
      description:
        "Pending, approved, and declined counts help you understand what still needs action.",
      icon: LayoutDashboard,
    },
    {
      target: "instructor-requests-search",
      eyebrow: "Search",
      title: "Find a request without scrolling.",
      description: "Search by student, program, date, purpose, status, or message.",
      icon: Search,
    },
    {
      target: "instructor-pending-requests",
      eyebrow: "Pending review",
      title: "Approve or decline carefully here.",
      description:
        "Actions are queued briefly so you can undo accidental clicks before a response is sent.",
      icon: ClipboardList,
    },
  ],
  profile: [
    {
      target: "instructor-profile-info",
      eyebrow: "Profile purpose",
      title: "Your profile affects what students see.",
      description:
        "Your instructor name appears in student calendars, request modals, and consultation records.",
      icon: UserRound,
    },
    {
      target: "instructor-profile-details",
      eyebrow: "Account details",
      title: "Check your displayed instructor identity.",
      description:
        "If the name is wrong, update it so students can identify the correct professor or instructor.",
      icon: UserRound,
    },
  ],
};

const onboardingSteps: TourStep[] = [
  {
    target: "onboarding-header",
    eyebrow: "Profile setup",
    title: "Complete the profile before using the scheduler.",
    description:
      "These details connect users to the correct dashboard and consultation records.",
    icon: UserRound,
  },
  {
    target: "onboarding-info",
    eyebrow: "Data purpose",
    title: "Only useful academic details are collected.",
    description:
      "Students provide program and section. Instructors provide department, specialization, and office information.",
    icon: ClipboardList,
  },
  {
    target: "profile-form",
    eyebrow: "Profile form",
    title: "Save accurate information before continuing.",
    description:
      "Read-only fields come from the signed-in account. Editable fields can be updated and saved anytime.",
    icon: CalendarRange,
  },
];

const confettiPieces = [
  { left: "8%", color: "#a51c30", delay: 0, rotate: -18, drift: 32 },
  { left: "14%", color: "#f4b400", delay: 0.08, rotate: 22, drift: -20 },
  { left: "21%", color: "#2f6fed", delay: 0.04, rotate: -34, drift: 24 },
  { left: "28%", color: "#16a34a", delay: 0.12, rotate: 16, drift: -28 },
  { left: "36%", color: "#a51c30", delay: 0.02, rotate: 35, drift: 18 },
  { left: "44%", color: "#f4b400", delay: 0.1, rotate: -26, drift: -34 },
  { left: "52%", color: "#2f6fed", delay: 0.06, rotate: 28, drift: 30 },
  { left: "60%", color: "#16a34a", delay: 0.14, rotate: -14, drift: -18 },
  { left: "68%", color: "#a51c30", delay: 0.03, rotate: 40, drift: 22 },
  { left: "76%", color: "#f4b400", delay: 0.11, rotate: -32, drift: -24 },
  { left: "84%", color: "#2f6fed", delay: 0.07, rotate: 24, drift: 34 },
  { left: "92%", color: "#16a34a", delay: 0.15, rotate: -12, drift: -30 },
];

const confettiBursts = [
  { x: -180, y: -120, color: "#f4b400", rotate: -32 },
  { x: -128, y: -170, color: "#a51c30", rotate: 24 },
  { x: -70, y: -205, color: "#2f6fed", rotate: -18 },
  { x: 8, y: -220, color: "#16a34a", rotate: 36 },
  { x: 86, y: -190, color: "#f4b400", rotate: -42 },
  { x: 145, y: -145, color: "#a51c30", rotate: 20 },
  { x: 190, y: -84, color: "#2f6fed", rotate: -25 },
  { x: 156, y: 16, color: "#16a34a", rotate: 38 },
  { x: 82, y: 76, color: "#f4b400", rotate: -14 },
  { x: 0, y: 96, color: "#a51c30", rotate: 18 },
  { x: -88, y: 64, color: "#2f6fed", rotate: -36 },
  { x: -155, y: 4, color: "#16a34a", rotate: 28 },
];

export function DashboardGuidedTour({
  role,
  context = "dashboard",
  open,
  step,
  onStepChange,
  onClose,
  onFinished,
}: {
  role: DashboardTourRole;
  context?: DashboardTourContext;
  open: boolean;
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  onFinished?: () => void;
}) {
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const steps: TourStep[] =
    context === "onboarding"
      ? onboardingSteps
      : role === "instructor"
        ? instructorStepsByContext[
            context === "history" ? "dashboard" : context
          ] ?? sharedInstructorSteps
        : studentStepsByContext[context] ?? sharedStudentSteps;
  const safeStep = Math.min(Math.max(step, 0), steps.length - 1);
  const currentStep = steps[safeStep];
  const Icon = currentStep.icon;
  const isLastStep = safeStep === steps.length - 1;

  useEffect(() => {
    if (!open) return;

    function updateSpotlight() {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-tour~="${currentStep.target}"]`,
        ),
      ).find((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (!target) {
        setSpotlight(null);
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      window.setTimeout(() => {
        const rect = target.getBoundingClientRect();
        const padding = 10;
        setSpotlight({
          top: Math.max(rect.top - padding, 8),
          left: Math.max(rect.left - padding, 8),
          width: Math.min(rect.width + padding * 2, window.innerWidth - 16),
          height: Math.min(rect.height + padding * 2, window.innerHeight - 16),
        });
      }, 220);
    }

    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [currentStep.target, open]);

  function handleNext() {
    if (!isLastStep) {
      onStepChange(safeStep + 1);
      return;
    }

    setCelebrating(true);
    window.setTimeout(() => {
      setCelebrating(false);
      onClose();
      onFinished?.();
    }, 1200);
  }

  const cardPosition = getCardPosition(spotlight);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[250] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {celebrating ? <Confetti /> : null}

          {spotlight ? (
            <motion.div
              className="pointer-events-none fixed rounded-[1.5rem] border-2 border-[#f4b400] bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.68),0_0_35px_rgba(244,180,0,0.35)]"
              animate={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          ) : null}

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-tour-title"
            className="fixed w-[min(92vw,24rem)] rounded-[1.5rem] border border-white/15 bg-slate-950/92 p-5 text-white shadow-2xl backdrop-blur-xl"
            style={cardPosition}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#a51c30]">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#f4b400]">
                    {currentStep.eyebrow}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Step {safeStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/55">
                Required
              </span>
            </div>

            <h2
              id="dashboard-tour-title"
              className="mt-5 text-xl font-semibold tracking-[-0.03em]"
            >
              {currentStep.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/72">
              {currentStep.description}
            </p>

            <div className="mt-5 flex gap-2">
              {steps.map((item, index) => (
                <button
                  type="button"
                  key={item.target}
                  onClick={() => onStepChange(index)}
                  className={`h-1.5 flex-1 rounded-full transition ${
                    index <= safeStep ? "bg-[#f4b400]" : "bg-white/[0.18]"
                  }`}
                  aria-label={`Go to ${item.eyebrow} step`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-white/50">Finish the walkthrough to continue.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onStepChange(Math.max(safeStep - 1, 0))}
                  disabled={safeStep === 0}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-full bg-[#a51c30] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#a51c30]/20 transition hover:bg-[#861525]"
                >
                  {isLastStep ? "Finish" : "Next"}
                  {isLastStep ? <CheckCircle2 className="size-4" /> : null}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[260] overflow-hidden">
      <motion.div
        className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/10 shadow-[0_0_70px_rgba(244,180,0,0.35)] backdrop-blur"
        initial={{ opacity: 0, scale: 0.35 }}
        animate={{ opacity: [0, 1, 0], scale: [0.35, 1.1, 1.45] }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      />
      {confettiBursts.map((piece, index) => (
        <motion.span
          key={`${piece.x}-${piece.y}-${piece.color}-${index}`}
          className="absolute left-1/2 top-1/2 h-3 w-2 rounded-[0.2rem]"
          style={{ backgroundColor: piece.color }}
          initial={{
            x: "-50%",
            y: "-50%",
            opacity: 0,
            scale: 0.5,
            rotate: 0,
          }}
          animate={{
            x: `calc(-50% + ${piece.x}px)`,
            y: `calc(-50% + ${piece.y}px)`,
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.8],
            rotate: piece.rotate + 260,
          }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      ))}
      {confettiPieces.map((piece) => (
        <motion.span
          key={`${piece.left}-${piece.color}`}
          className="absolute top-[-1rem] h-3 w-1.5 rounded-[0.2rem]"
          style={{ left: piece.left, backgroundColor: piece.color }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: piece.rotate }}
          animate={{
            x: piece.drift,
            y: ["0vh", "42vh", "86vh"],
            opacity: [0, 1, 0],
            rotate: piece.rotate + 240,
          }}
          transition={{
            duration: 0.9,
            delay: piece.delay,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-[calc(50%+5rem)] -translate-x-1/2 rounded-full border border-white/15 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-white shadow-2xl"
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6], scale: 1 }}
        transition={{ duration: 1.05, ease: "easeOut" }}
      >
        Walkthrough completed
      </motion.div>
    </div>
  );
}

function getCardPosition(spotlight: SpotlightRect | null) {
  if (!spotlight) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const cardWidth = Math.min(window.innerWidth * 0.92, 384);
  const gap = 18;
  const hasRightSpace = spotlight.left + spotlight.width + cardWidth + gap < window.innerWidth;
  const hasLeftSpace = spotlight.left - cardWidth - gap > 0;
  const top = Math.min(
    Math.max(spotlight.top, 18),
    Math.max(window.innerHeight - 340, 18),
  );

  if (hasRightSpace) {
    return {
      left: spotlight.left + spotlight.width + gap,
      top,
      transform: "none",
    };
  }

  if (hasLeftSpace) {
    return {
      left: spotlight.left - cardWidth - gap,
      top,
      transform: "none",
    };
  }

  return {
    left: "50%",
    bottom: 18,
    transform: "translateX(-50%)",
  };
}
