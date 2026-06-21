import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("me", () => {
  test("マイページ表示・ニックネーム編集・ログアウト", async ({ page }) => {
    const email = `me-e2e-${Date.now()}@foodie-test.local`;
    const nickname = `me-user-${Date.now()}`;
    const newNickname = `renamed-${Date.now()}`;

    await page.goto("/signup");
    await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/me");
    await expect(page.getByText(nickname).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "企画中" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "参加予定" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "未払い" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ストック・確保宣言" })).toBeVisible();

    await page.getByRole("button", { name: "ニックネームを編集" }).click();
    await page.getByLabel("ニックネーム").fill(newNickname);
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText(newNickname).first()).toBeVisible();

    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("一般メンバーは設定画面に入れない", async ({ page }) => {
    const email = `mem-settings-${Date.now()}@foodie-test.local`;
    const nickname = `mem-${Date.now()}`;

    await page.goto("/signup");
    await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL("/");

    await page.goto("/settings");
    await expect(page).toHaveURL("/me");
    await expect(page.getByText("コミュニティ設定")).not.toBeVisible();
  });
});
