"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("avelor-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("avelor-theme", nextTheme);
  };

  if (!mounted) {
    return (
      <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800/80" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:scale-105 hover:border-indigo-500/40 hover:text-indigo-600 active:scale-95 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 dark:shadow-md dark:hover:border-indigo-400/50 dark:hover:text-amber-300"
    >
      {theme === "dark" ? (
        <Sun
          size={18}
          className="text-amber-400 transition-transform duration-300 group-hover:rotate-45"
        />
      ) : (
        <Moon
          size={18}
          className="text-indigo-600 transition-transform duration-300 group-hover:-rotate-12"
        />
      )}
    </button>
  );
}
