"use client";

import { AlertCircleIcon, ArrowLeft02Icon, Shield01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const FIELD_CLASS = cn(
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground",
  "transition-colors duration-150 ease-expo placeholder:text-subtle",
  "focus:border-brand-blue focus:outline-none"
);

const LABEL_CLASS =
  "block px-1 pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase";

const SUBMIT_CLASS = cn(
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white",
  "bg-[image:var(--gradient-brand)] shadow-card",
  "transition-opacity duration-150 ease-expo hover:opacity-90",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
  "disabled:pointer-events-none disabled:opacity-45"
);

const GHOST_LINK = cn(
  "flex items-center justify-center gap-1.5 text-[13px] font-semibold text-muted",
  "transition-colors duration-150 ease-expo hover:text-foreground"
);

const STEP = { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };

function Alert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[13px] leading-snug text-red-600 dark:text-red-400"
    >
      <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={2} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function StepRail({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      <span
        className={cn(
          "h-[3px] w-6 rounded-full transition-colors duration-200 ease-expo",
          step >= 1 ? "bg-brand-blue" : "bg-border-strong"
        )}
      />
      <span
        className={cn(
          "h-[3px] w-6 rounded-full transition-colors duration-200 ease-expo",
          step === 2 ? "bg-brand-blue" : "bg-border-strong"
        )}
      />
    </div>
  );
}

function DigitInput({
  index,
  value,
  disabled,
  onType,
  onBackspace,
  register,
}: {
  index: number;
  value: string;
  disabled: boolean;
  onType: (index: number, char: string) => void;
  onBackspace: (index: number) => void;
  register: (index: number, node: HTMLInputElement | null) => void;
}) {
  return (
    <input
      ref={(node) => register(index, node)}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={1}
      disabled={disabled}
      aria-label={`Digit ${index + 1}`}
      value={value}
      onChange={(event) => onType(index, event.target.value.replace(/\D/g, "").slice(-1))}
      onKeyDown={(event) => {
        if (event.key !== "Backspace") return;
        event.preventDefault();
        onBackspace(index);
      }}
      onFocus={(event) => event.target.select()}
      className={cn(
        "h-14 w-full min-w-0 rounded-xl border bg-background text-center text-xl font-semibold text-foreground",
        "transition-[border-color,background-color] duration-150 ease-expo",
        "focus:border-brand-blue focus:outline-none disabled:opacity-50",
        value ? "border-border-strong" : "border-border"
      )}
    />
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const registerDigit = (index: number, node: HTMLInputElement | null) => {
    digitRefs.current[index] = node;
  };

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as { role?: string }).role;
      if (role === "admin") {
        router.replace("/admin");
      }
    }
  }, [session, router]);

  // Focus the first box when the authenticator step appears. The code is always
  // empty at that point: it is only ever set by typing in this step.
  useEffect(() => {
    if (requires2FA) digitRefs.current[0]?.focus();
  }, [requires2FA]);

  // The code is cleared on every failed attempt, so this can only fire once per
  // complete code.
  useEffect(() => {
    if (!requires2FA || loading || totpCode.length !== 6) return;
    formRef.current?.requestSubmit();
  }, [requires2FA, loading, totpCode]);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res.error) {
        setError(res.error.message ?? "Invalid admin credentials");
        return;
      }

      // Check if Better Auth two-factor redirect is required
      if (res.data && "twoFactorRedirect" in res.data && res.data.twoFactorRedirect) {
        setRequires2FA(true);
        return;
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Verify TOTP code from Google Authenticator
      const res = await authClient.twoFactor.verifyTotp({
        code: totpCode,
      });

      if (res.error) {
        setTotpCode("");
        setError(res.error.message ?? "Invalid 6-digit authenticator code");
        return;
      }

      router.push("/admin");
    } catch (err) {
      setTotpCode("");
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function typeDigit(index: number, char: string) {
    if (!char) return;
    const next = (
      index < totpCode.length
        ? totpCode.slice(0, index) + char + totpCode.slice(index + 1)
        : totpCode + char
    ).slice(0, 6);
    setTotpCode(next);
    digitRefs.current[Math.min(next.length, 5)]?.focus();
  }

  // Backspace on a filled box clears it; on an empty box it clears and rewinds
  // to the previous one, so the code never gains a hole.
  function backspaceDigit(index: number) {
    const target = totpCode[index] ? index : Math.max(0, index - 1);
    const next = totpCode.slice(0, target) + totpCode.slice(target + 1);
    setTotpCode(next);
    digitRefs.current[target]?.focus();
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={STEP}
        className="w-full max-w-[400px]"
      >
        <header className="flex items-center gap-3 pb-6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-[image:var(--gradient-brand)] text-sm font-extrabold text-white">
            A
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] leading-tight font-bold tracking-tight text-foreground">
              Avelor Admin
            </p>
            <p className="truncate text-[11px] leading-tight font-semibold tracking-[0.12em] text-subtle uppercase">
              Store operations console
            </p>
          </div>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted">
            <HugeiconsIcon icon={Shield01Icon} size={16} strokeWidth={1.8} />
          </span>
        </header>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <AnimatePresence mode="wait" initial={false}>
            {requires2FA ? (
              <motion.form
                key="otp"
                ref={formRef}
                onSubmit={handleTotpSubmit}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={STEP}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2.5">
                  <StepRail step={2} />
                  <h1 className="text-[19px] leading-tight font-bold tracking-tight">
                    Authenticator code
                  </h1>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Open Google Authenticator and enter the six digits it shows for this account.
                  </p>
                </div>

                {error ? <Alert>{error}</Alert> : null}

                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <DigitInput
                      key={index}
                      index={index}
                      value={totpCode[index] ?? ""}
                      disabled={loading}
                      onType={typeDigit}
                      onBackspace={backspaceDigit}
                      register={registerDigit}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || totpCode.length !== 6}
                  className={SUBMIT_CLASS}
                >
                  {loading ? "Verifying…" : "Enter console"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode("");
                    setError(null);
                  }}
                  className={GHOST_LINK}
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} size={14} strokeWidth={2} />
                  Use a different account
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="password"
                onSubmit={handlePasswordSubmit}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={STEP}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-2.5">
                  <StepRail step={1} />
                  <h1 className="text-[19px] leading-tight font-bold tracking-tight">
                    Sign in as administrator
                  </h1>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Catalog, orders and store policies for{" "}
                    {process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha"}.
                  </p>
                </div>

                {searchParams.get("error") === "unauthorized" ? (
                  <Alert>Your account is not authorized as an administrator.</Alert>
                ) : null}

                {error ? <Alert>{error}</Alert> : null}

                <div className="flex flex-col gap-3.5">
                  <div>
                    <label htmlFor="admin-email" className={LABEL_CLASS}>
                      Admin email
                    </label>
                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                      }}
                      required
                      disabled={loading}
                      autoComplete="username"
                      placeholder="you@avelor.dev"
                      className={FIELD_CLASS}
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-password" className={LABEL_CLASS}>
                      Password
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      placeholder="Your password"
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className={SUBMIT_CLASS}>
                  {loading ? "Authenticating…" : "Continue"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="pt-5 text-center text-xs text-subtle">
          Protected area. Customer sign-in lives on the storefront.
        </p>
      </motion.div>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-surface-hover" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
