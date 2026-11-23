/**
 * Shared fixtures for the calendar screen tests. Each test file mocks the
 * repository with this mock service so the Firebase SDK never enters the
 * module graph, then drives the screen through its public props.
 */
import type { EventService } from "../data/event-service";

export type MockEventService = { [K in keyof EventService]: jest.Mock };

export function mockEventService(): MockEventService {
  return {
    today: jest.fn(),
    listUpcoming: jest.fn(),
    createEvent: jest.fn(),
  };
}
