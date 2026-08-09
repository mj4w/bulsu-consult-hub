"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Toast({ message, tone, onClose }: { message: string; tone: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2000);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className={`toast-enter fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`} role="status">
      <p className="flex-1 leading-5">{message}</p>
      <button type="button" onClick={onClose} className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100" aria-label="Dismiss notification">
        <X className="size-4" />
      </button>
    </div>
  );
}
