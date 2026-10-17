"use client";

import { type FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AdminSecurityPage() {
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStartEnrollment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.twoFactor.enable({
        password,
      });

      if (res.error) {
        setError(res.error.message ?? "Failed to initialize 2FA");
        return;
      }

      if (res.data && "totpURI" in res.data) {
        setTotpURI(res.data.totpURI);
        setBackupCodes(res.data.backupCodes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment error");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmTotp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authClient.twoFactor.verifyTotp({
        code: verifyCode,
      });

      if (res.error) {
        setError(res.error.message ?? "Invalid verification code");
        return;
      }

      setSuccess(true);
      setTotpURI(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="admin-security-page" className="mx-auto flex w-full max-w-xl flex-col gap-4">
      {/* Route skeleton for other AI agent to build UI */}
      <h1>Admin Security & 2FA Configuration</h1>
      <p>Configure Google Authenticator (TOTP) for high-security administrator logins.</p>

      {error ? (
        <div role="alert" className="text-red-500">
          {error}
        </div>
      ) : null}

      {success ? (
        <output className="text-green-600">
          Google Authenticator (TOTP) is successfully activated on your admin account.
        </output>
      ) : null}

      {!totpURI && !success ? (
        <form onSubmit={handleStartEnrollment}>
          <p>Confirm your current password to generate a new Google Authenticator QR key:</p>
          <div>
            <label htmlFor="current-pass">Confirm Password</label>
            <input
              id="current-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Generating Secret…" : "Set Up Google Authenticator"}
          </button>
        </form>
      ) : null}

      {totpURI && !success ? (
        <form onSubmit={handleConfirmTotp}>
          <div>
            <h3>Scan in Google Authenticator</h3>
            <p>
              Open Google Authenticator on your phone, choose <strong>Scan a QR code</strong>, or
              enter the manual setup key:
            </p>
            <code className="break-all block p-2 bg-gray-100 rounded">{totpURI}</code>
          </div>

          {backupCodes && backupCodes.length > 0 ? (
            <div>
              <h4>Emergency Backup Codes</h4>
              <p>Store these in a secure password manager:</p>
              <ul>
                {backupCodes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <label htmlFor="confirm-code">Enter 6-digit code shown in Authenticator</label>
            <input
              id="confirm-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              required
              disabled={loading}
              placeholder="000000"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Verifying…" : "Confirm & Activate 2FA"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
