"use client";

import { useEffect, useState } from "react";

export interface AdminPolicy {
  id: string;
  topic: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function AdminPoliciesPage() {
  const [policies, setPolicies] = useState<AdminPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";
        const tenantId = process.env.NEXT_PUBLIC_AVELOR_TENANT_ID ?? "store_alpha";
        const res = await fetch(`${apiUrl}/admin/policies`, {
          headers: {
            "x-tenant-id": tenantId,
          },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setPolicies(data ?? []);
        }
      } catch (err) {
        console.error("Failed to load policies", err);
      } finally {
        setLoading(false);
      }
    }

    loadPolicies();
  }, []);

  return (
    <section id="admin-policies-page" className="flex flex-col gap-4">
      {/* Route skeleton for other AI agent to build UI */}
      <header>
        <h1>Store Policies & AI Knowledge (RAG)</h1>
        <p>Ground AI assistant shopping replies with official policies.</p>
      </header>

      {loading ? (
        <div>Loading policies…</div>
      ) : (
        <div id="policies-list">
          {policies.length === 0 ? (
            <div>No policies published.</div>
          ) : (
            <ul>
              {policies.map((pol) => (
                <li key={pol.id} className="border-b py-2">
                  <strong>
                    {pol.topic}: {pol.title}
                  </strong>
                  <p>{pol.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
