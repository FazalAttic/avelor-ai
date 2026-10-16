"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, Truck, RefreshCw, Zap, Search } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { BotAvatar, type BotState } from "../components/BotAvatar";
import { ProductCard } from "../components/ProductCard";
import { AIChatDrawer } from "../components/AIChatDrawer";
import { CartDrawer } from "../components/CartDrawer";
import { PolicyModal } from "../components/PolicyModal";
import { STORE_CATALOG, type StoreProduct } from "../data/catalog";

const CATEGORIES = ["All", "Footwear", "Apparel", "Coffee", "Gear"] as const;

export default function Home() {
  const [botState, setBotState] = useState<BotState>("idle");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  const handleOpenChatWithPrompt = (prompt: string) => {
    setChatInitialPrompt(prompt);
    setIsChatOpen(true);
  };

  const filteredProducts = STORE_CATALOG.filter((product) => {
    const matchesCategory =
      activeCategory === "All" ||
      product.category.toLowerCase() === activeCategory.toLowerCase();
    const matchesQuery =
      searchQuery.trim() === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#07090e] dark:text-slate-100">
      {/* Top Navbar */}
      <Navbar
        botState={botState}
        onOpenChat={() => {
          setChatInitialPrompt(undefined);
          setIsChatOpen(true);
        }}
        onOpenPolicies={() => setIsPolicyOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 p-8 shadow-sm backdrop-blur-xl sm:p-12 dark:border-white/10 dark:bg-slate-900/40 dark:shadow-2xl">
          {/* Subtle Ambient Background Glows */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/15" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/15" />

          <div className="relative flex flex-col items-center text-center">
            {/* Interactive Bot Avatar Welcome Badge */}
            <div
              onClick={() => {
                setChatInitialPrompt("Introduce yourself and tell me what you can do.");
                setIsChatOpen(true);
              }}
              className="group mb-6 inline-flex cursor-pointer items-center gap-3 rounded-full border border-slate-200 bg-slate-50/90 px-4 py-2 shadow-sm transition-all duration-300 hover:scale-105 hover:border-indigo-500/50 hover:shadow-md dark:border-white/10 dark:bg-slate-800/80 dark:hover:border-indigo-400/50"
            >
              <BotAvatar state={botState} size="sm" />
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Meet Avelor — Your AI Shopping Concierge</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={12} />
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Conversational Commerce,{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Reimagined.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Discover products with natural language, compare technical specs, and check real-time stock levels. 
              Protected by TypeSafe AI Jev System-One guardrails and powered by pgvector hybrid semantic search.
            </p>

            {/* Quick Action Chips to Ask the AI Assistant */}
            <div className="mt-8 flex flex-wrap justify-center gap-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Zap size={13} className="text-amber-400" /> Try asking:
              </span>
              {[
                "Find waterproof trail shoes under $140",
                "What is your 30-day return policy?",
                "Recommend organic dark espresso roast",
              ].map((samplePrompt) => (
                <button
                  key={samplePrompt}
                  type="button"
                  onClick={() => handleOpenChatWithPrompt(samplePrompt)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-indigo-500/50 hover:text-indigo-600 active:scale-95 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-indigo-400/50 dark:hover:text-white"
                >
                  &ldquo;{samplePrompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Catalog Control Bar: Search & Category Filters */}
        <section className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog by keyword..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-900/80 dark:text-white dark:placeholder-slate-500"
            />
          </div>
        </section>

        {/* Product Grid */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Featured Catalog
            </h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-center dark:border-white/10 dark:bg-slate-900/40">
              <span className="text-4xl">🔍</span>
              <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                No matching products found
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Try searching for &ldquo;shoe&rdquo;, &ldquo;jacket&rdquo;, or &ldquo;coffee&rdquo;, or reset filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                }}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAskAI={handleOpenChatWithPrompt}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trust & Architecture Value Strip */}
        <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <RefreshCw size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                30-Day Hassle-Free Returns
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Free exchanges & instant refunds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Free Express Shipping
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                On all qualifying orders over $100
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                TypeSafe AI Jev Guardrails
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verified 272ms prompt defense
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                pgvector Hybrid RAG
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sub-millisecond cosine recall
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Reactive AI Assistant Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => {
            setChatInitialPrompt(undefined);
            setIsChatOpen(true);
          }}
          className="group relative flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 py-2 pl-2 pr-5 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-indigo-500/60 hover:shadow-indigo-500/20 active:scale-95 dark:border-white/15 dark:bg-slate-900/90"
        >
          <BotAvatar state={botState} size="md" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
              Avelor AI
            </span>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {botState === "thinking"
                ? "Thinking..."
                : botState === "generating"
                ? "Responding..."
                : "Ask anything"}
            </span>
          </div>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={13} />
          </span>
        </button>
      </div>

      {/* Modals & Drawers */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        botState={botState}
        setBotState={setBotState}
        initialPrompt={chatInitialPrompt}
      />

      <CartDrawer />

      <PolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
        onAskAIAboutPolicy={handleOpenChatWithPrompt}
      />
    </div>
  );
}
