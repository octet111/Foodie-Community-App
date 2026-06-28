import { describe, expect, it } from "vitest";
import { settlementItemsNeedSync } from "@/lib/settlement-data";

describe("settlementItemsNeedSync", () => {
  it("参加表明がなく明細もなければ false", () => {
    expect(settlementItemsNeedSync([], [])).toBe(false);
  });

  it("参加表明があるが明細がなければ true", () => {
    expect(
      settlementItemsNeedSync([{ user_id: "u1" }], []),
    ).toBe(true);
  });

  it("参加表明の全員が明細にいれば false", () => {
    expect(
      settlementItemsNeedSync(
        [{ user_id: "u1" }, { user_id: "u2" }],
        [{ user_id: "u1" }, { user_id: "u2" }],
      ),
    ).toBe(false);
  });

  it("参加表明にいるが明細にいないユーザーがいれば true", () => {
    expect(
      settlementItemsNeedSync(
        [{ user_id: "u1" }, { user_id: "u2" }],
        [{ user_id: "u1" }],
      ),
    ).toBe(true);
  });
});
