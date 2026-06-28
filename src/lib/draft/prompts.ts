import { SchemaType, type ResponseSchema } from "@/lib/gemini";
import type { DraftInputParams, ShopCandidate } from "@/lib/draft/types";
import { formatCandidatesForPrompt } from "@/lib/draft/collect-candidates";

export const CONCEPT_SYSTEM_INSTRUCTION = `あなたは食のコミュニティの企画立案アシスタントです。
与えられた候補店リストに含まれる shop_id のみを recommended_shop_id として使用してください。店を創作してはいけません。
3案は性格を意図的にずらしてください（例: 攻めの高難度制覇 / 少人数で深い体験 / 気軽なカジュアル）。
各案に tone（後段の文章生成で使う文体タグ）と rationale（なぜこの会か）を付けてください。
開催日時は提案しないでください。日時に関する項目は出力に含めないでください。`;

export const DETAIL_SYSTEM_INSTRUCTION = `あなたはコミュニティメンバーが「参加したい」と思う集客文を書くコピーライターです。
与えられた候補店リストに含まれる shop_id のみを recommended_shop_id として使用してください。店を創作してはいけません。
description はプレーンテキスト（改行のみ、マークダウン不可）で書いてください。
開催日時は書かないでください。

tone マッピング:
- 感情訴求 / emotional: 体験の高揚感・特別感を前面に
- 情報整理 / informative: 店の魅力と段取りを明快に
- カジュアル / casual: 親しみと気軽さ`;

export const CONCEPT_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    concepts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          label: { type: SchemaType.STRING },
          tone: { type: SchemaType.STRING },
          rationale: { type: SchemaType.STRING },
          suggested_headcount: { type: SchemaType.NUMBER },
          suggested_parts: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                capacity: { type: SchemaType.NUMBER },
                fee_estimate: { type: SchemaType.NUMBER },
                sort_order: { type: SchemaType.NUMBER },
              },
              required: ["name", "capacity", "fee_estimate", "sort_order"],
            },
          },
          recommended_shop_id: { type: SchemaType.STRING },
        },
        required: [
          "label",
          "tone",
          "rationale",
          "suggested_headcount",
          "suggested_parts",
          "recommended_shop_id",
        ],
      },
    },
  },
  required: ["concepts"],
};

export const DETAIL_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    description: { type: SchemaType.STRING },
    recommended_shop_id: { type: SchemaType.STRING },
    parts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          capacity: { type: SchemaType.NUMBER },
          fee_estimate: { type: SchemaType.NUMBER },
          sort_order: { type: SchemaType.NUMBER },
        },
        required: ["name", "capacity", "fee_estimate", "sort_order"],
      },
    },
  },
  required: ["title", "description", "recommended_shop_id", "parts"],
};

export function buildConceptUserPrompt(
  inputParams: DraftInputParams,
  candidates: ShopCandidate[],
): string {
  const allowedIds = candidates.map((c) => c.shop_id).join(", ");
  return [
    "## ユーザー条件",
    `起点: ${inputParams.origins.join(", ")}`,
    inputParams.area ? `エリア: ${inputParams.area}` : "エリア: 指定なし",
    inputParams.headcount ? `想定人数: ${inputParams.headcount}名` : "想定人数: 指定なし",
    inputParams.concept_free_text
      ? `追加条件: ${inputParams.concept_free_text}`
      : "",
    "",
    "## 候補店リスト（この shop_id のみ使用可）",
    formatCandidatesForPrompt(candidates),
    "",
    `allowed_shop_ids: [${allowedIds}]`,
    "",
    "性格の異なるコンセプトを3案生成してください。recommended_shop_id は必ず allowed_shop_ids のいずれかにしてください。",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildDetailUserPrompt(
  selectedConcept: {
    label: string;
    tone: string;
    rationale: string;
    suggested_headcount?: number;
    suggested_parts: { name: string; capacity: number; fee_estimate: number; sort_order: number }[];
    recommended_shop_id: string;
  },
  candidates: ShopCandidate[],
): string {
  const allowedIds = candidates.map((c) => c.shop_id).join(", ");
  return [
    "## 確定コンセプト",
    JSON.stringify(selectedConcept, null, 2),
    "",
    "## 候補店リスト（この shop_id のみ使用可）",
    formatCandidatesForPrompt(candidates),
    "",
    `allowed_shop_ids: [${allowedIds}]`,
    "",
    "集客文（description）の品質を最優先に、title / description / parts / recommended_shop_id を生成してください。",
    "description には日時を含めないでください。",
  ].join("\n");
}
