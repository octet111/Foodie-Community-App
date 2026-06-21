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
| ストレージ | Supabase Storage | ロゴ・手動店画像・アバター・（フェーズ2）アルバム写真 |
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
- reminders生成: 企画公開時に**4日前**（community_settings の時刻）と当日9:00の2行をinsert（`create_event_reminders` RPC）
- 認証: `CRON_SECRET`（`x-cron-secret` ヘッダ）または `SERVICE_ROLE_KEY`。`verify_jwt = false`
- 冪等: `sent_at` 楽観ロック（更新成功行のみ処理）
- 実装: `supabase/functions/send-reminders/`、メールテンプレート `email-template.ts`
- **2026-06-21 拡張**: `community_settings` の件名/本文テンプレを参照。`test_email` ボディで単発テスト送信可。Resend サンドボックス（`onboarding@resend.dev`）時は許可アドレス以外をスキップ（403 をエラー扱いしない）

## 5. 画面とルーティング

| 画面 | パス |
|---|---|
| S01-03 認証 | /login /signup /reset |
| ホーム | `/`（企画一覧・店リストへの導線） |
| S04 企画一覧 | `/events`（リスト・カレンダー切替。募集中・締切のみ） |
| 実績リスト | `/records`（精算確定済み企画のみ） |
| S05 企画詳細 | /events/[id]（未参加/参加済み/企画者で表示分岐） |
| S06 企画作成・編集 | /events/new /events/[id]/edit |
| S07 店リスト | /shops（行きたい/確保できるタブ） |
| S08 店詳細 | /shops/[id]（行きたいメモ編集あり） |
| S09 精算管理 | /events/[id]/settlement（権限で全件/本人明細を出し分け） |
| S10 マイページ | /me（ニックネーム・アイコン編集） |
| S11 設定 | /settings（admin限定）。サブ: /settings/reminders /settings/email-template |

## 6. 実装フェーズ（推奨順）

1. **基盤**: Supabaseプロジェクト作成 → schema.sql → rls.sql 適用 → Next.js雛形＋トークン適用
2. **認証**: S01-03 ＋ profiles自動作成（auth.usersトリガ）
3. **店**: S07/S08（shops/stocks/secure_claims、ogp-fetch）
4. **企画**: S04/S05/S06（events/event_parts/participations、定員締切ロジック）
5. **リマインド**: reminders生成＋send-reminders＋pg_cron — **完成（2026-06-20）**
6. **精算**: S09（割り勘計算・確定/取消・支払チェック）— **完成（2026-06-16）**
7. **設定・仕上げ**: S10/S11、カレンダー表示、レスポンシブ調整 — **部分完成（2026-06-21）** §10 参照。**UIブラッシュアップ（2026-06-21）** §11 参照。**機能ブラッシュアップ（2026-06-21）** §12 参照。**機能ブラッシュアップ #3（2026-06-21）** §13 参照。**機能ブラッシュアップ #4（2026-06-21）** §14 参照。残: Vercel デプロイ、全 AC E2E

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

---

## 10. フェーズ8 実装サマリ（2026-06-21・部分完成）

### 10.1 画面

| 画面 | パス | 内容 |
|---|---|---|
| S10 マイページ | `/me` | ニックネーム・アイコン編集、企画中/参加予定/未払い/ストック・宣言、ログアウト |
| S11 コミュニティ設定 | `/settings` | admin のみ。名前・ロゴ・振込先、メンバー admin 付与/剥奪 |

### 10.2 主要ファイル

| 区分 | パス |
|---|---|
| データ | `src/lib/me-data.ts`, `src/lib/me-format.ts`, `src/lib/settings-data.ts` |
| UI | `src/components/me/MePageClient.tsx`, `src/components/settings/SettingsPageClient.tsx` |
| 認可 | `src/proxy.ts`（`/settings` admin チェック） |
| Storage | `src/lib/storage.ts`（`uploadCommunityLogo`, `getCommunityLogoUrl`） |
| ヘッダー | `src/components/layout/AppHeader.tsx`（ロゴ画像表示） |

### 10.3 DB

| 項目 | 内容 |
|---|---|
| migration | `20250621000001_community_settings_seed.sql` |
| 内容 | `community_settings` 初期行（`美食倶楽部`）、admin の INSERT ポリシー |

### 10.4 仕上げ（P8-3〜5）

| 項目 | 内容 |
|---|---|
| レスポンシブ | `AppShell` `min-w-0` / `overflow-x-hidden` |
| 空状態 | マイページ各セクション、企画一覧に初手導線 |
| メタ | title テンプレート、`public/icon.svg`、主要ページ `metadata` |

### 10.5 テスト

