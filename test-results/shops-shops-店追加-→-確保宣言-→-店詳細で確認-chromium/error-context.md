# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shops.spec.ts >> shops >> 店追加 → 確保宣言 → 店詳細で確認
- Location: e2e/shops.spec.ts:6:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('紹介制')
Expected: visible
Error: strict mode violation: getByText('紹介制') resolved to 2 elements:
    1) <span class="inline-flex items-center justify-center rounded-[var(--radius-seal)] border-[1.5px] border-shu bg-shu/10 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-[0.14em] text-[#E8694F] ">紹介制</span> aka getByRole('link', { name: 'テスト店-1782226442796' })
    2) <p class="mt-1 text-xs text-txt-2">紹介制だけど一度行ってみたい</p> aka getByRole('link', { name: 'テスト店-1782226442796' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('紹介制')

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
        - link "shopper-1782226442796" [ref=e27] [cursor=pointer]:
          - /url: /me
          - generic [ref=e29]: s
      - main [ref=e30]:
        - generic [ref=e31]:
          - heading "店リスト" [level=2] [ref=e33]
          - generic [ref=e35]:
            - button "＋ 店を追加（URL貼付）" [ref=e36]
            - generic [ref=e37]:
              - button "行きたい" [ref=e38]
              - button "確保できる" [ref=e39]
            - link "テスト店-1782226442796 紹介制 紹介制だけど一度行ってみたい" [ref=e41] [cursor=pointer]:
              - /url: /shops/0742aa81-4f93-4fdb-98e2-f53f557d8dd6
              - generic [ref=e42]:
                - generic [ref=e43]: 店
                - generic [ref=e44]:
                  - generic [ref=e45]:
                    - heading "テスト店-1782226442796" [level=3] [ref=e46]
                    - generic [ref=e47]: 紹介制
                  - paragraph [ref=e48]: 紹介制だけど一度行ってみたい
  - alert [ref=e49]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const TEST_PASSWORD = "TestPass123!";
  4  | 
  5  | test.describe("shops", () => {
  6  |   test("店追加 → 確保宣言 → 店詳細で確認", async ({ page }) => {
  7  |     const email = `shops-e2e-${Date.now()}@foodie-test.local`;
  8  |     const nickname = `shopper-${Date.now()}`;
  9  |     const shopName = `テスト店-${Date.now()}`;
  10 | 
  11 |     await page.goto("/signup");
  12 |     await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
  13 |     await page.getByLabel(/メールアドレス/).fill(email);
  14 |     await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
  15 |     await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
  16 |     await page.getByRole("button", { name: "登録する" }).click();
  17 |     await expect(page).toHaveURL("/events");
  18 | 
  19 |     await page.goto("/shops");
  20 |     await expect(page.getByRole("heading", { name: "店リスト" })).toBeVisible();
  21 | 
  22 |     await page.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
  23 |     await page.getByRole("button", { name: "URLなしで手動入力" }).click();
  24 |     await page.getByLabel("店名").fill(shopName);
  25 |     await page.getByLabel("行きたい理由（任意）").fill("紹介制だけど一度行ってみたい");
  26 |     await page.getByLabel("予約難易度").selectOption("referral_only");
  27 |     await page.getByRole("button", { name: "保存" }).click();
  28 | 
  29 |     await expect(page.getByText(shopName)).toBeVisible();
> 30 |     await expect(page.getByText("紹介制")).toBeVisible();
     |                                         ^ Error: expect(locator).toBeVisible() failed
  31 |     await expect(page.getByText("紹介制だけど一度行ってみたい")).toBeVisible();
  32 | 
  33 |     await page.getByRole("link", { name: shopName }).click();
  34 |     await expect(page).toHaveURL(/\/shops\/.+/);
  35 |     await expect(
  36 |       page.getByRole("heading", { name: shopName, level: 1 }),
  37 |     ).toBeVisible();
  38 |     await expect(page.getByLabel("行きたい理由（任意）")).toHaveValue(
  39 |       "紹介制だけど一度行ってみたい",
  40 |     );
  41 | 
  42 |     await page.getByRole("button", { name: "確保宣言する" }).click();
  43 |     await page.getByLabel("コネ種別").selectOption("regular");
  44 |     await page.getByLabel("補足条件（任意）").fill("平日なら・4名まで");
  45 |     await page.getByRole("button", { name: "保存" }).click();
  46 | 
  47 |     await expect(page.getByText(nickname)).toBeVisible();
  48 |     await expect(page.getByText("常連")).toBeVisible();
  49 |     await expect(page.getByText("平日なら・4名まで")).toBeVisible();
  50 | 
  51 |     await page.getByRole("link", { name: "‹ 店リストへ" }).click();
  52 |     await page.getByRole("button", { name: "確保できる" }).click();
  53 |     await expect(page.getByText(shopName)).toBeVisible();
  54 |     await expect(page.getByText("常連")).toBeVisible();
  55 |   });
  56 | });
  57 | 
```