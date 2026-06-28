import type { ConceptOption, DraftPart, ShopCandidate } from "@/lib/draft/types";

const HEADCOUNT_PATTERNS = [
  /(\d+)\s*名\s*まで/,
  /最大\s*(\d+)\s*名/,
  /(\d+)\s*名\s*限定/,
  /(\d+)\s*人\s*まで/,
];

export function parseHeadcountCapFromNote(note: string | null | undefined): number | null {
  if (!note) return null;
  for (const pattern of HEADCOUNT_PATTERNS) {
    const match = note.match(pattern);
    if (match) return Number(match[1]);
  }
  return null;
}

export function capHeadcountForShop(
  headcount: number,
  shopId: string,
  candidates: ShopCandidate[],
): number {
  const shop = candidates.find((c) => c.shop_id === shopId);
  const cap = parseHeadcountCapFromNote(shop?.claim_note);
  if (cap !== null && headcount > cap) return cap;
  return headcount;
}

export function isValidShopId(shopId: string, candidates: ShopCandidate[]): boolean {
  return candidates.some((c) => c.shop_id === shopId);
}

export function validateDraftParts(parts: DraftPart[]): string | null {
  if (!parts.length) return "パート構成が空です";
  for (const p of parts) {
    if (!p.name?.trim()) return "パート名が空です";
    if (!Number.isInteger(p.capacity) || p.capacity < 1) return "定員が不正です";
    if (!Number.isInteger(p.fee_estimate) || p.fee_estimate < 0) return "想定費用が不正です";
  }
  return null;
}

export function sanitizeConceptOption(
  option: ConceptOption,
  candidates: ShopCandidate[],
): ConceptOption | null {
  if (!isValidShopId(option.recommended_shop_id, candidates)) return null;

  const partError = validateDraftParts(option.suggested_parts);
  if (partError) return null;

  const headcount = capHeadcountForShop(
    option.suggested_headcount,
    option.recommended_shop_id,
    candidates,
  );

  return {
    ...option,
    suggested_headcount: headcount,
    suggested_parts: option.suggested_parts.map((p, i) => ({
      ...p,
      sort_order: p.sort_order ?? i + 1,
    })),
  };
}

const TEMPLATE_PHRASES = [
  "ぜひご参加ください",
  "皆様のご参加をお待ちしております",
  "一緒に楽しみましょう",
];

export function descriptionQualityIssue(
  description: string,
  candidates: ShopCandidate[],
): string | null {
  const trimmed = description.trim();
  if (trimmed.length < 80) return "集客文が短すぎます";
  if (trimmed.length > 2000) return "集客文が長すぎます";

  const templateOnly = TEMPLATE_PHRASES.some(
    (phrase) => trimmed.includes(phrase) && trimmed.length < 120,
  );
  if (templateOnly) return "テンプレ的な決まり文句のみです";

  const candidateNames = candidates.map((c) => c.name);
  const quoted = trimmed.match(/「([^」]{2,30})」/g) ?? [];
  for (const q of quoted) {
    const inner = q.slice(1, -1);
    const inCandidates = candidateNames.some(
      (n) => n.includes(inner) || inner.includes(n),
    );
    if (!inCandidates && /店|鮨|寿司|焼肉|レストラン|食堂/.test(inner)) {
      return "候補外の店名が含まれている可能性があります";
    }
  }

  return null;
}
