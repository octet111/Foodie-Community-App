/** 1ユーザー1日あたりの AI 生成回数上限 */
export const DRAFT_GENERATION_DAILY_LIMIT = 20;

export const GEMINI_MODEL = "gemini-3.5-flash";

export const DRAFT_ORIGINS = ["stock", "claim", "free"] as const;
export type DraftOrigin = (typeof DRAFT_ORIGINS)[number];
