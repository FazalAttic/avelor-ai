import { describe, expect, it } from "bun:test";
import {
  escapeHtml,
  isValidEmail,
  MockEmailService,
  normalizeRecipients,
  ResendEmailService,
  renderOrderConfirmationEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
  sanitizeHeader,
} from "../src/index";

describe("Email Security & Sanitization", () => {
  it("escapes dangerous HTML characters to prevent XSS in email clients", () => {
    const raw = `<script>alert("xss")</script> & 'malicious'`;
    const escaped = escapeHtml(raw);
    expect(escaped).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;malicious&#39;"
    );
    expect(escaped).not.toContain("<script>");
  });

  it("handles null and undefined safely in escapeHtml", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });

  it("sanitizes headers to prevent CRLF injection", () => {
    const evilHeader = "Legitimate Subject\r\nBcc: evil@attacker.com\nTo: hacked@target.com";
    const sanitized = sanitizeHeader(evilHeader);
    expect(sanitized).not.toContain("\r");
    expect(sanitized).not.toContain("\n");
    expect(sanitized).toBe("Legitimate Subject Bcc: evil@attacker.com To: hacked@target.com");
  });

  it("validates correct and incorrect email addresses", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("alice.bob+tag@company.co.uk")).toBe(true);

    expect(isValidEmail("invalid-email")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@evil\nattacker.com")).toBe(false);
    expect(isValidEmail("user@evil\rattacker.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("normalizes and rejects invalid recipients in normalizeRecipients", () => {
    const validated = normalizeRecipients(["  user@store.com  ", "admin@store.com"]);
    expect(validated).toEqual(["user@store.com", "admin@store.com"]);

    expect(() => normalizeRecipients("not-an-email")).toThrow(/Invalid email address/);
    expect(() => normalizeRecipients([])).toThrow(/At least one valid recipient/);
  });
});

describe("Email Templates (Verification, Password Reset, Orders)", () => {
  it("renders verification email with secure escaping and button link", () => {
    const rendered = renderVerificationEmail({
      to: "newuser@example.com",
      name: "Alice <Hacker>",
      verifyUrl: "https://store.com/verify?token=abc123xyz",
      storeName: "Avelor Store",
    });

    expect(rendered.subject).toContain("Avelor Store");
    expect(rendered.html).toContain("Alice &lt;Hacker&gt;");
    expect(rendered.html).not.toContain("<Hacker>");
    expect(rendered.html).toContain("https://store.com/verify?token=abc123xyz");
    expect(rendered.text).toContain("https://store.com/verify?token=abc123xyz");
  });

  it("renders password reset email with single-use note and expiration", () => {
    const rendered = renderPasswordResetEmail({
      to: "bob@example.com",
      name: "Bob",
      resetUrl: "https://store.com/reset-password?token=secret987",
      storeName: "Avelor Apparel",
    });

    expect(rendered.subject).toContain("Reset your password");
    expect(rendered.html).toContain("https://store.com/reset-password?token=secret987");
    expect(rendered.html).toContain("1 hour");
    expect(rendered.text).toContain("https://store.com/reset-password?token=secret987");
  });

  it("renders order confirmation receipt with line items and totals", () => {
    const rendered = renderOrderConfirmationEmail({
      to: "customer@example.com",
      customerName: "Jane Doe",
      orderNumber: "ORD-9421",
      totalAmountFormatted: "$149.98 USD",
      items: [
        { title: "Mechanical Keyboard", quantity: 1, priceFormatted: "$119.99 USD" },
        { title: "Desk Mat", quantity: 1, priceFormatted: "$29.99 USD" },
      ],
      storeName: "Avelor Tech",
    });

    expect(rendered.subject).toContain("ORD-9421");
    expect(rendered.html).toContain("Mechanical Keyboard &times; 1");
    expect(rendered.html).toContain("$149.98 USD");
    expect(rendered.text).toContain("- Mechanical Keyboard x 1: $119.99 USD");
    expect(rendered.text).toContain("Total: $149.98 USD");
  });
});

describe("ResendEmailService & MockEmailService", () => {
  it("operates in mock/dev mode when no RESEND_API_KEY is supplied", async () => {
    const service = new ResendEmailService({ apiKey: undefined });
    expect(service.getSentEmails()).toHaveLength(0);

    const result = await service.send({
      to: "user@example.com",
      subject: "Welcome to Avelor",
      html: "<p>Hello world</p>",
      text: "Hello world",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();

    const sent = service.getSentEmails();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual(["user@example.com"]);
    expect(sent[0]?.subject).toBe("Welcome to Avelor");

    service.clearSentEmails();
    expect(service.getSentEmails()).toHaveLength(0);
  });

  it("dispatches live HTTPS payload to Resend API endpoint when apiKey is configured", async () => {
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: Record<string, unknown> = {};

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      capturedBody = JSON.parse(String(init?.body ?? "{}"));

      return new Response(JSON.stringify({ id: "re_live_resend_id_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const service = new ResendEmailService({
      apiKey: "re_test_key_abc",
      defaultFrom: "Avelor <noreply@avelor.store>",
      fetchFn: mockFetch,
    });

    const result = await service.sendVerificationEmail({
      to: "shopper@store.com",
      name: "Shopper",
      verifyUrl: "https://avelor.store/verify?code=789",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe("re_live_resend_id_123");
    expect(capturedUrl).toBe("https://api.resend.com/emails");
    expect(capturedHeaders.Authorization).toBe("Bearer re_test_key_abc");
    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    expect(capturedBody.from).toBe("Avelor <noreply@avelor.store>");
    expect(capturedBody.to).toEqual(["shopper@store.com"]);
    expect(String(capturedBody.html)).toContain("https://avelor.store/verify?code=789");
  });

  it("handles Resend API error responses gracefully without throwing", async () => {
    const mockErrorFetch = (async () => {
      return new Response(
        JSON.stringify({
          statusCode: 422,
          message: "The domain is not verified",
          name: "validation_error",
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;

    const service = new ResendEmailService({
      apiKey: "re_test_key_abc",
      fetchFn: mockErrorFetch,
    });

    const result = await service.send({
      to: "unverified@domain.com",
      subject: "Test Domain",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("The domain is not verified");
  });

  it("MockEmailService records sent emails and allows simulated failures", async () => {
    const mock = new MockEmailService();
    await mock.sendPasswordResetEmail({
      to: "member@example.com",
      name: "Member",
      resetUrl: "https://store.com/reset",
    });

    expect(mock.getSentEmails()).toHaveLength(1);
    expect(mock.getLastEmail()?.to).toEqual(["member@example.com"]);

    mock.shouldFail = true;
    const failResult = await mock.send({
      to: "member@example.com",
      subject: "Will fail",
      html: "<p>Fail</p>",
    });
    expect(failResult.success).toBe(false);
    expect(failResult.error).toBe("Mock email dispatch failure");
  });
});
