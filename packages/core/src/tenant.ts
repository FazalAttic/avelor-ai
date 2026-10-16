/**
 * Core Tenant/Store identity primitives.
 * Enforces tenant ownership and isolation boundaries across queries, search, and storage.
 */

export type TenantId = string & { readonly __brand: unique symbol };

export class InvalidTenantIdError extends Error {
  constructor(reason: string) {
    super(`Invalid Tenant ID: ${reason}`);
    this.name = "InvalidTenantIdError";
  }
}

export function parseTenantId(raw: unknown): TenantId {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new InvalidTenantIdError("Tenant ID must be a non-empty string");
  }
  const sanitized = raw.trim();
  // Valid tenant IDs: alphanumeric, dashes, underscores, 3-64 chars
  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(sanitized)) {
    throw new InvalidTenantIdError(
      `Tenant ID '${sanitized}' contains invalid characters or length. Must match ^[a-zA-Z0-9_-]{3,64}$`
    );
  }
  return sanitized as TenantId;
}
