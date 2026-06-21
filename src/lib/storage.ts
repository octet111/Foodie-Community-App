import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** 画像アップロードの上限（15MB）。Storage バケット設定と一致させる */
export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_LABEL = "15MB";

type ShopImageSource = {
  ogp_image_url: string | null;
  image_path: string | null;
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

const ALLOWED_IMAGE_TYPES = new Set(Object.values(MIME_BY_EXT));

export function getShopImageUrl(
  supabase: SupabaseClient<Database>,
  shop: ShopImageSource,
): string | null {
  if (shop.image_path) {
    const { data } = supabase.storage
      .from("shop-images")
      .getPublicUrl(shop.image_path);
    return data.publicUrl;
  }
  return shop.ogp_image_url;
}

function resolveContentType(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const fromExt = MIME_BY_EXT[ext];

  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }

  return fromExt ?? "image/jpeg";
}

export function validateImageFileSize(file: File): void {
  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error(
      `画像が大きすぎます（${MAX_IMAGE_UPLOAD_LABEL}以下にしてください）。`,
    );
  }
}

export function formatStorageUploadError(error: unknown): string {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";

  if (/mime type|not allowed|invalid.*type/i.test(message)) {
    return "この画像形式には対応していません。JPEG / PNG / WebP / GIF（または HEIC）でお試しください。";
  }
  if (/too large|maximum|size/i.test(message)) {
    return `画像が大きすぎます（${MAX_IMAGE_UPLOAD_LABEL}以下にしてください）。`;
  }
  if (message) return message;
  return "画像のアップロードに失敗しました。";
}

export function getCommunityLogoUrl(
  supabase: SupabaseClient<Database>,
  logoPath: string,
): string {
  const { data } = supabase.storage.from("community").getPublicUrl(logoPath);
  return data.publicUrl;
}

export function getAvatarUrl(
  supabase: SupabaseClient<Database>,
  avatarPath: string | null | undefined,
): string | null {
  if (!avatarPath) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  return data.publicUrl;
}

export async function removeAvatarFile(
  supabase: SupabaseClient<Database>,
  avatarPath: string,
): Promise<void> {
  const { error } = await supabase.storage.from("avatars").remove([avatarPath]);
  if (error) throw new Error(formatStorageUploadError(error));
}

export async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  validateImageFileSize(file);

  const contentType = resolveContentType(file);

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      "この画像形式には対応していません。JPEG / PNG / WebP / GIF（または HEIC）でお試しください。",
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: false, contentType });

  if (error) throw new Error(formatStorageUploadError(error));
  return path;
}

export async function uploadCommunityLogo(
  supabase: SupabaseClient<Database>,
  file: File,
): Promise<string> {
  validateImageFileSize(file);

  const contentType = resolveContentType(file);

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      "この画像形式には対応していません。JPEG / PNG / WebP / GIF（または HEIC）でお試しください。",
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `logo/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("community")
    .upload(path, file, { upsert: false, contentType });

  if (error) throw new Error(formatStorageUploadError(error));
  return path;
}

export async function uploadShopImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<string> {
  validateImageFileSize(file);

  const contentType = resolveContentType(file);

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      "この画像形式には対応していません。JPEG / PNG / WebP / GIF（または HEIC）でお試しください。",
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("shop-images")
    .upload(path, file, { upsert: false, contentType });

  if (error) throw new Error(formatStorageUploadError(error));
  return path;
}
