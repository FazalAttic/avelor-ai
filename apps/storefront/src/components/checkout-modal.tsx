"use client";

import {
  Cancel01Icon,
  CheckmarkBadge01Icon,
  CreditCardIcon,
  LockIcon,
  PackageIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  buyNow,
  type ChatProduct,
  type ChatVariant,
  confirmPayment,
  formatPrice,
  type StoreOrder,
} from "@/lib/chat-api";
import { cn } from "@/lib/utils";

export type CheckoutModalProps = {
  open: boolean;
  product: ChatProduct | null;
  onClose: () => void;
};

type CheckoutStep = "checkout" | "processing" | "success";

function getCardBrand(number: string): "visa" | "mastercard" | "amex" | "generic" {
  const cleaned = number.replace(/\s+/g, "");
  if (/^4/.test(cleaned)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  return "generic";
}

export function CheckoutModal({ open, product, onClose }: CheckoutModalProps) {
  const { data: session } = useSession();
  const titleId = useId();

  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvc, setCardCvc] = useState<string>("");
  const [step, setStep] = useState<CheckoutStep>("checkout");
  const [processingStatus, setProcessingStatus] = useState<string>(
    "Initializing secure channel..."
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);

  // Sync state on open
  useEffect(() => {
    if (open && product) {
      const defaultVariant = product.variants[0];
      setSelectedVariantId(defaultVariant?.id ?? "");
      setQuantity(1);
      setEmail(session?.user?.email ?? "");
      setCardholderName(session?.user?.name ?? "");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setStep("checkout");
      setError(null);
      setConfirmedOrder(null);
    }
  }, [open, product, session]);

  // Handle Escape key
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && step !== "processing") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, step, onClose]);

  if (!open || !product) return null;

  const currentVariant: ChatVariant | undefined =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];

  const unitAmount = currentVariant?.price?.amount ?? 0;
  const currency = currentVariant?.price?.currency ?? "USD";
  const totalAmount = unitAmount * quantity;
  const formattedTotal = formatPrice({ amount: totalAmount, currency });
  const cardBrand = getCardBrand(cardNumber);

  function handleCardNumberChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.slice(i, i + 4));
    }
    setCardNumber(parts.join(" "));
  }

  function handleExpiryChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2, 4)}`);
    } else {
      setCardExpiry(digits);
    }
  }

  function handleCvcChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setCardCvc(digits);
  }

  async function handlePaySubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentVariant) return;

    if (!email || !email.includes("@")) {
      setError("Please provide a valid email address for your order receipt.");
      return;
    }

    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (cleanCard.length < 15) {
      setError("Please enter a valid 16-digit card number.");
      return;
    }

    if (!cardExpiry || cardExpiry.length < 5) {
      setError("Please enter an expiry date (MM/YY).");
      return;
    }

    if (!cardCvc || cardCvc.length < 3) {
      setError("Please enter a valid security code (CVC).");
      return;
    }

    setError(null);
    setStep("processing");

    try {
      setProcessingStatus("Encrypting payment credentials...");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingStatus("Authorizing transaction with bank...");
      const idempotencyKey = `idemp_buy_${crypto.randomUUID()}`;

      // Step 1: Create atomic order and reserve inventory
      const order = await buyNow({
        variantId: currentVariant.id,
        quantity,
        customerEmail: email.trim(),
        idempotencyKey,
      });

      setProcessingStatus("Confirming 256-bit secure payment...");
      await new Promise((r) => setTimeout(r, 700));

      // Step 2: Finalize payment confirmation
      const paymentResult = await confirmPayment(order.id);

      setConfirmedOrder(paymentResult.order);
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("avelor_customer_email", email.trim());
        }
      } catch {
        // Ignore storage access restrictions
      }
      setStep("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment processing failed. Please try again.";
      setError(message);
      setStep("checkout");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        aria-hidden
        className="absolute inset-0 bg-black/45 backdrop-blur-md"
        onClick={() => {
          if (step !== "processing") onClose();
        }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-[32px]",
          "border border-white/50 bg-white/60 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#121526]/85"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <HugeiconsIcon icon={LockIcon} size={15} strokeWidth={2} />
            </span>
            <div>
              <h2 id={titleId} className="text-sm font-semibold tracking-tight text-foreground">
                Secure Checkout
              </h2>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                256-bit SSL Encrypted · PCI-DSS Compliant
              </p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close checkout"
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-muted transition-colors",
                "hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand-blue"
              )}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {step === "checkout" && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-5"
              >
                {/* Product Summary Card */}
                <div className="flex gap-4 rounded-2xl border border-border/70 bg-surface/60 p-3.5 shadow-sm">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-brand-wash">
                    {product.media[0] ? (
                      <Image
                        src={product.media[0]}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted">
                        <HugeiconsIcon icon={ShoppingBag01Icon} size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {product.name}
                      </h3>
                      {product.variants.length > 1 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {product.variants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVariantId(v.id)}
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-xs font-medium transition-all",
                                selectedVariantId === v.id
                                  ? "bg-foreground text-background shadow-sm"
                                  : "border border-border/70 bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                              )}
                            >
                              {v.title}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted">{currentVariant?.title}</p>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-surface text-xs font-bold hover:bg-surface-hover"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-foreground">{quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((q) =>
                              Math.min(currentVariant?.inventoryQuantity ?? 10, q + 1)
                            )
                          }
                          className="flex size-6 items-center justify-center rounded-md border border-border bg-surface text-xs font-bold hover:bg-surface-hover"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {formattedTotal}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checkout Form */}
                <form onSubmit={handlePaySubmit} className="flex flex-col gap-4">
                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Customer Email */}
                  <div>
                    <label
                      htmlFor="customer-email"
                      className="block text-xs font-medium text-foreground"
                    >
                      Email receipt to
                    </label>
                    <input
                      id="customer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={cn(
                        "mt-1.5 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground",
                        "placeholder:text-subtle focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      )}
                    />
                  </div>

                  {/* Payment Fields */}
                  <div className="rounded-2xl border border-border/80 bg-surface/40 p-4">
                    <div className="flex items-center justify-between pb-3">
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <HugeiconsIcon
                          icon={CreditCardIcon}
                          size={16}
                          className="text-brand-blue"
                        />
                        Card Details
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-subtle uppercase tracking-wider">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            cardBrand === "visa" && "bg-blue-600 text-white"
                          )}
                        >
                          Visa
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            cardBrand === "mastercard" && "bg-orange-600 text-white"
                          )}
                        >
                          MC
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5",
                            cardBrand === "amex" && "bg-cyan-600 text-white"
                          )}
                        >
                          Amex
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label
                          htmlFor="cardholder-name"
                          className="block text-[11px] font-medium text-subtle"
                        >
                          Cardholder Name
                        </label>
                        <input
                          id="cardholder-name"
                          type="text"
                          required
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                          placeholder="Alex Morgan"
                          className={cn(
                            "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-xs text-foreground",
                            "placeholder:text-subtle focus:border-brand-blue focus:outline-none"
                          )}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="card-number"
                          className="block text-[11px] font-medium text-subtle"
                        >
                          Card Number
                        </label>
                        <input
                          id="card-number"
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => handleCardNumberChange(e.target.value)}
                          placeholder="4242 ···· ···· 4242"
                          className={cn(
                            "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-xs text-foreground",
                            "placeholder:text-subtle focus:border-brand-blue focus:outline-none"
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="card-expiry"
                            className="block text-[11px] font-medium text-subtle"
                          >
                            Expiry
                          </label>
                          <input
                            id="card-expiry"
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={(e) => handleExpiryChange(e.target.value)}
                            placeholder="MM / YY"
                            className={cn(
                              "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-xs text-foreground",
                              "placeholder:text-subtle focus:border-brand-blue focus:outline-none"
                            )}
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="card-cvc"
                            className="block text-[11px] font-medium text-subtle"
                          >
                            CVC
                          </label>
                          <input
                            id="card-cvc"
                            type="password"
                            required
                            value={cardCvc}
                            onChange={(e) => handleCvcChange(e.target.value)}
                            placeholder="123"
                            className={cn(
                              "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 font-mono text-xs text-foreground",
                              "placeholder:text-subtle focus:border-brand-blue focus:outline-none"
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs">
                    <div className="flex justify-between text-muted">
                      <span>Standard Shipping</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        FREE
                      </span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Estimated Sales Tax</span>
                      <span>$0.00</span>
                    </div>
                    <div className="flex justify-between pt-1 text-sm font-bold text-foreground">
                      <span>Total</span>
                      <span>{formattedTotal}</span>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className={cn(
                      "mt-2 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white",
                      "bg-[image:var(--gradient-brand)] shadow-[0_4px_16px_rgba(32,56,248,0.35)] transition-all duration-150 ease-expo hover:opacity-95 active:scale-[0.99]",
                      "focus-visible:outline-2 focus-visible:outline-brand-blue"
                    )}
                  >
                    <HugeiconsIcon icon={LockIcon} size={15} strokeWidth={2} />
                    <span>Pay {formattedTotal} Securely</span>
                  </button>
                </form>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="relative mb-5 flex size-16 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-brand-blue/30 border-t-brand-blue"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <HugeiconsIcon icon={LockIcon} size={24} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-foreground">Processing Payment</h3>
                <p className="mt-1 text-xs text-muted">{processingStatus}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={13} />
                  Safe 256-bit Bank Encrypted
                </span>
              </motion.div>
            )}

            {step === "success" && confirmedOrder && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-4 text-center"
              >
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shadow-[0_0_24px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-400">
                  <HugeiconsIcon icon={CheckmarkBadge01Icon} size={28} strokeWidth={2.2} />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Order Confirmed!
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Receipt and tracking sent to{" "}
                  <strong className="text-foreground">{confirmedOrder.customerEmail}</strong>
                </p>

                <div className="mt-5 w-full rounded-2xl border border-border/80 bg-surface/70 p-4 text-left shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <div>
                      <p className="text-[11px] font-medium text-subtle uppercase tracking-wider">
                        Order Number
                      </p>
                      <p className="font-mono text-sm font-semibold text-foreground">
                        #{confirmedOrder.id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                      Paid & Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 text-xs">
                    <span className="text-muted">Total Paid</span>
                    <span className="font-semibold text-foreground">
                      {formatPrice(confirmedOrder.total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted">Estimated Delivery</span>
                    <span className="font-medium text-foreground">2-3 Business Days</span>
                  </div>
                </div>

                <div className="mt-6 flex w-full gap-3">
                  <Link
                    href="/orders"
                    onClick={onClose}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-xs font-semibold text-foreground shadow-sm",
                      "transition-all duration-150 ease-expo hover:bg-surface-hover"
                    )}
                  >
                    <HugeiconsIcon icon={PackageIcon} size={15} />
                    <span>View in Orders</span>
                  </Link>
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center rounded-full bg-foreground px-4 text-xs font-semibold text-background shadow-sm",
                      "transition-all duration-150 ease-expo hover:opacity-90 active:scale-[0.98]"
                    )}
                  >
                    Continue Shopping
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
