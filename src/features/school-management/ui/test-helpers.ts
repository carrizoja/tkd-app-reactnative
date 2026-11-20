/**
 * Shared fixtures for the school-management screen tests. Each test file mocks
 * `../data/repository` with `mockSchoolService()` so the Firestore SDK never
 * enters the module graph, then drives the screens through their public props.
 */
import { Alert } from "react-native";
import type { UserScope } from "../../user-auth/model/scope";
import type { SchoolService } from "../data/school-service";
import type { School, Sede } from "../model/types";

export const PRESIDENT: UserScope = { kind: "association", associationId: "assocA" };
export const INSTRUCTOR: UserScope = { kind: "school", schoolIds: ["a1"] };

export const SCHOOL_A1: School = { id: "a1", associationId: "assocA", name: "Escuela Centro" };
export const SCHOOL_A2: School = { id: "a2", associationId: "assocA", name: "Academia Sur" };
export const SEDE_1: Sede = {
  id: "s1",
  schoolId: "a1",
  associationId: "assocA",
  name: "Sede Norte",
  address: "Calle 1",
};

export type MockSchoolService = { [K in keyof SchoolService]: jest.Mock };

export function mockSchoolService(): MockSchoolService {
  return {
    listSchools: jest.fn(),
    getSchool: jest.fn(),
    createSchool: jest.fn(),
    renameSchool: jest.fn(),
    deleteSchool: jest.fn(),
    listSedes: jest.fn(),
    createSede: jest.fn(),
    updateSede: jest.fn(),
    deleteSede: jest.fn(),
  };
}

/** Make the next `Alert.alert` confirmation press its destructive button. */
export function confirmNextAlert(): jest.SpyInstance {
  return jest.spyOn(Alert, "alert").mockImplementationOnce((_title, _message, buttons) => {
    buttons?.find((b) => b.style === "destructive")?.onPress?.();
  });
}
