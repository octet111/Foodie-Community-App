# 実装仕様書 v1.0

対応: 要件定義書 v1.1 / 画面設計書 v0.1 / ワイヤーフレーム v0.4全画面版
前提: 一人 + AI駆動開発。本書とSQL・トークンをAIへの実装指示の正とする。

---

## 1. 技術スタック（確定）

| レイヤ | 技術 | 備考 |
|---|---|---|
| フロント | Next.js（App Router）+ TypeScript + Tailwind CSS | レスポンシブ（モバイル=下部タブ/PC=サイドナビ、md=768px） |
| 認証 | Supabase Auth | メール+パスワード。emailは auth.users 管理＝非公開要件を自然に満たす |
| DB | Supabase Postgres + RLS | schema.sql / rls.sql 参照 |
| ストレージ | Supabase Storage | ロゴ・手動店画像・（フェーズ2）アルバム写真 |
| サーバ処理 | Supabase Edge Functions | OGP取得 / リマインド送信 |
| スケジュール | pg_cron | リマインドの定期発火 |
| メール | Resend（React Email） | 無料枠内（最大月500通程度の想定） |
| ホスティング | Vercel | 無料枠 |

## 2. 成果物ファイル

- `design-tokens.css` — v0.4確定パレット・フォント・コンポーネント規約
- `schema.sql` — 13テーブル（profiles, community_settings, shops, stocks, secure_claims, events, event_parts, participations, settlements, settlement_items, reminders, comments, photos）
- `rls.sql` — CRUD権限マトリクスのSQL化＋確定後ロックトリガ

## 3. スキーマの実装注意点

1. **users → profiles**: 認証は auth.users、アプリ側プロフィールは public.profiles（1:1, FK）。emailをprofilesに持たないことで「メール非公開」をDB構造で保証。
2. **1企画1精算**: settlements.event_id に unique制約。
3. **差分（おつり）**: surplus は generated column（total_collected − actual_amount）。アプリで計算しない。
4. **論理削除**: events.deleted_at。一覧系クエリは `deleted_at is null` 前提（RLSのselectポリシーでも非表示化済み）。
5. **確定後ロック**: settlement_items はトリガ trg_block_finalized で finalized中の変更をDBレベルで拒否。「確定取消」= settlements.status を collecting に戻す update。
6. **締切前のみ本人キャンセル**: 時間条件はRLSに持たせずアプリ層で制御（必要になればトリガ追加）。
7. **割り勘計算**: パートごとに `ceil(実額 ÷ パート参加者数)`（円単位切り上げ）→ ユーザー毎に参加パート分を合算して settlement_items.amount。実額未入力パートは fee_estimate を使用。**実装（フェーズ6）**: 精算画面初回表示時の実費デフォルトは `fee_estimate × そのパートの参加人数`（未保存時）。`settlements.part_actuals`（jsonb）にパート別実費を保持。

## 4. Edge Functions

### 4.1 ogp-fetch
- 入力: url / 出力: { title, image, description }
- 任意URLのHTMLから og:title / og:image / og:description を抽出（汎用OGP。食べログ・Google Maps・一休・Retty・ぐるなび等）
- リダイレクト追従（Google Mapsの短縮URL対策）。タイムアウト5s
- 失敗時は空を返し、フロントは手動入力＋画像アップロードへフォールバック
- スクレイピング禁止: metaタグ以外のDOM解析はしない（規約配慮）

### 4.2 send-reminders（フェーズ7 実装済）
- pg_cron（毎時0分 JST）→ reminders から `remind_at <= now() and sent_at is null` を取得
- アプリ内通知（`notifications` テーブル）作成＋Resendでメール送信 → `sent_at` 更新
- 送信失敗時: リトライなし。管理者宛に失敗通知メール1通
- reminders生成: 企画公開時に前日18:00と当日9:00の2行をinsert（`create_event_reminders` RPC）
- 認証: `CRON_SECRET`（`x-cron-secret` ヘッダ）または `SERVICE_ROLE_KEY`。`verify_jwt = false`
- 冪等: `sent_at` 楽観ロック（更新成功行のみ処理）
- 実装: `supabase/functions/send-reminders/`、メールテンプレート `email-template.ts`

