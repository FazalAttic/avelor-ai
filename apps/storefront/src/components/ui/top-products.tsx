"use client";

import { PackageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import type { ChartPoint } from "@/components/ui/area-chart";
import type { AdminMoney, AdminProduct } from "@/lib/admin-api";
import { formatMoney } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export interface RankedProduct {
  readonly product: AdminProduct;
  readonly units: number;
  readonly price: AdminMoney;
  readonly points: readonly ChartPoint[];
}

/**
 * The best seller, and the shape of its sales. One product at a time because a
 * ranking of six stacked cards is the same list the products route already
 * gives; the dots let the reader walk down the table without the card having to
 * be tall enough to hold all of it.
 */
export function TopProducts({
  items,
  index,
  onIndexChange,
}: {
  items: readonly RankedProduct[];
  index: number;
  onIndexChange: (index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="text-[13px] text-subtle">
        Nothing has sold in this period yet — this fills in as orders come in.
      </p>
    );
  }

  const { product, units, price, points } = items[Math.min(index, items.length - 1)];
  const cover = product.media[0];
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="flex min-h-0 flex-1 items-stretch gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="module-edge flex items-center gap-3 rounded-xl p-3">
          {cover ? (
            <Image
              src={cover}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-lg bg-admin-line/60 object-cover"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-admin-line/60">
              <HugeiconsIcon
                icon={PackageIcon}
                size={20}
                strokeWidth={1.7}
                className="text-muted"
              />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-admin-ink">{product.name}</p>
            <p className="flex items-center gap-1.5 pt-1 text-[11px] text-subtle">
              <span className="truncate">{product.categories[0] ?? "Uncategorised"}</span>
              <span aria-hidden>·</span>
              <span className="font-numbers shrink-0 tabular-nums">{units} sold</span>
            </p>
            <p className="font-numbers pt-1.5 text-[14px] font-medium text-admin-ink tabular-nums">
              {formatMoney(price)}
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex min-h-[92px] flex-1 gap-2">
            {points.map((point) => (
              <div key={point.label} className="relative flex-1">
                {/* The scale box stops 16px short of the column's top so the
                    tallest bucket still has room for its own number. */}
                <div className="absolute inset-x-0 top-4 bottom-0">
                  <span
                    className="absolute inset-x-0 flex flex-col items-center gap-1.5"
                    style={{ bottom: `${(point.value / max) * 100}%` }}
                  >
                    <span className="font-numbers text-[10px] leading-none text-subtle tabular-nums">
                      {point.value}
                    </span>
                    <span className="h-[3px] w-full rounded-full bg-admin-ink" />
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {points.map((point) => (
              <span
                key={point.label}
                className="flex-1 truncate text-center text-[10px] font-medium text-subtle"
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center gap-2">
        {items.map((item, i) => (
          <button
            key={item.product.id}
            type="button"
            onClick={() => onIndexChange(i)}
            aria-label={`Show ${item.product.name}, ${item.units} sold`}
            aria-current={i === index || undefined}
            className={cn(
              "w-[5px] cursor-pointer rounded-full transition-[height,background-color] duration-300 ease-expo",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue",
              i === index ? "h-[22px] bg-admin-ink" : "h-[5px] bg-admin-line hover:bg-admin-ink/40"
            )}
          />
        ))}
      </div>
    </div>
  );
}
