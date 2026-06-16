# フーディコミュニティ運営アプリ

食のコミュニティ向け運営アプリ（Next.js + Supabase）。

## ディレクトリ構成

`src/app` に App Router のページ、`src/components` に UI コンポーネント、`src/lib` に Supabase クライアント等のユーティリティ、`src/types` に `supabase gen types` で生成する DB 型、`supabase/` にマイグレーションと Edge Functions、`e2e/` に Playwright E2E テストを配置する。

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に Supabase の URL と anon key を設定
npm run dev
```

Supabase プロジェクト「Foodie-Community-App」（東京リージョン）のダッシュボード → Settings → API から `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を取得してください。

### Supabase Auth の URL 設定（これだけ設定すればOK）

Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`（本番デプロイ時は本番 URL）
- **Redirect URLs** に以下を追加:
  - `http://localhost:3000/**`
  - 本番デプロイ時は `https://<本番ドメイン>/**`

メール本文（テンプレート）の変更は不要。既定の `{{ .ConfirmationURL }}` のままでよい。

### パスワードリセットのフローについて（クロスブラウザ対応）

`@supabase/ssr` のブラウザクライアントは PKCE フロー固定で、`?code=` 方式は
「リセットを依頼したブラウザ」でしか `code_verifier` を持たない。メールのリンクは
別ブラウザ（既定ブラウザ等）で開かれることが多く、その場合 PKCE では検証に失敗して
ホーム画面へ戻されてしまう。

そこで `src/app/(auth)/reset/page.tsx` では、リセットメール送信時だけ
`flowType: "implicit"` のクライアントを使い、`#access_token=...&type=recovery` を
ハッシュで返す方式にしている（`code_verifier` 不要のため別ブラウザ/別端末でも成立）。
`redirectTo` は `/reset/update` を直接指し、`reset/update` ページがハッシュの
トークンで `setSession` してから新パスワードを設定する。

> アプリ本体（ログイン・新規登録）は従来どおり PKCE（cookie ベース）のまま。
> implicit を使うのはパスワードリセットのメール送信時だけに限定している。

## 開発

```bash
npm run dev      # http://localhost:3000
npm run lint
npx playwright test
```

## データベース

マイグレーションは `supabase/migrations/` に配置済み。リモートへの適用:

```bash
npx supabase login
npx supabase link --project-ref nzrawtaclloafhkgoeuc
npx supabase db push
```

型の再生成: `npm run gen:types`（要 `supabase login`）

### Storage バケット

`shop-images`（公開）/ `community`（公開・admin書込）/ `event-photos`（認証必須）は
`supabase/migrations/20250616000000_storage.sql` で定義済み。画像上限は **15MB**。

### Edge Function: ogp-fetch

`supabase/functions/ogp-fetch` をデプロイ済み。店追加モーダルから呼び出し、
OGP（title / image / description）を取得する。失敗時は手動入力にフォールバック。

ローカルで関数を試す場合:

```bash
npx supabase functions serve ogp-fetch
```

### 初期管理者の設定（手動）

1. アプリから通常登録する
2. Supabase ダッシュボード → SQL Editor で実行:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'あなたのメール@example.com'
);
```

3. 再ログイン後、管理者権限が反映される
