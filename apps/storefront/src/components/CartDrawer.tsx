"use client";

import React, { useState } from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../data/catalog";

const FREE_SHIPPING_THRESHOLD_MINOR = 10000; // $100.00

export function CartDrawer() {
  const { isOpen, closeCart, items, updateQuantity, removeItem, clearCart, itemCount, subtotalMinor } = useCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  if (!isOpen) return null;

  const diffForFreeShipping = FREE_SHIPPING_THRESHOLD_MINOR - subtotalMinor;
  const progressPercent = Math.min(100, Math.round((subtotalMinor / FREE_SHIPPING_THRESHOLD_MINOR) * 100));

  const shippingMinor = subtotalMinor === 0 ? 0 : subtotalMinor >= FREE_SHIPPING_THRESHOLD_MINOR ? 0 : 800; // $8.00 standard
  const estimatedTaxMinor = Math.round(subtotalMinor * 0.08); // 8% est tax
  const totalMinor = subtotalMinor + shippingMinor + estimatedTaxMinor;

  const handleSimulateCheckout = () => {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      setCheckoutSuccess(true);
      setTimeout(() => {
        clearCart();
        setCheckoutSuccess(false);
        closeCart();
      }, 2200);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-white/10 dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Your Shopping Cart
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress Meter */}
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-3 dark:border-white/5 dark:bg-slate-900/50">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            {diffForFreeShipping <= 0 ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                🎉 You unlocked FREE standard shipping!
              </span>
            ) : (
              <span className="text-slate-600 dark:text-slate-300">
                Add <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(diffForFreeShipping)}</span> more for Free Shipping
              </span>
            )}
            <span className="font-mono text-[11px] font-bold text-slate-400">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {checkoutSuccess ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Order Placed Successfully!
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Thank you for shopping with Avelor. Your confirmation email has been dispatched.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600">
                <ShoppingBag size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Your cart is empty
              </h3>
              <p className="mt-1 max-w-[240px] text-xs text-slate-500 dark:text-slate-400">
                Discover our curated apparel, footwear, and specialty gear to start your order.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="mt-5 rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.variant.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/60"
                >
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="h-16 w-16 rounded-xl object-cover bg-slate-100 dark:bg-slate-800"
                  />
                  <div className="flex flex-1 flex-col">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1 dark:text-white">
                      {item.product.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Variant: {item.variant.title}
                    </span>
                    <span className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {formatPrice(item.variant.priceMinor * item.quantity, item.product.currency)}
                    </span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.variant.id)}
                      className="text-slate-400 transition-colors hover:text-rose-500"
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                        className="px-2 py-1 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                        className="px-2 py-1 text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {items.length > 0 && !checkoutSuccess && (
          <div className="border-t border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-900/80">
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatPrice(subtotalMinor)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-mono font-semibold">
                  {shippingMinor === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">FREE</span>
                  ) : (
                    formatPrice(shippingMinor)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {formatPrice(estimatedTaxMinor)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900 dark:border-white/10 dark:text-white">
                <span>Total</span>
                <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                  {formatPrice(totalMinor)}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSimulateCheckout}
                disabled={isCheckingOut}
                className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  256-bit encrypted checkout
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="hover:text-rose-500 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
