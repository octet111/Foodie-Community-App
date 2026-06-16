import type { ShopRarity } from "@/lib/constants";
import { HIDDEN_RARITIES, RARITY_LABELS } from "@/lib/constants";

type RarityBadgeProps = {
  rarity: ShopRarity;
  className?: string;
};

export function RarityBadge({ rarity, className = "" }: RarityBadgeProps) {
  if (HIDDEN_RARITIES.includes(rarity)) return null;

  const label = RARITY_LABELS[rarity];
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[var(--radius-seal)] border-[1.5px] border-shu bg-shu/10 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-[#E8694F] ${className}`}
    >
      {label}
    </span>
  );
}
