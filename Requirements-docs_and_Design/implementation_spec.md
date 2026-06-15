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
7. **割り勘計算**: パートごとに `ceil(実額 ÷ パート参加者数)`（円単位切り上げ）→ ユーザー毎に参加パート分を合算して settlement_items.amount。実額未入力パートは fee_estimate を使用。

## 4. Edge Functions

### 4.1 ogp-fetch
- 入力: url / 出力: { title, image, description }
- 任意URLのHTMLから og:title / og:image / og:description を抽出（汎用OGP。食べログ・Google Maps・一休・Retty・ぐるなび等）
- リダイレクト追従（Google Mapsの短縮URL対策）。タイムアウト5s
- 失敗時は空を返し、フロントは手動入力＋画像アップロードへフォールバック
- スクレイピング禁止: metaタグ以外のDOM解析はしない（規約配慮）

### 4.2 send-reminders
- pg_cron（毎時0分）→ reminders から `remind_at <= now() and sent_at is null` を取得
- アプリ内通知レコード作成＋Resendでメール送信 → sent_at 更新
- 送信失敗時: リトライなし。管理者宛に失敗通知メール1通
- reminders生成: 企画公開時に前日18:00と当日9:00の2行をinsert（アプリ側）

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
5. **リマインド**: reminders生成＋send-reminders＋pg_cron
6. **精算**: S09（割り勘計算・確定/取消・支払チェック）※最複雑のため最後
7. **設定・仕上げ**: S10/S11、カレンダー表示、レスポンシブ調整

## 7. 受け入れテスト

要件定義書 v1.1 §4.1 の各AC（機能1〜9）をそのままテストケースとする。
特に: 二次会不参加者の請求額／定員到達時のボタン無効化／確定後の編集拒否（トリガ）／RLS（他人の企画編集が403になること）。
