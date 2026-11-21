/**
 * Shared fixtures for the class-management screen tests. Each test file mocks
 * the repositories with these mock services so the Firebase SDK never enters
 * the module graph, then drives the screens through their public props.
 */
import type { School, Sede } from "../../school-management/model/types";
import type { ClassService } from "../data/class-service";
import type { Class } from "../model/types";

export const SCHOOL: School = { id: "a1", associationId: "assocA", name: "Escuela Centro" };
export const CENTRO: Sede = { id: "sede-centro", schoolId: "a1", associationId: "assocA", name: "Centro", address: "" };
export const NORTE: Sede = { ...CENTRO, id: "sede-norte", name: "Norte" };

export const INFANTILES: Class = {
  id: "cls-inf",
  sedeId: CENTRO.id,
  schoolId: "a1",
  associationId: "assocA",
  name: "Infantiles",
  schedule: { days: [1, 3, 5], start: "18:00", end: "19:30" },
  status: "active",
};
export const ADULTOS: Class = {
  ...INFANTILES,
  id: "cls-adu",
  sedeId: NORTE.id,
  name: "Adultos",
  schedule: { days: [2, 4], start: "20:00", end: "21:30" },
};

export type MockClassService = { [K in keyof ClassService]: jest.Mock };

export function mockClassService(): MockClassService {
  return {
    listClasses: jest.fn(),
    listActiveClasses: jest.fn(),
    getClass: jest.fn(),
    createClass: jest.fn(),
    updateClass: jest.fn(),
    setStatus: jest.fn(),
    deleteClass: jest.fn(),
    listEnrolledStudentIds: jest.fn(),
    enroll: jest.fn(),
    unenroll: jest.fn(),
  };
}
