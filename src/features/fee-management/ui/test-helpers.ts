/**
 * Shared fixtures for the fees screen tests. Each test file mocks the
 * repository with this mock service so the Firebase SDK never enters the
 * module graph, then drives the screen through its public props.
 */
import type { FeeService } from "../data/fee-service";

export type MockFeeService = { [K in keyof FeeService]: jest.Mock };

export function mockFeeService(): MockFeeService {
  return {
    currentPeriod: jest.fn(),
    getPeriod: jest.fn(),
    registerPayment: jest.fn(),
  };
}
