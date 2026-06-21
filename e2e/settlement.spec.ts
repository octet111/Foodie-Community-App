import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("settlement", () => {
  test.setTimeout(120_000);

  test("実費デフォルト→保存→支払チェック→確定→編集拒否", async ({
    browser,
  }) => {
    const ts = Date.now();
    const shopName = `精算店-${ts}`;
    const eventTitle = `精算企画-${ts}`;

    const orgEmail = `stl-org-${ts}@foodie-test.local`;
    const orgNick = `org-stl-${ts}`;
    const memBEmail = `stl-b-${ts}@foodie-test.local`;
    const memBNick = `mem-b-${ts}`;
    const memCEmail = `stl-c-${ts}@foodie-test.local`;
    const memCNick = `mem-c-${ts}`;

    const orgCtx = await browser.newContext();
    const bCtx = await browser.newContext();
    const cCtx = await browser.newContext();
    const orgPage = await orgCtx.newPage();
    const bPage = await bCtx.newPage();
    const cPage = await cCtx.newPage();

    async function signup(
      page: import("@playwright/test").Page,
      email: string,
      nick: string,
    ) {
      await page.goto("/signup");
      await page.getByLabel("ニックネーム（公開表示名）").fill(nick);
      await page.getByLabel(/メールアドレス/).fill(email);
      await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
      await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
      await page.getByRole("button", { name: "登録する" }).click();
      await expect(page).toHaveURL("/");
    }

    await signup(orgPage, orgEmail, orgNick);
    await signup(bPage, memBEmail, memBNick);
    await signup(cPage, memCEmail, memCNick);

    await orgPage.goto("/shops");
    await orgPage.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
    await orgPage.getByRole("button", { name: "URLなしで手動入力" }).click();
    await orgPage.getByLabel("店名").fill(shopName);
    await orgPage.getByRole("button", { name: "保存" }).click();
    await expect(orgPage.getByText(shopName)).toBeVisible();

    await orgPage.goto("/shops");
    await orgPage.getByRole("link", { name: shopName }).click();
    await orgPage.getByRole("button", { name: "この店で企画を立てる" }).click();
    await expect(orgPage).toHaveURL(/\/events\/new\?shopId=/);
    await expect(orgPage.getByText("選択済 ✓")).toBeVisible();
    await orgPage.getByPlaceholder("鮨かね田を貸切る会").fill(eventTitle);
    await orgPage.getByLabel("開催日").fill("2030-12-31");
    await orgPage.getByLabel(/開催時刻/).selectOption("18:00");
    await orgPage.getByLabel("一次会の定員").fill("10");
    await orgPage.getByLabel("想定費用").first().fill("10000");
    await orgPage.getByRole("button", { name: "＋ パートを追加" }).click();
    await orgPage.getByLabel("二次会の定員").fill("10");
    await orgPage.getByLabel("想定費用").nth(1).fill("4000");
    await orgPage.getByRole("button", { name: "この内容で公開する" }).click();
    await expect(orgPage).toHaveURL(/\/events\/(?!new)[^/]+$/, { timeout: 15_000 });

    const eventUrl = orgPage.url();

    await bPage.goto(eventUrl);
    await bPage.getByRole("button", { name: "参加する" }).first().click();
    await expect(bPage.getByRole("button", { name: "取消" }).first()).toBeVisible();
    await bPage.getByRole("button", { name: "参加する" }).click();
    await expect(bPage.getByRole("button", { name: "取消" })).toHaveCount(2);

    await cPage.goto(eventUrl);
    await cPage.getByRole("button", { name: "参加する" }).first().click();
    await expect(cPage.getByRole("button", { name: "取消" })).toBeVisible();

    await orgPage.goto(eventUrl);
    await orgPage.getByRole("link", { name: "精算へ" }).click();
    await expect(orgPage).toHaveURL(/\/settlement$/);
    await expect(orgPage.getByText("集金中")).toBeVisible();

    // 実費デフォルト = 想定費用 × 参加人数
    await expect(orgPage.getByLabel("一次会 実費")).toHaveValue("20000");
    await expect(orgPage.getByLabel("二次会 実費")).toHaveValue("4000");

    await expect(orgPage.getByRole("row", { name: new RegExp(memBNick) })).toBeVisible();
    await expect(orgPage.getByRole("row", { name: new RegExp(memCNick) })).toBeVisible();

    const bRow = orgPage.getByRole("row", { name: new RegExp(memBNick) });
    const cRow = orgPage.getByRole("row", { name: new RegExp(memCNick) });

    const bAmountInput = bRow.locator("td").nth(2).locator("input[type=number]");
    const cAmountInput = cRow.locator("td").nth(2).locator("input[type=number]");

    const bAmount = Number((await bAmountInput.inputValue()) || "0");
    const cAmount = Number((await cAmountInput.inputValue()) || "0");

    // 一次会 ceil(20000/2)=10000 + 二次会 ceil(4000/1)=4000 → B=14000
    // 一次会のみ → C=10000
    expect(bAmount).toBeGreaterThan(cAmount);
    expect(bAmount).toBe(14000);
    expect(cAmount).toBe(10000);

    // 集金合計プレビュー
    await expect(orgPage.getByText("¥24,000")).toBeVisible();

    // 保存して DB 反映
    await orgPage.getByRole("button", { name: "変更を保存" }).click();
    await expect(orgPage.getByRole("button", { name: "変更を保存" })).toBeDisabled();

    // 支払チェック（保存後に有効化）
    const cPaidCheckbox = cRow.locator("td").nth(3).getByRole("checkbox");
    await expect(cPaidCheckbox).toBeEnabled({ timeout: 15_000 });
    await cPaidCheckbox.click();
    await expect(cPaidCheckbox).toBeChecked();

    orgPage.once("dialog", (d) => d.accept());
    await orgPage.getByRole("button", { name: "精算を確定する" }).click();
    await expect(orgPage.getByText("確定済")).toBeVisible();

    await expect(bAmountInput).toHaveCount(0);

    await orgCtx.close();
    await bCtx.close();
    await cCtx.close();
  });
});
