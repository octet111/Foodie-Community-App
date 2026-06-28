# フーディコミュニティ運営アプリ

食のコミュニティ向け運営アプリ（Next.js + Supabase）。

## 実装進捗

| フェーズ | 内容 | 状態 |
|---|---|---|
| 0–5 | 基盤・認証・店・企画 | ✅ |
| 6 | 精算（S09） | ✅ 2026-06-16 |
| 7 | リマインド・運用 | ✅ 2026-06-20 |
| 8 | マイページ・設定・仕上げ | ✅ 部分 2026-06-21 |
| 9 | UIブラッシュアップ（ナビ・設定拡張・リマインド4日前・開催日時） | ✅ 2026-06-21 |
| 10 | 機能ブラッシュアップ（ルーティング整理・実績・店メモ・企画UI） | ✅ 2026-06-21（ルーティング簡素化 2026-06-22） |
| 11 | 機能ブラッシュアップ #3（参加者管理・立替者・S05 UI・締切戻し） | ✅ 2026-06-21 |
| 12 | 機能ブラッシュアップ #4（店UI・行きたいメモ・アイコン・マイページUI） | ✅ 2026-06-21 |
| 13 | 追補（店公開/精算/実績/未払い） | ✅ 2026-06-24〜28 |
| 14 | 店リスト編集・削除（エリア/予約難易度・管理者全件削除） | ✅ 2026-06-28 |
| 15 | AI企画自動生成（ドラフト → 採用） | ✅ 2026-06-28 |

詳細は `Requirements-docs_and_Design/cursor_implementation_plan_v1.0.md` を参照。`implementation_spec.md` §8–§16（フェーズ6–14）。

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

### AI企画生成（Gemini）

サーバー専用の環境変数 `GEMINI_API_KEY` が必要です（クライアントには露出しません）。

**ローカル** — `.env.local` に追加:

```bash
GEMINI_API_KEY=your-google-ai-api-key
```

**Vercel** — Project → Settings → Environment Variables:

| 名前 | 値 | 環境 |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio で発行した API キー | Production / Preview / Development |

