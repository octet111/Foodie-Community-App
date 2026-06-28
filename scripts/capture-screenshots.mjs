/**
 * README 用スクリーンショット取得スクリプト
 * 実行: node scripts/capture-screenshots.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../docs/screenshots");
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TEST_PASSWORD = "TestPass123!";
const ts = Date.now();

async function signup(page, email, nickname) {
  await page.goto(`${BASE_URL}/signup`);
  await page.getByLabel("ニックネーム（公開表示名）").fill(nickname);
  await page.getByLabel(/メールアドレス/).fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(TEST_PASSWORD);
  await page.getByLabel("パスワード（確認）").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "登録する" }).click();
  await page.waitForURL(`${BASE_URL}/events`);
}

async function capture(page, name) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage: false,
  });
  console.log(`  ✓ ${name}.png`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const mobile = await browser.newContext({
    ...devices["iPhone 14"],
    deviceScaleFactor: 2,
  });

  const page = await desktop.newPage();
  const email = `screenshot-${ts}@foodie-test.local`;
  const nickname = "フーディ太郎";
  const shopName = "鮨 かね田";
  const eventTitle = "鮨かね田を貸切る会";

  console.log("セットアップ: ユーザー登録 & デモデータ作成…");
  await signup(page, email, nickname);

  // 店を追加
  await page.goto(`${BASE_URL}/shops`);
  await page.getByRole("button", { name: "＋ 店を追加（URL貼付）" }).click();
  await page.getByRole("button", { name: "URLなしで手動入力" }).click();
  await page.getByLabel("店名").fill(shopName);
  await page.getByLabel("行きたい理由（任意）").fill("紹介制の名店。一度は行ってみたい。");
  await page.getByLabel("予約難易度").selectOption("referral_only");
  await page.getByRole("button", { name: "保存" }).last().click();
  await page.waitForSelector(`text=${shopName}`);

  // 確保宣言
  await page.getByRole("link", { name: shopName }).click();
  await page.getByRole("button", { name: "確保宣言する" }).click();
  await page.getByLabel("コネ種別").selectOption("regular");
  await page.getByLabel("補足条件（任意）").fill("平日なら・4名まで");
  await page.getByLabel("確保宣言").getByRole("button", { name: "保存" }).click();
  await page.waitForSelector("text=常連");

  // 企画を作成
  await page.goto(`${BASE_URL}/events/new`);
  await page.getByRole("button", { name: "ストックから選ぶ" }).click();
  await page.getByRole("button", { name: shopName }).click();
  await page.getByPlaceholder("鮨かね田を貸切る会").fill(eventTitle);
  await page.getByLabel("開催日").fill("2030-12-31");
  await page.getByLabel(/開催時刻/).selectOption("18:00");
  await page.getByLabel("場所").fill("銀座");
  await page.getByLabel("一次会の定員").fill("8");
  await page.getByLabel("想定費用").first().fill("25000");
  await page.getByRole("button", { name: "この内容で公開する" }).click();
  await page.waitForURL(new RegExp(`${BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/events/(?!new)[^/]+$`));

  const eventUrl = page.url();

  console.log("デスクトップ画面をキャプチャ…");

  // ログアウトしてログイン画面
  await page.goto(`${BASE_URL}/me`);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await page.waitForURL(`${BASE_URL}/login`);
  await capture(page, "01-login");

  // 再ログイン
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL(`${BASE_URL}/events`);

  await page.goto(`${BASE_URL}/events`);
  await capture(page, "02-events-list");

  await page.goto(eventUrl);
  await capture(page, "03-event-detail");

  await page.goto(`${BASE_URL}/shops`);
  await capture(page, "04-shops-list");

  await page.goto(`${BASE_URL}/shops`);
  await page.getByRole("link", { name: shopName }).click();
  await capture(page, "05-shop-detail");

  await page.goto(`${BASE_URL}/me`);
  await capture(page, "06-my-page");

  await page.goto(`${eventUrl}/settlement`);
  await capture(page, "07-settlement");

  // モバイル
  console.log("モバイル画面をキャプチャ…");
  const mPage = await mobile.newPage();
  await mPage.goto(`${BASE_URL}/login`);
  await mPage.getByLabel("メールアドレス").fill(email);
  await mPage.getByLabel("パスワード").fill(TEST_PASSWORD);
  await mPage.getByRole("button", { name: "ログイン" }).click();
  await mPage.waitForURL(`${BASE_URL}/events`);

  await mPage.goto(`${BASE_URL}/events`);
  await capture(mPage, "08-events-mobile");

  await browser.close();
  console.log(`\n完了: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
