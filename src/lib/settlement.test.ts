import { describe, expect, it } from "vitest";
import {
  buildInitialPartActuals,
  calculateSettlementAmounts,
  effectivePartActual,
  formatSurplus,
  mergeCalculatedItems,
  settlementDraftIsDirty,
  settlementNeedsSave,
  sumPartActuals,
} from "@/lib/settlement";

describe("buildInitialPartActuals", () => {
  it("未保存時は 想定費用 × 参加人数 をデフォルトにする", () => {
    expect(
      buildInitialPartActuals(
        [
          { id: "p1", fee_estimate: 5000 },
          { id: "p2", fee_estimate: 3000 },
        ],
        {},
        { p1: 3, p2: 2 },
      ),
    ).toEqual({ p1: 15000, p2: 6000 });
  });

  it("参加者0人のパートは 0 になる", () => {
    expect(
      buildInitialPartActuals(
        [{ id: "p1", fee_estimate: 5000 }],
        {},
        {},
      ),
    ).toEqual({ p1: 0 });
  });

  it("保存済み実費があればそれを優先する", () => {
    expect(
      buildInitialPartActuals(
        [{ id: "p1", fee_estimate: 5000 }],
        { p1: 12000 },
        { p1: 3 },
      ),
    ).toEqual({ p1: 12000 });
  });
});

describe("effectivePartActual", () => {
  it("未入力時は fee_estimate を使う", () => {
    expect(
      effectivePartActual({
        partId: "p1",
        name: "一次会",
        feeEstimate: 15000,
        participantUserIds: [],
      }),
    ).toBe(15000);
  });

  it("実額が指定されていればそれを使う", () => {
    expect(
      effectivePartActual({
        partId: "p1",
        name: "一次会",
        feeEstimate: 15000,
        actualAmount: 148500,
        participantUserIds: [],
      }),
    ).toBe(148500);
  });
});

describe("calculateSettlementAmounts", () => {
  it("一次会のみ・端数切り上げ", () => {
    const result = calculateSettlementAmounts([
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 10000,
        actualAmount: 10000,
        participantUserIds: ["u1", "u2", "u3"],
      },
    ]);

    expect(result).toEqual([
      { userId: "u1", amount: 3334 },
      { userId: "u2", amount: 3334 },
      { userId: "u3", amount: 3334 },
    ]);
  });

  it("一次会+二次会・二次会不参加者は安い", () => {
    const result = calculateSettlementAmounts([
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 15000,
        actualAmount: 10000,
        participantUserIds: ["u-b", "u-c"],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 4000,
        actualAmount: 4000,
        participantUserIds: ["u-b"],
      },
    ]);

    const byUser = Object.fromEntries(result.map((r) => [r.userId, r.amount]));
    expect(byUser["u-b"]).toBe(9000);
    expect(byUser["u-c"]).toBe(5000);
    expect(byUser["u-b"]).toBeGreaterThan(byUser["u-c"]);
  });

  it("参加者0人のパートはスキップ", () => {
    const result = calculateSettlementAmounts([
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 5000,
        participantUserIds: [],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 3000,
        actualAmount: 3000,
        participantUserIds: ["u1"],
      },
    ]);

    expect(result).toEqual([{ userId: "u1", amount: 3000 }]);
  });
});

describe("sumPartActuals", () => {
  it("参加者がいるパートの実額合計", () => {
    expect(
      sumPartActuals([
        {
          partId: "p1",
          name: "一次会",
          feeEstimate: 0,
          actualAmount: 148500,
          participantUserIds: ["u1", "u2"],
        },
        {
          partId: "p2",
          name: "二次会",
          feeEstimate: 0,
          actualAmount: 31000,
          participantUserIds: ["u1"],
        },
      ]),
    ).toBe(179500);
  });

  it("参加者0人のパートは合計から除外", () => {
    expect(
      sumPartActuals([
        {
          partId: "p1",
          name: "一次会",
          feeEstimate: 5000,
          actualAmount: 5000,
          participantUserIds: [],
        },
        {
          partId: "p2",
          name: "二次会",
          feeEstimate: 3000,
          actualAmount: 3000,
          participantUserIds: ["u1"],
        },
      ]),
    ).toBe(3000);
  });
});

