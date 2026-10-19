"use client";

import { Add01Icon, Delete02Icon, Edit03Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, SearchField } from "@/components/ui/filter-bar";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { SelectField } from "@/components/ui/select-field";
import { SlideOver } from "@/components/ui/slide-over";
import { StatusBadge } from "@/components/ui/status-badge";
import { StockPill } from "@/components/ui/stock-pill";
import { TextField } from "@/components/ui/text-field";
import {
  type AdminProduct,
  createProduct,
  fetchProducts,
  formatMoney,
  type ProductStatus,
  removeProduct,
  updateProduct,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const LINE_BUTTON = buttonClass({
  variant: "secondary",
  size: "sm",
  className: "border-admin-edge bg-admin-card hover:border-admin-ink/25 hover:bg-admin-line/60",
});

const ICON_BUTTON = cn(LINE_BUTTON, "size-8 justify-center px-0");

const STATUS_OPTIONS: readonly { value: "all" | ProductStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const PAGE_SIZE = 60;

function priceLabel(product: AdminProduct) {
  const prices = product.variants.map((variant) => variant.price.amount);
  if (prices.length === 0) return "—";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const money = product.variants[0]?.price.currency ?? "USD";
  return min === max
    ? formatMoney({ amount: min, currency: money })
    : `${formatMoney({ amount: min, currency: money })} – ${formatMoney({ amount: max, currency: money })}`;
}

function stockOnHand(product: AdminProduct) {
  return product.variants.reduce((sum, variant) => sum + variant.inventoryQuantity, 0);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<readonly AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<readonly string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | ProductStatus>("all");

  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<AdminProduct | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts({
      limit: PAGE_SIZE,
      search: query || undefined,
      category: category === "all" ? undefined : category,
    })
      .then((result) => {
        if (cancelled) return;
        setProducts(result.items);
        setTotal(result.total);
        setError(null);
        setCategories((previous) => [
          ...new Set([...previous, ...result.items.flatMap((item) => item.categories)]),
        ]);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, category]);

  const rows = status === "all" ? products : products.filter((p) => p.status === status);

  async function confirmRemoval() {
    if (!removing) return;
    setBusy(true);
    try {
      await removeProduct(removing.id);
      setProducts((previous) => previous.filter((item) => item.id !== removing.id));
      setTotal((previous) => Math.max(0, previous - 1));
      setRemoving(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const columns: readonly Column<AdminProduct>[] = [
    {
      key: "product",
      header: "Product",
      width: "w-[38%]",
      cell: (product) => {
        const cover = product.media[0];
        return (
          <div className="flex min-w-0 items-center gap-3">
            {cover ? (
              <Image
                src={cover}
                alt=""
                width={40}
                height={40}
                unoptimized
                className="size-10 shrink-0 rounded-lg bg-admin-line/60 object-cover ring-1 ring-admin-edge"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-admin-line/60 ring-1 ring-admin-edge">
                <HugeiconsIcon
                  icon={PackageIcon}
                  size={16}
                  strokeWidth={1.8}
                  className="text-muted"
                />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-admin-ink">{product.name}</p>
              <p className="truncate text-[11px] text-muted">
                {product.description || product.variants[0]?.sku || "No description yet"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "categories",
      header: "Categories",
      hide: "lg",
      cell: (product) =>
        product.categories.length === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {product.categories.slice(0, 2).map((tag) => (
              <Badge key={tag} className="border-admin-edge">
                {tag}
              </Badge>
            ))}
            {product.categories.length > 2 ? (
              <span className="text-[11px] text-muted">+{product.categories.length - 2}</span>
            ) : null}
          </div>
        ),
    },
    {
      key: "variants",
      header: "SKUs",
      hide: "md",
      align: "end",
      cell: (product) => product.variants.length,
    },
    { key: "price", header: "Price", align: "end", cell: priceLabel },
    {
      key: "stock",
      header: "On hand",
      hide: "sm",
      align: "end",
      cell: (product) => <StockPill quantity={stockOnHand(product)} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (product) => <StatusBadge status={product.status} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "end",
      cell: (product) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            aria-label={`Edit ${product.name}`}
            className={ICON_BUTTON}
            onClick={() => setEditing(product)}
          >
            <HugeiconsIcon icon={Edit03Icon} size={15} strokeWidth={1.9} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${product.name}`}
            className={cn(ICON_BUTTON, "text-red-600 dark:text-red-400")}
            onClick={() => setRemoving(product)}
          >
            <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={1.9} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section id="admin-products-page" className="flex flex-col gap-4">
      {error ? <Alert>{error}</Alert> : null}

      <FilterBar
        actions={
          <Button variant="ink" size="md" onClick={() => setCreating(true)}>
            <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
            Create new product
          </Button>
        }
      >
        <SearchField
          value={search}
          onChange={setSearch}
          label="Search products"
          placeholder="Search by name…"
        />
        <Segmented
          ariaLabel="Filter by status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={setStatus}
        />
        <SelectField
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { value: "all", label: "All" },
            ...categories.map((tag) => ({ value: tag, label: tag })),
          ]}
        />
      </FilterBar>

      <Panel className="border-admin-edge bg-admin-card">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(product) => product.id}
          caption="Products"
          loading={loading}
          empty={
            <EmptyState
              icon={<HugeiconsIcon icon={PackageIcon} size={18} strokeWidth={1.8} />}
              title={query ? "No matching products" : "No products yet"}
              description={
                query
                  ? "Try a different name, or clear the filters to see the whole catalog."
                  : "Add your first product and it will show up in the storefront and the AI assistant."
              }
            />
          }
        />
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[11px] text-muted">
          <span>
            Showing {rows.length} of {total} products
          </span>
          {status !== "all" || category !== "all" || query ? (
            <button
              type="button"
              className="font-semibold text-admin-ink hover:underline"
              onClick={() => {
                setSearch("");
                setQuery("");
                setCategory("all");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </Panel>

      <ProductSidePanel
        open={creating || editing !== null}
        product={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(product) => {
          const isNew = !products.some((item) => item.id === product.id);
          setProducts((previous) =>
            isNew
              ? [product, ...previous]
              : previous.map((item) => (item.id === product.id ? product : item))
          );
          if (isNew) setTotal((count) => count + 1);
        }}
      />

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Delete “${removing?.name ?? ""}”?`}
        description="This removes the product and its variants from the catalog."
        className="sm:max-w-[440px]"
        footer={
          <>
            <Button className={LINE_BUTTON} onClick={() => setRemoving(null)}>
              Keep product
            </Button>
            <Button variant="ink" disabled={busy} onClick={confirmRemoval}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          The storefront and the assistant stop showing this product as soon as it is deleted.
        </p>
      </Dialog>
    </section>
  );
}

type VariantDraft = {
  id: string;
  title: string;
  sku: string;
  price: string;
  stock: string;
  image: string;
};

type Draft = {
  name: string;
  description: string;
  categories: string;
  status: ProductStatus;
  variants: VariantDraft[];
};

const DEFAULT_VARIANT: VariantDraft = {
  id: "v-default",
  title: "Default",
  sku: "",
  price: "",
  stock: "0",
  image: "",
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  categories: "",
  status: "active",
  variants: [DEFAULT_VARIANT],
};

function draftFrom(product: AdminProduct | null): Draft {
  if (!product) return EMPTY_DRAFT;
  const variants: VariantDraft[] =
    product.variants.length > 0
      ? product.variants.map((v, index) => ({
          id: v.id || `v-${index}`,
          title: v.title || (index === 0 ? "Default" : `Variant ${index + 1}`),
          sku: v.sku || "",
          price: String(v.price.amount / 100),
          stock: String(v.inventoryQuantity ?? 0),
          image: product.media[index] ?? product.media[0] ?? "",
        }))
      : [
          {
            id: "v-default",
            title: "Default",
            sku: "",
            price: "",
            stock: "0",
            image: product.media[0] ?? "",
          },
        ];

  return {
    name: product.name,
    description: product.description,
    categories: product.categories.join(", "),
    status: product.status,
    variants,
  };
}

function ProductSidePanel({
  open,
  product,
  onClose,
  onSaved,
}: {
  open: boolean;
  product: AdminProduct | null;
  onClose: () => void;
  onSaved: (product: AdminProduct) => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [activeVariantId, setActiveVariantId] = useState<string>("v-default");
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Re-seed the form whenever the side panel opens for a different product.
  const key = `${open ? "open" : "closed"}:${product?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      const seeded = draftFrom(product);
      setDraft(seeded);
      setActiveVariantId(seeded.variants[0]?.id ?? "v-default");
      setFailure(null);
    }
  }

  const set = (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch }));

  // Find currently selected variant, fallback to first
  const activeIndex = Math.max(
    0,
    draft.variants.findIndex((v) => v.id === activeVariantId)
  );
  const activeVariant = draft.variants[activeIndex] ?? draft.variants[0];

  const updateActiveVariant = (patch: Partial<VariantDraft>) => {
    setDraft((previous) => {
      const updatedVariants = previous.variants.map((v, i) =>
        i === activeIndex ? { ...v, ...patch } : v
      );
      return { ...previous, variants: updatedVariants };
    });
  };

  const addVariant = () => {
    const nextIndex = draft.variants.length + 1;
    const newId = crypto.randomUUID();
    const baseSlug =
      draft.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || "item";
    const newVariant: VariantDraft = {
      id: newId,
      title: `Variant ${nextIndex}`,
      sku: `${baseSlug}-v${nextIndex}`,
      price: activeVariant?.price || "",
      stock: "10",
      image: "",
    };

    setDraft((previous) => ({
      ...previous,
      variants: [...previous.variants, newVariant],
    }));
    setActiveVariantId(newId);
  };

  const removeVariant = (idToRemove: string) => {
    if (draft.variants.length <= 1) return;
    setDraft((previous) => {
      const filtered = previous.variants.filter((v) => v.id !== idToRemove);
      if (activeVariantId === idToRemove) {
        setActiveVariantId(filtered[0]?.id ?? "v-default");
      }
      return { ...previous, variants: filtered };
    });
  };

  async function submit() {
    const name = draft.name.trim();
    if (!name) {
      setFailure("A product needs a name.");
      return;
    }

    // Validate each variant's price
    for (const v of draft.variants) {
      const price = Number.parseFloat(v.price);
      if (!Number.isFinite(price) || price <= 0) {
        setFailure(`Variant “${v.title}” requires a price greater than 0.`);
        return;
      }
    }

    const tags = draft.categories
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    // Media gathers images from each variant that has an image
    const mediaUrls = draft.variants.map((v) => v.image.trim()).filter(Boolean);

    setSaving(true);
    try {
      if (product) {
        const updated = await updateProduct(product.id, {
          name,
          description: draft.description.trim(),
          categories: tags,
          status: draft.status,
          media: mediaUrls,
          variants: draft.variants.map((v, i) => ({
            id: v.id.startsWith("v-") ? undefined : v.id,
            sku: v.sku.trim() || product.variants[i]?.sku || `sku-${i + 1}`,
            title: v.title.trim() || product.variants[i]?.title || "Default",
            priceAmount: Math.round(Number.parseFloat(v.price) * 100),
            inventoryQuantity: Number.parseInt(v.stock || "0", 10),
          })),
        });

        onSaved(updated);
      } else {
        const created = await createProduct({
          name,
          description: draft.description.trim(),
          categories: tags,
          media: mediaUrls,
          variants: draft.variants.map((v, i) => ({
            sku:
              v.sku.trim() ||
              `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || i + 1}`,
            title: v.title.trim() || (i === 0 ? "Default" : `Variant ${i + 1}`),
            priceAmount: Math.round(Number.parseFloat(v.price) * 100),
            inventoryQuantity: Number.parseInt(v.stock || "0", 10),
          })),
        });
        onSaved(created);
      }
      onClose();
      setFailure(null);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  // Calculate live aggregate stats across variants
  const prices = draft.variants
    .map((v) => Number.parseFloat(v.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
  const totalStock = draft.variants.reduce(
    (sum, v) => sum + (Number.parseInt(v.stock || "0", 10) || 0),
    0
  );

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      width="3xl"
      title={product ? `Edit “${product.name}”` : "Create new product"}
      description={
        product
          ? "Update product description and configure variant-dependent images, pricing, and inventory."
          : "Define the product name, comprehensive description, and variant-specific information and images."
      }
      footer={
        <>
          <Button className={LINE_BUTTON} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="ink" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {failure ? <Alert>{failure}</Alert> : null}

        {/* Section 1: Product Overview & Comprehensive Description */}
        <div className="space-y-4 rounded-2xl border border-admin-edge bg-admin-canvas/50 p-5">
          <div className="border-b border-admin-edge/70 pb-3">
            <h3 className="text-xs font-semibold tracking-wider text-admin-ink uppercase">
              Product Overview
            </h3>
            <p className="text-[11px] text-muted">
              The product name and description define the catalog record. All images, pricing, and
              inventory depend on the variants below.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Product Name"
              value={draft.name}
              onChange={(event) => set({ name: event.target.value })}
              placeholder="e.g. Apex Minimalist Desk Lamp"
              required
            />
            <SelectField
              label="Status"
              value={draft.status}
              onChange={(event) => set({ status: event.target.value as ProductStatus })}
              options={[
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="product-description"
              className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase"
            >
              Description & Specifications
            </label>
            <textarea
              id="product-description"
              rows={5}
              value={draft.description}
              onChange={(event) => set({ description: event.target.value })}
              placeholder="Write the full product description here — specifications, materials, dimensions, highlights, sizing, and details. Customers and the AI assistant rely directly on this description."
              className={cn(
                "w-full resize-y rounded-xl border border-admin-edge bg-admin-canvas px-3.5 py-2.5 text-[13px] leading-relaxed text-admin-ink",
                "transition-colors duration-150 ease-expo placeholder:text-subtle",
                "focus:border-admin-ink/35 focus:outline-none"
              )}
            />
          </div>

          <TextField
            label="Categories"
            value={draft.categories}
            onChange={(event) => set({ categories: event.target.value })}
            placeholder="lighting, workspace, home"
            hint="Comma separated. Used for catalog filtering and search discovery."
          />
        </div>

        {/* Section 2: Variant-Driven Information & Imagery */}
        <div className="space-y-4 rounded-2xl border border-admin-edge bg-admin-canvas/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-admin-edge/70 pb-3">
            <div>
              <h3 className="text-xs font-semibold tracking-wider text-admin-ink uppercase">
                Variants & Imagery
              </h3>
              <p className="text-[11px] text-muted">
                Images, pricing, stock, and SKUs belong to each variant. Selecting a variant updates
                all its information.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="border-admin-edge bg-admin-card hover:bg-admin-line/70"
              onClick={addVariant}
            >
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
              Add variant
            </Button>
          </div>

          {/* Dynamic Variant Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-admin-edge/50 pb-3">
            {draft.variants.map((v, i) => {
              const isSelected = v.id === activeVariant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVariantId(v.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border px-3 py-1.5 text-xs transition-all duration-150",
                    isSelected
                      ? "border-admin-ink/40 bg-admin-card text-admin-ink font-semibold shadow-sm ring-1 ring-admin-ink/20"
                      : "border-admin-edge bg-admin-card/50 text-muted hover:border-admin-ink/20 hover:text-admin-ink"
                  )}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-admin-line/60">
                    {v.image.trim() ? (
                      <Image
                        src={v.image.trim()}
                        alt=""
                        width={20}
                        height={20}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={PackageIcon}
                        size={12}
                        strokeWidth={1.8}
                        className="text-muted/60"
                      />
                    )}
                  </span>
                  <span>{v.title || `Variant ${i + 1}`}</span>
                  {v.price ? (
                    <span className="font-mono text-[11px] opacity-75">${v.price}</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Active Variant Editor */}
          {activeVariant ? (
            <div className="space-y-4 rounded-xl border border-admin-edge bg-admin-card p-4.5">
              <div className="flex items-center justify-between border-b border-admin-edge/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Badge className="border-admin-edge bg-admin-line/60 text-[11px]">
                    Variant: {activeVariant.title || "Default"}
                  </Badge>
                  {draft.variants[0]?.id === activeVariant.id ? (
                    <span className="text-[11px] text-muted">(Primary cover)</span>
                  ) : null}
                </div>
                {draft.variants.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove variant ${activeVariant.title}`}
                    onClick={() => removeVariant(activeVariant.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.8} />
                    <span>Delete variant</span>
                  </button>
                ) : null}
              </div>

              {/* Title & SKU */}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Variant Name / Title"
                  value={activeVariant.title}
                  onChange={(event) => updateActiveVariant({ title: event.target.value })}
                  placeholder="e.g. Matte Black / Large"
                  required
                />
                <TextField
                  label="SKU (Stock Keeping Unit)"
                  value={activeVariant.sku}
                  onChange={(event) => updateActiveVariant({ sku: event.target.value })}
                  placeholder="e.g. apex-lamp-blk"
                />
              </div>

              {/* Price & Stock */}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Price (USD)"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={activeVariant.price}
                  onChange={(event) => updateActiveVariant({ price: event.target.value })}
                  placeholder="129.00"
                  required
                />
                <TextField
                  label="Stock Inventory"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={activeVariant.stock}
                  onChange={(event) => updateActiveVariant({ stock: event.target.value })}
                  placeholder="25"
                />
              </div>

              {/* Variant Image & Live Preview */}
              <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
                <TextField
                  label="Variant Image URL"
                  value={activeVariant.image}
                  onChange={(event) => updateActiveVariant({ image: event.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  hint="Image specific to this variant. Displays as the primary visual when this variant is active."
                />

                <div className="flex shrink-0 flex-col gap-1.5">
                  <span className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                    Variant Preview
                  </span>
                  <div className="flex size-[74px] items-center justify-center overflow-hidden rounded-xl border border-admin-edge bg-admin-line/40 ring-1 ring-admin-edge">
                    {activeVariant.image.trim() ? (
                      <Image
                        src={activeVariant.image.trim()}
                        alt="Variant preview"
                        width={74}
                        height={74}
                        unoptimized
                        className="size-full object-cover"
                      />
                    ) : (
                      <HugeiconsIcon
                        icon={PackageIcon}
                        size={24}
                        strokeWidth={1.6}
                        className="text-muted/60"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Product Live Aggregate Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-admin-edge/70 bg-admin-card/60 px-4 py-2.5 text-xs text-muted">
            <span>
              Total Variants: <strong className="text-admin-ink">{draft.variants.length}</strong>
            </span>
            <span>
              Price Range:{" "}
              <strong className="text-admin-ink">
                {minPrice !== null && maxPrice !== null
                  ? minPrice === maxPrice
                    ? `$${minPrice.toFixed(2)}`
                    : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`
                  : "—"}
              </strong>
            </span>
            <span>
              Combined Stock: <strong className="text-admin-ink">{totalStock} units</strong>
            </span>
          </div>
        </div>

        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </SlideOver>
  );
}
