"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

export interface AdminMetrics {
  catalog: {
    totalProducts: number;
    lowStockVariants: number;
  };
  orders: {
    totalOrders: number;
    paidOrders: number;
    revenue: {
      amount: number;
      currency: string;
    };
  };
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
        const tenantId = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";
        const res = await fetch(`${apiUrl}/admin/metrics`, {
          headers: {
            "x-tenant-id": tenantId,
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to load metrics", err);
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <section id="admin-dashboard-page" className="p-6">
      {/* Route skeleton for other AI agent to build UI */}
      <header>
        <h1>Admin Dashboard</h1>
        <p>Logged in as: {session?.user?.email}</p>
      </header>

      {loading ? (
        <div>Loading store metrics…</div>
      ) : metrics ? (
        <div id="metrics-data">
          <div>Total Products: {metrics.catalog.totalProducts}</div>
          <div>Low Stock Alerts: {metrics.catalog.lowStockVariants}</div>
          <div>Total Orders: {metrics.orders.totalOrders}</div>
          <div>Paid Orders: {metrics.orders.paidOrders}</div>
          <div>
            Total Revenue: ${(metrics.orders.revenue.amount / 100).toFixed(2)}{" "}
            {metrics.orders.revenue.currency}
          </div>
        </div>
      ) : (
        <div>Unable to load metrics.</div>
      )}
    </section>
  );
}
