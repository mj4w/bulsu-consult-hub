"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("scheduler-theme");
    } catch {
      savedTheme = null;
    }
    const isDark = savedTheme === "dark";
    document.documentElement.dataset.theme = isDark ? "dark" : "light";

    const syncState = window.setTimeout(() => setDarkMode(isDark), 0);
    return () => window.clearTimeout(syncState);
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

  return <button className="theme-toggle inline-flex items-center" onClick={toggleTheme} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}<span>{darkMode ? "Light" : "Dark"}</span></button>;
}
