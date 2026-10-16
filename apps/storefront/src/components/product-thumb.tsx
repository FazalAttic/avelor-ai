import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProductThumbProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ProductThumb({ src, alt, className }: ProductThumbProps) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-2xl bg-brand-wash", className)}>
      <Image src={src} alt={alt} fill sizes="96px" className="object-cover" />
    </div>
  );
}
