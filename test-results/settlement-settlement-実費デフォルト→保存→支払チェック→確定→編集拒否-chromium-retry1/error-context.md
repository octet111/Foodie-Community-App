# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settlement.spec.ts >> settlement >> 実費デフォルト→保存→支払チェック→確定→編集拒否
- Location: e2e/settlement.spec.ts:8:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: '取消' }).first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: '取消' }).first()

```

```yaml
- navigation "サイドナビゲーション":
  - link "企画":
    - /url: /events
  - link "店":
    - /url: /shops
  - link "実績":
    - /url: /records
  - link "マイページ":
    - /url: /me
- banner:
  - text: 美
  - heading "美食倶楽部" [level=1]
  - button "通知"
  - link "mem-b-1782226405884":
    - /url: /me
    - text: m
- main:
  - link "‹ 企画一覧へ":
    - /url: /events
  - heading "精算企画-1782226405884" [level=1]
  - text: 募集中
  - paragraph:
    - text: 12/31（火）18:00（
    - link "精算店-1782226405884":
      - /url: /shops/573e29d7-51c6-4f60-8aa9-f15c8b2dbd8d
    - text: ↗）
  - text: 企画 org-stl-1782226405884 立替 未設定
  - paragraph: 参加表明済み
  - paragraph: 一次会に参加・締切前まで変更できます
  - link "精算へ":
    - /url: /events/e50807b0-926c-49d2-aff5-f48962fc98b4/settlement
    - button "精算へ"
  - heading "参加パート" [level=2]
  - paragraph: 自分が参加するパートを選びます
  - paragraph: 一次会
  - text: 参加中
  - paragraph: ¥10,000・1/10名
  - button "取り消す"
  - paragraph: 二次会
  - paragraph: ¥4,000・0/10名
  - button "参加する"
  - heading "あなたの会費（見込み）" [level=2]
  - paragraph: ¥10,000
  - paragraph: 開催後に企画者が精算し、最終金額が確定します。
  - heading "参加者" [level=2]
  - paragraph: 各パートの参加メンバー一覧
  - paragraph: 一次会
  - text: m mem-b-1782226405884
  - heading "コメント" [level=2]
  - paragraph: まだコメントがありません
  - textbox "コメントを書く…"
  - button "送信" [disabled]
