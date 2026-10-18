import { escapeHtml } from "./security";
import type {
  OrderConfirmationEmailOptions,
  PasswordResetEmailOptions,
  VerificationEmailOptions,
} from "./types";

export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/**
 * Shared email layout wrapper for consistent branding and responsive presentation.
 */
function wrapLayout(contentHtml: string, brandName = "Avelor"): string {
  const safeBrand = escapeHtml(brandName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeBrand}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      padding: 28px 32px 20px 32px;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
    }
    .brand {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0f172a;
      text-decoration: none;
    }
    .body {
      padding: 32px;
      line-height: 1.6;
    }
    h1 {
      margin: 0 0 16px 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #0f172a;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 15px;
      color: #334155;
    }
    .btn {
      display: inline-block;
      background-color: #0f172a;
      color: #ffffff !important;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 20px 0 24px 0;
      text-align: center;
    }
    .footnote {
      font-size: 12px;
      color: #64748b;
      margin-top: 24px;
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
      word-break: break-all;
    }
    .footer {
      padding: 20px 32px;
      background-color: #f8fafc;
      border-top: 1px solid #f1f5f9;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    table.order-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    table.order-table th {
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    table.order-table td {
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
      color: #1e293b;
    }
    .total-row td {
      border-bottom: none;
      font-weight: 700;
      font-size: 16px;
      color: #0f172a;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <span class="brand">${safeBrand}</span>
      </div>
      <div class="body">
        ${contentHtml}
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} ${safeBrand}. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Renders Email Verification template
 */
export function renderVerificationEmail(options: VerificationEmailOptions): RenderedEmail {
  const storeName = options.storeName ?? "Avelor";
  const name = options.name ? escapeHtml(options.name) : "there";
  const safeStore = escapeHtml(storeName);
  const verifyUrl = options.verifyUrl;

  const subject = `Verify your email address for ${storeName}`;

  const contentHtml = `
    <h1>Verify your email</h1>
    <p>Hi ${name},</p>
    <p>Thank you for signing up for <strong>${safeStore}</strong>. Please confirm your email address by clicking the button below:</p>
    <div>
      <a href="${escapeHtml(verifyUrl)}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
    </div>
    <p>This verification link will expire in 24 hours.</p>
    <div class="footnote">
      <p>If you did not create an account, you can safely ignore this email.</p>
      <p>If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(verifyUrl)}" style="color: #0f172a;">${escapeHtml(verifyUrl)}</a></p>
    </div>
  `;

  const html = wrapLayout(contentHtml, storeName);
  const text = `Hi ${options.name ?? "there"},

Thank you for signing up for ${storeName}. Please confirm your email address by opening the link below:

${verifyUrl}

This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.

— The ${storeName} Team`;

  return { subject, html, text };
}

/**
 * Renders Password Reset template
 */
export function renderPasswordResetEmail(options: PasswordResetEmailOptions): RenderedEmail {
  const storeName = options.storeName ?? "Avelor";
  const name = options.name ? escapeHtml(options.name) : "there";
  const safeStore = escapeHtml(storeName);
  const resetUrl = options.resetUrl;

  const subject = `Reset your password for ${storeName}`;

  const contentHtml = `
    <h1>Password Reset Request</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your account on <strong>${safeStore}</strong>.</p>
    <div>
      <a href="${escapeHtml(resetUrl)}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <p>This link is single-use and will expire in 1 hour.</p>
    <div class="footnote">
      <p>If you did not request a password reset, you can safely ignore this message. Your password will remain unchanged.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${escapeHtml(resetUrl)}" style="color: #0f172a;">${escapeHtml(resetUrl)}</a></p>
    </div>
  `;

  const html = wrapLayout(contentHtml, storeName);
  const text = `Hi ${options.name ?? "there"},

We received a request to reset the password for your account on ${storeName}. Open the link below to set a new password:

${resetUrl}

This link will expire in 1 hour. If you did not request this, you can safely ignore this email.

— The ${storeName} Team`;

  return { subject, html, text };
}

/**
 * Renders Order Confirmation Receipt template
 */
export function renderOrderConfirmationEmail(
  options: OrderConfirmationEmailOptions
): RenderedEmail {
  const storeName = options.storeName ?? "Avelor";
  const customerName = options.customerName ? escapeHtml(options.customerName) : "valued customer";
  const safeOrderNumber = escapeHtml(options.orderNumber);
  const safeTotal = escapeHtml(options.totalAmountFormatted);

  const subject = `Order Confirmed: #${options.orderNumber} - ${storeName}`;

  const rowsHtml = options.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.title)} &times; ${item.quantity}</td>
        <td style="text-align: right;">${escapeHtml(item.priceFormatted)}</td>
      </tr>
    `
    )
    .join("");

  const contentHtml = `
    <h1>Thank you for your order!</h1>
    <p>Hi ${customerName},</p>
    <p>We have received your order <strong>#${safeOrderNumber}</strong> and are getting it ready.</p>
    
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="total-row">
          <td>Total</td>
          <td style="text-align: right;">${safeTotal}</td>
        </tr>
      </tbody>
    </table>

    <p>You will receive another update when your order is dispatched.</p>
  `;

  const html = wrapLayout(contentHtml, storeName);

  const textItems = options.items
    .map((item) => `- ${item.title} x ${item.quantity}: ${item.priceFormatted}`)
    .join("\n");

  const text = `Hi ${options.customerName ?? "valued customer"},

Thank you for your order #${options.orderNumber} from ${storeName}!

Order Summary:
${textItems}
Total: ${options.totalAmountFormatted}

We will notify you when your order is processed.

— The ${storeName} Team`;

  return { subject, html, text };
}
