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

export class MockEmailService implements EmailService {
  private readonly sentEmails: SentEmailRecord[] = [];
  public shouldFail = false;
  public failureMessage = "Mock email dispatch failure";

  getSentEmails(): readonly SentEmailRecord[] {
    return Object.freeze([...this.sentEmails]);
  }

  getLastEmail(): SentEmailRecord | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }

  clear(): void {
    this.sentEmails.length = 0;
  }

  async send(input: SendEmailInput): Promise<EmailResult> {
    if (this.shouldFail) {
      return { success: false, error: this.failureMessage };
    }

    const recipients = Array.isArray(input.to) ? [...input.to] : [input.to];
    const record: SentEmailRecord = {
      id: `mock_email_${crypto.randomUUID()}`,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      from: input.from ?? "Avelor <onboarding@resend.dev>",
      replyTo: input.replyTo,
      sentAt: new Date(),
    };

    this.sentEmails.push(record);
    return { success: true, id: record.id };
  }

  async sendVerificationEmail(options: VerificationEmailOptions): Promise<EmailResult> {
    const rendered = renderVerificationEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "auth-verification" }],
    });
  }

  async sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<EmailResult> {
    const rendered = renderPasswordResetEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "password-reset" }],
    });
  }

  async sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions): Promise<EmailResult> {
    const rendered = renderOrderConfirmationEmail(options);
    return this.send({
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "order-confirmation" }],
    });
  }
}
