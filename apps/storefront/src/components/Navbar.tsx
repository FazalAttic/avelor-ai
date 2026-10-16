"use client";

import React from "react";
import Image from "next/image";
import { ShoppingBag, Sparkles, ShieldCheck, HelpCircle } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { BotAvatar, type BotState } from "./BotAvatar";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../data/catalog";

interface NavbarProps {
  botState: BotState;
  onOpenChat: () => void;
  onOpenPolicies: () => void;
}

export function Navbar({ botState, onOpenChat, onOpenPolicies }: NavbarProps) {
  const { itemCount, subtotalMinor, toggleCart } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-cyan-500/20 p-2 shadow-lg shadow-indigo-500/10 ring-1 ring-white/10">
            <img
              src="/avelor-logo.png"
              alt="Avelor Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Avelor<span className="text-[var(--accent-primary)]">.ai</span>
              </span>
              <span className="hidden items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400 ring-1 ring-indigo-500/30 sm:inline-flex">
                <ShieldCheck size={11} className="text-emerald-400" />
                Guarded
              </span>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              Conversational Commerce
            </span>
          </div>
        </div>

        {/* Center: Reactive AI Assistant Trigger Pill */}
        <div className="hidden md:flex items-center">
          <button
            type="button"
            onClick={onOpenChat}
            className="group relative flex items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] py-1.5 pl-2 pr-4 shadow-sm transition-all duration-300 hover:border-[var(--border-focus)] hover:shadow-md hover:shadow-indigo-500/10"
          >
            <BotAvatar state={botState} size="sm" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]">
                Ask Avelor Assistant
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                {botState === "generating"
                  ? "Generating response..."
                  : botState === "thinking"
                  ? "Evaluating & searching..."
                  : "Search catalog or ask store policies"}
              </span>
            </div>
            <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400">
              <Sparkles size={13} />
            </span>
          </button>
        </div>

        {/* Right Actions: Policies, Theme Toggle, Cart */}
        <div className="flex items-center gap-3">
          {/* Store Policies Modal trigger */}
          <button
            type="button"
            onClick={onOpenPolicies}
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)] lg:flex"
            title="Store Policies & Guarantees"
          >
            <HelpCircle size={15} />
            <span>Store Policies</span>
          </button>

          {/* Theme Toggle (Dark / Light) */}
          <ThemeToggle />

          {/* Cart Drawer Trigger */}
          <button
            type="button"
            onClick={toggleCart}
            aria-label="Open Cart Drawer"
            className="relative flex items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-2.5 shadow-sm transition-all duration-200 hover:border-[var(--border-focus)] hover:shadow-md"
          >
            <ShoppingBag size={18} className="text-[var(--text-primary)]" />
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-[var(--text-primary)]">{itemCount}</span>
              {itemCount > 0 && (
                <span className="hidden text-[var(--text-muted)] sm:inline">
                  • {formatPrice(subtotalMinor)}
                </span>
              )}
            </div>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-black text-white shadow-sm shadow-indigo-500">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