| 項目 | 内容 |
|---|---|
| 新規 | `e2e/me.spec.ts`（表示・ニックネーム編集・ログアウト・非 admin settings 拒否） |
| 更新 | `e2e/auth.spec.ts`（マイページ経由ログアウト） |
| 状態 | auth / shops / events / settlement / me — 主要フロー緑（2026-06-21） |

### 10.6 未完了（本番前）

| タスク | 内容 |
|---|---|
| P8-6 | Vercel デプロイ（⚑ 人間作業） |
| P8-7 | §4.1 全 AC の Playwright 網羅 |
| その他 | Lighthouse Accessibility 正式計測、Resend ドメイン、`APP_URL` 本番化 |

---

## 11. フェーズ9 UIブラッシュアップ（2026-06-21）

### 11.1 ナビ・導線

| 項目 | 内容 |
|---|---|
| ナビ項目 | 企画 `/events` / 店 `/shops` / **実績** `/records` / マイページ `/me` / 設定 `/settings`（admin のみ） |
| アイコン | `src/components/layout/NavIcon.tsx` — events / shops / **records** / me / settings |
| 企画作成 | 企画一覧上部「＋ 企画を作成」（`EventsPageClient`）。ナビ FAB は廃止 |
| マイページ | 設定リンク削除。admin はナビの「設定」からアクセス |

> **2026-06-21 追記（§12）**: ホーム `/` をナビ外のハブ画面に分離。ナビ「企画」は `/events` へ。実績タブ追加。

### 11.2 設定画面（S11 拡張）

| パス | 内容 |
|---|---|
| `/settings` | コミュニティ名・ロゴ・振込先、メンバー一覧（UUID 表示）+ admin 付与/剥奪 |
| `/settings/reminders` | 先行（4日前）・当日リマインドのデフォルト送信時刻 |
| `/settings/email-template` | リマインドメール件名/本文テンプレ（プレースホルダ `{{nickname}}` 等） |

| 区分 | パス |
|---|---|
| UI | `SettingsSubNav`, `ReminderSettingsClient`, `EmailTemplateSettingsClient` |
| ロジック | `src/lib/reminder-templates.ts`（`ADVANCE_REMINDER_DAYS = 4`） |
| データ | `src/lib/settings-data.ts` 拡張 |

### 11.3 開催日時（S06）

| 項目 | 内容 |
|---|---|
| UI | `EventHeldAtFields` — 開催日（`type="date"`）+ 開催時刻（`<select>` 10分刻み） |
| 選択肢 | `EVENT_HELD_AT_TIME_OPTIONS` — 00:00〜23:50（144件） |
| ユーティリティ | `splitLocalDatetime`, `combineLocalDatetime`, `isoToHeldAtFields`（`src/lib/event-dates.ts`） |
| テスト | `src/lib/event-dates.test.ts` |

### 11.4 リマインド仕様変更

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 先行リマインド | 開催前日 18:00 JST | **開催4日前** 18:00 JST（時刻は settings で変更可） |
| 当日リマインド | 開催当日 09:00 JST | 変更なし |
| メール文言 | 固定 HTML | DB テンプレ or デフォルト（`reminder-templates.ts` / `email-template.ts`） |

### 11.5 DB マイグレーション

| migration | 内容 |
|---|---|
| `20250622000001_community_reminder_email_settings.sql` | `community_settings` にリマインド時刻・メールテンプレ列追加。`create_event_reminders` が settings 時刻を参照 |
| `20250622000002_reminder_advance_four_days.sql` | 先行リマインドを前日 → 4日前に変更 |

### 11.6 Edge Function 更新

| 項目 | 内容 |
|---|---|
| テンプレート | `email_reminder_subject_template` / `email_reminder_body_template` を settings から読込 |
| テスト送信 | POST body `{ "test_email": "..." }` で単発送信（任意 `event_id`） |
| Resend 制限 | サンドボックス送信元時、未許可宛先はスキップ（管理者失敗通知は送る） |

### 11.7 テスト

| 種別 | 内容 |
|---|---|
| ユニット | `reminder-templates.test.ts`（7件）、`event-dates.test.ts`（3件） |
| E2E | `events.spec.ts` / `settlement.spec.ts` — 開催日 fill + 時刻 selectOption |
| 手動 | `t.noguchi111@gmail.com` 宛テスト送信。E2E ユーザー宛 403 は Resend 制限として正常 |

---

## 12. フェーズ10 機能ブラッシュアップ（2026-06-21）

ログイン後導線・店メモ・実績リスト・企画一覧/詳細の UI・参加取消ロジックを拡張。

### 12.1 ホーム・ナビ・ルーティング

