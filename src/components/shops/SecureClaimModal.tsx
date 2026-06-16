"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClaimType } from "@/lib/constants";
import { CLAIM_LABELS } from "@/lib/constants";
import type { ClaimItem } from "@/lib/shops-data";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type SecureClaimModalProps = {
  open: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  userId: string;
  existingClaim: ClaimItem | null;
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

const CLAIM_TYPES = Object.entries(CLAIM_LABELS) as [ClaimType, string][];

type SecureClaimFormProps = {
  shopId: string;
  shopName: string;
  userId: string;
  existingClaim: ClaimItem | null;
  onClose: () => void;
};

function SecureClaimForm({
  shopId,
  shopName,
  userId,
  existingClaim,
  onClose,
}: SecureClaimFormProps) {
  const router = useRouter();
  const [claimType, setClaimType] = useState<ClaimType>(
    existingClaim?.claim_type ?? "regular",
  );
  const [note, setNote] = useState(existingClaim?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (existingClaim) {
      const { error: updateError } = await supabase
        .from("secure_claims")
        .update({ claim_type: claimType, note: note.trim() || null })
        .eq("id", existingClaim.id)
        .eq("user_id", userId);

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("secure_claims")
        .insert({
          shop_id: shopId,
          user_id: userId,
          claim_type: claimType,
          note: note.trim() || null,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("この店には既に確保宣言があります。");
        } else {
          setError(insertError.message);
        }
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  async function handleDelete() {
    if (!existingClaim) return;
    if (!window.confirm("確保宣言を削除しますか？")) return;

    setLoading(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("secure_claims")
      .delete()
      .eq("id", existingClaim.id)
      .eq("user_id", userId);

    setLoading(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-txt-2">
        <span className="font-display text-heading">{shopName}</span>
        に対するコネを宣言します。
      </p>

      <div>
        <label htmlFor="claim-type" className="mb-1 block text-xs text-txt-2">
          コネ種別
        </label>
        <select
          id="claim-type"
          className={inputClass}
          value={claimType}
          onChange={(e) => setClaimType(e.target.value as ClaimType)}
        >
          {CLAIM_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="claim-note" className="mb-1 block text-xs text-txt-2">
          補足条件（任意）
        </label>
        <textarea
          id="claim-note"
          className={`${inputClass} min-h-[72px] resize-y`}
          placeholder="平日なら・4名まで"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-shu" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        {existingClaim && (
          <Button
            variant="outline"
            className="flex-1 text-shu"
            disabled={loading}
            onClick={handleDelete}
          >
            削除
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          disabled={loading}
          onClick={onClose}
        >
          キャンセル
        </Button>
        <Button className="flex-1" disabled={loading} onClick={handleSave}>
          {loading ? "保存中…" : "保存"}
        </Button>
      </div>
    </div>
  );
}

export function SecureClaimModal({
  open,
  onClose,
  shopId,
  shopName,
  userId,
  existingClaim,
}: SecureClaimModalProps) {
  const formKey = existingClaim?.id ?? "new";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existingClaim ? "確保宣言を編集" : "確保宣言"}
    >
      {open ? (
        <SecureClaimForm
          key={formKey}
          shopId={shopId}
          shopName={shopName}
          userId={userId}
          existingClaim={existingClaim}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}
