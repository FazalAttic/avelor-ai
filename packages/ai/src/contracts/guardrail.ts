export type GuardrailVerdict = "allowed" | "rejected";

export type GuardrailCategory =
  | "safe"
  | "prompt_injection"
  | "system_leak"
  | "out_of_domain"
  | "policy_violation"
  | "malicious_script";

export interface GuardrailCheckInput {
  readonly text: string;
  readonly role?: "user" | "assistant" | "tool" | undefined;
  readonly context?: Readonly<Record<string, unknown>> | undefined;
}

export interface GuardrailCheckResult {
  readonly verdict: GuardrailVerdict;
  readonly category: GuardrailCategory;
  readonly reason?: string | undefined;
  readonly confidence?: number | undefined;
}

/**
 * Universal Guardrail Port.
 * Enforces server-authoritative input/output safety, prompt injection detection,
 * and out-of-domain containment before LLMs or tool execution.
 */
export interface GuardrailEngine {
  checkInput(input: GuardrailCheckInput): Promise<GuardrailCheckResult>;
  checkOutput(input: GuardrailCheckInput): Promise<GuardrailCheckResult>;
}
