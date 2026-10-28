"use client";

import {
  Cancel01Icon,
  CheckmarkBadge01Icon,
  CreditCardIcon,
  Delete02Icon,
  LockIcon,
  MinusSignIcon,
  PackageIcon,
  PlusSignIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/lib/cart-context";
import { confirmPayment, formatPrice, type StoreOrder } from "@/lib/chat-api";
import { cn } from "@/lib/utils";

const FREE_SHIPPING_THRESHOLD_MINOR = 7500; // $75.00
const STANDARD_SHIPPING_MINOR = 1000; // $10.00

const STARTER_PRODUCTS = [
  {
    id: "prod_starter_1",
    name: "Volt Runner",
    variantTitle: "Size 42 / Neon",
    price: { amount: 12900, currency: "USD" },
    image: "/products/volt-runner.png",
  },
  {
    id: "prod_starter_2",
    name: "Drift Hoodie",
    variantTitle: "Size L / Obsidian",
    price: { amount: 8900, currency: "USD" },
    image: "/products/drift-hoodie.png",
  },
];

export function CheckoutDrawer() {
  const { data: session } = useSession();
  const {
    items,
    itemCount,
    subtotal,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeItem,
    clearCart,
    checkout,
    addItem,
  } = useCart();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);
  const [transactionId, setTransactionId] = useState<string>("");

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [session, email]);

  // Handle escape key
  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen, closeDrawer]);

  // Financial calculations
  const currency = subtotal.currency || "USD";
  const subtotalMinor = subtotal.amount;
  const isFreeShipping = subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR;
  const shippingMinor = items.length === 0 ? 0 : isFreeShipping ? 0 : STANDARD_SHIPPING_MINOR;
  const totalMinor = subtotalMinor + shippingMinor;

  const formattedSubtotal = formatPrice(subtotal);
  const formattedShipping =
    items.length === 0
      ? "$0.00"
      : isFreeShipping
        ? "FREE"
        : formatPrice({ amount: shippingMinor, currency });
  const formattedTotal = formatPrice({ amount: totalMinor, currency });

  async function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Please add at least one product.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid receipt email.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      setStatusMessage("Reserving items & initiating payment session...");
      await new Promise((r) => setTimeout(r, 500));

      const order = await checkout(email.trim());

      setStatusMessage("Authorizing payment with provider gateway...");
      await new Promise((r) => setTimeout(r, 600));

      const payResult = await confirmPayment(order.id);

      setConfirmedOrder(payResult.order);
      setTransactionId(payResult.transactionId);
      setStatus("confirmed");

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("avelor_customer_email", email.trim());
        }
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment processing failed. Please retry.";
      setError(msg);
      setStatus("idle");
    }
  }

  function handleResetAndClose() {
    setStatus("idle");
    setConfirmedOrder(null);
    setTransactionId("");
    setError(null);
    closeDrawer();
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Right Sidebar Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-50 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-surface shadow-pop"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout Drawer"
          >
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-brand-wash text-brand-blue">
                  <HugeiconsIcon icon={ShoppingBag01Icon} size={18} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    {status === "confirmed" ? "Order Confirmed" : "Your Bag"}
                  </h2>
                  <p className="text-[11px] text-muted font-numbers">
                    {status === "confirmed"
                      ? "Payment successful"
                      : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {items.length > 0 && status !== "confirmed" ? (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-muted transition-colors hover:text-red-500"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Close sidebar"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
              {status === "confirmed" && confirmedOrder ? (
                /* Success Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="my-auto flex flex-col items-center justify-center py-6 text-center"
                >
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} size={32} strokeWidth={2.2} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-foreground">
                    Thank you for your order!
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Confirmation receipt sent to{" "}
                    <span className="font-semibold text-foreground">{email}</span>
                  </p>

                  <div className="mt-5 w-full rounded-2xl border border-border bg-surface-hover p-3.5 text-left text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted">Order ID</span>
                      <span className="font-mono font-semibold text-foreground">
                        #{confirmedOrder.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border py-2">
                      <span className="text-muted">Transaction ID</span>
                      <span className="font-mono text-muted">{transactionId}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-semibold text-foreground">Total Paid</span>
                      <span className="font-bold text-foreground font-numbers">
                        {formatPrice(confirmedOrder.total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex w-full flex-col gap-2">
                    <Link
                      href="/orders"
                      onClick={handleResetAndClose}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-xs font-semibold text-background shadow-xs transition-opacity hover:opacity-90"
                    >
                      <HugeiconsIcon icon={PackageIcon} size={15} strokeWidth={2} />
                      View All Orders
                    </Link>
                    <button
                      type="button"
                      onClick={handleResetAndClose}
                      className="flex h-10 w-full items-center justify-center rounded-xl border border-border text-xs font-semibold text-foreground transition-colors hover:bg-surface-hover"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </motion.div>
              ) : items.length === 0 ? (
                /* Empty Bag State */
                <div className="my-auto flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-brand-wash text-brand-blue">
                    <HugeiconsIcon icon={ShoppingBag01Icon} size={22} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">Your bag is empty</h3>
                  <p className="mt-1 text-xs text-muted max-w-[240px]">
                    Browse products in chat or quickly add popular picks:
                  </p>

                  <div className="mt-4 flex w-full flex-col gap-2">
                    {STARTER_PRODUCTS.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-hover p-2.5 text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                            <Image
                              src={prod.image}
                              alt={prod.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {prod.name}
                            </p>
                            <p className="text-[11px] text-muted">{formatPrice(prod.price)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            addItem({
                              id: prod.id,
                              name: prod.name,
                              description: "",
                              categories: [],
                              media: [prod.image],
                              variants: [
                                {
                                  id: `var_${prod.id}`,
                                  title: prod.variantTitle,
                                  price: prod.price,
                                  inventoryQuantity: 10,
                                },
                              ],
                            })
                          }
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-90"
                          title="Add item"
                        >
                          <HugeiconsIcon icon={PlusSignIcon} size={14} strokeWidth={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Items List & Summary */
                <div className="flex flex-col gap-4">
                  {/* Items List */}
                  <div className="flex flex-col divide-y divide-border">
                    {items.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-brand-wash">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {item.title}
                          </p>
                          <p className="truncate text-[11px] text-muted">{item.variantTitle}</p>
                          <p className="pt-0.5 text-xs font-medium text-foreground">
                            {formatPrice(item.unitPrice)}
                          </p>
                        </div>
                        {/* Stepper */}
                        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-hover p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="flex size-5 items-center justify-center rounded text-foreground hover:bg-surface active:scale-95"
                          >
                            <HugeiconsIcon icon={MinusSignIcon} size={10} strokeWidth={2.4} />
                          </button>
                          <span className="w-4 text-center text-xs font-semibold text-foreground font-numbers">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="flex size-5 items-center justify-center rounded text-foreground hover:bg-surface active:scale-95"
                          >
                            <HugeiconsIcon icon={PlusSignIcon} size={10} strokeWidth={2.4} />
                          </button>
                        </div>
                        {/* Price & Delete */}
                        <div className="text-right">
                          <p className="text-xs font-semibold text-foreground font-numbers">
                            {formatPrice(item.totalPrice)}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.variantId)}
                            className="mt-1 text-muted transition-colors hover:text-red-500"
                            title="Remove item"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calculations Breakdown */}
                  <div className="rounded-2xl border border-border bg-surface-hover p-3.5 text-xs text-muted">
                    <div className="flex justify-between py-1">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground font-numbers">
                        {formattedSubtotal}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Shipping</span>
                      <span
                        className={cn(
                          "font-medium",
                          isFreeShipping
                            ? "text-emerald-600 font-semibold"
                            : "text-foreground font-numbers"
                        )}
                      >
                        {formattedShipping}
                      </span>
                    </div>
                    {!isFreeShipping && (
                      <p className="pt-1 text-[11px] text-brand-blue">
                        Add{" "}
                        {formatPrice({
                          amount: FREE_SHIPPING_THRESHOLD_MINOR - subtotalMinor,
                          currency,
                        })}{" "}
                        more for free shipping
                      </p>
                    )}
                    <div className="flex justify-between py-1">
                      <span>Estimated Tax</span>
                      <span className="font-medium text-foreground font-numbers">$0.00</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                      <span>Total Due</span>
                      <span className="text-base font-numbers">{formattedTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer (Payment Provider Form) */}
            {items.length > 0 && status !== "confirmed" ? (
              <form onSubmit={handleCheckoutSubmit} className="shrink-0 border-t border-border p-5">
                <div className="mb-3">
                  <label
                    htmlFor="drawer-email"
                    className="block text-[11px] font-medium text-muted mb-1"
                  >
                    Email for order receipt *
                  </label>
                  <input
                    id="drawer-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                  />
                </div>

                <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-blue/5 border border-brand-blue/15 px-3 py-2 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <HugeiconsIcon icon={CreditCardIcon} size={14} className="text-brand-blue" />
                    Payment Gateway
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon icon={LockIcon} size={10} strokeWidth={2.4} />
                    PCI-DSS Encrypted
                  </span>
                </div>

                {error ? (
                  <div className="mb-3 rounded-lg border border-red-300/60 bg-red-50/70 p-2 text-[11px] text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                {status === "submitting" ? (
                  <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-hover text-xs font-medium text-muted">
                    <div className="size-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                    <span>{statusMessage}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-xs font-semibold text-background shadow-pop transition-all hover:bg-foreground/90 active:scale-[0.98]"
                  >
                    <HugeiconsIcon icon={LockIcon} size={14} strokeWidth={2.2} />
                    Pay {formattedTotal} with Provider
                  </button>
                )}

                <p className="mt-2 text-center text-[10px] text-muted">
                  256-bit SSL · Direct gateway checkout · Zero card retention
                </p>
              </form>
            ) : null}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