describe("mergeCalculatedItems", () => {
  it("実額変更を請求額プレビューに反映する", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b", "u-c"],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 3000,
        actualAmount: 4000,
        participantUserIds: ["u-b"],
      },
    ];
    const participations = [
      { user_id: "u-b", event_part_id: "p1" },
      { user_id: "u-b", event_part_id: "p2" },
      { user_id: "u-c", event_part_id: "p1" },
    ];
    const items = [
      {
        id: "i-b",
        user_id: "u-b",
        nickname: "B",
        amount: 5000,
        paid: false,
        paid_at: null,
        adjusted_by: null,
        partIds: ["p1", "p2"],
      },
      {
        id: "i-c",
        user_id: "u-c",
        nickname: "C",
        amount: 5000,
        paid: false,
        paid_at: null,
        adjusted_by: null,
        partIds: ["p1"],
      },
    ];

    const merged = mergeCalculatedItems(
      items,
      partInputs,
      participations,
      new Map([
        ["u-b", "B"],
        ["u-c", "C"],
      ]),
    );

    const byUser = Object.fromEntries(merged.map((i) => [i.user_id, i.amount]));
    expect(byUser["u-b"]).toBe(9000);
    expect(byUser["u-c"]).toBe(5000);
  });

  it("手動調整済み行は上書きしない", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b"],
      },
    ];
    const merged = mergeCalculatedItems(
      [
        {
          id: "i-b",
          user_id: "u-b",
          nickname: "B",
          amount: 7777,
          paid: false,
          paid_at: null,
          adjusted_by: "admin-id",
          partIds: ["p1"],
        },
      ],
      partInputs,
      [{ user_id: "u-b", event_part_id: "p1" }],
      new Map([["u-b", "B"]]),
      new Map([["u-b", 7777]]),
    );

    expect(merged[0].amount).toBe(7777);
  });

  it("adjusted_by のみでは再計算をブロックしない", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b"],
      },
    ];
    const merged = mergeCalculatedItems(
      [
        {
          id: "i-b",
          user_id: "u-b",
          nickname: "B",
          amount: 0,
          paid: false,
          paid_at: null,
          adjusted_by: "admin-id",
          partIds: ["p1"],
        },
      ],
      partInputs,
      [{ user_id: "u-b", event_part_id: "p1" }],
      new Map([["u-b", "B"]]),
    );

    expect(merged[0].amount).toBe(10000);
  });

  it("手動調整済み行もパート表示は participations に追従する", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b"],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 3000,
        actualAmount: 4000,
        participantUserIds: ["u-b"],
      },
    ];
    const merged = mergeCalculatedItems(
      [
        {
          id: "i-b",
          user_id: "u-b",
          nickname: "B",
          amount: 7777,
          paid: false,
          paid_at: null,
          adjusted_by: "admin-id",
          partIds: ["p1"],
        },
      ],
      partInputs,
      [
        { user_id: "u-b", event_part_id: "p1" },
        { user_id: "u-b", event_part_id: "p2" },
      ],
      new Map([["u-b", "B"]]),
      new Map([["u-b", 7777]]),
    );

    expect(merged[0].amount).toBe(7777);
    expect(merged[0].partIds).toEqual(["p1", "p2"]);
  });

  it("追加メンバー行は participations があれば請求額を計算する", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-new"],
      },
    ];
    const merged = mergeCalculatedItems(
      [
        {
          id: "draft-add-u-new",
          user_id: "u-new",
          nickname: "新規",
          amount: 0,
          paid: false,
          paid_at: null,
          adjusted_by: null,
          partIds: [],
        },
      ],
      partInputs,
      [{ user_id: "u-new", event_part_id: "p1" }],
      new Map([["u-new", "新規"]]),
    );

    expect(merged[0].amount).toBe(10000);
    expect(merged[0].partIds).toEqual(["p1"]);
  });

  it("adjusted_by があっても amount 0 なら再計算する", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b", "u-c"],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 3000,
        actualAmount: 4000,
        participantUserIds: ["u-b"],
      },
    ];
    const merged = mergeCalculatedItems(
      [
        {
          id: "i-c",
          user_id: "u-c",
          nickname: "C",
          amount: 0,
          paid: false,
          paid_at: null,
          adjusted_by: "admin-id",
          partIds: ["p1"],
        },
      ],
      partInputs,
      [
        { user_id: "u-b", event_part_id: "p1" },
        { user_id: "u-b", event_part_id: "p2" },
        { user_id: "u-c", event_part_id: "p1" },
      ],
      new Map([
        ["u-b", "B"],
        ["u-c", "C"],
      ]),
    );

    const byUser = Object.fromEntries(merged.map((i) => [i.user_id, i.amount]));
    expect(byUser["u-c"]).toBe(5000);
  });
});

