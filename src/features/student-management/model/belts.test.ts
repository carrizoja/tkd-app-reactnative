import { beltLabel, isItfBelt, ITF_BELTS } from "./belts";

describe("ITF belts", () => {
  it("lists the 10 Gup grades from white down to 1° Gup, then 1° to 9° Dan", () => {
    expect(ITF_BELTS.map((b) => b.grade)).toEqual([
      "10° Gup",
      "9° Gup",
      "8° Gup",
      "7° Gup",
      "6° Gup",
      "5° Gup",
      "4° Gup",
      "3° Gup",
      "2° Gup",
      "1° Gup",
      "1° Dan",
      "2° Dan",
      "3° Dan",
      "4° Dan",
      "5° Dan",
      "6° Dan",
      "7° Dan",
      "8° Dan",
      "9° Dan",
    ]);
  });

  it("names each grade with its belt color", () => {
    expect(ITF_BELTS.map((b) => b.label).slice(0, 11)).toEqual([
      "10° Gup – Blanco",
      "9° Gup – Blanco punta amarilla",
      "8° Gup – Amarillo",
      "7° Gup – Amarillo punta verde",
      "6° Gup – Verde",
      "5° Gup – Verde punta azul",
      "4° Gup – Azul",
      "3° Gup – Azul punta roja",
      "2° Gup – Rojo",
      "1° Gup – Rojo punta negra",
      "1° Dan – Negro",
    ]);
    expect(ITF_BELTS[ITF_BELTS.length - 1].label).toBe("9° Dan – Negro");
  });

  it("labels a stored grade with its color, and leaves older free text as it was", () => {
    expect(beltLabel("8° Gup")).toBe("8° Gup – Amarillo");
    expect(beltLabel("cinturón amarillo")).toBe("cinturón amarillo");
  });

  it("recognizes only grades from the list", () => {
    expect(isItfBelt("1° Dan")).toBe(true);
    expect(isItfBelt("11° Gup")).toBe(false);
    expect(isItfBelt("8 gup")).toBe(false);
  });
});
