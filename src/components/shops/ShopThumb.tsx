import type { Shop } from "@/lib/shops-data";
import { getShopImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type ShopThumbProps = {
  shop: Pick<Shop, "name" | "ogp_image_url" | "image_path">;
  className?: string;
};

export function ShopThumb({ shop, className = "" }: ShopThumbProps) {
  const supabase = createClient();
  const src = getShopImageUrl(supabase, shop);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={shop.name}
        className={`shrink-0 rounded-lg border border-line bg-card-2 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-line bg-card-2 font-display text-xs text-txt-muted ${className}`}
      aria-hidden
    >
      店
    </div>
  );
}
