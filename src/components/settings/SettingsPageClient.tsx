"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { AppProfile } from "@/lib/app-data";
import type { MemberRow, SettingsPageData } from "@/lib/settings-data";
import { createClient } from "@/lib/supabase/client";
import {
  formatStorageUploadError,
  getCommunityLogoUrl,
  uploadCommunityLogo,
  validateImageFileSize,
} from "@/lib/storage";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SettingsSubNav } from "@/components/settings/SettingsSubNav";

type SettingsPageClientProps = {
  profile: AppProfile;
  initial: SettingsPageData;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

export function SettingsPageClient({
  profile,
  initial,
}: SettingsPageClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial.settings.name);
  const [transferInfo, setTransferInfo] = useState(
    initial.settings.transferInfo,
  );
  const [logoPath, setLogoPath] = useState(initial.settings.logoPath);
  const [members, setMembers] = useState<MemberRow[]>(initial.members);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roleLoadingId, setRoleLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const logoUrl = logoPath ? getCommunityLogoUrl(supabase, logoPath) : null;
  const logoChar = name.charAt(0) || "美";

  async function handleSaveSettings() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("コミュニティ名を入力してください。");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: trimmedName,
      transfer_info: transferInfo.trim() || null,
      logo_path: logoPath,
      updated_at: new Date().toISOString(),
    };

    let saveError: { message: string } | null = null;

    if (initial.settings.id) {
      const { error: updateError } = await supabase
        .from("community_settings")
        .update(payload)
        .eq("id", initial.settings.id);
      saveError = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("community_settings")
        .insert({
          name: trimmedName,
          transfer_info: transferInfo.trim() || null,
          logo_path: logoPath,
        });
      saveError = insertError;
    }

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setSuccess("設定を保存しました。");
    router.refresh();
  }

  async function handleLogoChange(file: File) {
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      validateImageFileSize(file);
      const path = await uploadCommunityLogo(supabase, file);
      setLogoPath(path);
      setSuccess("ロゴをアップロードしました。保存ボタンで反映してください。");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : formatStorageUploadError(e),
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleToggleRole(member: MemberRow) {
    if (member.id === profile.id) {
      setError("自分自身の管理者権限はここから変更できません。");
      return;
    }

    const nextRole = member.role === "admin" ? "member" : "admin";
    setRoleLoadingId(member.id);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: nextRole })
      .eq("id", member.id);

    setRoleLoadingId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id ? { ...m, role: nextRole } : m,
      ),
    );
    setSuccess(
      `${member.nickname} のロールを ${nextRole === "admin" ? "管理者" : "メンバー"} に変更しました。`,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SettingsSubNav />
      <SectionTitle>コミュニティ設定</SectionTitle>

      {error && (
        <p className="text-sm text-shu" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-[var(--color-green)]" role="status">
          {success}
        </p>
      )}

      <Card className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brass bg-card-2 font-display text-lg font-semibold text-brass">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${name}のロゴ`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              logoChar
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleLogoChange(file);
              }}
            />
            <Button
              variant="outline"
              className="w-fit py-1.5 text-[10px]"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "アップロード中…" : "ロゴを変更"}
            </Button>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">コミュニティ名</span>
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-txt-2">振込先（集金連絡文用）</span>
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={transferInfo}
            onChange={(e) => setTransferInfo(e.target.value)}
            placeholder="例：三菱UFJ 普通 1234567 タナカタロウ"
          />
        </label>

        <Button
          variant="primary"
          disabled={saving || !name.trim()}
          onClick={handleSaveSettings}
        >
          {saving ? "保存中…" : "設定を保存"}
        </Button>
      </Card>

      <SectionTitle>メンバー一覧</SectionTitle>
      <div className="flex flex-col gap-2">
        {members.map((member) => (
          <Card
            key={member.id}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-heading">
                {member.nickname}
                {member.id === profile.id && (
                  <span className="ml-1 text-[10px] font-normal text-txt-muted">
                    （自分）
                  </span>
                )}
              </p>
              <p className="text-[10px] text-txt-muted">
                {member.role === "admin" ? "管理者" : "メンバー"}
              </p>
              <p
                className="mt-0.5 truncate font-mono text-[10px] text-txt-muted/80"
                title={member.id}
              >
                ID: {member.id}
              </p>
            </div>
            {member.id !== profile.id && (
              <Button
                variant="outline"
                className="shrink-0 py-1.5 text-[10px]"
                disabled={roleLoadingId === member.id}
                onClick={() => void handleToggleRole(member)}
              >
                {roleLoadingId === member.id
                  ? "変更中…"
                  : member.role === "admin"
                    ? "admin剥奪"
                    : "admin付与"}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
