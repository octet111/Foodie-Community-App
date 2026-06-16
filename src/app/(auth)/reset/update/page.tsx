"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthCard,
  AuthField,
  authButtonPrimaryClass,
  authInputClass,
  authLinkClass,
} from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function ResetUpdatePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    function clearUrlAuthParams() {
      if (window.location.hash || window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    async function initSession() {
      // implicit フローのメールリンクは #access_token=...&type=recovery を付けて戻る。
      // ハッシュは hashStart 以降をパースする（先頭に "#" を含むことがあるため除去）。
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );
      const queryParams = new URLSearchParams(window.location.search);

      const errorParam =
        hashParams.get("error") ||
        hashParams.get("error_code") ||
        queryParams.get("error");
      if (errorParam) {
        clearUrlAuthParams();
        setError(
          "リンクが無効か、有効期限が切れています。お手数ですが、もう一度リセットメールを送信してください。",
        );
        setReady(true);
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        // ハッシュのトークンで明示的にセッションを確立（cookie に保存され、以降の
        // updateUser で利用できる）。code_verifier 不要なので別ブラウザでも成立する。
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        clearUrlAuthParams();
        if (error) {
          setError(
            "セッションの確立に失敗しました。リンクの有効期限が切れている可能性があります。",
          );
          setReady(true);
          return;
        }
        setCanUpdate(true);
        setReady(true);
        return;
      }

      // ハッシュが無い場合（既にセッション確立済みでの再読込など）は現セッションを確認。
      const { data, error } = await supabase.auth.getSession();
      clearUrlAuthParams();
      if (error || !data.session) {
        setError(
          "パスワードリセット用のリンクからアクセスしてください。リンクの有効期限が切れている場合は、もう一度送信してください。",
        );
        setReady(true);
        return;
      }
      setCanUpdate(true);
      setReady(true);
    }

    initSession();
  }, []);

  async function handleUpdate() {
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
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="新しいパスワードの設定">
      {!ready ? (
        <p className="text-sm text-txt-2">読み込み中…</p>
      ) : !canUpdate ? (
        <div className="flex flex-col gap-4">
          {error && (
            <p className="text-sm text-shu" role="alert">
              {error}
            </p>
          )}
          <Link
            href="/reset"
            className={`text-center text-sm ${authLinkClass}`}
          >
            パスワードリセットをやり直す
          </Link>
          <Link
            href="/login"
            className={`text-center text-sm ${authLinkClass}`}
          >
            ログイン画面へ
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AuthField label="新しいパスワード">
            <input
              type="password"
              autoComplete="new-password"
              className={authInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </AuthField>
          <AuthField label="新しいパスワード（確認）">
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
            disabled={loading || !password || !passwordConfirm}
            onClick={handleUpdate}
          >
            {loading ? "更新中…" : "パスワードを更新"}
          </button>
          <Link
            href="/login"
            className={`text-center text-sm ${authLinkClass}`}
          >
            ログイン画面へ
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
