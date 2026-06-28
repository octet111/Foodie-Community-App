"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import {
  formatStorageUploadError,
  getAvatarUrl,
  MAX_IMAGE_UPLOAD_LABEL,
  removeAvatarFile,
  uploadAvatar,
  validateImageFileSize,
} from "@/lib/storage";
import { SecureClaimModal } from "@/components/shops/SecureClaimModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarPath, setAvatarPath] = useState(profile.avatarPath);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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

  async function handleAvatarChange(file: File) {
    setAvatarLoading(true);
    setAvatarError(null);

    const supabase = createClient();
    const previousPath = avatarPath;

    try {
      validateImageFileSize(file);
      const path = await uploadAvatar(supabase, profile.id, file);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", profile.id);

      if (error) throw error;

      if (previousPath) {
        await removeAvatarFile(supabase, previousPath).catch(() => undefined);
      }

      setAvatarPath(path);
      setAvatarUrl(getAvatarUrl(supabase, path));
      router.refresh();
    } catch (e) {
      setAvatarError(
        e instanceof Error ? e.message : formatStorageUploadError(e),
      );
    } finally {
      setAvatarLoading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  }

  async function handleAvatarRemove() {
    if (!avatarPath) return;

    setAvatarLoading(true);
    setAvatarError(null);

    const supabase = createClient();
    const previousPath = avatarPath;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_path: null })
        .eq("id", profile.id);

      if (error) throw error;

      await removeAvatarFile(supabase, previousPath).catch(() => undefined);

      setAvatarPath(null);
      setAvatarUrl(null);
      router.refresh();
    } catch (e) {
      setAvatarError(
        e instanceof Error ? e.message : formatStorageUploadError(e),
      );
    } finally {
      setAvatarLoading(false);
    }
  }

  const claimForModal: ClaimItem | null = editClaim
    ? {
        id: editClaim.id,
        claim_type: editClaim.claim_type,
        note: editClaim.note,
        user_id: profile.id,
        nickname,
        avatarUrl,
      }
    : null;

  return (
    <>
      <Card className="flex flex-col gap-3">
        {!editingNickname ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1">
            <UserAvatar
              nickname={nickname}
              avatarUrl={avatarUrl}
              className="h-10 w-10 text-sm font-bold"
            />
            <div className="min-w-0 pt-0.5">
              <p className="font-display text-sm font-semibold text-heading">
                {nickname}
              </p>
              <button
                type="button"
                className="mt-0.5 text-[11px] text-txt-2 hover:text-brass"
                onClick={() => {
                  setNicknameDraft(nickname);
                  setEditingNickname(true);
                }}
              >
                ニックネームを編集
              </button>
            </div>
            {profile.role === "admin" && (
              <span className="shrink-0 rounded-lg border border-brass/35 bg-brass/15 px-2 py-0.5 text-[9px] font-bold text-brass">
                admin
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4">
              <UserAvatar
                nickname={nickname}
                avatarUrl={avatarUrl}
                className="h-10 w-10 text-sm font-bold"
              />
              <p className="text-xs text-txt-muted">ニックネームを編集</p>
              {profile.role === "admin" && (
                <span className="shrink-0 rounded-lg border border-brass/35 bg-brass/15 px-2 py-0.5 text-[9px] font-bold text-brass">
                  admin
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className={inputClass}
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                aria-label="ニックネーム"
                maxLength={40}
                spellCheck={false}
                autoComplete="nickname"
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
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={avatarFileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            className="hidden"
            aria-label="アイコン画像"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarChange(file);
            }}
          />
          <Button
            variant="outline"
            className="py-1.5 text-[11px]"
            disabled={avatarLoading}
            onClick={() => avatarFileRef.current?.click()}
          >
            {avatarLoading ? "処理中…" : "アイコンを変更"}
          </Button>
          {avatarPath && (
            <Button
              variant="outline"
              className="py-1.5 text-[11px]"
              disabled={avatarLoading}
              onClick={() => void handleAvatarRemove()}
            >
              アイコンを削除
            </Button>
          )}
          <span className="text-[10px] text-txt-muted">
            {MAX_IMAGE_UPLOAD_LABEL}以下
          </span>
        </div>
        {avatarError && (
          <p className="text-xs text-shu" role="alert">
            {avatarError}
          </p>
        )}
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
            <Link href={`/events/${event.id}/settlement`} prefetch={false}>
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