| 項目 | 内容 |
|---|---|
| ホーム `/` | `HomePageClient` — 「企画一覧」「店リスト」への導線ボタン（ナビタブには含めない） |
| 企画一覧 | `/events` — `getEventsList()` は `open` / `closed` のみ。精算確定済みは除外 |
| 実績リスト | `/records` — `getCompletedEventsList()` は `settlements.status = finalized` の企画のみ |
| ナビ | 企画 → `/events`、店 → `/shops`、**実績** → `/records`、マイページ、設定（admin） |
| 実装 | `src/app/(app)/page.tsx`, `events/page.tsx`, `records/page.tsx`, `constants.ts` NAV_ITEMS |

### 12.2 店リスト・店詳細（S07/S08）

| 項目 | 内容 |
|---|---|
| 店追加ボタン | S07 上部に primary 全幅「＋ 店を追加（URL貼付）」（S04 企画作成ボタンと同配置） |
| 行きたいメモ | `stocks.memo`。入力は **店追加モーダル** と **S08 店詳細**（自分がストック済みの店のみ） |
| 店リスト表示 | メモはテキスト表示のみ（一覧に編集ボタンは置かない） |
| 実装 | `ShopAddModal`, `ShopDetailClient`, `getUserStockForShop`, `ShopStockCard` |

### 12.3 実績リストの判定

| 項目 | 内容 |
|---|---|
| 表示条件 | 精算レコードがあり `settlements.status = finalized` の企画 |
| 企画 status | 精算確定時に `events.status → held`。確定取消時に `held → closed` |
| 精算開始のみ | 実績には出さない（`collecting` は企画一覧側に残る） |
| DB | migration `20250623000002_settlement_finalize_only_held.sql`（`20250623000001` は精算開始時 held 化・上書き済み） |
| 実装 | `SettlementPageClient`（確定/取消時に status 更新）、`events-data.ts` |

### 12.4 企画一覧カード（S04）

| 項目 | 内容 |
|---|---|
| 一次会残数 | `getFirstPartRemaining()` — `sort_order` 最小パートの `capacity − joined` |
| 表示 | 募集中のみ「残りN人」落款バッジ（`RarityBadge` と同型） |
| 色 | 残り **3人以上**: 白枠・白文字 / **2人以下**: 朱枠・朱文字（`#E8694F`） |
| 実装 | `EventCard.tsx`, `event-participation.ts` |

### 12.5 企画詳細（S05）UI 強調（フェーズ10）

| 項目 | 内容 |
|---|---|
| 募集中バッジ | タイトル直下に独立配置（緑太枠） |
| 参加表明済み | 参加メンバー向け緑枠バナー（チェック・参加パート名） |
| 参加パート | 参加中は緑枠＋「参加中」バッジ。「取り消す」は緑枠 outline |
| 会費見込み | 真鍮枠カード＋明朝大文字金額（当時は非企画者のみ） |
| 参加者 | 「企画者」「立替者」真鍮チップ（`settlements.finalized_by` 参照） |
| 実装 | `EventDetailClient.tsx`, `events-data.ts`（`finalizer_id`） |

> **フェーズ11で更新**: 会費見込み・レイアウト・立替者指定・参加者管理は §13 参照。

### 12.6 参加表明・取消ロジック（修正）

| 項目 | 変更前 | 変更後 |
|---|---|---|
| 定員到達 | 全パート満員で `events.status → closed`（自動） | **廃止**。パート単位で「満員」表示のみ |
| 本人取消 | 定員到達後は `closed` になり取消不可だった | **募集中（`open`）なら取消可**（企画者本人も可） |
| 締切後 | — | 幹事の「締切にする」で `closed`。本人取消不可・企画者のみ外せる |
| 実装 | `EventDetailClient`（`maybeCloseEvent` 削除）、`canCancelPart()` |

### 12.7 テスト

| 種別 | 内容 |
|---|---|
| E2E | `events.spec.ts` — 定員到達後も「募集中」維持・「取り消す」表示を確認 |
| E2E | `auth.spec.ts` — ログイン後ホーム見出し「ホーム」 |

---

## 13. フェーズ11 機能ブラッシュアップ #3（2026-06-21）

企画詳細の運用機能・立替者・S05 UI 整理・一覧表示の改善。

### 13.1 参加者の手動追加・削除（S05）

| 項目 | 内容 |
|---|---|
| 権限 | 企画者・admin（`canManageParticipations`） |
| 期間 | `open` / `closed`（`held` 以降は不可） |
| 追加 | パートごとにメンバー選択＋「追加」。**定員超過は不可**（UI＋`handleOrganizerAdd`） |
| 削除 | 参加者行の「外す」。企画者本人は外せない |
| RLS | 既存 `ptc_insert_organizer` / `ptc_delete_own_or_mgr` |
| 実装 | `EventDetailClient.tsx`, `event-participation.ts` |

### 13.2 立替者の指定

