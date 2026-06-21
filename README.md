# フーディコミュニティ運営アプリ

食のコミュニティ向け運営アプリ（Next.js + Supabase）。

## 実装進捗

| フェーズ | 内容 | 状態 |
|---|---|---|
| 0–5 | 基盤・認証・店・企画 | ✅ |
| 6 | 精算（S09） | ✅ 2026-06-16 |
| 7 | リマインド・運用 | ✅ 2026-06-20 |
| 8 | マイページ・設定・仕上げ | 未着手 |

詳細は `Requirements-docs_and_Design/implementation_spec.md` §8（フェーズ6）・§9（フェーズ7）を参照。

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

### Edge Function: send-reminders（フェーズ7・完成）

企画リマインドを送信するバッチ関数。`remind_at <= now()` かつ `sent_at is null` の
リマインドに対し、参加者へ **アプリ内通知 + Resend メール** を送り `sent_at` を更新する。
二重実行時は `sent_at` の楽観ロックで再送を防ぐ（冪等）。

**実装ファイル**: `supabase/functions/send-reminders/`、`supabase/migrations/20250616000009_notifications.sql`

**フロント**: 通知ベルは `notifications` テーブルの実データを表示（`NotificationBell` / `getNotifications`）

#### ⚑ 初回セットアップ（人間が行う）

1. **Resend**（https://resend.com）でアカウント作成・APIキー発行
   - 検証前は `onboarding@resend.dev` から送信可（Resend に登録したメールアドレス宛のみ）
   - 本番は独自ドメインを Resend に追加

2. **Supabase → Edge Functions → Secrets** に以下を登録:

| Secret | 値 |
|---|---|
| `RESEND_API_KEY` | Resend の API キー |
| `RESEND_FROM_EMAIL` | 例: `Foodie Community <onboarding@resend.dev>` |
| `APP_URL` | 本番 URL（例: `https://your-app.vercel.app`） |
| `CRON_SECRET` | ランダム文字列（`openssl rand -hex 32` で生成。**名前は `CRON_SECRET` 完全一致**） |
| `APP_URL` | ローカル: `http://localhost:3000` / 本番: Vercel URL |

`SUPABASE_SERVICE_ROLE_KEY` はデプロイ時に自動注入される。フロントの `.env.local` には置かない。

3. **関数デプロイ**

```bash
npx supabase functions deploy send-reminders
```

4. **手動テスト**（`CRON_SECRET` をヘッダに付与）

```bash
curl -X POST "https://nzrawtaclloafhkgoeuc.supabase.co/functions/v1/send-reminders" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: <CRON_SECRET>"
```

5. **pg_cron 用 Vault シークレット**（SQL Editor・2件とも登録）

```sql
select vault.create_secret(
  'https://nzrawtaclloafhkgoeuc.supabase.co/functions/v1/send-reminders',
  'send_reminders_function_url'
);
select vault.create_secret('<CRON_SECRETと同じ値>', 'send_reminders_cron_secret');
```

6. **マイグレーション適用**（未適用の場合）

```bash
npx supabase db push
```

マイグレーション `20250616000010_send_reminders_cron.sql` 適用後、
`cron.job` で `send-reminders-hourly`（`0 * * * *` = 毎時0分 UTC = JST 毎時 :00）が登録される。

確認: `select jobname, schedule, active from cron.job;`

### GitHub Actions（運用・フェーズ7 完成）

リポジトリ Secrets（**`.env.local` だけではバックアップ不可**）:

| Secret | 用途 | 値の取り方 |
|---|---|---|
| `SUPABASE_URL` | Keepalive | `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Keepalive | `.env.local` の `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_ACCESS_TOKEN` | バックアップ | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | バックアップ | Database → **Settings** → Reset database password（再表示不可） |

| ワークフロー | 内容 | 保存先 |
|---|---|---|
| `supabase-keepalive.yml` | 3日おき REST ping | — |
| `supabase-backup.yml` | 週次 DB ダンプ | GitHub **Artifacts**（30日保持） |

Artifacts の見方: Actions → 成功した **Supabase Weekly Backup** → 下部 **Artifacts** → Download

いずれも `workflow_dispatch` で手動実行可能（2026-06-20 手動実行成功確認済）。

**本番前**: Resend 独自ドメイン認証（テスト中は登録メール宛のみ送信可）。

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
