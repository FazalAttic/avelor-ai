import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  caption,
  className,
  wordmarkClassName,
}: {
  caption?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Image
        src="/avelor-logo.png"
        alt=""
        width={1366}
        height={1151}
        className="h-8 w-auto shrink-0"
        priority
      />
      <div className={cn("min-w-0", wordmarkClassName)}>
        <p className="truncate text-[15px] leading-tight font-semibold tracking-tight text-admin-ink">
          Avelor
        </p>
        {caption ? (
          <p className="truncate text-[11px] leading-tight font-semibold tracking-[0.1em] text-muted uppercase">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
