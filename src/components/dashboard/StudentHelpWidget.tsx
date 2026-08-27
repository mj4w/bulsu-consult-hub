"use client";

import { BookOpenCheck, CalendarClock, ChevronRight, MessageCircle, X } from "lucide-react";
import { useMemo, useState } from "react";

type HelpItem = {
  question: string;
  answer: string;
};

const helpItems: HelpItem[] = [
  {
    question: "How do I request a consultation?",
    answer:
      "Open the calendar, choose an available instructor window, select your preferred time inside that window, then submit your purpose and concern details.",
  },
  {
    question: "Why can’t I cancel my consultation?",
    answer:
      "Approved consultations can only be cancelled before the 24-hour cutoff. If the meeting is already near or already past, it becomes view-only.",
  },
  {
    question: "Where can I see approved schedules?",
    answer:
      "Approved consultations appear on your dashboard summary, inside the calendar, and in your consultation history.",
  },
  {
    question: "How do I add it to my calendar?",
    answer:
      "Open an approved consultation and click Download invite. The downloaded .ics file can be opened with Outlook, Google Calendar, Apple Calendar, or other calendar apps.",
  },
  {
    question: "Why do I only see some instructors?",
    answer:
      "The calendar only shows consultation windows that match your graduate program and available time.",
  },
];

export function StudentHelpWidget() {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = helpItems[selectedIndex];

  const shortQuestions = useMemo(() => helpItems.slice(0, 4), []);

  return (
    <div className="fixed bottom-5 right-5 z-[90] flex flex-col items-end print:hidden">
      {open && (
        <section className="mb-3 w-[min(calc(100vw-2.5rem),23rem)] overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563eb] text-white">
                <BookOpenCheck className="size-5" />
              </div>
              <div>
                <p className="student-help-kicker text-xs font-bold uppercase tracking-[0.18em]">
                  Student guide
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  Need help scheduling?
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-full bg-slate-950 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950"
              aria-label="Close student guide"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-0 sm:grid-cols-[0.95fr_1.05fr]">
            <div className="border-b border-border sm:border-b-0 sm:border-r">
              {shortQuestions.map((item, index) => (
                <button
                  type="button"
                  key={item.question}
                  onClick={() => setSelectedIndex(index)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                    selectedIndex === index
                      ? "bg-[#2563eb] text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="leading-5">{item.question}</span>
                  <ChevronRight className="size-4 shrink-0" />
                </button>
              ))}
            </div>

            <div className="p-4">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Quick answer
              </div>
              <p className="text-sm font-semibold text-foreground">
                {selected.question}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selected.answer}
              </p>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition hover:bg-muted"
        aria-expanded={open}
        aria-label="Open student help"
        title="Student help"
      >
        <MessageCircle className="size-6 text-[#2563eb]" />
      </button>
    </div>
  );
}
