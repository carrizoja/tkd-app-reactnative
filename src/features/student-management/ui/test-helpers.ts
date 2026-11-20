/**
 * Shared fixtures for the student-management screen tests. Each test file mocks
 * `../data/repository` with `mockStudentService()` so the Firebase SDK never
 * enters the module graph, then drives the screens through their public props.
 */
import { Alert } from "react-native";
import type { School } from "../../school-management/model/types";
import type { StudentService } from "../data/student-service";
import type { Student, StudentGroup } from "../model/types";

export const SCHOOL: School = { id: "a1", associationId: "assocA", name: "Escuela Centro" };

export const ANA: Student = {
  id: "stu-ana",
  schoolId: "a1",
  associationId: "assocA",
  firstName: "Ana",
  lastName: "Pérez",
  lastNameLower: "pérez",
  beltGrade: "8° Gup",
};
export const BRUNO: Student = {
  id: "stu-bruno",
  schoolId: "a1",
  associationId: "assocA",
  firstName: "Bruno",
  lastName: "Gómez",
  lastNameLower: "gómez",
};

export const GROUP: StudentGroup = { id: "g1", schoolId: "a1", name: "Competidores", memberIds: ["stu-ana"] };

export type MockStudentService = { [K in keyof StudentService]: jest.Mock };

export function mockStudentService(): MockStudentService {
  return {
    listStudents: jest.fn(),
    getStudent: jest.fn(),
    createStudent: jest.fn(),
    updateStudent: jest.fn(),
    setPhoto: jest.fn(),
    deleteStudent: jest.fn(),
    listGroups: jest.fn(),
    createGroup: jest.fn(),
    renameGroup: jest.fn(),
    addMembers: jest.fn(),
    removeMember: jest.fn(),
    deleteGroup: jest.fn(),
  };
}

/** Make the next `Alert.alert` confirmation press its destructive button. */
export function confirmNextAlert(): jest.SpyInstance {
  return jest.spyOn(Alert, "alert").mockImplementationOnce((_title, _message, buttons) => {
    buttons?.find((b) => b.style === "destructive")?.onPress?.();
  });
}
