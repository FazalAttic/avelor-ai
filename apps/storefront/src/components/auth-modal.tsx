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
  }, [open]);

  if (!open) return null;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    requestAnimationFrame(() => formRef.current?.querySelector("input")?.focus());
  }

  async function onGoogleSignIn() {
    setError(null);
    setPending(true);
    try {
      const callbackURL = typeof window !== "undefined" ? window.location.origin : "/";
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: callbackURL,
      });
    } catch {
      setError("Google sign-in could not be initiated. Check your client credentials.");
      setPending(false);
    }
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
          "relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/60 bg-white/55 shadow-pop backdrop-blur-2xl",
          "md:grid md:max-w-[760px] md:grid-cols-2",
          "dark:border-white/10 dark:bg-[#15182b]/75"
        )}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/avelor-logo.png"
              alt=""
              width={36}
              height={36}
              priority
              style={{ width: "auto", height: "auto" }}
            />
            <h2
              id="auth-title"
              className="mt-3 text-xl font-semibold tracking-tight text-foreground"
            >
              {mode === "sign-in" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {mode === "sign-in"
                ? "Sign in to pick up where you left off."
                : "Join Avelor and let the shopping begin."}
            </p>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={onGoogleSignIn}
            className={cn(
              "mt-5 flex h-11 w-full items-center justify-center gap-3 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-card",
              "transition-all duration-150 ease-expo hover:border-border-strong hover:bg-surface-hover disabled:opacity-60",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
            )}
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">
              or continue with email
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-3">
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
                "btn-brand mt-2 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold",
                "disabled:opacity-60",
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
        </div>

        <div aria-hidden className="relative hidden md:block">
          <Image
            src="/sky/auth-day.png"
            alt=""
            fill
            priority
            sizes="380px"
            className="object-cover [mask-image:linear-gradient(to_right,transparent_0%,black_16%)] transition-opacity duration-500 ease-expo dark:opacity-0"
          />
          <Image
            src="/sky/auth-night.png"
            alt=""
            fill
            loading="eager"
            sizes="380px"
            className="object-cover opacity-0 [mask-image:linear-gradient(to_right,transparent_0%,black_16%)] transition-opacity duration-500 ease-expo dark:opacity-100"
          />
        </div>
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
