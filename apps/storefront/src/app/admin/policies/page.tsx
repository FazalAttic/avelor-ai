"use client";

import { CheckmarkCircle02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { fetchPolicies, type PolicyTopic, savePolicy } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const LINE_BUTTON = buttonClass({
  variant: "secondary",
  size: "md",
  className: "border-admin-line bg-admin-card hover:border-admin-ink/25 hover:bg-admin-rail",
});

const TOPICS: readonly { value: PolicyTopic; label: string; blurb: string }[] = [
  {
    value: "returns",
    label: "Returns",
    blurb: "What a customer can send back, in what window, and how the refund arrives.",
  },
  {
    value: "shipping",
    label: "Shipping",
    blurb: "Delivery times, the free-shipping threshold and how dispatch is triggered.",
  },
  {
    value: "privacy",
    label: "Privacy",
    blurb: "What the store keeps about a shopper and who it is shared with.",
  },
  {
    value: "terms",
    label: "Terms",
    blurb: "The commercial terms that apply to every order placed in the store.",
  },
  {
    value: "faq",
    label: "FAQ",
    blurb: "The short questions the assistant is asked most often.",
  },
  {
    value: "general",
    label: "General",
    blurb: "Anything that does not fit another topic — sizing, care, contact.",
  },
];

type Draft = { title: string; content: string };

const EMPTY: Draft = { title: "", content: "" };

const BLANKS = Object.fromEntries(TOPICS.map((entry) => [entry.value, EMPTY])) as Record<
  PolicyTopic,
  Draft
>;

const UPDATED_STYLE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default function AdminPoliciesPage() {
  const [topic, setTopic] = useState<PolicyTopic>("returns");
  const [saved, setSaved] = useState<Record<PolicyTopic, Draft>>(BLANKS);
  const [drafts, setDrafts] = useState<Record<PolicyTopic, Draft>>(BLANKS);
  const [stamps, setStamps] = useState<Partial<Record<PolicyTopic, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPolicies()
      .then((policies) => {
        if (cancelled) return;
        const next = { ...BLANKS };
        const timestamps: Partial<Record<PolicyTopic, string>> = {};
        for (const policy of policies) {
          next[policy.topic] = { title: policy.title, content: policy.content };
          timestamps[policy.topic] = policy.updatedAt;
        }
        setSaved(next);
        setDrafts(next);
        setStamps(timestamps);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setFailure(cause instanceof Error ? cause.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = TOPICS.find((entry) => entry.value === topic);
  const current = drafts[topic];
  const dirty = current.title !== saved[topic].title || current.content !== saved[topic].content;
  const stamp = stamps[topic];
  const filled = Object.values(saved).some((entry) => entry.content !== "");

  function edit(patch: Partial<Draft>) {
    setDrafts((previous) => ({ ...previous, [topic]: { ...previous[topic], ...patch } }));
    setJustSaved(false);
  }

  async function save() {
    if (!current.title.trim() || !current.content.trim()) {
      setFailure("A policy needs both a title and the text itself.");
      return;
    }
    setSaving(true);
    try {
      const input = { title: current.title.trim(), content: current.content.trim() };
      const policy = await savePolicy(topic, input);
      setSaved((previous) => ({ ...previous, [topic]: input }));
      setDrafts((previous) => ({ ...previous, [topic]: input }));
      setStamps((previous) => ({ ...previous, [topic]: policy.updatedAt }));
      setFailure(null);
      setJustSaved(true);
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="admin-policies-page" className="flex flex-col gap-4">
      <FilterBar>
        <Segmented
          ariaLabel="Policy topic"
          options={TOPICS.map((entry) => ({ value: entry.value, label: entry.label }))}
          value={topic}
          onChange={setTopic}
        />
      </FilterBar>

      {failure ? <Alert>{failure}</Alert> : null}
      {justSaved && !failure ? (
        <Alert tone="success">
          Saved. The assistant quotes this the next time a shopper asks about{" "}
          {active?.label.toLowerCase() ?? "that topic"}.
        </Alert>
      ) : null}

      <Panel className="border-admin-line bg-admin-card">
        <PanelHeader
          className="border-admin-line"
          title={`${active?.label ?? "Policy"} policy`}
          desc={active?.blurb}
          actions={
            <>
              <Button
                className={LINE_BUTTON}
                disabled={loading || !dirty}
                onClick={() => {
                  setDrafts((previous) => ({ ...previous, [topic]: saved[topic] }));
                  setJustSaved(false);
                }}
              >
                <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={1.9} />
                Discard
              </Button>
              <Button variant="ink" disabled={saving || loading || !dirty} onClick={save}>
                {saving ? "Saving…" : "Save policy"}
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-4 p-4">
          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-10 w-full animate-pulse rounded-xl bg-admin-line" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-admin-line" />
            </div>
          ) : (
            <>
              <TextField
                label="Title"
                value={current.title}
                onChange={(event) => edit({ title: event.target.value })}
                placeholder="30-Day Hassle-Free Returns"
              />
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="policy-content"
                  className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted uppercase"
                >
                  Policy text
                </label>
                <textarea
                  id="policy-content"
                  rows={14}
                  value={current.content}
                  onChange={(event) => edit({ content: event.target.value })}
                  placeholder="Write it the way you would say it to a customer."
                  className={cn(
                    "w-full resize-y rounded-xl border border-admin-line bg-admin-canvas px-3 py-2.5",
                    "text-[13px] leading-relaxed text-admin-ink",
                    "transition-colors duration-150 ease-expo placeholder:text-subtle",
                    "focus:border-admin-ink/35 focus:outline-none"
                  )}
                />
                <p className="flex items-center gap-2 px-1 text-xs text-subtle">
                  {dirty ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      Unsaved changes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={13}
                        strokeWidth={2}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                      In sync
                    </span>
                  )}
                  <span aria-hidden className="size-1 rounded-full bg-admin-line" />
                  <span>
                    {current.content.trim()
                      ? `${current.content.trim().split(/\s+/).length} words`
                      : "Nothing written yet"}
                  </span>
                  <span aria-hidden className="size-1 rounded-full bg-admin-line" />
                  <span>
                    {stamp ? `Saved ${UPDATED_STYLE.format(new Date(stamp))}` : "Never saved"}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </Panel>

      {!loading && !filled ? (
        <p className="px-1 text-xs text-muted">
          No policies have been written for this store yet — the assistant currently answers from
          the catalog alone.
        </p>
      ) : null}
    </section>
  );
}
