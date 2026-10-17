"use client";

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { Panel } from "@/components/ui/panel";
import { TextField } from "@/components/ui/text-field";
import { authClient, useSession } from "@/lib/auth-client";

const STEP = { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const };

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

  useEffect(() => {
    if (session?.user) {
      const role = (session.user as { role?: string }).role;
      if (role === "admin") {
        router.replace("/admin");
      }
    }
  }, [session, router]);

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

  return (
    <section className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={STEP}
        className="w-full max-w-[380px]"
      >
        <BrandMark caption="Admin console" className="px-1.5 pb-4" />

        <Panel className="p-5 shadow-card">
          <AnimatePresence mode="wait" initial={false}>
            {requires2FA ? (
              <motion.form
                key="otp"
                ref={formRef}
                onSubmit={handleTotpSubmit}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={STEP}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
                    Authenticator code
                  </h1>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Six digits from Google Authenticator for{" "}
                    <span className="font-medium text-foreground">{email}</span>.
                  </p>
                </div>

                {error ? <Alert>{error}</Alert> : null}

                <OtpInput
                  value={totpCode}
                  onChange={(next) => {
                    setTotpCode(next);
                    setError(null);
                  }}
                  disabled={loading}
                  autoFocus
                  onComplete={() => formRef.current?.requestSubmit()}
                />

                <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                  {loading ? "Verifying…" : "Verify"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpCode("");
                    setError(null);
                  }}
                  className="self-center"
                >
                  <HugeiconsIcon icon={ArrowLeft02Icon} size={14} strokeWidth={2} />
                  Use a different account
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="password"
                onSubmit={handlePasswordSubmit}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={STEP}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1">
                  <h1 className="text-[15px] font-semibold tracking-tight text-foreground">
                    Sign in
                  </h1>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Administrator access to the store console.
                  </p>
                </div>

                {searchParams.get("error") === "unauthorized" ? (
                  <Alert>This account doesn&apos;t have admin access.</Alert>
                ) : null}

                {error ? <Alert>{error}</Alert> : null}

                <div className="flex flex-col gap-3">
                  <TextField
                    id="admin-email"
                    label="Email"
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
                  />
                  <TextField
                    id="admin-password"
                    label="Password"
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
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                  {loading ? "Authenticating…" : "Continue"}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Panel>
      </motion.div>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-40 w-full max-w-[380px] animate-pulse rounded-2xl bg-surface" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
