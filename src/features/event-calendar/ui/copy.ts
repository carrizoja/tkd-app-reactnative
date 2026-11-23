/**
 * Spanish (Argentina) user-facing copy for the calendar screen.
 * Code and identifiers remain English (design D4); only these values are localized.
 */
import { EventError, type EventErrorCode, type EventType } from "../model/types";

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  exam_board: "Mesa de examen",
  tournament: "Torneo",
  master_class: "Master class",
};

/** Plural labels for the type filter. */
export const EVENT_TYPE_FILTERS: Record<EventType, string> = {
  exam_board: "Mesas de examen",
  tournament: "Torneos",
  master_class: "Master classes",
};

export const EVENT_COPY = {
  schoolLink: "Calendario",
  title: (schoolName: string) => `Calendario · ${schoolName}`,
  filterAll: "Todos",
  upcomingTitle: (count: number) => `Próximos eventos (${count})`,
  noEvents: "No hay eventos próximos.",
  noEventsOfType: "No hay eventos próximos de este tipo.",
  newEvent: "Nuevo evento",
  typeLabel: "Tipo",
  titleLabel: "Título",
  titlePlaceholder: "Ej.: Torneo Apertura",
  dateLabel: "Fecha",
  create: "Crear evento",
  cancel: "Cancelar",
  created: (title: string) => `Evento "${title}" creado.`,
};

const ERROR_MESSAGES: Record<EventErrorCode, string> = {
  "invalid-type": "Elegí el tipo de evento.",
  "invalid-title": "Ingresá un título de hasta 100 caracteres.",
  "invalid-date": "Elegí una fecha válida.",
  "past-date": "La fecha no puede ser anterior a hoy.",
};

export function eventErrorMessage(error: unknown): string {
  if (error instanceof EventError) {
    return ERROR_MESSAGES[error.code];
  }
  return "No se pudo crear el evento. Revisá la conexión y probá de nuevo.";
}
