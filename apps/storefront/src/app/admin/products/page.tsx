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
            New product
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

      <ProductDialog
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

type Draft = {
  name: string;
  description: string;
  categories: string;
  status: ProductStatus;
  sku: string;
  title: string;
  price: string;
  stock: string;
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  categories: "",
  status: "active",
  sku: "",
  title: "",
  price: "",
  stock: "",
};

function draftFrom(product: AdminProduct | null): Draft {
  if (!product) return EMPTY_DRAFT;
  const variant = product.variants[0];
  return {
    name: product.name,
    description: product.description,
    categories: product.categories.join(", "),
    status: product.status,
    sku: variant?.sku ?? "",
    title: variant?.title ?? "",
    price: variant ? String(variant.price.amount / 100) : "",
    stock: variant ? String(variant.inventoryQuantity) : "",
  };
}

function ProductDialog({
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
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Re-seed the form whenever the dialog opens for a different product.
  const key = `${open ? "open" : "closed"}:${product?.id ?? "new"}`;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setDraft(draftFrom(product));
      setFailure(null);
    }
  }

  const set = (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch }));

  async function submit() {
    const name = draft.name.trim();
    if (!name) {
      setFailure("A product needs a name.");
      return;
    }
    const tags = draft.categories
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, {
          name,
          description: draft.description.trim(),
          categories: tags,
          status: draft.status,
        });
        onSaved({
          ...product,
          name,
          description: draft.description.trim(),
          categories: tags,
          status: draft.status,
        });
      } else {
        const price = Number.parseFloat(draft.price);
        const stock = Number.parseInt(draft.stock || "0", 10);
        const sku = draft.sku.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (!Number.isFinite(price) || price <= 0) {
          setFailure("Set a price greater than zero.");
          return;
        }
        const created = await createProduct({
          name,
          description: draft.description.trim(),
          categories: tags,
          variants: [
            {
              sku,
              title: draft.title.trim() || name,
              priceAmount: Math.round(price * 100),
              inventoryQuantity: Number.isFinite(stock) && stock >= 0 ? stock : 0,
            },
          ],
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? "Edit product" : "New product"}
      description={
        product
          ? "Changes apply to the storefront and the assistant straight away."
          : "One variant to start — add sizes and colours later from the API."
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
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {failure ? <Alert>{failure}</Alert> : null}

        <TextField
          label="Name"
          value={draft.name}
          onChange={(event) => set({ name: event.target.value })}
          placeholder="Volt Runner"
          required
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="product-description"
            className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase"
          >
            Description
          </label>
          <textarea
            id="product-description"
            rows={3}
            value={draft.description}
            onChange={(event) => set({ description: event.target.value })}
            placeholder="What makes it worth buying?"
            className={cn(
              "w-full resize-y rounded-xl border border-admin-edge bg-admin-canvas px-3 py-2 text-[13px] leading-relaxed text-admin-ink",
              "transition-colors duration-150 ease-expo placeholder:text-subtle",
              "focus:border-admin-ink/35 focus:outline-none"
            )}
          />
        </div>

        <TextField
          label="Categories"
          value={draft.categories}
          onChange={(event) => set({ categories: event.target.value })}
          placeholder="running, unisex"
          hint="Comma separated. These drive the storefront filters and the assistant."
        />

        {product ? (
          <SelectField
            label="Status"
            className="self-start"
            value={draft.status}
            onChange={(event) => set({ status: event.target.value as ProductStatus })}
            options={[
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "archived", label: "Archived" },
            ]}
          />
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            <TextField
              label="SKU"
              value={draft.sku}
              onChange={(event) => set({ sku: event.target.value })}
              placeholder="volt-runner-42"
            />
            <TextField
              label="Variant name"
              value={draft.title}
              onChange={(event) => set({ title: event.target.value })}
              placeholder="Size 42"
            />
            <TextField
              label="Price (USD)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={draft.price}
              onChange={(event) => set({ price: event.target.value })}
              placeholder="129.00"
            />
            <TextField
              label="Stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={draft.stock}
              onChange={(event) => set({ stock: event.target.value })}
              placeholder="24"
            />
          </div>
        )}

        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  );
}
