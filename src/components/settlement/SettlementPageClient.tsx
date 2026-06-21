"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppProfile } from "@/lib/app-data";
import type { SettlementItemRow, SettlementRow } from "@/lib/settlement-data";
import type { EventDetail, ParticipationRow } from "@/lib/events-data";
import {
  buildCollectionMessage,
  buildInitialPartActuals,
  buildPartInputsFromParticipations,
  calculateSettlementAmounts,
  formatPartLabels,
  isDraftParticipationId,
  isDraftSettlementItemId,
  isPersistedSettlementItemId,
  mergeCalculatedItems,
  extractManualAmounts,
  participationKey,
  settlementNeedsSave,
  sumItemAmounts,
} from "@/lib/settlement";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

type SettlementPageClientProps = {
  event: EventDetail;
  eventId: string;
  settlement: SettlementRow;
  items: SettlementItemRow[];
  isManager: boolean;
  profile: AppProfile;
  transferInfo: string;
  allProfiles: { id: string; nickname: string }[];
};

const inputClass =
  "w-full rounded-[var(--radius-input)] border border-line bg-card-2 px-2 py-1.5 text-sm text-txt outline-none focus:border-brass/50";

function buildInitialPartActualsForEvent(
  event: EventDetail,
  settlement: SettlementRow,
): Record<string, number> {
  const countByPartId: Record<string, number> = {};
  for (const p of event.participations) {
    countByPartId[p.event_part_id] =
      (countByPartId[p.event_part_id] ?? 0) + 1;
  }
  return buildInitialPartActuals(
    event.parts,
    settlement.part_actuals ?? {},
    countByPartId,
  );
}

