import { describe, expect, it } from "bun:test";
import {
  CurrencyMismatchError,
  InvalidMoneyAmountError,
  addMoney,
  createMoney,
  multiplyMoney,
  subtractMoney,
} from "../src/money";
import { InvalidTenantIdError, parseTenantId } from "../src/tenant";

describe("Money value object", () => {
  it("creates valid money with integer minor units", () => {
    const price = createMoney(1999, "usd");
    expect(price.amount).toBe(1999);
    expect(price.currency).toBe("USD");
  });

  it("throws on floating point or unsafe integer amounts", () => {
    expect(() => createMoney(19.99, "USD")).toThrow(InvalidMoneyAmountError);
    expect(() => createMoney(Number.NaN, "USD")).toThrow(InvalidMoneyAmountError);
  });

  it("adds and subtracts money of same currency correctly", () => {
    const a = createMoney(1000, "USD");
    const b = createMoney(550, "USD");
    const sum = addMoney(a, b);
    const diff = subtractMoney(a, b);

    expect(sum.amount).toBe(1550);
    expect(sum.currency).toBe("USD");
    expect(diff.amount).toBe(450);
    expect(diff.currency).toBe("USD");
  });

  it("rejects operations across mismatched currencies", () => {
    const usd = createMoney(100, "USD");
    const eur = createMoney(100, "EUR");
    expect(() => addMoney(usd, eur)).toThrow(CurrencyMismatchError);
    expect(() => subtractMoney(usd, eur)).toThrow(CurrencyMismatchError);
  });

  it("multiplies money and rounds to nearest integer minor unit", () => {
    const price = createMoney(999, "USD"); // $9.99
    const discounted = multiplyMoney(price, 0.8); // 20% off -> 799.2 -> 799
    expect(discounted.amount).toBe(799);
  });
});

describe("Tenant identity", () => {
  it("parses valid tenant IDs", () => {
    const id = parseTenantId("store_123-abc");
    expect(id).toBe("store_123-abc");
  });

  it("rejects invalid or unsafe tenant IDs", () => {
    expect(() => parseTenantId("")).toThrow(InvalidTenantIdError);
    expect(() => parseTenantId("ab")).toThrow(InvalidTenantIdError);
    expect(() => parseTenantId("store/hack")).toThrow(InvalidTenantIdError);
    expect(() => parseTenantId("store;DROP TABLE")).toThrow(InvalidTenantIdError);
  });
});
