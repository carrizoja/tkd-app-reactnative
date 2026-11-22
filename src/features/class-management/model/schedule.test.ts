import { lastClassDay, meetsOn } from "./schedule";

const MON_WED = { days: [1, 3] as (1 | 3)[], start: "19:45", end: "21:00" };

describe("meetsOn", () => {
  it("is true only on the class's weekdays", () => {
    expect(meetsOn(MON_WED, "2026-11-16")).toBe(true); // Monday
    expect(meetsOn(MON_WED, "2026-11-18")).toBe(true); // Wednesday
    expect(meetsOn(MON_WED, "2026-11-22")).toBe(false); // Sunday
    expect(meetsOn(MON_WED, "2026-11-17")).toBe(false); // Tuesday
  });

  it("handles Sunday as ISO day 7", () => {
    expect(meetsOn({ ...MON_WED, days: [7] }, "2026-11-22")).toBe(true);
  });
});

describe("lastClassDay", () => {
  it("is today when the class meets today", () => {
    expect(lastClassDay(MON_WED, "2026-11-18")).toBe("2026-11-18");
  });

  it("goes back to the most recent class day, across months", () => {
    expect(lastClassDay(MON_WED, "2026-11-22")).toBe("2026-11-18");
    expect(lastClassDay(MON_WED, "2026-12-01")).toBe("2026-11-30");
  });
});
