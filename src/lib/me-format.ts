import type { ClaimType } from "@/lib/constants";
import { CLAIM_LABELS } from "@/lib/constants";
import { formatHeldAt } from "@/lib/event-dates";
import { formatParticipationSummary } from "@/lib/event-participation";
import type {
  MyClaimRow,
  OrganizingEventItem,
  UpcomingEventItem,
} from "@/lib/me-data";

function formatShortDate(heldAt: string): string {
  const d = new Date(heldAt);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}/${get("day")}`;
}

export function formatOrganizingMeta(event: OrganizingEventItem): string {
  return `${formatShortDate(event.held_at)}・${formatParticipationSummary(event.parts)}`;
}

export function formatUpcomingMeta(event: UpcomingEventItem): string {
  const parts = event.partNames.length > 0 ? event.partNames.join("・") : "—";
  return `${formatHeldAt(event.held_at)}・${parts}`;
}

export function formatClaimMeta(claim: MyClaimRow): string {
  const typeLabel = CLAIM_LABELS[claim.claim_type];
  const note = claim.note?.trim();
  return note ? `確保宣言：${typeLabel}・${note}` : `確保宣言：${typeLabel}`;
}