## 5. 画面とルーティング

| 画面 | パス |
|---|---|
| S01-03 認証 | /login /signup /reset |
| S04 企画一覧 | /（リスト・カレンダー切替） |
| S05 企画詳細 | /events/[id]（未参加/参加済み/企画者で表示分岐） |
| S06 企画作成・編集 | /events/new /events/[id]/edit |
| S07 店リスト | /shops（行きたい/確保できるタブ） |
| S08 店詳細 | /shops/[id] |
| S09 精算管理 | /events/[id]/settlement（権限で全件/本人明細を出し分け） |
| S10 マイページ | /me |
| S11 設定 | /settings（admin限定） |

## 6. 実装フェーズ（推奨順）

1. **基盤**: Supabaseプロジェクト作成 → schema.sql → rls.sql 適用 → Next.js雛形＋トークン適用
2. **認証**: S01-03 ＋ profiles自動作成（auth.usersトリガ）
3. **店**: S07/S08（shops/stocks/secure_claims、ogp-fetch）
4. **企画**: S04/S05/S06（events/event_parts/participations、定員締切ロジック）
5. **リマインド**: reminders生成＋send-reminders＋pg_cron — **完成（2026-06-20）**
6. **精算**: S09（割り勘計算・確定/取消・支払チェック）— **完成（2026-06-16）**
7. **設定・仕上げ**: S10/S11、カレンダー表示、レスポンシブ調整

## 7. 受け入れテスト

要件定義書 v1.1 §4.1 の各AC（機能1〜9）をそのままテストケースとする。
特に: 二次会不参加者の請求額／定員到達時のボタン無効化／確定後の編集拒否（トリガ）／RLS（他人の企画編集が403になること）。

---

## 8. フェーズ6 実装反映（完成・2026-06-16）

対応画面: **S09 精算管理**（`/events/[id]/settlement`）

### 8.1 計算ロジック（`src/lib/settlement.ts`）

| 項目 | 内容 |
|---|---|
| 割り勘 | パートごと `ceil(実額 ÷ 参加人数)` → ユーザーごとに合算 |
| 実費デフォルト | 未保存時は `fee_estimate × 参加人数`（`buildInitialPartActuals`） |
| 実費未設定時の計算 | `part_actuals` 未入力パートは `fee_estimate` を実額として使用（`effectivePartActual`） |
| 手動上書き | `manualAmountOverrides` でプレビュー管理。DB の `adjusted_by` は保存時のみ付与 |
| 参加者0人パート | 計算スキップ |

### 8.2 精算画面 UI（幹事・立替者）

**保存方式（2層モデル）**

| 操作 | 反映タイミング |
|---|---|
| パート別実費・パートチェック・請求額手入力・行追加/除外 | **下書き →「変更を保存」で一括DB反映** |
| 支払チェック | **即時DB保存**（参加者本人画面にも反映） |
| 精算確定 | 別操作。未保存変更がある間はボタン無効 |
| 「請求額を再計算」ボタン | 廃止（プレビューは入力と連動して自動更新） |

**その他 UI**

- 集金合計カードのみ表示（実額・差分カードは画面に非表示。DB の `surplus` は維持）
- 未保存時は警告表示・画面離脱 confirm・`beforeunload`
- 企画詳細（S05）の参加表明は従来どおり即時反映。精算画面でのパート変更は保存まで S05 と食い違う場合あり（注記表示）

### 8.3 データ・権限

| 項目 | 内容 |
|---|---|
| 精算生成 | `ensure_settlement` RPC。1企画1精算 |
| 明細同期 | 初回アクセス時 `syncItemsFromParticipations`（参加表明ベース） |
| 参加者閲覧 | RPC `get_my_settlement_for_event`（本人明細のみ。RLS 循環参照回避） |
| 幹事の participations 編集 | migration `organizer_participation_insert` |
| RLS 修正 | `settlement_items ↔ settlements` 循環参照解消 |
| 確定後ロック | `trg_block_finalized`（既存どおり） |

