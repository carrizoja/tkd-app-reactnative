import { formatBirthDate, fromIsoDate, toIsoDate } from "./dates";

describe("birth date helpers", () => {
  it("converts a picked date to YYYY-MM-DD using the device's calendar day", () => {
    expect(toIsoDate(new Date(2015, 2, 9, 23, 30))).toBe("2015-03-09");
    expect(toIsoDate(new Date(2016, 1, 29, 0, 5))).toBe("2016-02-29");
  });

  it("opens the picker on the stored day", () => {
    const date = fromIsoDate("2015-03-09");
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2015, 2, 9]);
  });

  it("round-trips without shifting the day", () => {
    expect(toIsoDate(fromIsoDate("2010-12-31"))).toBe("2010-12-31");
  });

  it("shows a stored date as DD/MM/AAAA, and leaves other text as it was", () => {
    expect(formatBirthDate("2015-03-09")).toBe("09/03/2015");
    expect(formatBirthDate("marzo 2015")).toBe("marzo 2015");
  });
});
