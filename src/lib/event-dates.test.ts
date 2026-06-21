import { describe, expect, it } from "vitest";
import {
  EVENT_HELD_AT_TIME_OPTIONS,
  combineLocalDatetime,
  roundTimeToStep,
  splitLocalDatetime,
} from "./event-dates";

describe("event-dates held-at step", () => {
  it("generates 10-minute time options from 00:00 to 23:50", () => {
    expect(EVENT_HELD_AT_TIME_OPTIONS[0]).toBe("00:00");
    expect(EVENT_HELD_AT_TIME_OPTIONS.at(-1)).toBe("23:50");
    expect(EVENT_HELD_AT_TIME_OPTIONS).toHaveLength(24 * 6);
  });

  it("rounds arbitrary times to 10-minute steps", () => {
    expect(roundTimeToStep("18:07")).toBe("18:10");
    expect(roundTimeToStep("18:03")).toBe("18:00");
  });

  it("combines date and time for datetime-local storage", () => {
    expect(combineLocalDatetime("2030-12-31", "18:00")).toBe(
      "2030-12-31T18:00",
    );
    expect(splitLocalDatetime("2030-12-31T18:07")).toEqual({
      date: "2030-12-31",
      time: "18:10",
    });
  });
});
