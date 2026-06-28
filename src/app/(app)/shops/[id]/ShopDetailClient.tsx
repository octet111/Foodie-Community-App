"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppProfile } from "@/lib/app-data";
import type { ClaimItem, Shop, ShopEvent, UserStock } from "@/lib/shops-data";
import { EVENT_STATUS_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConnChip } from "@/components/ui/ConnChip";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SecureClaimModal } from "@/components/shops/SecureClaimModal";
import { ShopEditModal } from "@/components/shops/ShopEditModal";
import { ShopThumb } from "@/components/shops/ShopThumb";
import { deleteShopIfAllowed, deleteUserStock } from "@/lib/shop-actions";
import { UserAvatar } from "@/components/ui/UserAvatar";

type ShopDetailClientProps = {
  shop: Shop;
  claims: ClaimItem[];
  events: ShopEvent[];
  profile: AppProfile;
  userClaim: ClaimItem | null;
  userStock: UserStock | null;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

export function ShopDetailClient({
  shop,
  claims,
  events,
  profile,
  userClaim,
  userStock,
}: ShopDetailClientProps) {
  const router = useRouter();
  const [claimOpen, setClaimOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isCreator = shop.created_by === profile.id;
  const serverMemo = userStock?.memo ?? "";
  const serverIsPrivate = userStock?.is_private ?? false;
  const [memoDraft, setMemoDraft] = useState(serverMemo);
  const [isPrivate, setIsPrivate] = useState(serverIsPrivate);
  const [memoLoading, setMemoLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [memoError, setMemoError] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  async function handleSaveMemo() {
    if (!userStock) return;

    setMemoLoading(true);
    setMemoError(null);

    const trimmed = memoDraft.trim();
    const supabase = createClient();
    const { error } = await supabase
      .from("stocks")
      .update({ memo: trimmed || null })
      .eq("id", userStock.id)
      .eq("user_id", profile.id);

    setMemoLoading(false);

    if (error) {
      setMemoError(error.message);
      return;
    }

    setMemoDraft(trimmed);
    router.refresh();
  }

  async function handleTogglePrivacy() {
    if (!userStock) return;

    const next = !isPrivate;
    setPrivacyLoading(true);
    setPrivacyError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("stocks")
      .update({ is_private: next })
      .eq("id", userStock.id)
      .eq("user_id", profile.id);

    setPrivacyLoading(false);

    if (error) {
      setPrivacyError(error.message);
      return;
    }

    setIsPrivate(next);
    router.refresh();
  }

  const memoDirty = memoDraft.trim() !== serverMemo.trim();

  async function handleDeleteStock() {
    if (!userStock) return;
    if (!window.confirm(`「${shop.name}」を行きたいリストから削除しますか？`)) return;

    setDeleting(true);
    setDeleteError(null);

    const supabase = createClient();
    const { error: stockError } = await deleteUserStock(
      supabase,
      userStock.id,
      profile.id,
    );

    if (stockError) {
      setDeleteError(stockError);
      setDeleting(false);
      return;
    }

    if (isCreator) {
      const { error: shopError } = await deleteShopIfAllowed(
        supabase,
        shop.id,
        profile.id,
      );
      if (shopError) {
        setDeleteError(shopError);
        setDeleting(false);
        return;
      }
    }

    setDeleting(false);
    router.push("/shops");
    router.refresh();
  }

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
        {isCreator && (
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              className="text-xs text-brass"
              onClick={() => setEditOpen(true)}
            >
              エリア・予約難易度を編集
            </button>
          </div>
        )}
      </Card>

      {userStock && (
        <>
          <SectionTitle>行きたいメモ</SectionTitle>
          <Card className="flex flex-col gap-2">
            <label htmlFor="stock-memo" className="text-xs text-txt-2">
              行きたい理由（任意）
            </label>
            <textarea
              id="stock-memo"
              className={`${inputClass} min-h-[88px] resize-y`}
              placeholder="なぜ行きたいか、どんな時に行きたいか…"
              value={memoDraft}
              onChange={(e) => setMemoDraft(e.target.value)}
            />
            {memoError && (
              <p className="text-xs text-shu" role="alert">
                {memoError}
              </p>
            )}
            <Button
              variant="outline"
              className="self-end py-1.5 text-[11px]"
              disabled={memoLoading || !memoDirty}
              onClick={handleSaveMemo}
            >
              {memoLoading ? "保存中…" : "保存"}
            </Button>
          </Card>

          <SectionTitle>公開設定</SectionTitle>
          <Card className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-txt">
              <input
                type="checkbox"
                checked={isPrivate}
                disabled={privacyLoading}
                onChange={handleTogglePrivacy}
                className="rounded border-line"
              />
              非公開（自分だけ表示）
            </label>
            <p className="text-[11px] text-txt-muted">
              {isPrivate
                ? "この店はあなたのリストにのみ表示されます。"
                : "コミュニティの「みんな」タブに表示されます。"}
            </p>
            {privacyError && (
              <p className="text-xs text-shu" role="alert">
                {privacyError}
              </p>
            )}
          </Card>

          <SectionTitle>行きたいリスト</SectionTitle>
          <Card className="flex flex-col gap-2">
            <p className="text-[11px] text-txt-muted">
              行きたいリストから削除すると、この店はあなたのリストに表示されなくなります。
            </p>
            {deleteError && (
              <p className="text-xs text-shu" role="alert">
                {deleteError}
              </p>
            )}
            <Button
              variant="danger"
              className="self-start py-1.5 text-[11px]"
              disabled={deleting}
              onClick={handleDeleteStock}
            >
              {deleting ? "削除中…" : "行きたいリストから削除"}
            </Button>
          </Card>
        </>
      )}

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
                <UserAvatar
                  nickname={claim.nickname}
                  avatarUrl={claim.avatarUrl}
                  className="h-6 w-6 text-[10px] font-bold"
                />
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

      {isCreator && (
        <ShopEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          shop={shop}
          userId={profile.id}
        />
      )}
    </>
  );
}
