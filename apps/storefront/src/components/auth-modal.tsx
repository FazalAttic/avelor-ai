"use client";

import { ArrowRightIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

type Mode = "sign-in" | "sign-up";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setError(null);
      // The browser needs the new tree mounted before the first input exists.
      requestAnimationFrame(() => formRef.current?.querySelector("input")?.focus());
    }
  }, [open, mode]);

  if (!open) return null;

  function switchMode(next: Mode) {
    setMode(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result =
      mode === "sign-in"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name });

    setPending(false);

    if (result.error) {
      setError(friendlyError(result.error.message));
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/25 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative w-full max-w-sm rounded-[32px] border border-white/50 bg-white/40 p-6 shadow-pop backdrop-blur-2xl",
          "dark:border-white/10 dark:bg-[#15182b]/70"
        )}
      >
        <div className="flex flex-col items-center text-center">
          <Image src="/avelor-logo.png" alt="" width={36} height={36} priority />
          <h2 id="auth-title" className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {mode === "sign-in" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {mode === "sign-in"
              ? "Sign in to pick up where you left off."
              : "Join Avelor and let the shopping begin."}
          </p>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          {mode === "sign-up" && (
            <Field
              label="Name"
              type="text"
              value={name}
              onChange={setName}
              placeholder="Alex Rivera"
              autoComplete="name"
            />
          )}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          />

          {error && (
            <p role="alert" className="text-sm font-medium text-red-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={cn(
              "mt-2 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white",
              "bg-[image:var(--gradient-brand)] shadow-[0_4px_16px_rgba(32,56,248,0.35)]",
              "transition-opacity duration-150 ease-expo hover:opacity-90 disabled:opacity-60",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            )}
          >
            {pending
              ? mode === "sign-in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
            {!pending && <HugeiconsIcon icon={ArrowRightIcon} size={16} strokeWidth={2} />}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "sign-in" ? "New to Avelor?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="font-semibold text-foreground underline-offset-4 transition-colors duration-150 ease-expo hover:text-brand-blue hover:underline"
          >
            {mode === "sign-in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

type FieldProps = {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
};

function Field({ label, type, value, onChange, placeholder, autoComplete }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="px-1 text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={type === "password" ? 8 : undefined}
        className={cn(
          "h-11 rounded-2xl border border-white/60 bg-white/70 px-4 text-sm text-foreground shadow-card",
          "placeholder:text-subtle",
          "transition-colors duration-150 ease-expo focus:border-brand-blue/50 focus:outline-none",
          "dark:border-white/10 dark:bg-white/10 dark:focus:border-brand-blue/60"
        )}
      />
    </label>
  );
}

function friendlyError(message: string | null | undefined): string {
  if (!message) return "Something went wrong. Please try again.";
  if (message.toLowerCase().includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (message.toLowerCase().includes("invalid email or password")) {
    return "Invalid email or password.";
  }
  return message;
}
