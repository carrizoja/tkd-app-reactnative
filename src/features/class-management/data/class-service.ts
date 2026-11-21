/**
 * Class and enrollment use cases (OpenSpec 6.2, odd/tasks/class-management.md).
 * Security Rules enforce tenancy and same-school links; this service validates
 * input, keeps tenancy coordinates consistent, and removes a deleted class's
 * enrollments. Attendance is never touched here (S6, A4).
 */
import type { School, Sede } from "../../school-management/model/types";
import type { Student } from "../../student-management/model/types";
import { normalizeSchedule } from "../model/schedule";
import {
  ClassError,
  enrollmentId,
  type Class,
  type ClassEnrollment,
  type ClassInput,
  type ClassStatus,
} from "../model/types";

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface ClassStore {
  listClassesBySchool(schoolId: string): Promise<Class[]>;
  getClass(id: string): Promise<Class | null>;
  createClass(data: Omit<Class, "id">): Promise<Class>;
  updateClass(id: string, patch: Partial<Omit<Class, "id">>): Promise<void>;
  removeClass(id: string): Promise<void>;
  /** A class's enrollments; `schoolId` is required because the rules scope reads by it. */
  listEnrollments(schoolId: string, classId: string): Promise<ClassEnrollment[]>;
  /** Writes the enrollments under their deterministic ids, all or none. */
  addEnrollments(enrollments: ClassEnrollment[]): Promise<void>;
  removeEnrollment(id: string): Promise<void>;
}

function normalizeClass(input: ClassInput) {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new ClassError("invalid-input", "The class name is required.");
  }
  return { name, schedule: normalizeSchedule(input.schedule) };
}

function requireSedeOf(schoolId: string, sede: Sede): void {
  if (sede.schoolId !== schoolId) {
    throw new ClassError("not-same-school", `Sede ${sede.id} is not in school ${schoolId}.`);
  }
}

const byName = (a: Class, b: Class) => a.name.localeCompare(b.name, "es", { sensitivity: "base" });

export function createClassService(store: ClassStore) {
  const listClasses = async (school: School): Promise<Class[]> =>
    (await store.listClassesBySchool(school.id)).sort(byName);

  return {
    /** Every class of the school, active and inactive, by name. */
    listClasses,

    /** S3: the school's active classes only, by name. */
    async listActiveClasses(school: School): Promise<Class[]> {
      return (await listClasses(school)).filter((c) => c.status === "active");
    },

    getClass(id: string): Promise<Class | null> {
      return store.getClass(id);
    },

    /** S1: a new class is active and inherits its school's tenancy coordinates. */
    async createClass(school: School, sede: Sede, input: ClassInput): Promise<Class> {
      requireSedeOf(school.id, sede);
      return store.createClass({
        sedeId: sede.id,
        schoolId: school.id,
        associationId: school.associationId,
        ...normalizeClass(input),
        status: "active",
      });
    },

    /** S2: edits the name and schedule, and may move the class to another sede of its school. */
    async updateClass(klass: Class, sede: Sede, input: ClassInput): Promise<void> {
      requireSedeOf(klass.schoolId, sede);
      await store.updateClass(klass.id, { sedeId: sede.id, ...normalizeClass(input) });
    },

    /** S3: an inactive class keeps its roster and history. */
    async setStatus(klass: Class, status: ClassStatus): Promise<void> {
      await store.updateClass(klass.id, { status });
    },

    /**
     * S2/A4: deletes the class, then its enrollments. The class goes first, so a
     * failure leaves nothing changed; leftover enrollments of a deleted class
     * are unreachable, so a cleanup failure is logged instead of failing.
     */
    async deleteClass(klass: Class): Promise<void> {
      await store.removeClass(klass.id);
      try {
        const enrollments = await store.listEnrollments(klass.schoolId, klass.id);
        await Promise.all(enrollments.map((e) => store.removeEnrollment(e.id)));
      } catch (error) {
        console.warn(`Class ${klass.id} was deleted, but removing its enrollments failed.`, error);
      }
    },

    /** S4: ids of the enrolled students, which may include students deleted since. */
    async listEnrolledStudentIds(klass: Class): Promise<string[]> {
      return (await store.listEnrollments(klass.schoolId, klass.id)).map((e) => e.studentId);
    },

    /** S4/S5: enrolls students of the class's school; enrolling twice is a no-op. */
    async enroll(klass: Class, students: Student[]): Promise<void> {
      const outsider = students.find((s) => s.schoolId !== klass.schoolId);
      if (outsider) {
        throw new ClassError("not-same-school", `Student ${outsider.id} is not in school ${klass.schoolId}.`);
      }
      await store.addEnrollments(
        students.map((s) => ({
          id: enrollmentId(klass.id, s.id),
          classId: klass.id,
          studentId: s.id,
          schoolId: klass.schoolId,
        })),
      );
    },

    /** S6: removes the enrollment only; the student's attendance stays. */
    async unenroll(klass: Class, student: Student): Promise<void> {
      await store.removeEnrollment(enrollmentId(klass.id, student.id));
    },
  };
}

export type ClassService = ReturnType<typeof createClassService>;
