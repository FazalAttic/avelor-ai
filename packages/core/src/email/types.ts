export interface SendEmailInput {
  readonly to: string | readonly string[];
  readonly subject: string;
  readonly html: string;
  readonly text?: string | undefined;
  readonly from?: string | undefined;
  readonly replyTo?: string | undefined;
  readonly tags?: readonly { name: string; value: string }[] | undefined;
}

export interface EmailResult {
  readonly success: boolean;
  readonly id?: string | undefined;
  readonly error?: string | undefined;
}

export interface VerificationEmailOptions {
  readonly to: string;
  readonly name?: string | undefined;
  readonly verifyUrl: string;
  readonly storeName?: string | undefined;
}

export interface PasswordResetEmailOptions {
  readonly to: string;
  readonly name?: string | undefined;
  readonly resetUrl: string;
  readonly storeName?: string | undefined;
}

export interface OrderConfirmationItem {
  readonly title: string;
  readonly quantity: number;
  readonly priceFormatted: string;
}

export interface OrderConfirmationEmailOptions {
  readonly to: string;
  readonly customerName?: string | undefined;
  readonly orderNumber: string;
  readonly totalAmountFormatted: string;
  readonly items: readonly OrderConfirmationItem[];
  readonly storeName?: string | undefined;
}

export interface SentEmailRecord {
  readonly id: string;
  readonly to: string[];
  readonly subject: string;
  readonly html: string;
  readonly text?: string | undefined;
  readonly from: string;
  readonly replyTo?: string | undefined;
  readonly sentAt: Date;
}

export interface EmailService {
  send(input: SendEmailInput): Promise<EmailResult>;
  sendVerificationEmail(options: VerificationEmailOptions): Promise<EmailResult>;
  sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<EmailResult>;
  sendOrderConfirmationEmail(options: OrderConfirmationEmailOptions): Promise<EmailResult>;
}
