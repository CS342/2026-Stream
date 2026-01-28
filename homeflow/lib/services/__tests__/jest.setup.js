/**
 * Jest Setup for Service Tests
 *
 * This file runs before each test file and sets up global mocks.
 */

// Create mock functions that can be reset
const mockAsyncStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
};

// Mock AsyncStorage - this mock persists across jest.resetModules()
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Reset mocks before each test
beforeEach(() => {
  mockAsyncStorage.setItem.mockClear();
  mockAsyncStorage.setItem.mockImplementation(() => Promise.resolve());
  mockAsyncStorage.getItem.mockClear();
  mockAsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
  mockAsyncStorage.removeItem.mockClear();
  mockAsyncStorage.removeItem.mockImplementation(() => Promise.resolve());
  mockAsyncStorage.multiRemove.mockClear();
  mockAsyncStorage.multiRemove.mockImplementation(() => Promise.resolve());
  mockAsyncStorage.clear.mockClear();
  mockAsyncStorage.getAllKeys.mockClear();
});

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
