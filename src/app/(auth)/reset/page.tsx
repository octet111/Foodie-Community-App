"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthCard,
  AuthField,
  authButtonPrimaryClass,
  authInputClass,
  authLinkClass,
} from "@/components/auth/AuthCard";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(null);
    setLoading(true);

    // メールリンクは別ブラウザ/別端末で開かれることが多い。PKCE(?code=)だと
    // code_verifier が無く検証に失敗するため、リセット送信時だけ implicit フロー
    // （#access_token=... をハッシュで返す方式・verifier 不要）のクライアントを使う。
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: "implicit",
          persistSession: false,
          detectSessionInUrl: false,
          autoRefreshToken: false,
        },
      },
    );
    const redirectTo = `${window.location.origin}/reset/update`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="送信完了">
        <p className="text-sm leading-relaxed text-txt-2">
          パスワードリセット用のメールを送信しました。リンクの有効期限は1時間です。メール内のリンクから新しいパスワードを設定してください。
        </p>
        <Link
          href="/login"
          className={`mt-4 inline-block text-sm ${authLinkClass}`}
        >
          ログイン画面へ戻る
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="パスワードリセット"
      footer={
        <Link href="/login" className={authLinkClass}>
          ログイン画面へ戻る
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-txt-2">
          登録済みのメールアドレスを入力してください。リセット用のリンクをお送りします。
        </p>
        <AuthField label="メールアドレス">
          <input
            type="email"
            autoComplete="email"
            className={authInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </AuthField>
        {error && (
          <p className="text-sm text-shu" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className={authButtonPrimaryClass}
          disabled={loading || !email}
          onClick={handleReset}
        >
          {loading ? "送信中…" : "リセットメールを送信"}
        </button>
      </div>
    </AuthCard>
  );
}
