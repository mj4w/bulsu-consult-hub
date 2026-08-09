"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Set or find a time",
    copy: "Students browse instructor availability while instructors publish dates, formats, and program scope that fit the work.",
    color: "#4f46e5",
    label: "Availability",
    date: "Aug 12",
    time: "5:00–6:00 PM",
    format: "Online",
  },
  {
    number: "02",
    title: "Make the ask",
    copy: "Students share the concern and context. Instructors see a focused request before approving the conversation.",
    color: "#0f9f7a",
    label: "Request",
    date: "Aug 14",
    time: "10:00–11:00 AM",
    format: "Face-to-face",
  },
  {
    number: "03",
    title: "Keep moving",
    copy: "Receive approval, updates, and reminders in one clear thread before the conversation begins.",
    color: "#f97360",
    label: "Confirmed",
    date: "Aug 18",
    time: "2:30–3:30 PM",
    format: "Both available",
  },
];


const availabilityExamples = [
  { date: "Aug 12", time: "5:00–6:00 PM", format: "Online" },
  { date: "Aug 15", time: "9:30–10:30 AM", format: "Face-to-face" },
  { date: "Aug 20", time: "1:00–2:00 PM", format: "Both available" },
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

  useEffect(() => {
    const rotateAvailability = window.setInterval(() => {
      setAvailabilityIndex((currentIndex) => (currentIndex + 1) % availabilityExamples.length);
    }, 3500);

    return () => window.clearInterval(rotateAvailability);
  }, []);

  return (
    <section ref={sectionRef} id="approach" className="relative min-h-[240vh] border-t border-border">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium text-muted-foreground">How it works</p>
            <div className="mt-10 space-y-3">
              {steps.map((item, index) => (
                <div
                  key={item.number}
                  className={`flex items-center gap-4 text-sm transition-all duration-500 ${
                    index === activeStep ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  <span
                    className={`h-px transition-all duration-500 ${
                      index === activeStep ? "w-10 bg-foreground" : "w-5 bg-border"
                    }`}
                  />
                  {item.number}
                  <span className="hidden sm:inline">{item.title}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 min-h-64">
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
              >
                <p className="text-sm font-medium" style={{ color: step.color }}>
                  {step.label}
                </p>
                <h2 className="mt-5 max-w-xl text-4xl font-medium leading-tight tracking-[-0.05em] sm:text-6xl">
                  {step.title}
                </h2>
                <p className="mt-6 max-w-md leading-7 text-muted-foreground">{step.copy}</p>
              </motion.div>
            </div>
          </div>

          <motion.div
            layout
            className="story-stage relative flex min-h-[28rem] items-center justify-center overflow-hidden rounded-2xl border border-border shadow-sm sm:min-h-[35rem]"
          >
            <div className="story-ring story-ring-large" style={{ borderColor: step.color }} />
            <div className="story-ring story-ring-small" style={{ borderColor: step.color }} />
            <motion.div
              className="relative z-10 rounded-2xl border border-white/80 bg-white/85 p-6 text-[#17233d] shadow-xl backdrop-blur"
              key={step.number}
              initial={{ opacity: 0, scale: 0.88, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
              <p className="text-xs font-medium text-slate-500">Sample schedule</p>
              <p className="mt-5 text-3xl font-medium tracking-tight">{step.label}</p>
              <div className="mt-8 space-y-3 text-sm">
                <ScheduleDetail label="Date" value={schedule.date} />
                <ScheduleDetail label="Time" value={schedule.time} />
                <ScheduleDetail label="Format" value={schedule.format} />
                <ScheduleDetail
                  label="Status"
                  value={activeStep === 2 ? "Approved" : "Open"}
                  valueColor={step.color}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ScheduleDetail({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between gap-10">
      <span className="text-slate-500">{label}</span>
      <span style={valueColor ? { color: valueColor } : undefined}>{value}</span>
    </div>
  );
}
