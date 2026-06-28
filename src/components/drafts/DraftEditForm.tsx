"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  combineLocalDatetime,
  isoToHeldAtFields,
  localDatetimeToIso,
} from "@/lib/event-dates";
import type { DraftDetail } from "@/lib/drafts-data";
import type { DraftPart } from "@/lib/draft/types";
import { EventHeldAtFields } from "@/components/events/EventHeldAtFields";
import {
  EventPartEditor,
  createDefaultPart,
  validateParts,
  type PartDraft,
} from "@/components/events/EventPartEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { RarityBadge } from "@/components/ui/RarityBadge";

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-3 py-2 text-sm text-txt outline-none focus:border-brass/50";

function partsToDraft(parts: DraftPart[]): PartDraft[] {
  return parts.map((p, i) => ({
    key: `part-${i}`,
    name: p.name,
    capacity: String(p.capacity),
    fee_estimate: String(p.fee_estimate),
  }));
}

function draftToParts(parts: PartDraft[]): DraftPart[] {
  return parts.map((p, i) => ({
    name: p.name.trim(),
    capacity: Number(p.capacity),
    fee_estimate: Number(p.fee_estimate),
    sort_order: i + 1,
  }));
}

type DraftEditFormProps = {
  draft: DraftDetail;
};

export function DraftEditForm({ draft }: DraftEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(draft.title ?? "");
  const [description, setDescription] = useState(draft.description ?? "");
  const [shopId, setShopId] = useState(draft.shop_id ?? "");
  const [parts, setParts] = useState<PartDraft[]>(
    draft.parts.length > 0 ? partsToDraft(draft.parts) : [createDefaultPart()],
  );
  const [heldDate, setHeldDate] = useState("");
  const [heldTime, setHeldTime] = useState(
    () => isoToHeldAtFields(new Date().toISOString()).time,
  );
  const [saving, setSaving] = useState(false);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedShop = useMemo(
    () => draft.candidates.find((c) => c.shop_id === shopId),
    [draft.candidates, shopId],
  );

  async function saveDraft() {
    setError(null);
    const partError = validateParts(parts);
    if (partError) {
      setError(partError);
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!shopId) {
      setError("店を選択してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          shop_id: shopId,
          parts: draftToParts(parts),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdopt() {
    setError(null);
    if (!heldDate || !heldTime) {
      setError("開催日時を入力してください");
      return;
    }

    const partError = validateParts(parts);
    if (partError) {
      setError(partError);
      return;
    }
    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (!shopId) {
      setError("店を選択してください");
      return;
    }

    setAdopting(true);
    try {
      const saveRes = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          shop_id: shopId,
          parts: draftToParts(parts),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error ?? "保存に失敗しました");
        return;
      }

      const heldAt = combineLocalDatetime(heldDate, heldTime);
      const res = await fetch(`/api/drafts/${draft.id}/adopt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ held_at: localDatetimeToIso(heldAt) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "採用に失敗しました");
        return;
      }
      router.push(`/events/${data.event_id}`);
      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setAdopting(false);
    }
  }

  const canAdopt = Boolean(heldDate && heldTime && title.trim() && shopId);

  return (
    <div className="flex flex-col gap-3">
      <SectionTitle>企画の編集</SectionTitle>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">タイトル</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">集客文</label>
        <textarea
          className={`${inputClass} min-h-32 resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-txt-muted">店（候補から選択）</label>
        <select
          className={inputClass}
          value={shopId}
          onChange={(e) => setShopId(e.target.value)}
        >
          <option value="">選択してください</option>
          {draft.candidates.map((c) => (
            <option key={c.shop_id} value={c.shop_id}>
              {c.name}（{c.area ?? "エリア未設定"}）
            </option>
          ))}
        </select>
      </div>

      {selectedShop && (
        <Card className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-heading">{selectedShop.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <RarityBadge rarity={selectedShop.rarity} />
              <span className="text-xs text-txt-muted">
                {selectedShop.area ?? "エリア未設定"}
              </span>
            </div>
          </div>
        </Card>
      )}

      <SectionTitle>参加パート</SectionTitle>
      <EventPartEditor parts={parts} onChange={setParts} />

      <SectionTitle>開催日時（必須）</SectionTitle>
      <EventHeldAtFields
        date={heldDate}
        time={heldTime}
        onDateChange={setHeldDate}
        onTimeChange={setHeldTime}
        idPrefix="draft-held"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button variant="outline" disabled={saving} onClick={saveDraft}>
        {saving ? "保存中…" : "下書きを保存"}
      </Button>

      <Button
        disabled={!canAdopt || adopting || saving}
        onClick={handleAdopt}
      >
        {adopting ? "作成中…" : "この企画で作成"}
      </Button>

      {!canAdopt && (
        <p className="text-center text-xs text-txt-muted">
          タイトル・店・開催日時を入力すると作成できます
        </p>
      )}
    </div>
  );
}
