"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AuthCard,
  AuthField,
  authButtonPrimaryClass,
  authInputClass,
  authLinkClass,
} from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setError(null);

    if (password !== passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="新規登録"
      footer={
        <p className="text-txt-2">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className={authLinkClass}>
            ログイン
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        <AuthField label="ニックネーム（公開表示名）">
          <input
            type="text"
            autoComplete="nickname"
            className={authInputClass}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </AuthField>
        <AuthField
          label="メールアドレス"
          hint="他のメンバーには表示されません（認証用）"
        >
          <input
            type="email"
            autoComplete="email"
            className={authInputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </AuthField>
        <AuthField label="パスワード">
          <input
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </AuthField>
        <AuthField label="パスワード（確認）">
          <input
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          disabled={
            loading || !nickname || !email || !password || !passwordConfirm
          }
          onClick={handleSignup}
        >
          {loading ? "登録中…" : "登録する"}
        </button>
      </div>
    </AuthCard>
  );
}
