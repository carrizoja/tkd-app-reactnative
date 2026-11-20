/**
 * School hierarchy use cases (OpenSpec 4.2, odd/tasks/school-management.md).
 *
 * The Security Rules are the enforcement boundary; this service mirrors them so
 * the UI never offers what the server would deny, and adds the integrity rules
 * the rules cannot express cheaply: a school with sedes, or a sede with classes,
 * is never deleted.
 */
import type { UserScope } from "../../user-auth/model/scope";
import {
  normalizeSchoolInput,
  normalizeSedeInput,
  SchoolError,
  type School,
  type SchoolInput,
  type Sede,
  type SedeInput,
} from "../model/types";

/** Persistence port; the Firestore implementation lives in `./repository`. */
export interface SchoolStore {
  getSchool(id: string): Promise<School | null>;
  listSchoolsByAssociation(associationId: string): Promise<School[]>;
  createSchool(data: Omit<School, "id">): Promise<School>;
  updateSchool(id: string, patch: SchoolInput): Promise<void>;
  removeSchool(id: string): Promise<void>;
  listSedesBySchool(schoolId: string): Promise<Sede[]>;
  createSede(data: Omit<Sede, "id">): Promise<Sede>;
  updateSede(id: string, patch: SedeInput): Promise<void>;
  removeSede(id: string): Promise<void>;
  /** Whether any class still belongs to the sede. */
  sedeHasClasses(sede: Pick<Sede, "id" | "schoolId">): Promise<boolean>;
}

const byName = (a: School, b: School) => a.name.localeCompare(b.name);

/**
 * Schools belong to an association, so only association scope may create or
 * delete them; a school-scope instructor manages its own school's name and sedes.
 */
function requireAssociation(scope: UserScope, action: string): string {
  if (scope.kind !== "association") {
    throw new SchoolError("forbidden", `Only an association user can ${action} a school.`);
  }
  return scope.associationId;
}

export function createSchoolService(store: SchoolStore) {
  return {
    /** S6/S8: the schools visible to `scope`, sorted by name. */
    async listSchools(scope: UserScope): Promise<School[]> {
      switch (scope.kind) {
        case "association":
          return store.listSchoolsByAssociation(scope.associationId);
        case "school": {
          // The rules key school-scope access on the document id, so these
          // users cannot list schools by query; they read each one directly.
          const schools = await Promise.all(scope.schoolIds.map((id) => store.getSchool(id)));
          return schools.filter((s): s is School => s !== null).sort(byName);
        }
        default:
          return [];
      }
    },

    /** S4: one school by id; null when it no longer exists. */
    getSchool(id: string): Promise<School | null> {
      return store.getSchool(id);
    },

    /** S1: create a school under the caller's association. */
    async createSchool(scope: UserScope, input: SchoolInput): Promise<School> {
      const associationId = requireAssociation(scope, "create");
      return store.createSchool({ associationId, ...normalizeSchoolInput(input) });
    },

    /** S4/S9: only the name changes; the association is fixed. */
    async renameSchool(school: School, input: SchoolInput): Promise<void> {
      await store.updateSchool(school.id, normalizeSchoolInput(input));
    },

    /** S5: a school with sedes is never deleted (decision L2). */
    async deleteSchool(scope: UserScope, school: School): Promise<void> {
      requireAssociation(scope, "delete");
      const sedes = await store.listSedesBySchool(school.id);
      if (sedes.length > 0) {
        throw new SchoolError("has-sedes", `School ${school.id} still has ${sedes.length} sede(s).`);
      }
      await store.removeSchool(school.id);
    },

    listSedes(school: School): Promise<Sede[]> {
      return store.listSedesBySchool(school.id);
    },

    /** S2: the sede inherits its school's id and association. */
    async createSede(school: School, input: SedeInput): Promise<Sede> {
      return store.createSede({
        schoolId: school.id,
        associationId: school.associationId,
        ...normalizeSedeInput(input),
      });
    },

    /** S4: edit a sede's name and address. */
    async updateSede(sede: Sede, input: SedeInput): Promise<void> {
      await store.updateSede(sede.id, normalizeSedeInput(input));
    },

    /** S3: a sede with classes is never deleted. */
    async deleteSede(sede: Sede): Promise<void> {
      if (await store.sedeHasClasses(sede)) {
        throw new SchoolError("has-classes", `Sede ${sede.id} still has classes.`);
      }
      await store.removeSede(sede.id);
    },
  };
}

export type SchoolService = ReturnType<typeof createSchoolService>;
