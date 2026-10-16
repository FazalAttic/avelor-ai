import type {
  GuardrailCheckInput,
  GuardrailCheckResult,
  GuardrailEngine,
} from "../contracts/guardrail";

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)/i,
  /reveal\s+(the\s+|your\s+)?system\s+prompt/i,
  /what\s+are\s+your\s+system\s+instructions/i,
  /print\s+your\s+instructions/i,
  /you\s+are\s+now\s+(in\s+)?(developer|dan|jailbreak|unrestricted)\s+mode/i,
  /bypass\s+(all\s+)?(guardrails|safety|filters)/i,
  /override\s+(all\s+)?rules/i,
  /act\s+as\s+an\s+unfiltered/i,
  /from\s+now\s+on\s+you\s+will/i,
];

const MALICIOUS_SCRIPT_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript\s*:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /eval\s*\(/i,
];

const SQL_INJECTION_PATTERNS = [/;\s*DROP\s+TABLE/i, /;\s*DELETE\s+FROM/i, /UNION\s+SELECT/i];

/**
 * Fast, deterministic, zero-cost Rule-Based Guardrail Engine.
 * Intercepts common prompt injections, jailbreak templates, and malicious scripts in < 1ms.
 */
export class RuleBasedGuardrail implements GuardrailEngine {
  private readonly maxInputLength: number;

  constructor(options: { maxInputLength?: number } = {}) {
    this.maxInputLength = options.maxInputLength ?? 2000;
  }

  async checkInput(input: GuardrailCheckInput): Promise<GuardrailCheckResult> {
    const text = input.text.trim();

    // 1. Length constraint
    if (text.length > this.maxInputLength) {
      return {
        verdict: "rejected",
        category: "policy_violation",
        reason: `Input exceeds maximum permitted length of ${this.maxInputLength} characters`,
        confidence: 1.0,
      };
    }

    // 2. Malicious script / XSS detection
    for (const pattern of MALICIOUS_SCRIPT_PATTERNS) {
      if (pattern.test(text)) {
        return {
          verdict: "rejected",
          category: "malicious_script",
          reason: "Input contains executable script or event handler patterns",
          confidence: 1.0,
        };
      }
    }

    // 3. SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          verdict: "rejected",
          category: "malicious_script",
          reason: "Input contains SQL injection syntax",
          confidence: 0.95,
        };
      }
    }

    // 4. Prompt injection and jailbreak patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        return {
          verdict: "rejected",
          category: "prompt_injection",
          reason: "Input matches known prompt injection or system override patterns",
          confidence: 0.95,
        };
      }
    }

    return {
      verdict: "allowed",
      category: "safe",
      confidence: 1.0,
    };
  }

  async checkOutput(input: GuardrailCheckInput): Promise<GuardrailCheckResult> {
    const text = input.text;

    // Output sanity checks: prevent leaking internal instructions
    if (
      text.includes("DISCOVERY_SYSTEM_PROMPT") ||
      text.includes("You are the grounded AI shopping assistant for Avelor")
    ) {
      return {
        verdict: "rejected",
        category: "system_leak",
        reason: "Output contains leaked internal prompt instructions",
        confidence: 1.0,
      };
    }

    return {
      verdict: "allowed",
      category: "safe",
      confidence: 1.0,
    };
  }
}
