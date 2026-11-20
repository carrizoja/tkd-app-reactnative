/**
 * Student and student-group use cases (OpenSpec 5.2/5.4,
 * odd/tasks/student-management.md). Security Rules enforce tenancy; this
 * service validates input, keeps derived fields (`lastNameLower`, tenancy
 * coordinates) consistent, and cleans up a student's photo and group
 * memberships when the student is deleted.
 */
import type { School } from "../../school-management/model/types";
import { toLastNameLower } from "../../../lib/model/ids";
import { isItfBelt } from "../model/belts";
import {
  StudentError,
  type GroupInput,
  type PhotoFile,
  type Student,
  type StudentGroup,
  type StudentInput,
} from "../model/types";

/**
 * A partial student update. `null` clears an optional field; the Firestore
 * implementation turns it into a field deletion.
 */
export type StudentPatch = {
  [K in keyof Omit<Student, "id">]?: Student[K] | null;
};

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface StudentStore {
  listStudentsBySchool(schoolId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | null>;
  createStudent(data: Omit<Student, "id">): Promise<Student>;
  updateStudent(id: string, patch: StudentPatch): Promise<void>;
  removeStudent(id: string): Promise<void>;
  listGroupsBySchool(schoolId: string): Promise<StudentGroup[]>;
  createGroup(data: Omit<StudentGroup, "id">): Promise<StudentGroup>;
  renameGroup(id: string, name: string): Promise<void>;
  /** Adds members atomically, so concurrent edits never overwrite each other. */
  addGroupMembers(id: string, studentIds: string[]): Promise<void>;
  /** Removes a member atomically. */
  removeGroupMember(id: string, studentId: string): Promise<void>;
  removeGroup(id: string): Promise<void>;
}

/** File storage port for profile photos (Firebase Storage in production). */
export interface PhotoStore {
  /** Uploads the local file at `uri` and returns its download URL. */
  upload(path: string, uri: string, contentType: string): Promise<string>;
  /** Removes the file; succeeds when it is already gone. */
  remove(path: string): Promise<void>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Raster formats a profile photo may use; mirrors `storage.rules` (A5). */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Exclusive upper bound for a photo's size; mirrors `storage.rules` (A5). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** One photo per student; re-uploading replaces it. Matches `storage.rules`. */
export function photoPath(student: Pick<Student, "id" | "schoolId">): string {
  return `students/${student.schoolId}/${student.id}/photo`;
}

function required(field: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new StudentError("invalid-input", `The ${field} is required.`);
  }
  return trimmed;
}

/** Trimmed optional text, or null when empty (meaning "clear it"). */
function optional(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** A `YYYY-MM-DD` string that names a real calendar day (rejects 2015-02-31). */
export function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function normalizeStudent(input: StudentInput) {
  const lastName = required("last name", input.lastName);
  const birthDate = optional(input.birthDate);
  if (birthDate !== null && !isCalendarDate(birthDate)) {
    throw new StudentError("invalid-input", `Invalid birth date "${birthDate}": expected a real YYYY-MM-DD date.`);
  }
  const beltGrade = optional(input.beltGrade);
  if (beltGrade !== null && !isItfBelt(beltGrade)) {
    throw new StudentError("invalid-input", `Unknown belt/grade "${beltGrade}": pick one from the ITF list.`);
  }
  return {
    firstName: required("first name", input.firstName),
    lastName,
    lastNameLower: toLastNameLower(lastName),
    beltGrade,
    birthDate,
  };
}

/** Drops cleared optional fields, for creating a document. */
function withoutNulls<T extends object>(data: T): { [K in keyof T]: Exclude<T[K], null> } {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)) as {
    [K in keyof T]: Exclude<T[K], null>;
  };
}

function requireSameSchool(schoolId: string, students: Student[]): string[] {
  const outsider = students.find((s) => s.schoolId !== schoolId);
  if (outsider) {
    throw new StudentError("not-same-school", `Student ${outsider.id} is not in school ${schoolId}.`);
  }
  return students.map((s) => s.id);
}

