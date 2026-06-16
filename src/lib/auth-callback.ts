import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function completeAuthFromUrl(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  if (code) {
    return supabase.auth.exchangeCodeForSession(code);
  }

  if (tokenHash && type) {
    return supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
  }

  return {
    data: { session: null, user: null },
    error: new Error("認証パラメータがありません"),
  };
}
