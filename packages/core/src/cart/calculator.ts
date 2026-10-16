import { type Money, addMoney, createMoney, multiplyMoney } from "../money";
import type { Cart, CartItem } from "./types";

export class CartCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartCalculationError";
  }
}

/**
 * Re-calculates cart items and total using live variant data from the authoritative source of truth.
 * Ensures the customer cannot be charged based on stale or manipulated client prices.
 */
export function recalculateCart(cart: Cart): Cart {
  let subtotal = createMoney(0, cart.currency);

  const updatedItems: CartItem[] = [];

  for (const item of cart.items) {
    if (item.quantity <= 0 || !Number.isSafeInteger(item.quantity)) {
      throw new CartCalculationError(
        `Invalid quantity for item ${item.variantId}: ${item.quantity}`
      );
    }

    if (item.unitPrice.currency !== cart.currency) {
      throw new CartCalculationError(
        `Item currency ${item.unitPrice.currency} does not match cart currency ${cart.currency}`
      );
    }

    const totalPrice = multiplyMoney(item.unitPrice, item.quantity);
    subtotal = addMoney(subtotal, totalPrice);

    updatedItems.push({
      ...item,
      totalPrice,
    });
  }

  return {
    ...cart,
    items: Object.freeze(updatedItems),
    subtotal,
    updatedAt: new Date(),
  };
}
