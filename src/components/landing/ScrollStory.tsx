"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import {
  BellRing,
  CalendarCheck,
  ClipboardCheck,
  MapPin,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Open the right time window",
    shortTitle: "Availability",
    copy: "Instructors publish consultation windows with a format and program scope. Students only see schedules that apply to them.",
    color: "#3b82f6",
    icon: CalendarCheck,
    status: "Open",
    date: "Aug 15",
    time: "9:30-10:30 AM",
    format: "F2F",
    detail: "Doctor of Philosophy",
  },
  {
    number: "02",
    title: "Send a focused request",
    shortTitle: "Request",
    copy: "Students choose a preferred time inside the instructor window and explain the consultation concern before submitting.",
    color: "#8b5cf6",
    icon: ClipboardCheck,
    status: "Pending review",
    date: "Aug 15",
    time: "10:00-10:30 AM",
    format: "Online",
    detail: "Research consultation",
  },
  {
    number: "03",
    title: "Confirm and keep both sides updated",
    shortTitle: "Confirmed",
    copy: "Once approved, the slot appears on both dashboards and the occupied time is removed from student availability.",
    color: "#10b981",
    icon: BellRing,
    status: "Approved",
    date: "Aug 15",
    time: "10:00-10:30 AM",
    format: "Both",
    detail: "Confirmed meeting",
  },
];

const availabilityExamples = [
  { date: "Aug 12", time: "5:00-6:00 PM", format: "Online", detail: "Project consultation" },
  { date: "Aug 15", time: "9:30-10:30 AM", format: "F2F", detail: "Research review" },
  { date: "Aug 20", time: "1:00-2:00 PM", format: "Both", detail: "Grades consultation" },
];

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [availabilityIndex, setAvailabilityIndex] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActiveStep(Math.min(steps.length - 1, Math.floor(value * steps.length)));
  });

  const step = steps[activeStep];
  const schedule = activeStep === 0 ? availabilityExamples[availabilityIndex] : step;
  const StepIcon = step.icon;

  useEffect(() => {
    const rotateAvailability = window.setInterval(() => {
      setAvailabilityIndex((currentIndex) => (currentIndex + 1) % availabilityExamples.length);
    }, 3500);

    return () => window.clearInterval(rotateAvailability);
  }, []);

  return (
    <section ref={sectionRef} id="approach" className="relative min-h-[240vh] border-t border-border">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">How it works</p>
            <h2 className="mt-5 max-w-md text-3xl font-medium leading-tight tracking-[-0.04em] sm:text-5xl">
              A consultation flow both sides can understand.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              The system separates availability, student requests, and approved consultations so users know exactly what needs action.
            </p>

            <div className="mt-8 space-y-3">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeStep;

                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className={`group w-full rounded-2xl border p-4 text-left transition duration-300 ${
                      isActive
                        ? "border-primary/40 bg-card shadow-sm"
                        : "border-transparent bg-transparent hover:border-border hover:bg-card/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl border"
                        style={{
                          borderColor: isActive ? item.color : "var(--border)",
                          backgroundColor: isActive ? `${item.color}1a` : "transparent",
                          color: isActive ? item.color : "var(--muted-foreground)",
                        }}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Step {item.number}
                        </p>
                        <p className={`mt-1 text-sm font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.div
            layout
            className="story-stage relative overflow-hidden rounded-[2rem] border border-border p-4 shadow-sm sm:p-6"
          >
            <div className="pointer-events-none absolute inset-0 opacity-70">
              <div className="story-ring story-ring-large" style={{ borderColor: step.color }} />
              <div className="story-ring story-ring-small" style={{ borderColor: step.color }} />
            </div>

            <div className="relative z-10 grid min-h-[34rem] content-between gap-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 p-5 backdrop-blur">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{step.shortTitle}</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">{step.title}</h3>
                </div>
                <div
                  className="flex size-14 items-center justify-center rounded-2xl border"
                  style={{
                    borderColor: `${step.color}55`,
                    backgroundColor: `${step.color}1a`,
                    color: step.color,
                  }}
                >
                  <StepIcon className="size-7" />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <CalendarPreview color={step.color} status={step.status} />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${step.number}-${schedule.time}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ duration: 0.28 }}
                    className="rounded-3xl border border-border bg-card/90 p-5 shadow-lg backdrop-blur"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Schedule preview</p>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${step.color}1f`, color: step.color }}
                      >
                        {step.status}
                      </span>
                    </div>
                    <p className="mt-5 text-2xl font-semibold tracking-tight">{step.shortTitle}</p>
                    <div className="mt-6 space-y-4 text-sm">
                      <ScheduleDetail label="Date" value={schedule.date} />
                      <ScheduleDetail label="Time" value={schedule.time} />
                      <ScheduleDetail label="Format" value={schedule.format} />
                      <ScheduleDetail label="Purpose" value={schedule.detail} />
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-background/50 p-4">
                      <p className="text-sm leading-6 text-muted-foreground">{step.copy}</p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MiniBenefit icon={<ShieldCheck className="size-4" />} text="No double-booked approved slots" />
                <MiniBenefit icon={<Monitor className="size-4" />} text="Online, F2F, or Both formats" />
                <MiniBenefit icon={<MapPin className="size-4" />} text="Program-scoped availability" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function CalendarPreview({ color, status }: { color: string; status: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background/50 p-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
        {["Mon", "Tue", "Wed"].map((day, index) => (
          <div key={day} className="rounded-2xl border border-border bg-card/70 p-3">
            <p>{day}</p>
            <p className="mt-1 text-base font-semibold text-foreground">{15 + index}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[3rem_1fr] overflow-hidden rounded-2xl border border-border">
        <div className="border-r border-border bg-card/50">
          {["9 AM", "10 AM", "11 AM", "12 PM"].map((time) => (
            <div key={time} className="flex h-16 items-start justify-end border-b border-border pr-2 pt-2 text-xs text-muted-foreground last:border-b-0">
              {time}
            </div>
          ))}
        </div>
        <div className="relative bg-card/30">
          {["", "", "", ""].map((_, index) => (
            <div key={index} className="h-16 border-b border-border last:border-b-0" />
          ))}
          <motion.div
            layout
            className="absolute left-3 right-3 top-6 rounded-2xl p-4 text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">{status}</p>
            <p className="mt-2 text-sm font-semibold">9:30 AM - 10:30 AM</p>
            <p className="mt-1 text-xs text-white/80">Consultation window</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ScheduleDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[10rem] text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function MiniBenefit({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-muted-foreground backdrop-blur">
      <span className="text-primary">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
