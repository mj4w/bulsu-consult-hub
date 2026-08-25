"use client";

import { useEffect, useState } from "react";

import { DashboardGuidedTour } from "@/components/dashboard/DashboardGuidedTour";
import { Toast } from "@/components/ui/Toast";
import {
  isWalkthroughCompleted,
  markWalkthroughCompleted,
} from "@/lib/walkthroughs";

export function ProfileWalkthrough({
  role,
}: {
  role: "student" | "instructor";
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const scope = `${role}_onboarding`;

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void isWalkthroughCompleted(scope).then((completed) => {
        if (cancelled || completed) return;
        setStep(0);
        setOpen(true);
      });
    }, 650);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scope]);

  return (
    <>
      <DashboardGuidedTour
        role={role}
        context="onboarding"
        open={open}
        step={step}
        onStepChange={setStep}
        onClose={() => setOpen(false)}
        onFinished={() => {
          void markWalkthroughCompleted(scope);
          setToast({
            message: "Walkthrough completed.",
            tone: "success",
          });
        }}
      />
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
