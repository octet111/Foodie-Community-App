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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="ログイン"
      footer={
        <p className="text-txt-2">
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className={authLinkClass}>
            新規登録
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        <AuthField label="メールアドレス">
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
            autoComplete="current-password"
            className={authInputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          disabled={loading || !email || !password}
          onClick={handleLogin}
        >
          {loading ? "ログイン中…" : "ログイン"}
        </button>
        <Link href="/reset" className={`text-center text-sm ${authLinkClass}`}>
          パスワードをお忘れの方
        </Link>
      </div>
    </AuthCard>
  );
}
