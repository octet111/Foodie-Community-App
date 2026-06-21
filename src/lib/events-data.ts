import type { EventStatus } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Shop } from "@/lib/shops-data";
import type { Tables } from "@/types/database";
import type { PartStats } from "@/lib/event-participation";

export type EventRow = Tables<"events">;

export type EventListItem = {
  id: string;
  title: string;
  held_at: string;
  location: string | null;
  status: EventStatus;
  shop: Shop;
  organizerNickname: string;
  parts: PartStats[];
};

export type ParticipationRow = {
  id: string;
  user_id: string;
  nickname: string;
  event_part_id: string;
};

export type CommentRow = {
  id: string;
  body: string;
  user_id: string;
  nickname: string;
  created_at: string;
  updated_at: string;
};

export type EventDetail = EventListItem & {
  description: string | null;
  organizer_id: string;
  finalizer_id: string | null;
  finalizerNickname: string | null;
  participations: ParticipationRow[];
  comments: CommentRow[];
  myJoinedPartIds: string[];
};

type RawPart = Tables<"event_parts"> & {
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

type RawEvent = EventRow & {
  shop: Shop;
  organizer: { nickname: string } | null;
  event_parts: RawPart[];
};

function mapEventListItem(row: RawEvent): EventListItem {
  return {
    id: row.id,
    title: row.title,
    held_at: row.held_at,
    location: row.location,
    status: row.status,
    shop: row.shop,
    organizerNickname: row.organizer?.nickname ?? "不明",
    parts: mapParts(row.event_parts ?? []),
  };
}

const EVENT_SELECT = `
  id, title, description, held_at, location, status, organizer_id, shop_id,
  shop:shops(*),
  organizer:profiles!events_organizer_id_fkey(nickname),
  event_parts(
    id, name, capacity, fee_estimate, sort_order,
    participations(id, user_id, status)
  )
`;

async function getFinalizedSettlementEventIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("event_id")
    .eq("status", "finalized");
  if (error || !data) return [];
  return data.map((row) => row.event_id);
}

function mapCompletedEventListItem(row: RawEvent): EventListItem {
  return { ...mapEventListItem(row), status: "held" };
}

export async function getEventsList(): Promise<EventListItem[]> {
  const supabase = await createClient();
  const finalizedEventIds = await getFinalizedSettlementEventIds(supabase);

  let query = supabase
    .from("events")
    .select(EVENT_SELECT)
    .is("deleted_at", null)
    .in("status", ["open", "closed"]);

  if (finalizedEventIds.length > 0) {
    query = query.not(
      "id",
      "in",
      `(${finalizedEventIds.map((id) => `"${id}"`).join(",")})`,
    );
  }

  const { data, error } = await query.order("held_at", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as RawEvent[]).map(mapEventListItem);
}

export async function getCompletedEventsList(): Promise<EventListItem[]> {
  const supabase = await createClient();
  const finalizedEventIds = await getFinalizedSettlementEventIds(supabase);
  if (finalizedEventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .is("deleted_at", null)
    .in("id", finalizedEventIds)
    .order("held_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as RawEvent[]).map(mapCompletedEventListItem);
}

export async function getEventById(
  id: string,
  userId: string,
): Promise<EventDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as RawEvent;
  const base = mapEventListItem(row);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, nickname");

  const nicknameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.nickname]),
  );

  const participations: ParticipationRow[] = [];
  for (const part of row.event_parts ?? []) {
    for (const p of part.participations ?? []) {
      if (p.status !== "joined") continue;
      participations.push({
        id: p.id,
        user_id: p.user_id,
        nickname: nicknameById.get(p.user_id) ?? "不明",
        event_part_id: part.id,
      });
    }
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("id, body, user_id, created_at, updated_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const commentRows: CommentRow[] = (comments ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    user_id: c.user_id,
    nickname: nicknameById.get(c.user_id) ?? "不明",
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  const myJoinedPartIds = participations
    .filter((p) => p.user_id === userId)
    .map((p) => p.event_part_id);

  const { data: settlement } = await supabase
    .from("settlements")
    .select("finalized_by")
    .eq("event_id", id)
    .maybeSingle();

  return {
    ...base,
    description: row.description,
    organizer_id: row.organizer_id,
    finalizer_id: settlement?.finalized_by ?? null,
    finalizerNickname: settlement?.finalized_by
      ? (nicknameById.get(settlement.finalized_by) ?? null)
      : null,
    participations,
    comments: commentRows,
    myJoinedPartIds,
  };
}

export async function getMemberProfiles(): Promise<
  { id: string; nickname: string }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname")
    .order("nickname");

  if (error || !data) return [];
  return data;
}

export async function getOrganizerEvents(
  userId: string,
): Promise<Pick<EventRow, "id" | "title" | "held_at" | "status">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, held_at, status")
    .eq("organizer_id", userId)
    .is("deleted_at", null)
    .in("status", ["open", "closed"])
    .order("held_at", { ascending: true });

  if (error || !data) return [];
  return data;
}
