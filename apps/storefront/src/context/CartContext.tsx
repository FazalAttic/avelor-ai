"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { StoreProduct, ProductVariant } from "../data/catalog";

export interface CartLineItem {
  readonly product: StoreProduct;
  readonly variant: ProductVariant;
  readonly quantity: number;
}

interface CartContextValue {
  readonly items: readonly CartLineItem[];
  readonly itemCount: number;
  readonly subtotalMinor: number;
  readonly isOpen: boolean;
  readonly addItem: (product: StoreProduct, variant: ProductVariant, quantity?: number) => void;
  readonly removeItem: (variantId: string) => void;
  readonly updateQuantity: (variantId: string, quantity: number) => void;
  readonly clearCart: () => void;
  readonly openCart: () => void;
  readonly closeCart: () => void;
  readonly toggleCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<readonly CartLineItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("avelor_cart");
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save cart changes
  useEffect(() => {
    try {
      localStorage.setItem("avelor_cart", JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  const addItem = (product: StoreProduct, variant: ProductVariant, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.variant.id === variant.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const existing = next[existingIndex];
        if (existing) {
          next[existingIndex] = {
            ...existing,
            quantity: existing.quantity + quantity,
          };
        }
        return next;
      }
      return [...prev, { product, variant, quantity }];
    });
    setIsOpen(true);
  };

  const removeItem = (variantId: string) => {
    setItems((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.variant.id === variantId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setItems([]);
  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalMinor = items.reduce(
    (sum, item) => sum + item.variant.priceMinor * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotalMinor,
        isOpen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
