import { z } from "zod";
import { DRAFT_ORIGINS } from "@/lib/draft/constants";

export const inputParamsSchema = z
  .object({
    origins: z.array(z.enum(DRAFT_ORIGINS)).default([]),
    shop_url: z.string().trim().optional(),
    area: z.string().optional(),
    headcount: z.number().int().min(1).max(100).optional(),
    concept_free_text: z.string().max(500).optional(),
  })
  .refine(
    (data) => data.origins.length > 0 || Boolean(data.shop_url?.trim()),
    { message: "起点を1つ以上選ぶか、店リンク（URL）を入力してください" },
  )
  .refine(
    (data) => {
      if (!data.shop_url?.trim()) return true;
      try {
        const u = new URL(data.shop_url.trim());
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "店リンクは http/https の URL を入力してください", path: ["shop_url"] },
  );

export const selectedConceptSchema = z.object({
  label: z.string().min(1),
  tone: z.string().min(1),
  rationale: z.string().min(1),
  suggested_headcount: z.number().int().min(1).optional(),
  suggested_parts: z.array(
    z.object({
      name: z.string().min(1),
      capacity: z.number().int().min(1),
      fee_estimate: z.number().int().min(0),
      sort_order: z.number().int().min(1),
    }),
  ),
  recommended_shop_id: z.string().uuid(),
  is_custom: z.boolean().optional(),
});

export const draftPatchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  shop_id: z.string().uuid().optional(),
  parts: z
    .array(
      z.object({
        name: z.string().min(1),
        capacity: z.number().int().min(1),
        fee_estimate: z.number().int().min(0),
        sort_order: z.number().int().min(1),
      }),
    )
    .optional(),
});

export const adoptSchema = z.object({
  held_at: z.string().datetime({ offset: true }),
});
