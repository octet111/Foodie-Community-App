"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppProfile } from "@/lib/app-data";
import type { ClaimItem } from "@/lib/shops-data";
import {
  formatClaimMeta,
  formatOrganizingMeta,
  formatUpcomingMeta,
} from "@/lib/me-format";
import type {
  MyClaimRow,
  MyPageData,
  MyStockRow,
} from "@/lib/me-data";
import { createClient } from "@/lib/supabase/client";
import { SecureClaimModal } from "@/components/shops/SecureClaimModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";

type MePageClientProps = {
  profile: AppProfile;
  data: MyPageData;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-dashed border-line bg-card/50 px-3 py-4 text-center text-sm text-txt-muted">
      {children}
    </p>
  );
}

function SpreadCard({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <Card
      className={`flex items-center justify-between gap-2 ${href ? "transition-colors hover:border-brass/30" : ""} ${className}`}
    >
      {children}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function MePageClient({ profile, data }: MePageClientProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(profile.nickname);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(profile.nickname);
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [editClaim, setEditClaim] = useState<MyClaimRow | null>(null);

  async function handleSaveNickname() {
    const trimmed = nicknameDraft.trim();
    if (!trimmed) {
      setNicknameError("ニックネームを入力してください。");
      return;
    }

    setNicknameLoading(true);
    setNicknameError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: trimmed })
      .eq("id", profile.id);

    setNicknameLoading(false);

    if (error) {
      setNicknameError(error.message);
      return;
    }

    setNickname(trimmed);
    setEditingNickname(false);
    router.refresh();
  }

  async function handleLogout() {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const claimForModal: ClaimItem | null = editClaim
    ? {
        id: editClaim.id,
        claim_type: editClaim.claim_type,
        note: editClaim.note,
        user_id: profile.id,
        nickname,
      }
    : null;

  return (
    <>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-line text-sm font-bold text-txt-2">
            {nickname.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            {editingNickname ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  className={inputClass}
                  value={nicknameDraft}
                  onChange={(e) => setNicknameDraft(e.target.value)}
                  aria-label="ニックネーム"
                  maxLength={40}
                />
                {nicknameError && (
                  <p className="text-xs text-shu" role="alert">
                    {nicknameError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1 py-1.5 text-[11px]"
                    disabled={nicknameLoading || !nicknameDraft.trim()}
                    onClick={handleSaveNickname}
                  >
                    {nicknameLoading ? "保存中…" : "保存"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 py-1.5 text-[11px]"
                    disabled={nicknameLoading}
                    onClick={() => {
                      setEditingNickname(false);
                      setNicknameDraft(nickname);
                      setNicknameError(null);
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-sm font-semibold text-heading">
                  {nickname}
                </p>
                <button
                  type="button"
                  className="text-[11px] text-txt-2 hover:text-brass"
                  onClick={() => {
                    setNicknameDraft(nickname);
                    setEditingNickname(true);
                  }}
                >
                  ニックネームを編集
                </button>
              </>
            )}
          </div>
          {profile.role === "admin" && (
            <span className="shrink-0 rounded-lg border border-brass/35 bg-brass/15 px-2 py-0.5 text-[9px] font-bold text-brass">
              admin
            </span>
          )}
        </div>
      </Card>

      <SectionTitle>企画中</SectionTitle>
      {data.organizing.length === 0 ? (
        <EmptyHint>
          企画中のイベントはありません。
          <Link href="/events/new" className="ml-1 text-brass underline-offset-2 hover:underline">
            企画を立てる
          </Link>
        </EmptyHint>
      ) : (
        data.organizing.map((event) => (
          <SpreadCard key={event.id}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-display text-xs font-semibold text-heading">
                  {event.title}
                </p>
                <RarityBadge rarity={event.shopRarity} />
              </div>
              <p className="mt-0.5 text-[11px] text-txt-muted">
                {formatOrganizingMeta(event)}
              </p>
            </div>
            <Link href={`/events/${event.id}/settlement`}>
              <Button variant="outline" className="shrink-0 py-1.5 text-[10px]">
                精算へ
              </Button>
            </Link>
          </SpreadCard>
        ))
      )}

      <SectionTitle>参加予定</SectionTitle>
      {data.upcoming.length === 0 ? (
        <EmptyHint>
          参加予定の企画はありません。
          <Link href="/events" className="ml-1 text-brass underline-offset-2 hover:underline">
            企画一覧を見る
          </Link>
        </EmptyHint>
      ) : (
        data.upcoming.map((event) => (
          <SpreadCard key={event.id} href={`/events/${event.id}`}>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-semibold text-heading">
                {event.title}
              </p>
              <p className="mt-0.5 text-[11px] text-txt-muted">
                {formatUpcomingMeta(event)}
              </p>
            </div>
            <span className="shrink-0 text-txt-muted" aria-hidden>
              ›
            </span>
          </SpreadCard>
        ))
      )}

      <SectionTitle>未払い</SectionTitle>
      {data.unpaid.length === 0 ? (
        <EmptyHint>未払いの精算はありません。</EmptyHint>
      ) : (
        data.unpaid.map((item) => (
          <SpreadCard key={item.eventId} href={`/events/${item.eventId}/settlement`}>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xs font-semibold text-heading">
                {item.eventTitle}
              </p>
              <p className="mt-0.5 text-[11px] text-txt-muted">
                ¥{item.amount.toLocaleString("ja-JP")}・振込先は連絡参照
              </p>
            </div>
            <span className="shrink-0 rounded-md border border-shu/40 bg-shu/10 px-2 py-0.5 text-[9px] font-bold text-shu">
              未払い
            </span>
          </SpreadCard>
        ))
      )}

      <SectionTitle>ストック・確保宣言</SectionTitle>
      {data.stocks.length === 0 && data.claims.length === 0 ? (
        <EmptyHint>
          ストックや確保宣言はまだありません。
          <Link href="/shops" className="ml-1 text-brass underline-offset-2 hover:underline">
            店一覧へ
          </Link>
        </EmptyHint>
      ) : (
        <>
          {data.stocks.map((stock: MyStockRow) => (
            <SpreadCard key={`stock-${stock.id}`} href={`/shops/${stock.shopId}`}>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-semibold text-heading">
                  {stock.shopName}
                </p>
                <p className="mt-0.5 text-[11px] text-txt-muted">
                  行きたい{stock.memo ? `：${stock.memo}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-txt-muted">›</span>
            </SpreadCard>
          ))}
          {data.claims.map((claim) => (
            <SpreadCard key={`claim-${claim.id}`}>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xs font-semibold text-heading">
                  {claim.shopName}
                </p>
                <p className="mt-0.5 text-[11px] text-txt-muted">
                  {formatClaimMeta(claim)}
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 py-1.5 text-[10px]"
                onClick={() => setEditClaim(claim)}
              >
                編集
              </Button>
            </SpreadCard>
          ))}
        </>
      )}

      <button
        type="button"
        className="py-3 text-center text-sm text-txt-muted transition-colors hover:text-shu disabled:opacity-50"
        disabled={logoutLoading}
        onClick={handleLogout}
      >
        {logoutLoading ? "ログアウト中…" : "ログアウト"}
      </button>

      {editClaim && (
        <SecureClaimModal
          open
          onClose={() => setEditClaim(null)}
          shopId={editClaim.shopId}
          shopName={editClaim.shopName}
          userId={profile.id}
          existingClaim={claimForModal}
        />
      )}
    </>
  );
}
