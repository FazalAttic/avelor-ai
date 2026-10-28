"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addItemToCart,
  type ChatMoney,
  type ChatProduct,
  type ChatVariant,
  checkoutCart,
  createCart,
  fetchCart,
  removeItemFromCart,
  type StoreOrder,
} from "./chat-api";

export interface CartItem {
  readonly id: string;
  readonly variantId: string;
  readonly productId: string;
  readonly title: string;
  readonly variantTitle: string;
  readonly unitPrice: ChatMoney;
  readonly quantity: number;
  readonly totalPrice: ChatMoney;
  readonly image?: string;
}

interface CartContextValue {
  readonly items: readonly CartItem[];
  readonly cartId: string | null;
  readonly itemCount: number;
  readonly subtotal: ChatMoney;
  readonly isSyncing: boolean;
  readonly addItem: (
    product: ChatProduct,
    variant?: ChatVariant,
    quantity?: number
  ) => Promise<void>;
  readonly updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  readonly removeItem: (variantId: string) => Promise<void>;
  readonly clearCart: () => void;
  readonly checkout: (customerEmail: string) => Promise<StoreOrder>;
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_ITEMS_KEY = "avelor_cart_items";
const CART_ID_KEY = "avelor_cart_id";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartId, setCartId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Restore cart on mount
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem(CART_ITEMS_KEY);
      const storedId = localStorage.getItem(CART_ID_KEY);
      if (storedItems) {
        const parsed = JSON.parse(storedItems) as CartItem[];
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
      if (storedId) {
        setCartId(storedId);
        // Optionally verify with server
        fetchCart(storedId)
          .then((remote) => {
            if (remote && remote.items.length > 0) {
              setItems((prev) => {
                // If local items exist, keep the enriched data (like image); otherwise map from remote
                if (prev.length > 0) return prev;
                return remote.items.map((i) => ({
                  id: `${i.variantId}_${Date.now()}`,
                  variantId: i.variantId,
                  productId: i.productId,
                  title: i.title,
                  variantTitle: i.title,
                  unitPrice: i.unitPrice,
                  quantity: i.quantity,
                  totalPrice: i.totalPrice,
                  image: "/products/volt-runner.png",
                }));
              });
            }
          })
          .catch(() => {});
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setInitialized(true);
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
      if (cartId) {
        localStorage.setItem(CART_ID_KEY, cartId);
      } else {
        localStorage.removeItem(CART_ID_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }, [items, cartId, initialized]);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const subtotal = useMemo<ChatMoney>(() => {
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice.amount, 0);
    const currency = items[0]?.unitPrice.currency ?? "USD";
    return { amount: totalAmount, currency };
  }, [items]);

  const ensureRemoteCart = useCallback(async (): Promise<string> => {
    if (cartId) return cartId;
    try {
      const newCart = await createCart();
      setCartId(newCart.id);
      return newCart.id;
    } catch {
      const fallbackId = `cart_${crypto.randomUUID()}`;
      setCartId(fallbackId);
      return fallbackId;
    }
  }, [cartId]);

  const addItem = useCallback(
    async (product: ChatProduct, variant?: ChatVariant, quantity = 1) => {
      const chosenVariant = variant ?? product.variants[0];
      if (!chosenVariant) return;

      const unitPrice = chosenVariant.price ?? { amount: 0, currency: "USD" };
      const image = product.media[0] ?? "/products/volt-runner.png";

      // Optimistic state update
      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.variantId === chosenVariant.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const existing = updated[existingIdx];
          if (!existing) return prev;
          const newQty = existing.quantity + quantity;
          updated[existingIdx] = {
            ...existing,
            quantity: newQty,
            totalPrice: {
              amount: existing.unitPrice.amount * newQty,
              currency: existing.unitPrice.currency,
            },
          };
          return updated;
        }

        const newItem: CartItem = {
          id: `${chosenVariant.id}_${Date.now()}`,
          variantId: chosenVariant.id,
          productId: product.id,
          title: product.name,
          variantTitle: chosenVariant.title || "Standard",
          unitPrice,
          quantity,
          totalPrice: {
            amount: unitPrice.amount * quantity,
            currency: unitPrice.currency,
          },
          image,
        };
        return [newItem, ...prev];
      });

      // Background backend sync
      try {
        setIsSyncing(true);
        const remoteCartId = await ensureRemoteCart();
        await addItemToCart(remoteCartId, chosenVariant.id, quantity);
      } catch {
        // Optimistic state is retained even if server cart sync encounters a transient error
      } finally {
        setIsSyncing(false);
      }
    },
    [ensureRemoteCart]
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
        if (cartId) {
          removeItemFromCart(cartId, variantId).catch(() => {});
        }
        return;
      }

      setItems((prev) =>
        prev.map((item) => {
          if (item.variantId !== variantId) return item;
          return {
            ...item,
            quantity,
            totalPrice: {
              amount: item.unitPrice.amount * quantity,
              currency: item.unitPrice.currency,
            },
          };
        })
      );
    },
    [cartId]
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      if (cartId) {
        try {
          await removeItemFromCart(cartId, variantId);
        } catch {
          // Ignore
        }
      }
    },
    [cartId]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setCartId(null);
    try {
      localStorage.removeItem(CART_ITEMS_KEY);
      localStorage.removeItem(CART_ID_KEY);
    } catch {}
  }, []);

  const checkout = useCallback(
    async (customerEmail: string): Promise<StoreOrder> => {
      if (items.length === 0) {
        throw new Error("Your cart is empty. Please add items before checking out.");
      }

      const activeCartId = await ensureRemoteCart();

      // Ensure all current items are recorded in the server cart
      try {
        for (const item of items) {
          await addItemToCart(activeCartId, item.variantId, item.quantity);
        }
      } catch {
        // Continue with checkout attempt
      }

      const idempotencyKey = `idemp_chk_${crypto.randomUUID()}`;
      const order = await checkoutCart(activeCartId, customerEmail, idempotencyKey);

      clearCart();
      return order;
    },
    [items, ensureRemoteCart, clearCart]
  );

  const value = useMemo(
    () => ({
      items,
      cartId,
      itemCount,
      subtotal,
      isSyncing,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      checkout,
    }),
    [
      items,
      cartId,
      itemCount,
      subtotal,
      isSyncing,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      checkout,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