| 項目 | 内容 |
|---|---|
| 指定者 | 企画者・admin |
| 候補 | **一次会**（`sort_order` 最小パート）の参加者のみ |
| 保存 | RPC `set_event_finalizer(p_event_id, p_finalizer_id)` — `settlements` を upsert |
| 表示 | メインカードに「企画」「立替」行。設定 UI は参加者一覧の下 |
| 精算アクセス | 立替者も `is_event_manager` 相当で精算画面へ（`canAccessSettlementPage`） |
| DB | `20250624000001_set_event_finalizer.sql` |
| 実装 | `EventDetailClient.tsx`, `settlement-data.ts`, `events-data.ts`（`finalizerNickname`） |

### 13.3 締切の取り消し

| 項目 | 内容 |
|---|---|
| 操作 | 「募集中に戻す」— `closed` → `open` |
| 権限 | 企画者・admin（`canReopenEvent`） |
| 不可 | `held` / `archived`（精算確定後は確定取消 → `closed` 後に戻す） |
| 実装 | `EventDetailClient.handleReopenEvent` |

### 13.4 企画詳細 UI（S05 再整理）

| ブロック | デザイン |
|---|---|
| 参加パート | ワイヤー `.part` 風アクション行＋補足キャプション |
| 参加者 | 1つの名簿カード内にパート別サブ見出し＋破線区切り `.person` 風 |
| 立替者 | 真鍮左ボーダーの設定パネル（`SectionHeader` で見出しと説明を分離） |
| 会費見込み | 参加表明済み全員（企画者含む）。コンパクト（`text-lg`、薄い真鍮枠） |
| セクション見出し | `SectionTitle` を 10px → 12px（`text-xs`） |
| 削除 | `Button` variant `danger`（朱色枠・文字） |

### 13.5 企画一覧（S04）

| 項目 | 内容 |
|---|---|
| 残数バッジ | 一次会残り **0人** のとき「満員」（2人以下と同様に朱系スタイル） |
| 実装 | `EventCard.tsx` |

### 13.6 共通 UI

| 項目 | 内容 |
|---|---|
| `Button` | `danger` バリアント追加（企画削除、コメント削除、パート削除、確保宣言削除） |
| `SectionHeader` | 見出し＋キャプション（`EventDetailClient` 内ローカルコンポーネント） |

---

## 14. フェーズ12 機能ブラッシュアップ #4（2026-06-21）

店リスト UI 統一・行きたいメモ完成・プロフィールアイコン・マイページ UI 修正。

### 14.1 店リスト（S07）追加ボタン

| 項目 | 内容 |
|---|---|
| 変更前 | 一覧下部の `outline` ボタン |
| 変更後 | 企画一覧 `/events` と同配置の **上部 primary 全幅**「＋ 店を追加（URL貼付）」 |
| 実装 | `ShopsPageClient.tsx` |

### 14.2 行きたいメモ（`stocks.memo`）

| 項目 | 内容 |
|---|---|
| 店追加モーダル | 「行きたい理由（任意）」テキストエリア。保存時に `stocks.memo` へ |
| S08 店詳細 | ストック済み店のみ「行きたいメモ」セクションで編集・保存 |
| S07 / マイページ | テキスト表示のみ（一覧に編集 UI なし） |
| 実装 | `ShopAddModal`, `ShopDetailClient`, `getUserStockForShop`, `ShopStockCard` |

### 14.3 プロフィールアイコン

| 項目 | 内容 |
|---|---|
| DB | `profiles.avatar_path`（nullable）— migration `20250625000001_profile_avatars.sql` |
| Storage | バケット `avatars`（公開読取・本人 `{user_id}/` フォルダのみ書込、15MB） |
| マイページ S10 | 「アイコンを変更」「アイコンを削除」。JPEG/PNG/WebP/GIF/HEIC |
| 未設定時 | ニックネーム頭文字（従来どおり） |
| 表示箇所 | ヘッダー、企画詳細（参加者・コメント）、店（確保宣言）、マイページ |
| 実装 | `UserAvatar.tsx`, `MePageClient.tsx`, `storage.ts`（`uploadAvatar` / `getAvatarUrl`）, `app-data.ts`（`AppProfile.avatarPath` / `avatarUrl`） |

### 14.4 マイページ UI（S10）

| 項目 | 内容 |
|---|---|
| プロフィール行 | grid レイアウト（アイコン列 / ニックネーム列 / admin バッジ）で重なり防止 |
| ニックネーム編集 | 入力欄・保存/キャンセルをアイコン行の下に全幅配置 |
| `UserAvatar` | `block` + `overflow-hidden` で円形クリップを厳密化 |

### 14.5 テスト

| 種別 | 内容 |
|---|---|
| E2E | `shops.spec.ts` — 店追加時メモ入力、店詳細での表示確認 |
| 手動 | マイページでアイコンアップロード・削除、ヘッダー反映 |
