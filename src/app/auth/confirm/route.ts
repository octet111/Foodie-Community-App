import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * メールリンク用の共通コールバック。
 *
 * - token_hash + type: verifyOtp で検証（code_verifier 不要。別ブラウザ/別端末で
 *   リンクを開いても成立するため、メールリンクではこちらを推奨）。
 * - code: exchangeCodeForSession（PKCE。リンクを発行したのと同じブラウザでのみ成立）。
 *
 * recovery は新パスワード設定画面 (/reset/update) へ、それ以外は next または / へ遷移する。
 */

const RECOVERY_DEST = "/reset/update";

/** オープンリダイレクト防止: 同一サイト内の相対パスのみ許可する */
function sanitizeNext(next: string | null, fallback: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return fallback;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;

  const isRecovery = type === "recovery";
  const successDest = sanitizeNext(
    searchParams.get("next"),
    isRecovery ? RECOVERY_DEST : "/",
  );
  const failureDest = isRecovery
    ? `${RECOVERY_DEST}?error=link_invalid`
    : "/login?error=auth_callback";

  const supabase = await createClient();

  let failed = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else {
    failed = true;
  }

  return NextResponse.redirect(`${origin}${failed ? failureDest : successDest}`);
}
