// Set up environment variables for Jest tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';

// Mock global objects that React Native provides
global.__DEV__ = true;

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  return Object.setPrototypeOf({
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      currentState: 'active',
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
  }, RN);
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'mock-project-id',
        },
      },
    },
  },
}));

// Set up fetch mock
global.fetch = jest.fn();

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};