"use client";

import { useEffect, useState } from "react";

export interface AdminProduct {
  id: string;
  name: string;
  status: string;
  description: string;
  categories: string[];
  variants: {
    id: string;
    sku: string;
    price: { amount: number; currency: string };
    inventoryQuantity: number;
  }[];
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
        const tenantId = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";
        const res = await fetch(`${apiUrl}/admin/products`, {
          headers: {
            "x-tenant-id": tenantId,
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setProducts(data.items ?? []);
        }
      } catch (err) {
        console.error("Failed to load products", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <section id="admin-products-page" className="flex flex-col gap-4">
      {/* Route skeleton for other AI agent to build UI */}
      <header>
        <h1>Products Management</h1>
        <p>Manage store catalog, pricing, and stock.</p>
      </header>

      {loading ? (
        <div>Loading products…</div>
      ) : (
        <div id="products-list">
          {products.length === 0 ? (
            <div>No products found.</div>
          ) : (
            <ul>
              {products.map((p) => (
                <li key={p.id} className="border-b py-2">
                  <strong>{p.name}</strong> &mdash; Status: {p.status} &mdash; Variants:{" "}
                  {p.variants.length}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
