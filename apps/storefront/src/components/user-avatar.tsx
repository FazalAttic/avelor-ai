"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  image?: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function UserAvatar({ name, image, size = "sm", className }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const initial = (name?.trim().charAt(0) || "U").toUpperCase();
  const sizeClasses = size === "sm" ? "size-8 text-xs" : "size-9 text-sm";

  if (image && !hasError) {
    return (
      // biome-ignore lint/performance/noImgElement: external OAuth avatars require no-referrer
      <img
        src={image}
        alt={name || "User avatar"}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-white/20",
          sizeClasses,
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background select-none",
        sizeClasses,
        className
      )}
    >
      {initial}
    </span>
  );
}
