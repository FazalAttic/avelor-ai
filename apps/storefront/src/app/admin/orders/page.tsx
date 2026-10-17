"use client";

import { useEffect, useState } from "react";

export interface AdminOrder {
  id: string;
  customerEmail: string;
  status: string;
  total: { amount: number; currency: string };
  createdAt: string;
  items: {
    title: string;
    quantity: number;
    totalPrice: { amount: number; currency: string };
  }[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
        const tenantId = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";
        const res = await fetch(`${apiUrl}/admin/orders`, {
          headers: {
            "x-tenant-id": tenantId,
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
        }
      } catch (err) {
        console.error("Failed to load orders", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <section id="admin-orders-page" className="flex flex-col gap-4">
      {/* Route skeleton for other AI agent to build UI */}
      <header>
        <h1>Orders Management</h1>
        <p>Review customer orders and update fulfillment statuses.</p>
      </header>

      {loading ? (
        <div>Loading orders…</div>
      ) : (
        <div id="orders-list">
          {orders.length === 0 ? (
            <div>No orders recorded.</div>
          ) : (
            <ul>
              {orders.map((o) => (
                <li key={o.id} className="border-b py-2">
                  <strong>{o.id}</strong> &mdash; {o.customerEmail} &mdash; Status: {o.status}{" "}
                  &mdash; Total: ${(o.total.amount / 100).toFixed(2)} {o.total.currency}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
