"use client";

import { useState } from "react";
import type { AppProfile } from "@/lib/app-data";
import type { ShopClaimGroup, StockItem } from "@/lib/shops-data";
import { Button } from "@/components/ui/Button";
import { ShopAddModal } from "@/components/shops/ShopAddModal";
import { ShopClaimCard } from "@/components/shops/ShopClaimCard";
import { ShopStockCard } from "@/components/shops/ShopStockCard";

type Tab = "stocks" | "claims";
type StockView = "mine" | "public";

type ShopsPageClientProps = {
  profile: AppProfile;
  stocks: StockItem[];
  publicStocks: StockItem[];
  claimGroups: ShopClaimGroup[];
};

export function ShopsPageClient({
  profile,
  stocks,
  publicStocks,
  claimGroups,
}: ShopsPageClientProps) {
  const [tab, setTab] = useState<Tab>("stocks");
  const [stockView, setStockView] = useState<StockView>("mine");
  const [addOpen, setAddOpen] = useState(false);

  const displayedStocks = stockView === "mine" ? stocks : publicStocks;

  return (
    <>
      <div className="flex flex-col gap-3">
        <Button className="w-full" onClick={() => setAddOpen(true)}>
          ＋ 店を追加（URL貼付）
        </Button>

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

        {tab === "stocks" && (
          <div className="flex rounded-[var(--radius-btn)] border border-line/60 bg-card/50 p-0.5">
            <button
              type="button"
              className={`flex-1 rounded-md py-1 text-[11px] font-bold ${
                stockView === "mine" ? "bg-card-2 text-txt" : "text-txt-muted"
              }`}
              onClick={() => setStockView("mine")}
            >
              自分
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1 text-[11px] font-bold ${
                stockView === "public" ? "bg-card-2 text-txt" : "text-txt-muted"
              }`}
              onClick={() => setStockView("public")}
            >
              みんな
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {tab === "stocks" ? (
            displayedStocks.length === 0 ? (
              <p className="py-8 text-center text-sm text-txt-muted">
                {stockView === "mine"
                  ? "行きたい店がまだありません。上のボタンから店を追加しましょう。"
                  : "公開されている行きたい店はまだありません。"}
              </p>
            ) : (
              displayedStocks.map((item) => (
                <ShopStockCard
                  key={item.id}
                  item={item}
                  showOwner={stockView === "public"}
                  showPrivacy={stockView === "mine"}
                />
              ))
            )
          ) : claimGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-txt-muted">
              確保宣言がある店がまだありません。
            </p>
          ) : (
            claimGroups.map((group) => (
              <ShopClaimCard key={group.shop.id} group={group} />
            ))
          )}
        </div>
      </div>

      <ShopAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userId={profile.id}
      />
    </>
  );
}