- alert
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | 
  3   | const TEST_PASSWORD = "TestPass123!";
  4   | 
  5   | test.describe("settlement", () => {
  6   |   test.setTimeout(120_000);
  7   | 
  8   |   test("実費デフォルト→保存→支払チェック→確定→編集拒否", async ({
  9   |     browser,
  10  |   }) => {
  11  |     const ts = Date.now();
  12  |     const shopName = `精算店-${ts}`;
  13  |     const eventTitle = `精算企画-${ts}`;
  14  | 
  15  |     const orgEmail = `stl-org-${ts}@foodie-test.local`;
  16  |     const orgNick = `org-stl-${ts}`;
  17  |     const memBEmail = `stl-b-${ts}@foodie-test.local`;
  18  |     const memBNick = `mem-b-${ts}`;
  19  |     const memCEmail = `stl-c-${ts}@foodie-test.local`;
  20  |     const memCNick = `mem-c-${ts}`;
  21  | 
  22  |     const orgCtx = await browser.newContext();
  23  |     const bCtx = await browser.newContext();
  24  |     const cCtx = await browser.newContext();
  25  |     const orgPage = await orgCtx.newPage();
  26  |     const bPage = await bCtx.newPage();
  27  |     const cPage = await cCtx.newPage();
  28  | 
  29  |     async function signup(
  30  |       page: import("@playwright/test").Page,
  31  |       email: string,
  32  |       nick: string,
  33  |     ) {
  34  |       await page.goto("/signup");
  35  |       await page.getByLabel("ニックネーム（公開表示名）").fill(nick);
  36  |       await page.getByLabel(/メールアドレス/).fill(email);
  37  |       await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
  38  |       await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
  39  |       await page.getByRole("button", { name: "登録する" }).click();
  40  |       await expect(page).toHaveURL("/events");
  41  |     }
  42  | 
  43  |     await signup(orgPage, orgEmail, orgNick);
  44  |     await signup(bPage, memBEmail, memBNick);
  45  |     await signup(cPage, memCEmail, memCNick);
  46  | 
  47  |     await orgPage.goto("/shops");
  48  |     await orgPage.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
  49  |     await orgPage.getByRole("button", { name: "URLなしで手動入力" }).click();
  50  |     await orgPage.getByLabel("店名").fill(shopName);
  51  |     await orgPage.getByRole("button", { name: "保存" }).click();
  52  |     await expect(orgPage.getByText(shopName)).toBeVisible();
  53  | 
  54  |     await orgPage.goto("/shops");
  55  |     await orgPage.getByRole("link", { name: shopName }).click();
  56  |     await orgPage.getByRole("button", { name: "この店で企画を立てる" }).click();
  57  |     await expect(orgPage).toHaveURL(/\/events\/new\?shopId=/);
  58  |     await expect(orgPage.getByText("選択済 ✓")).toBeVisible();
  59  |     await orgPage.getByPlaceholder("鮨かね田を貸切る会").fill(eventTitle);
  60  |     await orgPage.getByLabel("開催日").fill("2030-12-31");
  61  |     await orgPage.getByLabel(/開催時刻/).selectOption("18:00");
  62  |     await orgPage.getByLabel("一次会の定員").fill("10");
  63  |     await orgPage.getByLabel("想定費用").first().fill("10000");
  64  |     await orgPage.getByRole("button", { name: "＋ パートを追加" }).click();
  65  |     await orgPage.getByLabel("二次会の定員").fill("10");
  66  |     await orgPage.getByLabel("想定費用").nth(1).fill("4000");
  67  |     await orgPage.getByRole("button", { name: "この内容で公開する" }).click();
  68  |     await expect(orgPage).toHaveURL(/\/events\/(?!new)[^/]+$/, { timeout: 15_000 });
  69  | 
  70  |     const eventUrl = orgPage.url();
  71  | 
  72  |     await bPage.goto(eventUrl);
  73  |     await bPage.getByRole("button", { name: "参加する" }).first().click();
> 74  |     await expect(bPage.getByRole("button", { name: "取消" }).first()).toBeVisible();
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  75  |     await bPage.getByRole("button", { name: "参加する" }).click();
  76  |     await expect(bPage.getByRole("button", { name: "取消" })).toHaveCount(2);
  77  | 
  78  |     await cPage.goto(eventUrl);
  79  |     await cPage.getByRole("button", { name: "参加する" }).first().click();
  80  |     await expect(cPage.getByRole("button", { name: "取消" })).toBeVisible();
  81  | 
  82  |     await orgPage.goto(eventUrl);
  83  |     await orgPage.getByRole("link", { name: "精算へ" }).click();
  84  |     await expect(orgPage).toHaveURL(/\/settlement$/);
  85  |     await expect(orgPage.getByText("集金中")).toBeVisible();
  86  | 
  87  |     // 実費デフォルト = 想定費用 × 参加人数
  88  |     await expect(orgPage.getByLabel("一次会 実費")).toHaveValue("20000");
  89  |     await expect(orgPage.getByLabel("二次会 実費")).toHaveValue("4000");
  90  | 
  91  |     await expect(orgPage.getByRole("row", { name: new RegExp(memBNick) })).toBeVisible();
  92  |     await expect(orgPage.getByRole("row", { name: new RegExp(memCNick) })).toBeVisible();
  93  | 
  94  |     const bRow = orgPage.getByRole("row", { name: new RegExp(memBNick) });
  95  |     const cRow = orgPage.getByRole("row", { name: new RegExp(memCNick) });
  96  | 
  97  |     const bAmountInput = bRow.locator("td").nth(2).locator("input[type=number]");
  98  |     const cAmountInput = cRow.locator("td").nth(2).locator("input[type=number]");
  99  | 
  100 |     const bAmount = Number((await bAmountInput.inputValue()) || "0");
  101 |     const cAmount = Number((await cAmountInput.inputValue()) || "0");
  102 | 
  103 |     // 一次会 ceil(20000/2)=10000 + 二次会 ceil(4000/1)=4000 → B=14000
  104 |     // 一次会のみ → C=10000
  105 |     expect(bAmount).toBeGreaterThan(cAmount);
  106 |     expect(bAmount).toBe(14000);
  107 |     expect(cAmount).toBe(10000);
  108 | 
  109 |     // 集金合計プレビュー
  110 |     await expect(orgPage.getByText("¥24,000")).toBeVisible();
  111 | 
  112 |     // 保存して DB 反映
  113 |     await orgPage.getByRole("button", { name: "変更を保存" }).click();
  114 |     await expect(orgPage.getByRole("button", { name: "変更を保存" })).toBeDisabled();
  115 | 
  116 |     // 支払チェック（保存後に有効化）
  117 |     const cPaidCheckbox = cRow.locator("td").nth(3).getByRole("checkbox");
  118 |     await expect(cPaidCheckbox).toBeEnabled({ timeout: 15_000 });
  119 |     await cPaidCheckbox.click();
  120 |     await expect(cPaidCheckbox).toBeChecked();
  121 | 
  122 |     orgPage.once("dialog", (d) => d.accept());
  123 |     await orgPage.getByRole("button", { name: "精算を確定する" }).click();
  124 |     await expect(orgPage.getByText("確定済")).toBeVisible();
  125 | 
  126 |     await expect(bAmountInput).toHaveCount(0);
  127 | 
  128 |     await orgCtx.close();
  129 |     await bCtx.close();
  130 |     await cCtx.close();
  131 |   });
  132 | });
  133 | 
```