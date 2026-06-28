# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: me-unpaid.spec.ts >> 一般メンバーのマイページに未払いが表示される
- Location: e2e/me-unpaid.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('精算企画-1781545253051')
Expected: visible
Error: strict mode violation: getByText('精算企画-1781545253051') resolved to 2 elements:
    1) <p class="font-display text-xs font-semibold text-heading">精算企画-1781545253051</p> aka getByRole('link', { name: '精算企画-1781545253051 12/31（火）18' })
    2) <p class="font-display text-xs font-semibold text-heading">精算企画-1781545253051</p> aka getByRole('link', { name: '精算企画-1781545253051 ¥9,000' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('精算企画-1781545253051')

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
        - link "mem-b-1781545253051" [ref=e27] [cursor=pointer]:
          - /url: /me
          - generic [ref=e29]: m
      - main [ref=e30]:
        - generic [ref=e31]:
          - generic [ref=e32]:
            - generic [ref=e33]:
              - generic [ref=e35]: m
              - generic [ref=e36]:
                - paragraph [ref=e37]: mem-b-1781545253051
                - button "ニックネームを編集" [ref=e38]
            - generic [ref=e39]:
              - button "アイコンを変更" [ref=e40]
              - generic [ref=e41]: 15MB以下
          - heading "企画中" [level=2] [ref=e43]
          - paragraph [ref=e45]:
            - text: 企画中のイベントはありません。
            - link "企画を立てる" [ref=e46] [cursor=pointer]:
              - /url: /events/new
          - heading "参加予定" [level=2] [ref=e48]
          - link "精算企画-1781545253051 12/31（火）18:00・一次会・二次会" [ref=e50] [cursor=pointer]:
            - /url: /events/93e607f5-35f1-4163-b13a-f9fa7a2433fa
            - generic [ref=e51]:
              - generic [ref=e52]:
                - paragraph [ref=e53]: 精算企画-1781545253051
                - paragraph [ref=e54]: 12/31（火）18:00・一次会・二次会
              - generic [ref=e55]: ›
          - heading "未払い" [level=2] [ref=e57]
          - link "精算企画-1781545253051 ¥9,000・振込先は連絡参照 未払い" [ref=e59] [cursor=pointer]:
            - /url: /events/93e607f5-35f1-4163-b13a-f9fa7a2433fa/settlement
            - generic [ref=e60]:
              - generic [ref=e61]:
                - paragraph [ref=e62]: 精算企画-1781545253051
                - paragraph [ref=e63]: ¥9,000・振込先は連絡参照
              - generic [ref=e64]: 未払い
          - heading "ストック・確保宣言" [level=2] [ref=e66]
          - paragraph [ref=e68]:
            - text: ストックや確保宣言はまだありません。
            - link "店一覧へ" [ref=e69] [cursor=pointer]:
              - /url: /shops
          - button "ログアウト" [ref=e70]
  - button "Open Next.js Dev Tools" [ref=e76] [cursor=pointer]:
    - img [ref=e77]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const TEST_PASSWORD = "TestPass123!";
  4  | 
  5  | test("一般メンバーのマイページに未払いが表示される", async ({ page }) => {
  6  |   const email = "stl-b-1781545253051@foodie-test.local";
  7  | 
  8  |   await page.goto("/login");
  9  |   await page.getByLabel(/メールアドレス/).fill(email);
  10 |   await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
  11 |   await page.getByRole("button", { name: "ログイン" }).click();
  12 |   await expect(page).toHaveURL("/events", { timeout: 15000 });
  13 | 
  14 |   await page.goto("/me");
  15 |   await expect(page.getByRole("heading", { name: "未払い" })).toBeVisible();
> 16 |   await expect(page.getByText("精算企画-1781545253051")).toBeVisible();
     |                                                      ^ Error: expect(locator).toBeVisible() failed
  17 |   await expect(page.getByText("¥9,000")).toBeVisible();
  18 | });
  19 | 
```