"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopRarity } from "@/lib/constants";
import { SHOP_RARITY_OPTIONS } from "@/lib/constants";
import type { Shop } from "@/lib/shops-data";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ShopEditModalProps = {
  open: boolean;
  onClose: () => void;
  shop: Shop;
  userId: string;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

function ShopEditForm({
  shop,
  userId,
  onClose,
}: {
  shop: Shop;
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [area, setArea] = useState(shop.area ?? "");
  const [rarity, setRarity] = useState<ShopRarity>(shop.rarity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("shops")
      .update({
        area: area.trim() || null,
        rarity,
      })
      .eq("id", shop.id)
      .eq("created_by", userId);

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-txt-2">
        <span className="font-display text-heading">{shop.name}</span>
        の情報を編集します。
      </p>

      <div>
        <label htmlFor="edit-shop-area" className="mb-1 block text-xs text-txt-2">
          エリア（任意）
        </label>
        <input
          id="edit-shop-area"
          type="text"
          className={inputClass}
          placeholder="銀座・鮨"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="edit-shop-rarity" className="mb-1 block text-xs text-txt-2">
          予約難易度
        </label>
        <select
          id="edit-shop-rarity"
          className={inputClass}
          value={rarity}
          onChange={(e) => setRarity(e.target.value as ShopRarity)}
        >
          {SHOP_RARITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-shu" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" disabled={loading} onClick={onClose}>
          キャンセル
        </Button>
        <Button className="flex-1" disabled={loading} onClick={handleSave}>
          {loading ? "保存中…" : "保存"}
        </Button>
      </div>
    </div>
  );
}

export function ShopEditModal({ open, onClose, shop, userId }: ShopEditModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="店情報を編集">
      {open ? (
        <ShopEditForm key={shop.id} shop={shop} userId={userId} onClose={onClose} />
      ) : null}
    </Modal>
  );
}
