"use client";

import {
  ArrowLeft01Icon,
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
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { ChatShell } from "@/components/chat-shell";
import { PageHeader } from "@/components/page-header";
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
  {
    id: "prod_starter_3",
    name: "Pulse Buds",
    variantTitle: "Matte Black",
    price: { amount: 7900, currency: "USD" },
    image: "/products/pulse-buds.png",
  },
];

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart, checkout, addItem } =
    useCart();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);
  const [transactionId, setTransactionId] = useState<string>("");

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session, email, name]);

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
      setError("Please add at least one product to checkout.");
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please provide a valid email address for your order confirmation receipt.");
      return;
    }

    setError(null);
    setStatus("submitting");

    try {
      setStatusMessage("Reserving product inventory & initiating payment provider session...");
      await new Promise((r) => setTimeout(r, 600));

      // Create order and session via Payment Provider
      const order = await checkout(email.trim());

      setStatusMessage("Authorizing payment with secure payment gateway...");
      await new Promise((r) => setTimeout(r, 700));

      // Finalize provider payment confirmation
      const payResult = await confirmPayment(order.id);

      setConfirmedOrder(payResult.order);
      setTransactionId(payResult.transactionId);
      setStatus("confirmed");

      // Save customer email locally for instant order tracking
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("avelor_customer_email", email.trim());
        }
      } catch {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Checkout transaction failed. Please retry.";
      setError(msg);
      setStatus("idle");
    }
  }

  return (
    <ChatShell>
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-4 pb-4 sm:px-8 sm:pb-6">
        <section className="flex max-h-[calc(100dvh-5rem)] w-full max-w-4xl flex-col rounded-[32px] border border-white/50 bg-white/30 p-4 shadow-card backdrop-blur-2xl sm:p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-all hover:bg-surface-hover"
                title="Back to conversation"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2} />
              </Link>
              <PageHeader
                title="Checkout"
                sub={
                  status === "confirmed"
                    ? "Order confirmed"
                    : `${itemCount} ${itemCount === 1 ? "item" : "items"} in your bag`
                }
              />
            </div>
            {items.length > 0 && status !== "confirmed" ? (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-muted transition-colors hover:text-red-500"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 py-4 [scrollbar-width:thin]">
            {status === "confirmed" && confirmedOrder ? (
              /* Success / Receipt Screen */
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="my-auto flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={36} strokeWidth={2.2} />
                </div>
                <h2 className="mt-4 text-2xl font-bold text-foreground">Order Confirmed!</h2>
                <p className="mt-1 text-sm text-muted">
                  Receipt sent to <span className="font-semibold text-foreground">{email}</span>
                </p>

                <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-surface p-4 text-left shadow-card">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-xs text-muted">Order ID</span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      #{confirmedOrder.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border py-2.5">
                    <span className="text-xs text-muted">Transaction ID</span>
                    <span className="font-mono text-xs text-muted">{transactionId}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border py-2.5">
                    <span className="text-xs text-muted">Payment Provider</span>
                    <span className="text-xs font-medium text-foreground">Avelor Gateway</span>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-sm font-semibold text-foreground">Total Paid</span>
                    <span className="text-base font-bold text-foreground font-numbers">
                      {formatPrice(confirmedOrder.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/orders"
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-sm font-semibold text-background shadow-card transition-all hover:opacity-90"
                  >
                    <HugeiconsIcon icon={PackageIcon} size={18} strokeWidth={2} />
                    View Orders
                  </Link>
                  <Link
                    href="/"
                    className="flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-6 text-sm font-semibold text-foreground transition-all hover:bg-surface-hover"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </motion.div>
            ) : items.length === 0 ? (
              /* Empty State */
              <div className="my-auto flex flex-col items-center justify-center py-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-brand-wash text-brand-blue">
                  <HugeiconsIcon icon={ShoppingBag01Icon} size={28} strokeWidth={1.8} />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">
                  Your checkout is empty
                </h3>
                <p className="mt-1 max-w-sm text-xs text-muted">
                  Ask Avelor for product recommendations in chat or add any of our trending items
                  below:
                </p>

                <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
                  {STARTER_PRODUCTS.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex flex-col items-center rounded-2xl border border-border bg-surface p-3 text-center shadow-xs"
                    >
                      <div className="relative size-16 overflow-hidden rounded-xl bg-brand-wash">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <p className="mt-2 truncate text-xs font-semibold text-foreground">
                        {prod.name}
                      </p>
                      <p className="text-[11px] font-medium text-muted">
                        {formatPrice(prod.price)}
                      </p>
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
                        className="mt-2 flex h-7 w-full items-center justify-center gap-1 rounded-lg bg-foreground text-[11px] font-medium text-background transition-all hover:opacity-90"
                      >
                        <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2.5} />
                        Add item
                      </button>
                    </div>
                  ))}
                </div>

                <Link
                  href="/"
                  className="mt-6 flex h-10 items-center justify-center rounded-full bg-brand-blue px-5 text-xs font-semibold text-white shadow-pop transition-all hover:opacity-90"
                >
                  Start Discovery Chat
                </Link>
              </div>
            ) : (
              /* Two-Column Checkout View */
              <form
                onSubmit={handleCheckoutSubmit}
                className="grid grid-cols-1 gap-6 lg:grid-cols-12"
              >
                {/* Left Column: Line Items (supports 1 or multiple products) */}
                <div className="flex flex-col gap-4 lg:col-span-7">
                  <div className="rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
                    <h3 className="text-sm font-semibold text-foreground">
                      Items ({items.length})
                    </h3>
                    <div className="mt-3 flex flex-col divide-y divide-border">
                      {items.map((item) => (
                        <div
                          key={item.variantId}
                          className="flex items-center gap-3 py-3 first:pt-1 last:pb-1"
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-brand-wash">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.title}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.title}
                            </p>
                            <p className="truncate text-xs text-muted">{item.variantTitle}</p>
                            <p className="pt-0.5 text-xs font-medium text-foreground">
                              {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-hover p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                              className="flex size-6 items-center justify-center rounded-lg text-foreground hover:bg-surface active:scale-95"
                              title="Decrease quantity"
                            >
                              <HugeiconsIcon icon={MinusSignIcon} size={12} strokeWidth={2.2} />
                            </button>
                            <span className="w-5 text-center text-xs font-semibold text-foreground font-numbers">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                              className="flex size-6 items-center justify-center rounded-lg text-foreground hover:bg-surface active:scale-95"
                              title="Increase quantity"
                            >
                              <HugeiconsIcon icon={PlusSignIcon} size={12} strokeWidth={2.2} />
                            </button>
                          </div>
                          {/* Total for item & delete */}
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground font-numbers">
                              {formatPrice(item.totalPrice)}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeItem(item.variantId)}
                              className="mt-1 inline-flex text-muted transition-colors hover:text-red-500"
                              title="Remove item"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customer Information (Email & Shipping Destination) */}
                  <div className="rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
                    <h3 className="text-sm font-semibold text-foreground">Shipping Details</h3>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="chk-email"
                          className="block text-xs font-medium text-muted mb-1"
                        >
                          Email Receipt *
                        </label>
                        <input
                          id="chk-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="h-10 w-full rounded-xl border border-border bg-surface-hover px-3 text-sm text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-name"
                          className="block text-xs font-medium text-muted mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="chk-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Morgan"
                          className="h-10 w-full rounded-xl border border-border bg-surface-hover px-3 text-sm text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-address"
                          className="block text-xs font-medium text-muted mb-1"
                        >
                          Street Address
                        </label>
                        <input
                          id="chk-address"
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="123 Discovery Way"
                          className="h-10 w-full rounded-xl border border-border bg-surface-hover px-3 text-sm text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-city"
                          className="block text-xs font-medium text-muted mb-1"
                        >
                          City
                        </label>
                        <input
                          id="chk-city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="San Francisco"
                          className="h-10 w-full rounded-xl border border-border bg-surface-hover px-3 text-sm text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-postal"
                          className="block text-xs font-medium text-muted mb-1"
                        >
                          Postal Code
                        </label>
                        <input
                          id="chk-postal"
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="94105"
                          className="h-10 w-full rounded-xl border border-border bg-surface-hover px-3 text-sm text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Calculations & Payment Provider */}
                <div className="flex flex-col gap-4 lg:col-span-5">
                  {/* Order Calculations */}
                  <div className="rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
                    <h3 className="text-sm font-semibold text-foreground">Order Calculations</h3>
                    <div className="mt-4 flex flex-col gap-2.5 text-xs text-muted">
                      <div className="flex justify-between">
                        <span>Subtotal ({itemCount} items)</span>
                        <span className="font-medium text-foreground font-numbers">
                          {formattedSubtotal}
                        </span>
                      </div>
                      <div className="flex justify-between">
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
                        <p className="text-[11px] text-brand-blue">
                          Add{" "}
                          {formatPrice({
                            amount: FREE_SHIPPING_THRESHOLD_MINOR - subtotalMinor,
                            currency,
                          })}{" "}
                          more for free standard shipping!
                        </p>
                      )}
                      <div className="flex justify-between">
                        <span>Estimated Taxes</span>
                        <span className="font-medium text-foreground font-numbers">$0.00</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                        <span>Total Due</span>
                        <span className="text-lg font-bold font-numbers">{formattedTotal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Provider (Decoupled, zero card entry liability) */}
                  <div className="rounded-3xl border border-border bg-surface p-4 shadow-card sm:p-5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <HugeiconsIcon
                          icon={CreditCardIcon}
                          size={16}
                          className="text-brand-blue"
                        />
                        Payment Provider
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <HugeiconsIcon icon={LockIcon} size={11} strokeWidth={2.4} />
                        PCI-DSS Compliant
                      </span>
                    </div>

                    <div className="mt-3 rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-3 text-xs text-muted">
                      <p className="font-medium text-foreground">
                        Secure Checkout via Payment Gateway
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Payment credentials are authenticated directly through our verified payment
                        provider. Sensitive card details are never entered or stored on our servers.
                      </p>
                    </div>

                    {error ? (
                      <div className="mt-3 rounded-xl border border-red-300/60 bg-red-50/70 p-2.5 text-xs text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
                        {error}
                      </div>
                    ) : null}

                    {status === "submitting" ? (
                      <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-2xl bg-surface-hover py-4 text-center">
                        <div className="size-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
                        <p className="text-xs font-medium text-muted">{statusMessage}</p>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={items.length === 0}
                        className={cn(
                          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-pop transition-all",
                          "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]",
                          "disabled:pointer-events-none disabled:opacity-50"
                        )}
                      >
                        <HugeiconsIcon icon={LockIcon} size={16} strokeWidth={2.2} />
                        Pay {formattedTotal} with Provider
                      </button>
                    )}

                    <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-muted">
                      <span>256-bit SSL</span>
                      <span>·</span>
                      <span>Stripe / Gateway Verified</span>
                      <span>·</span>
                      <span>30-Day Guarantee</span>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </ChatShell>
  );
}
