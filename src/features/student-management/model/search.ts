/**
 * Student search (S5–S7). A school has tens to a few hundred students, so the
 * list is loaded once and filtered on the device: this matches a fragment
 * anywhere in the name ("per" finds "Pérez" and "Perales"), which a Firestore
 * prefix range cannot do, and needs no extra index.
 */
import type { Student } from "./types";

/** Lower-cased with accents removed, so "PÉREZ", "Perez" and "pérez" compare equal. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Students whose first name, surname, or "first last" contains `term`. */
export function filterStudents(students: Student[], term: string): Student[] {
  const needle = fold(term).replace(/\s+/g, " ");
  if (needle.length === 0) {
    return students;
  }
  return students.filter((s) => {
    const first = fold(s.firstName);
    const last = fold(s.lastName);
    return first.includes(needle) || last.includes(needle) || `${first} ${last}`.includes(needle);
  });
}
