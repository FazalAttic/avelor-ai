"use client";

import { VolumeHighIcon, VolumeOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { sound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sound.isMuted());
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    if (!next) {
      sound.pop();
    }
  }

  return (
    <IconButton
      label={muted ? "Enable sound effects" : "Mute sound effects"}
      onClick={toggle}
      className={cn(
        "size-10 border border-white/50 bg-white/40 shadow-card backdrop-blur-xl hover:bg-white/60",
        "dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15",
        className
      )}
    >
      <HugeiconsIcon icon={muted ? VolumeOffIcon : VolumeHighIcon} size={20} strokeWidth={1.8} />
    </IconButton>
  );
}
