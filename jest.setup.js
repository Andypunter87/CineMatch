// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Set up fetch mock
import fetchMock from 'jest-fetch-mock';
fetchMock.enableMocks();

// Mock environment variables
global.import = { meta: { env: {
  VITE_FIREBASE_API_KEY: 'test-api-key',
  VITE_FIREBASE_APP_ID: 'test-app-id',
  VITE_FIREBASE_PROJECT_ID: 'test-project-id',
}}};

// Suppress React error messages from test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      /Warning.*not wrapped in act/.test(args[0]) ||
      /Warning: ReactDOM.render is no longer supported/.test(args[0])
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock resize observer (often causes issues in tests)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;
global.HTMLElement.prototype.scrollIntoView = jest.fn();