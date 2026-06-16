export type SettlementPartInput = {
  partId: string;
  name: string;
  feeEstimate: number;
  /** 未設定のときは feeEstimate を実額として使う */
  actualAmount?: number | null;
  participantUserIds: string[];
};

export type SettlementItemAmount = {
  userId: string;
  amount: number;
};

/** パートの実効実額（未入力は fee_estimate） */
export function effectivePartActual(part: SettlementPartInput): number {
  if (part.actualAmount != null && part.actualAmount > 0) {
    return part.actualAmount;
  }
  return part.feeEstimate;
}

/**
 * パートごとに ceil(実額 ÷ 人数) を算出し、ユーザーごとに合算する。
 * 参加者0人のパートはスキップする。
 */
export function calculateSettlementAmounts(
  parts: SettlementPartInput[],
): SettlementItemAmount[] {
  const totals = new Map<string, number>();

  for (const part of parts) {
    const count = part.participantUserIds.length;
    if (count === 0) continue;

    const actual = effectivePartActual(part);
    if (actual <= 0) continue;

    const perPerson = Math.ceil(actual / count);
    for (const userId of part.participantUserIds) {
      totals.set(userId, (totals.get(userId) ?? 0) + perPerson);
    }
  }

  return Array.from(totals.entries()).map(([userId, amount]) => ({
    userId,
    amount,
  }));
}

/** 参加者がいるパートの実額合計（0人パートは請求計算と同様に除外） */
export function sumPartActuals(parts: SettlementPartInput[]): number {
  return parts.reduce((sum, p) => {
    if (p.participantUserIds.length === 0) return sum;
    return sum + effectivePartActual(p);
  }, 0);
}

export function formatSurplus(surplus: number): string {
  if (surplus >= 0) return `+¥${surplus.toLocaleString()}`;
  return `-¥${Math.abs(surplus).toLocaleString()}`;
}

export function sumItemAmounts(items: { amount: number }[]): number {
  return items.reduce((sum, i) => sum + i.amount, 0);
}

export function formatPartLabels(
  partIds: string[],
  parts: { id: string; name: string }[],
): string {
  const names = partIds
    .map((id) => parts.find((p) => p.id === id)?.name)
    .filter(Boolean);
  if (names.length === 0) return "—";
  if (names.length === 1) return `${names[0]}のみ`;
  return names.join("+");
}

export type CalculatedItemMergeInput = {
  id: string;
  user_id: string;
  nickname: string;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  adjusted_by: string | null;
  partIds: string[];
};

/** 参加表明ベースの計算結果を既存明細にマージ（手動調整は維持） */
export function mergeCalculatedItems(
  items: CalculatedItemMergeInput[],
  partInputs: SettlementPartInput[],
  participations: { user_id: string; event_part_id: string }[],
  nicknameByUserId: Map<string, string>,
  manualAmountOverrides?: ReadonlyMap<string, number>,
): CalculatedItemMergeInput[] {
  const calculated = calculateSettlementAmounts(partInputs);
  const itemByUser = new Map(items.map((i) => [i.user_id, i]));
  const result: CalculatedItemMergeInput[] = [];
  const seen = new Set<string>();

  const partIdsByUser = new Map<string, string[]>();
  for (const p of participations) {
    const list = partIdsByUser.get(p.user_id) ?? [];
    list.push(p.event_part_id);
    partIdsByUser.set(p.user_id, list);
  }

  for (const calc of calculated) {
    seen.add(calc.userId);
    const existing = itemByUser.get(calc.userId);
    const partIds = partIdsByUser.get(calc.userId) ?? [];
    const manual = manualAmountOverrides?.get(calc.userId);
    const amount = manual != null ? manual : calc.amount;
    if (existing) {
      result.push({
        ...existing,
        amount,
        partIds,
        adjusted_by: manual != null ? existing.adjusted_by : null,
      });
    } else {
      result.push({
        id: `preview-${calc.userId}`,
        user_id: calc.userId,
        nickname: nicknameByUserId.get(calc.userId) ?? "不明",
        amount,
        paid: false,
        paid_at: null,
        adjusted_by: null,
        partIds,
      });
    }
  }

  for (const item of items) {
    if (!seen.has(item.user_id)) {
      const manual = manualAmountOverrides?.get(item.user_id);
      result.push({
        ...item,
        amount: manual ?? item.amount,
        partIds: partIdsByUser.get(item.user_id) ?? item.partIds ?? [],
      });
    }
  }

  return result;
}

export function buildInitialPartActuals(
  parts: { id: string; fee_estimate: number }[],
  saved: Record<string, number>,
  participationCountByPartId: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of parts) {
    const v = saved[part.id];
    if (v != null && v > 0) {
      out[part.id] = v;
    } else {
      const count = participationCountByPartId[part.id] ?? 0;
      out[part.id] = part.fee_estimate * count;
    }
  }
  return out;
}

export function buildPartInputsFromParticipations(
  parts: { id: string; name: string; fee_estimate: number }[],
  participations: { user_id: string; event_part_id: string }[],
  partActuals: Record<string, number>,
): SettlementPartInput[] {
  return parts.map((part) => ({
    partId: part.id,
    name: part.name,
    feeEstimate: part.fee_estimate,
    actualAmount: partActuals[part.id] ?? null,
    participantUserIds: participations
      .filter((p) => p.event_part_id === part.id)
      .map((p) => p.user_id),
  }));
}

