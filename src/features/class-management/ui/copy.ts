/**
 * Spanish (Argentina) user-facing copy for the class-management screens.
 * Code and identifiers remain English (design D4); only these values are localized.
 */
import { ClassError, type ClassErrorCode, type ClassSchedule, type Weekday } from "../model/types";

/** Short weekday names, Monday first (ISO 1–7). */
export const WEEKDAYS: { day: Weekday; short: string; long: string }[] = [
  { day: 1, short: "Lun", long: "lunes" },
  { day: 2, short: "Mar", long: "martes" },
  { day: 3, short: "Mié", long: "miércoles" },
  { day: 4, short: "Jue", long: "jueves" },
  { day: 5, short: "Vie", long: "viernes" },
  { day: 6, short: "Sáb", long: "sábado" },
  { day: 7, short: "Dom", long: "domingo" },
];

export const CLASS_COPY = {
  schoolLink: "Clases",
  classesEmpty: "Esta escuela todavía no tiene clases.",
  needsSede: "Creá una sede antes de agregar clases.",
  sedeEmpty: "Sin clases activas.",
  inactiveTitle: "Inactivas",
  newClass: "Nueva clase",
  newClassTitle: "Nueva clase",
  editClassTitle: "Editar clase",
  nameLabel: "Nombre de la clase",
  namePlaceholder: "Infantiles",
  sedeLabel: "Sede",
  daysLabel: "Días",
  startLabel: "Empieza",
  endLabel: "Termina",
  timePlaceholder: "Elegí un horario",
  dayToggle: (long: string) => `Clase los ${long}`,
  inactiveBadge: "Inactiva",
  editClass: "Editar clase",
  deactivate: "Desactivar clase",
  reactivate: "Reactivar clase",
  deleteClass: "Eliminar clase",
  confirmDeleteClass: (name: string) =>
    `¿Eliminar la clase "${name}"? Se quitan sus inscripciones; la asistencia registrada se conserva.`,
  classMissing: "Esta clase ya no existe.",
  rosterTitle: "Alumnos inscriptos",
  rosterEmpty: "Todavía no hay alumnos inscriptos.",
  enrollTitle: "Inscribir alumnos",
  enrollEmpty: "Todos los alumnos de la escuela ya están inscriptos.",
  enroll: (name: string) => `Inscribir a ${name}`,
  unenroll: (name: string) => `Quitar a ${name} de la clase`,
  enrollAction: "Inscribir",
  unenrollAction: "Quitar",
  save: "Guardar",
  cancel: "Cancelar",
  confirmDelete: "Eliminar",
  validation: {
    name: "Ingresá el nombre de la clase.",
    sede: "Elegí una sede.",
    days: "Elegí al menos un día.",
    start: "Elegí el horario de inicio.",
    end: "Elegí el horario de fin.",
    order: "La clase tiene que terminar después de empezar.",
  },
  errors: {
    "invalid-input": "Revisá los datos ingresados.",
    "not-same-school": "Solo podés usar sedes y alumnos de esta escuela.",
  } satisfies Record<ClassErrorCode, string>,
  unknownError: "No pudimos completar la operación. Intentá otra vez.",
} as const;

/** "Lun, Mié, Vie" */
export function formatDays(schedule: ClassSchedule): string {
  return WEEKDAYS.filter((w) => schedule.days.includes(w.day))
    .map((w) => w.short)
    .join(", ");
}

/** "Lun, Mié, Vie · 18:00–19:30" */
export function formatSchedule(schedule: ClassSchedule): string {
  return `${formatDays(schedule)} · ${schedule.start}–${schedule.end}`;
}

/** The message to show for a failed class or enrollment operation. */
export function classErrorMessage(error: unknown): string {
  return error instanceof ClassError ? CLASS_COPY.errors[error.code] : CLASS_COPY.unknownError;
}
