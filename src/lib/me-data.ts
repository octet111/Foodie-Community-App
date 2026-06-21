import type { ClaimType, EventStatus, ShopRarity } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/shops-data";
import {
  type PartStats,
} from "@/lib/event-participation";

export type OrganizingEventItem = {
  id: string;
  title: string;
  held_at: string;
  status: EventStatus;
  shopRarity: ShopRarity;
  parts: PartStats[];
};

export type UpcomingEventItem = {
  id: string;
  title: string;
  held_at: string;
  partNames: string[];
};

export type UnpaidItem = {
  eventId: string;
  eventTitle: string;
  amount: number;
};

export type MyStockRow = {
  id: string;
  shopId: string;
  shopName: string;
  memo: string | null;
};

export type MyClaimRow = {
  id: string;
  shopId: string;
  shopName: string;
  claim_type: ClaimType;
  note: string | null;
};

export type MyPageData = {
  organizing: OrganizingEventItem[];
  upcoming: UpcomingEventItem[];
  unpaid: UnpaidItem[];
  stocks: MyStockRow[];
  claims: MyClaimRow[];
};

type RawPart = {
  id: string;
  name: string;
  capacity: number;
  fee_estimate: number;
  sort_order: number;
  participations: { id: string; user_id: string; status: string }[];
};

function mapParts(raw: RawPart[]): PartStats[] {
  return raw
    .map((p) => ({
      id: p.id,
      name: p.name,
      capacity: p.capacity,
      fee_estimate: p.fee_estimate,
      sort_order: p.sort_order,
      joinedCount: p.participations.filter((x) => x.status === "joined").length,
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function getOrganizingEventsDetailed(
  userId: string,
): Promise<OrganizingEventItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id, title, held_at, status,
      shop:shops(rarity),
      event_parts(
        id, name, capacity, fee_estimate, sort_order,
        participations(id, user_id, status)
      )
    `,
    )
    .eq("organizer_id", userId)
    .is("deleted_at", null)
    .in("status", ["open", "closed"])
    .order("held_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    const shop = row.shop as { rarity: ShopRarity } | null;
    const parts = mapParts((row.event_parts ?? []) as RawPart[]);
    return {
      id: row.id,
      title: row.title,
      held_at: row.held_at,
      status: row.status as EventStatus,
      shopRarity: shop?.rarity ?? "reservable",
      parts,
    };
  });
}

export async function getUpcomingParticipations(
  userId: string,
): Promise<UpcomingEventItem[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("participations")
    .select(
      `
      event_part:event_parts(name, event:events(id, title, held_at, status, deleted_at))
    `,
    )
    .eq("user_id", userId)
    .eq("status", "joined");

  if (error || !data) return [];

  const byEvent = new Map<string, UpcomingEventItem>();

  for (const row of data) {
    const part = row.event_part as {
      name: string;
      event: {
        id: string;
        title: string;
        held_at: string;
        status: EventStatus;
        deleted_at: string | null;
      } | null;
    } | null;

    const event = part?.event;
    if (!event || event.deleted_at) continue;
    if (!["open", "closed"].includes(event.status)) continue;
    if (event.held_at < now) continue;

    const existing = byEvent.get(event.id);
    if (existing) {
      existing.partNames.push(part!.name);
    } else {
      byEvent.set(event.id, {
        id: event.id,
        title: event.title,
        held_at: event.held_at,
        partNames: [part!.name],
      });
    }
  }

  return Array.from(byEvent.values()).sort(
    (a, b) => new Date(a.held_at).getTime() - new Date(b.held_at).getTime(),
  );
}

export async function getUnpaidItems(userId: string): Promise<UnpaidItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settlement_items")
    .select(
      `
      amount,
      settlement:settlements(
        event:events(id, title, deleted_at)
      )
    `,
    )
    .eq("user_id", userId)
    .eq("paid", false);

  if (error || !data) return [];

  const items: UnpaidItem[] = [];
  for (const row of data) {
    const settlement = row.settlement as {
      event: { id: string; title: string; deleted_at: string | null } | null;
    } | null;
    const event = settlement?.event;
    if (!event || event.deleted_at) continue;
    items.push({
      eventId: event.id,
      eventTitle: event.title,
      amount: row.amount,
    });
  }

  return items.sort((a, b) => a.eventTitle.localeCompare(b.eventTitle, "ja"));
}

export async function getMyStocks(userId: string): Promise<MyStockRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("id, memo, shop:shops(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => {
      const shop = row.shop as Pick<Shop, "id" | "name">;
      return {
        id: row.id,
        shopId: shop.id,
        shopName: shop.name,
        memo: row.memo,
      };
    });
}

export async function getMyClaims(userId: string): Promise<MyClaimRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("secure_claims")
    .select("id, claim_type, note, shop:shops(id, name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data
    .filter((row) => row.shop)
    .map((row) => {
      const shop = row.shop as Pick<Shop, "id" | "name">;
      return {
        id: row.id,
        shopId: shop.id,
        shopName: shop.name,
        claim_type: row.claim_type as ClaimType,
        note: row.note,
      };
    });
}

export async function getMyPageData(userId: string): Promise<MyPageData> {
  const [organizing, upcoming, unpaid, stocks, claims] = await Promise.all([
    getOrganizingEventsDetailed(userId),
    getUpcomingParticipations(userId),
    getUnpaidItems(userId),
    getMyStocks(userId),
    getMyClaims(userId),
  ]);

  return { organizing, upcoming, unpaid, stocks, claims };
}
