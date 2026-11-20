/**
 * Spanish (Argentina) user-facing copy for the student-management screens.
 * Code and identifiers remain English (design D4); only these values are localized.
 */
import { StudentError, type StudentErrorCode } from "../model/types";

export const STUDENT_COPY = {
  schoolLink: "Alumnos",
  studentsTitle: "Alumnos",
  searchLabel: "Buscar alumno",
  searchPlaceholder: "Buscar por nombre o apellido",
  studentsEmpty: "Esta escuela todavía no tiene alumnos.",
  noMatches: (term: string) => `Ningún alumno coincide con "${term}".`,
  newStudent: "Nuevo alumno",
  groupsLink: "Grupos",
  newStudentTitle: "Nuevo alumno",
  editStudentTitle: "Editar alumno",
  firstNameLabel: "Nombre",
  firstNamePlaceholder: "Ana",
  lastNameLabel: "Apellido",
  lastNamePlaceholder: "Pérez",
  beltGradeLabel: "Cinturón / graduación",
  beltGradePlaceholder: "Elegí una graduación",
  selectBeltTitle: "Elegí la graduación",
  birthDateLabel: "Fecha de nacimiento",
  birthDatePlaceholder: "Elegí una fecha",
  clearBirthDate: "Borrar fecha de nacimiento",
  noBeltGrade: "Sin graduación",
  beltGrade: (value: string) => `Graduación: ${value}`,
  birthDate: (value: string) => `Nacimiento: ${value}`,
  photoAlt: (name: string) => `Foto de ${name}`,
  changePhoto: "Cambiar foto",
  addPhoto: "Agregar foto",
  editStudent: "Editar datos",
  deleteStudent: "Eliminar alumno",
  confirmDeleteStudent: (name: string) =>
    `¿Eliminar a ${name}? También se quita de sus grupos y se borra su foto.`,
  studentMissing: "Este alumno ya no existe.",
  groupsTitle: "Grupos",
  groupsEmpty: "Esta escuela todavía no tiene grupos.",
  memberCount: (n: number) => (n === 1 ? "1 alumno" : `${n} alumnos`),
  newGroup: "Nuevo grupo",
  newGroupTitle: "Nuevo grupo",
  editGroupTitle: "Editar grupo",
  groupNameLabel: "Nombre del grupo",
  groupNamePlaceholder: "Competidores",
  renameGroup: "Cambiar nombre",
  membersTitle: "Integrantes",
  membersEmpty: "Este grupo todavía no tiene integrantes.",
  addMembersTitle: "Agregar alumnos",
  addMembersEmpty: "Todos los alumnos de la escuela ya están en este grupo.",
  addMember: (name: string) => `Agregar a ${name}`,
  removeMember: (name: string) => `Quitar a ${name}`,
  deleteGroup: "Eliminar grupo",
  confirmDeleteGroup: (name: string) => `¿Eliminar el grupo "${name}"? Sus alumnos siguen en la escuela.`,
  groupMissing: "Este grupo ya no existe.",
  save: "Guardar",
  cancel: "Cancelar",
  confirmDelete: "Eliminar",
  validation: {
    firstName: "Ingresá el nombre.",
    lastName: "Ingresá el apellido.",
    birthDate: "Elegí una fecha de nacimiento válida.",
    beltGrade: "Elegí una graduación de la lista.",
    groupName: "Ingresá el nombre del grupo.",
  },
  errors: {
    "invalid-input": "Revisá los datos ingresados.",
    "invalid-photo": "Elegí una foto JPG, PNG, WebP o HEIC.",
    "photo-too-large": "La foto pesa demasiado. Elegí una de menos de 5 MB.",
    "not-same-school": "Solo podés agregar alumnos de esta escuela.",
  } satisfies Record<StudentErrorCode, string>,
  unknownError: "No pudimos completar la operación. Intentá otra vez.",
} as const;

/** The message to show for a failed student or group operation. */
export function studentErrorMessage(error: unknown): string {
  return error instanceof StudentError ? STUDENT_COPY.errors[error.code] : STUDENT_COPY.unknownError;
}

/** "Ana Pérez" */
export function fullName(student: { firstName: string; lastName: string }): string {
  return `${student.firstName} ${student.lastName}`;
}
