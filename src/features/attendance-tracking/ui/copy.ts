/**
 * Spanish (Argentina) user-facing copy for the attendance screen.
 * Code and identifiers remain English (design D4); only these values are localized.
 */
import { AttendanceError, type AttendanceErrorCode } from "../model/types";

export const ATTENDANCE_COPY = {
  classLink: "Asistencia",
  title: (className: string) => `Asistencia · ${className}`,
  dateLabel: "Fecha",
  recorded: "Asistencia guardada para esta fecha.",
  notRecorded: "No se registró asistencia para esta fecha.",
  offDay: (className: string, days: string) => `${className} no tiene clase ese día (${days}).`,
  inactiveNotice: "La clase está inactiva: solo se puede consultar el historial.",
  rosterEmpty: "No hay alumnos inscriptos en esta clase.",
  present: "Presente",
  absent: "Ausente",
  markLabel: (name: string, present: boolean) => `${name}: ${present ? "Presente" : "Ausente"}`,
  summary: (present: number, total: number) => `Presentes: ${present} de ${total}`,
  formerTitle: "Ya no inscriptos",
  save: "Guardar asistencia",
  saved: "Asistencia guardada.",
};

const ERROR_MESSAGES: Record<AttendanceErrorCode, string> = {
  "invalid-date": "La fecha no es válida.",
  "future-date": "No se puede tomar asistencia de un día que todavía no pasó.",
  "not-class-day": "La clase no se dicta ese día.",
  "class-inactive": "La clase está inactiva.",
  "not-enrolled": "Hay alumnos que ya no están inscriptos en la clase. Volvé a abrir la asistencia.",
  "no-marks": "No hay alumnos para marcar.",
};

export function attendanceErrorMessage(error: unknown): string {
  if (error instanceof AttendanceError) {
    return ERROR_MESSAGES[error.code];
  }
  return "No se pudo guardar la asistencia. Revisá la conexión y probá de nuevo.";
}
