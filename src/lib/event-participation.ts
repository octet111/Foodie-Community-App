import type { EventStatus } from "@/lib/constants";

export type PartStats = {
  id: string;
  name: string;
  capacity: number;
  fee_estimate: number;
  sort_order: number;
  joinedCount: number;
};

export function isPartFull(part: PartStats): boolean {
  return part.joinedCount >= part.capacity;
}

export function allPartsFull(parts: PartStats[]): boolean {
  return parts.length > 0 && parts.every(isPartFull);
}

export function canJoinPart(
  eventStatus: EventStatus,
  part: PartStats,
  userJoined: boolean,
): boolean {
  return eventStatus === "open" && !isPartFull(part) && !userJoined;
}

export function canCancelPart(
  eventStatus: EventStatus,
  userJoined: boolean,
  isOrganizer: boolean,
): boolean {
  return userJoined && eventStatus === "open" && !isOrganizer;
}

export function sumFeeEstimate(
  parts: PartStats[],
  joinedPartIds: Set<string>,
): number {
  return parts
    .filter((p) => joinedPartIds.has(p.id))
    .reduce((sum, p) => sum + p.fee_estimate, 0);
}

export function formatParticipationSummary(parts: PartStats[]): string {
  return parts
    .map((p) => `${p.name} ${p.joinedCount}/${p.capacity}`)
    .join("・");
}
