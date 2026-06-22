import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("auth", () => {
  test("登録 → ログアウト → ログイン", async ({ page }) => {
    const email = `e2e-${Date.now()}@foodie-test.local`;
    const nickname = `e2e-user-${Date.now()}`;

    await page.goto("/signup");
    await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page).toHaveURL("/events");
    await expect(page.getByRole("heading", { name: "企画一覧" })).toBeVisible();

    await page.goto("/me");
    await page.getByRole("button", { name: "ログアウト" }).click();
    await expect(page).toHaveURL("/login");

    await page.goto("/login");
    await expect(page).toHaveURL("/login");

    await page.getByLabel("メールアドレス").fill(email);
    await page.getByLabel("パスワード").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL("/events");
    await expect(page.getByRole("heading", { name: "企画一覧" })).toBeVisible();
  });

  test("誤パスワードでエラー表示", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("メールアドレス").fill("nobody@foodie-test.local");
    await page.getByLabel("パスワード").fill("WrongPass123!");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません。"),
    ).toBeVisible();
  });
});
