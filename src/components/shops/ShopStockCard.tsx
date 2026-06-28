"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StockItem } from "@/lib/shops-data";
import { deleteShopIfAllowed, deleteUserStock } from "@/lib/shop-actions";
import { createClient } from "@/lib/supabase/client";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Card } from "@/components/ui/Card";
import { ShopEditModal } from "@/components/shops/ShopEditModal";
import { ShopThumb } from "@/components/shops/ShopThumb";

type ShopStockCardProps = {
  item: StockItem;
  userId?: string;
  isAdmin?: boolean;
  showOwner?: boolean;
  showPrivacy?: boolean;
  showActions?: boolean;
};

export function ShopStockCard({
  item,
  userId,
  isAdmin = false,
  showOwner = false,
  showPrivacy = false,
  showActions = false,
}: ShopStockCardProps) {
  const router = useRouter();
  const { shop } = item;
  const isPlanned = item.has_event === true;
  const isOwnStock = userId === item.user_id;
  const isCreator = userId === shop.created_by;
  const canEdit = showActions && isCreator;
  const canDelete = showActions && userId && (isOwnStock || isAdmin);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!userId || !canDelete) return;

    const confirmMessage =
      isAdmin && !isOwnStock
        ? `管理者として「${shop.name}」の投稿を削除しますか？`
        : `「${shop.name}」を行きたいリストから削除しますか？`;
    if (!window.confirm(confirmMessage)) return;

    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error: stockError } = await deleteUserStock(supabase, item.id, {
      ownerId: item.user_id,
      asAdmin: isAdmin && !isOwnStock,
    });

    if (stockError) {
      setDeleteError(stockError);
      setDeleting(false);
      return;
    }

    if (isCreator || isAdmin) {
      const { error: shopError } = await deleteShopIfAllowed(supabase, shop.id, {
        creatorId: shop.created_by,
        asAdmin: isAdmin,
      });
      if (shopError) {
        setDeleteError(shopError);
        setDeleting(false);
        return;
      }
    }

    setDeleting(false);
    router.refresh();
  }

  return (
    <>
      <Card
        className={`flex gap-3 transition-opacity ${
          isPlanned ? "border-line/40 bg-card/60 opacity-75" : ""
        }`}
      >
        <Link href={`/shops/${shop.id}`} className="shrink-0">
          <ShopThumb
            shop={shop}
            className={`h-14 w-14 ${isPlanned ? "opacity-50 saturate-50" : ""}`}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/shops/${shop.id}`} className="min-w-0 flex-1">
              <h3
                className={`truncate font-display text-sm font-semibold hover:opacity-90 ${
                  isPlanned ? "text-txt-muted" : "text-heading"
                }`}
              >
                {shop.name}
              </h3>
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {isPlanned && (
                <span className="rounded-[var(--radius-seal)] border border-line bg-card/40 px-1.5 py-0.5 font-display text-[9px] font-bold tracking-[0.12em] text-txt-muted">
                  企画済み
                </span>
              )}
              <RarityBadge
                rarity={shop.rarity}
                className={isPlanned ? "opacity-60" : ""}
              />
            </div>
          </div>
          {showOwner && item.nickname && (
            <p className="mt-0.5 text-[11px] text-txt-muted">{item.nickname}</p>
          )}
          {shop.area && (
            <p className="mt-0.5 text-xs text-txt-muted">{shop.area}</p>
          )}
          {item.memo && (
            <p
              className={`mt-1 text-xs ${isPlanned ? "text-txt-muted" : "text-txt-2"}`}
            >
              {item.memo}
            </p>
          )}
          {showPrivacy && (
            <p className="mt-1 text-[10px] text-txt-muted">
              {item.is_private ? "非公開（自分だけ）" : "公開"}
            </p>
          )}
          {deleteError && (
            <p className="mt-1 text-[10px] text-shu" role="alert">
              {deleteError}
            </p>
          )}
          {(canEdit || canDelete) && (
            <div className="mt-2 flex gap-3">
              {canEdit && (
                <button
                  type="button"
                  className="text-[11px] text-brass"
                  onClick={() => setEditOpen(true)}
                >
                  編集
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="text-[11px] text-shu disabled:opacity-50"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? "削除中…" : isAdmin && !isOwnStock ? "削除（管理者）" : "削除"}
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {canEdit && userId && (
        <ShopEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          shop={shop}
          userId={userId}
        />
      )}
    </>
  );
}
