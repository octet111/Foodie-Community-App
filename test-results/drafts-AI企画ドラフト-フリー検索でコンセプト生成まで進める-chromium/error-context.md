# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: drafts.spec.ts >> AI企画ドラフト >> フリー検索でコンセプト生成まで進める
- Location: e2e/drafts.spec.ts:6:7

# Error details

```
Error: コンセプト生成失敗: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 ] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation "サイドナビゲーション" [ref=e3]:
      - link "企画" [ref=e4] [cursor=pointer]:
        - /url: /events
        - img [ref=e5]
        - text: 企画
      - link "店" [ref=e9] [cursor=pointer]:
        - /url: /shops
        - img [ref=e10]
        - text: 店
      - link "実績" [ref=e13] [cursor=pointer]:
        - /url: /records
        - img [ref=e14]
        - text: 実績
      - link "マイページ" [ref=e17] [cursor=pointer]:
        - /url: /me
        - img [ref=e18]
        - text: マイページ
    - generic [ref=e21]:
      - banner [ref=e22]:
        - generic [ref=e23]: 美
        - heading "美食倶楽部" [level=1] [ref=e24]
        - button "通知" [ref=e26]
        - link "draft-user-1782659961365" [ref=e27] [cursor=pointer]:
          - /url: /me
          - generic [ref=e29]: d
      - main [ref=e30]:
        - generic [ref=e31]:
          - link "‹ ドラフト一覧へ" [ref=e32] [cursor=pointer]:
            - /url: /events/drafts
          - heading "AI企画を生成" [level=1] [ref=e33]
          - generic [ref=e34]:
            - heading "店リンク（URL）" [level=2] [ref=e36]
            - paragraph [ref=e38]: 食べログ・Google Maps 等の URL を貼ると、ページ情報を読み取って企画の起点にします。
            - generic [ref=e39]:
              - textbox "https://tabelog.com/…" [ref=e40]
              - button "取得" [disabled] [ref=e41]
            - heading "候補店の起点（任意）" [level=2] [ref=e43]
            - generic [ref=e45]:
              - generic [ref=e46] [cursor=pointer]:
                - checkbox "ストック" [checked] [ref=e47]
                - text: ストック
              - generic [ref=e48] [cursor=pointer]:
                - checkbox "確保宣言（コネ）" [checked] [ref=e49]
                - text: 確保宣言（コネ）
              - generic [ref=e50] [cursor=pointer]:
                - checkbox "フリー検索" [ref=e51]
                - text: フリー検索
            - generic [ref=e52]:
              - generic [ref=e53]: エリア（任意）
              - textbox "銀座、渋谷 など" [ref=e54]
            - generic [ref=e55]:
              - generic [ref=e56]: 想定人数（任意）
              - spinbutton [ref=e57]
            - generic [ref=e58]:
              - generic [ref=e59]: 追加条件（任意）
              - textbox "高難度店の制覇、少人数で深い体験 など" [ref=e60]
            - paragraph [ref=e61]: "[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 ] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."
            - button "コンセプトを生成" [ref=e62]
  - button "Open Next.js Dev Tools" [ref=e68] [cursor=pointer]:
    - img [ref=e69]
  - alert [ref=e72]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const TEST_PASSWORD = "TestPass123!";
  4  | 
  5  | test.describe("AI企画ドラフト", () => {
  6  |   test("フリー検索でコンセプト生成まで進める", async ({ page }) => {
  7  |     test.setTimeout(120_000);
  8  | 
  9  |     const email = `draft-e2e-${Date.now()}@foodie-test.local`;
  10 |     const nickname = `draft-user-${Date.now()}`;
  11 | 
  12 |     await page.goto("/signup");
  13 |     await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
  14 |     await page.getByLabel(/メールアドレス/).fill(email);
  15 |     await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
  16 |     await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
  17 |     await page.getByRole("button", { name: "登録する" }).click();
  18 |     await expect(page).toHaveURL("/events");
  19 | 
  20 |     await page.goto("/events/drafts/new");
  21 |     await expect(page.getByRole("heading", { name: "AI企画を生成" })).toBeVisible();
  22 | 
  23 |     // 新規ユーザーはストック/コネが空のためフリー検索を有効化
  24 |     await page.getByText("フリー検索").click();
  25 |     await page.getByRole("button", { name: "コンセプトを生成" }).click();
  26 | 
  27 |     // エラー or コンセプト選択画面
  28 |     const error = page.locator("p.text-red-400");
  29 |     const conceptHeading = page.getByRole("heading", { name: "コンセプトを選ぶ" });
  30 | 
  31 |     await expect(error.or(conceptHeading)).toBeVisible({ timeout: 90_000 });
  32 | 
  33 |     if (await error.isVisible()) {
  34 |       const msg = await error.textContent();
> 35 |       throw new Error(`コンセプト生成失敗: ${msg}`);
     |             ^ Error: コンセプト生成失敗: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent: [503 ] This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.
  36 |     }
  37 | 
  38 |     await expect(conceptHeading).toBeVisible();
  39 |     await expect(page.getByRole("button", { name: "これにする" }).first()).toBeVisible();
  40 |   });
  41 | });
  42 | 
```