export function extractManualAmounts(
  items: { user_id: string; amount: number; adjusted_by: string | null }[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    if (item.adjusted_by) out[item.user_id] = item.amount;
  }
  return out;
}

export function participationKey(userId: string, partId: string): string {
  return `${userId}:${partId}`;
}

export function isDraftParticipationId(id: string): boolean {
  return id.startsWith("draft-");
}

export function isDraftSettlementItemId(id: string): boolean {
  return id.startsWith("preview-") || id.startsWith("draft-add-");
}

export function isPersistedSettlementItemId(id: string): boolean {
  return !isDraftSettlementItemId(id);
}

function participationKeys(
  participations: { user_id: string; event_part_id: string }[],
): string[] {
  return participations
    .map((p) => participationKey(p.user_id, p.event_part_id))
    .sort();
}

function partActualsEqual(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  }
  return true;
}

function manualAmountsEqual(
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? undefined) !== (b[key] ?? undefined)) return false;
  }
  return true;
}

/** 下書きが保存済みスナップショットと異なるか */
export function settlementDraftIsDirty(opts: {
  savedParticipations: { user_id: string; event_part_id: string }[];
  draftParticipations: { user_id: string; event_part_id: string }[];
  savedPartActuals: Record<string, number>;
  draftPartActuals: Record<string, number>;
  savedManualAmounts: Record<string, number>;
  manualAmountOverrides: Record<string, number>;
  savedItems: { id: string; user_id: string }[];
  draftItems: { id: string; user_id: string }[];
  removedSavedItemIds: Set<string>;
}): boolean {
  if (opts.removedSavedItemIds.size > 0) return true;

  const savedPartKeys = participationKeys(opts.savedParticipations).join("|");
  const draftPartKeys = participationKeys(opts.draftParticipations).join("|");
  if (savedPartKeys !== draftPartKeys) return true;

  if (!partActualsEqual(opts.savedPartActuals, opts.draftPartActuals)) {
    return true;
  }

  if (!manualAmountsEqual(opts.savedManualAmounts, opts.manualAmountOverrides)) {
    return true;
  }

  if (opts.draftItems.some((item) => item.id.startsWith("draft-add-"))) {
    return true;
  }

  const draftUsers = new Set(opts.draftItems.map((i) => i.user_id));
  for (const saved of opts.savedItems) {
    if (
      !draftUsers.has(saved.user_id) &&
      !opts.removedSavedItemIds.has(saved.id)
    ) {
      return true;
    }
  }

  return false;
}

/** 保存ボタンを有効にすべきか（下書き変更 or プレビューとDBの乖離） */
export function settlementNeedsSave(opts: {
  savedParticipations: { user_id: string; event_part_id: string }[];
  draftParticipations: { user_id: string; event_part_id: string }[];
  savedPartActuals: Record<string, number>;
  draftPartActuals: Record<string, number>;
  savedManualAmounts: Record<string, number>;
  manualAmountOverrides: Record<string, number>;
  savedItems: {
    id: string;
    user_id: string;
    amount: number;
    adjusted_by: string | null;
  }[];
  draftItems: { id: string; user_id: string }[];
  removedSavedItemIds: Set<string>;
  partInputs: SettlementPartInput[];
}): boolean {
  if (settlementDraftIsDirty(opts)) return true;

  const calculated = calculateSettlementAmounts(opts.partInputs);
  const calcByUser = new Map(
    calculated.map((c) => [c.userId, c.amount] as const),
  );

  for (const [userId, amount] of calcByUser) {
    const saved = opts.savedItems.find(
      (i) => i.user_id === userId && isPersistedSettlementItemId(i.id),
    );
    if (!saved) return true;
    const manual = opts.manualAmountOverrides[userId];
    const expected = manual != null ? manual : amount;
    if (saved.amount !== expected) return true;
    const hadManual = opts.savedManualAmounts[userId] != null;
    const hasManual = manual != null;
    if (hadManual !== hasManual) return true;
  }

  const calcUsers = new Set(calcByUser.keys());
  for (const saved of opts.savedItems) {
    if (!isPersistedSettlementItemId(saved.id)) continue;
    if (opts.removedSavedItemIds.has(saved.id)) continue;
    if (!calcUsers.has(saved.user_id)) return true;
  }

  return false;
}

export function buildCollectionMessage(opts: {
  eventTitle: string;
  items: { nickname: string; amount: number; paid: boolean }[];
  transferInfo: string;
  deadline?: string;
}): string {
  const unpaid = opts.items.filter((i) => !i.paid);
  const lines = [
    `【${opts.eventTitle}】集金のご連絡`,
    "",
    ...unpaid.map((i) => `・${i.nickname}さん：¥${i.amount.toLocaleString()}`),
    "",
    opts.transferInfo
      ? `振込先：\n${opts.transferInfo}`
      : "振込先は幹事までお問い合わせください。",
  ];
  if (opts.deadline) {
    lines.push("", `お振込期限：${opts.deadline}`);
  }
  lines.push("", "よろしくお願いします。");
  return lines.join("\n");
}
