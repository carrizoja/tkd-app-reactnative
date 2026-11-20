/**
 * ITF Taekwon-Do grades (L11 decision: "ITF"). A student stores only the grade
 * ("8° Gup"); the color is shown next to it, so the stored value stays stable
 * if the color wording ever changes.
 */

export interface Belt {
  /** Stored value, e.g. "8° Gup". */
  grade: string;
  /** Belt color, e.g. "Amarillo". */
  color: string;
  /** Display text, e.g. "8° Gup – Amarillo". */
  label: string;
}

const GUP_COLORS = [
  "Blanco",
  "Blanco punta amarilla",
  "Amarillo",
  "Amarillo punta verde",
  "Verde",
  "Verde punta azul",
  "Azul",
  "Azul punta roja",
  "Rojo",
  "Rojo punta negra",
];

const belt = (grade: string, color: string): Belt => ({ grade, color, label: `${grade} – ${color}` });

/** From the first grade a beginner holds (10° Gup) up to 9° Dan. */
export const ITF_BELTS: readonly Belt[] = [
  ...GUP_COLORS.map((color, i) => belt(`${10 - i}° Gup`, color)),
  ...Array.from({ length: 9 }, (_, i) => belt(`${i + 1}° Dan`, "Negro")),
];

const BY_GRADE = new Map(ITF_BELTS.map((b) => [b.grade, b]));

export function isItfBelt(grade: string): boolean {
  return BY_GRADE.has(grade);
}

/** "8° Gup – Amarillo"; text saved before the list existed is shown as it was. */
export function beltLabel(grade: string): string {
  return BY_GRADE.get(grade)?.label ?? grade;
}
