/**
 * Shared fixtures for the attendance screen tests. Each test file mocks the
 * repositories with these mock services so the Firebase SDK never enters the
 * module graph, then drives the screen through its public props.
 */
import type { AttendanceService } from "../data/attendance-service";

export type MockAttendanceService = { [K in keyof AttendanceService]: jest.Mock };

export function mockAttendanceService(): MockAttendanceService {
  return {
    getDay: jest.fn(),
    takeAttendance: jest.fn(),
  };
}
