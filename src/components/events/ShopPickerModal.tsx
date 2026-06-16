"use client";

import { useState } from "react";
import type { Shop, ShopClaimGroup, StockItem } from "@/lib/shops-data";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShopThumb } from "@/components/shops/ShopThumb";

type ShopPickerModalProps = {
  open: boolean;
  onClose: () => void;
  stocks: StockItem[];
  claimGroups: ShopClaimGroup[];
  onSelect: (shop: Shop) => void;
};

type Tab = "stocks" | "claims";

export function ShopPickerModal({
  open,
  onClose,
  stocks,
  claimGroups,
  onSelect,
}: ShopPickerModalProps) {
  const [tab, setTab] = useState<Tab>("stocks");

  function handleSelect(shop: Shop) {
    onSelect(shop);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="店を選ぶ">
      <div className="flex flex-col gap-3">
        <div className="flex rounded-[var(--radius-btn)] border border-line bg-card p-0.5">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-bold ${
              tab === "stocks" ? "bg-card-2 text-txt" : "text-txt-muted"
            }`}
            onClick={() => setTab("stocks")}
          >
            行きたい
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-xs font-bold ${
              tab === "claims" ? "bg-card-2 text-txt" : "text-txt-muted"
            }`}
            onClick={() => setTab("claims")}
          >
            確保できる
          </button>
        </div>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {tab === "stocks" ? (
            stocks.length === 0 ? (
              <p className="py-4 text-center text-sm text-txt-muted">
                行きたい店がありません
              </p>
            ) : (
              stocks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-line bg-card-2 p-2 text-left hover:border-brass/40"
                  onClick={() => handleSelect(item.shop)}
                >
                  <ShopThumb shop={item.shop} className="h-12 w-12 shrink-0" />
                  <span className="text-sm text-txt">{item.shop.name}</span>
                </button>
              ))
            )
          ) : claimGroups.length === 0 ? (
            <p className="py-4 text-center text-sm text-txt-muted">
              確保宣言がある店がありません
            </p>
          ) : (
            claimGroups.map((group) => (
              <button
                key={group.shop.id}
                type="button"
                className="flex items-center gap-2 rounded-lg border border-line bg-card-2 p-2 text-left hover:border-brass/40"
                onClick={() => handleSelect(group.shop)}
              >
                <ShopThumb shop={group.shop} className="h-12 w-12 shrink-0" />
                <span className="text-sm text-txt">{group.shop.name}</span>
              </button>
            ))
          )}
        </div>

        <Button variant="outline" onClick={onClose}>
          閉じる
        </Button>
      </div>
    </Modal>
  );
}
