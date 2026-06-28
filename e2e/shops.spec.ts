import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("shops", () => {
  test("店追加 → 確保宣言 → 店詳細で確認", async ({ page }) => {
    const email = `shops-e2e-${Date.now()}@foodie-test.local`;
    const nickname = `shopper-${Date.now()}`;
    const shopName = `テスト店-${Date.now()}`;

    await page.goto("/signup");
    await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
    await page.getByLabel(/メールアドレス/).fill(email);
    await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL("/events");

    await page.goto("/shops");
    await expect(page.getByRole("heading", { name: "店リスト" })).toBeVisible();

    await page.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
    await page.getByRole("button", { name: "URLなしで手動入力" }).click();
    await page.getByLabel("店名").fill(shopName);
    await page.getByLabel("行きたい理由（任意）").fill("紹介制だけど一度行ってみたい");
    await page.getByLabel("予約難易度").selectOption("referral_only");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText(shopName)).toBeVisible();
    await expect(page.getByText("紹介制")).toBeVisible();
    await expect(page.getByText("紹介制だけど一度行ってみたい")).toBeVisible();

    await page.getByRole("link", { name: shopName }).click();
    await expect(page).toHaveURL(/\/shops\/.+/);
    await expect(
      page.getByRole("heading", { name: shopName, level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("行きたい理由（任意）")).toHaveValue(
      "紹介制だけど一度行ってみたい",
    );

    await page.getByRole("button", { name: "確保宣言する" }).click();
    await page.getByLabel("コネ種別").selectOption("regular");
    await page.getByLabel("補足条件（任意）").fill("平日なら・4名まで");
    await page.getByRole("button", { name: "保存" }).click();

    await expect(page.getByText(nickname)).toBeVisible();
    await expect(page.getByText("常連")).toBeVisible();
    await expect(page.getByText("平日なら・4名まで")).toBeVisible();

    await page.getByRole("link", { name: "‹ 店リストへ" }).click();
    await page.getByRole("button", { name: "確保できる" }).click();
    await expect(page.getByText(shopName)).toBeVisible();
    await expect(page.getByText("常連")).toBeVisible();

    await page.getByRole("button", { name: "行きたい" }).click();
    await page.getByRole("button", { name: "編集" }).click();
    await page.getByLabel("エリア（任意）").fill("銀座・鮨");
    await page.getByLabel("予約難易度").selectOption("months_wait");
    await page.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("銀座・鮨")).toBeVisible();
    await expect(page.getByText("数ヶ月待ち")).toBeVisible();

    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "削除" }).click();
    await expect(page.getByText(shopName)).not.toBeVisible();
  });
});
