"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  iconSize = 20,
}: {
  className?: string;
  iconSize?: number;
}) {
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    sound.click();
    const next = !night;
    setNight(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("avelor-theme", next ? "night" : "day");
    } catch {
      // storage unavailable — theme just won't persist
    }
  }

  return (
    <IconButton
      label={night ? "Switch to day" : "Switch to night"}
      onClick={toggle}
      className={cn(
        "size-10 border border-white/50 bg-white/40 shadow-card backdrop-blur-xl hover:bg-white/60",
        "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15",
        className
      )}
    >
      <HugeiconsIcon
        icon={Sun03Icon}
        size={iconSize}
        strokeWidth={1.8}
        className="hidden dark:block"
      />
      <HugeiconsIcon icon={Moon02Icon} size={iconSize} strokeWidth={1.8} className="dark:hidden" />
    </IconButton>
  );
}
