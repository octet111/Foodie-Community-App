"use client";

import { useState } from "react";
import Link from "next/link";
import type { AppProfile } from "@/lib/app-data";
import type { ClaimItem, Shop, ShopEvent } from "@/lib/shops-data";
import { EVENT_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnChip } from "@/components/ui/ConnChip";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SecureClaimModal } from "@/components/shops/SecureClaimModal";
import { ShopThumb } from "@/components/shops/ShopThumb";

type ShopDetailClientProps = {
  shop: Shop;
  claims: ClaimItem[];
  events: ShopEvent[];
  profile: AppProfile;
  userClaim: ClaimItem | null;
};

export function ShopDetailClient({
  shop,
  claims,
  events,
  profile,
  userClaim,
}: ShopDetailClientProps) {
  const [claimOpen, setClaimOpen] = useState(false);

  return (
    <>
      <Card className="flex flex-col gap-3">
        <ShopThumb shop={shop} className="h-40 w-full" />
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-lg font-semibold text-heading">
            {shop.name}
          </h1>
          <RarityBadge rarity={shop.rarity} />
        </div>
        {shop.area && <p className="text-sm text-txt-muted">{shop.area}</p>}
        {shop.ogp_description && (
          <p className="text-sm leading-relaxed text-txt-2">
            {shop.ogp_description}
          </p>
        )}
        {shop.url && (
          <a
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brass underline"
          >
            店のリンクを開く
          </a>
        )}
      </Card>

      <SectionTitle>確保できる人</SectionTitle>
      {claims.length === 0 ? (
        <p className="text-sm text-txt-muted">
          まだ確保宣言がありません。あなたがコネを持っていれば宣言できます。
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {claims.map((claim) => (
            <li key={claim.id}>
              <Card className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-card-2 text-[10px] font-bold text-txt-2">
                  {claim.nickname.charAt(0)}
                </span>
                <span className="text-sm text-txt">{claim.nickname}</span>
                <ConnChip type={claim.claim_type} />
                {claim.note && (
                  <span className="text-xs text-txt-muted">{claim.note}</span>
                )}
                {claim.user_id === profile.id && (
                  <button
                    type="button"
                    className="ml-auto text-xs text-brass"
                    onClick={() => setClaimOpen(true)}
                  >
                    編集
                  </button>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setClaimOpen(true)}
      >
        {userClaim ? "確保宣言を編集" : "確保宣言する"}
      </Button>

      <SectionTitle>過去の企画</SectionTitle>
      {events.length === 0 ? (
        <p className="text-sm text-txt-muted">この店での企画はまだありません。</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => {
            const status = EVENT_STATUS_LABELS[event.status];
            return (
              <li key={event.id}>
                <Link href={`/events/${event.id}`}>
                  <Card className="flex items-center justify-between transition-opacity hover:opacity-90">
                    <div>
                      <p className="text-sm text-txt">{event.title}</p>
                      <p className="text-xs text-txt-muted">
                        {new Date(event.held_at).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] text-txt-muted">
                      {status.label}
                    </span>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link href={`/events/new?shopId=${shop.id}`}>
        <Button className="w-full">この店で企画を立てる</Button>
      </Link>

      <SecureClaimModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        shopId={shop.id}
        shopName={shop.name}
        userId={profile.id}
        existingClaim={userClaim}
      />
    </>
  );
}
