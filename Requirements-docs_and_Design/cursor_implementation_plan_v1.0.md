# Cursor 実装プラン v1.0 — フーディコミュニティ運営アプリ

前提ドキュメント: 要件定義書 v1.1 / 画面設計書 v0.1 / wireframes v0.4 / 画面遷移図 v1.0 / schema.sql / rls.sql / 実装仕様書 v1.0 / design-tokens.css
方針: 一人＋AI駆動（Cursor）/ 品質優先・時間制約なし / 型=supabase gen types で厳密 / テスト=Playwright E2Eを主要フローに

## 納品ファイル対応表（Cursorに渡す実体）
本プランで「要件定義書」等の略称で参照しているドキュメントの実ファイル名は以下の通り。Cursorのコンテキストにはこれらを添付する。

| 略称（本文中の呼称） | 実ファイル名 | 用途 |
|---|---|---|
| 要件定義書 v1.1 | `requirements_v1.1.md` | 機能要件・例外系・受け入れ条件(AC)・データモデル・決定ログ |
| 画面設計書 v0.1 | `screen_design_v0.1.md` | 画面一覧・遷移構造・画面別要素定義 |
| wireframes v0.4 | `wireframes_v0.4_all.html` | 全MVP画面のUIモック（見た目の正） |
| 画面遷移図 v1.0 | `screen_flow_v1.0.html` | 画面間の遷移・主要動線・権限分岐 |
| 実装仕様書 v1.0 | `implementation_spec.md` | 技術スタック・割り勘計算式・Edge Function仕様・ルーティング |
| デザイントークン | `design-tokens.css` | 配色・フォント・コンポーネント規約 |
| スキーマDDL | `schema.sql` | 13テーブル＋7 ENUMのCREATE文 |
| RLSポリシー | `rls.sql` | CRUD権限のSQL化＋確定後ロックトリガ |

## 使い方
- 各タスクは5〜10分で完了する粒度。上から順に依存している。
- 各タスクに【完了条件】を付けた。これを満たすまで次に進まない。
- Cursorへは「タスクID＋本文」を1つずつ渡す。1タスク=1コミット推奨。
- ⚑ はAIに丸投げせず人間が値を確認・入力する箇所。

---

## フェーズ0: 環境構築（基盤）

