/** Canonical Firestore collection names, referenced by every repository. */
export const COLLECTIONS = {
  associations: "associations",
  schools: "schools",
  sedes: "sedes",
  students: "students",
  studentGroups: "studentGroups",
  classes: "classes",
  classEnrollments: "classEnrollments",
  attendance: "attendance",
  payments: "payments",
  events: "events",
  memberships: "memberships",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