describe("formatSurplus", () => {
  it("プラス差分", () => {
    expect(formatSurplus(500)).toBe("+¥500");
  });

  it("マイナス差分", () => {
    expect(formatSurplus(-500)).toBe("-¥500");
  });
});

describe("settlementDraftIsDirty", () => {
  const base = {
    savedParticipations: [{ user_id: "u1", event_part_id: "p1" }],
    draftParticipations: [{ user_id: "u1", event_part_id: "p1" }],
    savedPartActuals: { p1: 10000 },
    draftPartActuals: { p1: 10000 },
    savedManualAmounts: {} as Record<string, number>,
    manualAmountOverrides: {} as Record<string, number>,
    savedItems: [{ id: "i1", user_id: "u1" }],
    draftItems: [{ id: "i1", user_id: "u1" }],
    removedSavedItemIds: new Set<string>(),
  };

  it("変更がなければ false", () => {
    expect(settlementDraftIsDirty(base)).toBe(false);
  });

  it("実費変更で true", () => {
    expect(
      settlementDraftIsDirty({
        ...base,
        draftPartActuals: { p1: 12000 },
      }),
    ).toBe(true);
  });

  it("draft-add 行があれば true", () => {
    expect(
      settlementDraftIsDirty({
        ...base,
        draftItems: [...base.draftItems, { id: "draft-add-u2", user_id: "u2" }],
      }),
    ).toBe(true);
  });

  it("手動請求額変更で true", () => {
    expect(
      settlementDraftIsDirty({
        ...base,
        manualAmountOverrides: { u1: 9999 },
      }),
    ).toBe(true);
  });
});

describe("settlementNeedsSave", () => {
  it("プレビュー計算とDB金額が違えば true", () => {
    const partInputs = [
      {
        partId: "p1",
        name: "一次会",
        feeEstimate: 5000,
        actualAmount: 10000,
        participantUserIds: ["u-b", "u-c"],
      },
      {
        partId: "p2",
        name: "二次会",
        feeEstimate: 3000,
        actualAmount: 4000,
        participantUserIds: ["u-b"],
      },
    ];

    expect(
      settlementNeedsSave({
        savedParticipations: [
          { user_id: "u-b", event_part_id: "p1" },
          { user_id: "u-b", event_part_id: "p2" },
          { user_id: "u-c", event_part_id: "p1" },
        ],
        draftParticipations: [
          { user_id: "u-b", event_part_id: "p1" },
          { user_id: "u-b", event_part_id: "p2" },
          { user_id: "u-c", event_part_id: "p1" },
        ],
        savedPartActuals: { p1: 10000, p2: 4000 },
        draftPartActuals: { p1: 10000, p2: 4000 },
        savedManualAmounts: {},
        manualAmountOverrides: {},
        savedItems: [
          {
            id: "i-b",
            user_id: "u-b",
            amount: 5000,
            adjusted_by: null,
          },
          {
            id: "i-c",
            user_id: "u-c",
            amount: 5000,
            adjusted_by: null,
          },
        ],
        draftItems: [
          { id: "i-b", user_id: "u-b" },
          { id: "i-c", user_id: "u-c" },
        ],
        removedSavedItemIds: new Set(),
        partInputs,
      }),
    ).toBe(true);
  });
});
