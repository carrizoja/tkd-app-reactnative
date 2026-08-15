import { EVENT_TYPES, isEventType } from "./types";

describe("event type guard", () => {
  it("accepts the allowed event types", () => {
    for (const t of EVENT_TYPES) {
      expect(isEventType(t)).toBe(true);
    }
  });

  it("rejects an unknown type", () => {
    expect(isEventType("birthday")).toBe(false);
  });
});