export function createStudentService(store: StudentStore, photos: PhotoStore) {
  return {
    /** S1: the school's students, ordered by surname. */
    listStudents(school: School): Promise<Student[]> {
      return store.listStudentsBySchool(school.id);
    },

    getStudent(id: string): Promise<Student | null> {
      return store.getStudent(id);
    },

    /** S1: the student inherits its school's tenancy coordinates. */
    async createStudent(school: School, input: StudentInput): Promise<Student> {
      return store.createStudent({
        schoolId: school.id,
        associationId: school.associationId,
        ...withoutNulls(normalizeStudent(input)),
      });
    },

    /** S3/S4: edits names, belt/grade and birth date; empty optionals are cleared. */
    async updateStudent(student: Student, input: StudentInput): Promise<void> {
      await store.updateStudent(student.id, normalizeStudent(input));
    },

    /** S2: uploads (or replaces) the student's photo and stores its URL. */
    async setPhoto(student: Student, file: PhotoFile): Promise<string> {
      // The Storage rules match lower-case types, so upload with the normalized one.
      const contentType = file.mimeType.toLowerCase();
      if (!PHOTO_TYPES.includes(contentType)) {
        throw new StudentError("invalid-photo", `Expected a JPEG, PNG, WebP or HEIC image, got ${file.mimeType}.`);
      }
      if (file.fileSize !== undefined && file.fileSize >= MAX_PHOTO_BYTES) {
        throw new StudentError("photo-too-large", `The photo is ${file.fileSize} bytes; the limit is 5 MB.`);
      }
      const url = await photos.upload(photoPath(student), file.uri, contentType);
      await store.updateStudent(student.id, { photoUrl: url });
      return url;
    },

    /**
     * S4/A4: deletes the student, then cleans up its group memberships and photo.
     *
     * The record goes first: if that fails nothing has changed and the user can
     * retry. Cleanup failures afterwards only leave harmless leftovers (a dangling
     * member id, an unused file), so they are logged instead of failing a delete
     * that already happened.
     */
    async deleteStudent(student: Student): Promise<void> {
      await store.removeStudent(student.id);

      const cleanup = await Promise.allSettled([
        store.listGroupsBySchool(student.schoolId).then((groups) =>
          Promise.all(
            groups
              .filter((g) => g.memberIds.includes(student.id))
              .map((g) => store.removeGroupMember(g.id, student.id)),
          ),
        ),
        // Always attempted: the caller's copy of the student may predate its
        // photo, and `remove` succeeds when there is no file.
        photos.remove(photoPath(student)),
      ]);
      for (const result of cleanup) {
        if (result.status === "rejected") {
          console.warn(`Student ${student.id} was deleted, but cleanup failed.`, result.reason);
        }
      }
    },

    listGroups(school: School): Promise<StudentGroup[]> {
      return store.listGroupsBySchool(school.id);
    },

    /** S8: a named group of students from the school. */
    async createGroup(school: School, input: GroupInput, members: Student[]): Promise<StudentGroup> {
      const memberIds = requireSameSchool(school.id, members);
      return store.createGroup({ schoolId: school.id, name: required("group name", input.name), memberIds });
    },

    async renameGroup(group: StudentGroup, input: GroupInput): Promise<void> {
      await store.renameGroup(group.id, required("group name", input.name));
    },

    /** S8: only students of the group's school can join it (A6). */
    async addMembers(group: StudentGroup, students: Student[]): Promise<void> {
      await store.addGroupMembers(group.id, requireSameSchool(group.schoolId, students));
    },

    /** S9: the student leaves the group but stays in the school. */
    async removeMember(group: StudentGroup, student: Student): Promise<void> {
      await store.removeGroupMember(group.id, student.id);
    },

    /** Deletes the group only; its students stay in the school. */
    async deleteGroup(group: StudentGroup): Promise<void> {
      await store.removeGroup(group.id);
    },
  };
}

export type StudentService = ReturnType<typeof createStudentService>;
