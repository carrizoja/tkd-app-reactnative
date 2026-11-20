/**
 * Spanish (Argentina) user-facing copy for the school-management screens, kept
 * in one module so wording stays consistent and testable. Code and identifiers
 * remain English (design D4); only these string values are localized.
 */
import { SchoolError, type SchoolErrorCode } from "../model/types";

export const SCHOOL_COPY = {
  homeLink: "Escuelas",
  schoolsTitle: "Escuelas",
  schoolsEmpty: "Todavía no hay escuelas.",
  newSchool: "Nueva escuela",
  newSchoolTitle: "Nueva escuela",
  editSchoolTitle: "Editar escuela",
  schoolNameLabel: "Nombre de la escuela",
  schoolNamePlaceholder: "Escuela Centro",
  editSchool: "Editar nombre",
  deleteSchool: "Eliminar escuela",
  confirmDeleteSchool: (name: string) => `¿Eliminar la escuela "${name}"?`,
  schoolMissing: "Esta escuela ya no existe.",
  sedesTitle: "Sedes",
  sedesEmpty: "Esta escuela todavía no tiene sedes.",
  newSede: "Nueva sede",
  newSedeTitle: "Nueva sede",
  editSedeTitle: "Editar sede",
  sedeNameLabel: "Nombre de la sede",
  sedeNamePlaceholder: "Sede Centro",
  sedeAddressLabel: "Dirección",
  sedeAddressPlaceholder: "Av. Siempre Viva 742",
  deleteSede: "Eliminar sede",
  confirmDeleteSede: (name: string) => `¿Eliminar la sede "${name}"?`,
  save: "Guardar",
  cancel: "Cancelar",
  confirmDelete: "Eliminar",
  loading: "Cargando…",
  retry: "Reintentar",
  loadFailed: "No pudimos cargar los datos. Revisá tu conexión e intentá otra vez.",
  validation: {
    schoolName: "Ingresá el nombre de la escuela.",
    sedeName: "Ingresá el nombre de la sede.",
    sedeAddress: "Ingresá la dirección de la sede.",
  },
  errors: {
    forbidden: "No tenés permiso para hacer esto.",
    "invalid-input": "Completá los campos obligatorios.",
    "has-sedes": "No se puede eliminar: la escuela todavía tiene sedes. Eliminá primero sus sedes.",
    "has-classes": "No se puede eliminar: la sede todavía tiene clases. Eliminá o mové primero sus clases.",
  } satisfies Record<SchoolErrorCode, string>,
  unknownError: "No pudimos completar la operación. Intentá otra vez.",
} as const;

/** The message to show for a failed school or sede operation. */
export function schoolErrorMessage(error: unknown): string {
  return error instanceof SchoolError ? SCHOOL_COPY.errors[error.code] : SCHOOL_COPY.unknownError;
}