### 8.4 テスト

| 種別 | 内容 |
|---|---|
| ユニット | `src/lib/settlement.test.ts`（計算・マージ・dirty 判定など） |
| E2E | `e2e/settlement.spec.ts`（実費デフォルト→保存→支払→確定→編集拒否） |

### 8.5 実装時の設計判断（要件からの差分）

- **集金合計のみ画面表示**: 幹事の主作業は「いくら集めるか」の確認のため。`actual_amount` / `surplus` は DB 保持のみ。
- **支払のみ即時保存**: 振込記録は都度発生する運用のため、計算編集とは分離。
- **プレビューと DB の乖離を許容**: 保存前は S05 参加表明と精算画面のパート表示が一致しない場合がある（保存で `participations` を同期）。

---

## 9. フェーズ7 実装反映（完成・2026-06-20）

対応: **自動リマインド（機能5）** ＋ **運用基盤**（pg_cron / GitHub Actions）

### 9.1 Edge Function: send-reminders

| 項目 | 内容 |
|---|---|
| パス | `supabase/functions/send-reminders/index.ts` |
| Secrets（Supabase） | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, `CRON_SECRET` |
| 自動注入 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`（フロントには置かない） |
| 処理 | 期限到来リマインド → 参加者取得 → `notifications` insert → Resend メール → `sent_at` 更新 |
| 失敗時 | リトライなし。管理者1通 + `errors` 配列に記録。`sent_at` は更新済み（再送しない） |

### 9.2 DB・スケジュール

| 項目 | 内容 |
|---|---|
| `notifications` テーブル | migration `20250616000009_notifications.sql`。insert は Edge Function（service role）のみ |
| pg_cron | migration `20250616000010_send_reminders_cron.sql`。ジョブ名 `send-reminders-hourly`、スケジュール `0 * * * *` |
| Vault | `send_reminders_function_url`, `send_reminders_cron_secret`（= `CRON_SECRET` 同一値） |

### 9.3 フロント（通知ベル）

| 項目 | 内容 |
|---|---|
| データ取得 | `getNotifications()`（Server Component、`src/lib/app-data.ts`） |
| 既読化 | `markAllNotificationsRead()`（Client、`src/lib/notifications-data.ts`） |
| UI | `NotificationBell` — ダミーデータ廃止、企画リンク付き |

### 9.4 GitHub Actions（運用）

| ワークフロー | 内容 |
|---|---|
| `supabase-keepalive.yml` | 3日おき REST ping（`SUPABASE_URL` + `SUPABASE_ANON_KEY`） |
| `supabase-backup.yml` | 週次 `supabase db dump --db-url` → Artifacts（30日保持） |

バックアップ用 Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`（`.env.local` の anon キーでは不可）。DB パスワードは **Database → Settings** で Reset（再表示不可）。

### 9.5 手動セットアップ・検証（2026-06-20 完了）

| タスク | 結果 |
|---|---|
| Resend API + Secrets 登録 | ✅ |
| `send-reminders` デプロイ + curl 手動実行 | ✅ `ok: true`、冪等確認 |
| Vault + pg_cron | ✅ `active: true` |
| Keepalive 手動実行 | ✅ |
| 週次バックアップ手動実行 | ✅ Artifacts に `.sql` |

### 9.6 本番前の残タスク（フェーズ7外）

- Resend 独自ドメイン認証（テスト中は `onboarding@resend.dev`、登録メール宛のみ送信可）
- `APP_URL` を本番 URL に更新
- 任意: 自分の Gmail で参加 → リマインド到達確認、アプリ内通知ベルの再テスト

### 9.7 実装時の設計判断

- **メールテンプレート**: React Email パッケージは未導入。HTML テンプレートを `email-template.ts` に単一ファイルで実装（Resend API 直叩き）
- **CI バックアップ**: `supabase link` ではなく `--db-url` 直結 + パスワード URL エンコード（特殊文字対応）
- **Resend テスト制限**: E2E 用架空メール宛は 403 が正常。本番ドメイン or 登録者メールで検証
