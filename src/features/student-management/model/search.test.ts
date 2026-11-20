import { filterStudents } from "./search";
import type { Student } from "./types";

const make = (id: string, firstName: string, lastName: string): Student => ({
  id,
  schoolId: "s1",
  associationId: "a1",
  firstName,
  lastName,
  lastNameLower: lastName.toLowerCase(),
});

const students = [
  make("1", "Ana", "Pérez"),
  make("2", "Bruno", "Gómez"),
  make("3", "Lucía", "Perales"),
  make("4", "Juan", "Martínez"),
];

const ids = (list: Student[]) => list.map((s) => s.id);

describe("filterStudents", () => {
  it("S5: keeps only students whose surname contains the fragment", () => {
    expect(ids(filterStudents(students, "per"))).toEqual(["1", "3"]);
    expect(ids(filterStudents(students, "tine"))).toEqual(["4"]);
  });

  it("S7: also matches the first name", () => {
    expect(ids(filterStudents(students, "bru"))).toEqual(["2"]);
  });

  it("S5/S7: ignores case, accents and surrounding spaces", () => {
    expect(ids(filterStudents(students, "  PEREZ "))).toEqual(["1"]);
    expect(ids(filterStudents(students, "lucia"))).toEqual(["3"]);
  });

  it("S7: matches a full name typed as first name and surname", () => {
    expect(ids(filterStudents(students, "juan mart"))).toEqual(["4"]);
  });

  it("S6: returns nothing when no student matches", () => {
    expect(filterStudents(students, "zzz")).toEqual([]);
  });

  it("returns every student for an empty search", () => {
    expect(ids(filterStudents(students, "  "))).toEqual(["1", "2", "3", "4"]);
  });
});
