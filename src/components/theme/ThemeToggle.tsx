"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("scheduler-theme");
    } catch {
      savedTheme = null;
    }
    const isDark = savedTheme ? savedTheme === "dark" : false;
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    const timer = window.setTimeout(() => {
      setDarkMode(isDark);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const nextIsDark = !darkMode;
    setDarkMode(nextIsDark);
    document.documentElement.dataset.theme = nextIsDark ? "dark" : "light";
    try {
      window.localStorage.setItem("scheduler-theme", nextIsDark ? "dark" : "light");
    } catch {
      // Ignore storage failures. The visual theme still changes for this page.
    }
  }

  const isDark = mounted ? darkMode : false;

  return (
    <button
      className="theme-toggle app-theme-toggle inline-flex items-center"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      suppressHydrationWarning
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      <span suppressHydrationWarning>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
