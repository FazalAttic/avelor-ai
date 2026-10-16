import type {
  GuardrailCheckInput,
  GuardrailCheckResult,
  GuardrailEngine,
} from "../contracts/guardrail";
import { JevGuardrail, type JevGuardrailOptions } from "./jev-guardrail";
import { RuleBasedGuardrail } from "./rule-based-guardrail";

export interface CompositeGuardrailOptions {
  readonly engines?: readonly GuardrailEngine[] | undefined;
  readonly jevOptions?: JevGuardrailOptions | undefined;
}

/**
 * Composite Guardrail orchestrator.
 * Evaluates inputs through layered safety engines:
 * 1. Zero-latency rule heuristics (< 1ms CPU) to catch blatant attacks for $0.
 * 2. TypeSafe Jev System-One decision model to catch nuanced semantic injections and off-topic intents.
 */
export class CompositeGuardrail implements GuardrailEngine {
  private readonly engines: readonly GuardrailEngine[];

  constructor(options: CompositeGuardrailOptions = {}) {
    if (options.engines) {
      this.engines = options.engines;
    } else {
      const ruleEngine = new RuleBasedGuardrail();
      const jevEngine = new JevGuardrail(options.jevOptions);
      this.engines = [ruleEngine, jevEngine];
    }
  }

  async checkInput(input: GuardrailCheckInput): Promise<GuardrailCheckResult> {
    for (const engine of this.engines) {
      const result = await engine.checkInput(input);
      if (result.verdict === "rejected") {
        return result;
      }
    }

    return {
      verdict: "allowed",
      category: "safe",
      confidence: 1.0,
    };
  }

  async checkOutput(input: GuardrailCheckInput): Promise<GuardrailCheckResult> {
    for (const engine of this.engines) {
      const result = await engine.checkOutput(input);
      if (result.verdict === "rejected") {
        return result;
      }
    }

    return {
      verdict: "allowed",
      category: "safe",
      confidence: 1.0,
    };
  }
}
