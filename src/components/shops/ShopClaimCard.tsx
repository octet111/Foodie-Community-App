import Link from "next/link";
import type { ShopClaimGroup } from "@/lib/shops-data";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { ConnChip } from "@/components/ui/ConnChip";
import { Card } from "@/components/ui/Card";

type ShopClaimCardProps = {
  group: ShopClaimGroup;
};

export function ShopClaimCard({ group }: ShopClaimCardProps) {
  const { shop, claims } = group;

  return (
    <Link href={`/shops/${shop.id}`}>
      <Card className="transition-opacity hover:opacity-90">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-heading">
            {shop.name}
          </h3>
          <RarityBadge rarity={shop.rarity} />
        </div>
        {shop.area && (
          <p className="mt-0.5 text-xs text-txt-muted">{shop.area}</p>
        )}
        <ul className="mt-2 flex flex-col gap-1.5">
          {claims.map((claim) => (
            <li key={claim.id} className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-card-2 text-[9px] font-bold text-txt-2">
                {claim.nickname.charAt(0)}
              </span>
              <span className="text-xs text-txt">{claim.nickname}</span>
              <ConnChip type={claim.claim_type} />
              {claim.note && (
                <span className="text-xs text-txt-muted">{claim.note}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </Link>
  );
}
