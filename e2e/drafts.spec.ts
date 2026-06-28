import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("AI企画ドラフト", () => {
  test("フリー検索でコンセプト生成まで進める", async ({ page }) => {
    test.setTimeout(120_000);

    const email = `draft-e2e-${Date.now()}@foodie-test.local`;
    const nickname = `draft-user-${Date.now()}`;

    await page.goto("/signup");
    await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL("/events");

    await page.goto("/events/drafts/new");
    await expect(page.getByRole("heading", { name: "AI企画を生成" })).toBeVisible();

    // 新規ユーザーはストック/コネが空のためフリー検索を有効化
    await page.getByText("フリー検索").click();
    await page.getByRole("button", { name: "コンセプトを生成" }).click();

    // エラー or コンセプト選択画面
    const error = page.locator("p.text-red-400");
    const conceptHeading = page.getByRole("heading", { name: "コンセプトを選ぶ" });

    await expect(error.or(conceptHeading)).toBeVisible({ timeout: 90_000 });

    if (await error.isVisible()) {
      const msg = await error.textContent();
      throw new Error(`コンセプト生成失敗: ${msg}`);
    }

    await expect(conceptHeading).toBeVisible();
    await expect(page.getByRole("button", { name: "これにする" }).first()).toBeVisible();
  });
});
