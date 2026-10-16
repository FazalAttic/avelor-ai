import { InvalidMoneyAmountError } from "../money";
import type { CreateProductInput, CreateVariantInput, ProductStatus } from "./types";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const VALID_STATUSES: ReadonlySet<ProductStatus> = new Set(["draft", "active", "archived"]);

export function validateProductInput(input: CreateProductInput): void {
  if (!input.tenantId || typeof input.tenantId !== "string") {
    throw new ValidationError("Product tenantId is required");
  }

  if (!input.name || typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new ValidationError("Product name must be a non-empty string");
  }

  if (input.name.trim().length > 255) {
    throw new ValidationError("Product name must not exceed 255 characters");
  }

  if (input.status && !VALID_STATUSES.has(input.status)) {
    throw new ValidationError(`Invalid product status: ${input.status}`);
  }

  if (input.description && input.description.length > 5000) {
    throw new ValidationError("Product description must not exceed 5000 characters");
  }
}

export function validateVariantInput(input: CreateVariantInput): void {
  if (!input.tenantId || typeof input.tenantId !== "string") {
    throw new ValidationError("Variant tenantId is required");
  }

  if (!input.productId || typeof input.productId !== "string") {
    throw new ValidationError("Variant productId is required");
  }

  if (!input.sku || typeof input.sku !== "string" || input.sku.trim().length === 0) {
    throw new ValidationError("Variant SKU must be a non-empty string");
  }

  if (!input.title || typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new ValidationError("Variant title must be a non-empty string");
  }

  if (!input.price || !Number.isSafeInteger(input.price.amount) || input.price.amount < 0) {
    throw new InvalidMoneyAmountError(input.price?.amount ?? -1);
  }

  if (!Number.isSafeInteger(input.inventoryQuantity) || input.inventoryQuantity < 0) {
    throw new ValidationError("Variant inventory quantity must be a non-negative integer");
  }
}
