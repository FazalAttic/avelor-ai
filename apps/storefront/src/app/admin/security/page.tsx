"use client";

import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  KeyIcon,
  Logout03Icon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { TextField } from "@/components/ui/text-field";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const LINE_BUTTON = buttonClass({
  variant: "secondary",
  size: "md",
  className: "border-admin-line bg-admin-card hover:border-admin-ink/25 hover:bg-admin-rail",
});

/** Only what an authenticator asks for when you choose "enter a setup key". */
function secretOf(totpURI: string) {
  try {
    return new URL(totpURI).searchParams.get("secret") ?? totpURI;
  } catch {
    return totpURI;
  }
}

function CopyRow({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-admin-line bg-admin-canvas px-3 py-2 font-mono text-[12px] text-admin-ink">
        {value}
      </code>
      <button
        type="button"
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className={cn(LINE_BUTTON, "shrink-0 gap-1.5")}
        onClick={() => {
          navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        <HugeiconsIcon
          icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
          size={14}
          strokeWidth={2}
        />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export default function AdminSecurityPage() {
  const { data: session, refetch } = useSession();
  const enabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled
  );

  const [password, setPassword] = useState("");
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(
    null
  );
  const [code, setCode] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [offOpen, setOffOpen] = useState(false);

  async function start() {
    if (!password) {
      setFailure("Confirm your password first.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.twoFactor.enable({ password });
      if (res.error) {
        setFailure(res.error.message ?? "Could not start setup.");
        return;
      }
      const data = res.data as { totpURI?: string; backupCodes?: string[] } | undefined;
      if (!data?.totpURI) {
        setFailure("The server did not return a setup key.");
        return;
      }
      setFailure(null);
      setEnrollment({ totpURI: data.totpURI, backupCodes: data.backupCodes ?? [] });
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== 6) {
      setFailure("Enter the six digits your authenticator is showing.");
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.twoFactor.verifyTotp({ code });
      if (res.error) {
        setCode("");
        setFailure(res.error.message ?? "That code did not match.");
        return;
      }
      setFailure(null);
      setNotice("Two-factor is on. Next time you sign in, the console asks for a code.");
      setEnrollment(null);
      setPassword("");
      setCode("");
      await refetch();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const res = await authClient.twoFactor.disable({ password: password || undefined });
      if (res.error) {
        setFailure(res.error.message ?? "Could not turn two-factor off.");
        return;
      }
      setFailure(null);
      setNotice("Two-factor is off. Your password alone now unlocks the console.");
      setPassword("");
      setOffOpen(false);
      await refetch();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="admin-security-page" className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      {failure ? <Alert>{failure}</Alert> : null}
      {notice && !failure ? <Alert tone="success">{notice}</Alert> : null}

      <Panel className="border-admin-line bg-admin-card">
        <PanelHeader
          className="border-admin-line"
          title="Two-factor authentication"
          desc="A code from your authenticator, on top of the password, for every admin sign-in."
          actions={
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                enabled
                  ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                  : "bg-admin-rail text-muted"
              )}
            >
              <HugeiconsIcon icon={ShieldIcon} size={13} strokeWidth={2} />
              {enabled ? "Enabled" : "Not enabled"}
            </span>
          }
        />

        <div className="flex flex-col gap-4 p-4">
          {enabled ? (
            <>
              <p className="text-[13px] leading-relaxed text-muted">
                Your admin account is protected by a time-based code. Turning it off leaves the
                password as the only thing between an attacker and this store's orders, products and
                policies.
              </p>
              <Button
                className={cn(LINE_BUTTON, "self-start text-red-600 dark:text-red-400")}
                onClick={() => {
                  setFailure(null);
                  setNotice(null);
                  setOffOpen(true);
                }}
              >
                <HugeiconsIcon icon={Logout03Icon} size={15} strokeWidth={1.9} />
                Turn off two-factor
              </Button>
            </>
          ) : enrollment ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                  Setup key
                </p>
                <p className="text-[13px] leading-relaxed text-muted">
                  In Google Authenticator choose <strong>Enter a setup key</strong> and paste this.
                  The issuer reads <strong>Avelor Admin</strong>.
                </p>
                <CopyRow value={secretOf(enrollment.totpURI)} label="setup key" />
              </div>

              {enrollment.backupCodes.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                    Backup codes
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted">
                    One use each, for the day your phone is not with you. Save them somewhere you
                    would not lose your password.
                  </p>
                  <CopyRow value={enrollment.backupCodes.join(", ")} label="backup codes" />
                  <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {enrollment.backupCodes.map((backup) => (
                      <li
                        key={backup}
                        className="rounded-lg border border-admin-line bg-admin-canvas px-2 py-1.5 text-center font-mono text-[12px] text-admin-ink"
                      >
                        {backup}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-admin-line pt-4">
                <label
                  htmlFor="totp-code"
                  className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase"
                >
                  Confirm with a code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="totp-code"
                    className={cn(
                      "h-9 w-[132px] rounded-lg border border-admin-line bg-admin-canvas px-3",
                      "font-mono text-[15px] tracking-[0.3em] text-admin-ink tabular-nums",
                      "transition-colors duration-150 ease-expo focus:border-admin-ink/35 focus:outline-none"
                    )}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    disabled={busy}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <Button variant="ink" disabled={busy} onClick={confirm}>
                    {busy ? "Verifying…" : "Confirm & activate"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-muted">
                Setup takes a minute: confirm your password to generate a key, add that key to your
                authenticator, then enter the code it shows.
              </p>
              <TextField
                label="Confirm password"
                type="password"
                value={password}
                autoComplete="current-password"
                disabled={busy}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your admin password"
                className="border-admin-line bg-admin-canvas"
                wrapperClassName="max-w-[320px]"
              />
              <Button
                variant="ink"
                className="self-start"
                disabled={busy || !password}
                onClick={start}
              >
                <HugeiconsIcon icon={KeyIcon} size={15} strokeWidth={1.9} />
                {busy ? "Generating…" : "Generate setup key"}
              </Button>
            </>
          )}
        </div>
      </Panel>

      <Dialog
        open={offOpen}
        onClose={() => setOffOpen(false)}
        title="Turn off two-factor?"
        description="Admin sign-ins will need only your password from now on."
        className="sm:max-w-[460px]"
        footer={
          <>
            <Button className={LINE_BUTTON} onClick={() => setOffOpen(false)}>
              Keep it on
            </Button>
            <Button variant="ink" disabled={busy} onClick={turnOff}>
              {busy ? "Turning off…" : "Turn off"}
            </Button>
          </>
        }
      >
        <TextField
          label="Confirm password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Your admin password"
          className="border-admin-line bg-admin-canvas"
        />
      </Dialog>
    </section>
  );
}
