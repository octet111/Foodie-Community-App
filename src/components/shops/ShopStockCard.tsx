import Link from "next/link";
import type { StockItem } from "@/lib/shops-data";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { Card } from "@/components/ui/Card";
import { ShopThumb } from "@/components/shops/ShopThumb";

type ShopStockCardProps = {
  item: StockItem;
  showOwner?: boolean;
  showPrivacy?: boolean;
};

export function ShopStockCard({
  item,
  showOwner = false,
  showPrivacy = false,
}: ShopStockCardProps) {
  const { shop } = item;

  return (
    <Link href={`/shops/${shop.id}`}>
      <Card className="flex gap-3 transition-opacity hover:opacity-90">
        <ShopThumb shop={shop} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-display text-sm font-semibold text-heading">
              {shop.name}
            </h3>
            <RarityBadge rarity={shop.rarity} />
          </div>
          {showOwner && item.nickname && (
            <p className="mt-0.5 text-[11px] text-txt-muted">{item.nickname}</p>
          )}
          {shop.area && (
            <p className="mt-0.5 text-xs text-txt-muted">{shop.area}</p>
          )}
          {item.memo && (
            <p className="mt-1 text-xs text-txt-2">{item.memo}</p>
          )}
          {showPrivacy && (
            <p className="mt-1 text-[10px] text-txt-muted">
              {item.is_private ? "非公開（自分だけ）" : "公開"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
