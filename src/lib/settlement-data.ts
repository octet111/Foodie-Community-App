import { createClient } from "@/lib/supabase/server";
import type { AppProfile } from "@/lib/app-data";
import type { EventDetail } from "@/lib/events-data";
import { getEventById } from "@/lib/events-data";
import {
  buildPartInputsFromParticipations,
  calculateSettlementAmounts,
  sumItemAmounts,
  sumPartActuals,
  type SettlementPartInput,
} from "@/lib/settlement";
import type { Tables } from "@/types/database";

export type SettlementRow = Tables<"settlements"> & {
  part_actuals: Record<string, number>;
};

export type SettlementItemRow = {
  id: string;
  user_id: string;
  nickname: string;
  amount: number;
  paid: boolean;
  paid_at: string | null;
  adjusted_by: string | null;
  partIds: string[];
};

export type SettlementPageData = {
  event: EventDetail;
  settlement: SettlementRow | null;
  items: SettlementItemRow[];
  isManager: boolean;
  transferInfo: string;
  allProfiles: { id: string; nickname: string }[];
};

function parsePartActuals(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

export async function isEventManager(
  eventId: string,
  userId: string,
  role: "member" | "admin",
  event?: Pick<EventDetail, "organizer_id" | "finalizer_id"> | null,
): Promise<boolean> {
  if (role === "admin") return true;

  const detail =
    event ??
    (await getEventById(eventId, userId)) ??
    null;

  if (!detail) return false;
  if (detail.organizer_id === userId) return true;
  if (detail.finalizer_id === userId) return true;

  const supabase = await createClient();
  const { data } = await supabase.rpc("is_event_manager", { eid: eventId });
  return data === true;
}

export function canAccessSettlementPage(
  event: EventDetail,
  profile: Pick<AppProfile, "id" | "role">,
  isManager: boolean,
  hasOwnItems: boolean,
): boolean {
  if (isManager) return true;
  if (event.organizer_id === profile.id) return true;
  if (event.finalizer_id === profile.id) return true;
  if (profile.role === "admin") return true;
  if (hasOwnItems) return true;
  if (event.myJoinedPartIds.length > 0) return true;
  return false;
}

function buildPartInputs(
  event: EventDetail,
  partActuals: Record<string, number>,
): SettlementPartInput[] {
  return buildPartInputsFromParticipations(
    event.parts,
    event.participations,
    partActuals,
  );
}

function mapItems(
  rawItems: Tables<"settlement_items">[],
  participations: EventDetail["participations"],
  profiles: Map<string, string>,
): SettlementItemRow[] {
  const partsByUser = new Map<string, string[]>();
  for (const p of participations) {
    const list = partsByUser.get(p.user_id) ?? [];
    list.push(p.event_part_id);
    partsByUser.set(p.user_id, list);
  }

  return rawItems.map((item) => ({
    id: item.id,
    user_id: item.user_id,
    nickname: profiles.get(item.user_id) ?? "不明",
    amount: item.amount,
    paid: item.paid,
    paid_at: item.paid_at,
    adjusted_by: item.adjusted_by,
    partIds: partsByUser.get(item.user_id) ?? [],
  }));
}

export async function getSettlementPageData(
  eventId: string,
  userId: string,
  role: "member" | "admin",
): Promise<SettlementPageData | null> {
  const event = await getEventById(eventId, userId);
  if (!event) return null;

  const supabase = await createClient();
  const manager = await isEventManager(eventId, userId, role, event);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname");
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.nickname]),
  );

  const { data: community } = await supabase
    .from("community_settings")
    .select("transfer_info")
    .limit(1)
    .maybeSingle();

  const transferInfo =
    (community as { transfer_info?: string | null } | null)?.transfer_info ??
    "";

  let settlement: SettlementRow | null = null;
  let rawItems: Tables<"settlement_items">[] = [];

  if (manager) {
    const { data: existing } = await supabase
      .from("settlements")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      settlement = {
        ...existing,
        part_actuals: parsePartActuals(
          (existing as { part_actuals?: unknown }).part_actuals,
        ),
      };
    }

    if (settlement) {
      const { data } = await supabase
        .from("settlement_items")
        .select("*")
        .eq("settlement_id", settlement.id)
        .order("amount", { ascending: false });
      rawItems = data ?? [];
    }
  } else {
    const { data: participantData } = await supabase.rpc(
      "get_my_settlement_for_event",
      { p_event_id: eventId },
    );

    if (participantData && typeof participantData === "object") {
      const parsed = participantData as unknown as {
        settlement: Tables<"settlements"> & { part_actuals?: unknown };
        item: Tables<"settlement_items">;
      };
      settlement = {
        ...parsed.settlement,
        part_actuals: parsePartActuals(parsed.settlement.part_actuals),
      };
      rawItems = [parsed.item];
    }
  }

  const items = manager
    ? mapItems(rawItems, event.participations, profileMap)
    : mapItems(rawItems, event.participations, profileMap).filter(
        (i) => i.user_id === userId,
      );

  return {
    event,
    settlement,
    items,
    isManager: manager,
    transferInfo,
    allProfiles: profiles ?? [],
  };
}

