import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables for testing
global.process = {
  env: {
    API_KEY: 'test-api-key',
    GEMINI_API_KEY: 'test-api-key'
  }
} as any;

// Mock window.confirm for testing
global.confirm = vi.fn(() => true);

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock window.crypto.randomUUID for testing
if (!global.crypto) {
  global.crypto = {} as any;
}
global.crypto.randomUUID = vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9));