export function SettlementPageClient({
  event,
  eventId,
  settlement: initialSettlement,
  items: initialItems,
  isManager,
  profile,
  transferInfo,
  allProfiles,
}: SettlementPageClientProps) {
  const router = useRouter();
  const [settlement, setSettlement] = useState(initialSettlement);

  const initialPartActuals = useMemo(
    () => buildInitialPartActualsForEvent(event, initialSettlement),
    [event, initialSettlement],
  );

  const [partActualInputs, setPartActualInputs] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      event.parts.map((part) => [
        part.id,
        String(initialPartActuals[part.id] ?? 0),
      ]),
    ),
  );

  const draftPartActuals = useMemo(() => {
    const out: Record<string, number> = {};
    for (const part of event.parts) {
      const raw = partActualInputs[part.id] ?? "";
      if (raw === "") {
        out[part.id] = 0;
      } else {
        const num = Number(raw);
        out[part.id] = Number.isFinite(num) && num >= 0 ? num : 0;
      }
    }
    return out;
  }, [event.parts, partActualInputs]);

  const [savedParticipations, setSavedParticipations] = useState<
    ParticipationRow[]
  >(event.participations);
  const [draftParticipations, setDraftParticipations] = useState<
    ParticipationRow[]
  >(event.participations);
  const [savedPartActuals, setSavedPartActuals] =
    useState(initialPartActuals);
  const [savedItems, setSavedItems] = useState(initialItems);
  const [draftItems, setDraftItems] = useState(initialItems);
  const [removedSavedItemIds, setRemovedSavedItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [savedManualAmounts, setSavedManualAmounts] = useState<
    Record<string, number>
  >(() => extractManualAmounts(initialItems));
  const [manualAmountOverrides, setManualAmountOverrides] = useState<
    Record<string, number>
  >(() => extractManualAmounts(initialItems));

  const manualAmountOverridesMap = useMemo(
    () => new Map(Object.entries(manualAmountOverrides)),
    [manualAmountOverrides],
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [deadline, setDeadline] = useState("");

  const isFinalized = settlement.status === "finalized";
  const nicknameByUserId = useMemo(
    () => new Map(allProfiles.map((p) => [p.id, p.nickname])),
    [allProfiles],
  );

  const partInputs = useMemo(
    () =>
      buildPartInputsFromParticipations(
        event.parts,
        draftParticipations,
        draftPartActuals,
      ),
    [event.parts, draftParticipations, draftPartActuals],
  );

  const needsSave = useMemo(
    () =>
      !isFinalized &&
      settlementNeedsSave({
        savedParticipations,
        draftParticipations,
        savedPartActuals,
        draftPartActuals,
        savedManualAmounts,
        manualAmountOverrides,
        savedItems,
        draftItems,
        removedSavedItemIds,
        partInputs,
      }),
    [
      isFinalized,
      savedParticipations,
      draftParticipations,
      savedPartActuals,
      draftPartActuals,
      savedManualAmounts,
      manualAmountOverrides,
      savedItems,
      draftItems,
      removedSavedItemIds,
      partInputs,
    ],
  );

  useEffect(() => {
    if (!isManager || !needsSave) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isManager, needsSave]);

  const displayItems = useMemo(() => {
    if (!isManager || isFinalized) return savedItems;
    return mergeCalculatedItems(
      draftItems,
      partInputs,
      draftParticipations,
      nicknameByUserId,
      manualAmountOverridesMap,
    );
  }, [
    isManager,
    isFinalized,
    savedItems,
    draftItems,
    partInputs,
    draftParticipations,
    nicknameByUserId,
    manualAmountOverridesMap,
  ]);

  const totalCollected = sumItemAmounts(displayItems);

  const displayUserIds = new Set(displayItems.map((i) => i.user_id));
  const addableProfiles = allProfiles.filter(
    (p) => !displayUserIds.has(p.id),
  );

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const saveSettlementTotals = useCallback(
    async (
      nextItems: SettlementItemRow[],
      nextPartActuals: Record<string, number>,
    ) => {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("settlements")
        .update({
          total_collected: sumItemAmounts(nextItems),
          part_actuals: nextPartActuals,
        })
        .eq("id", settlement.id);

      if (updateError) throw updateError;
    },
    [settlement.id],
  );

  async function handleSave() {
    if (!isManager || isFinalized || !needsSave || busy) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();

    try {
      const savedPartMap = new Map(
        savedParticipations.map((p) => [
          participationKey(p.user_id, p.event_part_id),
          p,
        ]),
      );
      const draftPartMap = new Map(
        draftParticipations.map((p) => [
          participationKey(p.user_id, p.event_part_id),
          p,
        ]),
      );

      let syncedParticipations = [...draftParticipations];

      for (const [key, saved] of savedPartMap) {
        if (!draftPartMap.has(key) && !isDraftParticipationId(saved.id)) {
          const { error: deleteError } = await supabase
            .from("participations")
            .delete()
            .eq("id", saved.id);
          if (deleteError) throw deleteError;
        }
      }

      for (const [key, draft] of draftPartMap) {
        if (!savedPartMap.has(key)) {
          const { data, error: insertError } = await supabase
            .from("participations")
            .insert({
              user_id: draft.user_id,
              event_part_id: draft.event_part_id,
              status: "joined",
            })
            .select("id, user_id, event_part_id")
            .single();

          if (insertError || !data) {
            throw new Error(
              insertError?.message ?? "参加パートの追加に失敗しました",
            );
          }

          syncedParticipations = syncedParticipations.map((p) =>
            p.user_id === draft.user_id &&
            p.event_part_id === draft.event_part_id
              ? {
                  id: data.id,
                  user_id: data.user_id,
                  event_part_id: data.event_part_id,
                  nickname: nicknameByUserId.get(draft.user_id) ?? "不明",
                }
              : p,
          );
        }
      }

      for (const id of removedSavedItemIds) {
        const { error: deleteError } = await supabase
          .from("settlement_items")
          .delete()
          .eq("id", id);
        if (deleteError) throw deleteError;
      }

      const { error: partActualsError } = await supabase
        .from("settlements")
        .update({ part_actuals: draftPartActuals })
        .eq("id", settlement.id);
      if (partActualsError) throw partActualsError;

      const inputs = buildPartInputsFromParticipations(
        event.parts,
        syncedParticipations,
        draftPartActuals,
      );
      const calculated = calculateSettlementAmounts(inputs);

      const { data: freshRows } = await supabase
        .from("settlement_items")
        .select("*")
        .eq("settlement_id", settlement.id);
      const freshByUser = new Map(
        (freshRows ?? []).map((r) => [r.user_id, r] as const),
      );

      const draftByUser = new Map(draftItems.map((i) => [i.user_id, i]));
      const draftAddUsers = new Set(
        draftItems
          .filter((i) => i.id.startsWith("draft-add-"))
          .map((i) => i.user_id),
      );

      const nextItems: SettlementItemRow[] = [];

      for (const calc of calculated) {
        const fresh = freshByUser.get(calc.userId);
        if (fresh && removedSavedItemIds.has(fresh.id)) continue;

        const manual = manualAmountOverrides[calc.userId];
        const amount = manual != null ? manual : calc.amount;
        const adjustedBy = manual != null ? profile.id : null;
        const partIds = syncedParticipations
          .filter((p) => p.user_id === calc.userId)
          .map((p) => p.event_part_id);

        if (fresh) {
          const { error: updateError } = await supabase
            .from("settlement_items")
            .update({ amount, adjusted_by: adjustedBy })
            .eq("id", fresh.id);
          if (updateError) throw updateError;

          nextItems.push({
            id: fresh.id,
            user_id: fresh.user_id,
            nickname: nicknameByUserId.get(calc.userId) ?? "不明",
            amount,
            paid: fresh.paid,
            paid_at: fresh.paid_at,
            adjusted_by: adjustedBy,
            partIds,
          });
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("settlement_items")
            .insert({
              settlement_id: settlement.id,
              user_id: calc.userId,
              amount,
              adjusted_by: adjustedBy,
            })
            .select("*")
            .single();

          if (insertError || !inserted) {
            throw new Error(
              insertError?.message ?? "明細の追加に失敗しました",
            );
          }

          nextItems.push({
            id: inserted.id,
            user_id: inserted.user_id,
            nickname: nicknameByUserId.get(calc.userId) ?? "不明",
            amount: inserted.amount,
            paid: inserted.paid,
            paid_at: inserted.paid_at,
            adjusted_by: inserted.adjusted_by,
            partIds,
          });
        }
      }

      for (const userId of draftAddUsers) {
        if (nextItems.some((i) => i.user_id === userId)) continue;

        const draftItem = draftByUser.get(userId);
        if (!draftItem) continue;

        const manual = manualAmountOverrides[userId];
        const amount = manual ?? draftItem.amount;
        const adjustedBy = manual != null ? profile.id : null;

        const { data: inserted, error: insertError } = await supabase
          .from("settlement_items")
          .insert({
            settlement_id: settlement.id,
            user_id: userId,
            amount,
            adjusted_by: adjustedBy,
          })
          .select("*")
          .single();

        if (insertError || !inserted) {
          throw new Error(
            insertError?.message ?? "明細の追加に失敗しました",
          );
        }

        nextItems.push({
          id: inserted.id,
          user_id: inserted.user_id,
          nickname: nicknameByUserId.get(userId) ?? "不明",
          amount: inserted.amount,
          paid: inserted.paid,
          paid_at: inserted.paid_at,
          adjusted_by: inserted.adjusted_by,
          partIds: syncedParticipations
            .filter((p) => p.user_id === userId)
            .map((p) => p.event_part_id),
        });
      }

      await saveSettlementTotals(nextItems, draftPartActuals);

      setSavedParticipations(syncedParticipations);
      setDraftParticipations(syncedParticipations);
      setSavedPartActuals({ ...draftPartActuals });
      setPartActualInputs(
        Object.fromEntries(
          event.parts.map((part) => [
            part.id,
            String(draftPartActuals[part.id] ?? 0),
          ]),
        ),
      );
      const nextManual = extractManualAmounts(nextItems);
      setSavedManualAmounts(nextManual);
      setManualAmountOverrides(nextManual);
      setSavedItems(nextItems);
      setDraftItems(nextItems);
      setRemovedSavedItemIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }

    setBusy(false);
  }

  function handlePartActualChange(partId: string, value: string) {
    setPartActualInputs((prev) => ({ ...prev, [partId]: value }));
  }

  function handlePartToggle(
    userId: string,
    partId: string,
    checked: boolean,
  ) {
    if (!isManager || isFinalized || busy) return;

    if (checked) {
      setDraftParticipations((prev) => [
        ...prev,
        {
          id: `draft-${userId}-${partId}`,
          user_id: userId,
          event_part_id: partId,
          nickname: nicknameByUserId.get(userId) ?? "不明",
        },
      ]);
    } else {
      setDraftParticipations((prev) =>
        prev.filter(
          (p) => !(p.user_id === userId && p.event_part_id === partId),
        ),
      );
    }
    setManualAmountOverrides((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function handleManualAmountChange(userId: string, value: string) {
    if (!isManager || isFinalized) return;
    if (value === "") {
      setManualAmountOverrides((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      return;
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) return;

    setManualAmountOverrides((prev) => ({ ...prev, [userId]: amount }));
  }

  async function handlePaidToggle(itemId: string, paid: boolean) {
    if (
      !isManager ||
      isFinalized ||
      isDraftSettlementItemId(itemId) ||
      busy
    ) {
      return;
    }

    const updatePaid = (items: SettlementItemRow[]) =>
      items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              paid,
              paid_at: paid ? new Date().toISOString() : null,
            }
          : i,
      );

    setSavedItems((prev) => updatePaid(prev));
    setDraftItems((prev) => updatePaid(prev));
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("settlement_items")
      .update({
        paid,
        paid_at: paid ? new Date().toISOString() : null,
      })
      .eq("id", itemId);

    if (updateError) {
      const revertPaid = (items: SettlementItemRow[]) =>
        items.map((i) =>
          i.id === itemId ? { ...i, paid: !paid, paid_at: null } : i,
        );
      setSavedItems((prev) => revertPaid(prev));
      setDraftItems((prev) => revertPaid(prev));
      setError(updateError.message);
    }

    setBusy(false);
  }

  function handleAddRow() {
    if (!addUserId || !isManager || isFinalized) return;

    const nickname =
      allProfiles.find((p) => p.id === addUserId)?.nickname ?? "不明";

    setDraftItems((prev) => [
      ...prev,
      {
        id: `draft-add-${addUserId}`,
        user_id: addUserId,
        nickname,
        amount: 0,
        paid: false,
        paid_at: null,
        adjusted_by: null,
        partIds: [],
      },
    ]);
    setAddUserId("");
  }

  function handleRemoveRow(userId: string) {
    if (!isManager || isFinalized || busy) return;
    if (!confirm("この行を除外しますか？")) return;

    const saved = savedItems.find((i) => i.user_id === userId);
    if (saved && isPersistedSettlementItemId(saved.id)) {
      setRemovedSavedItemIds((prev) => new Set([...prev, saved.id]));
    }

    setDraftParticipations((prev) => prev.filter((p) => p.user_id !== userId));
    setDraftItems((prev) => prev.filter((i) => i.user_id !== userId));
    setManualAmountOverrides((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  async function handleFinalize() {
    if (!isManager || isFinalized || needsSave) return;
    if (!confirm("精算を確定しますか？確定後は明細の編集がロックされます。"))
      return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("settlements")
        .update({ status: "finalized" })
        .eq("id", settlement.id);

      if (updateError) throw updateError;

      const { error: eventError } = await supabase
        .from("events")
        .update({ status: "held" })
        .eq("id", eventId)
        .in("status", ["open", "closed"]);

      if (eventError) throw eventError;

      setSettlement((s) => ({ ...s, status: "finalized" }));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "確定に失敗しました");
    }

    setBusy(false);
  }

  async function handleUnfinalize() {
    if (!isManager || !isFinalized) return;
    if (!confirm("確定を取り消して再編集しますか？")) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("settlements")
      .update({ status: "collecting" })
      .eq("id", settlement.id);

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    await supabase
      .from("events")
      .update({ status: "closed" })
      .eq("id", eventId)
      .eq("status", "held");

    setSettlement((s) => ({ ...s, status: "collecting" }));
    setBusy(false);
    refresh();
  }

  async function handleCopyMessage() {
    const text = buildCollectionMessage({
      eventTitle: event.title,
      items: displayItems,
      transferInfo,
      deadline: deadline || undefined,
    });
    await navigator.clipboard.writeText(text);
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 2000);
  }

  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (
      needsSave &&
      !confirm("未保存の変更があります。このページを離れますか？")
    ) {
      e.preventDefault();
    }
  }

  if (!isManager) {
    const myItem = savedItems[0];
    return (
      <div className="flex flex-col gap-3">
        <SectionTitle>あなたの精算</SectionTitle>
        {!myItem ? (
          <p className="text-sm text-txt-muted">
            精算明細はまだありません。
          </p>
        ) : (
          <Card className="flex flex-col gap-2">
            <p className="text-sm text-txt">
              請求額：¥{myItem.amount.toLocaleString()}
            </p>
            <p className="text-sm text-txt-muted">
              参加パート：
              {formatPartLabels(myItem.partIds, event.parts)}
            </p>
            <p className="text-sm">
              支払状況：
              <span className={myItem.paid ? "text-green" : "text-txt-muted"}>
                {myItem.paid ? "支払済" : "未払い"}
              </span>
            </p>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/events/${eventId}`}
        className="text-xs text-txt-muted hover:text-brass"
        onClick={handleBackClick}
      >
        ‹ 企画詳細へ
      </Link>

      <div className="flex items-center justify-between">
        <span
          className={`inline-flex rounded-[10px] px-2 py-0.5 text-[10px] font-bold ${
            isFinalized
              ? "bg-line/80 text-txt-2"
              : "bg-green/15 text-green"
          }`}
        >
          {isFinalized ? "確定済" : "集金中"}
        </span>
        <span className="text-[10px] text-txt-muted">端数は切り上げ</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {event.parts.map((part) => (
          <label
            key={part.id}
            className="min-w-[140px] flex-1 text-xs text-txt-muted"
          >
            {part.name} 実費
            <input
              type="number"
              min={0}
              aria-label={`${part.name} 実費`}
              className={`${inputClass} mt-1`}
              disabled={isFinalized || busy}
              value={partActualInputs[part.id] ?? ""}
              onChange={(e) => handlePartActualChange(part.id, e.target.value)}
            />
          </label>
        ))}
      </div>

      {displayItems.length === 0 ? (
        <p className="text-sm text-txt-muted">
          参加者がいません。メンバーを追加するか、企画詳細で参加表明があると請求額が表示されます。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[360px] text-left text-xs">
            <thead className="border-b border-line bg-card-2 text-txt-muted">
              <tr>
                <th className="px-2 py-2">メンバー</th>
                <th className="px-2 py-2">パート</th>
                <th className="px-2 py-2">請求額</th>
                <th className="px-2 py-2">支払</th>
                {!isFinalized && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item) => (
                <tr key={item.id} className="border-b border-line/60">
                  <td className="px-2 py-2 text-txt">{item.nickname}</td>
                  <td className="px-2 py-2">
                    {isFinalized ? (
                      <span className="text-txt-muted">
                        {formatPartLabels(item.partIds, event.parts)}
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {event.parts.map((part) => (
                          <label
                            key={part.id}
                            className="flex items-center gap-1.5 text-txt-muted"
                          >
                            <input
                              type="checkbox"
                              checked={draftParticipations.some(
                                (p) =>
                                  p.user_id === item.user_id &&
                                  p.event_part_id === part.id,
                              )}
                              disabled={busy}
                              onChange={(e) =>
                                handlePartToggle(
                                  item.user_id,
                                  part.id,
                                  e.target.checked,
                                )
                              }
                            />
                            <span>{part.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {isFinalized ? (
                      <span>¥{item.amount.toLocaleString()}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} w-24`}
                        value={item.amount}
                        disabled={busy}
                        onChange={(e) => {
                          handleManualAmountChange(
                            item.user_id,
                            e.target.value,
                          );
                        }}
                      />
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={item.paid}
                      disabled={
                        isFinalized ||
                        isDraftSettlementItemId(item.id) ||
                        busy
                      }
                      title={
                        isDraftSettlementItemId(item.id)
                          ? "保存後に支払チェックできます"
                          : undefined
                      }
                      onChange={(e) =>
                        handlePaidToggle(item.id, e.target.checked)
                      }
                    />
                  </td>
                  {!isFinalized && (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="text-txt-muted hover:text-red-400"
                        disabled={busy}
                        onClick={() => handleRemoveRow(item.user_id)}
                      >
                        除外
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isFinalized && addableProfiles.length > 0 && (
        <div className="flex gap-2">
          <select
            className={inputClass}
            value={addUserId}
            onChange={(e) => setAddUserId(e.target.value)}
          >
            <option value="">メンバーを追加…</option>
            {addableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!addUserId || busy}
            onClick={handleAddRow}
          >
            行を追加
          </Button>
        </div>
      )}

      <Card className="text-center">
        <p className="text-lg font-bold text-txt">
          ¥{totalCollected.toLocaleString()}
        </p>
        <p className="text-[10px] text-txt-muted">集金合計（プレビュー）</p>
      </Card>

      {!isFinalized && needsSave && (
        <p className="text-xs text-amber-400">※ 未保存の変更があります</p>
      )}

      {!isFinalized && (
        <label className="text-xs text-txt-muted">
          振込期限（連絡文用・任意）
          <input
            className={`${inputClass} mt-1`}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            placeholder="例：7/10（木）まで"
          />
        </label>
      )}

      {!isFinalized && (
        <Button disabled={!needsSave || busy} onClick={handleSave}>
          変更を保存
        </Button>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopyMessage}
        >
          {copyOk ? "コピーしました" : "集金連絡文をコピー"}
        </Button>
        {isFinalized ? (
          <Button className="flex-1" disabled={busy} onClick={handleUnfinalize}>
            確定取消
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={busy || needsSave}
            onClick={handleFinalize}
          >
            精算を確定する
          </Button>
        )}
      </div>

      <p className="text-[10px] text-txt-muted">
        実費・パート・請求額の変更はプレビュー表示されます。「変更を保存」で反映されます。支払チェックは即時保存されます。
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
