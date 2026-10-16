/**
 * Core Money value object enforcing integer minor-unit arithmetic.
 * Floating point arithmetic for currency calculations is strictly prohibited.
 */

export interface Money {
  readonly amount: number; // Integer minor units (e.g. 1050 = $10.50)
  readonly currency: string; // ISO 4217 3-letter code (e.g. "USD", "EUR")
}

export class CurrencyMismatchError extends Error {
  constructor(c1: string, c2: string) {
    super(`Cannot operate on mismatched currencies: ${c1} and ${c2}`);
    this.name = "CurrencyMismatchError";
  }
}

export class InvalidMoneyAmountError extends Error {
  constructor(amount: number) {
    super(`Money amount must be a safe integer: ${amount}`);
    this.name = "InvalidMoneyAmountError";
  }
}

export function createMoney(amount: number, currency: string): Money {
  if (!Number.isSafeInteger(amount)) {
    throw new InvalidMoneyAmountError(amount);
  }
  return Object.freeze({
    amount,
    currency: currency.toUpperCase(),
  });
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  return createMoney(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
  return createMoney(a.amount - b.amount, a.currency);
}

export function multiplyMoney(money: Money, factor: number): Money {
  // Round to nearest integer minor unit
  const result = Math.round(money.amount * factor);
  return createMoney(result, money.currency);
}
