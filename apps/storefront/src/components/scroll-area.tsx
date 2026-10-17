"use client";

import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

export type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
  /**
   * Soften the top/bottom edges where content continues. Don't use this over a
   * backdrop-blurred surface: the mask makes the viewport a backdrop root.
   */
  edgeFade?: boolean;
};

const IDLE_MS = 1000;
const MIN_THUMB = 28;
const EDGE_FADE = 28;

export function ScrollArea({ children, className, viewportRef, edgeFade }: ScrollAreaProps) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const thumb = useRef<HTMLDivElement | null>(null);
  const idleTimer = useRef<number | null>(null);
  const drag = useRef<{ pointerY: number; scrollTop: number; scale: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = viewport.current;
    const bar = thumb.current;
    if (!el || !bar) return;
    const max = el.scrollHeight - el.clientHeight;
    setOverflowing(max > 2);
    const top = el.scrollTop > 2;
    const bottom = max - el.scrollTop > 2;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    const track = el.clientHeight;
    const height = max > 0 ? Math.max(MIN_THUMB, (track * track) / el.scrollHeight) : track;
    const offset = max > 0 ? (el.scrollTop / max) * (track - height) : 0;
    bar.style.height = `${height}px`;
    bar.style.transform = `translate3d(0, ${offset}px, 0)`;
  }, []);

  const ping = useCallback(() => {
    setActive(true);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (!drag.current) setActive(false);
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    function onScroll() {
      measure();
      ping();
    }
    const observer = new ResizeObserver(() => measure());
    el.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    measure();
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, [measure, ping]);

  function setViewport(node: HTMLDivElement | null) {
    viewport.current = node;
    if (viewportRef) viewportRef.current = node;
  }

  function onThumbDown(event: ReactPointerEvent<HTMLDivElement>) {
    const el = viewport.current;
    const bar = thumb.current;
    if (!el || !bar) return;
    const max = el.scrollHeight - el.clientHeight;
    const travel = Math.max(1, el.clientHeight - bar.offsetHeight);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerY: event.clientY, scrollTop: el.scrollTop, scale: max / travel };
    setActive(true);
    event.preventDefault();
  }

  function onThumbMove(event: ReactPointerEvent<HTMLDivElement>) {
    const origin = drag.current;
    const el = viewport.current;
    if (!origin || !el) return;
    el.scrollTop = origin.scrollTop + (event.clientY - origin.pointerY) * origin.scale;
  }

  function onThumbUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    ping();
  }

  const shown = overflowing && (active || hovered);
  const stops = [
    edges.top ? "transparent 0" : "black 0",
    edges.top ? `black ${EDGE_FADE}px` : null,
    edges.bottom ? `black calc(100% - ${EDGE_FADE}px)` : null,
    edges.bottom ? "transparent 100%" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const fade =
    edgeFade && (edges.top || edges.bottom) ? `linear-gradient(to bottom, ${stops})` : "none";

  return (
    <div
      className={cn("relative", className)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div
        ref={setViewport}
        style={{ WebkitMaskImage: fade, maskImage: fade }}
        className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div
        ref={thumb}
        aria-hidden
        onPointerDown={onThumbDown}
        onPointerMove={onThumbMove}
        onPointerUp={onThumbUp}
        onPointerCancel={onThumbUp}
        className={cn(
          "absolute top-0 right-[3px] rounded-full bg-foreground/25 will-change-transform",
          "transition-[width,opacity,background-color] duration-300 ease-expo dark:bg-white/30",
          shown ? "w-[5px] opacity-100" : "pointer-events-none w-[3px] opacity-0",
          shown && "cursor-grab bg-foreground/45 active:cursor-grabbing dark:bg-white/45"
        )}
      />
    </div>
  );
}
