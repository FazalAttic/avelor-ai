"use client";

import {
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Coupon02Icon,
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
import { TextMorph } from "torph/react";
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

  // Coupon state
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    percentOff?: number;
    freeShipping?: boolean;
    description: string;
  } | null>(null);

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

  function handleApplyCoupon(e?: FormEvent) {
    if (e) e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    if (clean === "AVELOR10" || clean === "SAVE10" || clean === "WELCOME10") {
      setAppliedCoupon({
        code: clean,
        percentOff: 10,
        description: "10% off",
      });
      setCouponError(null);
      setShowCouponInput(false);
    } else if (clean === "AVELOR20" || clean === "SAVE20") {
      setAppliedCoupon({
        code: clean,
        percentOff: 20,
        description: "20% off",
      });
      setCouponError(null);
      setShowCouponInput(false);
    } else if (clean === "WELCOME15" || clean === "SAVE15") {
      setAppliedCoupon({
        code: clean,
        percentOff: 15,
        description: "15% off",
      });
      setCouponError(null);
      setShowCouponInput(false);
    } else if (clean === "FREESHIP" || clean === "SHIPFREE") {
      setAppliedCoupon({
        code: clean,
        freeShipping: true,
        description: "Free shipping",
      });
      setCouponError(null);
      setShowCouponInput(false);
    } else {
      setCouponError("Invalid or expired coupon code");
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  // Financial calculations
  const currency = subtotal.currency || "USD";
  const subtotalMinor = subtotal.amount;
  const isFreeShipping =
    subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR || appliedCoupon?.freeShipping === true;
  const shippingMinor = items.length === 0 ? 0 : isFreeShipping ? 0 : STANDARD_SHIPPING_MINOR;

  let discountMinor = 0;
  if (appliedCoupon?.percentOff) {
    discountMinor = Math.round((subtotalMinor * appliedCoupon.percentOff) / 100);
  }

  const totalMinor = Math.max(0, subtotalMinor - discountMinor + shippingMinor);

  const formattedSubtotal = formatPrice(subtotal);
  const formattedDiscount = formatPrice({ amount: discountMinor, currency });
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

    const orderEmail = email.trim() || session?.user?.email || "";
    if (!orderEmail || !orderEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      setStatusMessage("Processing order...");
      const order = await checkout(orderEmail);

      const payResult = await confirmPayment(order.id);

      setConfirmedOrder(payResult.order);
      setTransactionId(payResult.transactionId);
      setStatus("confirmed");

      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("avelor_customer_email", orderEmail);
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
    setAppliedCoupon(null);
    setCouponInput("");
    setShowCouponInput(false);
    setCouponError(null);
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
            transition={{ duration: 0.2 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Right Sidebar Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="relative z-50 flex h-full w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-pop"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout Drawer"
          >
            {/* Drawer Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {status === "confirmed" ? "Order Confirmed" : "Your Bag"}
                </h2>
                {status !== "confirmed" && itemCount > 0 && (
                  <span className="text-xs text-muted">
                    (<TextMorph as="span">{itemCount}</TextMorph>)
                  </span>
                )}
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
                  className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Close"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-3 [scrollbar-width:thin]">
              {status === "confirmed" && confirmedOrder ? (
                /* Success Screen */
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="my-auto flex flex-col items-center justify-center py-6 text-center"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <HugeiconsIcon icon={CheckmarkBadge01Icon} size={28} strokeWidth={2.2} />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-foreground">Order confirmed</h3>
                  <p className="mt-1 text-xs text-muted">
                    Receipt sent to{" "}
                    <span className="font-medium text-foreground">
                      {email || session?.user?.email}
                    </span>
                  </p>

                  <div className="mt-4 w-full rounded-xl border border-border bg-surface-hover p-3 text-left text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted">Order ID</span>
                      <span className="font-semibold text-foreground">
                        #{confirmedOrder.id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    {transactionId && (
                      <div className="flex items-center justify-between border-b border-border py-2">
                        <span className="text-muted">Transaction ID</span>
                        <span className="text-muted">{transactionId}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-medium text-foreground">Total Paid</span>
                      <span className="font-bold text-foreground">
                        {formatPrice(confirmedOrder.total)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex w-full flex-col gap-2">
                    <Link
                      href="/orders"
                      onClick={handleResetAndClose}
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-xs font-semibold text-background shadow-xs transition-opacity hover:opacity-90"
                    >
                      <HugeiconsIcon icon={PackageIcon} size={15} strokeWidth={2} />
                      View Orders
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
                  <div className="flex size-11 items-center justify-center rounded-full bg-surface-hover text-muted">
                    <HugeiconsIcon icon={ShoppingBag01Icon} size={20} strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">Your bag is empty</h3>
                  <p className="mt-1 text-xs text-muted max-w-[220px]">
                    Ask in chat or pick a trending favorite:
                  </p>

                  <div className="mt-4 flex w-full flex-col gap-2">
                    {STARTER_PRODUCTS.map((prod) => (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-hover p-2 text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-surface">
                            <Image
                              src={prod.image}
                              alt={prod.name}
                              fill
                              sizes="40px"
                              unoptimized
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
                /* Line Items & Calculations */
                <div>
                  <div className="flex flex-col divide-y divide-border">
                    {items.map((item) => (
                      <div key={item.variantId} className="flex items-center gap-3 py-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-brand-wash">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="48px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="truncate text-[11px] text-muted">{item.variantTitle}</p>
                            </div>
                            <p className="shrink-0 text-xs font-semibold text-foreground">
                              <TextMorph as="span">{formatPrice(item.totalPrice)}</TextMorph>
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-[11px] text-muted">{formatPrice(item.unitPrice)}</p>
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-hover px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                                className="flex size-5 items-center justify-center rounded text-muted hover:text-foreground active:scale-95"
                              >
                                <HugeiconsIcon icon={MinusSignIcon} size={10} strokeWidth={2.4} />
                              </button>
                              <span className="w-5 text-center text-xs font-medium text-foreground">
                                <TextMorph as="span">{item.quantity}</TextMorph>
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="flex size-5 items-center justify-center rounded text-muted hover:text-foreground active:scale-95"
                              >
                                <HugeiconsIcon icon={PlusSignIcon} size={10} strokeWidth={2.4} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Option */}
                  <div className="mt-3 border-t border-border pt-3">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <HugeiconsIcon icon={Coupon02Icon} size={14} strokeWidth={2} />
                          <span className="font-semibold uppercase">{appliedCoupon.code}</span>
                          <span className="text-[11px] opacity-80">
                            ({appliedCoupon.description})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {discountMinor > 0 && (
                            <span className="font-semibold">-{formattedDiscount}</span>
                          )}
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-muted hover:text-foreground transition-colors"
                            title="Remove coupon"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={13} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ) : showCouponInput ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              setCouponError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="Enter coupon code"
                            className="h-8 flex-1 rounded-xl border border-border bg-surface-hover px-2.5 text-xs text-foreground uppercase placeholder:normal-case placeholder:text-muted focus:border-brand-blue focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={!couponInput.trim()}
                            className="flex h-8 items-center justify-center rounded-xl bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCouponInput(false);
                              setCouponError(null);
                            }}
                            className="flex size-8 items-center justify-center rounded-xl text-muted hover:text-foreground"
                            title="Cancel"
                          >
                            <HugeiconsIcon icon={Cancel01Icon} size={14} />
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-[11px] text-red-500 pl-0.5">{couponError}</p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCouponInput(true)}
                        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
                      >
                        <HugeiconsIcon icon={Coupon02Icon} size={14} strokeWidth={2} />
                        <span>Do you have a coupon?</span>
                      </button>
                    )}
                  </div>

                  {/* Calculations */}
                  <div className="mt-3 border-t border-border pt-3 text-xs text-muted flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-foreground">
                        <TextMorph as="span">{formattedSubtotal}</TextMorph>
                      </span>
                    </div>
                    {discountMinor > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Discount ({appliedCoupon?.code})</span>
                        <span className="font-medium">
                          -<TextMorph as="span">{formattedDiscount}</TextMorph>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span
                        className={cn(
                          "font-medium",
                          isFreeShipping ? "text-emerald-600 font-semibold" : "text-foreground"
                        )}
                      >
                        <TextMorph as="span">{formattedShipping}</TextMorph>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
                      <span>Total</span>
                      <span className="text-base font-bold">
                        <TextMorph as="span">{formattedTotal}</TextMorph>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {items.length > 0 && status !== "confirmed" ? (
              <form onSubmit={handleCheckoutSubmit} className="shrink-0 border-t border-border p-4">
                {!session?.user?.email && (
                  <div className="mb-3">
                    <input
                      id="drawer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email for receipt"
                      className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                    />
                  </div>
                )}

                {error ? (
                  <div className="mb-3 rounded-lg border border-red-300/60 bg-red-50/70 p-2 text-[11px] text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                {status === "submitting" ? (
                  <div className="flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#2a2c30] to-[#141517] text-xs font-medium text-white/80 shadow-xs">
                    <div className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                    <span>{statusMessage}</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-full",
                      "bg-gradient-to-b from-[#34373d] via-[#1f2125] to-[#121316]",
                      "border border-white/15 text-[13px] font-semibold text-white",
                      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.25)]",
                      "transition-all duration-200 ease-out",
                      "hover:from-[#3c4048] hover:via-[#25282d] hover:to-[#16171b] hover:border-white/25 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.3)]",
                      "active:scale-[0.985] active:from-[#24262a] active:to-[#0f1012] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
                      "cursor-pointer select-none"
                    )}
                  >
                    {/* Top specular light gleam overlay */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent opacity-80"
                    />
                    <span className="relative z-10 flex items-center gap-1">
                      <span>Checkout · </span>
                      <TextMorph as="span">{formattedTotal}</TextMorph>
                    </span>
                  </button>
                )}
              </form>
            ) : null}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
