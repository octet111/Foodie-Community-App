"use client";

import { useEffect, useMemo, useState } from "react";
import type { Shop } from "@/lib/shops-data";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { ShopThumb } from "@/components/shops/ShopThumb";

type DraftShopPickerModalProps = {
  open: boolean;
  onClose: () => void;
  shops: Shop[];
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
};

export function DraftShopPickerModal({
  open,
  onClose,
  shops,
  selectedIds,
  onConfirm,
}: DraftShopPickerModalProps) {
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) {
      setDraftIds(selectedIds);
      setQuery("");
    }
  }, [open, selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (shop) =>
        shop.name.toLowerCase().includes(q) ||
        (shop.area?.toLowerCase().includes(q) ?? false),
    );
  }, [shops, query]);

  function toggleShop(id: string) {
    setDraftIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleConfirm() {
    onConfirm(draftIds);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="店リストから選ぶ">
      <div className="flex flex-col gap-3">
        <input
          className="w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50"
          placeholder="店名・エリアで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <p className="text-xs text-txt-muted">
          {draftIds.length} 件選択中（最大20件）
        </p>

        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-txt-muted">
              該当する店がありません
            </p>
          ) : (
            filtered.map((shop) => {
              const checked = draftIds.includes(shop.id);
              const disabled = !checked && draftIds.length >= 20;
              return (
                <label
                  key={shop.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                    checked
                      ? "border-brass/50 bg-brass/5"
                      : disabled
                        ? "cursor-not-allowed border-line bg-card-2 opacity-50"
                        : "border-line bg-card-2 hover:border-brass/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="shrink-0 accent-[var(--color-brass)]"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleShop(shop.id)}
                  />
                  <ShopThumb shop={shop} className="h-10 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-txt">{shop.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <RarityBadge rarity={shop.rarity} />
                      <span className="truncate text-xs text-txt-muted">
                        {shop.area ?? "エリア未設定"}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            キャンセル
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            選択を確定
          </Button>
        </div>
      </div>
    </Modal>
  );
}
