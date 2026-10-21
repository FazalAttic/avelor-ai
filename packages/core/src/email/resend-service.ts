import { normalizeRecipients, sanitizeHeader } from "./security";
import {
  renderOrderConfirmationEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "./templates";
import type {
  EmailResult,
  EmailService,
  OrderConfirmationEmailOptions,
  PasswordResetEmailOptions,
  SendEmailInput,
  SentEmailRecord,
  VerificationEmailOptions,
} from "./types";

export interface ResendEmailServiceOptions {
  readonly apiKey?: string | undefined;
  readonly defaultFrom?: string | undefined;
  readonly timeoutMs?: number | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly storeName?: string | undefined;
}

export class ResendEmailService implements EmailService {
  private readonly apiKey: string | undefined;
  private readonly defaultFrom: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly storeName: string;
  private readonly sentEmails: SentEmailRecord[] = [];

  constructor(options: ResendEmailServiceOptions = {}) {
    this.apiKey =
      "apiKey" in options
        ? options.apiKey
        : (process.env.EMAIL_API_KEY ?? process.env.RESEND_API_KEY);
    this.defaultFrom =
      options.defaultFrom ?? process.env.EMAIL_FROM ?? "Avelor <onboarding@resend.dev>";
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.storeName = options.storeName ?? "Avelor";
  }

  /**
   * Returns list of emails sent during development/mock mode or testing.
   */
  getSentEmails(): readonly SentEmailRecord[] {
    return Object.freeze([...this.sentEmails]);
  }

  /**
   * Clears in-memory test email buffer.
   */
  clearSentEmails(): void {
    this.sentEmails.length = 0;
  }

  /**
   * Dispatches an arbitrary email via Resend API or in-memory mock when no key is set.
   */
  async send(input: SendEmailInput): Promise<EmailResult> {
    try {
      const recipients = normalizeRecipients(input.to);
      const subject = sanitizeHeader(input.subject);
      const from = sanitizeHeader(input.from ?? this.defaultFrom);
      const replyTo = input.replyTo ? sanitizeHeader(input.replyTo) : undefined;

      if (!subject) {
        return { success: false, error: "Email subject cannot be empty" };
      }

      if (!from) {
        return { success: false, error: "Sender email ('from') cannot be empty" };
      }

      // Record in memory for test observability / dev debugging
      const record: SentEmailRecord = {
        id: `email_${crypto.randomUUID()}`,
        to: recipients,
        subject,
        html: input.html,
        text: input.text,
        from,
        replyTo,
        sentAt: new Date(),
      };
      this.sentEmails.push(record);

      // Offline / Test / Unconfigured Mode
      if (!this.apiKey) {
        if (process.env.NODE_ENV !== "test") {
          console.log(
            `[Resend Email Mock] Dispatched to ${recipients.join(", ")} | Subject: "${subject}"`
          );
        }
        return { success: true, id: record.id };
      }

      // Live Resend API call
      const payload: Record<string, unknown> = {
        from,
        to: recipients,
        subject,
        html: input.html,
      };

      if (input.text) payload.text = input.text;
      if (replyTo) payload.reply_to = replyTo;
      if (input.tags && input.tags.length > 0) payload.tags = input.tags;

      const response = await this.fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          name?: string;
        };
        const message = errorData.message ?? `Resend HTTP error ${response.status}`;
        return {
          success: false,
          error: `Resend dispatch failed (${response.status}): ${message}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        success: true,
        id: data.id ?? record.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to dispatch email: ${message}`,
      };
    }
  }

  async sendVerificationEmail(options: VerificationEmailOptions): Promise<EmailResult> {
    const rendered = renderVerificationEmail({
      ...options,
      storeName: options.storeName ?? this.storeName,
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "auth-verification" }],
    });
  }

  async sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<EmailResult> {
    const rendered = renderPasswordResetEmail({
      ...options,
      storeName: options.storeName ?? this.storeName,
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "password-reset" }],
    });
  }

  async sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions): Promise<EmailResult> {
    const rendered = renderOrderConfirmationEmail({
      ...options,
      storeName: options.storeName ?? this.storeName,
    });

    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "order-confirmation" }],
    });
  }
}