export async function ensureSettlement(
  eventId: string,
): Promise<SettlementRow | null> {
  const supabase = await createClient();

  const { data: created, error } = await supabase.rpc("ensure_settlement", {
    p_event_id: eventId,
  });

  if (error || !created) return null;

  const row = created as Tables<"settlements">;
  return {
    ...row,
    part_actuals: parsePartActuals(
      (row as { part_actuals?: unknown }).part_actuals,
    ),
  };
}

/** 参加表明にいるが settlement_items にまだいないユーザーがいれば true */
export function settlementItemsNeedSync(
  participations: { user_id: string }[],
  items: { user_id: string }[],
): boolean {
  if (participations.length === 0) return false;
  if (items.length === 0) return true;
  const itemUserIds = new Set(items.map((i) => i.user_id));
  return participations.some((p) => !itemUserIds.has(p.user_id));
}

export async function syncItemsFromParticipations(
  settlement: SettlementRow,
  event: EventDetail,
): Promise<void> {
  const supabase = await createClient();
  const partActuals = settlement.part_actuals ?? {};
  const partInputs = buildPartInputs(event, partActuals);
  const calculated = calculateSettlementAmounts(partInputs);

  const { data: existing } = await supabase
    .from("settlement_items")
    .select("*")
    .eq("settlement_id", settlement.id);

  const existingByUser = new Map(
    (existing ?? []).map((i) => [i.user_id, i]),
  );

  const totalCollected = sumItemAmounts(
    calculated.map((c) => {
      const prev = existingByUser.get(c.userId);
      if (prev?.adjusted_by) return { amount: prev.amount };
      return { amount: c.amount };
    }),
  );
  const actualAmount = sumPartActuals(partInputs);

  for (const calc of calculated) {
    const prev = existingByUser.get(calc.userId);
    if (prev?.adjusted_by) continue;

    if (prev) {
      await supabase
        .from("settlement_items")
        .update({ amount: calc.amount })
        .eq("id", prev.id);
    } else {
      await supabase.from("settlement_items").insert({
        settlement_id: settlement.id,
        user_id: calc.userId,
        amount: calc.amount,
      });
    }
  }

  await supabase
    .from("settlements")
    .update({
      total_collected: totalCollected,
      actual_amount: actualAmount,
      part_actuals: partActuals,
    })
    .eq("id", settlement.id);
}

export function buildPartInputsFromEvent(
  event: EventDetail,
  partActuals: Record<string, number>,
): SettlementPartInput[] {
  return buildPartInputsFromParticipations(
    event.parts,
    event.participations,
    partActuals,
  );
}
