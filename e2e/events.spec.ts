import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "TestPass123!";

test.describe("events", () => {
  test.setTimeout(90_000);

  test("企画作成 → 別ユーザーで参加 → 定員締切 → コメント", async ({
    browser,
  }) => {
    const shopName = `イベント店-${Date.now()}`;
    const eventTitle = `テスト企画-${Date.now()}`;
    const commentText = "楽しみです！";

    const organizerEmail = `org-e2e-${Date.now()}@foodie-test.local`;
    const organizerNick = `org-${Date.now()}`;
    const memberEmail = `mem-e2e-${Date.now()}@foodie-test.local`;
    const memberNick = `mem-${Date.now()}`;

    const organizerContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const organizerPage = await organizerContext.newPage();
    const memberPage = await memberContext.newPage();

    await organizerPage.goto("/signup");
    await organizerPage.getByLabel("ニックネーム（公開表示名）").fill(organizerNick);
    await organizerPage.getByLabel(/メールアドレス/).fill(organizerEmail);
    await organizerPage.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await organizerPage.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await organizerPage.getByRole("button", { name: "登録する" }).click();
    await expect(organizerPage).toHaveURL("/");

    await organizerPage.goto("/shops");
    await organizerPage.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
    await organizerPage.getByRole("button", { name: "URLなしで手動入力" }).click();
    await organizerPage.getByLabel("店名").fill(shopName);
    await organizerPage.getByRole("button", { name: "保存" }).click();
    await expect(organizerPage.getByText(shopName)).toBeVisible();

    await organizerPage.goto("/events/new");
    await organizerPage.getByRole("button", { name: "ストックから選ぶ" }).click();
    await organizerPage.getByRole("button", { name: shopName }).click();
    await organizerPage.getByPlaceholder("鮨かね田を貸切る会").fill(eventTitle);
    await organizerPage.getByLabel("開催日時").fill("2030-12-31T18:00");
    await organizerPage.getByLabel("場所").fill("テストエリア");
    await organizerPage.getByLabel("一次会の定員").fill("1");
    await organizerPage.getByRole("button", { name: "この内容で公開する" }).click();

    await expect(organizerPage).toHaveURL(/\/events\/(?!new)[^/]+$/);
    await expect(
      organizerPage.getByRole("heading", { name: eventTitle, level: 1 }),
    ).toBeVisible();
    await expect(organizerPage.getByText("募集中")).toBeVisible();

    await memberPage.goto("/signup");
    await memberPage.getByLabel("ニックネーム（公開表示名）").fill(memberNick);
    await memberPage.getByLabel(/メールアドレス/).fill(memberEmail);
    await memberPage.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
    await memberPage.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
    await memberPage.getByRole("button", { name: "登録する" }).click();
    await expect(memberPage).toHaveURL("/");

    await memberPage.goto("/");
    await memberPage.getByText(eventTitle).click();
    await expect(memberPage.getByRole("button", { name: "参加する" })).toBeVisible();
    await memberPage.getByRole("button", { name: "参加する" }).click();
    await expect(memberPage.getByText("参加済")).toBeVisible();
    await expect(memberPage.getByText("締切")).toBeVisible();

    await organizerPage.goto(memberPage.url());
    await expect(organizerPage.getByRole("button", { name: "満員" })).toBeVisible();

    await memberPage.getByPlaceholder("コメントを書く…").fill(commentText);
    await memberPage.getByRole("button", { name: "送信" }).click();
    await expect(memberPage.getByText(commentText)).toBeVisible();

    await organizerContext.close();
    await memberContext.close();
  });
});
