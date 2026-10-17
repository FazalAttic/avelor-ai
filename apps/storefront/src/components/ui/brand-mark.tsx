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
        width={48}
        height={48}
        className="size-7 shrink-0"
        priority
      />
      <div className={cn("min-w-0", wordmarkClassName)}>
        <p className="truncate text-[13px] leading-tight font-bold tracking-tight text-foreground">
          Avelor
        </p>
        {caption ? (
          <p className="truncate text-[10px] leading-tight font-semibold tracking-[0.12em] text-subtle uppercase">
            {caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}