キー取得: [Google AI Studio](https://aistudio.google.com/apikey)

マイグレーション `20250628130000_event_drafts.sql` 適用後、`npm run gen:types` で型を再生成してください。

UI: 企画一覧 `/events` の「✦ AIで企画を生成」、または `/events/drafts` から利用。


### Supabase Auth の URL 設定（これだけ設定すればOK）

Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`（本番デプロイ時は本番 URL）
- **Redirect URLs** に以下を追加:
  - `http://localhost:3000/**`
  - 本番デプロイ時は `https://<本番ドメイン>/**`

メール本文（テンプレート）の変更は不要。既定の `{{ .ConfirmationURL }}` のままでよい。

### パスワードリセットのフローについて（クロスブラウザ対応）

　owType: "implicit"` のクライアントを使い、`#access_token=...&type=recovery` を
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

`shop-images`（公開）/ `community`（公開・admin書込）/ `event-photos`（認証必須）/ **`avatars`（公開読取・本人フォルダ書込）** は
`supabase/migrations/20250616000000_storage.sql` および **`20250625000001_profile_avatars.sql`** で定義済み。画像上限は **15MB**。

### Edge Function: ogp-fetch

`supabase/functions/ogp-fetch` をデプロイ済み。店追加モーダルから呼び出し、
OGP（title / image / description）を取得する。失敗時は手動入力にフォールバック。

ローカルで関数を試す場合:

```bash
npx supabase functions serve ogp-fetch
```

### Edge Function: send-reminders（フェーズ7・完成）

企画リマインドを送信するバッチ関数。**開催4日前 + 当日**の2回（時刻は `community_settings` 参照）。
`remind_at <= now()` かつ `sent_at is null` のリマインドに対し、参加者へ **アプリ内通知 + Resend メール** を送り `sent_at` を更新する。
二重実行時は `sent_at` の楽観ロックで再送を防ぐ（冪等）。メール件名/本文は DB テンプレートまたはデフォルト HTML を使用。

**テスト送信**: POST body `{ "test_email": "your@email.com" }`（任意 `event_id`）

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

## フェーズ8–9: マイページ・設定・UIブラッシュアップ（2026-06-21）

### マイページ `/me`

- ニックネーム編集、企画中（精算へ）、参加予定、未払い、ストック・確保宣言、ログアウト

### ナビ

- 企画 / 店 / マイページ / **設定**（admin のみ）。アイコン付き
- 企画作成は企画一覧 `/events` 内「＋ 企画を作成」ボタン、または「✦ AIで企画を生成」

### 設定 `/settings`（admin のみ）

| パス | 内容 |
|---|---|
| `/settings` | コミュニティ名・ロゴ・振込先、メンバー一覧（UUID 表示）+ admin 付与/剥奪 |
| `/settings/reminders` | 4日前・当日リマインドのデフォルト送信時刻 |
| `/settings/email-template` | リマインドメール件名/本文テンプレ |

非 admin は `proxy.ts` で `/me` へリダイレクト

### 企画作成の開催日時

- 開催日（date）+ 開催時刻（select、10分刻み 00:00〜23:50）

### マイグレーション（未適用の場合）

```bash
npx supabase db push
```

追加 migration: `20250622000001_community_reminder_email_settings.sql`, `20250622000002_reminder_advance_four_days.sql`

### E2E

```bash
npx playwright test          # auth / shops / events / settlement / me
npx playwright test me auth  # フェーズ8 重点
```

### 本番前の残タスク

- **P8-6**: Vercel デプロイ（環境変数 + Auth Redirect URLs）
- **P8-7**: 要件定義 §4.1 全 AC の Playwright 網羅
- Resend 独自ドメイン認証、`APP_URL` 本番化

## フェーズ10–12: 機能ブラッシュアップ（2026-06-21）

### フェーズ10（概要）

- `/` は `/events` へリダイレクト（ログイン後の初期画面は企画一覧）。実績 `/records`
- 店メモ、企画一覧残数バッジ、参加取消ロジック修正、精算確定と実績連動
- 詳細: `implementation_spec.md` §12

### フェーズ11 機能ブラッシュアップ #3

| 区分 | 内容 |
|---|---|
| 参加者の手動管理 | 企画者・admin が S05 で参加者を追加・削除（`open` / `closed`）。定員超過は不可 |
| 立替者の指定 | 企画者・admin が一次会参加者から `set_event_finalizer` RPC で指定。参加者一覧の下に配置 |
| 精算アクセス | 企画者・admin・立替者が精算画面にアクセス（`canAccessSettlementPage`） |
| 締切の取り消し | `closed` → `open`「募集中に戻す」（企画者・admin。`held` は不可） |
| S05 UI | 参加パート（アクション行）／参加者（名簿カード）／立替者（真鍮左線パネル）で視覚分離 |
| 会費見込み | 参加表明済み全員（企画者含む）。コンパクト表示（`text-lg`） |
| 一覧残数 | 一次会残り **0人** は「満員」表示 |
| 削除ボタン | `Button` の `danger` バリアント（朱色）。企画削除・コメント削除等 |
| DB | `20250624000001_set_event_finalizer.sql`（`set_event_finalizer`, `ensure_settlement` 更新） |

### フェーズ12 機能ブラッシュアップ #4

| 区分 | 内容 |
|---|---|
| 店リスト S07 UI | 「＋ 店を追加」を企画一覧と同様 **上部 primary 全幅**ボタンに統一（`ShopsPageClient`） |
| 行きたいメモ | `stocks.memo` を店追加モーダル・S08 店詳細で入力・編集。S07 一覧・マイページは表示のみ |
| プロフィールアイコン | `profiles.avatar_path` + Storage `avatars`。マイページで変更・削除。未設定時はニックネーム頭文字 |
| `UserAvatar` | ヘッダー・企画詳細（参加者/コメント）・店（確保宣言）・マイページで共通表示 |
| マイページ UI | ニックネーム編集時は入力欄を全幅配置。アイコンとテキストの重なり防止（grid レイアウト） |
| DB | `20250625000001_profile_avatars.sql` |
| E2E | `shops.spec.ts` — 店追加時の行きたいメモ入力・詳細表示を確認 |

### フェーズ13 追補（2026-06-24〜28）

| 区分 | 内容 |
|---|---|
| 店 S07 | タブ「行きたい／確保できる」。行きたい内に「自分／みんな」（admin は「全員」）。`stocks.is_private` で公開/非公開。企画済み店は「企画済み」バッジ |
| 精算 S09 | 確定後も支払チェック可（`20250626000003`）。参加者追加時に明細を再同期（`settlementItemsNeedSync`） |
| 実績 `/records` | `events.status = held` で一覧（settlements 結合を廃止）。DB トリガで確定/取消と status 同期（`20250628000001`） |
| マイページ未払い | 一般ユーザー向け RPC `get_my_unpaid_items`（`20260628110036`）。`settlements` RLS 回避 |

### フェーズ14 店リスト編集・削除（2026-06-28）

| 区分 | 内容 |
|---|---|
| 店情報編集 | 投稿者は S07「自分」一覧・S08 で **エリア**・**予約難易度**を編集（`ShopEditModal`） |
| 削除（一般） | 行きたいリスト（`stocks`）から削除。投稿者かつ有効企画なしなら `shops` も削除 |
| 削除（admin） | 「全員」タブで非公開投稿を含む全ストックを表示。「削除（管理者）」で任意の投稿を削除 |
| 実装 | `shop-actions.ts`, `getAllStocksExcept()`, `ShopEditModal`, `ShopStockCard` |
| DB | `20250628120000_shops_delete_creator.sql` |
| E2E | `shops.spec.ts` — 編集・削除フロー |

### マイグレーション（未適用の場合）

```bash
npx supabase db push
```

未適用の例: `20250624000001` / **`20250625000001`** / `20250626000001`〜`03` / `20250628000001` / `20260628110036`

### マイグレーション履歴が食い違う場合

リモートにローカルにない ID（ダッシュボード等で適用した場合）があると `db push` が失敗する。`supabase migration list` で Local / Remote を確認し、スキーマが既に反映済みなら `migration repair` で履歴を揃える（2026-06-21 対応例: リモート専用 `20260621*` を reverted、ローカル `20250622*`〜`20250624*` を applied）。
