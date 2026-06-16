import type { Enums } from "@/types/database";

export type ShopRarity = Enums<"shop_rarity">;
export type ClaimType = Enums<"claim_type">;
export type EventStatus = Enums<"event_status">;

export const RARITY_LABELS: Partial<Record<ShopRarity, string>> = {
  walk_in: "ふらっと入れる",
  reservable: "予約可",
  referral_only: "紹介制",
  months_wait: "数ヶ月待ち",
  members_only: "会員制",
};

export const SHOP_RARITY_OPTIONS: { value: ShopRarity; label: string }[] = [
  { value: "walk_in", label: "ふらっと入れる" },
  { value: "reservable", label: "予約可" },
  { value: "referral_only", label: "紹介制" },
  { value: "months_wait", label: "数ヶ月待ち" },
  { value: "members_only", label: "会員制" },
];

export const HIDDEN_RARITIES: ShopRarity[] = ["walk_in", "reservable"];

export const CLAIM_LABELS: Record<ClaimType, string> = {
  regular: "常連",
  acquaintance: "店主と知人",
  referral: "紹介ルート",
  membership: "会員",
  other: "その他",
};

export const EVENT_STATUS_LABELS: Record<
  EventStatus,
  { label: string; variant: "open" | "closed" | "held" | "archived" }
> = {
  open: { label: "募集中", variant: "open" },
  closed: { label: "締切", variant: "closed" },
  held: { label: "開催済", variant: "held" },
  archived: { label: "アーカイブ", variant: "archived" },
};

export const NAV_ITEMS = [
  { href: "/", label: "企画", match: (p: string) => p === "/" || p.startsWith("/events/") && !p.startsWith("/events/new") },
  { href: "/shops", label: "店", match: (p: string) => p.startsWith("/shops") },
  { href: "/events/new", label: "作成", fab: true, match: (p: string) => p.startsWith("/events/new") },
  { href: "/me", label: "マイページ", match: (p: string) => p === "/me" || p.startsWith("/settings") },
] as const;

export const DEFAULT_COMMUNITY_NAME = "美食倶楽部";
export const DEFAULT_LOGO_CHAR = "美";
