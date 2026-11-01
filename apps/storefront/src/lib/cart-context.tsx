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
import { sound } from "./sound";

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
  readonly isDrawerOpen: boolean;
  readonly openDrawer: () => void;
  readonly closeDrawer: () => void;
  readonly toggleDrawer: () => void;
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

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
        // Verify with server immediately
        fetchCart(storedId)
          .then((remote) => {
            if (!remote) {
              // Stale cart ID in localStorage (e.g. server restarted or expired), clear it
              setCartId(null);
              try {
                localStorage.removeItem(CART_ID_KEY);
              } catch {}
              return;
            }
            if (remote.items.length > 0) {
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
          .catch(() => {
            setCartId(null);
            try {
              localStorage.removeItem(CART_ID_KEY);
            } catch {}
          });
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
    if (cartId) {
      try {
        const remote = await fetchCart(cartId);
        if (remote) return remote.id;
      } catch {
        // Stale or invalid cartId, fallback to creating fresh
      }
    }
    const newCart = await createCart();
    setCartId(newCart.id);
    return newCart.id;
  }, [cartId]);

  const addItem = useCallback(
    async (product: ChatProduct, variant?: ChatVariant, quantity = 1) => {
      const chosenVariant = variant ?? product.variants[0];
      if (!chosenVariant) return;

      sound.addCart();

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
        let remoteCartId = await ensureRemoteCart();
        try {
          await addItemToCart(remoteCartId, chosenVariant.id, quantity);
        } catch {
          // If the server cart was stale or expired, create a fresh one and retry
          const freshCart = await createCart();
          setCartId(freshCart.id);
          remoteCartId = freshCart.id;
          await addItemToCart(remoteCartId, chosenVariant.id, quantity);
        }
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

      // Helper to instantiate a fresh server cart containing current client line items
      const createAndPopulateRemoteCart = async (): Promise<string> => {
        const newCart = await createCart();
        setCartId(newCart.id);
        for (const item of items) {
          await addItemToCart(newCart.id, item.variantId, item.quantity);
        }
        return newCart.id;
      };

      // Ensure we have a valid, populated server cart
      let activeCartId: string;
      if (cartId) {
        try {
          const remote = await fetchCart(cartId);
          if (remote) {
            // Cart exists on server. Ensure items are present
            if (remote.items.length === 0 && items.length > 0) {
              for (const item of items) {
                await addItemToCart(cartId, item.variantId, item.quantity);
              }
            }
            activeCartId = remote.id;
          } else {
            activeCartId = await createAndPopulateRemoteCart();
          }
        } catch {
          activeCartId = await createAndPopulateRemoteCart();
        }
      } else {
        activeCartId = await createAndPopulateRemoteCart();
      }

      const idempotencyKey = `idemp_chk_${crypto.randomUUID()}`;

      try {
        const order = await checkoutCart(activeCartId, customerEmail, idempotencyKey);
        clearCart();
        return order;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Self-heal: if the server reported CART_NOT_FOUND or cart expired/lost, recreate and retry
        if (errMsg.includes("not found") || errMsg.includes("CART_NOT_FOUND")) {
          const freshCartId = await createAndPopulateRemoteCart();
          const retryKey = `idemp_chk_${crypto.randomUUID()}`;
          const order = await checkoutCart(freshCartId, customerEmail, retryKey);
          clearCart();
          return order;
        }
        throw err;
      }
    },
    [items, cartId, clearCart]
  );

  const value = useMemo(
    () => ({
      items,
      cartId,
      itemCount,
      subtotal,
      isSyncing,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
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
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
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
