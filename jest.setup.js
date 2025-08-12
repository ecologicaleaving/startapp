// Jest setup for testing
// Skip react-native-gesture-handler for service tests

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  default: {
    appVersion: '1.0.0',
    platform: {
      ios: {},
    },
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Silence console warnings during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock timers for better test control
jest.useFakeTimers({
  legacyFakeTimers: true,
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received, validValues) {
    const pass = validValues.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of [${validValues.join(', ')}]`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of [${validValues.join(', ')}]`,
        pass: false,
      };
    }
  },
});