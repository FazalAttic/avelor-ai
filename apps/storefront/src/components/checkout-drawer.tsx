"use client";

import {
  ArrowLeft01Icon,
  Cancel01Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle02Icon,
  Coupon02Icon,
  Home01Icon,
  Location01Icon,
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
import { UserAvatar } from "@/components/user-avatar";
import { useSession } from "@/lib/auth-client";
import { useCart } from "@/lib/cart-context";
import {
  confirmPayment,
  formatPrice,
  type ShippingAddressPayload,
  type StoreOrder,
} from "@/lib/chat-api";
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

const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Singapore",
  "France",
  "Japan",
  "Other",
];

export type CheckoutStep = "bag" | "address" | "payment" | "confirmed";

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

  const [step, setStep] = useState<CheckoutStep>("bag");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "confirmed">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<StoreOrder | null>(null);
  const [transactionId, setTransactionId] = useState<string>("");

  // Address State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("India");
  const [line1, setLine1] = useState(""); // Flat, House no, Building, Apartment
  const [line2, setLine2] = useState(""); // Area, Street, Sector, Village
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isDefault, setIsDefault] = useState(true);

  // Map / GPS Location State
  const [isLocating, setIsLocating] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod" | "sandbox">("online");

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

  // Load saved default address & session details on mount
  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
    if (session?.user?.name && !fullName) {
      setFullName(session.user.name);
    }

    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("avelor_default_address");
        if (saved) {
          const parsed: ShippingAddressPayload = JSON.parse(saved);
          if (parsed.fullName) setFullName(parsed.fullName);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.line1) setLine1(parsed.line1);
          if (parsed.line2) setLine2(parsed.line2);
          if (parsed.landmark) setLandmark(parsed.landmark);
          if (parsed.pincode) setPincode(parsed.pincode);
          if (parsed.city) setCity(parsed.city);
          if (parsed.state) setState(parsed.state);
          if (parsed.coordinates) setCoordinates(parsed.coordinates);
        }
      }
    } catch {}
  }, [session, email, fullName]);

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

  // Geolocation detector & auto-reverse geocoder
  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);
    setLocationSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setCoordinates({ lat, lng, accuracy });
        setLocationSuccessMsg(`📍 Pin captured: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        // Reverse-geocode to auto-populate manual fields
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data?.address;
            if (addr) {
              if (addr.country && COUNTRIES.includes(addr.country)) {
                setCountry(addr.country);
              }
              if (addr.state && !state) {
                setState(addr.state);
              }
              if ((addr.city || addr.town || addr.village) && !city) {
                setCity(addr.city || addr.town || addr.village);
              }
              if (addr.postcode && !pincode) {
                setPincode(addr.postcode);
              }
              if ((addr.road || addr.suburb || addr.neighbourhood) && !line2) {
                setLine2([addr.road, addr.neighbourhood || addr.suburb].filter(Boolean).join(", "));
              }
            }
          }
        } catch {}

        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setError(
          `Could not detect GPS location: ${err.message}. You can enter your address below.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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

  // Navigation handlers
  function handleProceedToAddress() {
    setError(null);
    const orderEmail = email.trim() || session?.user?.email || "";
    if (!orderEmail || !orderEmail.includes("@")) {
      setError("Please enter a valid email address to receive order updates.");
      return;
    }
    setStep("address");
  }

  function handleProceedToPayment(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please provide your full name for delivery.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 6) {
      setError("Please enter a valid mobile number for delivery updates.");
      return;
    }
    if (!line1.trim()) {
      setError("Please enter your flat, house, or building number.");
      return;
    }
    if (!line2.trim()) {
      setError("Please enter your area, street, or sector.");
      return;
    }
    if (!pincode.trim()) {
      setError("Please enter your delivery pincode / postal code.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your town or city.");
      return;
    }
    if (!state.trim()) {
      setError("Please enter your state or province.");
      return;
    }

    // Save as default if selected
    if (isDefault) {
      try {
        const payload: ShippingAddressPayload = {
          fullName: fullName.trim(),
          phone: phone.trim(),
          country,
          line1: line1.trim(),
          line2: line2.trim(),
          landmark: landmark.trim() || undefined,
          pincode: pincode.trim(),
          city: city.trim(),
          state: state.trim(),
          coordinates: coordinates ?? undefined,
          isDefault: true,
        };
        localStorage.setItem("avelor_default_address", JSON.stringify(payload));
      } catch {}
    }

    setStep("payment");
  }

  // Final Order Submission
  async function handleFinalOrderSubmit(e: FormEvent) {
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

    const shippingAddress: ShippingAddressPayload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      country,
      line1: line1.trim(),
      line2: line2.trim(),
      landmark: landmark.trim() || undefined,
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim(),
      coordinates: coordinates ?? undefined,
      isDefault,
    };

    try {
      setStatusMessage("Placing order & securing delivery...");
      const order = await checkout(orderEmail, shippingAddress, paymentMethod);

      if (paymentMethod === "online") {
        setStatusMessage("Confirming secure payment...");
        const payResult = await confirmPayment(order.id);
        setConfirmedOrder(payResult.order);
        setTransactionId(payResult.transactionId);
      } else {
        setConfirmedOrder(order);
        setTransactionId(`COD-${order.id.slice(-6).toUpperCase()}`);
      }

      setStatus("confirmed");
      setStep("confirmed");

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
    setStep("bag");
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
            className="relative z-50 flex h-full w-full max-w-[440px] sm:max-w-[470px] flex-col border-l border-border bg-surface shadow-pop"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout Drawer"
          >
            {/* Drawer Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-2">
                {step !== "bag" && step !== "confirmed" && (
                  <button
                    type="button"
                    onClick={() => setStep(step === "payment" ? "address" : "bag")}
                    className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground transition-colors mr-0.5"
                    title="Go back"
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.2} />
                  </button>
                )}
                <h2 className="text-sm font-semibold text-foreground">
                  {step === "confirmed"
                    ? "Order Confirmed"
                    : step === "address"
                      ? "Delivery Address"
                      : step === "payment"
                        ? "Payment & Review"
                        : "Your Bag"}
                </h2>
                {step === "bag" && itemCount > 0 && (
                  <span className="text-xs text-muted">
                    (<TextMorph as="span">{itemCount}</TextMorph>)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {items.length > 0 && step === "bag" && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-muted transition-colors hover:text-red-500"
                  >
                    Clear
                  </button>
                )}
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

            {/* Stepper Progress Indicator */}
            {items.length > 0 && step !== "confirmed" && (
              <div className="flex items-center justify-between border-b border-border/70 bg-surface-hover/50 px-5 py-2 text-[11px] font-medium text-muted">
                <button
                  type="button"
                  onClick={() => setStep("bag")}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    step === "bag"
                      ? "text-foreground font-semibold"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px]",
                      step === "bag"
                        ? "bg-foreground text-background font-bold"
                        : "bg-border text-muted"
                    )}
                  >
                    1
                  </span>
                  <span>Bag</span>
                </button>
                <div className="h-px flex-1 mx-2 bg-border/80" />
                <button
                  type="button"
                  onClick={() => {
                    if (step === "payment") setStep("address");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    step === "address" ? "text-foreground font-semibold" : "text-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px]",
                      step === "address"
                        ? "bg-foreground text-background font-bold"
                        : "bg-border text-muted"
                    )}
                  >
                    2
                  </span>
                  <span>Delivery</span>
                </button>
                <div className="h-px flex-1 mx-2 bg-border/80" />
                <div
                  className={cn(
                    "flex items-center gap-1.5 transition-colors",
                    step === "payment" ? "text-foreground font-semibold" : "text-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px]",
                      step === "payment"
                        ? "bg-foreground text-background font-bold"
                        : "bg-border text-muted"
                    )}
                  >
                    3
                  </span>
                  <span>Payment</span>
                </div>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-3 [scrollbar-width:thin]">
              {step === "confirmed" && confirmedOrder ? (
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
                    Order placed successfully!
                  </h3>
                  <p className="mt-1 text-xs text-muted max-w-[280px]">
                    Your order is confirmed and currently preparing for dispatch.
                  </p>

                  <div className="mt-4 w-full rounded-2xl border border-border bg-surface-hover/60 p-3.5 text-left text-xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted">Order ID</span>
                      <span className="font-semibold text-foreground font-mono">
                        #{confirmedOrder.id.slice(-8).toUpperCase()}
                      </span>
                    </div>

                    {transactionId && (
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-muted">Payment Ref</span>
                        <span className="font-mono text-muted text-[11px]">{transactionId}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted">Delivery Estimate</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        2 - 4 Business Days
                      </span>
                    </div>

                    {/* Delivery Address Summary */}
                    <div className="border-b border-border pb-2">
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                        Delivery Destination
                      </p>
                      <p className="font-semibold text-foreground">{fullName}</p>
                      <p className="text-muted text-[11px] mt-0.5">
                        {line1}, {line2}
                      </p>
                      {landmark && <p className="text-muted text-[11px]">Landmark: {landmark}</p>}
                      <p className="text-muted text-[11px]">
                        {city}, {state} - {pincode}, {country}
                      </p>
                      <p className="text-muted text-[11px] mt-0.5">📞 {phone}</p>
                      {coordinates && (
                        <a
                          href={`https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-blue hover:underline"
                        >
                          📍 Pinned on Google Maps ({coordinates.lat.toFixed(4)},{" "}
                          {coordinates.lng.toFixed(4)})
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted">Payment Method</span>
                      <span className="font-semibold text-foreground capitalize">
                        {paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment (Paid)"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-medium text-foreground">Total Paid / Due</span>
                      <span className="font-bold text-foreground text-sm">
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
                      View in My Orders
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
              ) : step === "bag" ? (
                /* Step 1: Bag & Line Items */
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

                  {/* Step 1: User Authorization Card */}
                  <div className="mt-4 rounded-2xl border border-border bg-surface-hover/50 p-3">
                    {session?.user ? (
                      <div className="flex items-center gap-3">
                        <UserAvatar name={session.user.name} image={session.user.image} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">
                            {session.user.name}
                          </p>
                          <p className="truncate text-[11px] text-muted">{session.user.email}</p>
                        </div>
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} strokeWidth={2.4} />
                          Authorized
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Express Guest Checkout
                          </span>
                          <span className="text-[11px] text-muted">Or sign in</span>
                        </div>
                        <input
                          id="drawer-guest-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address (for order updates)"
                          className="h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : step === "address" ? (
                /* Step 2: Delivery Address Form */
                <form
                  id="address-form"
                  onSubmit={handleProceedToPayment}
                  className="flex flex-col gap-3 py-1"
                >
                  {/* GPS Location / Pin on Map Box */}
                  <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/15 text-brand-blue">
                          <HugeiconsIcon icon={Location01Icon} size={15} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">
                            Pin Delivery Location
                          </p>
                          <p className="text-[11px] text-muted">
                            Auto-fill & transmit GPS to courier
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isLocating}
                        className="flex h-7 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-[11px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {isLocating ? (
                          <>
                            <div className="size-3 animate-spin rounded-full border-2 border-background border-t-transparent" />
                            <span>Locating...</span>
                          </>
                        ) : (
                          <span>📍 Use GPS</span>
                        )}
                      </button>
                    </div>

                    {locationSuccessMsg && (
                      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <span className="truncate">{locationSuccessMsg}</span>
                        {coordinates && (
                          <a
                            href={`https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 font-bold underline ml-2"
                          >
                            Open Maps
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Address Fields */}
                  <div className="flex flex-col gap-2.5">
                    {/* Country / Region */}
                    <div>
                      <label
                        htmlFor="addr-country"
                        className="block text-[11px] font-medium text-muted mb-1"
                      >
                        Country / Region
                      </label>
                      <select
                        id="addr-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Full Name & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="addr-name"
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Full Name *
                        </label>
                        <input
                          id="addr-name"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Shaik Fazal"
                          className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="addr-phone"
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Mobile Number *
                        </label>
                        <input
                          id="addr-phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Line 1: Flat, House, Building, Apartment */}
                    <div>
                      <label
                        htmlFor="addr-line1"
                        className="block text-[11px] font-medium text-muted mb-1"
                      >
                        Flat, House no., Building, Apartment *
                      </label>
                      <input
                        id="addr-line1"
                        type="text"
                        required
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="e.g. Flat 402, Skyline Towers, Wing A"
                        className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                      />
                    </div>

                    {/* Line 2: Area, Street, Sector, Village */}
                    <div>
                      <label
                        htmlFor="addr-line2"
                        className="block text-[11px] font-medium text-muted mb-1"
                      >
                        Area, Street, Sector, Village *
                      </label>
                      <input
                        id="addr-line2"
                        type="text"
                        required
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        placeholder="e.g. Road No. 12, Jubilee Hills"
                        className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                      />
                    </div>

                    {/* Landmark */}
                    <div>
                      <label
                        htmlFor="addr-landmark"
                        className="block text-[11px] font-medium text-muted mb-1"
                      >
                        Landmark (Optional)
                      </label>
                      <input
                        id="addr-landmark"
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Near City Hospital or Opposite Park"
                        className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                      />
                    </div>

                    {/* Pincode & City */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="addr-pincode"
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Pincode / ZIP *
                        </label>
                        <input
                          id="addr-pincode"
                          type="text"
                          required
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          placeholder="e.g. 500034"
                          className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="addr-city"
                          className="block text-[11px] font-medium text-muted mb-1"
                        >
                          Town / City *
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Hyderabad"
                          className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* State */}
                    <div>
                      <label
                        htmlFor="addr-state"
                        className="block text-[11px] font-medium text-muted mb-1"
                      >
                        State / Province *
                      </label>
                      <input
                        id="addr-state"
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Telangana"
                        className="h-9 w-full rounded-xl border border-border bg-surface-hover px-3 text-xs text-foreground focus:border-brand-blue focus:outline-none"
                      />
                    </div>

                    {/* Default Address Checkbox */}
                    <label className="flex items-center gap-2.5 pt-1 text-xs text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        className="size-4 rounded border-border text-foreground accent-foreground"
                      />
                      <span>Make this my default delivery address</span>
                    </label>
                  </div>
                </form>
              ) : (
                /* Step 3: Payment Method & Order Review */
                <form
                  id="payment-form"
                  onSubmit={handleFinalOrderSubmit}
                  className="flex flex-col gap-3.5 py-1"
                >
                  {/* Delivery Summary Card */}
                  <div className="rounded-2xl border border-border bg-surface-hover/50 p-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <HugeiconsIcon icon={Home01Icon} size={14} />
                        <span>Deliver to</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep("address")}
                        className="text-[11px] font-medium text-brand-blue hover:underline"
                      >
                        Change
                      </button>
                    </div>
                    <div className="pt-2 text-xs">
                      <p className="font-semibold text-foreground">{fullName}</p>
                      <p className="text-muted text-[11px] mt-0.5">
                        {line1}, {line2}
                      </p>
                      {landmark && <p className="text-muted text-[11px]">Landmark: {landmark}</p>}
                      <p className="text-muted text-[11px]">
                        {city}, {state} - {pincode}, {country}
                      </p>
                      <p className="text-muted text-[11px] mt-0.5">📞 {phone}</p>
                      {coordinates && (
                        <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium mt-1">
                          📍 Pinned GPS: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Select Payment Method */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      Select Payment Method
                    </span>

                    {/* Option 1: Online Payment */}
                    <label
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-all",
                        paymentMethod === "online"
                          ? "border-foreground bg-surface-hover/80 shadow-xs ring-1 ring-foreground/20"
                          : "border-border hover:bg-surface-hover/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="online"
                        checked={paymentMethod === "online"}
                        onChange={() => setPaymentMethod("online")}
                        className="mt-0.5 size-4 accent-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Online Payment (Cards / UPI)
                          </span>
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                            Instant
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          Cards, UPI, Netbanking & Wallets with 256-bit SSL encryption
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Cash on Delivery */}
                    <label
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-all",
                        paymentMethod === "cod"
                          ? "border-foreground bg-surface-hover/80 shadow-xs ring-1 ring-foreground/20"
                          : "border-border hover:bg-surface-hover/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="mt-0.5 size-4 accent-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Cash on Delivery (COD)
                          </span>
                          <span className="text-[10px] font-medium text-muted bg-surface-hover rounded-full px-2 py-0.5">
                            Pay at Doorstep
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          Pay with cash or scan QR code when your order arrives
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Sandbox Instant Pay */}
                    <label
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition-all",
                        paymentMethod === "sandbox"
                          ? "border-foreground bg-surface-hover/80 shadow-xs ring-1 ring-foreground/20"
                          : "border-border hover:bg-surface-hover/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="sandbox"
                        checked={paymentMethod === "sandbox"}
                        onChange={() => setPaymentMethod("sandbox")}
                        className="mt-0.5 size-4 accent-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            Sandbox Demo Pay
                          </span>
                          <span className="text-[10px] font-medium text-brand-blue bg-brand-blue/10 rounded-full px-2 py-0.5">
                            Testing
                          </span>
                        </div>
                        <p className="text-[11px] text-muted mt-0.5">
                          Instant simulated approval for rapid demo & testing
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Calculations */}
                  <div className="rounded-2xl border border-border bg-surface-hover/40 p-3 text-xs text-muted flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span>Items Subtotal ({itemCount})</span>
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
                      <span>Delivery Fee</span>
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
                      <span>Total Amount</span>
                      <span className="text-base font-bold">
                        <TextMorph as="span">{formattedTotal}</TextMorph>
                      </span>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Drawer Footer Actions */}
            {items.length > 0 && step !== "confirmed" ? (
              <div className="shrink-0 border-t border-border p-4">
                {error ? (
                  <div className="mb-3 rounded-xl border border-red-300/60 bg-red-50/70 p-2 text-[11px] text-red-900 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </div>
                ) : null}

                {status === "submitting" ? (
                  <div className="flex h-11 items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-b from-[#2a2c30] to-[#141517] text-xs font-medium text-white/80 shadow-xs">
                    <div className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                    <span>{statusMessage}</span>
                  </div>
                ) : step === "bag" ? (
                  <button
                    type="button"
                    onClick={handleProceedToAddress}
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-full border-0 outline-none",
                      "bg-gradient-to-b from-[#34373d] via-[#1f2125] to-[#121316]",
                      "text-[13px] font-semibold text-white",
                      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.25)]",
                      "transition-all duration-200 ease-out",
                      "hover:from-[#3c4048] hover:via-[#25282d] hover:to-[#16171b] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.3)]",
                      "active:scale-[0.985] active:from-[#24262a] active:to-[#0f1012] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
                      "cursor-pointer select-none"
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent opacity-80"
                    />
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>Add Delivery Address · </span>
                      <TextMorph as="span">{formattedTotal}</TextMorph>
                    </span>
                  </button>
                ) : step === "address" ? (
                  <button
                    type="submit"
                    form="address-form"
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-full border-0 outline-none",
                      "bg-gradient-to-b from-[#34373d] via-[#1f2125] to-[#121316]",
                      "text-[13px] font-semibold text-white",
                      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.25)]",
                      "transition-all duration-200 ease-out",
                      "hover:from-[#3c4048] hover:via-[#25282d] hover:to-[#16171b] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.3)]",
                      "active:scale-[0.985] active:from-[#24262a] active:to-[#0f1012] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
                      "cursor-pointer select-none"
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent opacity-80"
                    />
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>Continue to Payment</span>
                      <span>→</span>
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="payment-form"
                    className={cn(
                      "relative flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-full border-0 outline-none",
                      "bg-gradient-to-b from-[#34373d] via-[#1f2125] to-[#121316]",
                      "text-[13px] font-semibold text-white",
                      "shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-1px_1px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.25)]",
                      "transition-all duration-200 ease-out",
                      "hover:from-[#3c4048] hover:via-[#25282d] hover:to-[#16171b] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.3)]",
                      "active:scale-[0.985] active:from-[#24262a] active:to-[#0f1012] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]",
                      "cursor-pointer select-none"
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent opacity-80"
                    />
                    <span className="relative z-10 flex items-center gap-1.5">
                      <span>
                        {paymentMethod === "cod"
                          ? "Confirm Order (COD) · "
                          : "Pay & Place Order · "}
                      </span>
                      <TextMorph as="span">{formattedTotal}</TextMorph>
                    </span>
                  </button>
                )}
              </div>
            ) : null}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