### P0-1. Next.jsプロジェクト初期化
`create-next-app`（App Router・TypeScript・Tailwind・ESLint・src/dirあり・import alias @/*）でプロジェクト作成。
【完了条件】`npm run dev` でデフォルト画面が localhost:3000 に表示される。

### P0-2. 依存パッケージ導入
`@supabase/supabase-js` `@supabase/ssr` を追加。devに `@playwright/test` を追加し `npx playwright install` 実行。
【完了条件】package.json に4点が記載され、`npx playwright --version` が通る。

### P0-3. ディレクトリ設計の確定
`src/app`（ルート）、`src/components`（UI）、`src/lib`（supabaseクライアント・util）、`src/types`（生成型）、`supabase/`（migrations/functions）、`e2e/`（Playwright）を作成。空でよい。
【完了条件】上記ディレクトリが存在し、READMEに構成を1段落で記述。

### P0-4. ⚑ Supabaseプロジェクト作成と環境変数
Supabase上で無料プロジェクトを作成（リージョン=Tokyo）。`.env.local` に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定。`.env.example` も作る。`.gitignore` に `.env*.local` があることを確認。
【完了条件】.env.local に実値、.env.example にプレースホルダ、両キーが揃う。SERVICE_ROLE_KEY はまだ置かない（Edge Function用に後で分離）。

### P0-5. Supabaseクライアントの実装（ブラウザ用）
`src/lib/supabase/client.ts` に @supabase/ssr の createBrowserClient を実装。
【完了条件】型エラーなくimportできる。

### P0-6. Supabaseクライアントの実装（サーバ用）
`src/lib/supabase/server.ts` に createServerClient（cookies連携）を実装。App Routerのcookies()を使用。
【完了条件】Server Componentからimportでき、型エラーなし。

### P0-7. デザイントークン適用
`design-tokens.css` の :root 変数を `src/app/globals.css` に移植。Tailwindのtheme.extendにcolors（bg/card/card-2/line/brass/shu/green/inv）とfontFamily（body/display）をCSS変数参照でマッピング。フォントはnext/fontかGoogle Fonts linkでShippori Mincho・Zen Kaku Gothic Newを読み込み。
【完了条件】`bg-card` `text-brass` `font-display` 等のクラスが効く。テストページで朱・真鍮・明朝が表示確認できる。

---

## フェーズ1: DBスキーマとRLS

### P1-1. マイグレーション初期化
`supabase init`（CLI）。`supabase/migrations/` を有効化。⚑ ローカルにSupabase CLIが入っていなければ導入。
【完了条件】supabase/config.toml が生成される。

### P1-2. スキーマ投入（migration化）
`schema.sql` の内容を `supabase/migrations/0001_init.sql` として配置。ENUM→テーブル→インデックスの順序を維持。
【完了条件】Supabaseダッシュボードのリモートに適用し、13テーブル＋7 ENUMが作成される。エラーなし。

### P1-3. profiles自動作成トリガ
auth.users への insert 後に public.profiles を作る関数＋トリガを `0002_profiles_trigger.sql` で実装。nicknameはサインアップ時のraw_user_meta_data.nickname、無ければemailのローカル部。roleはmember固定。
【完了条件】テスト登録で profiles に行が自動生成され、nicknameが入る。

### P1-4. ⚑ 初期管理者の設定
最初の1人をadminにする方法を決め実装。方式: 環境変数 INITIAL_ADMIN_EMAIL を読むSQL関数 or ダッシュボードで手動UPDATE。MVPは手動UPDATEを正とし、手順をREADMEに記載。
【完了条件】自分のprofiles.roleがadminになり、READMEに再現手順がある。

### P1-5. RLS投入
`rls.sql` を `0003_rls.sql` として配置・適用。ヘルパー関数（is_admin/is_organizer/is_finalizer/is_event_manager）→RLS有効化→各ポリシー→確定後ロックトリガの順。
【完了条件】全13テーブルでRLS有効。ダッシュボードのRLSステータスが全て緑。

### P1-6. 型生成
`supabase gen types typescript` を実行し `src/types/database.ts` に出力。npm scriptに `gen:types` を登録。
【完了条件】Database型がimportでき、テーブル名・カラムが補完される。

### P1-7. RLS手動検証（最小）
SQL Editorで2ユーザーを想定し、他人のeventをUPDATEして失敗・自分のをUPDATEして成功することを確認。
【完了条件】他人の企画編集が拒否され、自分のが通ることをSQLで確認できた。

---

## フェーズ2: 認証（S01-03）

### P2-1. 認証レイアウトとトークン適用の土台
`(auth)` ルートグループと共通レイアウト（中央寄せ・ロゴ大・wireframes S01準拠）を作成。
【完了条件】/login が枠だけ表示される。

### P2-2. ログイン画面 S01
メール＋パスワード入力、signInWithPassword、エラー表示、成功で `/` へ。HTML<form>不可・onClick制御。
【完了条件】既存ユーザーでログインでき、誤パスワードでエラー文言が出る。

### P2-3. 新規登録画面 S02
nickname（公開）/email（非公開の注記）/password×2。signUp時にoptions.data.nicknameを渡す（P1-3トリガが拾う）。
【完了条件】登録で auth.users と profiles が作られ、nicknameが反映される。

### P2-4. パスワードリセット S03
resetPasswordForEmail送信＋送信完了メッセージ（有効期限の注記）。リセット後の新パスワード設定画面も。
【完了条件】リセットメールが届き、リンクから新パスワードを設定できる。

### P2-5. 認証ミドルウェア
`middleware.ts` で未ログインを /login へ、ログイン済みが認証画面に来たら / へリダイレクト。
【完了条件】未ログインで / にアクセスすると /login に飛ぶ。

### P2-6. E2E: 認証フロー
Playwrightで「登録→ログアウト→ログイン」を1本書く。⚑ テスト用メールの扱い（Supabaseのメール確認をローカルでは無効化 or テストプロジェクト）を決める。
【完了条件】`npx playwright test auth` が緑。

---

## フェーズ3: 共通レイアウトとナビ

### P3-1. アプリシェル（ヘッダー＋ナビ） ✅（2026-06-21 更新）
ログイン後の共通レイアウト。ヘッダー（ロゴ＋コミュニティ名＋通知ベル＋アバター）、下部タブ（モバイル）/サイドナビ（PC, md以上）。community_settingsから名前・ロゴ取得。ナビ構造と遷移は画面遷移図 v1.0 準拠。
【完了条件】全主要画面でヘッダーとナビが出る。md境界で切替わる。
**反映**: `AppShell`, `AppNav`, `AppHeader`。**2026-06-21**: `NavIcon`（企画/店/マイページ/設定）。設定タブは admin のみ（`NAV_ITEMS.adminOnly`）。企画作成 FAB はナビから削除。

### P3-2. 通知ベルのドロップダウン（既読管理）
未読件数バッジ＋ドロップダウン。in_app通知の取得、開いたら既読化。データは後続で接続、まずUIと状態管理。
【完了条件】ベルにダミー件数が出て、開くと一覧が出る。

### P3-3. 共通UIコンポーネント
RarityBadge（落款・rarity別文言と色、walk_in/reservableは非表示）、StatusBadge（募集中/締切/開催済）、ConnChip（コネ種別）、SectionTitle（真鍮見出し＋リード線）、Card、Button（btn-p/btn-o）。
【完了条件】Storybook不要、テストページに全部並べて見た目がwireframe一致。

---

## フェーズ4: 店（S07/S08）＋ OGP

### P4-1. Edge Function: ogp-fetch（雛形）
`supabase/functions/ogp-fetch/` 作成。URLを受けHTMLからog:title/og:image/og:descriptionを抽出して返す。リダイレクト追従・5sタイムアウト・失敗時は空。⚑ SERVICE_ROLE不要（公開fetchのみ）。
【完了条件】食べログURLでtitle/imageが返る。Google Maps短縮URLで空でも落ちない。

### P4-2. 店追加モーダル
URL貼付→ogp-fetch呼び出し→プレビュー→rarity選択→保存（shops insert, created_by=自分）。OGP失敗時は店名手動入力＋画像アップロード（Storage）にフォールバック。
【完了条件】URLから店カードが自動生成され、失敗時も手動で保存できる。

### P4-3. Storageバケット設定
`shop-images` `community` `event-photos` バケット作成。⚑ 公開/非公開とポリシーを決める（店画像・ロゴは公開、写真は認証必須など）。
【完了条件】手動アップロード画像が表示URLで読める。

### P4-4. 店リスト S07 ✅（2026-06-21 更新）
「行きたい(stocks)」「確保できる(secure_claims全員分)」タブ。店カード＋希少バッジ。確保タブは宣言者ニックネーム＋コネ種別。
【完了条件】両タブが正しいデータを出す。空状態メッセージあり。
**反映**: `ShopsPageClient`。**2026-06-21**: 上部 primary「＋ 店を追加」（P12-1 で S04 と完全統一）。ストックの `memo` は一覧にテキスト表示のみ。

### P4-5. 店詳細 S08 ✅（2026-06-21 更新）
店情報＋rarity、確保できる人一覧（種別・条件）、確保宣言ボタン、過去の企画、「この店で企画を立てる」導線。
【完了条件】宣言の追加・自分の宣言の編集削除ができる。企画作成へ店idを引き継いで遷移。
**反映**: `ShopDetailClient`。**2026-06-21**: 自分のストック店に「行きたいメモ」（`stocks.memo`）編集欄を追加。店追加モーダルでも同メモを入力可。

### P4-6. 確保宣言モーダル
コネ種別5択＋補足メモ。secure_claims insert/update（user_id=自分・unique制約）。
【完了条件】同一店への二重宣言が防がれ、種別が保存される。

### P4-7. E2E: 店フロー
「店追加→確保宣言→店詳細で確認」を1本。
【完了条件】テスト緑。

---

## フェーズ5: 企画（S04/S05/S06）

### P5-1. 企画作成 S06（フォーム土台） ✅（2026-06-21 更新）
店選択（ストック/宣言/URL）、タイトル、企画説明（textarea・プレーンテキスト）、開催日時、場所。
【完了条件】入力値がstateに保持され、バリデーション（必須）あり。
**反映**: `EventCreateForm`, `EventHeldAtFields`。**2026-06-21**: 開催日時は **10分単位**（date + time select）。`src/lib/event-dates.ts`。

### P5-2. パート設定UI
行追加式（パート名/定員/想定費用）。デフォルト1行「一次会」。
【完了条件】パートの追加削除ができ、3次会以上も足せる。

### P5-3. 企画の保存（events＋event_parts） ✅（2026-06-21 更新）
公開ボタンでevents insert（organizer_id=自分・status=open）＋event_parts一括insert＋reminders2行生成（**4日前**18時・当日9時 JST。時刻は community_settings 参照）。
【完了条件】保存後にS05へ遷移。remindersに2行入る。
**反映**: `create_event_reminders` RPC。**2026-06-21**: 前日→4日前（migration `20250622000002`）。settings 時刻列（migration `20250622000001`）。

### P5-4. 企画一覧 S04（リスト） ✅（2026-06-21 更新）
events（deleted_at is null）を開催日昇順。カード=OGP画像/店名(明朝)/日時/希少バッジ/参加状況/status。募集中フィルタ。
【完了条件】作成した企画が一覧に出て、締切は淡色表示。
**反映**: `EventsPageClient` at `/events`。**2026-06-21**: 一覧上部に「＋ 企画を作成」。募集中は一次会「残りN人」落款バッジ（3人以上=白、2人以下=朱）。精算確定済みは一覧から除外。

### P5-5. 企画一覧 S04（カレンダー）
月表示のみ。企画のある日に真鍮ドット、選択日でその日の企画を下に表示。
【完了条件】リスト/カレンダー切替が動き、日付選択で絞り込める。

### P5-6. 企画詳細 S05（表示） ✅（2026-06-21 更新）
店カード→企画説明（改行保持）→パート別参加状況→参加者一覧→コメント。status/権限で表示分岐の土台。表示分岐（未参加/参加済み/企画者）は画面遷移図 v1.0 のS05分岐に従う。
【完了条件】未参加/参加済み/企画者で出る要素が変わる。
**反映**: `EventDetailClient`。**2026-06-21**: 参加表明済みバナー、参加パート強調、会費見込みカード、企画者/立替者チップ。

### P5-7. 参加表明・取消（participations） ✅（2026-06-21 更新）
パート単位でjoin/cancel。本人のみ・締切前のみ（status=open）。自分の会費見込み（参加パートのfee_estimate合算）を表示。
【完了条件】二次会だけ不参加が表現でき、会費見込みが連動する。
**反映**: **2026-06-21**: 定員到達時の企画全体自動締切を廃止。`open` 中は企画者含め本人が「取り消す」可。

### P5-8. 定員自動締切 ✅（2026-06-21 更新）
パートのjoined数がcapacity到達でそのパートを満員扱い（ボタン無効・満員表示）。企画全体の `closed` は幹事の「締切にする」のみ。
【完了条件】定員到達で参加ボタンが無効化される（AC一致）。
**反映**: 全パート満員での `events.status=closed` 自動更新は**廃止**（参加取消を可能にするため）。

### P5-9. 締切後の幹事操作
締切後は本人キャンセル不可（ボタン非表示）。企画者は参加者一覧から手動で外せる。
【完了条件】締切後、企画者だけが参加者を外せる。

### P5-10. 企画の編集・論理削除
企画者/管理者のみ編集。削除はdeleted_at設定（論理削除・確認ダイアログ）。
【完了条件】他人は編集ボタンが出ず、削除すると一覧から消えるがデータは残る。

### P5-11. コメント
投稿（comments insert）、自分の投稿のみ編集削除メニュー。管理者は削除のみ。
【完了条件】他人のコメントに編集UIが出ない。RLSでも保護。

### P5-12. E2E: 企画フロー
「企画作成→別ユーザーで参加→定員締切→コメント」を1本。
【完了条件】テスト緑。定員締切のアサーション含む。

---

## フェーズ6: 精算（S09・最重要）

### P6-1. 割り勘計算ロジック（純関数）
`src/lib/settlement.ts` に計算関数。入力=パート別実額（未入力はfee_estimate）・パート別参加者。出力=ユーザー別amount（パートごと ceil(実額÷人数)→合算）。⚑ 参加者0人/実額0のエッジケースを定義しテスト。
【完了条件】ユニットテストで計算例3パターン（一次のみ/一+二/端数切上）が一致。

### P6-2. 精算の生成・取得 S09土台
events詳細から精算へ。settlements未作成なら作成（event_id unique）。精算管理者(企画者/立替者/管理者)のみ全件、一般は自分の明細のみ（RLS）。
【完了条件】権限で見える範囲が変わる。

### P6-3. 母集団テーブルUI
参加表明から自動生成された行（ニックネーム/参加パート/請求額）。行の追加・除外・金額上書き（adjusted_by記録）。
【完了条件】自動生成された請求額が表示され、手動上書きできる。

### P6-4. パート別実額入力と差分サマリ
パート別実額入力→請求額再計算。集金合計/実額/差分（surplusはgenerated）を表示。
【完了条件】実額変更で請求額と差分が連動。差分=幹事預かりの注記。

### P6-5. 支払済チェック
settlement_items.paidのトグル＋paid_at。本人は自分の状況を閲覧のみ。
【完了条件】チェックが保存され、本人画面に反映。

### P6-6. 確定・確定取消（ロック）
確定でstatus=finalized→明細ロック（DBトリガが変更拒否）。確定取消でcollectingに戻す。
【完了条件】確定後の金額編集がトリガで弾かれ、取消で再編集できる（AC一致）。

### P6-7. 集金連絡文の生成
金額・振込先・期限の定型文を生成しコピー。⚑ 振込先の保持先（community_settingsに追加 or 都度入力）を決める。
【完了条件】コピーボタンで連絡文がクリップボードに入る。

### P6-8. E2E: 精算フロー
「実額入力→請求額確認→支払チェック→確定→編集拒否確認」を1本。二次会不参加者が安くなることをアサート。
【完了条件】テスト緑。確定後ロックのアサーション含む。

---

## フェーズ7: リマインド・運用 — **完成（2026-06-20）**

### P7-1. ⚑ Edge Function: send-reminders と service role分離 ✅
SERVICE_ROLE_KEYをSupabaseのFunction Secretsに設定（フロントには出さない）。remindersから remind_at<=now() かつ sent_at is null を取得→in_app通知作成＋Resend送信→sent_at更新。失敗時はリトライなし＋管理者へ失敗通知1通。
【完了条件】手動実行で対象企画の参加者にメールが届き、sent_atが入る。二重実行で再送されない（冪等）。
**反映**: `supabase/functions/send-reminders/`。curl + `CRON_SECRET` で手動実行成功。`sent_at` 楽観ロックで冪等確認。

### P7-2. ⚑ Resend設定 ✅（本番ドメインは未）
ResendアカウントとAPIキー、送信元ドメイン（or onboarding用）を設定。React Emailでリマインドテンプレート1種。
【完了条件】テスト送信が届く。
**反映**: Secrets 登録済。HTML テンプレート `email-template.ts`（React Email パッケージ未導入）。テストモードは Resend 登録メール宛のみ。E2E ユーザー宛 403 は正常。

### P7-3. pg_cron登録 ✅
send-remindersを毎時0分（JST考慮）で発火。
【完了条件】cron.jobに登録され、次回実行時刻が確認できる。
**反映**: migration `20250616000010_send_reminders_cron.sql` + Vault 2件。`send-reminders-hourly` / `0 * * * *` / `active: true` 確認済。

### P7-4. ⚑ 停止回避ping（GitHub Actions） ✅
3日おきにSupabaseへ軽量クエリを投げるワークフロー。⚑ リポジトリSecretsにURL/キー。
【完了条件】手動trigger（workflow_dispatch）で成功し、cron設定済み。
**反映**: `.github/workflows/supabase-keepalive.yml`。手動実行 Success 確認済。

### P7-5. ⚑ 週次バックアップ（GitHub Actions） ✅
週1で pg_dump→アーティファクト or Cloudflare R2 へ保存。⚑ 保存先を決める。
【完了条件】手動triggerでダンプが保存先に出力される。
**反映**: 保存先 = **GitHub Artifacts**（30日）。`.github/workflows/supabase-backup.yml`（`--db-url` 直結）。手動実行 + Artifacts ダウンロード確認済。

---

## フェーズ8: 仕上げ（S10/S11・全体）— **部分完成（2026-06-21）**

### P8-1. マイページ S10 ✅（2026-06-21 更新）
プロフィール（nickname編集）/企画中（精算へ導線）/参加予定/未払い/ストック・宣言/ログアウト。
【完了条件】各セクションが実データで埋まる。
**反映**: `/me`。`src/lib/me-data.ts`, `src/lib/me-format.ts`, `src/components/me/MePageClient.tsx`。ニックネーム編集・確保宣言編集（`SecureClaimModal` 再利用）・ログアウト実装。E2E `e2e/me.spec.ts` 緑。**2026-06-21**: コミュニティ設定リンク削除（設定はナビ経由）。

### P8-2. コミュニティ設定 S11（admin） ✅（2026-06-21 更新）
名前・ロゴ（Storage）編集、メンバー一覧＋admin付与/剥奪。adminのみアクセス（middleware＋RLS）。
【完了条件】非adminは画面に入れず、adminは保存できる。
**反映**: `/settings` ほか `/settings/reminders` `/settings/email-template`。`SettingsSubNav`, `ReminderSettingsClient`, `EmailTemplateSettingsClient`, `src/lib/reminder-templates.ts`。`src/lib/settings-data.ts`, `SettingsPageClient`（メンバー UUID 表示）。`proxy.ts` + ページ側 redirect。migration `20250621000001` + `20250622000001` + `20250622000002`。

### P8-3. レスポンシブ最終調整 ✅
全画面をモバイル(～380)/PC(md～)で確認。下部タブ⇔サイドナビ、テーブルの横スクロール等。
【完了条件】主要7画面が両幅で崩れない。
**反映**: `AppShell` に `min-w-0` / `overflow-x-hidden`。精算テーブルは既存 `overflow-x-auto` 維持。下部タブ⇔サイドナビは P3 実装のまま md 境界で切替。

### P8-4. 空状態・エラー・ローディングの整備 ✅
各一覧の空状態メッセージ＋初手導線、フォーム送信中のローディング、OGP失敗時の案内。
【完了条件】データ0件・通信失敗時に無言で固まらない。
**反映**: マイページ各セクションに空状態＋導線リンク。企画一覧に「企画を立てる」導線。店・認証・精算フォームの loading/error は既存実装を継承。OGP 失敗時の手動入力フォールバックは P4 実装のまま。

### P8-5. アクセシビリティとメタ ✅（Lighthouse 未計測）
ボタンのaria、画像alt、ページtitle/description、faviconとPWAアイコン（任意）。
【完了条件】Lighthouse Accessibility 90以上目安。
**反映**: `layout.tsx` に title テンプレート + description。`public/icon.svg` favicon。`/`, `/me`, `/settings`, `/shops` に `metadata`。`NotificationBell`・ナビに `aria-label`。Lighthouse スコアの正式計測は未実施。

### P8-6. ⚑ Vercelデプロイ（Hobby・非商用） — 未
Vercel連携、環境変数設定、本番URL確認。⚑ Hobbyは非商用前提（収益化しない方針と一致）。
【完了条件】本番URLで全フローが動く。
**残**: 人間作業。環境変数（`NEXT_PUBLIC_SUPABASE_*`）+ Auth Redirect URLs + `APP_URL`（send-reminders）の本番化。

### P8-7. E2E全通し＋受け入れ確認 ⚠️（主要フローのみ）
要件定義書§4.1の各AC（機能1〜9）をPlaywrightで一通り確認。
【完了条件】全ACに対応するアサーションが緑。
**反映**: `e2e/me.spec.ts` 新規（マイページ・settings 拒否）。`e2e/auth.spec.ts` をマイページログアウト経由に更新。既存 `auth` / `shops` / `events` / `settlement` と合わせ **5 spec・主要フローは緑**（2026-06-21 確認）。§4.1 全 AC の網羅的 Playwright 化は未完了。開催日時は date + select 操作に更新済。

---

## フェーズ9: UIブラッシュアップ — **完成（2026-06-21）**

機能ブラッシュアップとしてナビ・設定・リマインド・開催日時入力を拡張。詳細は `implementation_spec.md` §11 参照。

### P9-1. ナビアイコンと設定タブ ✅
企画/店/マイページ/設定に SVG アイコン。設定は admin のみ表示。企画作成 FAB をナビから削除。
【完了条件】非 admin に設定タブが出ない。アイコンが下部タブ・サイドナビ両方に表示される。
**反映**: `NavIcon.tsx`, `constants.ts` NAV_ITEMS, `AppNav.tsx`。

### P9-2. 企画作成導線の移動 ✅
企画一覧 `/events` 内に「＋ 企画を作成」ボタン。
【完了条件】企画一覧から `/events/new` に遷移できる。
**反映**: `EventsPageClient.tsx`。

### P9-3. 設定画面拡張（リマインド・メール） ✅
3タブ構成。リマインドデフォルト時刻、メール件名/本文テンプレ編集。
【完了条件】admin が保存でき、非 admin はアクセス不可。
**反映**: `/settings/reminders`, `/settings/email-template`, `reminder-templates.ts`, migrations `20250622000001`。

### P9-4. リマインド4日前化 ✅
先行リマインドを前日→4日前に変更。メール文言・件名プレフィックス更新。
【完了条件】新規公開企画の reminders が4日前+当日の2行になる。
**反映**: migration `20250622000002`, `ADVANCE_REMINDER_DAYS = 4`, `send-reminders` テンプレート更新・デプロイ。

### P9-5. send-reminders 拡張 ✅
DB テンプレート参照、`test_email` モード、Resend サンドボックス時のスキップ処理。
【完了条件】テスト送信が管理者メール宛に届く。E2E ユーザー宛 403 はスキップされ管理者に失敗通知。
**反映**: `supabase/functions/send-reminders/index.ts`, `email-template.ts`。

### P9-6. 開催日時10分単位 ✅
開催日（date）+ 開催時刻（select 10分刻み）。企画作成・編集共通。
【完了条件】03分等が選べず、00/10/20/30/40/50 のみ。
**反映**: `EventHeldAtFields.tsx`, `event-dates.ts`, `event-dates.test.ts`。

### P9-7. 設定メンバー UUID 表示 ✅
メンバー一覧に profiles.id を表示（コピー用 title 属性付き）。
【完了条件】admin が各メンバーの UUID を確認できる。
**反映**: `SettingsPageClient.tsx`。

### P9-8. ユニットテスト追加 ✅
リマインドテンプレ・開催日時ユーティリティのテスト。
【完了条件】`npm run test:unit` が緑。
**反映**: `reminder-templates.test.ts`（7件）, `event-dates.test.ts`（3件）。

---

## フェーズ10: 機能ブラッシュアップ — **完成（2026-06-21）**

ホーム廃止・実績リスト・店メモ・企画 UI・参加取消修正。詳細は `implementation_spec.md` §12 参照。

### P10-1. ホーム・ルーティング分離 ✅
当初: ログイン後 `/` をハブ（企画一覧・店リスト導線）、企画一覧を `/events` に移動。**2026-06-22 更新**: ハブ画面を廃止し `/` は `/events` へリダイレクト。ナビ「企画」→ `/events`。
【完了条件】ログイン後・`/` アクセス時に企画一覧が表示される。下部/サイドナビからも企画一覧に遷移できる。
**反映**: `page.tsx`（`redirect("/events")`）, `events/page.tsx`, `constants.ts`。

### P10-2. 実績リスト ✅
ナビに「実績」タブ。`/records` に精算確定済み企画を開催日降順表示。
【完了条件】`settlements.status = finalized` の企画のみ一覧に出る。
**反映**: `records/page.tsx`, `getCompletedEventsList()`, migration `20250623000002`.

### P10-3. 店メモ（行きたい理由） ✅
`stocks.memo` を店追加モーダル・S08 で編集。S07 は表示のみ。
【完了条件】追加時・詳細でメモ保存。一覧に編集ボタンなし。
**反映**: `ShopAddModal`, `ShopDetailClient`, `getUserStockForShop`. **P12-2**: 店追加モーダルへの `memo` 入力を追加。

### P10-4. 企画一覧残数バッジ ✅
一次会の残席を「残りN人」落款バッジで表示（3人以上=白、2人以下=朱）。
【完了条件】募集中カードに残数が見える。
**反映**: `EventCard.tsx`, `getFirstPartRemaining()`.

### P10-5. 企画詳細 UI 強調 ✅
参加表明済みバナー、参加パート強調、会費見込み、役割チップ。
【完了条件】参加済みメンバー視点でワイヤーに近い強調表示。
**反映**: `EventDetailClient.tsx`, `StatusBadge.tsx`.

### P10-6. 参加取消ロジック修正 ✅
定員到達時の企画自動締切を廃止。`open` 中は本人取消可。
【完了条件】参加後に「取り消す」が機能する。
**反映**: `EventDetailClient`（`maybeCloseEvent` 削除）、`canCancelPart()`, `events.spec.ts`.

### P10-7. 精算確定と実績の連動 ✅
精算確定で `events.status → held`、確定取消で `held → closed`。
【完了条件】実績リストは finalized のみ。確定で実績に載る。
**反映**: `SettlementPageClient.tsx`, `events-data.ts`.

---

## フェーズ11: 機能ブラッシュアップ #3 — **完成（2026-06-21）**

企画詳細の参加者管理・立替者指定・締切戻し・S05 UI 整理。詳細は `implementation_spec.md` §13 参照。

### P11-1. 参加者の手動追加・削除 ✅
企画者・admin が S05 でパート単位に追加・削除。定員超過は不可。
【完了条件】募集中・締切済みで追加/外すが動作し、満員パートには追加できない。
**反映**: `EventDetailClient.tsx`, `canManageParticipations()`, `getMemberProfiles()`.

### P11-2. 立替者の指定 ✅
一次会参加者から立替者を選択。`set_event_finalizer` RPC。
【完了条件】指定後、立替者が精算画面にアクセスできる。
**反映**: migration `20250624000001`, `EventDetailClient`, `settlement-data.ts`（`canAccessSettlementPage`）.

### P11-3. 締切の取り消し ✅
`closed` 企画を「募集中に戻す」で `open` に復帰。
【完了条件】企画者・admin のみ。確認ダイアログ後に status 更新。
**反映**: `canReopenEvent()`, `handleReopenEvent`.

### P11-4. 企画詳細 UI 整理 ✅
参加パート／参加者／立替者のブロックを視覚分離。会費見込みをコンパクト化。
【完了条件】各セクションの役割が一目で判別できる。
**反映**: `PartActionRow`, `ParticipantRow`, `SectionHeader`, `SectionTitle` 12px化.

### P11-5. 一覧・削除 UI ✅
残り0人は「満員」。削除系ボタンは `danger` バリアント。
【完了条件】一覧バッジと削除ボタンの視認性。
**反映**: `EventCard.tsx`, `Button.tsx`（`danger`）.

---

## フェーズ12: 機能ブラッシュアップ #4 — **完成（2026-06-21）**

店リスト UI・行きたいメモ・アイコン・マイページ UI。詳細は `implementation_spec.md` §14 参照。

### P12-1. 店リスト追加ボタン UI 統一 ✅
S07 の「＋ 店を追加」を企画一覧 S04 と同じ **上部 primary 全幅** に変更。
【完了条件】`/shops` 上部に primary ボタン、タブ・一覧はその下。
**反映**: `ShopsPageClient.tsx`.

### P12-2. 行きたいメモ完成 ✅
`stocks.memo` を店追加モーダル・S08 で入力/編集。S07・マイページは表示のみ。
【完了条件】追加時・詳細でメモ保存。一覧に編集ボタンなし。
**反映**: `ShopAddModal`, `ShopDetailClient`, `getUserStockForShop`, `ShopStockCard`, `e2e/shops.spec.ts`.

### P12-3. プロフィールアイコン ✅
`profiles.avatar_path` + Storage `avatars`。マイページで変更・削除。未設定は頭文字。
【完了条件】アップロード後ヘッダー・参加者一覧等に画像表示。削除で頭文字に戻る。
**反映**: migration `20250625000001`, `UserAvatar.tsx`, `MePageClient.tsx`, `storage.ts`, `app-data.ts`, 各画面のアバター表示。

### P12-4. マイページ UI 修正 ✅
アイコンとニックネームの重なり防止。編集時は入力欄を全幅配置。
【完了条件】アイコン設定後もニックネーム表示・編集にゴースト文字が出ない。
**反映**: `MePageClient.tsx`（grid レイアウト）, `UserAvatar.tsx`（overflow クリップ）.

---

## 実行順サマリ
P0（環境）→ P1（DB/RLS）→ P2（認証）→ P3（シェル）→ P4（店）→ P5（企画）→ P6（精算）→ P7（運用）→ P8（仕上げ）→ P9（UIブラッシュアップ）→ P10（機能ブラッシュアップ）→ P11（機能ブラッシュアップ #3）→ **P12（機能ブラッシュアップ #4）**

各フェーズ末のE2Eを必ず通してから次へ。⚑ の付いたタスクだけは人間が値・方針を確定させること。

**本番前の残タスク（2026-06-21 時点）**: P8-6 Vercel デプロイ、P8-7 全 AC E2E 網羅、Resend ドメイン認証、`APP_URL` 本番化、migration リモート適用確認（**`20250625000001`** 含む）。精算確定済みで `events.status` が `open` のままのデータがあれば `20250623000002` の UPDATE を手動適用。
