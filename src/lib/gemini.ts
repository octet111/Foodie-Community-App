import "server-only";

import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { GEMINI_MODEL } from "@/lib/draft/constants";

const REQUEST_TIMEOUT_MS = 60_000;

export type GeminiErrorCode =
  | "missing_api_key"
  | "timeout"
  | "api_error"
  | "parse_error"
  | "validation_error";

export type GeminiResult<T> =
  | { ok: true; data: T; raw: unknown }
  | { ok: false; code: GeminiErrorCode; message: string; raw?: unknown };

export { SchemaType, type ResponseSchema };

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

async function callOnce<T>(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: ResponseSchema,
): Promise<GeminiResult<T>> {
  const client = getClient();
  if (!client) {
    return {
      ok: false,
      code: "missing_api_key",
      message: "GEMINI_API_KEY が設定されていません",
    };
  }

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const result = await model.generateContent(
      { contents: [{ role: "user", parts: [{ text: userPrompt }] }] },
      { signal: controller.signal },
    );
    const text = result.response.text();
    if (!text) {
      return {
        ok: false,
        code: "parse_error",
        message: "空の応答が返されました",
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        code: "parse_error",
        message: "JSON のパースに失敗しました",
        raw: text,
      };
    }

    return { ok: true, data: parsed as T, raw: parsed };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "timeout", message: "Gemini API がタイムアウトしました" };
    }
    const message = err instanceof Error ? err.message : "Gemini API エラー";
    return { ok: false, code: "api_error", message };
  } finally {
    clearTimeout(timer);
  }
}

/** 構造化 JSON 応答を取得（1回リトライ付き） */
export async function generateStructuredJson<T>(
  systemInstruction: string,
  userPrompt: string,
  responseSchema: ResponseSchema,
): Promise<GeminiResult<T>> {
  const first = await callOnce<T>(systemInstruction, userPrompt, responseSchema);
  if (first.ok) return first;

  if (first.code === "missing_api_key") return first;

  const retry = await callOnce<T>(systemInstruction, userPrompt, responseSchema);
  return retry;
}
