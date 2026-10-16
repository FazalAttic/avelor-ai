"use client";

import React from "react";
import { X, ShieldCheck, Truck, RotateCcw, Lock, Sparkles } from "lucide-react";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAIAboutPolicy?: (topic: string) => void;
}

export function PolicyModal({ isOpen, onClose, onAskAIAboutPolicy }: PolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 p-6 dark:border-white/10 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Store Policies & Customer Guarantees
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official store rules indexed and verified in Avelor's pgvector knowledge base.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Policy Grid */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          {/* Policy 1: Returns */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 dark:border-white/10 dark:bg-slate-900/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <RotateCcw size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  30-Day Hassle-Free Returns
                </h3>
              </div>
              {onAskAIAboutPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAskAIAboutPolicy("How does the 30-day return policy work?");
                  }}
                  className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                >
                  <Sparkles size={11} />
                  <span>Ask AI</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              We offer a straightforward 30-day return policy on all unworn items in original packaging. 
              Store exchanges enjoy free return shipping, while refunds are processed back to your original payment method within 3 to 5 business days.
            </p>
          </div>

          {/* Policy 2: Shipping */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 dark:border-white/10 dark:bg-slate-900/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                  <Truck size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Free Shipping & Express Dispatch
                </h3>
              </div>
              {onAskAIAboutPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAskAIAboutPolicy("What are your shipping rates and estimated delivery times?");
                  }}
                  className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                >
                  <Sparkles size={11} />
                  <span>Ask AI</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Orders over $100.00 qualify for free standard delivery (3-5 business days). Orders placed before 2:00 PM EST ship the same business day from our climate-controlled fulfillment center.
            </p>
          </div>

          {/* Policy 3: Guardrail & AI Assistant Transparency */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-500/40 dark:border-white/10 dark:bg-slate-900/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Lock size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  AI Guardrails & Data Privacy
                </h3>
              </div>
              {onAskAIAboutPolicy && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAskAIAboutPolicy("How does Avelor AI protect customer privacy and data?");
                  }}
                  className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/60"
                >
                  <Sparkles size={11} />
                  <span>Ask AI</span>
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Our conversational shopping assistant runs with TypeSafe Jev System-One guardrails. 
              Customer chat inputs are never used to train public foundational models, and conversations are encrypted in transit and at rest.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/40">
          <span className="text-[11px] text-slate-400">
            Last updated: October 2026 • Policy Version 2.1
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
