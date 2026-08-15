import {
  assertDateString,
  assertPeriodString,
  attendanceId,
  paymentId,
  toLastNameLower,
} from "./ids";

describe("deterministic id builders", () => {
  it("builds attendance id as classId_studentId_date", () => {
    expect(attendanceId("c1", "s1", "2026-08-14")).toBe("c1_s1_2026-08-14");
  });

  it("builds payment id as studentId_period", () => {
    expect(paymentId("s1", "2026-08")).toBe("s1_2026-08");
  });

  it("rejects a malformed date", () => {
    expect(() => attendanceId("c1", "s1", "2026-8-1")).toThrow();
    expect(() => assertDateString("14-08-2026")).toThrow();
  });

  it("rejects a malformed period", () => {
    expect(() => paymentId("s1", "2026-8")).toThrow();
    expect(() => assertPeriodString("2026")).toThrow();
  });

  it("lower-cases and trims surnames for search", () => {
    expect(toLastNameLower("  Pérez ")).toBe("pérez");
  });
});
